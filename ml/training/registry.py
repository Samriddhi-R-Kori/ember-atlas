"""Target eligibility gate, training of the registered model and its evaluation report.

Principles: only metrics with a documented definition, a single method and no unresolved calibration blocker
are eligible targets; no imputation; validation grouped by condition signature; baselines always evaluated;
predictive uncertainty not estimated; every model starts as approval_status='not_approved'.
"""
from __future__ import annotations

import hashlib
import json
from pathlib import Path

import numpy as np

from app.science import contract as C
from ember_atlas.paths import REPO_ROOT
from ml.config import FLEX_FEATURES, MODEL_ID, MODEL_KIND
from ml.evaluation.grouped_cv import applicability_domain, evaluate_flex
from ml.preprocessing.flex_features import flex_burning_rate_rows
from ml.training.ridge import fit_ridge, select_alpha

ML_CODE = sorted(Path(__file__).resolve().parents[1].rglob('*.py'))
TARGET_REJECTIONS = {
    'PSI-69:burn_time': ('Burn time is largely determined by initial diameter and burning-rate constant (d²-law) '
                         'from the same video record and includes source-approximate values; it is not an '
                         'independent target and would leak the burning-rate information.'),
    'PSI-69:initial_diameter': 'Sample-scale input chosen by the experiment, not a combustion outcome.',
    'PSI-101:net_aging_time': 'Operating setting of the smoke-aging procedure, not a combustion outcome.',
    'PSI-107:fuel_mass_flow': 'Operating setting (fuel flow), not a combustion outcome.',
    'PSI-25:final_o2': ('End-of-test chamber gas reading depends on test duration, chamber mixing and sample '
                        'consumption, none of which are reported as usable inputs in the index.'),
    'PSI-25:final_co2': ('End-of-test chamber gas reading depends on test duration, chamber mixing and sample '
                         'consumption, none of which are reported as usable inputs in the index.'),
}


def sha256_file(path: Path) -> str:
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def _display_path(path: Path, out_dir: Path) -> str:
    """Repository-relative artifact path (e.g. ml/artifacts/...); outside the repo, relative to the output folder's parent."""
    path = path.resolve()
    return path.relative_to(REPO_ROOT).as_posix() if path.is_relative_to(REPO_ROOT) else path.relative_to(Path(out_dir).resolve().parent).as_posix()


def training_code_sha256() -> str:
    """Combined SHA-256 of every Python file in ml/ (recorded with each registered model)."""
    return hashlib.sha256(b''.join(p.read_bytes() for p in ML_CODE)).hexdigest()


def target_eligibility(spine):
    out = []
    groups_flex = None
    for metric in spine['metrics']:
        mid = metric['id']
        vals = [r['m'][metric['key']] for r in spine['records'] if r['inv'] == metric['investigation'] and metric['key'] in r['m']]
        reported = sum(1 for v in vals if v['s'] == 'reported')
        entry = {'target': mid, 'label': metric['label'], 'unit': metric['unit'], 'criterion': metric['criterion'],
                 'reported_values': reported, 'restricted_values': sum(1 for v in vals if v['s'] == 'restricted'),
                 'not_reported_values': sum(1 for v in vals if v['s'] == 'not_reported')}
        if metric['restricted']:
            entry.update(decision='rejected', reason='Restricted by scientific contract: ' + (metric['why'] or ''))
        elif mid in TARGET_REJECTIONS:
            entry.update(decision='rejected', reason=TARGET_REJECTIONS[mid])
        elif mid == 'PSI-69:burning_rate':
            rows, _ = flex_burning_rate_rows(spine)
            groups_flex = len({r['group'] for r in rows})
            ok = groups_flex >= C.MODEL_GATE['min_independent_groups']
            entry.update(decision='eligible_for_grouped_validation' if ok else 'rejected',
                         independent_condition_groups=groups_flex,
                         reason=('Documented definition and unit (NASA/TP-2015-216046), single ISS method, '
                                 f'{groups_flex} condition groups; inputs reported without imputation.') if ok else
                         'Too few independent condition groups.')
        else:
            entry.update(decision='rejected', reason='No documented target definition in the scientific contract.')
        out.append(entry)
    return out


def train_all(spine: dict, out_dir: Path, code_version: str) -> dict:
    eligibility = target_eligibility(spine)
    registry = {'registry_version': 1, 'dataset_version': spine['dataset']['version'],
                'manifest_sha256': spine['dataset']['manifest_sha256'], 'contract_version': C.CONTRACT_VERSION,
                'gate': C.MODEL_GATE, 'eligibility': eligibility, 'models': []}
    if any(e['target'] == 'PSI-69:burning_rate' and e['decision'] == 'eligible_for_grouped_validation' for e in eligibility):
        rows, exclusions = flex_burning_rate_rows(spine)
        evaluation = evaluate_flex(rows)
        X = np.array([[r['features'][f] for f in FLEX_FEATURES] for r in rows])
        y = np.array([r['target'] for r in rows])
        alpha = select_alpha(X, y, [r['group'] for r in rows])
        final = fit_ridge(X, y, alpha)
        model_id = MODEL_ID
        version = f"1.0.0+{spine['dataset']['manifest_sha256'][:8]}"
        beats_baseline = evaluation['metrics']['ridge']['mae'] < evaluation['metrics']['per_fuel_mean']['mae']
        artifact = {
            'model_id': model_id, 'version': version, 'kind': MODEL_KIND,
            'features': FLEX_FEATURES, 'feature_units': {'fuel_heptane': 'indicator (1 = n-heptane, 0 = methanol)',
                'oxygen': 'mol/mol', 'pressure_kpa': 'kPa', 'he_fraction': 'mol/mol', 'co2_fraction': 'mol/mol',
                'initial_diameter_mm': 'mm'},
            'target': {'id': 'PSI-69:burning_rate', 'definition': 'FLEX d²-law burning-rate constant', 'unit': 'mm^2/s'},
            'coefficients_standardized': final['w'].tolist(), 'intercept': float(final['b']),
            'feature_mean': final['mean'].tolist(), 'feature_std': final['std'].tolist(), 'alpha': alpha,
        }
        model_dir = out_dir / model_id / version
        model_dir.mkdir(parents=True, exist_ok=True)
        (model_dir / 'model.json').write_text(json.dumps(artifact, indent=2))
        registry['models'].append({
            'model_id': model_id, 'version': version, 'training_code_version': code_version,
            'training_code_sha256': training_code_sha256(), 'data_release': spine['dataset']['version'],
            'manifest_sha256': spine['dataset']['manifest_sha256'], 'inputs': FLEX_FEATURES,
            'target': artifact['target'], 'training_records': len(rows),
            'independent_condition_groups': len({r['group'] for r in rows}), 'excluded_records': exclusions,
            'validation': {'procedure': f"{evaluation['folds']}-fold grouped CV by condition signature; alpha by inner grouped CV on training folds only",
                           **evaluation},
            'beats_per_fuel_baseline': beats_baseline,
            'uncertainty': 'Predictive uncertainty not validated',
            'applicability_domain': applicability_domain(rows),
            'artifact': _display_path(model_dir / 'model.json', out_dir),
            'artifact_sha256': sha256_file(model_dir / 'model.json'),
            'approval_status': 'not_approved',
            'approval_note': ('Engineering evaluation only. No qualified scientific reviewer has approved this model; '
                              'predictions are disabled in every user interface.'),
            'limitations': [
                'Inputs are prepared ambient compositions and pressure; no gravity variation (all ISS μg).',
                'Burning-rate values are provisional source values; FLEX coverage (274/280/284) and Test 114 remain open.',
                'Grouped CV estimates interpolation to unseen condition groups within the observed range only.',
                'Ridge regression is linear in inputs; physical d²-law dependences are not encoded.',
            ],
        })
    return registry


def registry_markdown(reg: dict) -> str:
    lines = ['# Model feasibility and evaluation report', '',
             f"Dataset `{reg['dataset_version']}` (manifest `{reg['manifest_sha256'][:16]}…`), contract `{reg['contract_version']}`.",
             'Generated by `python -m ml.train`. Every number below comes from that executed run.', '',
             '## Gate', '', reg['gate']['rule'], '', '## Target eligibility', '',
             '| Target | Unit | Reported | Restricted | Missing | Decision | Reason |', '|---|---|---:|---:|---:|---|---|']
    for e in reg['eligibility']:
        lines.append(f"| {e['target']} ({e['label']}) | {e['unit'] or '—'} | {e['reported_values']} | {e['restricted_values']} | "
                     f"{e['not_reported_values']} | {e['decision']} | {e['reason']} |")
    for m in reg['models']:
        v = m['validation']
        lines += ['', f"## {m['model_id']} {m['version']}", '',
                  f"**Approval status: {m['approval_status']}.** {m['approval_note']}", '',
                  f"Training records: {m['training_records']} · independent condition groups: {m['independent_condition_groups']} · "
                  f"excluded: {json.dumps(m['excluded_records'])}", '', f"Validation: {v['procedure']}.", '',
                  '| Model | MAE (mm²/s) | RMSE (mm²/s) | Bias | n |', '|---|---:|---:|---:|---:|']
        for name, r in v['metrics'].items():
            lines.append(f"| {name} | {r['mae']:.4f} | {r['rmse']:.4f} | {r['bias']:+.4f} | {r['n']} |")
        lines += ['', f"Relative MAE improvement over per-fuel mean baseline: {v['skill_vs_per_fuel_mean_mae']:.1%}. "
                  f"Beats per-fuel baseline: {m['beats_per_fuel_baseline']}.", '', '### Per fuel', '',
                  '| Model | Fuel | MAE | RMSE | n |', '|---|---|---:|---:|---:|']
        for name, fuels in v['per_fuel'].items():
            for fuel, r in fuels.items():
                lines.append(f"| {name} | {fuel} | {r['mae']:.4f} | {r['rmse']:.4f} | {r['n']} |")
        lines += ['', '### Largest cross-validation errors', '', '| FLEX test | Fuel | Observed | CV prediction | Error | Flags |',
                  '|---|---|---:|---:|---:|---|']
        for f in v['largest_errors']:
            lines.append(f"| {f['flex_test']} (row {f['row']}) | {f['fuel']} | {f['observed']:.3f} | {f['cv_prediction']:.3f} | "
                         f"{f['error']:+.3f} | {', '.join(f['flags'])} |")
        lines += ['', f"Uncertainty: {m['uncertainty']}.", '', '### Limitations', ''] + [f'- {x}' for x in m['limitations']]
        lines += ['', '### Applicability domain', '', m['applicability_domain']['rule'], '', '```json',
                  json.dumps(m['applicability_domain']['per_fuel_feature_ranges'], indent=1), '```']
    if not reg['models']:
        lines += ['', 'Training not scientifically supported by current data: no target passed the gate.']
    return '\n'.join(lines) + '\n'

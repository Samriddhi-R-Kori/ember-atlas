"""Grouped cross-validation against mean baselines, plus the per-fuel applicability domain."""
import numpy as np

from app.science import contract as C
from ml.config import FLEX_FEATURES, OUTER_FOLDS
from ml.training.ridge import fit_ridge, group_folds, predict_ridge, select_alpha


def metrics(y, p):
    err = p - y
    return {'mae': float(np.mean(np.abs(err))), 'rmse': float(np.sqrt(np.mean(err ** 2))),
            'bias': float(np.mean(err)), 'n': int(len(y))}


def evaluate_flex(rows, k=OUTER_FOLDS):
    X = np.array([[r['features'][f] for f in FLEX_FEATURES] for r in rows])
    y = np.array([r['target'] for r in rows])
    groups = [r['group'] for r in rows]
    fuels = np.array([r['fuel'] for r in rows])
    folds = group_folds(groups, k)
    preds = {'global_mean': np.zeros_like(y), 'per_fuel_mean': np.zeros_like(y), 'ridge': np.zeros_like(y)}
    chosen = []
    for f in range(k):
        tr, te = folds != f, folds == f
        preds['global_mean'][te] = y[tr].mean()
        for fuel in set(fuels[te]):
            mask = te & (fuels == fuel)
            train_fuel = tr & (fuels == fuel)
            preds['per_fuel_mean'][mask] = y[train_fuel].mean() if train_fuel.any() else y[tr].mean()
        alpha = select_alpha(X[tr], y[tr], [g for g, t in zip(groups, tr) if t])
        chosen.append(alpha)
        preds['ridge'][te] = predict_ridge(fit_ridge(X[tr], y[tr], alpha), X[te])
        # Leakage guard: no group appears in both sides of a split.
        assert not set(np.array(groups)[tr]) & set(np.array(groups)[te])
    results = {name: metrics(y, p) for name, p in preds.items()}
    per_fuel = {name: {fuel: metrics(y[fuels == fuel], p[fuels == fuel]) for fuel in sorted(set(fuels))}
                for name, p in preds.items()}
    residual = preds['ridge'] - y
    worst = np.argsort(-np.abs(residual))[:8]
    failures = [{'record_id': rows[i]['record_id'], 'row': rows[i]['row'], 'flex_test': rows[i]['ident'],
                 'fuel': rows[i]['fuel'], 'observed': float(y[i]), 'cv_prediction': float(preds['ridge'][i]),
                 'error': float(residual[i]), 'flags': rows[i]['flags']} for i in worst]
    return {'folds': k, 'fold_alphas': chosen, 'metrics': results, 'per_fuel': per_fuel,
            'largest_errors': failures, 'skill_vs_per_fuel_mean_mae': 1 - results['ridge']['mae'] / results['per_fuel_mean']['mae']}


def applicability_domain(rows):
    domain = {}
    for fuel in sorted({r['fuel'] for r in rows}):
        sub = [r for r in rows if r['fuel'] == fuel]
        domain[fuel] = {f: {'min': min(r['features'][f] for r in sub), 'max': max(r['features'][f] for r in sub)}
                        for f in FLEX_FEATURES if f != 'fuel_heptane'}
        domain[fuel]['n'] = len(sub)
    return {'per_fuel_feature_ranges': domain, 'gravity': C.GRAVITY_RULE['category'],
            'method': 'FLEX ISS droplet d²-law burning-rate constant',
            'rule': ('A query is inside the domain only if its fuel was trained on, every input is reported and lies '
                     'within that fuel\'s observed training range, and gravity is orbital microgravity. Range '
                     'membership is a support warning, not a statistical confidence statement.')}

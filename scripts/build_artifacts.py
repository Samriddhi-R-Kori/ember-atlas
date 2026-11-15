"""Rebuild every derived artifact from the PostgreSQL release: dataset inventory, ML model and report,
grounded-answer (retrieval) audit, and the static frontend export.

    python scripts/build_artifacts.py

Writes docs/verification/DATASET_INVENTORY_v1.{json,md}, docs/verification/AI_EVALUATION_RESULTS.{json,md},
ml/artifacts/ + ml/reports/ (via ml.train) and frontend/public/data/<export>/. Use scripts/export_static.py when only
the static export needs refreshing (it never retrains the model).
"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path[:0] = [str(ROOT / 'backend'), str(ROOT)]

from sqlalchemy.orm import Session  # noqa: E402

from app.database import engine  # noqa: E402
from app.science.ai_eval import run as run_ai_eval  # noqa: E402
from app.science.export import write_static_export  # noqa: E402
from app.science.inventory import build_inventory, inventory_markdown  # noqa: E402
from app.science.spine import build_spine  # noqa: E402
from ember_atlas.paths import AI_EVALUATION_RESULTS, ML_ARTIFACTS, ML_REPORTS, MODEL_REGISTRY, STATIC_EXPORT_DIR, VERIFICATION_DIR  # noqa: E402
from ml.train import code_version  # noqa: E402
from ml.training.registry import registry_markdown, train_all  # noqa: E402


def dump(path: Path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=1, ensure_ascii=False) + '\n')


def main():
    with Session(engine()) as session:
        spine = build_spine(session)
        inventory = build_inventory(session)
    dump(VERIFICATION_DIR / 'DATASET_INVENTORY_v1.json', inventory)
    (VERIFICATION_DIR / 'DATASET_INVENTORY_v1.md').write_text(inventory_markdown(inventory) + '\n')
    registry = train_all(spine, ML_ARTIFACTS, code_version())
    dump(MODEL_REGISTRY, registry)
    ML_REPORTS.mkdir(parents=True, exist_ok=True)
    (ML_REPORTS / 'MODEL_EVALUATION_REPORT.md').write_text(registry_markdown(registry))
    ai_eval = run_ai_eval(spine)
    ai_eval['caveats'] = [
        'The 20-case set was used during development (two retrieval fixes and one grader fix followed the first run, '
        'which passed 17/20); it is a regression suite, not a held-out benchmark.',
        'Extractive answers are copied evidence sentences; relevance and ordering are often imperfect even when audits pass.',
        'No LLM provider was evaluated.',
    ]
    dump(AI_EVALUATION_RESULTS, ai_eval)
    lines = ['# Grounded-answer (retrieval) audit results', '', f"Provider: `{ai_eval['provider']}`. LLM mode: {ai_eval['llm_mode']}.", '',
             '| Metric | Value |', '|---|---:|'] + [f'| {k} | {v} |' for k, v in ai_eval['metrics'].items()]
    lines += ['', '## Caveats', ''] + [f'- {c}' for c in ai_eval['caveats']]
    lines += ['', '## Cases', '', '| ID | Category | Question | Status | Passed | Problems |', '|---|---|---|---|:-:|---|']
    lines += [f"| {c['id']} | {c['category']} | {c['question']} | {c['status']} | {'✓' if c['passed'] else '✗'} | {'; '.join(c['problems'])} |"
              for c in ai_eval['cases']]
    AI_EVALUATION_RESULTS.with_suffix('.md').write_text('\n'.join(lines) + '\n')
    manifest = write_static_export(spine, registry, STATIC_EXPORT_DIR, ai_eval)
    print(json.dumps({'spine_records': len(spine['records']), 'parameters': inventory['parameter_count'],
                      'models': [(m['model_id'], m['version'], m['approval_status']) for m in registry['models']],
                      'export': manifest}, indent=1))


if __name__ == '__main__':
    main()

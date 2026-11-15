"""Train and evaluate the FLEX burning-rate ridge regression and write ml/artifacts + ml/reports.

    python -m ml.train                       # spine from the PostgreSQL database (DATABASE_URL)
    python -m ml.train --spine PATH          # spine JSON, e.g. the committed static export (no database needed)
    python -m ml.train --check               # evaluate only and compare with the registered results; writes nothing

The model is evaluation-only: approval_status is 'not_approved' and predictions stay disabled in every UI.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import sys
from pathlib import Path

from ember_atlas.paths import ML_ARTIFACTS, ML_REPORTS, MODEL_REGISTRY, REPO_ROOT
from ml.training.registry import registry_markdown, train_all


def load_spine(path: Path | None) -> dict:
    if path:
        return json.loads(Path(path).read_text())
    from sqlalchemy.orm import Session
    from app.database import engine
    from app.science.spine import build_spine
    with Session(engine()) as session:
        return build_spine(session)


def code_version() -> str:
    files = [REPO_ROOT / 'backend/app/science/contract.py', REPO_ROOT / 'backend/app/science/spine.py',
             *sorted((REPO_ROOT / 'ml').rglob('*.py'))]
    return hashlib.sha256(b''.join(p.read_bytes() for p in files)).hexdigest()[:16]


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--spine', type=Path, help='spine JSON instead of the database')
    parser.add_argument('--check', action='store_true', help='compare a fresh evaluation with ml/artifacts/registry.json')
    args = parser.parse_args(argv)
    spine = load_spine(args.spine)
    if args.check:
        import tempfile
        with tempfile.TemporaryDirectory() as tmp:
            fresh = train_all(spine, Path(tmp) / 'artifacts', code_version())
        saved = json.loads(MODEL_REGISTRY.read_text())
        a, b = fresh['models'][0], saved['models'][0]
        same = (a['validation']['metrics'] == b['validation']['metrics'] and a['training_records'] == b['training_records']
                and a['independent_condition_groups'] == b['independent_condition_groups'])
        print(json.dumps({'metrics_reproduced': same, 'fresh': a['validation']['metrics'], 'registered': b['validation']['metrics']}, indent=1))
        return 0 if same else 1
    registry = train_all(spine, ML_ARTIFACTS, code_version())
    MODEL_REGISTRY.write_text(json.dumps(registry, indent=1, ensure_ascii=False) + '\n')
    ML_REPORTS.mkdir(parents=True, exist_ok=True)
    (ML_REPORTS / 'MODEL_EVALUATION_REPORT.md').write_text(registry_markdown(registry))
    for m in registry['models']:
        print(m['model_id'], m['version'], m['approval_status'], {k: round(v['mae'], 4) for k, v in m['validation']['metrics'].items()})
    return 0


if __name__ == '__main__':
    sys.exit(main())

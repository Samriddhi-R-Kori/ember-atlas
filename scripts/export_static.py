"""Rebuild only the static spine export (frontend/public/data/) from PostgreSQL, reusing the registered model
and the saved retrieval audit. Never retrains. Use after contract/spine metadata changes.

    python scripts/export_static.py
"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path[:0] = [str(ROOT / 'backend'), str(ROOT)]

from sqlalchemy.orm import Session  # noqa: E402

from app.database import engine  # noqa: E402
from app.science.export import write_static_export  # noqa: E402
from app.science.spine import build_spine  # noqa: E402
from ember_atlas.paths import AI_EVALUATION_RESULTS, MODEL_REGISTRY, STATIC_EXPORT_DIR  # noqa: E402


def main():
    registry = json.loads(MODEL_REGISTRY.read_text())
    ai_eval = json.loads(AI_EVALUATION_RESULTS.read_text())
    with Session(engine()) as session:
        spine = build_spine(session)
    manifest = write_static_export(spine, registry, STATIC_EXPORT_DIR, ai_eval)
    print(json.dumps({'spine_records': len(spine['records']), 'contract': spine['contract_version'], 'export': manifest}, indent=1))


if __name__ == '__main__':
    main()

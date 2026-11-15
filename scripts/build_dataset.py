"""Rebuild dataset/processed/ from dataset/raw/, re-pin dataset/metadata/baseline.json and rewrite the manifest.

    python scripts/build_dataset.py

Requires the reference documents (python scripts/restore_references.py --download): the curation review step
verifies their SHA-256 hashes. Raw files are never modified; the pipeline checks their hashes before and after.
Rebuilding changes build_manifest.json (it records a timestamp), so the baseline is re-pinned here. A database
that already holds the previous pin must be recreated before ingesting the new one (ingestion never overwrites).
"""
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path[:0] = [str(ROOT)]
from ember_atlas.paths import BASELINE, PROCESSED_DIR  # noqa: E402
from curation.pipeline import build  # noqa: E402


def main():
    summary = build(PROCESSED_DIR)
    manifest = json.loads((PROCESSED_DIR / 'build_manifest.json').read_text())
    from curation.extract import sha256
    baseline = {
        'dataset_version': 'p0_v1_review', 'pipeline_version': manifest['pipeline_version'],
        'scientific_approval': False, 'external_signoff': False,
        'build_manifest_sha256': sha256(PROCESSED_DIR / 'build_manifest.json'),
        'source_hashes': manifest['source_hashes'], 'output_hashes': manifest['output_hashes'],
        'review_evidence_hashes': manifest['review_evidence_hashes'],
        'note': 'Pinned by scripts/build_dataset.py. app.ingestion refuses to load data whose hashes differ from this file.',
    }
    BASELINE.parent.mkdir(parents=True, exist_ok=True)
    BASELINE.write_text(json.dumps(baseline, indent=1, ensure_ascii=False) + '\n')
    print(json.dumps({'csv_rows': summary['csv_rows'], 'duplicates_retained': summary['duplicates_retained'],
                      'baseline': str(BASELINE.relative_to(ROOT))}, indent=1))
    subprocess.run([sys.executable, str(ROOT / 'scripts/validate_dataset.py'), '--write'], check=True)


if __name__ == '__main__':
    main()

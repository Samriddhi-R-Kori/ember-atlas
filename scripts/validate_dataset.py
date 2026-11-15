"""Write or check dataset/metadata/manifest.json, the machine-readable catalogue of every dataset file.

    python scripts/validate_dataset.py            # check files, hashes, baseline and record counts (exit 1 on any mismatch)
    python scripts/validate_dataset.py --write    # regenerate the manifest from the current dataset/ (used by build_dataset.py)

The manifest lists, for each file: dataset-relative path, processing stage, investigation, format, SHA-256, size,
whether it is committed or restored by scripts/restore_references.py, its upstream source and its intended use.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import sys
from collections import Counter
from pathlib import Path

sys.path[:0] = [str(Path(__file__).resolve().parents[1]), str(Path(__file__).resolve().parents[1] / 'backend')]
from ember_atlas.paths import (BASELINE, DATASET_DIR, INVESTIGATIONS, MANIFEST, METADATA_DIR, NASA_PSI_REFERENCES,  # noqa: E402
                               PARTIAL_GRAVITY_REFERENCES, PROCESSED_DIR, RAW_DIR, REFERENCES_DIR, dataset_rel, investigation_of)

# Counts reproduced from the original database and curated release; database counts are checked by init_database.py.
EXPECTED_COUNTS = {'source_rows_by_investigation': {'PSI-69': 274, 'PSI-39': 87, 'PSI-101': 109, 'PSI-107': 469, 'PSI-25': 129},
                   'source_records': 1068, 'exact_repeats_retained': 42, 'observations': 12484, 'quality_issues': 363,
                   'spice_workbook_records': 636, 'spice_workbook_observations': 11613, 'spice_workbook_cells': 19641,
                   'reconciliation_links': 2960, 'media_references': 1311, 'flame_length_rows': 12}
EXPECTED_DATABASE_COUNTS = {'source_record': 1716, 'parameter_observation': 24097, 'measurement': 248, 'quality_issue': 363,
                            'evidence_location': 35015, 'reconciliation_link': 2960, 'record_quality': 5461, 'experiment_run': 0}
DOCS = {'README.md'}   # documentation inside dataset/ is not catalogued as data
NOT_COMMITTED_SUFFIXES = {'.pdf', '.docx'}
NOT_COMMITTED_NAMES = {'psi_main.js', 'nasa_data_license.html', 'decisions.jsonl',
                       'official_PSI-25_Reference Data_Fan calibration data.xlsx',
                       'official_PSI-39_Science Documents_CFI_DataSummary_Spreadsheet_Jan2021.xlsx'}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def jsonl_count(path: Path) -> int:
    with path.open(encoding='utf-8') as f:
        return sum(1 for line in f if line.strip())


def committed(path: Path) -> bool:
    return not (path.suffix in NOT_COMMITTED_SUFFIXES or path.name in NOT_COMMITTED_NAMES)


def stage(path: Path) -> str:
    return path.relative_to(DATASET_DIR).parts[0]


def intended_use(path: Path) -> str:
    rel = path.relative_to(DATASET_DIR).as_posix()
    if rel.startswith('raw/'):
        if path.name in ('info.md', 'layout.json'):
            return 'NASA catalog summary of the investigation (hashed curation input)'
        if path.suffix in ('.xls', '.xlsx'):
            return 'SPICE flight/smoke-point/flame-length workbook: workbook cells, reconciliation, measurements'
        return 'NASA experimental table: source records, conditions, measurements, evidence matching, gap analysis, ML (FLEX)'
    if rel.startswith('processed/'):
        return 'curated release loaded into PostgreSQL by scripts/init_database.py'
    if rel.startswith('references/findings/'):
        return 'AI-assisted candidate findings pending human review (shown as source statements with page links)'
    if rel.startswith('references/'):
        return 'provenance evidence: catalog snapshots, acquisition manifests, cited documents'
    return 'dataset metadata'


def upstream(path: Path, official: dict) -> dict | None:
    if path.is_relative_to(RAW_DIR):
        digest = sha256(path)
        match = official.get(digest)
        inv = investigation_of(dataset_rel(path))
        base = {'investigation_catalog': f'https://psi.nasa.gov/physci/repo/data/investigations/{inv}'}
        if match:
            base.update(official_file=match['official_file_name'], official_download=match['url'], byte_identical_to_official=True)
        else:
            base.update(packaging='NASA catalog text as packaged by the Fotia project (MIT; dataset/upstream/FOTIA_LICENSE)',
                        byte_identical_to_official=False)
        return base
    return None


def source_title(path: Path, rel: str, inv, official: dict, retrieval: dict) -> str:
    """Human-readable title of what the file is (official NASA file name, document title or curated product)."""
    if path.is_relative_to(RAW_DIR):
        o = official.get(sha256(path))
        if o:
            return f"NASA PSI {inv} official file: {o['official_file_name']}"
        return f"NASA PSI {inv} catalog summary ({path.name}, as packaged by the Fotia project)"
    if path.is_relative_to(PROCESSED_DIR):
        return f"Ember Atlas curated release p0_v1_review: {path.relative_to(PROCESSED_DIR).as_posix()}"
    from app.science.contract import REFERENCES
    titles = {Path(r['local']).name: f"{r['id']}: {r['title']}" for r in REFERENCES.values() if r.get('local')}
    if path.name in titles:
        return titles[path.name]
    if path.name.endswith('_ntrs.json'):
        return f"NASA Technical Reports Server metadata record ({path.name})"
    if path.name in retrieval:
        e = retrieval[path.name]
        return e.get('use') or f"Retrieved from {e.get('final_url') or e.get('url')}"
    o = next((o for o in official.values() if o['file'] == path.name), None)
    if o:
        return f"NASA PSI {o['investigation']} official file: {o['official_file_name']}"
    if path.name.endswith('_catalog.json'):
        return f"NASA PSI catalog record snapshot ({path.name})"
    return path.name


def build_manifest() -> dict:
    official = {o['sha256']: o for o in json.loads((NASA_PSI_REFERENCES / 'official_file_manifest.json').read_text()) if o.get('sha256')}
    retrieval = {e['file']: e for e in json.loads((NASA_PSI_REFERENCES / 'retrieval_manifest.json').read_text())}
    retrieval |= {e['file']: e for e in json.loads((PARTIAL_GRAVITY_REFERENCES / 'retrieval_manifest.json').read_text())}
    registry = {r['investigation']: r for r in json.loads((PROCESSED_DIR / 'review/registry.json').read_text())}
    build = json.loads((PROCESSED_DIR / 'build_manifest.json').read_text())
    units = {}
    for d in json.loads((PROCESSED_DIR / 'data_dictionary.json').read_text()):
        if d.get('source_unit') or d.get('canonical_unit'):
            units.setdefault(d['source'], []).append({'column': d.get('source_heading') or d.get('field'), 'sheet': d.get('sheet'),
                                                      'source_unit': d.get('source_unit'), 'canonical_unit': d.get('canonical_unit')})
    files = []
    for path in sorted(p for p in DATASET_DIR.rglob('*') if p.is_file() and p != MANIFEST and p.name not in DOCS and '__pycache__' not in p.parts):
        rel = dataset_rel(path)
        try:
            inv = investigation_of(rel) if path.is_relative_to(RAW_DIR) or rel.startswith('dataset/processed/PSI-') else None
        except ValueError:
            inv = None
        entry = {'path': rel, 'stage': stage(path), 'investigation': inv,
                 'investigation_name': f"{INVESTIGATIONS[inv]['short']} — {INVESTIGATIONS[inv]['title']}" if inv else None,
                 'source_title': source_title(path, rel, inv, official, retrieval), 'doi': registry[inv]['doi'] if inv else None,
                 'format': path.suffix.lstrip('.') or 'none', 'units': units.get(rel),
                 'sha256': sha256(path), 'bytes': path.stat().st_size, 'committed': committed(path), 'intended_use': intended_use(path)}
        if (src := upstream(path, official)):
            entry['source'] = src
        elif path.name in retrieval:
            entry['source'] = {'url': retrieval[path.name].get('final_url') or retrieval[path.name].get('url'),
                               'restore': 'python scripts/restore_references.py --download'}
        elif path.is_relative_to(NASA_PSI_REFERENCES) and (o := next((o for o in official.values() if o['file'] == path.name), None)):
            entry['source'] = {'official_download': o['url'], 'restore': 'python scripts/restore_references.py --download'}
        if entry['committed'] and isinstance(entry.get('source'), dict):
            entry['source'].pop('restore', None)
        files.append(entry)
    counts = Counter(f['stage'] for f in files)
    return {
        'name': 'Ember Atlas NASA PSI microgravity combustion dataset',
        'release': 'p0_v1_review', 'pipeline_version': build['pipeline_version'], 'scientific_approval': False,
        'generated_by': 'python scripts/validate_dataset.py --write (called by scripts/build_dataset.py)',
        'dataset_dir': 'dataset', 'build_manifest_sha256': sha256(PROCESSED_DIR / 'build_manifest.json'),
        'investigations': [{'id': k, 'short': v['short'], 'title': v['title'], 'raw_dir': f"dataset/raw/{v['slug']}",
                            'doi': registry[k]['doi'], 'catalog_url': registry[k]['catalog_url'], 'license': registry[k]['license'],
                            'license_url': registry[k]['license_url'], 'catalog_version': registry[k]['catalog_version'],
                            'expected_source_rows': EXPECTED_COUNTS['source_rows_by_investigation'][k]} for k, v in INVESTIGATIONS.items()],
        'expected_counts': EXPECTED_COUNTS, 'expected_database_counts': EXPECTED_DATABASE_COUNTS,
        'file_counts_by_stage': dict(counts), 'files': files,
    }


def check() -> list[str]:
    problems = []
    manifest = json.loads(MANIFEST.read_text())
    listed = {f['path']: f for f in manifest['files']}
    for rel, f in listed.items():
        path = DATASET_DIR / Path(rel).relative_to('dataset')
        if not path.exists():
            if f['committed']:
                problems.append(f'missing committed file: {rel}')
            continue
        if sha256(path) != f['sha256']:
            problems.append(f'hash mismatch: {rel}')
    for path in DATASET_DIR.rglob('*'):
        if path.is_file() and path != MANIFEST and path.name not in DOCS and '__pycache__' not in path.parts and dataset_rel(path) not in listed:
            problems.append(f'file not in manifest: {dataset_rel(path)}')
    baseline = json.loads(BASELINE.read_text())
    if sha256(PROCESSED_DIR / 'build_manifest.json') != baseline['build_manifest_sha256']:
        problems.append('processed build manifest differs from dataset/metadata/baseline.json')
    records = [json.loads(line) for line in (PROCESSED_DIR / 'source_records.jsonl').read_text(encoding='utf-8').splitlines() if line.strip()]
    observed = {'source_rows_by_investigation': dict(Counter(r['investigation'] for r in records)), 'source_records': len(records),
                'exact_repeats_retained': sum(bool(r['exact_duplicate_of']) for r in records),
                'observations': jsonl_count(PROCESSED_DIR / 'observations.jsonl'), 'quality_issues': jsonl_count(PROCESSED_DIR / 'quality_issues.jsonl'),
                'spice_workbook_records': jsonl_count(PROCESSED_DIR / 'spice/records.jsonl'),
                'spice_workbook_observations': jsonl_count(PROCESSED_DIR / 'spice/observations.jsonl'),
                'spice_workbook_cells': jsonl_count(PROCESSED_DIR / 'spice/workbook_cells.jsonl'),
                'reconciliation_links': jsonl_count(PROCESSED_DIR / 'spice/reconciliation_links.jsonl'),
                'media_references': jsonl_count(PROCESSED_DIR / 'spice/media_references.jsonl'),
                'flame_length_rows': jsonl_count(PROCESSED_DIR / 'spice/flame_length.jsonl')}
    for key, want in manifest['expected_counts'].items():
        if observed[key] != want:
            problems.append(f'count {key}: expected {want}, found {observed[key]}')
    return problems


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--write', action='store_true', help='regenerate dataset/metadata/manifest.json')
    args = parser.parse_args()
    if args.write:
        METADATA_DIR.mkdir(parents=True, exist_ok=True)
        manifest = build_manifest()
        MANIFEST.write_text(json.dumps(manifest, indent=1, ensure_ascii=False) + '\n')
        print(f"wrote {MANIFEST.relative_to(DATASET_DIR.parent)}: {len(manifest['files'])} files {manifest['file_counts_by_stage']}")
        return
    problems = check()
    restorable = sum(1 for f in json.loads(MANIFEST.read_text())['files'] if not f['committed'] and not (REFERENCES_DIR.parent / Path(f['path']).relative_to('dataset')).exists())
    if restorable:
        print(f'note: {restorable} reference documents are not present locally (python scripts/restore_references.py --download)')
    print('dataset OK: files, hashes, baseline and record counts match the manifest' if not problems else '\n'.join(problems))
    sys.exit(1 if problems else 0)


if __name__ == '__main__':
    main()

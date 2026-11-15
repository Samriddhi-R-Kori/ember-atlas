"""Single source of truth for Ember Atlas file locations.

Every component (curation pipeline, backend, ML, scripts, tests) resolves files through this module.
Scientific data lives under one directory, ``dataset/``, which can be relocated with the
``EMBER_ATLAS_DATASET_DIR`` environment variable. Provenance identifiers stored in the data and the
database are dataset-relative strings such as ``dataset/raw/flex/FLEX.csv``; they do not depend on
where the repository is checked out.
"""
from __future__ import annotations

import os
from pathlib import Path, PurePosixPath

REPO_ROOT = Path(__file__).resolve().parents[1]
DATASET_DIR = Path(os.environ.get('EMBER_ATLAS_DATASET_DIR') or REPO_ROOT / 'dataset').resolve()
DATASET_PREFIX = 'dataset'

RAW_DIR = DATASET_DIR / 'raw'
PROCESSED_DIR = DATASET_DIR / 'processed'
METADATA_DIR = DATASET_DIR / 'metadata'
REFERENCES_DIR = DATASET_DIR / 'references'
NASA_PSI_REFERENCES = REFERENCES_DIR / 'nasa-psi'          # catalog snapshots, acquisition manifests, restored reports
PARTIAL_GRAVITY_REFERENCES = REFERENCES_DIR / 'partial-gravity'
FINDINGS_DIR = REFERENCES_DIR / 'findings'                 # AI-assisted candidate findings (pending review)
BASELINE = METADATA_DIR / 'baseline.json'                  # pinned hashes checked before database ingestion
MANIFEST = METADATA_DIR / 'manifest.json'

ML_DIR = REPO_ROOT / 'ml'
ML_ARTIFACTS = ML_DIR / 'artifacts'
MODEL_REGISTRY = ML_ARTIFACTS / 'registry.json'
ML_REPORTS = ML_DIR / 'reports'

DOCS_DIR = REPO_ROOT / 'docs'
VERIFICATION_DIR = DOCS_DIR / 'verification'
VERIFICATION_RESULTS = VERIFICATION_DIR / 'VERIFICATION_RESULTS.json'
AI_EVALUATION_RESULTS = VERIFICATION_DIR / 'AI_EVALUATION_RESULTS.json'
SCREENSHOTS_DIR = REPO_ROOT / 'assets' / 'screenshots'
STATIC_EXPORT_DIR = REPO_ROOT / 'frontend' / 'public' / 'data'

# NASA Physical Sciences Informatics investigations. Identifiers are NASA's; slugs name dataset/raw/ folders.
INVESTIGATIONS = {
    'PSI-69': {'slug': 'flex', 'short': 'FLEX', 'title': 'Flame Extinguishment Experiment', 'table': 'FLEX.csv'},
    'PSI-39': {'slug': 'cfi', 'short': 'CFI', 'title': 'Cool Flames Investigation', 'table': 'CFI.csv'},
    'PSI-101': {'slug': 'same-r', 'short': 'SAME-R', 'title': 'Smoke Aerosol Measurement Experiment Reflight', 'table': 'SAME-R.csv'},
    'PSI-107': {'slug': 'spice', 'short': 'SPICE', 'title': 'Smoke Point In Co-flow Experiment', 'table': 'Spice.csv'},
    'PSI-25': {'slug': 'bass-ii', 'short': 'BASS-II', 'title': 'Burning and Suppression of Solids II', 'table': 'BASS-II.csv'},
}
SLUG_TO_INVESTIGATION = {v['slug']: k for k, v in INVESTIGATIONS.items()}


def raw_dir(investigation: str) -> Path:
    return RAW_DIR / INVESTIGATIONS[investigation]['slug']


def dataset_rel(path: Path | str) -> str:
    """Provenance identifier of a file inside the dataset directory, e.g. ``dataset/raw/flex/FLEX.csv``."""
    rel = Path(path).resolve().relative_to(DATASET_DIR)
    return str(PurePosixPath(DATASET_PREFIX, *rel.parts))


def resolve(identifier: str) -> Path:
    """Inverse of :func:`dataset_rel`; repository-relative paths outside ``dataset/`` resolve against the repo root."""
    parts = PurePosixPath(identifier).parts
    if parts and parts[0] == DATASET_PREFIX:
        return DATASET_DIR.joinpath(*parts[1:])
    return REPO_ROOT.joinpath(*parts)


def investigation_of(identifier: str) -> str:
    """NASA investigation id for a dataset/raw/<slug>/... identifier."""
    parts = PurePosixPath(identifier.split('::', 1)[0]).parts
    for part in parts:
        if part in SLUG_TO_INVESTIGATION:
            return SLUG_TO_INVESTIGATION[part]
        if part.startswith('PSI-'):
            return part
    raise ValueError(f'No investigation in source identifier: {identifier}')

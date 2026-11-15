"""Versioned static export for the public (no-database) demo mode.

Export policy (also written into export_manifest.json):
* NASA source records are exported with their provisional status; nothing is relabelled
  as approved. The provisional notice is part of the payload and of every page.
* AI-extracted candidates are exported only after a human `confirm`/`correct` decision,
  and reviewer identities are removed.
* Model artifacts are exported only as evaluation summaries; unapproved models carry no
  coefficients, so the static site cannot produce predictions.
* No database URLs, credentials, absolute local paths or reviewer data are included.
"""
from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path

from . import review

FORBIDDEN = [re.compile(p) for p in (r'postgresql\+psycopg://', r'/home/', r'/tmp/', r'PASSWORD', r'api[_-]?key', r'"reviewer"\s*:')]


def public_registry(registry: dict) -> dict:
    models = []
    for m in registry['models']:
        public = {k: v for k, v in m.items() if k not in ('artifact', 'artifact_sha256')}
        public['prediction_available'] = m['approval_status'] == 'approved'
        models.append(public)
    return {**registry, 'models': models}


def assert_public_safe(text: str):
    for pattern in FORBIDDEN:
        match = pattern.search(text)
        if match:
            raise ValueError(f'Static export contains forbidden content: {match.group(0)!r}')


def write_static_export(spine: dict, registry: dict, public_data: Path, ai_eval: dict | None = None) -> dict:
    from ember_atlas.paths import AI_EVALUATION_RESULTS as ai_eval_path, VERIFICATION_RESULTS as ver_path
    if ai_eval is None and ai_eval_path.exists():
        ai_eval = json.loads(ai_eval_path.read_text())
    verification = json.loads(ver_path.read_text()) if ver_path.exists() else None
    payload = {**spine, 'models': public_registry(registry), 'verification': verification, 'reviewed_findings': review.approved_public(),
               'ai_evaluation': ai_eval, 'mode': 'static_export'}
    text = json.dumps(payload, separators=(',', ':'), ensure_ascii=False)
    assert_public_safe(text)
    digest = hashlib.sha256(text.encode()).hexdigest()
    version = f"{spine['dataset']['version']}-spine{spine['spine_version']}-{digest[:8]}"
    target = public_data / version
    target.mkdir(parents=True, exist_ok=True)
    (target / 'spine.json').write_text(text)
    manifest = {'export_version': version, 'sha256': digest, 'bytes': len(text.encode()),
                'dataset_version': spine['dataset']['version'], 'manifest_sha256': spine['dataset']['manifest_sha256'],
                'scientific_approval': False,
                'policy': ('Provisional NASA source records with visible review status; AI candidates only after human '
                           'review (reviewer identity removed); model evaluations without coefficients; no credentials, '
                           'local paths or reviewer data.'),
                'path': f'data/{version}/spine.json'}
    (public_data / 'latest.json').write_text(json.dumps(manifest, indent=1))
    # Only generated export directories (pattern <dataset>-spine<ver>-<hash>) are pruned; the
    # public bundle carries exactly one version. Source data is never under public_data.
    for old in public_data.glob(f"{spine['dataset']['version']}-spine*"):
        if old.is_dir() and old.name != version and (old / 'spine.json').exists():
            for f in old.iterdir():
                f.unlink()
            old.rmdir()
    (target / 'export_manifest.json').write_text(json.dumps(manifest, indent=1))
    return manifest

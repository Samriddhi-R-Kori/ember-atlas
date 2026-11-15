"""Restore the reference documents that are deliberately not committed to Ember Atlas.

NASA report PDFs, the SPICE thesis, DOCX guides, two supplementary workbooks, two saved NASA web
assets and the partial-gravity PDFs are excluded from version control because their redistribution
rights are not established (see dataset/README.md). The curation pipeline and database ingestion
verify their SHA-256 hashes, so they must be present locally before `scripts/init_database.py`.

Expected hashes and official URLs come from the committed acquisition manifests:
  dataset/references/nasa-psi/official_file_manifest.json   (NASA PSI downloads)
  dataset/references/nasa-psi/retrieval_manifest.json       (NTRS reports, thesis, catalog snapshots)
  dataset/references/partial-gravity/retrieval_manifest.json
Official files that are byte-identical to a raw input in dataset/raw/ are not duplicated.
A file is written only when its SHA-256 matches; manifests are never modified.

Usage (from the repository root):
  python scripts/restore_references.py --list
  python scripts/restore_references.py --download
  python scripts/restore_references.py --from /path/to/a/folder/with/the/files
"""
import argparse
import hashlib
import json
import sys
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from ember_atlas.paths import NASA_PSI_REFERENCES, PARTIAL_GRAVITY_REFERENCES, RAW_DIR  # noqa: E402

AGENT = {'User-Agent': 'ember-atlas reference restore (research use)'}


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def expected():
    """name -> (directory, sha256, kind, url) for every file the manifests expect locally."""
    raw_hashes = {sha256(p.read_bytes()) for p in RAW_DIR.rglob('*') if p.is_file()}
    out = {}
    for e in json.loads((NASA_PSI_REFERENCES / 'official_file_manifest.json').read_text()):
        if e.get('sha256') and e['sha256'] not in raw_hashes:
            out[e['file']] = (NASA_PSI_REFERENCES, e['sha256'], 'psi_endpoint', e['url'])
    for e in json.loads((NASA_PSI_REFERENCES / 'retrieval_manifest.json').read_text()):
        if e.get('sha256'):
            out[e['file']] = (NASA_PSI_REFERENCES, e['sha256'], 'direct', e.get('final_url') or e['requested_url'])
    for e in json.loads((PARTIAL_GRAVITY_REFERENCES / 'retrieval_manifest.json').read_text()):
        if e.get('sha256'):
            out[e['file']] = (PARTIAL_GRAVITY_REFERENCES, e['sha256'], 'direct', e.get('final_url') or e['url'])
    return out


def download(kind, url):
    def get(u):
        with urllib.request.urlopen(urllib.request.Request(u, headers=AGENT), timeout=90) as r:
            return r.read()
    if kind == 'psi_endpoint':   # NASA PSI returns a signed HTTPS address for the file
        raw = get(url)
        try:
            address = json.loads(raw)
        except ValueError:
            address = raw.decode().strip()
        if not isinstance(address, str) or not address.startswith('https://'):
            raise ValueError('PSI endpoint returned no public HTTPS address')
        return get(address)
    return get(url)


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument('--list', action='store_true', help='show missing files, hashes and URLs')
    group.add_argument('--from', dest='from_dir', type=Path, help='copy missing files from this folder (searched recursively)')
    group.add_argument('--download', action='store_true', help='download missing files from their recorded official URLs')
    args = parser.parse_args()
    files = expected()
    missing = sorted(n for n, (d, h, *_) in files.items() if not (d / n).exists())
    failures = 0
    for name in missing:
        directory, want, kind, url = files[name]
        where = f'{directory.parent.name}/{directory.name}/{name}'
        if args.list:
            print(f'MISSING {where}\n  sha256 {want}\n  {kind}: {url}')
            continue
        try:
            if args.from_dir:
                found = [p for p in args.from_dir.rglob(name) if p.is_file()]
                if not found:
                    raise FileNotFoundError(f'not found under {args.from_dir}')
                data = found[0].read_bytes()
            else:
                data = download(kind, url)
            digest = sha256(data)
            if digest != want:
                raise ValueError(f'SHA-256 mismatch ({digest[:12]}… != {want[:12]}…); not written')
            (directory / name).write_bytes(data)
            print('RESTORED', where, len(data), 'bytes, hash verified')
        except Exception as error:  # report every file; never write unverified bytes
            failures += 1
            print('FAILED', where, '-', error)
    print(f'{len(files)} expected, {len(missing)} missing before; {failures} failed')
    sys.exit(1 if failures else 0)


if __name__ == '__main__':
    main()

"""Extract numeric candidate values from an approved, hash-verified NASA PDF into the local review queue.

Approved documents are the contract REFERENCES with a stored local copy and SHA-256. Output rows carry a
page citation, original value/unit, any unit conversion, unverified condition hints and review flags.
They are appended (idempotent by content id) to dataset/references/findings/extraction_candidates.jsonl, a file separate
from candidates.jsonl; nothing enters the data spine or Q&A corpus until a human reviews it.

Usage:
  python scripts/research/extract_pdf_candidates.py --list
  python scripts/research/extract_pdf_candidates.py bass_tm 36            # dry run: print candidates
  python scripts/research/extract_pdf_candidates.py bass_tm 36 --write    # append to the review queue
"""
import argparse
import json
import sys
from pathlib import Path

PROJECT = Path(__file__).resolve().parents[2]
sys.path[:0] = [str(PROJECT / 'backend'), str(PROJECT)]
from app.science.ai import approved_documents, extract_from_approved  # noqa: E402
from app.science.review import QUEUE  # noqa: E402


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('reference', nargs='?'); ap.add_argument('pages', nargs='*', type=int)
    ap.add_argument('--write', action='store_true'); ap.add_argument('--list', action='store_true')
    a = ap.parse_args()
    if a.list or not a.reference:
        for k, v in approved_documents(PROJECT).items():
            print(f'{k:14} {v["id"]:24} {v["local"]}')
        return
    rows = extract_from_approved(a.reference, a.pages, PROJECT)
    if not a.write:
        for r in rows:
            print(json.dumps({k: r.get(k) for k in ('id', 'original_value', 'original_unit', 'normalized', 'condition_hints', 'flags')}, ensure_ascii=False))
        print(f'{len(rows)} candidates (dry run; use --write to queue them for review)')
        return
    path = QUEUE / 'extraction_candidates.jsonl'
    existing = {json.loads(l)['id'] for l in path.read_text().splitlines() if l.strip()} if path.exists() else set()
    new = [r for r in rows if r['id'] not in existing]
    with path.open('a') as h:
        for r in new:
            h.write(json.dumps(r, ensure_ascii=False) + '\n')
    print(f'{len(new)} new candidates appended to {path.relative_to(PROJECT)} ({len(rows) - len(new)} already queued)')


if __name__ == '__main__':
    main()

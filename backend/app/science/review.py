"""Local, append-only human review queue for AI-extracted candidates.

Candidates (AI proposals) and decisions (human reviews) are stored separately in
`dataset/references/findings/` (decisions.jsonl is local-only and never committed). Nothing is overwritten: a decision is appended with reviewer identity,
timestamp, corrections and evidence; the latest decision defines current status. Only
`confirmed`/`corrected` candidates may ever leave this local queue (for example into a
static export), and then without reviewer identities.
"""
from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from pathlib import Path

from ember_atlas.paths import FINDINGS_DIR

QUEUE = Path(os.environ.get('EMBER_ATLAS_REVIEW_QUEUE', FINDINGS_DIR))
DECISIONS = ('confirm', 'correct', 'reject', 'request_clarification')
STATUS = {'confirm': 'confirmed', 'correct': 'corrected', 'reject': 'rejected', 'request_clarification': 'clarification_requested'}
EXTRACTION_FLAGS = ('Digitized from figure', 'Unit converted', 'Ambiguous', 'Not found')


def _read_jsonl(path: Path):
    if not path.exists():
        return []
    return [json.loads(line) for line in path.read_text().splitlines() if line.strip()]


def candidates(queue: Path = QUEUE):
    return _read_jsonl(queue / 'candidates.jsonl')


def decisions(queue: Path = QUEUE):
    return _read_jsonl(queue / 'decisions.jsonl')


def queue_state(queue: Path = QUEUE):
    history = {}
    for d in decisions(queue):
        history.setdefault(d['candidate_id'], []).append(d)
    items = []
    for c in candidates(queue):
        h = history.get(c['id'], [])
        status = STATUS[h[-1]['decision']] if h else 'pending_review'
        items.append({**c, 'review_status': status, 'history': h})
    return items


def record_decision(candidate_id: str, decision: str, reviewer: str, note: str = '', corrections: dict | None = None,
                    source_evidence: str = '', queue: Path = QUEUE):
    if decision not in DECISIONS:
        raise ValueError(f'decision must be one of {DECISIONS}')
    if not reviewer or not reviewer.strip():
        raise ValueError('reviewer identity is required')
    if decision == 'correct' and not corrections:
        raise ValueError('a correction must state the corrected fields')
    if candidate_id not in {c['id'] for c in candidates(queue)}:
        raise KeyError('unknown candidate')
    entry = {'candidate_id': candidate_id, 'decision': decision, 'reviewer': reviewer.strip(),
             'timestamp': datetime.now(timezone.utc).isoformat(timespec='seconds'), 'note': note,
             'corrections': corrections or {}, 'source_evidence': source_evidence}
    queue.mkdir(parents=True, exist_ok=True)
    with (queue / 'decisions.jsonl').open('a') as handle:
        handle.write(json.dumps(entry, ensure_ascii=False) + '\n')
    return entry


def approved_public(queue: Path = QUEUE):
    """Confirmed/corrected candidates, with corrections applied and reviewer identity removed."""
    out = []
    for item in queue_state(queue):
        if item['review_status'] not in ('confirmed', 'corrected'):
            continue
        last = item['history'][-1]
        payload = {**item['payload'], **last.get('corrections', {})}
        out.append({'id': item['id'], 'kind': item['kind'], 'investigation': item.get('investigation'), 'payload': payload, 'source': item['source'],
                    'flags': item.get('flags', []), 'review_status': item['review_status'],
                    'reviewed_on': last['timestamp'][:10], 'extraction': {'method': item['extraction']['method']}})
    return out

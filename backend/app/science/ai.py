"""Grounded question answering, extraction proposals and answer audits.

Boundaries: AI proposes, retrieves, explains and organizes. It never invents measurements,
approves evidence, performs hidden interpolation or judges safety.

* Corpus: only approved/indexed content (spine facts, curation review findings, human-confirmed
  findings, cited scenario/FM2 statements, NASA-listed publication titles). Pending AI
  candidates are excluded.
* Answering: provider-independent. With no LLM provider configured (the default), answers
  are extractive: sentences are copied from cited passages. Any provider output must pass
  the same number and claim audits before it is returned.
* Source text is data. Passages containing instruction-like text are quarantined.
"""
from __future__ import annotations

import json
import math
import os
import re
import subprocess
from collections import Counter
from dataclasses import dataclass, field
from pathlib import Path

from . import review

NOT_IN_DATA = 'Not in our data.'
STOP = set('a an and are as at be by for from has have in is it of on or that the this to was were what which with how does do did can could would should about than then there their its into over under via per not no'.split())
SAFETY = re.compile(r'\b(safe|safety|unsafe|certif\w*|approv\w*|allowed|acceptable to fly|ok to use|okay to use|hazardous)\b', re.I)
INJECTION = re.compile(r'(ignore (all |any )?(previous|prior|above) (instructions|rules)|disregard (the )?(system|previous)|you are now|system prompt|reveal (your|the) (prompt|key))', re.I)
NUMBER = re.compile(r'(?<![\w.])[-+]?\d+(?:[.,]\d+)*(?:\s?±\s?\d+(?:\.\d+)?)?')
QUESTION_WORDS = set('many much use used tested indexed say says said tell show list give data our we you does'.split())
MIN_COVERAGE = 0.5
VERDICT = re.compile(r'\b(is|are) (not )?(safe|unsafe|certified|approved)\b|\bsafe to\b', re.I)


@dataclass
class Passage:
    id: str
    text: str
    source: str
    locator: str
    kind: str
    tokens: Counter = field(default_factory=Counter)


def stem(token: str) -> str:
    for suffix in ('ing', 'ed', 'es', 's'):
        if len(token) > len(suffix) + 3 and token.endswith(suffix) and not token[-len(suffix) - 1].isdigit():
            return token[:-len(suffix)]
    return token


def tokenize(text: str):
    return [stem(t) for t in re.findall(r'[a-z0-9]+(?:[.-][a-z0-9]+)*', text.lower()) if t not in STOP and len(t) > 1]


def fmt(v, digits=3):
    return 'n/a' if v is None else f'{v:.{digits}g}'


def build_corpus(spine: dict, include_reviewed=True) -> list[Passage]:
    passages = []
    def add(pid, text, source, locator, kind):
        passages.append(Passage(pid, text, source, locator, kind))
    for inv in spine['investigations']:
        r = inv['condition_ranges']
        parts = [f"{inv['short']} ({inv['id']}, {inv['title']}) is a {inv['platform']} investigation; scale: {inv['scale']}."]
        if r['oxygen']['min'] is not None:
            parts.append(f"Indexed oxygen ranges from {fmt(r['oxygen']['min'])} to {fmt(r['oxygen']['max'])} {r['oxygen']['unit']}.")
        if r['pressure']['min'] is not None:
            parts.append(f"Indexed pressure ranges from {fmt(r['pressure']['min'] / 1000)} to {fmt(r['pressure']['max'] / 1000)} kPa.")
        if r['flow']['min'] is not None:
            parts.append(f"Indexed flow ranges from {fmt(r['flow']['min'])} to {fmt(r['flow']['max'])} m/s.")
        parts.append(f"Materials or fuels: {', '.join(list(inv['materials'])[:8])}.")
        parts.append(f"{inv['condition_records']} source records (not verified experiment runs); gravity: {inv['gravity']}.")
        add(f"inv:{inv['id']}", ' '.join(parts), inv['catalog_url'], f"spine investigation {inv['id']} (computed from indexed records)", 'computed_summary')
    for m in spine['metrics']:
        vals = [rec['m'][m['key']] for rec in spine['records'] if rec['inv'] == m['investigation'] and m['key'] in rec['m']]
        reported = [v['v'] for v in vals if v['s'] == 'reported']
        text = f"{m['label']} in {m['investigation']} ({m['criterion'] or 'criterion not documented'})"
        if m['restricted']:
            text += f" is restricted: {m['why']}"
        elif reported:
            text += f" has {len(reported)} reported values from {fmt(min(reported))} to {fmt(max(reported))} {m['unit']}."
        add(f"metric:{m['id']}", text, m['source'], f"metric {m['id']} (computed from indexed records)", 'computed_summary')
    for f in spine.get('provenance_findings', []):
        add(f"p0:{f['code']}", f"{f['detail']} (status: {f['status']})", ', '.join(f.get('evidence', [])[:2]), 'curation review findings.json', 'review_finding')
    for key, s in spine['scenario_sources'].items():
        add(f"scenario_source:{key}", s['statement'], s['url'], s['locator'], 'cited_statement')
    fm2 = spine['fm2']
    add('fm2:status', f"{fm2['status_label']}. {fm2['status_detail']}", spine['scenario_sources']['fm2_lpsc2026']['url'], 'FM2 status', 'cited_statement')
    for paper in spine['papers']:
        add(f"{paper['id']}", f"NASA-listed publication for {', '.join(paper['investigations'])}: \"{paper['title']}\" (DOI {paper['doi'] or 'not listed'}). Title only; conclusions not extracted.",
            paper['source_link'], 'NASA PSI catalog publication list', 'publication_title')
    if include_reviewed:
        for f in review.approved_public():
            add(f"finding:{f['id']}", f"{f['payload']['title']}: {f['payload']['finding']}", f['source']['path'],
                f"PDF p.{f['source']['pdf_page']} {f['source']['section']}", 'reviewed_finding')
    for p in passages:
        p.tokens = Counter(tokenize(p.text))
    return passages


def quarantine(passages):
    clean, quarantined = [], []
    for p in passages:
        (quarantined if INJECTION.search(p.text) else clean).append(p)
    return clean, quarantined


def retrieve(question: str, passages: list[Passage], k=6, min_score=0.06):
    q = Counter(tokenize(question))
    if not q:
        return []
    n = len(passages)
    df = Counter(t for p in passages for t in set(p.tokens))
    idf = {t: math.log((n + 1) / (df[t] + 0.5)) for t in df}
    def vec(c):
        return {t: c[t] * idf.get(t, math.log(n + 1)) for t in c}
    qv = vec(q)
    qn = math.sqrt(sum(v * v for v in qv.values()))
    scored = []
    for p in passages:
        pv = vec(p.tokens)
        dot = sum(qv[t] * pv.get(t, 0) for t in qv)
        if dot:
            score = dot / (qn * math.sqrt(sum(v * v for v in pv.values())))
            scored.append((score, p))
    scored.sort(key=lambda sp: (-sp[0], sp[1].id))
    return [(round(s, 4), p) for s, p in scored[:k] if s >= min_score]


def numbers(text):
    return [re.sub(r'\s', '', m.group(0)).replace(',', '') for m in NUMBER.finditer(text)]


def audit_answer(answer_sentences: list[dict], passages: dict[str, Passage]):
    """Every sentence needs citations; every number must occur in a cited passage with shared context words."""
    results = []
    for s in answer_sentences:
        cited = [passages[c] for c in s['citations'] if c in passages]
        claim_ok = bool(cited) and not VERDICT.search(s['text'])
        support = 0.0
        if cited:
            toks = set(tokenize(s['text']))
            best = max(len(toks & set(p.tokens)) / max(1, len(toks)) for p in cited)
            support = round(best, 3)
            claim_ok = claim_ok and support >= 0.6
        number_checks = []
        for num in numbers(s['text']):
            ok = False
            for p in cited:
                for m in NUMBER.finditer(p.text):
                    if re.sub(r'\s', '', m.group(0)).replace(',', '') == num:
                        window = set(tokenize(p.text[max(0, m.start() - 80): m.end() + 80]))
                        if len(window & set(tokenize(s['text']))) >= 2:
                            ok = True
            number_checks.append({'number': num, 'verified': ok})
        results.append({'sentence': s['text'], 'citations': s['citations'], 'claim_supported': claim_ok,
                        'support_ratio': support, 'numbers': number_checks,
                        'numbers_verified': all(n['verified'] for n in number_checks)})
    return {'sentences': results, 'claims_pass': all(r['claim_supported'] for r in results),
            'numbers_pass': all(r['numbers_verified'] for r in results)}


def split_sentences(text):
    return [s.strip() for s in re.split(r'(?<=[.;])\s+(?=[A-Z0-9"])', text) if s.strip()]


class ExtractiveProvider:
    name = 'extractive_no_llm'

    def answer(self, question, hits):
        sentences = []
        qt = set(tokenize(question))
        for _, p in hits[:3]:
            ranked = sorted(split_sentences(p.text), key=lambda s: -len(set(tokenize(s)) & qt))
            for s in ranked[:2]:
                if set(tokenize(s)) & qt:
                    sentences.append({'text': s, 'citations': [p.id]})
        return sentences


def configured_provider():
    name = os.environ.get('EMBER_ATLAS_LLM_PROVIDER', '').strip()
    if not name:
        return ExtractiveProvider(), None
    # No vendor adapter is bundled or validated in this release; fail closed, never fabricate.
    return None, f'LLM provider "{name}" is configured but no validated adapter exists; AI answers unavailable.'


def ask(question: str, spine: dict, provider=None, extra_passages: list[Passage] | None = None):
    if provider is None:
        provider, problem = configured_provider()
        if provider is None:
            return {'status': 'unavailable', 'answer': [], 'message': problem}
    corpus = build_corpus(spine) + (extra_passages or [])
    for p in extra_passages or []:
        p.tokens = Counter(tokenize(p.text))
    corpus, quarantined = quarantine(corpus)
    retrieved = retrieve(question, corpus)
    # Publication titles are pointers, not evidence of content: they are offered as nearby
    # evidence but can never support an answer sentence.
    hits = [(score, p) for score, p in retrieved if p.kind != 'publication_title']
    lookup = {p.id: p for p in corpus}
    safety = bool(SAFETY.search(question))
    base = {'question': question, 'provider': provider.name, 'quarantined_passages': [p.id for p in quarantined],
            'retrieved': [{'id': p.id, 'score': s, 'locator': p.locator, 'kind': p.kind, 'source': p.source} for s, p in retrieved]}
    q_terms = set(tokenize(question)) - QUESTION_WORDS - {'safe', 'safety', 'unsafe', 'certify', 'certified', 'approved'}
    coverage = max((len(q_terms & set(p.tokens)) / max(1, len(q_terms)) for _, p in hits), default=0.0)
    base['question_term_coverage'] = round(coverage, 3)
    if not hits or coverage < MIN_COVERAGE:
        nearby = base['retrieved']
        return {**base, 'status': 'not_in_data', 'answer': [], 'message': NOT_IN_DATA, 'safety_question': safety,
                'nearby_evidence': nearby}
    sentences = provider.answer(question, hits)
    audit = audit_answer(sentences, lookup)
    kept = [s for s, r in zip(sentences, audit['sentences']) if r['claim_supported'] and r['numbers_verified']]
    status = 'answered' if kept else 'not_in_data'
    response = {**base, 'status': status, 'answer': kept, 'audit': audit, 'safety_question': safety,
                'rejected_sentences': len(sentences) - len(kept)}
    if safety:
        response['message'] = ('No safety verdict is given. The evidence below describes test conditions and findings only; '
                               'material or habitat safety requires qualified assessment against applicable standards.')
        response['limitations'] = ['Indexed records are provisional and from ISS microgravity flights only.',
                                   'No lunar-gravity combustion measurement exists in the index.',
                                   'Absence of evidence in this catalogue is not evidence of safety.']
    elif not kept:
        response['message'] = NOT_IN_DATA
    return response


# --------------------------------------------------------------------------- extraction proposals
UNIT_RE = r'(atm|kPa|psia|mmHg|mm\s?/\s?s|cm\s?/\s?s|m\s?/\s?s|mm2\s?/\s?s|mm²/s|mm|s|%|percent|ppm|W)'
MENTION = re.compile(rf'(?P<value>\d+(?:\.\d+)?(?:\s?±\s?\d+(?:\.\d+)?)?)\s?(?P<unit>{UNIT_RE})\b')
CONVERSIONS = {'atm': ('kPa', 101.325), 'psia': ('kPa', 6.894757), 'mmHg': ('kPa', 0.133322), 'percent': ('%', 1.0)}


def pdf_page_text(pdf: Path, page: int) -> str:
    return subprocess.run(['pdftotext', '-layout', '-f', str(page), '-l', str(page), str(pdf), '-'],
                          capture_output=True, text=True, check=True).stdout


def extract_candidate_rows(pdf: Path, pages: list[int], relpath: str, sha256: str):
    """Rule-based numeric-mention extraction. Every row is Ambiguous: a regex cannot bind a
    number to its material/condition/criterion. Rows are proposals for human review only."""
    rows = []
    for page in pages:
        text = pdf_page_text(pdf, page)
        for m in MENTION.finditer(text):
            unit = m.group('unit').replace(' ', '')
            value = m.group('value')
            flags = ['Ambiguous']
            normalized = None
            if unit in CONVERSIONS and '±' not in value:
                target, factor = CONVERSIONS[unit]
                normalized = {'value': round(float(value) * factor, 6), 'unit': target}
                if factor != 1.0:
                    flags.append('Unit converted')
            context = ' '.join(text[max(0, m.start() - 120): m.end() + 120].split())
            rows.append({'original_value': value, 'original_unit': unit, 'normalized': normalized,
                         'material': None, 'gravity': None, 'oxygen': None, 'pressure': None, 'airflow': None,
                         'criterion': None, 'context': context,
                         'source': {'path': relpath, 'sha256': sha256, 'pdf_page': page, 'table_or_figure': None},
                         'extraction_method': 'regex_numeric_mention_v1', 'flags': flags})
    if not rows:
        rows.append({'flags': ['Not found'], 'source': {'path': relpath, 'sha256': sha256, 'pages': pages},
                     'extraction_method': 'regex_numeric_mention_v1'})
    return rows


# --------------------------------------------------------------------------- approved-PDF extraction workflow
CONDITION_HINTS = {
    'oxygen': re.compile(r'(\d+(?:\.\d+)?)\s?(?:%|percent)\s?O2|O2\s?(?:of|=|at)?\s?(\d+(?:\.\d+)?)\s?(?:%|percent)', re.I),
    'pressure': re.compile(r'(\d+(?:\.\d+)?)\s?(atm|kPa|psia|mmHg)\b', re.I),
    'gravity': re.compile(r'\b(microgravity|normal gravity|1\s?g|lunar gravity|partial gravity)\b', re.I),
}


TABLE_UNIT = re.compile(r'(mm/s|cm/s|m/s|mm2/s|mm²/s|kPa|atm|psia|mmHg|ppm|kJ/g|W|mm|s)\b')
TABLE_LABEL = re.compile(r'Table\s+\d+(?:\.\d+)?', re.I)
CELL = re.compile(r'(?<![\w.])(\d+(?:\.\d+)?(?:\s?±\s?\d+(?:\.\d+)?)?)(?![\w.])')


def extract_table_cells(pdf: Path, pages: list[int], relpath: str, sha256: str):
    """Table mode: numeric cells on rows following a header line that names a unit. The unit is taken
    from the header and is flagged unverified; the row/column binding is a proposal for human review."""
    rows = []
    for page in pages:
        lines = pdf_page_text(pdf, page).splitlines()
        label = (TABLE_LABEL.search(' '.join(lines)) or [None])[0]
        unit, ttl = None, 0
        for i, line in enumerate(lines):
            cells = CELL.findall(line)
            u = TABLE_UNIT.search(line)
            if u and len(cells) <= 1:
                unit, ttl = u.group(1), 12
                continue
            if unit and ttl > 0 and len(cells) >= 2 and len(re.sub(r'[\d.±\s]', '', line)) < 0.4 * len(line.strip()):
                for col, value in enumerate(cells):
                    if len(re.sub(r'\D', '', value)) > 6:   # report numbers / identifiers, not measurements
                        continue
                    rows.append({'original_value': value, 'original_unit': unit, 'normalized': None,
                                 'material': None, 'gravity': None, 'oxygen': None, 'pressure': None, 'airflow': None, 'criterion': None,
                                 'context': ' '.join(line.split()), 'table_row_line': i + 1, 'table_column': col + 1,
                                 'source': {'path': relpath, 'sha256': sha256, 'pdf_page': page, 'table_or_figure': label},
                                 'extraction_method': 'layout_table_cells_v1',
                                 'flags': ['Ambiguous', 'Table cell; unit from header (unverified)']})
            ttl -= 1
    return rows


def approved_documents(project: Path) -> dict[str, dict]:
    """Only documents declared in the scientific contract with a stored SHA-256 are extractable."""
    from . import contract as C
    return {k: v for k, v in C.REFERENCES.items() if v.get('local') and v.get('sha256')}


def extract_from_approved(ref_key: str, pages: list[int], project: Path) -> list[dict]:
    """Extract numeric candidates from an approved, hash-verified PDF. Each row keeps the page citation,
    original value/unit, optional conversion, condition hints found in the same context window (flagged
    as unverified) and the 'Ambiguous' flag: rows are review proposals, never evidence."""
    import hashlib
    docs = approved_documents(project)
    if ref_key not in docs:
        raise ValueError(f'{ref_key!r} is not an approved, hash-recorded document')
    doc = docs[ref_key]
    from ember_atlas.paths import resolve
    pdf = resolve(doc['local'])
    digest = hashlib.sha256(pdf.read_bytes()).hexdigest()
    if digest != doc['sha256']:
        raise ValueError(f'{ref_key}: SHA-256 mismatch ({digest[:12]}… ≠ {doc["sha256"][:12]}…); refusing to extract')
    rows = [r for r in extract_candidate_rows(pdf, pages, doc['local'], digest) if 'Not found' not in r['flags']]
    rows += extract_table_cells(pdf, pages, doc['local'], digest)
    if not rows:
        rows = [{'flags': ['Not found'], 'source': {'path': doc['local'], 'sha256': digest, 'pages': pages}, 'extraction_method': 'none'}]
    for row in rows:
        row['source'].update({'reference': ref_key, 'document': doc['id'], 'url': doc['url']})
        ctx = row.get('context') or ''
        hints = {}
        for name, rx in CONDITION_HINTS.items():
            m = rx.search(ctx)
            if m:
                hints[name] = m.group(0)
        if hints:
            row['condition_hints'] = hints
            row['flags'] = sorted(set(row['flags']) | {'Condition inferred from context (unverified)'})
        row['review_status'] = 'pending_review'
        row['id'] = 'X-' + hashlib.sha256(json.dumps([ref_key, row['source'].get('pdf_page'), row.get('original_value'),
                                                      row.get('original_unit'), ctx], sort_keys=True).encode()).hexdigest()[:16]
    return rows

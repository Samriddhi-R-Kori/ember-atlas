"""Build the shared, versioned data spine from the pinned PostgreSQL evidence.

The spine is the single dataset consumed by all four dashboard pages, both through the
local API and through the static export. It contains only values present in the
database, each with its original string, normalized value, unit, value status and exact
source location. Missing values stay missing; restricted values are labelled, not used.
"""
from __future__ import annotations

import json
import re
from decimal import Decimal, InvalidOperation
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models import (DatasetRelease, EvidenceLocation, EvidenceSource, Investigation, ParameterDefinition,
                      ParameterObservation, QualityIssue, RecordQuality, SourceRecord)
from . import contract as C

from ember_atlas.paths import PROCESSED_DIR

CURATED = PROCESSED_DIR
MISSING_TEXT = {'', '-', '–', '—', 'n/a', 'na', 'none', 'unknown', '?'}


def to_decimal(value):
    try:
        number = Decimal(str(value).strip())
        return number if number.is_finite() else None
    except (InvalidOperation, ValueError, TypeError):
        return None


def half_precision(original, normalized):
    """Half of the last reported decimal place of the original string, in normalized units.

    Returns None when the original is not a plain decimal or no conversion factor exists.
    """
    text = str(original).strip() if original is not None else ''
    if not re.fullmatch(r'[-+]?\d+(\.\d+)?', text):
        return None
    decimals = len(text.split('.')[1]) if '.' in text else 0
    original_number, normalized_number = Decimal(text), to_decimal(normalized)
    if normalized_number is None:
        return None
    half = Decimal(5) * Decimal(10) ** (-(decimals + 1))
    if original_number == 0:
        factor = Decimal(1) if normalized_number == 0 else None
        if factor is None:
            return None
    else:
        factor = abs(normalized_number / original_number)
    return float(half * factor)


def usable_value(observation, location):
    status = (location.raw_payload or {}).get('normalization_status') or ''
    return (observation.normalized_value is not None and observation.value_status not in
            ('disputed_source_value', 'blank', 'source_dash', 'source_annotation')
            and 'not_accepted' not in status and to_decimal(observation.normalized_value) is not None
            and bool(observation.normalized_unit))


def value_entry(observation, location, restricted_reason=None):
    """Serialize one observation with its provenance and an explicit state."""
    raw = location.raw_payload or {}
    original = raw.get('source_value', observation.original_value)
    original_text = '' if original is None else str(original)
    entry = {
        'o': original_text, 'ou': raw.get('original_unit'),
        'vs': observation.value_status, 'loc': location.coordinate or f'col {location.column_number}',
    }
    if usable_value(observation, location):
        entry.update(v=float(observation.normalized_value), u=observation.normalized_unit,
                     h=half_precision(original_text, observation.normalized_value))
        entry['s'] = 'restricted' if restricted_reason else 'reported'
    elif original_text.strip().casefold() in MISSING_TEXT or observation.value_status in ('blank', 'source_dash'):
        entry['s'] = 'not_reported'
    elif observation.value_status == 'disputed_source_value' or 'not_accepted' in (raw.get('normalization_status') or ''):
        entry['s'] = 'restricted'
        restricted_reason = restricted_reason or 'Disputed or unaccepted source value (withheld).'
    else:
        entry['s'] = 'restricted'
        restricted_reason = restricted_reason or 'Value present but no supported normalized numeric value/unit.'
    if restricted_reason and entry['s'] == 'restricted':
        entry['why'] = restricted_reason
    if observation.uncertainty:
        entry['unc'] = observation.uncertainty
    return entry


def build_spine(session: Session) -> dict:
    dataset = session.scalar(select(DatasetRelease))
    if dataset is None:
        raise ValueError('No dataset release ingested')
    registry = {r['investigation']: r for r in dataset.metadata_payload['registry']}

    # Quality flags per record (open, human-review-required issues only).
    flags: dict[str, set[str]] = {}
    for record_id, code, detail, status in session.execute(
            select(RecordQuality.record_id, QualityIssue.code, QualityIssue.detail, QualityIssue.status)
            .join(QualityIssue, QualityIssue.id == RecordQuality.issue_id)):
        if (detail or {}).get('requires_human_review', True):
            flags.setdefault(record_id, set()).add(code)

    sources = {}
    records = []
    metric_catalog = {}
    investigations = []

    for inv_id, config in C.INVESTIGATIONS.items():
        inv = session.get(Investigation, inv_id)
        meta = registry[inv_id]
        inv_summary = {
            'id': inv_id, 'short': config['short'], 'name': inv.name, 'title': meta['title'],
            'doi': meta['doi'], 'catalog_url': meta['catalog_url'], 'license': meta['license'],
            'platform': meta['flight_platform'], 'status': 'flown_completed_investigation',
            'material_class': config['material_class'], 'scale': config['scale'],
            'scientific_status': inv.scientific_status, 'sources': [],
        }
        for src_config in config['sources']:
            source = session.get(EvidenceSource, src_config['path'])
            if source is None:
                raise ValueError(f'Evidence source missing: {src_config["path"]}')
            sources[source.id] = {'path': source.path, 'sha256': source.sha256, 'url': source.source_url,
                                  'download': source.extraction_metadata.get('official_download_url'),
                                  'license': source.license, 'provenance_status': source.provenance_status}
            headings = {}
            for definition in session.scalars(select(ParameterDefinition).where(ParameterDefinition.investigation_id == inv_id)):
                headings.setdefault(definition.name, []).append(definition)
            stmt = (select(SourceRecord, EvidenceLocation)
                    .join(EvidenceLocation, SourceRecord.location_id == EvidenceLocation.id)
                    .where(SourceRecord.investigation_id == inv_id, EvidenceLocation.source_id == source.id))
            stmt = stmt.where(EvidenceLocation.sheet.is_(None)) if src_config['sheet'] is None else \
                stmt.where(EvidenceLocation.sheet == src_config['sheet'])
            rows = session.execute(stmt.order_by(EvidenceLocation.row_number)).all()
            ids = [r.id for r, _ in rows]
            obs_rows = session.execute(
                select(ParameterObservation, ParameterDefinition, EvidenceLocation)
                .join(ParameterDefinition, ParameterObservation.definition_id == ParameterDefinition.id)
                .join(EvidenceLocation, ParameterObservation.evidence_location_id == EvidenceLocation.id)
                .where(ParameterObservation.source_record_id.in_(ids))).all() if ids else []
            by_record: dict[str, dict[str, tuple]] = {}
            for o, p, loc in obs_rows:
                by_record.setdefault(o.source_record_id, {})[p.name] = (o, p, loc)

            used_headings = set()
            for key, spec in src_config['metrics'].items():
                metric_catalog[f'{inv_id}:{key}'] = {
                    'key': key, 'id': f'{inv_id}:{key}', 'investigation': inv_id, 'label': spec['label'],
                    'category': spec['category'], 'criterion': spec.get('criterion'),
                    'restricted': bool(spec.get('restricted')), 'why': spec.get('why'),
                    'source': source.id, 'heading': spec['heading'], 'unit': None,
                    'definition_ids': sorted(d.id for d in headings.get(spec['heading'], [])),
                }
                used_headings.add(spec['heading'])

            for record, location in rows:
                values = by_record.get(record.id, {})
                raw = record.raw_payload or {}
                item = {
                    'id': record.id, 'inv': inv_id, 'src': source.id, 'role': src_config['role'],
                    'sheet': location.sheet, 'row': location.row_number, 'ident': record.source_identifier,
                    'dup': record.duplicate_of, 'flags': sorted(flags.get(record.id, [])),
                    'status': record.scientific_status, 'c': {}, 'm': {}, 'x': {},
                }
                gravity = raw.get('gravity_environment')
                item['c']['gravity'] = ({'s': 'reported', 'cat': C.GRAVITY_RULE['category'], 'o': gravity}
                                        if gravity == 'actual_microgravity' else
                                        {'s': 'not_reported', 'o': gravity, 'why': 'No flight-context classification for this record.'})
                material_heading = src_config.get('material')
                if material_heading and material_heading in values:
                    o, _, loc = values[material_heading]
                    label = str((loc.raw_payload or {}).get('source_value', o.original_value) or '').strip()
                    item['c']['material'] = ({'s': 'reported', 'label': label, 'cls': config['material_class'],
                                              'loc': loc.coordinate or f'col {loc.column_number}'}
                                             if label.casefold() not in MISSING_TEXT else {'s': 'not_reported'})
                else:
                    item['c']['material'] = {'s': 'not_reported'}
                for dim in ('oxygen', 'pressure', 'flow'):
                    spec = src_config['dimensions'].get(dim)
                    if spec is None or spec.get('state') == 'not_reported':
                        item['c'][dim] = {'s': 'not_reported', 'why': (spec or {}).get('why', 'Not reported by this source.')}
                        continue
                    if spec['heading'] not in values:
                        item['c'][dim] = {'s': 'not_reported', 'why': 'No observation for this record.'}
                        continue
                    o, _, loc = values[spec['heading']]
                    reason = spec.get('why') if spec.get('force_restricted') else None
                    entry = value_entry(o, loc, reason)
                    if spec.get('force_restricted') and entry['s'] != 'not_reported':
                        entry['s'] = 'restricted'
                        entry['why'] = spec['why']
                    if dim == 'flow' and entry['s'] == 'reported' and entry['v'] < 0:
                        # Curation flags negative air rates (NEGATIVE_NUMERIC_REVIEW); a negative speed is not
                        # usable as a flow magnitude until reviewed. The original value stays visible.
                        entry['s'] = 'restricted'
                        entry['why'] = 'Negative velocity flagged for human review (quality issue NEGATIVE_NUMERIC_REVIEW).'
                    item['c'][dim] = entry
                for key, spec in src_config['metrics'].items():
                    if spec['heading'] not in values:
                        continue
                    o, _, loc = values[spec['heading']]
                    entry = value_entry(o, loc, spec.get('why') if spec.get('restricted') else None)
                    if spec.get('restricted') and entry['s'] == 'reported':
                        entry['s'] = 'restricted'
                        entry['why'] = spec['why']
                    item['m'][key] = entry
                    if entry.get('u'):
                        metric_catalog[f'{inv_id}:{key}']['unit'] = entry['u']
                for key, heading in src_config.get('context', {}).items():
                    if heading in values:
                        o, _, loc = values[heading]
                        item['x'][key] = value_entry(o, loc)
                records.append(item)
            inv_summary['sources'].append({'id': source.id, 'sheet': src_config['sheet'], 'role': src_config['role'],
                                           'records': len(rows)})
        investigations.append(inv_summary)

    # Investigation condition ranges, computed only from reported condition values.
    for inv in investigations:
        inv_records = [r for r in records if r['inv'] == inv['id'] and r['role'] == 'condition_source']
        ranges = {}
        for dim in ('oxygen', 'pressure', 'flow'):
            vals = [r['c'][dim]['v'] for r in inv_records if r['c'][dim]['s'] == 'reported']
            states = {}
            for r in inv_records:
                states[r['c'][dim]['s']] = states.get(r['c'][dim]['s'], 0) + 1
            ranges[dim] = {'min': min(vals) if vals else None, 'max': max(vals) if vals else None,
                           'unit': next((r['c'][dim].get('u') for r in inv_records if r['c'][dim]['s'] == 'reported'), None),
                           'states': states}
        materials = {}
        for r in inv_records:
            if r['c']['material']['s'] == 'reported':
                materials[r['c']['material']['label']] = materials.get(r['c']['material']['label'], 0) + 1
        inv['condition_ranges'] = ranges
        inv['materials'] = dict(sorted(materials.items(), key=lambda kv: (-kv[1], kv[0])))
        inv['condition_records'] = len(inv_records)
        inv['exact_repeats_retained'] = sum(1 for r in inv_records if r['dup'])
        inv['gravity'] = C.GRAVITY_RULE['label']
        inv['publications'] = registry[inv['id']]['publications']

    papers = []
    seen = {}
    for inv_id in C.INVESTIGATIONS:
        for pub in registry[inv_id]['publications']:
            key = (pub.get('doi') or pub['title']).casefold()
            if key in seen:
                seen[key]['investigations'].append(inv_id)
                continue
            paper = {'id': f'paper:{len(papers) + 1:03d}', 'title': pub['title'], 'authors': pub.get('authors'),
                     'doi': pub.get('doi'), 'investigations': [inv_id],
                     'source_link': f"https://doi.org/{pub['doi']}" if pub.get('doi') else registry[inv_id]['catalog_url'],
                     'verification_scope': pub.get('verification_scope'),
                     'provenance': f"NASA PSI catalog publication list for {inv_id} (snapshot {registry[inv_id]['snapshot_sha256'][:12]})"}
            seen[key] = paper
            papers.append(paper)

    findings_path = CURATED / 'review/findings.json'
    provenance_findings = json.loads(findings_path.read_text())

    return {
        'spine_version': C.SPINE_VERSION, 'contract_version': C.CONTRACT_VERSION,
        'dataset': {'version': dataset.version, 'manifest_sha256': dataset.manifest_sha256,
                    'baseline_sha256': dataset.baseline_sha256, 'scientific_approval': False,
                    'external_signoff': False, 'summary': dataset.metadata_payload['summary']},
        'labels': C.EVIDENCE_LABELS, 'dimension_states': C.DIMENSION_STATES,
        'gravity_rule': C.GRAVITY_RULE, 'tolerance_rule': C.TOLERANCE_RULE,
        'scenarios': C.SCENARIOS, 'scenario_sources': C.SOURCES, 'fm2': C.FM2,
        'material_classes': C.MATERIAL_CLASSES, 'equipment_areas': C.EQUIPMENT_AREAS,
        'investigations': investigations, 'sources': sources, 'metrics': list(metric_catalog.values()),
        'records': records, 'papers': papers, 'provenance_findings': provenance_findings,
        'open_issues': [{'issue': i, 'required': r, 'status': st} for i, r, st in C.OPEN_ISSUES],
        'references': {k: {kk: vv for kk, vv in v.items() if kk != 'local'} | {'stored_locally': bool(v.get('local'))}
                       for k, v in C.REFERENCES.items()},
        'flame_evidence': C.FLAME_EVIDENCE, 'fire_safety_insights': C.FIRE_SAFETY_INSIGHTS,
        'demonstration_records': C.DEMONSTRATION_RECORDS,
        'source_findings': C.SOURCE_FINDINGS, 'partial_gravity_evidence': C.PARTIAL_GRAVITY_EVIDENCE,
        'fire_safety_rules': C.FIRE_SAFETY_RULES,
        'primary_selector_excluded': C.PRIMARY_SELECTOR_EXCLUDED,
        'notice': ('Provisional research evidence. Scientific approval pending. Source records are not verified '
                   'experiment runs. Nothing here certifies combustion or material safety.'),
    }

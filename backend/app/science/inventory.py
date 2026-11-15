"""Reproducible inventory of every parameter definition in the pinned dataset release.

Counts are of source-record observations, not independent experiments. "Usable" means a
finite normalized numeric value with a unit and no disputed/unaccepted status.
"""
from __future__ import annotations

from collections import defaultdict

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models import (DatasetRelease, EvidenceLocation, ParameterDefinition, ParameterObservation, QualityIssue,
                      RecordQuality)
from . import contract as C
from .spine import MISSING_TEXT, to_decimal, usable_value


def contract_roles():
    """Map (investigation, source path, sheet, heading) -> declared dashboard role."""
    roles = {}
    for inv_id, cfg in C.INVESTIGATIONS.items():
        for src in cfg['sources']:
            key = lambda h: (inv_id, src['path'], src['sheet'], h)
            if src.get('material'):
                roles[key(src['material'])] = ('material', 'Material / fuel label (literal source text)', False)
            for dim, spec in src['dimensions'].items():
                if 'heading' in spec:
                    roles[key(spec['heading'])] = (f'condition:{dim}', spec.get('criterion') or spec.get('why'),
                                                   bool(spec.get('force_restricted')))
            for name, heading in src.get('context', {}).items():
                roles.setdefault(key(heading), (f'context:{name}', 'Experimental context', False))
            for name, spec in src['metrics'].items():
                roles[key(spec['heading'])] = (f'metric:{name}', spec.get('criterion') or spec.get('why'),
                                               bool(spec.get('restricted')))
    return roles


def build_inventory(session: Session) -> dict:
    dataset = session.scalar(select(DatasetRelease))
    flagged = set(session.scalars(select(RecordQuality.record_id).join(QualityIssue, QualityIssue.id == RecordQuality.issue_id)
                                  .where(QualityIssue.detail['requires_human_review'].astext == 'true')))
    roles = contract_roles()
    rows = session.execute(select(ParameterObservation, ParameterDefinition, EvidenceLocation)
                           .join(ParameterDefinition, ParameterObservation.definition_id == ParameterDefinition.id)
                           .join(EvidenceLocation, ParameterObservation.evidence_location_id == EvidenceLocation.id)).all()
    groups = defaultdict(list)
    for o, p, loc in rows:
        groups[p.id].append((o, p, loc))
    items = []
    for definition in session.scalars(select(ParameterDefinition).order_by(ParameterDefinition.investigation_id, ParameterDefinition.name)):
        obs = groups.get(definition.id, [])
        source_ids = sorted({loc.source_id for _, _, loc in obs})
        sheets = sorted({loc.sheet or 'CSV' for _, _, loc in obs})
        usable = [to_decimal(o.normalized_value) for o, _, loc in obs if usable_value(o, loc)]
        missing = sum(1 for o, _, loc in obs if str((loc.raw_payload or {}).get('source_value', o.original_value) or '').strip().casefold()
                      in MISSING_TEXT or o.value_status in ('blank', 'source_dash'))
        questionable = sum(1 for o, _, _ in obs if o.source_record_id in flagged)
        disputed = sum(1 for o, _, _ in obs if o.value_status == 'disputed_source_value')
        units = sorted({o.normalized_unit for o, _, loc in obs if usable_value(o, loc)})
        role = None
        for _, _, loc in obs[:1]:
            role = roles.get((definition.investigation_id, loc.source_id, loc.sheet, definition.name))
        role_name, criterion, restricted = role or ('not_used_by_dashboard', None, False)
        numeric = bool(usable)
        items.append({
            'investigation': definition.investigation_id, 'definition_id': definition.id,
            'original_name': definition.name, 'normalized_name': role_name,
            'original_unit': definition.original_unit, 'normalized_unit': units[0] if len(units) == 1 else units or None,
            'mapping_status': definition.mapping_status, 'sources': source_ids, 'sheets': sheets,
            'observations': len(obs), 'usable': len(usable), 'missing': missing,
            'questionable_record_flags': questionable, 'disputed': disputed,
            'min': float(min(usable)) if usable else None, 'max': float(max(usable)) if usable else None,
            'criterion': criterion, 'restricted_by_contract': restricted,
            'plot_suitable': numeric and not restricted and len(units) == 1,
            'model_target_candidate': role_name.startswith('metric:') and numeric and not restricted,
            'model_input_candidate': (role_name.startswith('condition:') or role_name.startswith('context:')) and numeric and not restricted,
            'compatibility_restrictions': [
                'Mapping semantics pending (curation review); not scientifically approved.',
                *(['Restricted by dashboard contract: ' + (criterion or '')] if restricted else []),
                *(['Mixed normalized units'] if len(units) > 1 else []),
            ],
        })
    return {'dataset_version': dataset.version, 'manifest_sha256': dataset.manifest_sha256,
            'contract_version': C.CONTRACT_VERSION, 'parameter_count': len(items),
            'counting_note': 'Counts are source-record observations (exact repeats retained), not independent experiments.',
            'items': items}


def inventory_markdown(inv: dict) -> str:
    lines = [f"# Dataset parameter inventory ({inv['dataset_version']})", '',
             f"Contract `{inv['contract_version']}` · manifest `{inv['manifest_sha256'][:16]}…` · "
             f"{inv['parameter_count']} parameter definitions.", '', inv['counting_note'],
             'Generated by `python scripts/build_artifacts.py`; do not edit by hand.', '']
    by_inv = defaultdict(list)
    for item in inv['items']:
        by_inv[item['investigation']].append(item)
    for inv_id, items in by_inv.items():
        lines += [f'## {inv_id}', '', '| Original name | Dashboard role | Unit | Obs | Usable | Missing | Flagged rec. | Min | Max | Plot | Target | Input |',
                  '|---|---|---|---:|---:|---:|---:|---:|---:|:-:|:-:|:-:|']
        for i in items:
            fmt = lambda v: '' if v is None else f'{v:.6g}'
            unit = i['normalized_unit'] if isinstance(i['normalized_unit'], str) else ', '.join(i['normalized_unit'] or []) or '—'
            sheet = '' if i['sheets'] == ['CSV'] else f" ({'/'.join(i['sheets'])})"
            lines.append(f"| `{i['original_name'].strip()}`{sheet} | {i['normalized_name']} | {unit} | {i['observations']} | {i['usable']} | "
                         f"{i['missing']} | {i['questionable_record_flags']} | {fmt(i['min'])} | {fmt(i['max'])} | "
                         f"{'✓' if i['plot_suitable'] else ''} | {'✓' if i['model_target_candidate'] else ''} | {'✓' if i['model_input_candidate'] else ''} |")
        lines.append('')
    return '\n'.join(lines)

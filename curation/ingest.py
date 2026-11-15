"""Transactional, idempotent ingestion into a fresh SQLite verification store.

The same baseline schema targets PostgreSQL. The backend reuses this SQLite projection as a
disposable interchange during database ingestion; it is not production storage.
"""
import argparse
import hashlib
import json
from pathlib import Path
import sqlite3
from ember_atlas.paths import PROCESSED_DIR, investigation_of
from .extract import sha256
from .units import csv_unit, CONVERSIONS


def read_jsonl(path):
    with path.open(encoding='utf-8') as f:
        return [json.loads(line) for line in f if line.strip()]


def encoded(value):
    return json.dumps(value,ensure_ascii=False,sort_keys=True,allow_nan=False)


def uid(*parts):
    return hashlib.sha256(encoded(parts).encode()).hexdigest()


def ingest(curated, database):
    curated=Path(curated).resolve(); database=Path(database).resolve()
    if not database.is_relative_to(Path('/tmp')) and not database.is_relative_to(curated.parent):
        raise ValueError('Staging DB must be under curated data or /tmp')
    manifest=json.loads((curated/'build_manifest.json').read_text())
    for name,digest in manifest['output_hashes'].items():
        if sha256(curated/name)!=digest:
            raise ValueError(f'Curated output checksum mismatch: {name}')
    sources=json.loads((curated/'source_manifest.json').read_text())
    csv_records=read_jsonl(curated/'source_records.jsonl')
    workbook=read_jsonl(curated/'spice/records.jsonl')
    flames=read_jsonl(curated/'spice/flame_length.jsonl')
    cells=read_jsonl(curated/'spice/workbook_cells.jsonl')
    observations=read_jsonl(curated/'observations.jsonl')
    links=read_jsonl(curated/'spice/reconciliation_links.jsonl')
    issues=read_jsonl(curated/'quality_issues.jsonl')
    database.parent.mkdir(parents=True,exist_ok=True)
    connection=sqlite3.connect(database)
    connection.execute('PRAGMA foreign_keys = ON')
    schema=(Path(__file__).parent/'schema.sql').read_text()
    connection.executescript(schema)
    def insert(table,**row):
        keys=','.join(row)
        # Exact repeated ingestion succeeds; changed values fail rather than overwrite.
        existing=connection.execute(f'SELECT {keys} FROM {table} WHERE id=?',(row['id'],)).fetchone()
        values=tuple(row.values())
        if existing is not None:
            if existing!=values: raise ValueError(f'Conflicting existing {table} record: {row["id"]}')
            return
        connection.execute(f'INSERT INTO {table} ({keys}) VALUES ({",".join("?" for _ in row)})',values)
    try:
        with connection:
            version=connection.execute('SELECT version FROM schema_version').fetchall()
            if version and version!=[('1.0.0',)]:raise ValueError('Unsupported staging schema version')
            connection.execute("INSERT OR IGNORE INTO schema_version VALUES ('1.0.0')")
            for n,name in [(107,'SPICE'),(69,'FLEX'),(39,'CFI'),(101,'SAME-R'),(25,'BASS-II')]:
                insert('investigation',id=f'PSI-{n}',name=name,scientific_status='not_reviewed')
            for s in sources:
                inv=investigation_of(s['source'])
                insert('evidence_source',id=s['source'],investigation_id=inv,path=s['source'],sha256=s['sha256'],
                       extraction_metadata=encoded(s),source_url=s['source_url'],license=s['license'],provenance_status=s['external_provenance_status'])
            for r in csv_records+workbook+flames:
                source=r['source']; sheet=r.get('sheet'); row=r.get('source_row',r.get('row'))
                loc=uid(source,sheet,row)
                insert('evidence_location',id=loc,source_id=source,sheet=sheet,row_number=row,
                       column_number=None,coordinate=None,raw_payload=encoded(r))
                inv=r.get('investigation','PSI-107')
                label=r.get('source_identifier',r.get('fields',{}).get('label',r.get('test_point')))
                insert('source_record',id=r['id'],investigation_id=inv,location_id=loc,
                       source_identifier=None if label is None else str(label),raw_payload=encoded(r),
                       duplicate_of=r.get('exact_duplicate_of'),scientific_status='not_reviewed')
            for o in observations:
                loc=uid(o['record_id'],o['source_column'])
                insert('evidence_location',id=loc,source_id=o['source'],sheet=None,row_number=o['source_row'],
                       column_number=o['source_column'],coordinate=None,raw_payload=encoded(o))
                definition=uid(o['source'],o['source_column'])
                inv=investigation_of(o['source'])
                insert('parameter_definition',id=definition,investigation_id=inv,name=o['source_heading'],
                       physical_definition=None,original_unit=('mm^2/s' if inv=='PSI-69' and o['source_heading']=='Burning rate; mm' else csv_unit(inv,o['source_heading'])),
                       canonical_unit=CONVERSIONS.get(('mm^2/s' if inv=='PSI-69' and o['source_heading']=='Burning rate; mm' else csv_unit(inv,o['source_heading'])),(None,))[0],
                       basis=None,mapping_status='header_unit_only_semantics_pending')
                insert('parameter_observation',id=uid('observation',loc),definition_id=definition,
                       source_record_id=o['record_id'],evidence_location_id=loc,segment_id=None,
                       original_value=o['source_value'],normalized_value=o['normalized_value'],normalized_unit=o['normalized_unit'],
                       value_status=o['value_status'],uncertainty=None,uncertainty_status=o['uncertainty_status'],
                       conversion_metadata=encoded({k:o[k] for k in ('conversion_factor','conversion_rule','normalization_status') if k in o}),
                       scientific_status='not_reviewed')
            for c in cells:
                loc=uid(c['source'],c['sheet'],c['coordinate'])
                insert('evidence_location',id=loc,source_id=c['source'],sheet=c['sheet'],row_number=c['row'],
                       column_number=c['column'],coordinate=c['coordinate'],raw_payload=encoded(c))
            for o in read_jsonl(curated/'spice/observations.jsonl'):
                loc=uid(o['source'],o['sheet'],o['coordinate'])
                # Blank mapped cells also need explicit evidence locations.
                if not connection.execute('SELECT 1 FROM evidence_location WHERE id=?',(loc,)).fetchone():
                    insert('evidence_location',id=loc,source_id=o['source'],sheet=o['sheet'],row_number=o['source_row'],
                           column_number=o['source_column'],coordinate=o['coordinate'],raw_payload=encoded(o))
                definition=uid(o['source'],o['sheet'],o['source_column'])
                unit=o.get('original_unit')
                insert('parameter_definition',id=definition,investigation_id='PSI-107',name=o['field'],
                       physical_definition=None,original_unit=unit,canonical_unit=CONVERSIONS.get(unit,(None,))[0],
                       basis=None,mapping_status='positional_mapping_semantics_pending')
                oid=uid('observation',loc)
                insert('parameter_observation',id=oid,definition_id=definition,source_record_id=o['record_id'],
                       evidence_location_id=loc,segment_id=None,
                       original_value=encoded(o['source_value']),normalized_value=o['normalized_value'],normalized_unit=o['normalized_unit'],
                       value_status=o['value_status'],uncertainty=None,uncertainty_status='not_reported',
                       conversion_metadata=encoded({k:o.get(k) for k in ('original_unit','conversion_factor','formula','formula_tokens_hex','normalization_status')}),
                       scientific_status='not_reviewed')
                if o['field']=='length_mm' and o['source_value'] is not None:
                    insert('measurement',id=uid('measurement',oid),observation_id=oid,
                           method='source_reported_length_calibration_unapproved',formula=o.get('formula'),
                           cached_value=encoded(o['source_value']),recalculated_value=None,
                           calibration_evidence=encoded({'source':o['source'],'sheet':o['sheet'],'cell':o['coordinate']}),
                           scientific_status='not_reviewed')
            for m in read_jsonl(curated/'spice/media_references.jsonl'):
                loc=uid(m['source'],m['sheet'],m['coordinate'])
                insert('media_asset',id=uid('media',loc,m['token_index']),evidence_location_id=loc,
                       original_reference=m['reference'],resolved_uri=None,run_id=None,
                       relationship_status='source_media_reference_asset_not_retrieved')
            for i,l in enumerate(links):
                insert('reconciliation_link',id=uid('link',l['left'],l['right'],l['kind']),
                       left_record_id=l['left'],right_record_id=l['right'],relation_kind=l['kind'],
                       review_status=l['status'],evidence_payload=encoded(l),scientific_merge_approved=False)
            for q in issues:
                insert('quality_issue',id=q['issue_id'],code=q['code'],status=q['status'],evidence_payload=encoded(q['evidence']),detail=encoded(q))
            if connection.execute('PRAGMA foreign_key_check').fetchall():raise ValueError('Foreign-key failure')
        tables=['evidence_source','evidence_location','source_record','parameter_definition','parameter_observation',
                'reconciliation_link','quality_issue','experiment_run','operating_condition_segment','measurement','media_asset']
        return {t:connection.execute(f'SELECT COUNT(*) FROM {t}').fetchone()[0] for t in tables}
    finally:
        connection.close()


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--curated',type=Path,default=PROCESSED_DIR)
    parser.add_argument('--database',type=Path,required=True)
    args=parser.parse_args()
    print(json.dumps(ingest(args.curated,args.database),indent=2))

if __name__=='__main__':main()

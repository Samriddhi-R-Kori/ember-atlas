"""Pinned, atomic PostgreSQL ingestion of the curated Ember Atlas dataset (dataset/processed), never inferred runs."""
import argparse
import json
from pathlib import Path
import sqlite3
import tempfile
from sqlalchemy import select,func,text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Session
from curation.extract import sha256
from curation.ingest import ingest as stage
from ember_atlas.paths import BASELINE, PROCESSED_DIR, resolve
from .database import engine
from .models import Base,DatasetRelease,SourceRecord,QualityIssue,RecordQuality,EvidenceLocation

CURATED=PROCESSED_DIR


def verify_baseline(curated=CURATED,baseline_path=BASELINE):
    baseline=json.loads(baseline_path.read_text())
    if sha256(curated/'build_manifest.json')!=baseline['build_manifest_sha256']:
        raise ValueError('Dataset build manifest differs from dataset/metadata/baseline.json')
    for name,digest in baseline['output_hashes'].items():
        if sha256(curated/name)!=digest:raise ValueError(f'Curated checksum mismatch: {name}')
    for name,digest in baseline['source_hashes'].items():
        if sha256(resolve(name))!=digest:raise ValueError(f'Original source checksum mismatch: {name}')
    for name,digest in baseline['review_evidence_hashes'].items():
        if sha256(resolve(name))!=digest:raise ValueError(f'Reference checksum mismatch: {name} (run scripts/restore_references.py)')
    return baseline


def counts(session):
    return {t.name:session.scalar(select(func.count()).select_from(t)) for t in Base.metadata.sorted_tables}


def ingest(curated=CURATED,baseline_path=BASELINE):
    curated=Path(curated);baseline_path=Path(baseline_path)
    baseline=verify_baseline(curated,baseline_path)
    digest=baseline['build_manifest_sha256']
    # Reuse the tested curation projection as a disposable interchange, not as production storage.
    with tempfile.TemporaryDirectory(prefix='ember-atlas-ingest-') as temporary:
        staging=Path(temporary)/'evidence.sqlite'
        stage(curated,staging)
        source=sqlite3.connect(staging);source.row_factory=sqlite3.Row
        try:
            with Session(engine()) as session,session.begin():
                session.execute(text('SELECT pg_advisory_xact_lock(702141)'))
                existing=session.get(DatasetRelease,digest)
                if existing:
                    return {'status':'already_ingested','dataset_version':existing.version,'counts':counts(session)}
                if session.scalar(select(func.count()).select_from(DatasetRelease)):
                    raise ValueError('Another dataset release is loaded; use an explicit version migration, never overwrite evidence')
                if session.scalar(select(func.count()).select_from(SourceRecord)):
                    raise ValueError('Unversioned records exist; refusing to overwrite')
                for table in Base.metadata.sorted_tables:
                    if table.name in ('dataset_release','record_quality'):continue
                    # Source-repeat pointers refer to earlier staged rows; preserve staging order.
                    cursor=source.execute(f'SELECT * FROM {table.name} ORDER BY rowid')
                    while rows:=cursor.fetchmany(500):
                        payloads=[]
                        for row in rows:
                            values=dict(row)
                            for column in table.columns:
                                if isinstance(column.type,JSONB) and values.get(column.name) is not None:
                                    values[column.name]=json.loads(values[column.name])
                            if table.name=='reconciliation_link':
                                values['scientific_merge_approved']=bool(values['scientific_merge_approved'])
                            payloads.append(values)
                        session.execute(table.insert(),payloads)
                session.flush()
                # Resolve issue scopes explicitly: exact record references or investigation-level flags.
                records=session.execute(select(SourceRecord.id,SourceRecord.investigation_id)).all()
                ids={rid for rid,_ in records};by_inv={}
                for rid,inv in records:by_inv.setdefault(inv,[]).append(rid)
                assignments=[]
                for q in session.scalars(select(QualityIssue)):
                    evidence=q.evidence_payload
                    refs=evidence if isinstance(evidence,list) else [evidence]
                    for ref in refs:
                        if isinstance(ref,str) and ref in ids:
                            assignments.append({'record_id':ref,'issue_id':q.id,'scope':'record'})
                        elif isinstance(ref,str) and ref in by_inv:
                            assignments.extend({'record_id':rid,'issue_id':q.id,'scope':'investigation'} for rid in by_inv[ref])
                unique={(a['record_id'],a['issue_id']):a for a in assignments}
                if unique:session.execute(RecordQuality.__table__.insert(),list(unique.values()))
                session.add(DatasetRelease(id=digest,version='p0_v1_review',manifest_sha256=digest,
                    baseline_sha256=sha256(baseline_path),metadata_payload={
                      'scientific_approval':False,'external_signoff':False,
                      'registry':json.loads((curated/'review/registry.json').read_text()),
                      'summary':json.loads((curated/'summary.json').read_text()),
                      'baseline_source_hashes':baseline['source_hashes']}))
                session.flush()
                return {'status':'ingested','dataset_version':'p0_v1_review','counts':counts(session)}
        finally:source.close()


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--curated',type=Path,default=CURATED)
    parser.add_argument('--baseline',type=Path,default=BASELINE)
    args=parser.parse_args()
    print(json.dumps(ingest(args.curated,args.baseline),indent=2))

"""Read-only scientific browsing API over pinned provisional source evidence."""
import json
import math
from typing import Literal
from fastapi import Depends,FastAPI,HTTPException,Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select,func,or_,text,Text
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from .database import get_session
from .models import (Investigation,SourceRecord,EvidenceSource,EvidenceLocation,ParameterObservation,
                     ParameterDefinition,QualityIssue,RecordQuality,ReconciliationLink,DatasetRelease,Measurement)

app=FastAPI(title='Ember Atlas API',version='1.0.0',description='Provisional source-linked research evidence. No scientific approval or verified run identity is implied.')
app.add_middleware(CORSMiddleware,allow_origins=['http://localhost:5173','http://127.0.0.1:5173'],allow_methods=['GET'],allow_headers=['*'])
NOTICE='Provisional research evidence · Scientific approval pending · Source records are not verified experiment runs.'


def release(session):
    row=session.scalar(select(DatasetRelease))
    if row is None:raise HTTPException(503,'No reviewed dataset ingested. Run migrations and ingestion.')
    return row


def issue_view(q,scope):
    return {'id':q.id,'code':q.code,'status':q.status,'scope':scope,
            'detail':q.detail,'requires_human_review':q.detail.get('requires_human_review',True)}


def issues_for(session,ids):
    result={rid:[] for rid in ids}
    if not ids:return result
    rows=session.execute(select(QualityIssue,RecordQuality.record_id,RecordQuality.scope)
        .join(RecordQuality,RecordQuality.issue_id==QualityIssue.id).where(RecordQuality.record_id.in_(ids)))
    for q,rid,scope in rows:result[rid].append(issue_view(q,scope))
    return result


def record_view(record,location,source,issues):
    raw=record.raw_payload
    open_issues=[q for q in issues if q['requires_human_review']]
    return {'id':record.id,'identifier':record.source_identifier,'investigation_id':record.investigation_id,
        'source_kind':'csv' if location.sheet is None else 'workbook','sheet':location.sheet,
        'row':location.row_number,'source_path':source.path,'source_sha256':source.sha256,
        'source_url':source.source_url,'official_download_url':source.extraction_metadata.get('official_download_url'),
        'license':source.license,'provenance_status':source.provenance_status,
        'scientific_status':record.scientific_status,'quality_status':'review_required' if open_issues else 'provisional_no_record_flags',
        'quality_issue_count':len(open_issues),'quality_codes':sorted({q['code'] for q in open_issues}),
        'duplicate_of':record.duplicate_of,'gravity':raw.get('gravity_environment','unknown'),
        'calendar_date':raw.get('calendar_date'),'identity_status':'source_record_not_verified_run'}


@app.get('/api/health')
def health(session:Session=Depends(get_session)):
    try:session.execute(text('SELECT 1'))
    except SQLAlchemyError:raise HTTPException(503,'Database unavailable')
    dataset=release(session)
    return {'status':'ok','database':'postgresql','dataset_version':dataset.version,'scientific_approval':False}


@app.get('/api/baseline')
def baseline(session:Session=Depends(get_session)):
    row=release(session)
    return {'version':row.version,'manifest_sha256':row.manifest_sha256,'baseline_sha256':row.baseline_sha256,
            'scientific_approval':False,'external_signoff':False,'notice':NOTICE,
            'summary':row.metadata_payload['summary']}


@app.get('/api/investigations')
def investigations(session:Session=Depends(get_session)):
    dataset=release(session)
    registry={r['investigation']:r for r in dataset.metadata_payload['registry']}
    result=[]
    for inv in session.scalars(select(Investigation).order_by(Investigation.id)):
        counts=session.execute(select(EvidenceLocation.sheet,func.count(SourceRecord.id))
            .join(SourceRecord,SourceRecord.location_id==EvidenceLocation.id)
            .where(SourceRecord.investigation_id==inv.id).group_by(EvidenceLocation.sheet)).all()
        meta=registry[inv.id]
        result.append({'id':inv.id,'name':inv.name,'title':meta['title'],'doi':meta['doi'],
            'catalog_url':meta['catalog_url'],'license':meta['license'],'flight_platform':meta['flight_platform'],
            'csv_rows':sum(n for sheet,n in counts if sheet is None),
            'workbook_rows':sum(n for sheet,n in counts if sheet is not None),
            'scientific_status':inv.scientific_status,'identity_status':'source_records_not_verified_runs'})
    return {'items':result,'notice':NOTICE}


@app.get('/api/investigations/{investigation_id}/records')
def records(investigation_id:str,q:str=Query('',max_length=120),source_kind:Literal['csv','workbook','all']='csv',
            quality:Literal['all','review_required']='all',limit:int=Query(30,ge=1,le=100),offset:int=Query(0,ge=0),session:Session=Depends(get_session)):
    release(session)
    if session.get(Investigation,investigation_id) is None:raise HTTPException(404,'Investigation not found')
    stmt=select(SourceRecord,EvidenceLocation,EvidenceSource).join(EvidenceLocation,SourceRecord.location_id==EvidenceLocation.id).join(EvidenceSource,EvidenceLocation.source_id==EvidenceSource.id).where(SourceRecord.investigation_id==investigation_id)
    if source_kind=='csv':stmt=stmt.where(EvidenceLocation.sheet.is_(None))
    if source_kind=='workbook':stmt=stmt.where(EvidenceLocation.sheet.is_not(None))
    if q:
        escaped=q.replace('\\','\\\\').replace('%','\\%').replace('_','\\_')
        stmt=stmt.where(or_(SourceRecord.source_identifier.ilike(f'%{escaped}%',escape='\\'),
                           SourceRecord.raw_payload.cast(Text).ilike(f'%{escaped}%',escape='\\')))
    if quality=='review_required':
        flagged=select(RecordQuality.record_id).join(QualityIssue,QualityIssue.id==RecordQuality.issue_id).where(QualityIssue.detail['requires_human_review'].astext=='true')
        stmt=stmt.where(SourceRecord.id.in_(flagged))
    total=session.scalar(select(func.count()).select_from(stmt.subquery()))
    rows=session.execute(stmt.order_by(EvidenceSource.path,EvidenceLocation.sheet.nulls_first(),EvidenceLocation.row_number).limit(limit).offset(offset)).all()
    issue_map=issues_for(session,[r.id for r,_,_ in rows])
    return {'items':[record_view(r,l,s,issue_map[r.id]) for r,l,s in rows],'total':total,'offset':offset,'limit':limit,'notice':NOTICE}


@app.get('/api/records/detail')
def record_detail(record_id:str,session:Session=Depends(get_session)):
    release(session)
    row=session.execute(select(SourceRecord,EvidenceLocation,EvidenceSource).join(EvidenceLocation,SourceRecord.location_id==EvidenceLocation.id).join(EvidenceSource,EvidenceLocation.source_id==EvidenceSource.id).where(SourceRecord.id==record_id)).first()
    if not row:raise HTTPException(404,'Source record not found')
    r,location,source=row
    issues=issues_for(session,[r.id])[r.id]
    observations=[]
    rows=session.execute(select(ParameterObservation,ParameterDefinition,EvidenceLocation)
        .join(ParameterDefinition,ParameterObservation.definition_id==ParameterDefinition.id)
        .join(EvidenceLocation,ParameterObservation.evidence_location_id==EvidenceLocation.id)
        .where(ParameterObservation.source_record_id==r.id).order_by(EvidenceLocation.column_number))
    for observation,definition,loc in rows:
        observations.append({'id':observation.id,'parameter_id':definition.id,'heading':definition.name,
            'original_value':loc.raw_payload.get('source_value',observation.original_value),
            'original_unit':loc.raw_payload.get('original_unit',definition.original_unit),
            'normalized_value':observation.normalized_value,'normalized_unit':observation.normalized_unit,
            'value_status':observation.value_status,'uncertainty':observation.uncertainty,
            'uncertainty_status':observation.uncertainty_status,'scientific_status':observation.scientific_status,
            'normalization_status':loc.raw_payload.get('normalization_status'),
            'formula':loc.raw_payload.get('formula'),'coordinate':loc.coordinate,
            'row':loc.row_number,'column':loc.column_number,'unit_evidence':loc.raw_payload.get('unit_evidence'),
            'evidence_location_id':loc.id})
    links=session.scalars(select(ReconciliationLink).where(or_(ReconciliationLink.left_record_id==r.id,ReconciliationLink.right_record_id==r.id))).all()
    return {**record_view(r,location,source,issues),'issues':issues,'observations':observations,
            'raw_record':r.raw_payload,'evidence':source.extraction_metadata,
            'associations':[{'kind':l.relation_kind,'status':l.review_status,'scientific_merge_approved':l.scientific_merge_approved,'evidence':l.evidence_payload} for l in links],
            'notice':NOTICE}


@app.get('/api/parameters')
def parameters(investigation_id:str,session:Session=Depends(get_session)):
    release(session)
    if session.get(Investigation,investigation_id) is None:raise HTTPException(404,'Investigation not found')
    rows=session.execute(select(ParameterDefinition,func.count(ParameterObservation.id))
        .join(ParameterObservation,ParameterObservation.definition_id==ParameterDefinition.id)
        .where(ParameterDefinition.investigation_id==investigation_id,ParameterObservation.normalized_value.is_not(None))
        .group_by(ParameterDefinition.id).order_by(ParameterDefinition.name)).all()
    actual_units={p.id:session.scalars(select(ParameterObservation.normalized_unit).where(ParameterObservation.definition_id==p.id,ParameterObservation.normalized_value.is_not(None)).distinct()).all() for p,_ in rows}
    return {'items':[{'id':p.id,'heading':p.name,'unit':actual_units[p.id][0] if len(actual_units[p.id])==1 else p.canonical_unit,
            'source_path':session.scalar(select(EvidenceLocation.source_id).join(ParameterObservation,ParameterObservation.evidence_location_id==EvidenceLocation.id).where(ParameterObservation.definition_id==p.id).limit(1)),
            'count':n,'mapping_status':p.mapping_status} for p,n in rows]}


@app.get('/api/series')
def series(parameter_id:str,session:Session=Depends(get_session)):
    release(session)
    definition=session.get(ParameterDefinition,parameter_id)
    if not definition:raise HTTPException(404,'Parameter not found')
    rows=session.execute(select(ParameterObservation,SourceRecord,EvidenceLocation,EvidenceSource)
        .join(SourceRecord,ParameterObservation.source_record_id==SourceRecord.id)
        .join(EvidenceLocation,ParameterObservation.evidence_location_id==EvidenceLocation.id)
        .join(EvidenceSource,EvidenceLocation.source_id==EvidenceSource.id)
        .where(ParameterObservation.definition_id==parameter_id).order_by(EvidenceLocation.row_number)).all()
    points=[];excluded=[]
    issue_map=issues_for(session,[r.id for _,r,_,_ in rows])
    for o,r,loc,source in rows:
        status=loc.raw_payload.get('normalization_status','')
        if o.normalized_value is None or o.value_status=='disputed_source_value' or 'not_accepted' in status:
            excluded.append({'record_id':r.id,'row':loc.row_number,'reason':o.value_status if o.value_status!='observed' else 'no_supported_numeric_value'})
            continue
        try:value=float(o.normalized_value)
        except (TypeError,ValueError):continue
        if not math.isfinite(value):continue
        points.append({'record_id':r.id,'label':r.source_identifier or str(loc.row_number),
            'source_row':loc.row_number,'value':value,'unit':o.normalized_unit,
            'source_path':source.path,'source_sha256':source.sha256,'source_url':source.source_url,
            'sheet':loc.sheet,'coordinate':loc.coordinate,'value_status':o.value_status,
            'scientific_status':o.scientific_status,'normalization_status':status,
            'quality_codes':sorted({q['code'] for q in issue_map[r.id] if q['requires_human_review']}),
            'uncertainty':o.uncertainty,'uncertainty_status':o.uncertainty_status})
    units={p['unit'] for p in points}
    if len(units)>1:raise HTTPException(409,'Mixed normalized units cannot share a scientific chart axis')
    unit=next(iter(units)) if units else definition.canonical_unit
    return {'parameter':{'id':definition.id,'heading':definition.name,'unit':unit},
            'points':points,'excluded':excluded,'axis_note':'Source row is a record position, not elapsed time or a unique experiment identifier.',
            'notice':NOTICE}


@app.get('/api/comparison')
def comparison(record_ids:list[str]=Query(min_length=2,max_length=8),session:Session=Depends(get_session)):
    from .research import compare_details
    dataset=release(session)
    if len(set(record_ids))!=len(record_ids):raise HTTPException(422,'Choose distinct source record IDs; actual duplicate source rows are still retained')
    details=[record_detail(record_id,session=session) for record_id in record_ids]
    return {**compare_details(details),'dataset_version':dataset.version,'manifest_sha256':dataset.manifest_sha256}


def coverage_source(session,investigation_id):
    if session.get(Investigation,investigation_id) is None:raise HTTPException(404,'Investigation not found')
    rows=session.execute(select(ParameterObservation,ParameterDefinition,EvidenceLocation)
        .join(ParameterDefinition,ParameterObservation.definition_id==ParameterDefinition.id)
        .join(EvidenceLocation,ParameterObservation.evidence_location_id==EvidenceLocation.id)
        .where(ParameterDefinition.investigation_id==investigation_id,EvidenceLocation.sheet.is_(None))
        .order_by(EvidenceLocation.row_number,EvidenceLocation.column_number)).all()
    fields={};observations=[]
    for o,p,l in rows:
        entry=fields.setdefault(p.id,{'id':p.id,'heading':p.name,'kind':'categorical','unit':None,'source_path':l.source_id})
        if o.normalized_value is not None:
            entry.update(kind='numeric',unit=o.normalized_unit)
        observations.append({'record_id':o.source_record_id,'parameter_id':p.id,'original_value':l.raw_payload.get('source_value',o.original_value),
            'normalized_value':o.normalized_value,'normalized_unit':o.normalized_unit,'value_status':o.value_status,
            'normalization_status':l.raw_payload.get('normalization_status')})
    return list(fields.values()),observations


@app.get('/api/coverage/fields')
def coverage_fields(investigation_id:str,session:Session=Depends(get_session)):
    release(session)
    fields,_=coverage_source(session,investigation_id)
    return {'items':fields,'scope':'CSV source records only; workbook copies are not added to coverage counts'}


@app.get('/api/coverage')
def coverage(investigation_id:str,x_parameter_id:str,y_parameter_id:str,bins:int=Query(4,ge=2,le=8),
             sparse_below:int=Query(3,ge=1,le=10),session:Session=Depends(get_session)):
    from .research import coverage_grid
    dataset=release(session)
    if x_parameter_id==y_parameter_id:raise HTTPException(422,'Choose two different coverage fields')
    fields,observations=coverage_source(session,investigation_id)
    lookup={f['id']:f for f in fields}
    if x_parameter_id not in lookup or y_parameter_id not in lookup:raise HTTPException(422,'Coverage fields must belong to the selected investigation CSV')
    x,y=lookup[x_parameter_id],lookup[y_parameter_id]
    if x['source_path']!=y['source_path']:raise HTTPException(422,'Do not mix independently indexed sources in one coverage grid')
    rows=session.execute(select(SourceRecord).join(EvidenceLocation,SourceRecord.location_id==EvidenceLocation.id)
        .where(SourceRecord.investigation_id==investigation_id,EvidenceLocation.sheet.is_(None)).order_by(EvidenceLocation.row_number)).scalars().all()
    try:result=coverage_grid([{'id':r.id,'duplicate_of':r.duplicate_of} for r in rows],x,y,observations,bins,sparse_below)
    except ValueError as error:raise HTTPException(422,str(error))
    source=session.get(EvidenceSource,x['source_path'])
    return {**result,'dataset_version':dataset.version,'manifest_sha256':dataset.manifest_sha256,
            'provenance':{'source_path':source.path,'source_sha256':source.sha256,'source_url':source.source_url},
            'scientific_approval':False}


# ----------------------------------------------------------------------------- dashboard spine
import os
from pathlib import Path as _Path
from fastapi import Body, Header, Request
from .science import review as review_queue
from .science.ai import ask as ai_ask
from .science.export import public_registry
from .science.spine import build_spine

from ember_atlas.paths import AI_EVALUATION_RESULTS, MODEL_REGISTRY, VERIFICATION_RESULTS
_SPINE_CACHE: dict = {}


def spine_payload(session):
    dataset = release(session)
    queue_mtime = max([p.stat().st_mtime for p in review_queue.QUEUE.glob('*.jsonl')] or [0])
    key = (dataset.manifest_sha256, queue_mtime)
    if key not in _SPINE_CACHE:
        _SPINE_CACHE.clear()
        spine = build_spine(session)
        registry_path = MODEL_REGISTRY
        ai_path = AI_EVALUATION_RESULTS
        spine['models'] = public_registry(json.loads(registry_path.read_text())) if registry_path.exists() else None
        spine['ai_evaluation'] = json.loads(ai_path.read_text()) if ai_path.exists() else None
        spine['reviewed_findings'] = review_queue.approved_public()
        ver_path = VERIFICATION_RESULTS
        spine['verification'] = json.loads(ver_path.read_text()) if ver_path.exists() else None
        spine['mode'] = 'live_api'
        _SPINE_CACHE[key] = spine
    return _SPINE_CACHE[key]


@app.get('/api/spine')
def spine(session: Session = Depends(get_session)):
    return spine_payload(session)


@app.post('/api/ask')
def ask(payload: dict = Body(...), session: Session = Depends(get_session)):
    question = str(payload.get('question', '')).strip()
    if not question or len(question) > 400:
        raise HTTPException(422, 'Ask a question of 1–400 characters')
    return ai_ask(question, spine_payload(session))


def _local_reviewer(request: Request):
    if os.environ.get('EMBER_ATLAS_REVIEW_ENABLED') != '1':
        raise HTTPException(404, 'Review queue is disabled (set EMBER_ATLAS_REVIEW_ENABLED=1 for local team use)')
    if request.client is None or request.client.host not in ('127.0.0.1', '::1', 'testclient'):
        raise HTTPException(403, 'Review queue is available on loopback only')


@app.get('/api/review/queue')
def review_items(request: Request):
    _local_reviewer(request)
    return {'items': review_queue.queue_state(), 'decisions': list(review_queue.DECISIONS),
            'flags': list(review_queue.EXTRACTION_FLAGS),
            'notice': 'Team-only queue. AI candidates are proposals; only confirmed/corrected items can be exported.'}


@app.post('/api/review/{candidate_id}/decision')
def review_decision(candidate_id: str, request: Request, payload: dict = Body(...),
                    x_reviewer_token: str | None = Header(default=None)):
    _local_reviewer(request)
    token = os.environ.get('EMBER_ATLAS_REVIEWER_TOKEN')
    if not token or x_reviewer_token != token:
        raise HTTPException(401, 'A valid reviewer token is required to record decisions')
    try:
        entry = review_queue.record_decision(candidate_id, payload.get('decision', ''), payload.get('reviewer', ''),
                                             payload.get('note', ''), payload.get('corrections') or None,
                                             payload.get('source_evidence', ''))
    except KeyError:
        raise HTTPException(404, 'Unknown candidate')
    except ValueError as error:
        raise HTTPException(422, str(error))
    _SPINE_CACHE.clear()
    return entry


@app.get('/api/findings/candidates')
def finding_candidates(request: Request):
    """Read-only, loopback-only view of AI candidates for local display (never exported)."""
    if request.client is None or request.client.host not in ('127.0.0.1', '::1', 'testclient'):
        raise HTTPException(403, 'Candidate findings are available on loopback only')
    items = [{k: v for k, v in item.items() if k != 'history'} for item in review_queue.queue_state()]
    return {'items': items, 'notice': 'AI candidates pending human review; not evidence.'}

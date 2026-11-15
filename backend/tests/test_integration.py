"""Real PostgreSQL migrations, pinned ingestion and API safety integration tests."""
import json
import os
from pathlib import Path
import uuid
from urllib.parse import urlencode
import pytest
import psycopg
from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy import select,func,text
from sqlalchemy.orm import Session
from app.database import engine
from app.ingestion import ingest,verify_baseline,CURATED
from app.main import app
from app.models import Base,SourceRecord,ExperimentRun,OperatingConditionSegment,DatasetRelease


@pytest.fixture(scope='module')
def client():
    url=os.environ.get('EMBER_ATLAS_TEST_DATABASE_URL')
    if not url:pytest.skip('Set EMBER_ATLAS_TEST_DATABASE_URL to a real PostgreSQL database; SQLite is not accepted')
    schema='p1a_test_'+uuid.uuid4().hex
    raw_url=url.replace('postgresql+psycopg://','postgresql://')
    with psycopg.connect(raw_url,autocommit=True) as connection:
        connection.execute(f'CREATE SCHEMA {schema}')
    previous=os.environ.get('DATABASE_URL')
    os.environ['DATABASE_URL']=url+('&' if '?' in url else '?')+urlencode({'options':f'-csearch_path={schema}'})
    engine.cache_clear()
    config=Config(str(Path(__file__).resolve().parents[2]/'database/alembic.ini'))
    try:
        command.upgrade(config,'head')
        # Exercise a real downgrade/upgrade in the isolated empty test schema.
        command.downgrade(config,'base')
        command.upgrade(config,'head')
        result=ingest()
        assert result['status']=='ingested'
        with TestClient(app) as test_client:yield test_client
    finally:
        engine().dispose();engine.cache_clear()
        if previous is None:os.environ.pop('DATABASE_URL',None)
        else:os.environ['DATABASE_URL']=previous
        with psycopg.connect(raw_url,autocommit=True) as connection:
            connection.execute(f'DROP SCHEMA {schema} CASCADE')


def test_postgresql_migration_and_idempotent_ingestion(client):
    result=ingest()
    assert result['status']=='already_ingested'
    assert result['counts']['source_record']==1716
    assert result['counts']['parameter_observation']==24097
    assert result['counts']['experiment_run']==result['counts']['operating_condition_segment']==0
    with Session(engine()) as session:
        assert session.scalar(text('SELECT version_num FROM alembic_version'))=='0001_p1a'
        assert session.scalar(select(func.count()).select_from(DatasetRelease))==1
        csv_count=session.scalar(text('SELECT count(*) FROM source_record r JOIN evidence_location l ON r.location_id=l.id WHERE l.sheet IS NULL'))
        assert csv_count==1068
        duplicates=session.scalar(select(func.count()).select_from(SourceRecord).where(SourceRecord.duplicate_of.is_not(None)))
        assert duplicates==42


def test_health_baseline_and_investigations(client):
    assert client.get('/api/health').json()['database']=='postgresql'
    b=client.get('/api/baseline').json()
    assert b['scientific_approval'] is False and b['external_signoff'] is False
    inv=client.get('/api/investigations').json()['items']
    assert len(inv)==5
    assert sum(i['csv_rows'] for i in inv)==1068


def test_record_browsing_search_and_pagination(client):
    result=client.get('/api/investigations/PSI-107/records',params={'limit':12}).json()
    assert result['total']==469 and len(result['items'])==12
    first=result['items'][0]
    assert first['source_sha256'] and first['source_url'] and first['quality_status']
    assert first['identity_status']=='source_record_not_verified_run'
    second=client.get('/api/investigations/PSI-107/records',params={'limit':12,'offset':12}).json()
    assert first['id'] not in {r['id'] for r in second['items']}
    assert client.get('/api/investigations/PSI-107/records',params={'source_kind':'workbook'}).json()['total']==648
    assert client.get('/api/investigations/PSI-101/records',params={'q':'51a'}).json()['total']>=1
    assert client.get('/api/investigations/PSI-107/records',params={'q':"' OR 1=1 --"}).json()['total']==0
    percent=client.get('/api/investigations/PSI-107/records',params={'q':'%'}).json()
    # Percent is literal and really occurs in propylene-mixture values.
    assert 0<percent['total']<469
    for row in percent['items']:
        assert '%' in json.dumps(client.get('/api/records/detail',params={'record_id':row['id']}).json()['raw_record'])


def test_quality_filter_and_missing_record(client):
    response=client.get('/api/investigations/PSI-39/records',params={'quality':'review_required'})
    assert response.status_code==200
    assert all(r['quality_issue_count']>0 for r in response.json()['items'])
    assert client.get('/api/records/detail',params={'record_id':'missing'}).status_code==404
    assert client.get('/api/investigations/PSI-0/records').status_code==404
    assert client.get('/api/investigations/PSI-107/records',params={'limit':10000}).status_code==422


def test_details_original_values_provenance_and_uncertainty(client):
    rows=client.get('/api/investigations/PSI-69/records',params={'q':'C11M201'}).json()['items']
    row=next(r for r in rows if r['identifier']=='114')
    detail=client.get('/api/records/detail',params={'record_id':row['id']}).json()
    pressure=next(o for o in detail['observations'] if o['heading']=='Ambient pressure; mmHg')
    assert pressure['original_value']=='0'
    assert pressure['value_status']=='disputed_source_value'
    assert 'not_accepted' in pressure['normalization_status']
    assert pressure['uncertainty_status']=='not_reported'
    assert detail['source_sha256']==detail['evidence']['official_sha256']
    assert detail['scientific_status']=='not_reviewed'
    assert any(q['scope']=='record' for q in detail['issues'])


def test_graph_excludes_disputed_and_missing_values_and_links_every_point(client):
    params=client.get('/api/parameters',params={'investigation_id':'PSI-69'}).json()['items']
    pressure=next(p for p in params if p['heading']=='Ambient pressure; mmHg')
    result=client.get('/api/series',params={'parameter_id':pressure['id']}).json()
    assert any(p['row']==115 and p['reason']=='disputed_source_value' for p in result['excluded'])
    assert not any(p['source_row']==115 for p in result['points'])
    assert all(p['source_sha256'] and p['source_path'] and p['record_id'] and p['scientific_status']=='not_reviewed' for p in result['points'])
    assert all(p['unit']=='Pa' for p in result['points'])
    assert client.get('/api/series',params={'parameter_id':'missing'}).status_code==404


def test_smoke_associations_are_not_scientific_merges(client):
    records=client.get('/api/investigations/PSI-107/records',params={'source_kind':'workbook','limit':100}).json()['items']
    row=next(r for r in records if r['sheet']=='Smoke Point Datasheet' and r['row']==23)
    detail=client.get('/api/records/detail',params={'record_id':row['id']}).json()
    assert detail['associations']
    assert all(a['scientific_merge_approved'] is False for a in detail['associations'])
    assert any(o['formula'] for o in detail['observations'])


def test_tampered_baseline_fails_before_writing(client,tmp_path):
    import shutil
    copy=tmp_path/'curated';shutil.copytree(CURATED,copy)
    with (copy/'observations.jsonl').open('a') as file:file.write('{}\n')
    with pytest.raises(ValueError,match='checksum mismatch'):ingest(copy)
    assert ingest()['status']=='already_ingested'


def test_graph_uses_actual_normalized_unit_when_source_heading_is_incomplete(client):
    parameters=client.get('/api/parameters',params={'investigation_id':'PSI-39'}).json()['items']
    pressure=next(p for p in parameters if p['heading']=='Pressure')
    assert pressure['unit']=='Pa'
    graph=client.get('/api/series',params={'parameter_id':pressure['id']}).json()
    assert graph['parameter']['unit']=='Pa'
    assert all(p['unit']=='Pa' for p in graph['points'])


def test_actual_record_comparison_and_missing_value_preservation(client):
    rows=client.get('/api/investigations/PSI-69/records',params={'limit':3}).json()['items']
    response=client.get('/api/comparison',params=[('record_ids',r['id']) for r in rows[:2]])
    assert response.status_code==200
    result=response.json();group=next(g for g in result['groups'] if g['heading']=='Droplet initial diameter; mm')
    assert group['status']=='compatible_provisional'
    assert [p['value'] for p in group['points']]==[1.69,1.86]
    assert all(p['source_sha256'] and p['source_url'] for p in group['points'])
    assert result['records'][0]['scientific_status']=='not_reviewed'
    assert client.get('/api/comparison',params=[('record_ids',rows[0]['id'])]*2).status_code==422
    assert client.get('/api/comparison',params=[('record_ids',rows[0]['id']),('record_ids','missing')]).status_code==404


def test_actual_smoke_calibrations_cannot_be_silently_overlaid(client):
    rows=client.get('/api/investigations/PSI-107/records',params={'source_kind':'workbook','limit':100}).json()['items']
    chosen=[next(r for r in rows if r['sheet']=='Smoke Point Datasheet' and r['row']==n) for n in [5,23]]
    result=client.get('/api/comparison',params=[('record_ids',r['id']) for r in chosen]).json()
    length=next(g for g in result['groups'] if g['heading']=='length_mm')
    assert length['status']=='incompatible_methods' and length['points']==[]


def test_duplicate_source_records_are_not_collapsed_in_comparison(client):
    rows=client.get('/api/investigations/PSI-107/records',params={'limit':2}).json()['items']
    result=client.get('/api/comparison',params=[('record_ids',r['id']) for r in rows]).json()
    assert len(result['records'])==2
    assert result['records'][1]['duplicate_of']==result['records'][0]['id']
    assert 'not independent' in ' '.join(result['warnings'])


def test_postgresql_coverage_is_deterministic_and_accounts_for_records(client):
    fields=client.get('/api/coverage/fields',params={'investigation_id':'PSI-107'}).json()['items']
    x=next(f for f in fields if f['heading']=='Fuel');y=next(f for f in fields if f['heading']=='Nozzle (mm)')
    params={'investigation_id':'PSI-107','x_parameter_id':x['id'],'y_parameter_id':y['id']}
    result=client.get('/api/coverage',params=params)
    assert result.status_code==200
    data=result.json();assert data==client.get('/api/coverage',params=params).json()
    assert data['total_records']==469 and data['duplicate_rows_retained']==34
    assert sum(c['count'] for c in data['cells'])==data['complete_records']
    assert data['complete_records']+data['missing_metadata_records']+data['unusable_metadata_records']==469
    assert data['y']['unit']=='mm' and data['provenance']['source_sha256']
    assert 'does not prove' in data['notice']
    sample=next(c['record_ids'][0] for c in data['cells'] if c['record_ids'])
    assert client.get('/api/records/detail',params={'record_id':sample}).status_code==200
    assert client.get('/api/coverage',params={**params,'y_parameter_id':x['id']}).status_code==422
    assert client.get('/api/coverage',params={**params,'y_parameter_id':'unknown'}).status_code==422


def test_disputed_pressure_is_unassigned_metadata_not_a_zero_coverage_level(client):
    fields=client.get('/api/coverage/fields',params={'investigation_id':'PSI-69'}).json()['items']
    x=next(f for f in fields if f['heading']=='Fuel');y=next(f for f in fields if f['heading']=='Ambient pressure; mmHg')
    result=client.get('/api/coverage',params={'investigation_id':'PSI-69','x_parameter_id':x['id'],'y_parameter_id':y['id']}).json()
    assert result['unusable_metadata_records']>=1 and float(result['y']['min'])>0


def test_spice_fuel_by_nozzle_example_shown_in_resources(client):
    """The Resources page quotes this Research Gap Explorer result; keep it tied to the executed query."""
    fields={f['heading']:f for f in client.get('/api/coverage/fields',params={'investigation_id':'PSI-107'}).json()['items']}
    data=client.get('/api/coverage',params={'investigation_id':'PSI-107','x_parameter_id':fields['Nozzle (mm)']['id'],
        'y_parameter_id':fields['Fuel']['id'],'bins':4,'sparse_below':3}).json()
    assert data['total_records']==469 and data['x']['binning']=='exact_observed_values' and data['x']['levels']==['0.4064','0.762','1.6002']
    cell={(data['y']['levels'][c['y']],data['x']['levels'][c['x']]):(c['count'],c['status']) for c in data['cells']}
    expected={'Ethylene':(17,12,18),'Propane':(16,12,22),'Propylene':(46,31,45),'Methane':(2,2,0)}
    for fuel,counts in expected.items():
        assert tuple(cell[(fuel,n)][0] for n in data['x']['levels'])==counts
    assert cell[('Methane','1.6002')][1]=='unobserved_in_complete_index' and cell[('Methane','0.762')][1]=='sparse'

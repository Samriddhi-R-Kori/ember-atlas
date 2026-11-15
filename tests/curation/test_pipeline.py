"""Scientific data preservation and conservative reconciliation regression tests."""
from pathlib import Path
import json
import sqlite3
import pytest
from curation.extract import csv_data, missingness, sha256
from curation.reconcile import clock, pair_smoke, csv_flight_links
from curation.units import convert, csv_unit
from curation.pipeline import build, source_files
from ember_atlas.paths import raw_dir, resolve, REFERENCES_DIR, investigation_of
from curation.ingest import ingest, read_jsonl


@pytest.fixture(scope='session')
def product(tmp_path_factory):
    output=tmp_path_factory.mktemp('curation')/'curated'
    before={p:sha256(p) for p in source_files()}
    summary=build(output)
    assert {p:sha256(p) for p in source_files()}==before
    return output,summary


def test_all_rows_and_duplicates_preserved(product):
    out,summary=product
    assert summary['csv_rows']==1068
    assert summary['duplicates_retained']==42
    records=read_jsonl(out/'source_records.jsonl')
    for n,name in [(107,'Spice.csv'),(69,'FLEX.csv'),(39,'CFI.csv'),(101,'SAME-R.csv'),(25,'BASS-II.csv')]:
        headers,source,encoding=csv_data(raw_dir(f'PSI-{n}')/name)
        curated=[r for r in records if r['investigation']==f'PSI-{n}']
        assert [r['values'] for r in curated]==[r['values'] for r in source]
        assert [r['source_row'] for r in curated]==[r['row'] for r in source]
    assert any(r['source_identifier']=='51a' for r in records)
    assert sum(bool(r['exact_duplicate_of']) for r in records)==42


@pytest.mark.parametrize('value,status',[('', 'blank'),(None,'blank'),('–','source_dash'),('0','observed'),(0,'observed'),('n/a','source_annotation'),('~21.5','estimated')])
def test_missingness(value,status):
    assert missingness(value)==status


@pytest.mark.parametrize('value,expected',[('14:37:08',52628),('14.37.08',52628),('1744',None),('Ku LOS',None),('25:00:00',None),('12:62:00',None)])
def test_time_parser_no_invented_precision(value,expected):
    assert clock(value)==expected


def test_numeric_units_and_ambiguity():
    assert convert('12','cm/s')['normalized_value']=='0.12'
    assert convert('0','mm')['normalized_value']=='0'
    assert convert('1','atm')['normalized_value']=='101325'
    assert convert('20.9','vol_percent')['normalized_value']=='0.209'
    for value in ('~21.5','n/a','3 5 approaching 10','NaN','Infinity'):
        assert convert(value,'mm') is None
    assert csv_unit('PSI-69','Burning rate; mm') is None
    assert csv_unit('PSI-39','Oxygen') is None


def test_smoke_discrepancies_and_cell_formula_provenance(product):
    out,summary=product
    links=read_jsonl(out/'spice/reconciliation_links.jsonl')
    pairs=[l for l in links if l['kind']=='smoke_sheet_correspondence']
    assert len(pairs)==55
    assert len({p['left'] for p in pairs})==len({p['right'] for p in pairs})==55
    assert all(not p['scientific_merge_approved'] for p in pairs)
    p23=next(p for p in pairs if p['left'].endswith('::23'))
    assert {'pixel_length','length_mm'}<={d['field'] for d in p23['differences']}
    p35=next(p for p in pairs if p['left'].endswith('::35'))
    assert any(d['field']=='data' and d['left']=='09:41:01' and d['right']=='09:40:59' for d in p35['differences'])
    checks=json.loads((out/'spice/calibration_checks.json').read_text())
    assert len(checks)==110
    assert all(abs(c['cached_minus_recalculated'])<1e-8 for c in checks if c.get('cached_minus_recalculated') is not None)
    cells=read_jsonl(out/'spice/workbook_cells.jsonl')
    assert any('formula_tokens_hex' in c for c in cells if c['source'].endswith('.xls'))
    assert any(c['sheet']=='Reference (2)' for c in cells)
    assert any(c['sheet']=='Smoke Point Datasheet' and c['row']==105 for c in cells)


def test_many_to_many_links_not_deduplicated(product):
    out,_=product
    links=read_jsonl(out/'spice/reconciliation_links.jsonl')
    assert any(l.get('candidate_count',0)>1 for l in links)
    assert all(l['scientific_merge_approved'] is False for l in links)
    assert any(l.get('conflicting_fields') for l in links if l['kind']=='csv_flight')


def test_flame_lengths_do_not_promote_zero_or_na(product):
    out,_=product
    records=read_jsonl(out/'spice/flame_length.jsonl')
    assert len(records)==12
    assert next(r for r in records if r['row']==10)['status']=='needs_clarification'
    assert next(r for r in records if r['row']==12)['recalculated_mm'] is None
    assert all(abs(r['difference_mm'])<1e-8 for r in records if r['difference_mm'] is not None)


def test_source_manifest_and_output_checksums(product):
    out,_=product
    for s in json.loads((out/'source_manifest.json').read_text()):
        assert sha256(resolve(s['source']))==s['sha256']
    manifest=json.loads((out/'build_manifest.json').read_text())
    assert all(sha256(out/p)==h for p,h in manifest['output_hashes'].items())


def test_idempotent_relational_ingestion_and_constraints(product,tmp_path):
    out,_=product
    db=tmp_path/'curation.sqlite'
    first=ingest(out,db)
    assert ingest(out,db)==first
    assert first['source_record']>=1068+110+12
    assert first['experiment_run']==first['operating_condition_segment']==0
    with sqlite3.connect(db) as c:
        c.execute('PRAGMA foreign_keys=ON')
        assert c.execute('PRAGMA foreign_key_check').fetchall()==[]
        with pytest.raises(sqlite3.IntegrityError):
            c.execute("INSERT INTO source_record VALUES ('bad','PSI-107','absent',NULL,'{}',NULL,'not_reviewed')")


def test_output_path_protection():
    with pytest.raises(ValueError):build(raw_dir('PSI-107')/'derived')
    with pytest.raises(ValueError):build(REFERENCES_DIR/'derived')


def test_repeat_build_is_deterministic(product,tmp_path):
    out,_=product
    second=tmp_path/'second'
    build(second)
    first=json.loads((out/'build_manifest.json').read_text())
    other=json.loads((second/'build_manifest.json').read_text())
    assert first['output_hashes']==other['output_hashes']
    assert first['source_hashes']==other['source_hashes']


def test_media_and_measurement_provenance_loaded(product,tmp_path):
    out,_=product
    counts=ingest(out,tmp_path/'media.sqlite')
    assert counts['media_asset']>0
    assert counts['measurement']>=110
    cells=read_jsonl(out/'spice/workbook_cells.jsonl')
    assert any(c.get('xml_value') is not None and c['coordinate']=='B5' for c in cells if c['source'].endswith('.xlsx'))


def test_tampered_output_rejected(product,tmp_path):
    import shutil
    out,_=product
    copy=tmp_path/'tampered'
    shutil.copytree(out,copy)
    with (copy/'observations.jsonl').open('a') as f:f.write('{}\n')
    with pytest.raises(ValueError,match='checksum mismatch'):
        ingest(copy,tmp_path/'tampered.sqlite')


def test_annotation_equality_does_not_create_time():
    from curation.reconcile import equal
    assert equal('Ku LOS','Ku             LOS','ignition')
    assert clock('Ku LOS') is None
    assert equal('no ku','no ku','ignition')


def test_official_sources_and_catalog_license_verified(product):
    out,summary=product
    assert summary['official_data_files_byte_verified']==8
    manifest=json.loads((out/'source_manifest.json').read_text())
    authenticated=[m for m in manifest if m['external_provenance_status']=='official_download_byte_identical']
    assert len(authenticated)==8
    assert all(m['license']=='CC0-1.0' and m['sha256']==m['official_sha256'] for m in authenticated)
    registry=json.loads((out/'review/registry.json').read_text())
    assert len(registry)==5
    assert next(r for r in registry if r['investigation']=='PSI-39')['doi']=='10.60555/m6pj-a914'


def test_documented_units_and_disputed_pressure(product):
    out,_=product
    observations=read_jsonl(out/'observations.jsonl')
    burn=next(o for o in observations if investigation_of(o['source'])=='PSI-69' and o['source_row']==2 and o['source_heading']=='Burning rate; mm')
    assert burn['source_value']=='0.52'
    assert burn['normalized_value']=='0.52'
    assert burn['normalized_unit']=='mm^2/s'
    assert burn['source_heading_unit']=='mm (incomplete heading)'
    pressure=next(o for o in observations if investigation_of(o['source'])=='PSI-69' and o['source_row']==115 and o['source_column']==6)
    assert pressure['source_value']=='0'
    assert pressure['value_status']=='disputed_source_value'
    assert 'not_accepted_pressure' in pressure['normalization_status']


def test_review_does_not_invent_calibration_or_runs(product):
    out,_=product
    contexts=json.loads((out/'review/calibration_contexts.json').read_text())
    assert len(contexts)==13
    assert all(c['agrees_at_published_precision'] for c in contexts)
    assert all('unapproved' in c['assignment_status'] for c in contexts)
    groups=json.loads((out/'review/source_condition_groups.json').read_text())
    assert len(groups)==157
    assert sum(g['distinct_condition_signatures']>1 for g in groups)==119
    assert all(g['status']=='source_group_not_verified_run' for g in groups)


def test_source_supported_gravity_and_year_scoped_to_flight_records(product):
    out,_=product
    records=read_jsonl(out/'source_records.jsonl')
    assert all(r['gravity_environment']=='actual_microgravity' for r in records)
    spice=next(r for r in records if r['investigation']=='PSI-107')
    assert spice['calendar_date']=='2009-02-14'
    assert all(r['scientific_status']=='not_reviewed' for r in records)
    cells=read_jsonl(out/'spice/workbook_cells.jsonl')
    assert all('gravity_environment' not in c for c in cells if c['sheet'].startswith('Reference'))


def test_resolved_counts_do_not_close_other_scientific_questions(product):
    out,_=product
    issues=read_jsonl(out/'quality_issues.jsonl')
    samer=next(q for q in issues if q['code']=='SAMER_66_VS_109')
    assert samer['status']=='resolved_documentary'
    assert samer['requires_human_review'] is False
    assert any(q['code']=='BASS_OXYGEN_INCREASE' and q['status']=='open' for q in issues)
    assert any(q['code']=='CALIBRATION_REFERENCE_DISAGREEMENT' and q['requires_human_review'] for q in issues)

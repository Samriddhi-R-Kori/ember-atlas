"""Ember Atlas curation pipeline: NASA PSI raw files -> dataset/processed/.

Run from the repository root: ``python3 -m curation.pipeline`` (or ``python scripts/build_dataset.py``,
which also re-pins dataset/metadata/baseline.json).
"""
import argparse
from collections import Counter, defaultdict
from datetime import datetime, timezone
import hashlib
import importlib.metadata
import json
from pathlib import Path
import platform
import re

from .extract import csv_data, extract_workbook, missingness, sha256
from .reconcile import (SMOKE_A, SMOKE_B, FLIGHT, CSV, SHEET_A, SHEET_B,
                        FLIGHT_SHEET, workbook_records, pair_smoke,
                        time_candidates, csv_flight_links, row_id, number, clock, equal, label_candidates)
from .units import convert, csv_unit
from .project import workbook_observations, media_references
from .review import apply_review

from ember_atlas.paths import REPO_ROOT, PROCESSED_DIR, RAW_DIR, REFERENCES_DIR, raw_dir, dataset_rel, INVESTIGATIONS

PIPELINE_VERSION = '1.2.0'   # 1.2.0: Ember Atlas layout (dataset/raw/<investigation>/); extraction logic unchanged from 1.1.0
CSV_NAMES = {107:'Spice.csv',69:'FLEX.csv',39:'CFI.csv',101:'SAME-R.csv',25:'BASS-II.csv'}
SPICE_WORKBOOKS = ['SmokePointReview-0g-3.xlsx','Spice Flight Test Data II modified.xls','Spice_Flight_Flamelength.xls']
IDENTIFIERS = {107:None,69:0,39:0,101:1,25:1}


def dump(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2, allow_nan=False)+'\n', encoding='utf-8')


def jsonl(path, rows):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open('w', encoding='utf-8', newline='\n') as f:
        for row in rows:
            f.write(json.dumps(row, ensure_ascii=False, sort_keys=True, allow_nan=False)+'\n')


def source_files():
    files = []
    for n, name in CSV_NAMES.items():
        base = raw_dir(f'PSI-{n}')
        files.append(base/name)
        files.extend(p for p in (base/'info.md',base/'layout.json') if p.exists())
    files.extend(raw_dir('PSI-107')/name for name in SPICE_WORKBOOKS)
    return sorted(files)


def mentions(item, inv):
    """True when an issue refers to the investigation by id or by one of its dataset/raw/<slug>/ source paths."""
    text = json.dumps(item, ensure_ascii=False)
    return inv in text or f"dataset/raw/{INVESTIGATIONS[inv]['slug']}/" in text


def issue(code, evidence, detail, **kwargs):
    return {'code':code,'evidence':evidence,'detail':detail,'status':'open',
            'requires_human_review':True, **kwargs}


def audit_csv(path, investigation):
    headers, raw, encoding = csv_data(path)
    source = dataset_rel(path)
    records, observations, issues = [], [], []
    seen = {}
    ids = defaultdict(list)
    field_stats = {str(i+1): {'heading':h,'blank':0,'source_dash':0,
                             'zero':0,'annotation':0,'negative_numeric':0} for i,h in enumerate(headers)}
    for r in raw:
        rid = row_id(source,None,r['row'])
        key = tuple(r['values'])
        duplicate = seen.get(key)
        seen.setdefault(key,rid)
        identifier = r['values'][IDENTIFIERS[int(investigation[4:])]] if IDENTIFIERS[int(investigation[4:])]!=None else None
        if identifier is not None: ids[identifier].append(rid)
        records.append({'id':rid,'investigation':investigation,'source':source,
                        'source_row':r['row'],'physical_lines':[r['line_start'],r['line_end']],
                        'source_identifier':identifier,'values':r['values'],
                        'exact_duplicate_of':duplicate,'validation_status':'structurally_reviewed',
                        'scientific_status':'not_reviewed','gravity_environment':'unknown'})
        if len(r['values']) != len(headers):
            issues.append(issue('ROW_WIDTH',rid,'Column count differs from header',expected=len(headers),actual=len(r['values'])))
        if duplicate: issues.append(issue('EXACT_DUPLICATE',rid,'Retained; experimental identity unresolved',first_occurrence=duplicate))
        for index,value in enumerate(r['values']):
            header = headers[index] if index<len(headers) else None
            status = missingness(value)
            observation = {'record_id':rid,'source':source,'source_row':r['row'],
                           'source_column':index+1,'source_heading':header,'source_value':value,
                           'value_status':status,'uncertainty':None,'uncertainty_status':'not_reported',
                           'scientific_status':'not_reviewed'}
            unit = csv_unit(investigation,header or '')
            # CFI embeds a unit in the pressure value. Composition basis remains unknown.
            pressure_match = re.fullmatch(r'\s*([\d.]+)\s+atm\s*',value) if investigation=='PSI-39' and header=='Pressure' else None
            conversion = convert(pressure_match[1], 'atm') if pressure_match else convert(value,unit)
            observation.update(conversion or {'normalized_value':None,'normalized_unit':None,'original_unit':unit})
            if conversion:
                observation['normalization_status']='unit_conversion_only_not_scientific_approval'
            observations.append(observation)
            if str(index+1) in field_stats:
                stats = field_stats[str(index+1)]
                if status in ('blank','source_dash'): stats[status]+=1
                if status in ('source_annotation','estimated'): stats['annotation']+=1
                if number(value)==0: stats['zero']+=1
                if number(value) is not None and number(value)<0:
                    stats['negative_numeric']+=1
                    issues.append(issue('NEGATIVE_NUMERIC_REVIEW',rid,'Negative value retained; meaning depends on quantity',column=index+1,heading=header,value=value))
    for value, locations in ids.items():
        if len(locations)>1:
            issues.append(issue('REPEATED_SOURCE_IDENTIFIER',locations,'Identifier repetition does not establish duplicate experiments',identifier=value))
    stats = {'investigation':investigation,'source':source,'encoding':encoding,'headers':headers,
             'source_rows':len(records),'exact_duplicate_rows_beyond_first':len(raw)-len(seen),
             'repeated_identifier_groups':sum(len(v)>1 for v in ids.values()),'fields':field_stats,
             'scientific_status':'not_reviewed','provenance_status':'local_file_traced_external_authenticity_pending'}
    return records,observations,issues,stats


def calibration_checks(cells):
    """Independently check ONLY simple x*slope+intercept smoke-point formulas."""
    lookup = {(c['source'],c['sheet'],c['coordinate']):c for c in cells}
    checks = []
    pattern = re.compile(r'^=([A-Z]+\d+)\*Reference!\$([A-Z]+)\$(\d+)\+Reference!\$([A-Z]+)\$(\d+)$')
    for c in cells:
        if c['sheet'] not in (SHEET_A,SHEET_B) or not 5<=c['row']<=59:
            continue
        if not c['coordinate'].startswith('S' if c['sheet']==SHEET_A else 'P'):
            continue
        formula = c.get('formula')
        match = pattern.fullmatch(formula or '')
        if not match:
            checks.append({'source':c['source'],'sheet':c['sheet'],'cell':c['coordinate'],
                           'formula':formula,'status':'unsupported_formula_not_evaluated'})
            continue
        pixel,scol,srow,icol,irow = match.groups()
        refs = [(c['sheet'],pixel),('Reference',scol+srow),('Reference',icol+irow)]
        inputs = [lookup.get((c['source'],s,coord),{}) for s,coord in refs]
        vals = [number(v.get('value')) for v in inputs]
        value = vals[0]*vals[1]+vals[2] if all(v is not None for v in vals) else None
        checks.append({'source':c['source'],'sheet':c['sheet'],'cell':c['coordinate'],
                       'formula':formula,'cached_value':c['value'],'recalculated_value':value,
                       'cached_minus_recalculated':number(c['value'])-value if number(c['value']) is not None and value is not None else None,
                       'inputs':[{'sheet':s,'cell':coord,'value':v.get('value'),'formula':v.get('formula')} for (s,coord),v in zip(refs,inputs)],
                       'status':'arithmetic_checked_calibration_assignment_unapproved'})
    return checks


def flame_links(cells, source, flight, smoke):
    grouped = defaultdict(dict)
    for c in cells:
        if c['source']==source and c['sheet']=='FlameLength':
            grouped[c['row']][c['column']]=c['value']
    records,links=[] ,[]
    for r,v in sorted(grouped.items()):
        if r<4 or number(v.get(1)) is None: continue
        value = number(v.get(2))
        calc = -14.599*value+111.04 if value is not None else None
        rid = row_id(source,'FlameLength',r)
        records.append({'id':rid,'source':source,'sheet':'FlameLength','row':r,
                        'test_point':str(v[1]),'ruler_input':v.get(2),'cached_mm':v.get(3),
                        'recalculated_mm':calc,'formula_evidence':'FlameLength!B1; Calib!D4',
                        'difference_mm':number(v.get(3))-calc if number(v.get(3)) is not None and calc is not None else None,
                        'status':'needs_clarification' if value in (None,0) else 'arithmetic_checked_link_candidate_only'})
        # Day 045 scope is supported by layout.json, not invented from TP alone.
        for b in flight+smoke:
            if equal(b['fields'].get('day'),45,'day') and equal(b['fields'].get('label'),v[1],'label'):
                links.append({'left':rid,'right':b['id'],'kind':'flamelength_day045_tp',
                              'status':'candidate_only','basis':['layout.json Raw Data/Data Images 045/ path','TP label'],
                              'scientific_merge_approved':False,
                              'length_difference_mm':number(v.get(3))-number(b['fields'].get('length_mm')) if number(v.get(3)) is not None and number(b['fields'].get('length_mm')) is not None else None})
    return records,links


def build(output):
    output = Path(output).resolve()
    # Only write under this project's derived-data tree or /tmp for testing.
    allowed = PROCESSED_DIR.resolve()
    if output.is_relative_to(RAW_DIR.resolve()) or output.is_relative_to(REFERENCES_DIR.resolve()):
        raise ValueError('Refusing to write inside dataset/raw or dataset/references')
    if not output.is_relative_to(allowed) and not output.is_relative_to(Path('/tmp')):
        raise ValueError('Output must be inside dataset/processed or /tmp; raw sources and references are protected')
    paths = source_files()
    hashes = {dataset_rel(p):sha256(p) for p in paths}
    issues=[]; statistics=[]; records=[]; observations=[]; csvs={}
    manifest=[]
    for p in paths:
        rel=dataset_rel(p)
        manifest.append({'source':rel,'sha256':hashes[rel],'size_bytes':p.stat().st_size,
                         'source_url':None,'license':None,'external_provenance_status':'pending_review',
                         'extraction_method':'csv.reader' if p.suffix=='.csv' else 'openpyxl formula+cached' if p.suffix=='.xlsx' else 'xlrd+BIFF tokens' if p.suffix=='.xls' else 'verbatim metadata hash'})
    for n,name in CSV_NAMES.items():
        p=raw_dir(f'PSI-{n}')/name
        rr,oo,ii,ss=audit_csv(p,f'PSI-{n}')
        records.extend(rr); observations.extend(oo); issues.extend(ii); statistics.append(ss)
        csvs[n]=rr
    cells=[];sheets=[]
    spice=raw_dir('PSI-107')
    for name in SPICE_WORKBOOKS:
        p=spice/name; rel=dataset_rel(p)
        ss,cc=extract_workbook(p,rel)
        cells.extend(cc);sheets.extend(ss)
    smoke_source=dataset_rel(spice/'SmokePointReview-0g-3.xlsx')
    flight_source=dataset_rel(spice/'Spice Flight Test Data II modified.xls')
    flame_source=dataset_rel(spice/'Spice_Flight_Flamelength.xls')
    a=workbook_records(cells,smoke_source,SHEET_A,SMOKE_A,set(range(5,60)))
    b=workbook_records(cells,smoke_source,SHEET_B,SMOKE_B,set(range(5,60)))
    flight=workbook_records(cells,flight_source,FLIGHT_SHEET,FLIGHT)
    spice_csv=[{'id':r['id'],'source':r['source'],'sheet':None,'row':r['source_row'],
                'fields':{key:r['values'][index] for key,index in CSV.items()}} for r in csvs[107]]
    links=pair_smoke(a,b)
    links+=time_candidates(a+b,flight,'smoke_flight')
    links+=label_candidates(a,flight)
    links+=time_candidates(a+b,spice_csv,'smoke_csv')
    links+=csv_flight_links(spice_csv,flight)
    flames,fl=flame_links(cells,flame_source,flight,a)  # B numbering is different; never equate it to flight TP.
    links+=fl
    calibrations=calibration_checks(cells)
    # Unmatched source records remain first-class curated records.
    for group,kind,side in [(a+b,'smoke_sheet_correspondence','either'),(a+b,'smoke_flight','left'),
                             (a+b,'smoke_csv','left'),(spice_csv,'csv_flight','left'),(flight,'csv_flight','right')]:
        matched={l['left'] for l in links if l['kind']==kind} if side!='right' else {l['right'] for l in links if l['kind']==kind}
        if side=='either': matched|={l['right'] for l in links if l['kind']==kind}
        for r in group:
            if r['id'] not in matched: issues.append(issue('UNMATCHED_RECORD',r['id'],'No candidate under documented match rule',relation=kind))
    for r in a+b+flight+spice_csv:
        f=r['fields']; ignition,off,data=(clock(f.get(k)) for k in ('ignition','off','data'))
        if ignition is not None and off is not None and off<ignition:
            issues.append(issue('TIME_ORDER',r['id'],'Flame-off precedes ignition; no midnight correction assumed'))
        if data is not None and ignition is not None and off is not None and not ignition<=data<=off:
            issues.append(issue('DATA_OUTSIDE_IGNITION_INTERVAL',r['id'],'Data time outside recorded interval; retained'))
        for k in ('ignition','off','data'):
            if f.get(k) not in (None,'') and clock(f.get(k)) is None:
                issues.append(issue('UNPARSED_TIME',r['id'],'Qualitative, ambiguous, or nonstandard time retained',field=k,value=f[k]))
    for link in links:
        if link['kind']=='smoke_sheet_correspondence' and link['differences']:
            issues.append(issue('SMOKE_SHEET_DISAGREEMENT',[link['left'],link['right']],
                                'Neither sheet selected as authoritative',differences=link['differences']))
    # Compare length formula calibration refs explicitly, including equal-valued formulas.
    cindex={(c['sheet'],c['coordinate']):c for c in cells if c['source']==smoke_source}
    byid={r['id']:r for r in a+b}
    formula_comparisons=[]
    for link in [l for l in links if l['kind']=='smoke_sheet_correspondence']:
        left,right=byid[link['left']],byid[link['right']]
        lc=cindex[(left['sheet'],left['field_locations']['length_mm'])]
        rc=cindex[(right['sheet'],right['field_locations']['length_mm'])]
        refs=lambda c:re.findall(r'Reference!\$?([A-Z]+)\$?(\d+)',c.get('formula') or '')
        different=refs(lc)!=refs(rc)
        formula_comparisons.append({'left':left['id'],'right':right['id'],
                                    'left_formula':lc.get('formula'),'right_formula':rc.get('formula'),
                                    'reference_assignment_differs':different})
        if different:
            issues.append(issue('CALIBRATION_REFERENCE_DISAGREEMENT',[left['id'],right['id']],
                                'Preserved both formulas; no authoritative calibration selected',
                                left_formula=lc.get('formula'),right_formula=rc.get('formula')))
    # Previously documented issues remain explicitly sourced as prior findings, not new validation.
    prior=[('PSI-69','FLEX_284_VS_274','NASA-report count of 284 is reported in prior notes; 274 CSV rows; missing tests not reconstructed'),
           ('PSI-69','FLEX_PRESSURE_TEST114','Source zero pressure versus processed blank requires primary-source review'),
           ('PSI-69','FLEX_EXTINCTION_AND_BURN_RATE','Extinction zero/dash meaning and burning-rate unit require review; approximate processed burn times not substituted'),
           ('PSI-39','CFI_DUPLICATE_PROVENANCE','Exact repeated source records retained; meaning unresolved'),
           ('PSI-101','SAMER_66_VS_109','info.md describes 66 flight test points, CSV has 109 rows; suffixes and aging records need run mapping'),
           ('PSI-25','BASS_DISPLAY_AND_ENCODING','UTF-8 BOM retained in header; display settings and missing readings not converted to physical flows'),
           ('PSI-107','SPICE_CALIBRATION_CONTEXT','Day055 mixed J42/F43, Day119 DVD/DVCAM, Day136 calibration errors and Days173/174 assignments require scientific review'),
           ('PSI-107','SPICE_526_VS_SOURCE_ROWS','info.md claims 526 flames; row counts include conditions and media and do not establish run count')]
    for inv,code,detail in prior:
        issues.append(issue(code,inv,detail,evidence_type='local_metadata_or_prior_review_not_independently_validated'))
    for n in CSV_NAMES:
        issues.append(issue('EXTERNAL_PROVENANCE_AND_LICENSE',f'PSI-{n}',
                            'Local hash and location verified; authoritative provenance, redistribution license and human scientific approval pending'))
    # Field dictionary inventories preserve duplicate headings by ordinal positions.
    dictionary=[]
    for stat in statistics:
        for index,h in enumerate(stat['headers'],1):
            dictionary.append({'investigation':stat['investigation'],'source':stat['source'],
                               'sheet':None,'column':index,'source_heading':h,
                               'source_unit':csv_unit(stat['investigation'],h),
                               'canonical_unit':(convert('1',csv_unit(stat['investigation'],h)) or {}).get('normalized_unit'),
                               'mapping_status':'header_unit_only_semantics_pending'})
    for source,sheet,mapping in [(smoke_source,SHEET_A,SMOKE_A),(smoke_source,SHEET_B,SMOKE_B),(flight_source,FLIGHT_SHEET,FLIGHT)]:
        for key,col in mapping.items():
            headers=[c['value'] for c in cells if c['source']==source and c['sheet']==sheet and c['coordinate'] in (f'{col}3',f'{col}4')]
            dictionary.append({'investigation':'PSI-107','source':source,'sheet':sheet,
                               'column_letter':col,'canonical_candidate':key,'header_rows':headers,
                               'mapping_status':'positional_correspondence_semantics_pending'})
    # Bounded checks with exact source locations; no empirical values corrected.
    for r in csvs[69]:
        if r['values'][1]=='193F001':
            issues.append(issue('FLEX_REPEATED_IDENTIFIER',r['id'],'Original FLEX identifier repeated',identifier='193F001'))
        if r['values'][0]=='114':
            issues.append(issue('FLEX_TEST114_SOURCE_PRESSURE',r['id'],'Original pressure retained; discrepancy unresolved',source_value=r['values'][5],unit='mmHg'))
    for r in csvs[39]:
        vals=[number(r['values'][i]) for i in (5,6,7)]
        if all(v is not None for v in vals) and abs(sum(vals)-1)>0.005:
            issues.append(issue('CFI_COMPOSITION_SUM_REVIEW',r['id'],'Oxygen+nitrogen+helium differ from unity; basis and omitted constituents require review',sum=sum(vals)))
    review=apply_review(manifest,records,observations,a+b+flight,cells,issues)
    for i,item in enumerate(issues,1):item['issue_id']=f'P0-QI-{i:05d}'
    for p in paths:
        if sha256(p)!=hashes[dataset_rel(p)]:
            raise RuntimeError(f'Source changed during extraction: {p}')
    output.mkdir(parents=True,exist_ok=True)
    for entry in dictionary:
        if entry.get('investigation')=='PSI-69' and entry.get('source_heading')=='Burning rate; mm':
            entry.update(canonical_unit='mm^2/s',interpreted_unit='mm^2/s',
                mapping_status='primary_report_unit_verified_source_heading_incomplete',
                evidence='NASA/TP-2015-216046 Appendix A.1, Table IX')
    for name,value in review.items():
        dump(output/f'review/{name}.json',value)
    jsonl(output/'source_records.jsonl',records)
    jsonl(output/'observations.jsonl',observations)
    jsonl(output/'spice/workbook_cells.jsonl',cells)
    dump(output/'spice/workbook_inventory.json',sheets)
    jsonl(output/'spice/records.jsonl',a+b+flight)
    jsonl(output/'spice/observations.jsonl',workbook_observations(a+b+flight,cells))
    jsonl(output/'spice/media_references.jsonl',media_references(cells))
    jsonl(output/'spice/flame_length.jsonl',flames)
    jsonl(output/'spice/reconciliation_links.jsonl',links)
    dump(output/'spice/calibration_checks.json',calibrations)
    dump(output/'spice/formula_comparisons.json',formula_comparisons)
    dump(output/'source_manifest.json',manifest)
    for n in CSV_NAMES:
        inv=f'PSI-{n}'
        dump(output/f'audits/{inv}.json', {
            'statistics':next(s for s in statistics if s['investigation']==inv),
            'scope':'bounded local structural/unit/missingness/identifier review; primary-source scientific validation pending',
            'issues':[i for i in issues if mentions(i,inv)]})
        jsonl(output/f'{inv}/curated_records.jsonl',[r for r in records if r['investigation']==inv])
    dump(output/'audit_statistics.json',statistics)
    dump(output/'data_dictionary.json',dictionary)
    jsonl(output/'quality_issues.jsonl',issues)
    summary={'csv_rows':sum(s['source_rows'] for s in statistics),
             'duplicates_retained':sum(s['exact_duplicate_rows_beyond_first'] for s in statistics),
             'smoke_candidates':[len(a),len(b)],'flight_rows_with_numeric_day':len(flight),
             'flame_length_rows':len(flames),'workbook_nonempty_cells':len(cells),
             'links_by_kind':dict(Counter(l['kind'] for l in links)),
             'csv_flight_link_status':dict(Counter(l['status'] for l in links if l['kind']=='csv_flight')),
             'csv_rows_with_value_compatible_flight_candidates':len({l['left'] for l in links if l['kind']=='csv_flight' and l['status']=='value_compatible_candidate'}),
             'smoke_pairs_with_value_differences':sum(bool(l['differences']) for l in links if l['kind']=='smoke_sheet_correspondence'),
             'smoke_length_reference_disagreements':sum(c['reference_assignment_differs'] for c in formula_comparisons),
             'quality_issues_by_code':dict(Counter(i['code'] for i in issues)),
             'source_hashes_unchanged':True,'scientific_approval':'pending_human_review',
             'review_findings_by_status':dict(Counter(f['status'] for f in review['findings'])),
             'official_data_files_byte_verified':review['source_identity_matches'],
             'quality_issues_by_status':dict(Counter(i['status'] for i in issues)),
             'unique_experiment_run_count':None,
             'smoke_records_with_flight_time_candidates':len({l['left'] for l in links if l['kind']=='smoke_flight'}),
             'smoke_records_with_csv_time_candidates':len({l['left'] for l in links if l['kind']=='smoke_csv'}),
             'csv_rows_with_any_flight_time_candidates':len({l['left'] for l in links if l['kind']=='csv_flight'})}
    dump(output/'summary.json',summary)
    code_paths=sorted((REPO_ROOT/'curation').glob('*.py'))
    dump(output/'build_manifest.json',{'pipeline_version':PIPELINE_VERSION,
        'python':platform.python_version(),'dependencies':{p:importlib.metadata.version(p) for p in ['xlrd','openpyxl']},
        'code_hashes':{p.relative_to(REPO_ROOT).as_posix():sha256(p) for p in code_paths},
        'source_hashes':hashes,'review_evidence_hashes':{r['path']:r['sha256'] for r in review['evidence_snapshots']},'generated_at_utc':datetime.now(timezone.utc).isoformat(),
        'output_hashes':{str(p.relative_to(output)):sha256(p) for p in sorted(output.rglob('*')) if p.is_file() and p.name!='build_manifest.json'},
        'command':'python3 -m curation.pipeline','scientific_status':'not_approved'})
    write_report(output,statistics,summary,links,flames)
    with (output/'REPORT.md').open('a',encoding='utf-8') as report:
        report.write('\n## Evidence review supersedes preliminary release-gate statements above\n\n')
        report.write('All eight data files are byte-identical to NASA downloads, and all five investigation catalogs declare CC0-1.0. SAME-R 67/109 counts are explained by the original final report. FLEX mm²/s unit is documented and now normalized separately. Flight-table gravity context is evidence-backed. Calibration/image assignment, contradictory values and human scientific approval remain open. Publication and third-party code rights remain separate. See review/findings.json, review/registry.json, and reports/P0_FINAL_REVIEW.md.\n')
    # Include report in output hashes.
    bm=json.loads((output/'build_manifest.json').read_text())
    bm['output_hashes']['REPORT.md']=sha256(output/'REPORT.md')
    dump(output/'build_manifest.json',bm)
    return summary


def write_report(output,stats,summary,links,flames):
    lines=['# Ember Atlas dataset release p0_v1_review — reproducible source reconciliation', '',
           'Engineering curation and bounded structural audits; NOT scientific validation. All original files retained unchanged.',
           'No source rows removed. Candidate links never establish unique experiment identity or overwrite contradictory measurements.', '',
           '## Five CSV audits', '', '| Investigation | Rows | Exact repeats beyond first | Encoding |', '|---|---:|---:|---|']
    lines += [f"| {s['investigation']} | {s['source_rows']} | {s['exact_duplicate_rows_beyond_first']} | {s['encoding']} |" for s in stats]
    lines += ['', '## Computed reconciliation summary', '', '```json',json.dumps(summary,indent=2),'```','',
              '## Match rules and limits','',
              '- Smoke-sheet correspondence first requires day, ignition, flame-off, data time, fuel and nozzle agreement. A separate fallback requires day, flame-off, fuel, nozzle, fuel display, air display, fan and pixel input agreement. Reciprocal uniqueness is required for supported correspondence. All overlapping fields except source-specific labels are compared; differences stay separate.',
              '- Flight/CSV and smoke/flight candidates require day and ignition agreement. All alternatives and condition differences remain recorded. Strict value compatibility additionally requires fuel, nozzle and four flow fields; CSV mass-flow rounding tolerance is 0.0005 mg/s and air tolerance 0.005 cm/s.',
              '- Full hh:mm:ss and hh.mm.ss formats are parsed under an explicit format rule, with originals retained. Qualitative ignition annotations and short ambiguous values remain unparsed. Original first-sheet labels provide separate day+label+fuel+nozzle flight candidates and do not override clock conflicts. No clock corrections, year inference, midnight rollover, one-to-one assignment, or automatic duplicate removal.',
              '- Flame-length TP candidates are scoped to Day045 using layout.json. Only flight labels and the first smoke sheet original labels are eligible; second-sheet numbering is a different sequence. No measured value is silently substituted.',
              '- Cached formula results are separate from formula text and BIFF tokens. Simple smoke pixel*slope+intercept expressions and the explicitly printed flame-length equation are recalculated. Arithmetic agreement does not approve calibration context.',
              '- Every populated workbook cell is extracted, including reference sheets and historical/test-matrix sections. Blank coordinates within sheet extents remain recoverable as absent cells. Original workbook bytes and hashes remain authoritative for rich formatting, Excel serials, shared formulas, and unsupported formula semantics.',
              '', '## Flame-length arithmetic and candidate coverage','',
              '| Workbook row | TP | Input | Cached mm | Recalculated mm | Status |','|---|---|---|---|---|---|']
    lines += [f"| {f['row']} | {f['test_point']} | {f['ruler_input']} | {f['cached_mm']} | {f['recalculated_mm']} | {f['status']} |" for f in flames]
    lines += ['', '## Unresolved scientific release gates','',
              '- All eight original data files are byte-identical to NASA downloads; the five catalog licenses are CC0-1.0. Code, papers and media rights remain separate; byte identity does not validate measurements.',
              '- Day119 sheet calibration assignments and pixel values disagree. Day055 mixed calibration references and Day136 errors require source-owner/scientist review. No authoritative sheet selected.',
              '- Repeated timestamps can indicate multiple conditions/media. Unique run and operating-condition segmentation remains unresolved; no run counts asserted.',
              '- FLEX CSV274 versus table280 versus introduction284, Test114 source contradiction, repeated ID, approximate burn times and individual extinction zeros require review. Burning-rate mm²/s and general dash meaning are documented.',
              '- CFI repeats are present in the official CSV but not repeated master-sheet IDs. SAME-R final report explains 67 runs and 109 entries including secondary aging. BASS readme defines display conventions and video-date offset; individual missing/negative/disputed readings remain open.',
              '- Official flight-table/master-record sections have documented actual-microgravity context. Historical/comparison/calibration cells are not assigned ISS gravity from filenames.',
              '- This deliverable is suitable for P1 engineering against provisional evidence with quality flags. Scientific publication, validated gap claims, or predictive modeling remain gated by human review.',
              '', 'See quality_issues.jsonl for exact locations, source_manifest.json for hashes, and build_manifest.json for code/tool versions and output hashes.']
    (output/'REPORT.md').write_text('\n'.join(lines)+'\n',encoding='utf-8')


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output',type=Path,default=PROCESSED_DIR)
    args=parser.parse_args()
    print(json.dumps(build(args.output),indent=2))

if __name__=='__main__':main()

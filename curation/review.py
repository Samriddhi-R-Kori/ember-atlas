"""Evidence-backed review overlay. No network, raw corrections, or run invention."""
from collections import Counter, defaultdict
import json
from pathlib import Path
from datetime import date,timedelta
import re
import openpyxl
from .extract import sha256
from .reconcile import clock, normalized, number
from .units import convert

from ember_atlas.paths import NASA_PSI_REFERENCES, dataset_rel, resolve, investigation_of

EVIDENCE=NASA_PSI_REFERENCES
UPSTREAM_LICENSE=NASA_PSI_REFERENCES.parents[1]/'upstream'/'FOTIA_LICENSE'
THESIS_URL='https://drum.lib.umd.edu/items/e1cf9d1d-2c54-475a-a201-a57d3874011b'
FLEX_URL='https://ntrs.nasa.gov/citations/20150023456'


def catalogs(directory=EVIDENCE):
    return {f'PSI-{n}':json.loads((directory/f'psi{n}_catalog.json').read_text()) for n in (107,69,39,101,25)}


def apply_review(manifest, records, observations, workrecords, cells, issues, directory=EVIDENCE):
    """Mutate only derived metadata, returning traceable review artifacts."""
    directory=Path(directory)
    # Official NASA downloads that are byte-identical to a raw input are stored once, in dataset/raw/.
    raw_by_hash={m['sha256']:resolve(m['source']) for m in manifest}
    def official_path(item):
        local=directory/item['file']
        return local if local.exists() or item.get('sha256') not in raw_by_hash else raw_by_hash[item['sha256']]
    data=catalogs(directory)
    official=json.loads((directory/'official_file_manifest.json').read_text())
    # Verify immutable acquisition snapshots before using prior recorded digests.
    for item in official:
        if 'sha256' in item and sha256(official_path(item))!=item['sha256']:
            raise ValueError(f'Official evidence checksum mismatch: {item["file"]}')
    retrieval=json.loads((directory/'retrieval_manifest.json').read_text())
    for item in retrieval:
        if 'sha256' in item and sha256(directory/item['file'])!=item['sha256']:
            raise ValueError(f'Retrieved evidence checksum mismatch: {item["file"]}')
    registry=[]
    for inv,cat in data.items():
        registry.append({'investigation':inv,'doi':cat['doi'],'title':cat['title'],
            'catalog_url':f'https://psi.nasa.gov/physci/repo/data/investigations/{inv}',
            'api_url':f'https://psi.nasa.gov/geode-py/ws/repo/investigations/{inv}',
            'snapshot':dataset_rel(directory/f'psi{inv[4:]}_catalog.json'),
            'snapshot_sha256':sha256(directory/f'psi{inv[4:]}_catalog.json'),
            'catalog_version':cat['version'],'license':cat['licenseIdentifier'],
            'license_url':cat['licenseLink'],'project_type':cat['projectType'],
            'flight_platform':cat['flightProgram'],
            'publications':[{'title':p['title'],'doi':p.get('doi') or None,
                              'authors':p.get('authorList'),'verification_scope':'listed_by_NASA_not_independently_validated_scientific_results'} for p in cat['publications']]})
    matched={}
    for source in manifest:
        inv=investigation_of(source['source'])
        name=Path(source['source']).name
        candidates=[o for o in official if o['investigation']==inv and o['official_file_name'].endswith('_'+name) and 'sha256' in o]
        same=[o for o in candidates if o['sha256']==source['sha256']]
        cat=data[inv]
        source.update(source_url=f'https://psi.nasa.gov/physci/repo/data/investigations/{inv}',
                      investigation_doi=cat['doi'],catalog_license=cat['licenseIdentifier'],
                      catalog_version=cat['version'],catalog_evidence=f'psi{inv[4:]}_catalog.json')
        if same:
            o=same[0];matched[source['source']]=o
            source.update(license=cat['licenseIdentifier'],external_provenance_status='official_download_byte_identical',
                          official_download_url=o['url'],official_file_name=o['official_file_name'],
                          official_file_version=o['file_version'],official_sha256=o['sha256'])
        else:
            source.update(external_provenance_status='catalog_linked_local_metadata_not_byte_verified',
                          license=None,license_scope_note='NASA catalog license does not automatically cover third-party packaging/metadata')
    # Flight-table copies are independently authenticated; classify scope without implying scientific approval.
    for r in records+workrecords:
        if r['source'] in matched:
            inv=r.get('investigation','PSI-107')
            r.update(gravity_environment='actual_microgravity',
                     gravity_evidence={'investigation':inv,'catalog_project_type':data[inv]['projectType'],
                      'scope':'official flight table or ISS master-sheet candidate section; not historical/calibration sheets',
                      'source_byte_verified':True,'review_status':'documented_flight_context_not_measurement_validation'})
    for r in records+workrecords:
        if investigation_of(r['source'])=='PSI-107':
            raw_day=r.get('fields',{}).get('day',r.get('values',[None])[0] if 'values' in r else None)
            day=number(raw_day)
            if day is not None and day.is_integer() and 1<=day<=365:
                r.update(calendar_date=(date(2009,1,1)+timedelta(days=int(day)-1)).isoformat(),
                         calendar_date_evidence='NASA SPICE Image Organization Guide explicitly defines day-of-year in 2009')
    findings=[]
    def finding(code,status,detail,evidence,blocker='none'):
        item={'code':code,'status':status,'detail':detail,'evidence':evidence,'blocker_type':blocker}
        findings.append(item);return item
    finding('NASA_IDENTITY_LICENSE','verified','All five investigation DOIs and CC0-1.0 catalog declarations verified; all eight local data files byte-identical to public NASA downloads.',
            [r['api_url'] for r in registry])
    finding('SAME_COUNT_CONTEXT','resolved_documentary','SAME-R final report flight-operation section describes 67 runs and 109 entries including secondary aging; introductory 66 test points is not a row-count requirement. No suffixes stripped or rows merged.',
            ['official_PSI-101_Reports_SAME-R_Final Report.pdf: flight operation section and Appendix A'])
    finding('FLEX_BURNING_RATE_UNIT','resolved_unit_definition','Appendix A.1 defines diameter-squared/time burning-rate constant; Table IX specifies mm²/s. Source heading retained; numeric normalization uses documented unit.',
            [FLEX_URL+'#Appendix-A.1-and-Table-IX'])
    for o in observations:
        if investigation_of(o['source'])=='PSI-69' and o['source_heading']=='Burning rate; mm':
            conversion=convert(o['source_value'],'mm^2/s')
            o.update(source_heading_unit='mm (incomplete heading)',interpreted_unit='mm^2/s',
                     unit_evidence=FLEX_URL+'; Appendix A.1; Table IX, printed pp19–28')
            if conversion:
                o.update(conversion)
                o['normalization_status']='documented_unit_only_not_scientific_approval'
        if investigation_of(o['source'])=='PSI-69' and o['source_row']==115 and o['source_column']==6:
            o.update(value_status='disputed_source_value',normalization_status='arithmetic_conversion_of_disputed_value_not_accepted_pressure',
                     quality_note='Table IX Test114 gives 0 mmHg; Fig118 caption gives 0.70 atm; no value chosen')
        if investigation_of(o['source'])=='PSI-25' and o['source_column'] in (8,9):
            o['interpretation_evidence']='official_PSI-25_Science Documents_BASS-II_ReadMe.docx: Fan display / Air display'
            o['interpretation_note']='Fan column mixes video voltage×10 and pot settings; air display is cm/s but ~1min response. No blanket conversion.'
    finding('FLEX_PRESSURE','verified_unresolved','Original report contradicts itself: Table IX Test114 is zero mmHg; Table VI and Fig118 describe 0.70 atm. Original zero retained as disputed.',
            [FLEX_URL+'; Table IX printed p23; Table VI; Fig118 printed p142'],'qualified_scientific_review')
    finding('FLEX_COVERAGE','verified_unresolved','CSV ends at 274. Report Table IX contains Tests275–280, but introduction says 284; 281–284 not established. Six publication-only records are inventoried separately, not appended to source CSV.',
            [FLEX_URL+'; Table IX printed pp27–28; introduction'],'source_documentation')
    finding('FLEX_EXTINCTION','resolved_general_definition_individual_values_open','Appendix A.1 defines dash as completion/disruption and explains extrapolated/missing diameters. Explicit zeros remain uninterpreted; no blanket replacement.',
            [FLEX_URL+'; Appendix A.1'],'qualified_scientific_review')
    finding('SPICE_PROTOCOL','resolved_general_interpretation','Final and postflight reports describe fuel-flow adjustment during an ignition and image-specific conditions; repeated clocks with changed conditions are not automatically duplicate experiments. Source groups remain candidates.',
            ['official_PSI-107_Reports_SPICE_FinalReport.pdf: printed pp13–14',
             'official_PSI-107_Reports_SPICE_30-DayPostFlightReport.pdf: Methods'])
    finding('SPICE_COUNTS','verified_unresolved','Final report claims 526 flames and 52 smoke points; workbooks contain 526 flight rows and 55 candidate smoke records per sheet. Postflight report lists 108+155 test points. Different denominators cannot be equated.',
            ['official_PSI-107_Reports_SPICE_FinalReport.pdf: abstract; flight tests',
             'official_PSI-107_Reports_SPICE_30-DayPostFlightReport.pdf: Results'],'source_documentation')
    finding('SPICE_DAY_MEDIA','resolved_documentary','Image Organization Guide explicitly defines GMT day-of-year in 2009 and day+TP+columnAC media naming. It scopes flame-length workbook to Day045 and maps AD Nikon identifiers. This supports media references, not unique runs.',
            ['official_PSI-107_Raw Data_SPICE Image Organization Guide.docx'])
    finding('BASS_DISPLAY_DATE_SENSOR','resolved_general_definition_individual_values_open','NASA ReadMe documents fan voltage×10 versus pot settings, slow air-display response, one-day video-date offset, a/b repeated-sample runs, O2 offset calibration and CO overrange >1000 ppm. Keep original dates/readings; do not apply a global correction.',
            ['official_PSI-25_Science Documents_BASS-II_ReadMe.docx'],'qualified_scientific_review')
    # Cross-check CFI duplicate identifiers against independent master-sheet locations.
    cfi_path=directory/'official_PSI-39_Science Documents_CFI_DataSummary_Spreadsheet_Jan2021.xlsx'
    ws=openpyxl.load_workbook(cfi_path,data_only=True)['Master Sheet']
    cfi_master=defaultdict(list)
    for row in ws:
        if isinstance(row[0].value,(int,float)):
            cfi_master[str(int(row[0].value))].append({'sheet':ws.title,'row':row[0].row,
                'oxygen':row[5].value,'nitrogen':row[6].value,'helium':row[7].value})
    cfi_comparison=[]
    for r in records:
        if r['investigation']=='PSI-39':
            cfi_comparison.append({'csv_record':r['id'],'source_identifier':r['source_identifier'],
                                  'master_sheet_candidates':cfi_master.get(r['source_identifier'],[])})
    finding('CFI_DUPLICATE_ORIGIN','verified_origin_meaning_open','The eight exact repeats are in byte-identical official NASA CSV; master workbook has one row per corresponding test ID. Duplicates are not introduced by local extraction; keep them until reviewed.',
            ['official_PSI-39_Experimental table_CFI.csv','official_PSI-39_Science Documents_CFI_DataSummary_Spreadsheet_Jan2021.xlsx: Master Sheet'],'qualified_scientific_review')
    # Thesis Table6.1 printed p67: coefficients transcribed at published precision.
    # These constrain calibration contexts; they do not identify the source image.
    published=[(45,'DVD',-.2297,119.69,'B23','B24'),
      (48,'DVD',-.2333,121.77,'B42','B43'),(52,'DVD',-.2297,119.69,'F42','F43'),
      (55,'DVD',-.2307,121.23,'J42','J43'),(58,'DVD',-.2258,119.23,'N42','N43'),
      (119,'DVD',-.2239,118.21,'R42','R43'),(136,'DVD',-.2273,118.12,'F60','F61'),
      (167,'DVD',-.2299,119.85,'N60','N61'),(168,'DVD',-.2298,119.77,'R60','R61'),
      (173,'DVD',-.2259,118.07,'B78','B79'),(174,'DVD',-.2300,119.44,'F78','F79'),
      (119,'DVCAM',-.2298,119.42,'K78','K79'),(174,'DVCAM',-.2298,119.42,'K78','K79')]
    lookup={(c['sheet'],c['coordinate']):c for c in cells if c['source'].endswith('SmokePointReview-0g-3.xlsx')}
    calibration_contexts=[]
    for day,method,m,b,mc,bc in published:
        actual_m=lookup[('Reference',mc)]['value'];actual_b=lookup[('Reference',bc)]['value']
        calibration_contexts.append({'day':day,'imaging_method':method,'published_slope':m,'published_intercept':b,
           'workbook_slope_cell':mc,'workbook_intercept_cell':bc,'workbook_slope':actual_m,'workbook_intercept':actual_b,
           'agrees_at_published_precision':abs(actual_m-m)<=0.00005 and abs(actual_b-b)<=0.005,
           'evidence':THESIS_URL+'; Table6.1 printed p67 (PDF page77)',
           'assignment_status':'numeric_context_supported_image_assignment_unapproved'})
    finding('SPICE_CALIBRATION_COEFFICIENTS','verified_context_assignments_open',
       'Thesis Table6.1 independently supports 13 context comparisons. Day119 DVCAM and Day174 DVCAM share rounded coefficients; a Day174-labelled reference is not proof of a wrong numeric calibration. Day119 DVD differs. Day055 mixed intercept and Day136 DVCAM errors remain unresolved.',
       [THESIS_URL+'; Table6.1 printed p67'],'qualified_scientific_review')
    # Attach evidence/status to previous flags rather than deleting their audit history.
    updates={
       'EXTERNAL_PROVENANCE_AND_LICENSE':('resolved_investigation_data_scope','NASA catalog and original dataset bytes verified; source-data CC0 distinct from code and publication rights.'),
       'SAMER_66_VS_109':('resolved_documentary','Final report explicitly distinguishes 66 test points, 67 runs, and 109 entries including secondary aging.'),
       'SPICE_526_VS_SOURCE_ROWS':('verified_discrepancy','Final report confirms 526 flames but 52 smoke points; sheet/CSV rows are separate denominators.'),
       'FLEX_284_VS_274':('verified_discrepancy','Primary report table extends to 280; introduction claims284. CSV274; no invented tests281–284.'),
       'FLEX_EXTINCTION_AND_BURN_RATE':('partially_resolved','Burning-rate unit and general dash semantics verified in primary report; individual extinction zeros and approximate burn times remain open.'),
       'FLEX_PRESSURE_TEST114':('verified_source_contradiction','Report Table IX zero conflicts with TableVI/Fig118 0.70atm.'),
       'CFI_DUPLICATE_PROVENANCE':('partially_resolved','Official CSV repeats verified; master workbook gives single test-ID rows; scientific handling remains open.'),
       'BASS_DISPLAY_AND_ENCODING':('partially_resolved','UTF-8 BOM and official display definitions verified; source values retained. Dates and sensor anomalies require row-level interpretation.')}
    for q in issues:
        if q['code'] in updates:
            q['status'],q['review_resolution']=updates[q['code']]
            q['review_evidence']={'EXTERNAL_PROVENANCE_AND_LICENSE':['NASA_IDENTITY_LICENSE'],
               'SAMER_66_VS_109':['SAME_COUNT_CONTEXT'],'SPICE_526_VS_SOURCE_ROWS':['SPICE_COUNTS'],
               'FLEX_284_VS_274':['FLEX_COVERAGE'],'FLEX_EXTINCTION_AND_BURN_RATE':['FLEX_BURNING_RATE_UNIT','FLEX_EXTINCTION'],'FLEX_PRESSURE_TEST114':['FLEX_PRESSURE'],
               'CFI_DUPLICATE_PROVENANCE':['CFI_DUPLICATE_ORIGIN'],'BASS_DISPLAY_AND_ENCODING':['BASS_DISPLAY_DATE_SENSOR']}[q['code']]
            q['requires_human_review']=q['status'] not in ('resolved_documentary','resolved_investigation_data_scope')
        if q['code']=='CALIBRATION_REFERENCE_DISAGREEMENT':
            q['review_evidence']=['SPICE_CALIBRATION_COEFFICIENTS']
            q['review_resolution']='Day119 DVD and DVCAM contexts independently documented; Day174-labelled coefficient values also match published Day119 DVCAM. Image method/pixel selection unresolved.'
        q.setdefault('blocker_type','qualified_scientific_review' if q['requires_human_review'] else 'none')
    # Scientific audit for oxygen increase: do not copy the unproven third-party purge explanation.
    for r in records:
        if r['investigation']=='PSI-25':
            a,b=(number(r['values'][i]) for i in (11,12))
            if a is not None and b is not None and b>a+0.2:
                issues.append({'code':'BASS_OXYGEN_INCREASE','evidence':r['id'],
                    'detail':'Final O2 exceeds initial by >0.2 percentage points; sensor/source interpretation unresolved. Purge causation not established for this row.',
                    'initial_percent':a,'final_percent':b,'status':'open',
                    'requires_human_review':True,'blocker_type':'qualified_scientific_review'})
    # Source-only candidate groups, not experiment runs or segments.
    groups=defaultdict(list)
    for r in workrecords:
        if r['sheet']=='Data record of Video and Stills' and clock(r['fields'].get('ignition')) is not None:
            groups[(normalized(r['fields']['day']),clock(r['fields']['ignition']))].append(r)
    clusters=[]
    for (day,ignition),rows in sorted(groups.items()):
        conditions={tuple(str(r['fields'].get(k)) for k in ('fuel','nozzle','fuel_display','air_display','fan')) for r in rows}
        clusters.append({'day_source_normalized':day,'ignition_seconds':ignition,
            'records':[r['id'] for r in rows],'distinct_condition_signatures':len(conditions),
            'status':'source_group_not_verified_run','protocol_evidence':'SPICE final report printed pp13–14'})
    # Upstream packaging of the raw NASA files (the Fotia project, MIT). No Fotia application code is included.
    license_inventory=[{'directory':'dataset/upstream','license_files':[{'path':dataset_rel(UPSTREAM_LICENSE),'sha256':sha256(UPSTREAM_LICENSE)}] if UPSTREAM_LICENSE.exists() else [],
        'code_license':'MIT','code_reuse':'upstream packaging of NASA PSI files only; copyright and permission notice retained',
        'data_license':'separate_from_code; eight reviewed NASA originals CC0-1.0',
        'redistribution_approval':'not_requested_not_published'}]
    publication_rights=[]
    for prefix in ('flex','bass','same'):
        meta=json.loads((directory/f'{prefix}_ntrs.json').read_text())
        publication_rights.append({'evidence':f'{prefix}_ntrs.json','distribution':meta.get('distribution'),
                                  'copyright_determination':meta.get('copyright',{}).get('determinationType'),
                                  'blanket_cc0_inferred':False})
    publication_only_flex=[{'source':FLEX_URL,'source_table':'IX',
        'test_identifier':f'FLEX-{n:03d}','printed_page':27 if n==275 else 28,
        'status':'verified_table_presence_not_ingested_as_CSV_row'} for n in range(275,281)]
    snapshots=[{'path':dataset_rel(p),'sha256':sha256(p),'bytes':p.stat().st_size}
               for p in sorted(directory.iterdir()) if p.is_file()]
    return {'registry':registry,'findings':findings,'source_condition_groups':clusters,
            'publication_only_flex_records':publication_only_flex,'cfi_master_comparison':cfi_comparison,'third_party_licenses':license_inventory,
            'calibration_contexts':calibration_contexts,'publication_rights':publication_rights,'evidence_snapshots':snapshots,
            'source_identity_matches':len(matched)}

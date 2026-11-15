"""Explicit field mappings and conservative evidence links; never merge runs."""
import math
import re
from collections import defaultdict
from decimal import Decimal

SMOKE_A = {'day':'A','ignition':'B','off':'C','data':'D','label':'E','recipe':'F',
           'fuel':'G','nozzle':'H','pressure':'I','fuel_display':'M',
           'air_display':'N','fan':'O','radiometer':'P','gain':'Q',
           'pixel_length':'R','length_mm':'S','fuel_sccm':'Z',
           'fuel_mg_s':'AB','hc_mg_s':'AC','air_cm_s':'AD'}
SMOKE_B = {'day':'A','ignition':'B','off':'C','data':'D','label':'F',
           'fuel':'G','nozzle':'H','pressure':'I','fuel_display':'J',
           'air_display':'K','fan':'L','radiometer':'M','gain':'N',
           'pixel_length':'O','length_mm':'P','fuel_sccm':'T',
           'fuel_mg_s':'V','hc_mg_s':'W','air_cm_s':'X'}
FLIGHT = {'day':'A','ignition':'C','off':'D','data':'E','label':'H',
          'fuel':'I','nozzle':'J','pressure':'K','fuel_display':'L',
          'air_display':'M','fan':'N','radiometer':'O','gain':'P',
          'length_mm':'Q','fuel_sccm':'R','fuel_mg_s':'S','hc_mg_s':'T','air_cm_s':'U'}
CSV = {'day':0,'ignition':1,'off':2,'fuel':3,'nozzle':4,
       'fuel_sccm':5,'fuel_mg_s':6,'hc_mg_s':7,'air_cm_s':8}
SHEET_A = 'Smoke Point Datasheet'
SHEET_B = 'Smoke Point Datasheet (2)'
FLIGHT_SHEET = 'Data record of Video and Stills'


def number(v):
    try:
        n = float(v)
        return n if math.isfinite(n) else None
    except (TypeError, ValueError):
        return None


def normalized(v):
    n = number(v)
    return str(n) if n is not None else ' '.join(str(v).split()).casefold() if v is not None else None


def clock(v):
    """Explicit hh:mm:ss / hh.mm.ss or Excel fractions; no rollover/day inference."""
    if isinstance(v, (int, float)) and 0 <= v < 1:
        return round(v * 86400) % 86400
    if isinstance(v, str) and re.fullmatch(r'\d{1,2}[:.]\d{2}[:.]\d{2}', v.strip()):
        h, m, s = map(float, re.split(r'[:.]', v.strip()))
        if h < 24 and m < 60 and s < 60:
            return round(h*3600+m*60+s)
    return None


def equal(a, b, field):
    if a is None or b is None or a == '' or b == '':
        return False
    if field in ('ignition','off','data'):
        if clock(a) is not None and clock(b) is not None:
            return clock(a) == clock(b)
        return isinstance(a,str) and isinstance(b,str) and normalized(a)==normalized(b)
    na, nb = number(a), number(b)
    if na is not None and nb is not None:
        return math.isclose(na, nb, rel_tol=1e-10, abs_tol=1e-9)
    return normalized(a) == normalized(b)


def row_id(source, sheet, row):
    return f'{source}::{sheet or "CSV"}::{row}'


def workbook_records(cells, source, sheet, mapping, rows=None):
    grouped = defaultdict(dict)
    refs = defaultdict(dict)
    for c in cells:
        if c['source'] == source and c['sheet'] == sheet:
            letter = re.sub(r'\d+', '', c['coordinate'])
            grouped[c['row']][letter] = c['value']
            refs[c['row']][letter] = c['coordinate']
    result = []
    for r, values in sorted(grouped.items()):
        if rows is not None and r not in rows:
            continue
        fields = {key: values.get(col) for key, col in mapping.items()}
        if rows is None and (r < 5 or number(fields.get('day')) is None):
            continue
        result.append({'id':row_id(source,sheet,r),'source':source,'sheet':sheet,'row':r,
                       'fields':fields,'field_locations':{key:f'{col}{r}' for key,col in mapping.items()},
                       'status':'needs_clarification','gravity_environment':'unknown'})
    return result


def pair_smoke(left, right):
    links = []
    identity = ('day','ignition','off','data','fuel','nozzle')
    comparable = sorted((set(SMOKE_A) & set(SMOKE_B)) - {'label'})
    for a in left:
        candidates = [b for b in right if all(equal(a['fields'][k],b['fields'][k],k) for k in identity)]
        basis = identity
        if not candidates:
            # Independent condition signature allows correspondence with a time discrepancy.
            basis = ('day','off','fuel','nozzle','fuel_display','air_display','fan','pixel_length')
            candidates = [b for b in right if all(equal(a['fields'][k],b['fields'][k],k) for k in basis)]
        reverse_count = lambda b: sum(all(equal(x['fields'][k],b['fields'][k],k) for k in basis) for x in left)
        for b in candidates:
            differences = []
            for field in comparable:
                av,bv = a['fields'][field],b['fields'][field]
                if av in (None,'') and bv in (None,''):
                    continue
                if not equal(av,bv,field):
                    differences.append({'field':field,'left':av,'right':bv,
                                        'left_cell':a['field_locations'][field],
                                        'right_cell':b['field_locations'][field]})
            links.append({'left':a['id'],'right':b['id'],'kind':'smoke_sheet_correspondence',
                          'status':'supported_record_correspondence' if len(candidates)==1 and reverse_count(b)==1 else 'ambiguous_candidate',
                          'basis':list(basis),'differences':differences,
                          'scientific_merge_approved':False})
    return links


def time_candidates(left, right, kind):
    """Keep all day+ignition candidates and explicitly compare changing conditions."""
    links = []
    for a in left:
        if number(a['fields'].get('day')) is None or clock(a['fields'].get('ignition')) is None:
            continue
        candidates = [b for b in right if equal(a['fields'].get('day'),b['fields'].get('day'),'day')
                      and equal(a['fields'].get('ignition'),b['fields'].get('ignition'),'ignition')]
        for b in candidates:
            agreements, differences = [], []
            for field in sorted(set(a['fields']) & set(b['fields']) - {'label','recipe'}):
                av,bv = a['fields'][field],b['fields'][field]
                if av in (None,'') or bv in (None,''):
                    continue
                if equal(av,bv,field):
                    agreements.append(field)
                else:
                    differences.append({'field':field,'left':av,'right':bv})
            links.append({'left':a['id'],'right':b['id'],'kind':kind,
                          'status':'candidate_only','basis':['day','ignition'],
                          'agreements':agreements,'differences':differences,
                          'candidate_count':len(candidates),'scientific_merge_approved':False})
    return links


def csv_flight_links(csv_records, flight):
    links = time_candidates(csv_records, flight, 'csv_flight')
    lookup = {r['id']:r for r in csv_records+flight}
    for link in links:
        a,b = lookup[link['left']]['fields'],lookup[link['right']]['fields']
        compatible = []
        conflicts = []
        for key in ('day','ignition','off','fuel','nozzle','fuel_sccm','fuel_mg_s','hc_mg_s','air_cm_s'):
            av,bv = a.get(key),b.get(key)
            if av in (None,'') or bv in (None,''):
                continue
            ok = equal(av,bv,key)
            if key in ('fuel_mg_s','hc_mg_s','air_cm_s') and number(av) is not None and number(bv) is not None:
                quantum = Decimal('0.01') if key == 'air_cm_s' else Decimal('0.001')
                ok = abs(Decimal(str(av))-Decimal(str(bv))) <= quantum/2 + Decimal('1e-10')
            (compatible if ok else conflicts).append(key)
        link['rounding_compatible_fields'] = compatible
        link['conflicting_fields'] = conflicts
        link['status'] = 'value_compatible_candidate' if not conflicts and all(k in compatible for k in ('day','ignition','fuel','nozzle','fuel_sccm','fuel_mg_s','hc_mg_s','air_cm_s')) else 'conflicting_or_incomplete_candidate'
    return links


def label_candidates(smoke, flight):
    """Original first-sheet labels only; these links expose conflicting clocks."""
    links=[]
    for a in smoke:
        for b in flight:
            if all(equal(a['fields'].get(k),b['fields'].get(k),k) for k in ('day','label','fuel','nozzle')):
                differences=[{'field':k,'left':a['fields'][k],'right':b['fields'][k]}
                             for k in sorted(set(a['fields'])&set(b['fields']))
                             if a['fields'][k] not in (None,'') and b['fields'][k] not in (None,'')
                             and not equal(a['fields'][k],b['fields'][k],k)]
                links.append({'left':a['id'],'right':b['id'],'kind':'smoke_flight_original_label',
                              'status':'candidate_only','basis':['day','original_label','fuel','nozzle'],
                              'differences':differences,'scientific_merge_approved':False})
    return links

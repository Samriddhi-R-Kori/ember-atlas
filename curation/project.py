"""Project positional mappings into provisional observations, not inferred runs."""
from .extract import missingness
from .units import convert
from openpyxl.utils import column_index_from_string

UNITS={'nozzle':'mm','pressure':'Pa','length_mm':'mm',
       'fuel_sccm':'sccm','fuel_mg_s':'mg/s','hc_mg_s':'mg/s','air_cm_s':'cm/s'}


def workbook_observations(records,cells):
    lookup={(c['source'],c['sheet'],c['coordinate']):c for c in cells}
    observations=[]
    for r in records:
        for field,coord in r['field_locations'].items():
            c=lookup.get((r['source'],r['sheet'],coord))
            value=c['value'] if c else None
            conversion=convert(value,UNITS.get(field))
            observations.append({'record_id':r['id'],'source':r['source'],'sheet':r['sheet'],
                'source_row':r['row'],'coordinate':coord,'source_column':c['column'] if c else column_index_from_string(coord.rstrip('0123456789')),
                'field':field,'source_value':value,'value_status':missingness(value),
                'formula':c.get('formula') if c else None,
                'formula_tokens_hex':c.get('formula_tokens_hex') if c else None,
                'uncertainty':None,'uncertainty_status':'not_reported',
                'scientific_status':'not_reviewed',
                'normalization_status':'cached_derived_calibration_unapproved' if c and c.get('formula') else 'unit_conversion_only_not_scientific_approval',
                **(conversion or {'normalized_value':None,'normalized_unit':None,'original_unit':UNITS.get(field)})})
    return observations


def media_references(cells):
    result=[]
    for c in cells:
        if c['sheet']!='Data record of Video and Stills' or c['row']<5 or c['column'] not in (30,31):
            continue
        if not isinstance(c['value'],str):continue
        for i,token in enumerate(c['value'].splitlines(),1):
            if not token.strip():continue
            result.append({'source':c['source'],'sheet':c['sheet'],'coordinate':c['coordinate'],
                'row':c['row'],'column':c['column'],'token_index':i,'reference':token,
                'original_cell_value':c['value'],'resolved_uri':None,
                'status':'source_media_reference_asset_not_retrieved'})
    return result

"""Deterministic comparison and indexed coverage. No scientific inference or LLM."""
from collections import defaultdict
from decimal import Decimal,InvalidOperation
from itertools import product
import re

DISCLAIMER='Provisional indexed source records, not unique experimental runs. Missing indexed evidence does not prove an experiment has never occurred.'
ALIASES={
 'Fuel Rate (sccm)':'fuel_sccm','Fuel Rate (mg/s)':'fuel_mg_s',
 'HC Fuel Rate (mg/s)':'hc_mg_s','Air Rate (cm/s)':'air_cm_s','Nozzle (mm)':'nozzle',
 'Ambient pressure; mmHg':'ambient_pressure','Pressure':'ambient_pressure','pressure':'ambient_pressure',
}


def numeric(value):
    try:
        number=Decimal(str(value))
        return number if number.is_finite() else None
    except (InvalidOperation,ValueError,TypeError):return None


def usable(observation):
    status=observation.get('normalization_status') or ''
    return (observation.get('value_status') not in ('disputed_source_value','blank','source_dash','source_annotation')
            and 'not_accepted' not in status and numeric(observation.get('normalized_value')) is not None
            and bool(observation.get('normalized_unit')))


def method_key(detail,observation):
    """Same-source-column comparability is provisional; do not infer cross-source methods."""
    formula=observation.get('formula')
    context=(detail['investigation_id'],detail['source_path'],detail.get('sheet'),observation.get('parameter_id'))
    if not formula:return (*context,'same_source_column_provisional')
    if 'SHARED FMLA' in formula or 'shared fmla' in formula.lower():
        return (*context,'unresolved_shared_formula',detail['id'])
    relative_normalized=re.sub(r'(?<![\w!$])([A-Z]{1,3})\d+\b',r'\1#',formula)
    day=detail.get('raw_record',{}).get('fields',{}).get('day')
    return (*context,'formula',str(day),relative_normalized)


def compare_details(details):
    groups={}
    for detail in details:
        for observation in detail['observations']:
            name=observation['heading']
            alias=ALIASES.get(name,name)
            # Explicit aliases connect known fields only within an investigation;
            # pressure candidates can expose cross-investigation method incompatibility.
            key=('pressure',alias) if alias=='ambient_pressure' else (detail['investigation_id'],alias)
            group=groups.setdefault(key,{'id':'::'.join(key),'heading':alias,'values':{},'points':[]})
            value={**observation,'record_id':detail['id'],'source_path':detail['source_path'],
                   'source_sha256':detail['source_sha256'],'source_url':detail['source_url'],
                   'sheet':detail.get('sheet'),'source_row':observation['row'],
                   'scientific_status':detail['scientific_status'],
                   'quality_codes':detail['quality_codes'],'method_signature':list(method_key(detail,observation))}
            value['plot_eligible']=usable(observation)
            value['exclusion_reason']=(None if value['plot_eligible'] else observation.get('value_status') if observation.get('value_status') not in (None,'observed','derived') else 'no_supported_numeric_value_or_unit')
            # Repeated headings must not overwrite a separate source-column quantity.
            if detail['id'] in group['values']:
                key=(*key,observation['parameter_id'])
                group=groups.setdefault(key,{'id':'::'.join(key),'heading':name,'values':{},'points':[]})
            group['values'][detail['id']]=value
    for group in groups.values():
        values=list(group['values'].values());eligible=[v for v in values if v['plot_eligible']]
        units={v['normalized_unit'] for v in eligible}
        methods={tuple(v['method_signature']) for v in eligible}
        group['unit']=next(iter(units)) if len(units)==1 else None
        group['missing_record_ids']=[d['id'] for d in details if d['id'] not in group['values']]
        if len(units)>1:status='incompatible_units'
        elif len(methods)>1:status='incompatible_methods'
        elif len(eligible)<2:status='insufficient_comparable_values'
        else:status='compatible_provisional'
        group['status']=status
        group['method_note']='Same source column/context only; method equivalence and calibration accuracy are not scientifically approved.'
        if status=='compatible_provisional':
            group['points']=[{**v,'value':float(v['normalized_value']),
                'label':f"{index+1}. {d['investigation_id']} / {d.get('identifier') or 'row '+str(d['row'])}",
                'unit':v['normalized_unit'],'uncertainty_status':v['uncertainty_status']}
                for index,d in enumerate(details) for v in eligible if v['record_id']==d['id']]
        group['excluded_count']=len(details)-len(eligible)
    return {'records':[{k:d[k] for k in ('id','identifier','investigation_id','source_path','source_sha256','source_url','row','sheet','scientific_status','quality_codes','duplicate_of')} for d in details],
            'groups':list(groups.values()),'notice':DISCLAIMER,
            'warnings':['All values are provisional; missing values are never imputed.',
                        'Exact repeats remain separate source records, not independent experiments.',
                        'Equal units do not establish equal physical quantities or measurement methods.',
                        'Uncertainty is not reported unless explicitly supplied by the source.']}


def metadata_state(observation,kind):
    value=observation.get('original_value')
    if value is None or str(value).strip().casefold() in ('','-','–','—','n/a','na','none','unknown','?'):
        return 'missing',None
    if observation.get('value_status')=='disputed_source_value' or 'not_accepted' in (observation.get('normalization_status') or ''):
        return 'unusable',None
    if kind=='numeric':
        return ('observed',numeric(observation['normalized_value'])) if usable(observation) else ('unusable',None)
    return 'observed',str(value).strip()


def axis_definition(field,observations,bins):
    kind=field['kind']
    values=[value for observation in observations for state,value in [metadata_state(observation,kind)] if state=='observed']
    if not values:return {**field,'levels':[],'min':None,'max':None},lambda value:None
    if kind=='categorical':
        levels=sorted(set(values),key=lambda x:(x.casefold(),x))
        if len(levels)>20:raise ValueError('Categorical field has more than20 levels; choose a lower-cardinality coverage parameter')
        variants=defaultdict(list)
        for label in levels:variants[re.sub(r'\s+','',label).casefold()].append(label)
        warnings=[labels for labels in variants.values() if len(labels)>1]
        return {**field,'levels':levels,'min':None,'max':None,'label_variant_groups':warnings},lambda value:levels.index(value)
    units={o.get('normalized_unit') for o in observations if metadata_state(o,kind)[0]=='observed'}
    if len(units)!=1:raise ValueError('Coverage axis has incompatible normalized units')
    low,high=min(values),max(values);distinct=sorted(set(values))
    text=lambda number:format(number.normalize(),'f')
    if len(distinct)<=8:
        levels=[text(v) for v in distinct]
        return {**field,'unit':next(iter(units)),'levels':levels,'min':text(low),'max':text(high),'binning':'exact_observed_values'},lambda value:distinct.index(value)
    width=(high-low)/Decimal(bins)
    levels=[f'{text(low+width*i)} to {text(low+width*(i+1))}'+(' (inclusive)' if i==bins-1 else ' (upper exclusive)') for i in range(bins)]
    return {**field,'unit':next(iter(units)),'levels':levels,'min':text(low),'max':text(high),'binning':'equal_width_within_observed_range'},lambda value:min(bins-1,int((value-low)/width))


def coverage_grid(records,xfield,yfield,observations,bins=4,sparse_below=3):
    """Unknown metadata is unassigned, never counted as an unobserved combination."""
    ids=[r['id'] for r in records]
    xs={o['record_id']:o for o in observations if o['parameter_id']==xfield['id']}
    ys={o['record_id']:o for o in observations if o['parameter_id']==yfield['id']}
    x,xbucket=axis_definition(xfield,list(xs.values()),bins)
    y,ybucket=axis_definition(yfield,list(ys.values()),bins)
    if len(x['levels'])*len(y['levels'])>256:raise ValueError('Coverage grid exceeds256 cells; use fewer bins or lower-cardinality fields')
    buckets=defaultdict(list);missing=[];unusable=[];missing_x=missing_y=0
    blank={'original_value':None,'value_status':'blank'}
    for rid in ids:
        sx,vx=metadata_state(xs.get(rid,blank),xfield['kind']);sy,vy=metadata_state(ys.get(rid,blank),yfield['kind'])
        missing_x+=sx=='missing';missing_y+=sy=='missing'
        if 'missing' in (sx,sy):missing.append(rid)
        elif 'unusable' in (sx,sy):unusable.append(rid)
        else:buckets[(xbucket(vx),ybucket(vy))].append(rid)
    cells=[]
    for xi,yi in product(range(len(x['levels'])),range(len(y['levels']))):
        refs=buckets[(xi,yi)];count=len(refs)
        cells.append({'x':xi,'y':yi,'count':count,'status':'unobserved_in_complete_index' if count==0 else 'sparse' if count<sparse_below else 'observed',
                      'record_ids':refs[:10],'sample_truncated':len(refs)>10,
                      'absence_uncertain_due_to_metadata':count==0 and bool(missing or unusable)})
    return {'x':x,'y':y,'cells':cells,'total_records':len(ids),'complete_records':sum(len(v) for v in buckets.values()),
        'missing_metadata_records':len(missing),'unusable_metadata_records':len(unusable),
        'missing_by_field':{xfield['id']:missing_x,yfield['id']:missing_y},
        'missing_record_ids':missing[:10],'unusable_record_ids':unusable[:10],
        'duplicate_rows_retained':sum(bool(r.get('duplicate_of')) for r in records),
        'sparse_below':sparse_below,'bins':bins,'notice':DISCLAIMER,
        'method':'Cartesian grid of observed categories/exact numeric values (≤8 distinct), otherwise equal-width bins within observed ranges. Counts retain exact repeats; no feasibility or novelty claim.'}

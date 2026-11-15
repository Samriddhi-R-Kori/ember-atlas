"""Synthetic fixtures test algorithms; none become project scientific evidence."""
import pytest
from app.research import compare_details,coverage_grid


def detail(rid,value='1',unit='Pa',formula=None):
    return {'id':rid,'identifier':rid,'investigation_id':'PSI-107','source_path':'fixture.csv',
        'source_sha256':'a'*64,'source_url':'https://example.invalid/test-fixture','row':2,'sheet':None,
        'scientific_status':'not_reviewed','quality_codes':[],'duplicate_of':None,
        'raw_record':{'fields':{'day':55}},'observations':[{'parameter_id':'p','heading':'pressure',
        'row':2,'column':1,'normalized_value':value,'original_value':value,'normalized_unit':unit,
        'value_status':'blank' if value is None else 'observed','formula':formula,'uncertainty_status':'not_reported'}]}


def test_comparison_blocks_unit_mismatch():
    group=compare_details([detail('A',unit='Pa'),detail('B',unit='K')])['groups'][0]
    assert group['status']=='incompatible_units' and group['points']==[]


def test_comparison_detects_calibration_method_mismatch():
    a=detail('A',formula='=R5*Reference!$J$42+Reference!$F$43')
    b=detail('B',formula='=R6*Reference!$J$42+Reference!$J$43')
    assert compare_details([a,b])['groups'][0]['status']=='incompatible_methods'
    b['observations'][0]['formula']='=R6*Reference!$J$42+Reference!$F$43'
    group=compare_details([a,b])['groups'][0]
    assert group['status']=='compatible_provisional' and len(group['points'])==2


def test_comparison_preserves_zero_and_missing_without_imputation():
    group=compare_details([detail('A','0'),detail('B',None)])['groups'][0]
    assert group['values']['A']['plot_eligible'] is True
    assert group['values']['B']['original_value'] is None
    assert group['status']=='insufficient_comparable_values' and group['points']==[]


def test_same_unit_different_quantities_do_not_merge():
    a,b=detail('A',unit='mm'),detail('B',unit='mm')
    a['observations'][0]['heading']='Droplet initial diameter; mm'
    b['observations'][0]['heading']='Visible flame extinction diameter; mm'
    groups=compare_details([a,b])['groups']
    assert len(groups)==2
    assert all(g['status']=='insufficient_comparable_values' for g in groups)


def test_shared_formula_context_not_approved_by_placeholder():
    a,b=detail('A',formula='SHARED FMLA at rowx=4 colx=2'),detail('B',formula='SHARED FMLA at rowx=4 colx=2')
    assert compare_details([a,b])['groups'][0]['status']=='incompatible_methods'


def obs(rid,field,raw,numeric=False,status='observed'):
    return {'record_id':rid,'parameter_id':field,'original_value':raw,
        'normalized_value':raw if numeric else None,'normalized_unit':'mm' if numeric else None,
        'value_status':status,'normalization_status':''}


def test_coverage_separates_missing_unusable_and_unobserved():
    records=[{'id':r,'duplicate_of':'A' if r=='B' else None} for r in ['A','B','C','D']]
    x={'id':'x','heading':'Fuel','kind':'categorical'};y={'id':'y','heading':'Nozzle','kind':'numeric'}
    rows=[obs('A','x','Fuel1'),obs('A','y','0',True),obs('B','x','Fuel2'),obs('B','y','2',True),
          obs('C','x',None),obs('C','y','2',True),obs('D','x','Fuel1'),obs('D','y','~2',True,'estimated')]
    result=coverage_grid(records,x,y,rows)
    assert result['total_records']==4 and result['complete_records']==2
    assert result['missing_metadata_records']==1 and result['unusable_metadata_records']==1
    assert sum(c['count'] for c in result['cells'])==2
    assert sum(c['count']==0 for c in result['cells'])==2
    assert all(c['absence_uncertain_due_to_metadata'] for c in result['cells'] if c['count']==0)
    assert result['duplicate_rows_retained']==1 and coverage_grid(records,x,y,rows)==result


def test_equal_width_bins_include_high_endpoint():
    records=[{'id':str(i)} for i in range(10)]
    rows=[o for i in range(10) for o in [obs(str(i),'x',str(i),True),obs(str(i),'y','Fuel')]]
    result=coverage_grid(records,{'id':'x','heading':'flow','kind':'numeric'},{'id':'y','heading':'fuel','kind':'categorical'},rows,bins=2)
    assert [c['count'] for c in result['cells']]==[5,5]
    assert result['x']['min']=='0' and result['x']['max']=='9'
    assert result['missing_metadata_records']==0


def test_unknown_metadata_does_not_create_fake_domain():
    result=coverage_grid([{'id':'A'}],{'id':'x','heading':'X','kind':'numeric'},
                         {'id':'y','heading':'Y','kind':'categorical'},[])
    assert result['cells']==[] and result['complete_records']==0 and result['missing_metadata_records']==1


def test_category_label_variants_warn_without_silent_merging():
    records=[{'id':'A'},{'id':'B'}]
    rows=[obs('A','x','75 % Propylene'),obs('B','x','75% Propylene'),obs('A','y','1',True),obs('B','y','1',True)]
    result=coverage_grid(records,{'id':'x','heading':'Fuel','kind':'categorical'},
                         {'id':'y','heading':'Nozzle','kind':'numeric'},rows)
    assert len(result['x']['levels'])==2
    assert len(result['x']['label_variant_groups'])==1
    assert sum(c['count'] for c in result['cells'])==2

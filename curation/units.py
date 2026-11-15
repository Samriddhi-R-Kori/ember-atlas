"""Explicit, reversible numeric conversions; no interpretation or imputation."""
from decimal import Decimal, InvalidOperation
import re

# Canonical choices retain the project's combustion-friendly mm and mg units.
CONVERSIONS = {
    'mm': ('mm', '1'), 'cm': ('mm', '10'), 'm': ('mm', '1000'),
    's': ('s', '1'), 'sec': ('s', '1'), 'ms': ('s', '0.001'),
    'Pa': ('Pa', '1'), 'atm': ('Pa', '101325'),
    'mmHg': ('Pa', '133.322387415'),
    'mg/s': ('mg/s', '1'), 'sccm': ('sccm', '1'),
    'cm/s': ('m/s', '0.01'), 'm/s': ('m/s', '1'),
    'mole_fraction': ('mol/mol', '1'), 'vol_percent': ('volume_fraction', '0.01'),
    'ppm_unspecified': ('ppm_unspecified', '1'),
    'K': ('K', '1'), 'mm^2/s': ('mm^2/s', '1'), 'dimensionless': ('1', '1')}


def convert(raw, unit):
    if unit not in CONVERSIONS or isinstance(raw, bool):
        return None
    text = str(raw).strip()
    if not re.fullmatch(r'[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?', text):
        return None
    try:
        value = Decimal(text)
    except InvalidOperation:
        return None
    target, factor = CONVERSIONS[unit]
    if not value.is_finite():
        return None
    return {'normalized_value': str(value * Decimal(factor)),
            'normalized_unit': target, 'conversion_factor': factor,
            'conversion_rule': f'value * {factor}', 'original_unit': unit}


def csv_unit(dataset, header):
    """Only source-header-supported units. The FLEX burning-rate heading is blocked."""
    if dataset == 'PSI-69':
        if header == 'Burning rate; mm':
            return None
        if '; mmHg' in header: return 'mmHg'
        if '; mole fraction' in header: return 'mole_fraction'
        if '; mm' in header: return 'mm'
        if '; s' in header: return 's'
    if dataset in ('PSI-107','PSI-101'):
        for token, unit in [('(cm/s)','cm/s'),('(mg/s)','mg/s'),('(sccm)','sccm'),('(mm)','mm'),('(sec)','s')]:
            if token in header: return unit
        if header == 'Rt/R0': return 'dimensionless'
    if dataset == 'PSI-25':
        if '% by vol' in header: return 'vol_percent'
        if '(ppm)' in header: return 'ppm_unspecified'
    return None

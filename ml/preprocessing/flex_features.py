"""FLEX records -> numeric features and burning-rate target. No imputation; exclusions are counted."""


def flex_burning_rate_rows(spine: dict):
    """Return (rows, exclusions) for the FLEX burning-rate target without imputation."""
    rows, exclusions = [], {}
    def exclude(reason):
        exclusions[reason] = exclusions.get(reason, 0) + 1
    for r in spine['records']:
        if r['inv'] != 'PSI-69' or r['role'] != 'condition_source':
            continue
        if r['dup']:
            exclude('exact_repeat_of_earlier_row'); continue
        target = r['m'].get('burning_rate', {})
        if target.get('s') != 'reported':
            exclude('target_not_reported'); continue
        if target.get('vs') != 'observed':
            exclude('target_not_plain_observed'); continue
        c, x = r['c'], r['x']
        needed = {'oxygen': c['oxygen'], 'pressure': c['pressure'], 'he_fraction': x.get('he_fraction', {}),
                  'co2_fraction': x.get('co2_fraction', {}), 'initial_diameter_mm': x.get('initial_diameter_mm', {})}
        missing = [k for k, v in needed.items() if v.get('s') != 'reported']
        if missing:
            exclude('input_not_usable:' + ','.join(sorted(missing))); continue
        fuel = c['material'].get('label')
        if fuel not in ('Methanol', 'Heptane'):
            exclude('unknown_fuel'); continue
        features = {
            'fuel_heptane': 1.0 if fuel == 'Heptane' else 0.0,
            'oxygen': needed['oxygen']['v'], 'pressure_kpa': needed['pressure']['v'] / 1000.0,
            'he_fraction': needed['he_fraction']['v'], 'co2_fraction': needed['co2_fraction']['v'],
            'initial_diameter_mm': needed['initial_diameter_mm']['v'],
        }
        # Condition signature uses reported precision: identical prepared conditions form one group.
        signature = (fuel, needed['oxygen']['o'], needed['he_fraction']['o'], needed['co2_fraction']['o'],
                     round(needed['pressure']['v'] / 1000.0, 0))
        rows.append({'record_id': r['id'], 'row': r['row'], 'ident': r['ident'], 'fuel': fuel,
                     'features': features, 'target': target['v'], 'group': '|'.join(map(str, signature)),
                     'flags': r['flags']})
    return rows, exclusions

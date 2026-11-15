// Central scientific unit display. Normalized units come from the spine; display conversion
// only rescales (Pa→kPa, fraction→%) and never adds precision beyond the reported value.
export function displayValue(value: number | undefined | null, unit: string | null | undefined): string {
  if (value === undefined || value === null || !Number.isFinite(value)) return 'Not reported'
  switch (unit) {
    case 'Pa': return `${trim(value / 1000, 4)} kPa`
    case 'mol/mol': return `${trim(value * 100, 4)} % O₂ (mole)`
    case 'volume_fraction': return `${trim(value * 100, 4)} % (vol)`
    case 'm/s': return `${trim(value, 3)} m/s`
    case 'mm^2/s': return `${trim(value, 3)} mm²/s`
    case 'g': return `${trim(value, 3)} g`
    default: return `${trim(value, 4)}${unit ? ' ' + unit : ''}`
  }
}
export function trim(v: number, sig = 4) { return Number(v.toPrecision(sig)).toString() }
export const unitLabel = (unit: string | null | undefined) => ({ 'mm^2/s': 'mm²/s', Pa: 'kPa', 'mol/mol': '% O₂', volume_fraction: '% vol' } as Record<string, string>)[unit ?? ''] ?? unit ?? ''
export const axisScale = (unit: string | null | undefined) => unit === 'Pa' ? 1 / 1000 : unit === 'mol/mol' || unit === 'volume_fraction' ? 100 : 1
export const human = (s: string) => s.replaceAll('_', ' ')
export const shortPath = (p: string) => p.split('/').slice(-1)[0]

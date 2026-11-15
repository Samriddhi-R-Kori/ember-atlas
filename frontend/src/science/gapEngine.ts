// Deterministic condition matching and gap classification, shared by every page.
// Rules mirror spine.tolerance_rule and spine.gravity_rule. There is exactly one matching mode —
// strict equality within reported precision — and nothing here is tuned for display.
import type { Dim, NumericDim, SpineRecord, Spine, ValueEntry } from '../types/spine'

export type QueryDim = { enabled: boolean; value: number; h: number }
export type Query = {
  gravity: QueryDim; oxygen: QueryDim; pressure: QueryDim; flow: QueryDim
  material: { cls: string | null; label: string | null }
}
export type DimState = 'matched' | 'mismatched' | 'not_reported' | 'restricted' | 'unconstrained'
export type DimResult = { state: DimState; recordValue?: number; recordOriginal?: string; delta?: number; why?: string; tolerance?: number }
export type RecordMatch = { record: SpineRecord; dims: Record<Dim, DimResult>; mismatched: number; blocked: number; relDistance: number }

export const NUMERIC_DIMS: NumericDim[] = ['oxygen', 'pressure', 'flow']
export const DIMS: Dim[] = ['gravity', 'oxygen', 'pressure', 'flow', 'material']
export const COMPATIBLE_UNITS: Record<NumericDim, string[]> = {
  // Volume fraction and mole fraction are equal for ideal-gas mixtures (documented in the contract).
  oxygen: ['mol/mol', 'volume_fraction'], pressure: ['Pa'], flow: ['m/s'],
}
export const DIM_LABEL: Record<Dim, string> = { gravity: 'Gravity', oxygen: 'Ambient O₂', pressure: 'Pressure', flow: 'Airflow', material: 'Material' }

export function matchNumeric(entry: ValueEntry, q: QueryDim, dim: NumericDim): DimResult {
  if (!q.enabled) return { state: 'unconstrained' }
  if (entry.s === 'not_reported') return { state: 'not_reported', why: entry.why || 'Not reported by source' }
  if (entry.s === 'restricted') return { state: 'restricted', recordOriginal: entry.o, why: entry.why || 'Restricted value' }
  if (entry.v === undefined || !entry.u || !COMPATIBLE_UNITS[dim].includes(entry.u))
    return { state: 'restricted', recordOriginal: entry.o, why: `Unit ${entry.u ?? 'unknown'} not compatible with ${dim} matching` }
  // Strict rule: |v − q| ≤ h_v + h_q (half the last reported decimal of each value). No widening.
  const tolerance = (entry.h ?? 0) + q.h
  const delta = entry.v - q.value
  // Relative epsilon so binary floating point cannot flip an exact boundary.
  const matched = Math.abs(delta) <= tolerance * (1 + 1e-9) + 1e-12
  return { state: matched ? 'matched' : 'mismatched', recordValue: entry.v, recordOriginal: entry.o, delta, tolerance }
}

export function matchRecord(record: SpineRecord, query: Query): RecordMatch {
  const dims = {} as Record<Dim, DimResult>
  const g = record.c.gravity
  if (!query.gravity.enabled) dims.gravity = { state: 'unconstrained' }
  else if (g.s !== 'reported') dims.gravity = { state: 'not_reported', why: g.why || 'No flight-context classification' }
  else dims.gravity = query.gravity.value === 0
    ? { state: 'matched', recordOriginal: 'orbital microgravity' }
    : { state: 'mismatched', recordOriginal: 'orbital microgravity', delta: query.gravity.value,
        why: 'Record is orbital microgravity; no partial-gravity or 1 g evidence is indexed' }
  for (const dim of NUMERIC_DIMS) dims[dim] = matchNumeric(record.c[dim], query[dim], dim)
  const m = record.c.material
  if (!query.material.cls && !query.material.label) dims.material = { state: 'unconstrained' }
  else if (m.s !== 'reported') dims.material = { state: 'not_reported', why: 'Material not reported' }
  else {
    const ok = (!query.material.cls || m.cls === query.material.cls) && (!query.material.label || m.label === query.material.label)
    dims.material = { state: ok ? 'matched' : 'mismatched', recordOriginal: m.label }
  }
  const states = Object.values(dims).map(d => d.state)
  const mismatched = states.filter(s => s === 'mismatched').length
  const blocked = states.filter(s => s === 'not_reported' || s === 'restricted').length
  let relDistance = 0
  for (const dim of NUMERIC_DIMS) {
    const d = dims[dim]
    if (d.state === 'mismatched' && d.delta !== undefined) relDistance += Math.abs(d.delta) / Math.max(Math.abs(query[dim].value), 1e-9)
  }
  if (dims.gravity.state === 'mismatched') relDistance += 1
  if (dims.material.state === 'mismatched') relDistance += 0.5
  return { record, dims, mismatched, blocked, relDistance }
}

export type Coverage = 'covered' | 'sparse' | 'coverage_gap'
export type EvidenceQuality = 'usable_provisional' | 'evidence_quality_gap' | 'no_related_records'
export type InvestigationResult = {
  inv: string; total: number; eligible: number; eligibleUnique: number; blocked: number
  dimCounts: Record<Dim, Record<DimState, number>>; bestMatchedDims: number; enabledDims: number
}
export type Analysis = {
  query: Query; eligible: RecordMatch[]; blocked: RecordMatch[]; considered: number
  eligibleEvidenceCount: number; sourceRecordCount: number; verifiedExperimentCount: null
  coverage: Coverage; evidenceQuality: EvidenceQuality; byInvestigation: Record<string, InvestigationResult>
  nearest: RecordMatch[]; matchedDims: Dim[]; mismatchedDims: Dim[]; notReportedDims: Dim[]; restrictions: string[]
  rule: string
}

export const SPARSE_BELOW = 3

export function enabledDims(query: Query): Dim[] {
  const out: Dim[] = []
  if (query.gravity.enabled) out.push('gravity')
  for (const d of NUMERIC_DIMS) if (query[d].enabled) out.push(d)
  if (query.material.cls || query.material.label) out.push('material')
  return out
}

export const RULE_TEXT = 'Qualifying = every enabled dimension matched within reported precision (no mismatched, not-reported or restricted dimension). '
  + 'Coverage: ≥3 qualifying unique records = covered, 1–2 = sparse, 0 = coverage gap. '
  + 'Evidence-quality gap: related records exist but missing/restricted metadata or open review issues prevent a reliable conclusion.'

export function analyze(records: SpineRecord[], query: Query, sparseBelow = SPARSE_BELOW): Analysis {
  const conditionRecords = records.filter(r => r.role === 'condition_source')
  const matches = conditionRecords.map(r => matchRecord(r, query))
  const eligible = matches.filter(m => m.mismatched === 0 && m.blocked === 0)
  const blocked = matches.filter(m => m.mismatched === 0 && m.blocked > 0)
  const unique = eligible.filter(m => !m.record.dup)
  const coverage: Coverage = unique.length >= sparseBelow ? 'covered' : unique.length > 0 ? 'sparse' : 'coverage_gap'
  const evidenceQuality: EvidenceQuality = eligible.length > 0 ? 'usable_provisional' : blocked.length > 0 ? 'evidence_quality_gap' : 'no_related_records'
  const byInvestigation: Record<string, InvestigationResult> = {}
  const enabled = enabledDims(query)
  for (const m of matches) {
    const inv = byInvestigation[m.record.inv] ??= {
      inv: m.record.inv, total: 0, eligible: 0, eligibleUnique: 0, blocked: 0,
      dimCounts: Object.fromEntries(DIMS.map(d => [d, { matched: 0, mismatched: 0, not_reported: 0, restricted: 0, unconstrained: 0 }])) as InvestigationResult['dimCounts'],
      bestMatchedDims: 0, enabledDims: enabled.length,
    }
    inv.total++
    for (const d of DIMS) inv.dimCounts[d][m.dims[d].state]++
    const matchedCount = enabled.filter(d => m.dims[d].state === 'matched').length
    inv.bestMatchedDims = Math.max(inv.bestMatchedDims, matchedCount)
    if (m.mismatched === 0 && m.blocked === 0) { inv.eligible++; if (!m.record.dup) inv.eligibleUnique++ }
    else if (m.mismatched === 0) inv.blocked++
  }
  const notEligible = matches.filter(m => m.mismatched > 0 || m.blocked > 0)
  const nearest = [...notEligible].sort((a, b) => a.mismatched + a.blocked - (b.mismatched + b.blocked) || a.mismatched - b.mismatched
    || a.relDistance - b.relDistance || a.record.id.localeCompare(b.record.id))
  // Nearest evidence: at most one record per (investigation, literal material) so the list stays informative.
  const seen = new Set<string>(); const nearestDistinct: RecordMatch[] = []
  for (const m of nearest) { const k = `${m.record.inv}|${m.record.c.material.label}`; if (seen.has(k)) continue; seen.add(k); nearestDistinct.push(m); if (nearestDistinct.length >= 5) break }
  const any = (state: DimState) => enabled.filter(d => matches.some(m => m.dims[d].state === state))
  const restrictions = [...new Set(matches.flatMap(m => DIMS.filter(d => m.dims[d].state === 'restricted').map(d => `${m.record.inv} ${DIM_LABEL[d]}: ${m.dims[d].why}`)))]
  return {
    query, eligible, blocked, considered: conditionRecords.length, eligibleEvidenceCount: unique.length, sourceRecordCount: eligible.length, verifiedExperimentCount: null,
    coverage, evidenceQuality, byInvestigation, nearest: nearestDistinct,
    matchedDims: any('matched'), mismatchedDims: enabled.filter(d => matches.every(m => m.dims[d].state !== 'matched')),
    notReportedDims: any('not_reported'), restrictions, rule: RULE_TEXT,
  }
}

export function queryFromScenario(spine: Spine, scenarioId: string, base?: Partial<Query>): Query {
  const s = spine.scenarios.find(x => x.id === scenarioId)!
  const c = s.conditions
  return {
    gravity: { enabled: true, value: c.gravity.value, h: c.gravity.half_precision },
    oxygen: { enabled: true, value: c.oxygen.value, h: c.oxygen.half_precision },
    pressure: { enabled: true, value: c.pressure.value, h: c.pressure.half_precision },
    flow: base?.flow ?? { enabled: false, value: 0, h: 0.005 },
    material: base?.material ?? { cls: null, label: null },
  }
}

// "Use measured conditions": the query becomes exactly the record's reported conditions. Query precision equals
// the record's own reported precision. Dimensions the record does not report (or that are restricted) are left
// unconstrained and listed, so the UI can say why they are not part of the match.
export function queryFromRecord(record: SpineRecord): { query: Query; unconstrained: { dim: Dim; why: string }[] } {
  const unconstrained: { dim: Dim; why: string }[] = []
  const q = {} as Query
  q.gravity = record.c.gravity.s === 'reported' ? { enabled: true, value: 0, h: 0 } : { enabled: false, value: 0, h: 0 }
  if (record.c.gravity.s !== 'reported') unconstrained.push({ dim: 'gravity', why: record.c.gravity.why ?? 'Not classified' })
  for (const d of NUMERIC_DIMS) {
    const e = record.c[d]
    if (e.s === 'reported' && e.v !== undefined && e.u && COMPATIBLE_UNITS[d].includes(e.u)) q[d] = { enabled: true, value: e.v, h: e.h ?? 0 }
    else { q[d] = { enabled: false, value: d === 'oxygen' ? 0.21 : d === 'pressure' ? 101325 : 0, h: 0 }; unconstrained.push({ dim: d, why: e.why ?? (e.s === 'restricted' ? 'Restricted value' : 'Not reported by source') }) }
  }
  q.material = record.c.material.s === 'reported' ? { cls: record.c.material.cls ?? null, label: record.c.material.label ?? null } : { cls: null, label: null }
  return { query: q, unconstrained }
}

// ------------------------------------------------------------------ explanations
export type ExclusionReason = { inv: string; reason: string; dim: Dim | null; count: number }

// Every non-qualifying record is counted once under its first failing dimension (mismatch before missing).
export function exclusionSummary(a: Analysis, records: SpineRecord[]): ExclusionReason[] {
  const out = new Map<string, ExclusionReason>()
  const enabled = enabledDims(a.query)
  for (const r of records.filter(x => x.role === 'condition_source')) {
    const m = matchRecord(r, a.query)
    if (m.mismatched === 0 && m.blocked === 0) continue
    const dim = enabled.find(d => m.dims[d].state === 'mismatched') ?? enabled.find(d => m.dims[d].state === 'not_reported') ?? enabled.find(d => m.dims[d].state === 'restricted') ?? null
    const st = dim ? m.dims[dim].state : 'mismatched'
    const reason = dim ? `${DIM_LABEL[dim]} ${st === 'mismatched' ? 'differs from the request' : st === 'not_reported' ? 'not reported' : 'restricted (unit/method/calibration)'}` : 'No match'
    const key = `${r.inv}|${reason}`
    const e = out.get(key) ?? { inv: r.inv, reason, dim, count: 0 }
    e.count++; out.set(key, e)
  }
  return [...out.values()].sort((x, y) => y.count - x.count)
}

export type QualityReason = { code: string; label: string; count: number; detail: string }
export type QualityAssessment = { severity: 'blocking' | 'limiting' | 'none'; reasons: QualityReason[] }

// Evidence quality: why related records cannot (blocking) or can only provisionally (limiting) support a conclusion.
export function qualityAssessment(a: Analysis): QualityAssessment {
  const reasons: QualityReason[] = []
  const missing = a.blocked.filter(m => Object.values(m.dims).some(d => d.state === 'not_reported'))
  const restricted = a.blocked.filter(m => Object.values(m.dims).some(d => d.state === 'restricted'))
  if (missing.length) reasons.push({ code: 'missing_metadata', label: 'Missing metadata', count: missing.length,
    detail: `${missing.length} related records do not report a requested condition (${[...new Set(missing.flatMap(m => Object.entries(m.dims).filter(([, d]) => d.state === 'not_reported').map(([k]) => DIM_LABEL[k as Dim])))].join(', ')}).` })
  if (restricted.length) reasons.push({ code: 'measurement_incompatibility', label: 'Restricted or incompatible values', count: restricted.length,
    detail: `${restricted.length} related records carry a value whose unit, basis, method or calibration is unresolved.` })
  const pool = a.eligible.length ? a.eligible : a.blocked
  if (pool.length) {
    const unreviewed = pool.filter(m => m.record.status !== 'approved').length
    if (unreviewed) reasons.push({ code: 'unreviewed', label: 'Unreviewed evidence', count: unreviewed, detail: `${unreviewed} records have no qualified scientific review.` })
    reasons.push({ code: 'identity', label: 'Uncertain experiment identity', count: pool.length, detail: 'Rows are not yet linked to individual experiment runs; repeated rows may describe the same event.' })
    const noUnc = pool.filter(m => !Object.values(m.record.m).some(v => v.unc)).length
    if (noUnc) reasons.push({ code: 'uncertainty', label: 'No reported uncertainty', count: noUnc, detail: `${noUnc} records report no measurement uncertainty.` })
    const flagCounts = new Map<string, number>()
    for (const m of pool) for (const f of m.record.flags) flagCounts.set(f, (flagCounts.get(f) ?? 0) + 1)
    const calib = [...flagCounts].filter(([f]) => /CALIBRATION/.test(f)).reduce((s, [, n]) => Math.max(s, n), 0)
    if (calib) reasons.push({ code: 'calibration', label: 'Calibration concerns', count: calib, detail: 'Open calibration-context issues apply to these records.' })
    const disputed = [...flagCounts].filter(([f]) => !/CALIBRATION/.test(f))
    if (disputed.length) reasons.push({ code: 'reconciliation', label: 'Open source discrepancies', count: Math.max(...disputed.map(([, n]) => n)),
      detail: `Open quality issues: ${disputed.map(([f, n]) => `${f.replaceAll('_', ' ').toLowerCase()} (${n})`).join('; ')}.` })
  }
  const severity = a.eligible.length === 0 && a.blocked.length > 0 ? 'blocking' : a.eligible.length > 0 ? 'limiting' : 'none'
  return { severity, reasons }
}

export function fmtDim(dim: Dim, q: Query): string {
  if (dim === 'material') return q.material.label?.replaceAll('"', '') ?? q.material.cls?.replaceAll('_', ' ') ?? 'any'
  const v = q[dim].value
  return dim === 'pressure' ? `${+(v / 1000).toFixed(1)} kPa` : dim === 'oxygen' ? `${+(v * 100).toFixed(1)}% O₂` : dim === 'flow' ? `${+v.toFixed(3)} m/s` : `${+v.toFixed(3)} g`
}

// Deterministic, review-required suggestion of the measurement that would address a gap.
export function suggestExperiment(a: Analysis, coverageGap: boolean): string {
  const q = a.query; const enabled = enabledDims(q)
  const target = enabled.map(d => fmtDim(d, q)).join(', ')
  if (coverageGap && a.mismatchedDims.includes('gravity') && q.gravity.value > 0)
    return `A partial-gravity burn at ${target} (e.g. a lunar-surface or long-duration reduced-gravity platform; FM2 is planned but has no results). Orbital records cannot fill this gap.`
  if (coverageGap && a.mismatchedDims.length)
    return `A test that combines ${target}; no indexed record reaches ${a.mismatchedDims.map(d => DIM_LABEL[d]).join(' and ')} at the requested value.`
  if (a.blocked.length && !a.eligible.length) {
    const invs = [...new Set(a.blocked.map(m => m.record.inv))]
    return `Recover or report the missing/restricted conditions for ${invs.join(', ')} records (source logs, calibration review), or measure them in a new test at ${target}.`
  }
  if (a.eligible.length) return `Qualified review of the ${a.eligibleEvidenceCount} qualifying records, with reported uncertainty and verified run identities, would turn provisional coverage into reviewed evidence.`
  return `A first measurement at ${target}.`
}

export const COVERAGE_LABEL: Record<Coverage, string> = { covered: 'Covered', sparse: 'Sparse coverage', coverage_gap: 'Coverage gap' }
export const QUALITY_LABEL: Record<EvidenceQuality, string> = {
  usable_provisional: 'Usable · provisional', evidence_quality_gap: 'Evidence-quality gap', no_related_records: 'No related records',
}

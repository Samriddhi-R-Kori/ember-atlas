// Fire-safety advisory: deterministic, source-backed, three states. It never returns a "safe" verdict:
// absence of matching evidence yields "insufficient evidence", not safety.
import type { FireSafetyRule, Spine } from '../types/spine'
import { analyze, queryFromScenario, type Query } from './gapEngine'

export type AdvisoryLevel = 'hazard' | 'evidence' | 'insufficient'
export type Advisory = {
  level: AdvisoryLevel; headline: string; summary: string
  rules: FireSafetyRule[]; matching: number
  po2Kpa: number | null   // calculated: total pressure × O2 fraction (not a measurement)
  notes: string[]
}

// A condition referring to an unconstrained (disabled) control cannot be confirmed, so the rule does not fire.
export function ruleApplies(rule: FireSafetyRule, q: Query): boolean {
  const w = rule.when
  const val = (d: 'gravity' | 'oxygen' | 'flow' | 'pressure') => (q[d].enabled ? q[d].value : null)
  const g = val('gravity'), o = val('oxygen'), f = val('flow'), p = val('pressure')
  const need = (v: number | null, lo?: number, hi?: number) => (lo === undefined && hi === undefined) || (v !== null && (lo === undefined || v >= lo - 1e-9) && (hi === undefined || v <= hi + 1e-9))
  if (!need(g, w.gravity_min, w.gravity_max)) return false
  if (!need(o, w.oxygen_min, w.oxygen_max)) return false
  if (!need(f, w.flow_min, w.flow_max)) return false
  if (!need(p === null ? null : p / 1000, w.pressure_min_kpa, w.pressure_max_kpa)) return false
  if (w.material_classes && !(q.material.cls && w.material_classes.includes(q.material.cls))) return false
  return true
}

export function advise(spine: Spine, q: Query): Advisory {
  const rules = (spine.fire_safety_rules ?? []).filter(r => ruleApplies(r, q))
  const a = analyze(spine.records, q)
  const po2Kpa = q.oxygen.enabled && q.pressure.enabled ? q.pressure.value / 1000 * q.oxygen.value : null
  const notes: string[] = []
  if (q.gravity.enabled && q.gravity.value > 0.02 && q.gravity.value < 0.9) notes.push('No direct lunar-surface measurements yet (FM2 planned).')
  if (rules.length) return { level: 'hazard', headline: 'Fire hazard indicated', summary: 'Published tests show flames can be sustained under conditions like these. Avoid ignition sources.', rules, matching: a.eligibleEvidenceCount, po2Kpa, notes }
  if (a.eligibleEvidenceCount > 0) return { level: 'evidence', headline: 'Evidence available', summary: `${a.eligibleEvidenceCount} measured test${a.eligibleEvidenceCount > 1 ? 's' : ''} burned under these conditions. Do not assume ignition is safe.`, rules, matching: a.eligibleEvidenceCount, po2Kpa, notes }
  return { level: 'insufficient', headline: 'Insufficient evidence', summary: 'Insufficient evidence to assess ignition safety. Avoid relying on this scenario as safe.', rules, matching: 0, po2Kpa, notes }
}

// ---------------------------------------------------------------------------------------------------------------
// Fire Safety Insights: a deterministic, source-linked interpretation of the selected scenario.
// Every insight carries its evidence kind so measured NASA data, published statements, calculations and
// established physical relationships stay distinguishable. Nothing here predicts an outcome or certifies safety.
export type InsightKind = 'measured' | 'published' | 'calculated' | 'relationship' | 'gap'
export type InsightTopic = 'oxygen' | 'persistence' | 'convection' | 'fuel' | 'smoke' | 'spread' | 'habitat'
export type Insight = { id: string; topic: InsightTopic; kind: InsightKind; text: string; ref?: string; locator?: string; inv?: string }
export const TOPIC_LABEL: Record<InsightTopic, string> = {
  oxygen: 'Oxygen availability', persistence: 'Flame persistence & extinction', convection: 'Gravity-driven convection',
  fuel: 'Fuel & material behaviour', smoke: 'Smoke, soot & aerosol', spread: 'Ignition & flame spread', habitat: 'Enclosed cabin & habitat',
}
export const KIND_LABEL: Record<InsightKind, string> = {
  measured: 'Measured', published: 'Published finding', calculated: 'Calculated', relationship: 'Physical relationship', gap: 'Evidence gap',
}

export type Snapshot = { gravity: number | null; oxygen: number | null; pressureKpa: number | null; flow: number | null
  materialCls: string | null; materialLabel: string | null; po2Kpa: number | null; buoyancyRatio: number | null }
export function snapshot(q: Query): Snapshot {
  const g = q.gravity.enabled ? q.gravity.value : null, o = q.oxygen.enabled ? q.oxygen.value : null
  const p = q.pressure.enabled ? q.pressure.value / 1000 : null
  return { gravity: g, oxygen: o, pressureKpa: p, flow: q.flow.enabled ? q.flow.value : null, materialCls: q.material.cls,
    materialLabel: q.material.label, po2Kpa: o !== null && p !== null ? p * o : null, buoyancyRatio: g === null ? null : Math.sqrt(Math.max(0, g)) }
}

const pct = (x: number) => `${+(x * 100).toFixed(1)}%`
const kpa = (x: number) => `${+x.toFixed(2)} kPa`
// BASS-II Table 2.1 (bass_tm PDF p.36): measured opposed-flow extinction velocity of thin PMMA at 1 atm.
const BASS_EXTINCTION = [{ o2: 0.21, v: 10, pm: 5 }, { o2: 0.16, v: 30, pm: 5 }]

export function buildInsights(spine: Spine, q: Query): Insight[] {
  const s = snapshot(q); const out: Insight[] = []
  const add = (i: Insight) => out.push(i)
  const finding = (inv: string, page: number, includes: string) => (spine.source_findings ?? []).find(f => f.inv === inv && f.pdf_page === page && f.statement.includes(includes))
  const fromFinding = (id: string, topic: InsightTopic, inv: string, page: number, includes: string) => {
    const f = finding(inv, page, includes); if (f) add({ id, topic, kind: 'published', text: f.statement, ref: f.ref, locator: `PDF p.${f.pdf_page}`, inv })
  }
  const flameEv = (rule: string, page: number | null) => (spine.flame_evidence ?? []).find(f => f.rule === rule && f.pdf_page === page)
  const pg = (id: string) => (spine.partial_gravity_evidence ?? []).find(e => e.id === id)
  const micro = s.gravity !== null && s.gravity <= 0.02, partial = s.gravity !== null && s.gravity > 0.02 && s.gravity < 0.9
  const earth = s.gravity !== null && s.gravity >= 0.9
  const cls = s.materialCls
  const iss = spine.scenarios.find(x => x.id === 'iss_cabin')
  const issPo2 = iss ? iss.conditions.pressure.value / 1000 * iss.conditions.oxygen.value : null

  // Oxygen availability
  if (s.po2Kpa !== null && s.oxygen !== null && s.pressureKpa !== null) {
    add({ id: 'po2', topic: 'oxygen', kind: 'calculated', text: `Oxygen partial pressure is ${kpa(s.po2Kpa)} (${kpa(s.pressureKpa)} × ${pct(s.oxygen)} O₂)${issPo2 ? `, ${Math.round(s.po2Kpa / issPo2 * 100)}% of the ISS-air reference (${kpa(issPo2)})` : ''}.` })
    if (issPo2 && ((s.oxygen > 0.215 && s.po2Kpa < issPo2) || (s.oxygen < 0.205 && s.po2Kpa > issPo2)))
      add({ id: 'po2-vs-fraction', topic: 'oxygen', kind: 'relationship', text: s.oxygen > 0.215
        ? `The O₂ fraction is above air, yet the partial pressure is below ISS air because total pressure is lower. Fraction and partial pressure are different measures of oxygen availability.`
        : `The O₂ fraction is below air, yet the partial pressure exceeds ISS air because total pressure is higher. Fraction and partial pressure are different measures of oxygen availability.` })
  } else add({ id: 'po2-missing', topic: 'oxygen', kind: 'gap', text: 'Oxygen partial pressure cannot be calculated until both O₂ and total pressure are set.' })
  if (s.oxygen !== null) {
    const o = s.oxygen
    const covering = spine.investigations.filter(i => { const r = i.condition_ranges.oxygen; return r.min !== null && o >= r.min - 0.005 && o <= r.max! + 0.005 && !(i.id in (spine.primary_selector_excluded ?? {})) })
    add(covering.length
      ? { id: 'o2-coverage', topic: 'oxygen', kind: 'measured', text: `Indexed NASA tests span this O₂ level: ${covering.map(i => `${i.short} (${pct(i.condition_ranges.oxygen.min!)}–${pct(i.condition_ranges.oxygen.max!)})`).join(', ')}.` }
      : { id: 'o2-coverage', topic: 'oxygen', kind: 'gap', text: `No indexed NASA investigation reports ambient O₂ at ${pct(o)}.` })
    if (micro && o < 0.25 && (s.flow === null || s.flow <= 0.005)) add({ id: 'acme-25', topic: 'oxygen', kind: 'published', ref: 'acme_2021', locator: 'slide 4',
      text: 'ACME burner tests reported that low-momentum microgravity flames self-extinguished below about 25% O₂. That limit belongs to that burner and is not a general flammability limit.' })
  }
  if (cls === 'liquid_droplet') fromFinding('flex-loi', 'oxygen', 'PSI-69', 8, 'limiting oxygen index')

  // Flame persistence & extinction
  if (micro && s.flow !== null && (cls === 'solid_material' || cls === null) && s.oxygen !== null && s.oxygen >= 0.15 && s.oxygen <= 0.23) {
    const ref = s.oxygen >= 0.185 ? BASS_EXTINCTION[0] : BASS_EXTINCTION[1]; const mm = s.flow * 1000
    const where = mm > ref.v + ref.pm ? 'above' : mm < ref.v - ref.pm ? 'below' : 'within'
    add({ id: 'bass-ext', topic: 'persistence', kind: 'measured', ref: 'bass_tm', locator: 'PDF p.36, Table 2.1', inv: 'PSI-25',
      text: `Airflow of ${+mm.toFixed(1)} mm/s is ${where} the measured extinction velocity for thin PMMA at ${Math.round(ref.o2 * 100)}% O₂ (${ref.v} ± ${ref.pm} mm/s, BASS-II).` })
  }
  if (micro && (s.flow === null || s.flow <= 0.02) && cls !== 'liquid_droplet' && cls !== 'smoke_source_material') fromFinding('bass-blue', 'persistence', 'PSI-25', 21, 'radiative extinction')
  if (micro && s.flow === null) add({ id: 'flow-unset', topic: 'persistence', kind: 'relationship', text: 'Without buoyancy, ventilation flow largely decides how much oxygen reaches the flame. Set an airflow value to compare it with measured extinction limits.' })
  if (cls === 'liquid_droplet') {
    const fe = flameEv('gravity_symmetry', 8)
    if (fe) add({ id: 'flex-sym', topic: 'persistence', kind: 'published', ref: fe.ref, locator: `PDF p.${fe.pdf_page}`, inv: 'PSI-69', text: fe.statement })
  }

  // Gravity-driven convection
  if (micro) {
    const fe = flameEv('gravity_symmetry', 11)
    if (fe) add({ id: 'flex-negligible', topic: 'convection', kind: 'published', ref: fe.ref, locator: `PDF p.${fe.pdf_page}`, inv: 'PSI-69', text: fe.statement })
    add({ id: 'no-buoyancy', topic: 'convection', kind: 'relationship', text: `With no buoyant rise, hot products stay around the flame. Oxygen arrives by diffusion${s.flow ? ` and the ${+s.flow.toFixed(3)} m/s forced flow` : ' alone unless a ventilation flow is present'}.` })
  } else if (partial && s.buoyancyRatio !== null) {
    add({ id: 'sqrt-g', topic: 'convection', kind: 'calculated', text: `Buoyant velocity scales roughly with √(g·L). At ${+s.gravity!.toFixed(3)} g, that is about ${s.buoyancyRatio.toFixed(2)}× the 1 g value for a flame of the same size.` })
    const gr = pg('gollner-review'); if (gr) add({ id: 'gollner', topic: 'convection', kind: 'published', ref: gr.ref, locator: gr.locator, text: gr.statement })
  } else if (earth) {
    const fi = (spine.fire_safety_insights ?? []).find(f => f.id === 'FSI-GRAVITY')
    if (fi?.ref) add({ id: 'one-g', topic: 'convection', kind: 'published', ref: fi.ref, locator: `PDF p.${fi.pdf_page}`, text: fi.statement })
    if (cls === 'solid_material') { const b = (spine.fire_safety_insights ?? []).find(f => f.id === 'FSI-1G-BLOWOFF'); if (b?.ref) add({ id: 'blowoff', topic: 'convection', kind: 'published', ref: b.ref, locator: `PDF p.${b.pdf_page}`, text: b.statement }) }
  } else if (s.gravity === null) add({ id: 'g-unset', topic: 'convection', kind: 'gap', text: 'Gravity is not specified, so buoyancy cannot be assessed.' })

  // Fuel & material behaviour
  const a = analyze(spine.records, q)
  if (cls === 'liquid_droplet') {
    const rates = a.eligible.filter(m => m.record.m.burning_rate?.s === 'reported' && !m.record.dup).map(m => m.record.m.burning_rate.v!).sort((x, y) => x - y)
    if (rates.length) add({ id: 'flex-rate', topic: 'fuel', kind: 'measured', inv: 'PSI-69', text: `${rates.length} matching FLEX droplet test${rates.length > 1 ? 's' : ''} report burning-rate constants of ${+rates[0].toFixed(3)}–${+rates[rates.length - 1].toFixed(3)} mm²/s (median ${+rates[Math.floor((rates.length - 1) / 2)].toFixed(3)}).` })
    else add({ id: 'flex-rate', topic: 'fuel', kind: 'gap', text: 'No FLEX droplet burning-rate measurement matches every selected condition.' })
    if (!s.materialLabel || s.materialLabel === 'Heptane') { const fe = flameEv('fuel_dependent_colour', 46); if (fe) add({ id: 'heptane-soot', topic: 'fuel', kind: 'published', ref: fe.ref, locator: `PDF p.${fe.pdf_page}`, inv: 'PSI-69', text: fe.statement }) }
  } else if (cls === 'gaseous_jet') {
    fromFinding('spice-smoke-points', 'fuel', 'PSI-107', 2, 'Fifty-two smoke points')
  } else if (cls === 'solid_material') {
    fromFinding('bass-hrr', 'fuel', 'PSI-25', 10, 'Heat release')
    if (partial) { const e = pg('luci-pmma'); if (e) add({ id: 'luci-pmma', topic: 'fuel', kind: 'measured', ref: e.ref, locator: e.locator, text: `${e.statement} (LUCI, simulated lunar gravity)` }) }
  } else if (cls === 'smoke_source_material') {
    fromFinding('samer-temp', 'fuel', 'PSI-101', 2, 'heating temperature')
  } else add({ id: 'no-material', topic: 'fuel', kind: 'gap', text: 'No material selected. Choose a fuel or material class to see the evidence specific to it.' })

  // Smoke, soot & aerosol
  if (micro || s.gravity === null) { const fe = flameEv('soot_path', 8); if (fe && (cls === 'gaseous_jet' || cls === null)) add({ id: 'soot-path', topic: 'smoke', kind: 'published', ref: fe.ref, locator: `PDF p.${fe.pdf_page}`, inv: 'PSI-107', text: fe.statement }) }
  if (cls === 'gaseous_jet' && (!s.materialLabel || /propane/i.test(s.materialLabel))) fromFinding('propane-soot', 'smoke', 'PSI-107', 2, 'propane')
  if (cls === 'smoke_source_material' || cls === null || cls === 'solid_material') fromFinding('same-size', 'smoke', 'PSI-101', 1, '200–400 nm')
  if (cls === 'solid_material') fromFinding('bass-co', 'smoke', 'PSI-25', 9, 'CO versus CO₂')
  if (cls === 'liquid_droplet') { const fe = flameEv('soot_inside_blue', 22); if (fe) add({ id: 'soot-inside', topic: 'smoke', kind: 'published', ref: fe.ref, locator: `PDF p.${fe.pdf_page}`, inv: 'PSI-69', text: fe.statement }) }

  // Ignition & flame spread
  for (const r of (spine.fire_safety_rules ?? []).filter(r => ruleApplies(r, q))) add({ id: `rule-${r.id}`, topic: 'spread', kind: 'published', ref: r.ref, locator: r.locator, text: r.statement })
  if (partial && s.gravity! >= 0.1 && s.gravity! <= 0.4) {
    const e = pg('luci-sibal'); if (e && e.measurements.length) add({ id: 'luci-sibal', topic: 'spread', kind: 'measured', ref: e.ref, locator: e.locator,
      text: `LUCI measured fabric flame spread in simulated lunar gravity at ${e.measurements.map(m => `${m.value} ${m.unit} (${m.parameter.toLowerCase().replace('flame ', '')}; 1 g: ${m.one_g})`).join(' and ')}.` })
  }
  if (!out.some(i => i.topic === 'spread')) add({ id: 'spread-gap', topic: 'spread', kind: 'gap', text: 'No ignition or flame-spread result in the indexed evidence matches these conditions. That is not evidence that ignition is impossible.' })

  // Enclosed cabin & habitat
  if (s.pressureKpa !== null) add({ id: 'per-point', topic: 'habitat', kind: 'calculated', text: `At ${kpa(s.pressureKpa)} total pressure, each percentage point of O₂ a fire consumes lowers the oxygen partial pressure by ${kpa(s.pressureKpa / 100)}.` })
  if (cls === 'solid_material' || partial) { const e = pg('luci-pmma'); const m = e?.measurements.find(x => x.unit.includes('O₂')); if (e && m) add({ id: 'luci-o2', topic: 'habitat', kind: 'measured', ref: e.ref, locator: e.locator, text: `In LUCI's closed chamber, a burning acrylic rod drew O₂ down from 20% to ${m.value}% (1 g run: ${m.one_g}%).` }) }
  if (cls === 'solid_material') fromFinding('bass-stoich', 'habitat', 'PSI-25', 9, 'stoichiometry')
  if (partial) { const fm = (spine.fire_safety_insights ?? []).find(f => f.id === 'FSI-FM2'); if (fm) add({ id: 'fm2', topic: 'habitat', kind: 'gap', text: `${fm.statement}` }) }
  return out
}

// Strict-match counts and key conditions for the two reference presets, for the ISS vs Lunar comparison.
export function presetSummary(spine: Spine, scenarioId: string, base: Query) {
  const q = queryFromScenario(spine, scenarioId, { flow: base.flow, material: base.material })
  const s = snapshot(q)
  return { id: scenarioId, name: spine.scenarios.find(x => x.id === scenarioId)?.name ?? scenarioId, snap: s,
    matching: analyze(spine.records, q).eligibleEvidenceCount, advisory: advise(spine, q).level,
    partialGravityStudies: (spine.partial_gravity_evidence ?? []).filter(e => e.gravity_g !== null && s.gravity !== null && Math.abs(e.gravity_g - s.gravity) < 0.1).length }
}

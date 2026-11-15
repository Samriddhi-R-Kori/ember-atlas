import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { Spine, SpineRecord } from '../types/spine'
import { analyze, exclusionSummary, matchNumeric, matchRecord, qualityAssessment, queryFromRecord, queryFromScenario, type Query } from './gapEngine'
import { flameParams } from '../components/flame/flameModel'
import { advise, buildInsights, presetSummary, ruleApplies, snapshot } from './fireSafety'
import { relatedStudies } from './graph'
import { interpolate, measuredPoints, eligibleGroups, type Point } from './interpolation'
import { buildGraph, concentricRank } from './graph'

const publicData = join(__dirname, '../../public/data')
const latest = JSON.parse(readFileSync(join(publicData, 'latest.json'), 'utf8'))
const spine: Spine = JSON.parse(readFileSync(join(publicData, '..', latest.path), 'utf8'))

const base = (over: Partial<SpineRecord['c']> = {}, extra: Partial<SpineRecord> = {}): SpineRecord => ({
  id: 'r1', inv: 'T', src: 's', role: 'condition_source', sheet: null, row: 2, ident: '1', dup: null, flags: [], status: 'not_reviewed',
  c: { gravity: { s: 'reported', cat: 'orbital_microgravity' }, material: { s: 'reported', label: 'Methanol', cls: 'liquid_droplet' },
    oxygen: { s: 'reported', v: 0.21, u: 'mol/mol', h: 0.005, o: '0.21' }, pressure: { s: 'reported', v: 101325, u: 'Pa', h: 6.7, o: '760' },
    flow: { s: 'not_reported' }, ...over }, m: {}, x: {}, ...extra,
})
const q = (over: Partial<Query> = {}): Query => ({
  gravity: { enabled: true, value: 0, h: 0 }, oxygen: { enabled: true, value: 0.21, h: 0.005 },
  pressure: { enabled: true, value: 101352.9, h: 344.7 }, flow: { enabled: false, value: 0, h: 0.005 },
  material: { cls: null, label: null }, ...over,
})

describe('matching tolerances', () => {
  it('matches within summed reported precision and rejects just outside', () => {
    expect(matchNumeric({ s: 'reported', v: 0.215, u: 'mol/mol', h: 0.005 }, { enabled: true, value: 0.21, h: 0.005 }, 'oxygen').state).toBe('matched')
    expect(matchNumeric({ s: 'reported', v: 0.2201, u: 'mol/mol', h: 0.005 }, { enabled: true, value: 0.21, h: 0.005 }, 'oxygen').state).toBe('mismatched')
  })
  it('accepts volume fraction for oxygen but never an unknown unit', () => {
    expect(matchNumeric({ s: 'reported', v: 0.21, u: 'volume_fraction', h: 0.0005 }, { enabled: true, value: 0.21, h: 0.005 }, 'oxygen').state).toBe('matched')
    expect(matchNumeric({ s: 'reported', v: 0.21, u: 'mass_fraction', h: 0 }, { enabled: true, value: 0.21, h: 0.005 }, 'oxygen').state).toBe('restricted')
  })
  it('has a single strict mode: no band can widen the tolerance', () => {
    const e = { s: 'reported' as const, v: 0.23, u: 'mol/mol', h: 0.005 }
    expect(matchNumeric(e, { enabled: true, value: 0.21, h: 0.005 }, 'oxygen').state).toBe('mismatched')
    expect(matchNumeric.length).toBe(3)
    expect(JSON.stringify(spine.tolerance_rule)).not.toMatch(/exploratory_bands/)
  })
})

describe('missing-condition handling', () => {
  it('never treats a missing value as a match', () => {
    const m = matchRecord(base({ oxygen: { s: 'not_reported' } }), q())
    expect(m.dims.oxygen.state).toBe('not_reported'); expect(m.blocked).toBe(1)
  })
  it('treats restricted values as blocking, not matching', () => {
    const m = matchRecord(base({ pressure: { s: 'restricted', o: '0', why: 'disputed' } }), q())
    expect(m.dims.pressure.state).toBe('restricted')
  })
  it('gravity is categorical: only 0 g matches orbital microgravity', () => {
    expect(matchRecord(base(), q()).dims.gravity.state).toBe('matched')
    expect(matchRecord(base(), q({ gravity: { enabled: true, value: 0.005, h: 0.0025 } })).dims.gravity.state).toBe('mismatched')
  })
})

describe('gap classification', () => {
  it('distinguishes coverage gaps from evidence-quality gaps', () => {
    const blockedOnly = analyze([base({ oxygen: { s: 'restricted', why: 'basis unknown' } })], q())
    expect(blockedOnly.coverage).toBe('coverage_gap'); expect(blockedOnly.evidenceQuality).toBe('evidence_quality_gap')
    const mismatchOnly = analyze([base({ oxygen: { s: 'reported', v: 0.3, u: 'mol/mol', h: 0.005 } })], q())
    expect(mismatchOnly.evidenceQuality).toBe('no_related_records')
  })
  it('excludes exact repeats from eligible evidence but keeps them as source records', () => {
    const a = analyze([base(), base({}, { id: 'r2', dup: 'r1' }), base({}, { id: 'r3' })], q())
    expect(a.sourceRecordCount).toBe(3); expect(a.eligibleEvidenceCount).toBe(2); expect(a.coverage).toBe('sparse')
  })
  it('real data: Lunar Habitat has no qualifying evidence because no partial-gravity record exists', () => {
    const a = analyze(spine.records, queryFromScenario(spine, 'lunar_habitat'))
    expect(a.coverage).toBe('coverage_gap'); expect(a.eligible.length).toBe(0)
    expect(a.mismatchedDims).toContain('gravity')
  })
  it('real data: ISS Cabin analysis is deterministic and consistent', () => {
    const a1 = analyze(spine.records, queryFromScenario(spine, 'iss_cabin'))
    const a2 = analyze(spine.records, queryFromScenario(spine, 'iss_cabin'))
    expect(a1.eligible.map(m => m.record.id)).toEqual(a2.eligible.map(m => m.record.id))
    for (const m of a1.eligible) {
      expect(m.record.c.gravity.s).toBe('reported')
      expect(Math.abs(m.record.c.oxygen.v! - 0.21)).toBeLessThanOrEqual(0.0101)
    }
  })
})

describe('interpolation eligibility', () => {
  const pt = (x: number, y: number, group = 'g'): Point => ({ x, y, group, record: base() })
  it('requires at least three points and three levels', () => {
    expect(interpolate([pt(1, 1), pt(2, 2)], 'g', 1.5).status).toBe('sparse')
    expect(interpolate([pt(1, 1), pt(1, 1.2), pt(2, 2)], 'g', 1.5).status).toBe('sparse')
  })
  it('interpolates linearly inside the domain and refuses extrapolation', () => {
    const pts = [pt(1, 1), pt(2, 3), pt(3, 4)]
    const r = interpolate(pts, 'g', 1.5)
    expect(r.status).toBe('interpolated'); if (r.status === 'interpolated') expect(r.value).toBeCloseTo(2)
    expect(interpolate(pts, 'g', 3.5).status).toBe('outside_domain')
  })
  it('never mixes compatibility groups', () => {
    expect(interpolate([pt(1, 1, 'a'), pt(2, 2, 'b'), pt(3, 3, 'c')], 'a', 2).status).toBe('sparse')
  })
  it('real data: restricted metrics produce no plotted points', () => {
    const { points, excluded } = measuredPoints(spine.records, 'smoke_point_length', 'flow')
    expect(points.length).toBe(0); expect(excluded.restricted).toBeGreaterThan(0)
  })
  it('real data: FLEX burning-rate groups use reported-equality of other conditions', () => {
    const { points } = measuredPoints(spine.records.filter(r => r.inv === 'PSI-69'), 'burning_rate', 'oxygen')
    expect(points.length).toBeGreaterThan(200)
    for (const g of eligibleGroups(points)) {
      const members = points.filter(p => p.group === g)
      expect(new Set(members.map(p => p.record.c.material.label)).size).toBe(1)
      expect(new Set(members.map(p => p.record.c.pressure.o)).size).toBe(1)
    }
  })
})

describe('evidence graph', () => {
  const graph = buildGraph(spine)
  it('every edge has an explanation and existing endpoints', () => {
    const ids = new Set(graph.nodes.map(n => n.id))
    for (const e of graph.edges) { expect(ids.has(e.source)).toBe(true); expect(ids.has(e.target)).toBe(true); expect(e.explanation.length).toBeGreaterThan(10) }
  })
  it('has both scenarios, no Mars and a bounded core node count', () => {
    expect(graph.nodes.filter(n => n.kind === 'scenario').map(n => n.label).sort()).toEqual(['ISS Cabin', 'Lunar Habitat'])
    expect(JSON.stringify(graph.nodes).toLowerCase()).not.toMatch(/\bmars\b|martian/)
    const core = graph.nodes.filter(n => n.tier === 'core').length
    expect(core).toBeGreaterThanOrEqual(30); expect(core).toBeLessThanOrEqual(70)
  })
  it('gap nodes carry the rule and responsible records', () => {
    const gap = graph.nodes.find(n => n.id === 'gap:coverage:lunar_habitat')!
    const x = gap.detail.explanation as { rule: string; examples: unknown[]; requested: unknown[]; without_evidence: string[]; suggestion: string; gap_type: string }
    expect(gap).toBeTruthy(); expect(x.rule).toContain('Qualifying'); expect(x.gap_type).toBe('coverage')
    expect(x.examples.length).toBeGreaterThan(0); expect(x.requested.length).toBe(3)
    expect(x.without_evidence).toContain('Gravity'); expect(x.suggestion).toMatch(/partial-gravity/i)
  })
  it('FM2 is planned and linked to the matching scenario atmosphere', () => {
    expect(graph.edges.some(e => e.kind === 'planned' && e.target === 'scenario:lunar_habitat')).toBe(true)
    expect(graph.edges.some(e => e.kind === 'planned' && e.target === 'scenario:iss_cabin')).toBe(true)
  })
  it('concentric rank puts the selected scenario at the centre', () => {
    const r = concentricRank(graph, 'iss_cabin')
    expect(Math.max(...Object.values(r))).toBe(r['scenario:iss_cabin'])
  })
})

describe('strict evidence demonstrations (real data)', () => {
  const byId = new Map(spine.records.map(r => [r.id, r]))
  it('every condition record qualifies at its own measured conditions', () => {
    const recs = spine.records.filter(r => r.role === 'condition_source')
    const fails = recs.filter(r => !analyze(spine.records, queryFromRecord(r).query).eligible.some(m => m.record.id === r.id))
    expect(recs.length).toBe(1125); expect(fails.length).toBe(0)
  })
  it('each demonstration preset yields at least one genuinely eligible record', () => {
    expect(spine.demonstration_records!.length).toBeGreaterThanOrEqual(1)
    for (const d of spine.demonstration_records!) {
      const r = byId.get(d.record_id)!; expect(r).toBeTruthy()
      const { query, unconstrained } = queryFromRecord(r)
      const a = analyze(spine.records, query)
      expect(a.eligibleEvidenceCount).toBeGreaterThan(0)
      for (const u of unconstrained) expect(query[u.dim as 'oxygen'].enabled).toBe(false)
    }
  })
  it('FLEX demo: Test 4 methanol 0.21 / 760 mmHg matches FLEX records only', () => {
    const r = byId.get(spine.demonstration_records!.find(d => d.id === 'demo_flex_methanol_air')!.record_id)!
    expect([r.ident, r.c.material.label, r.c.oxygen.o, r.c.pressure.o, r.m.burning_rate.o]).toEqual(['4', 'Methanol', '0.21', '760', '0.6'])
    const a = analyze(spine.records, queryFromRecord(r).query)
    expect(a.eligible.every(m => m.record.inv === 'PSI-69' && m.record.c.material.label === 'Methanol')).toBe(true)
  })
  it('ISS preset: 18 unique qualifying FLEX records; Lunar: 0', () => {
    expect(analyze(spine.records, queryFromScenario(spine, 'iss_cabin')).eligibleEvidenceCount).toBe(18)
    expect(analyze(spine.records, queryFromScenario(spine, 'lunar_habitat')).eligibleEvidenceCount).toBe(0)
  })
  it('row accounting: eligible + excluded = considered', () => {
    for (const s of ['iss_cabin', 'lunar_habitat']) {
      const a = analyze(spine.records, queryFromScenario(spine, s))
      expect(a.sourceRecordCount + exclusionSummary(a, spine.records).reduce((n, e) => n + e.count, 0)).toBe(a.considered)
    }
  })
  it('quality gaps: limiting for covered ISS, blocking when only metadata fails', () => {
    const iss = qualityAssessment(analyze(spine.records, queryFromScenario(spine, 'iss_cabin')))
    expect(iss.severity).toBe('limiting'); expect(iss.reasons.map(r => r.code)).toContain('unreviewed')
    const jet = qualityAssessment(analyze(spine.records, { ...queryFromScenario(spine, 'iss_cabin'), material: { cls: 'gaseous_jet', label: null } }))
    expect(jet.severity).toBe('blocking'); expect(jet.reasons[0].code).toBe('missing_metadata')
  })
})

describe('graph gap structure', () => {
  const graph = buildGraph(spine)
  it('coverage and quality gaps are distinct node kinds with explanations', () => {
    expect(graph.nodes.some(n => n.id === 'gap:quality:iss_cabin' && n.kind === 'quality_gap')).toBe(true)
    expect(graph.nodes.some(n => n.id === 'gap:coverage:iss_cabin')).toBe(false)
    for (const n of graph.nodes.filter(x => x.kind.endsWith('_gap'))) expect(n.detail.explanation).toBeTruthy()
  })
  it('progressive gaps are bounded and attached to a scenario', () => {
    const prog = graph.nodes.filter(n => n.tier === 'progressive')
    for (const s of spine.scenarios) expect(prog.filter(n => n.scenario === s.id).length).toBeLessThanOrEqual(14)
    expect(prog.every(n => n.parent?.startsWith('scenario:'))).toBe(true)
  })
})

describe('flame rendering rules (qualitative)', () => {
  const base = { gravity: 0, flow: 0, oxygen: 0.21, pressureKpa: 101.3, materialClass: 'liquid_droplet', materialLabel: 'Heptane' }
  it('microgravity is rounder and does not flicker; 1 g is elongated and flickers', () => {
    const ug = flameParams(base), g1 = flameParams({ ...base, gravity: 1 })
    expect(ug.roundness).toBeGreaterThan(g1.roundness); expect(g1.elongation).toBeGreaterThan(ug.elongation)
    expect(ug.flickerHz).toBe(0); expect(g1.flickerHz).toBeGreaterThan(5)
  })
  it('colour depends on fuel, not oxygen alone', () => {
    const meth = flameParams({ ...base, materialLabel: 'Methanol', oxygen: 0.5 })
    expect(meth.soot).toBeLessThan(0.15)
    expect(flameParams(base).soot).toBeGreaterThan(0.3)   // heptane stays luminous in orbit (FLEX p.46)
  })
  it('cross-flow tilts droplet flames; coflow jets shorten instead', () => {
    expect(flameParams({ ...base, flow: 0.3 }).tilt).toBeGreaterThan(0.5)
    const jet = { ...base, materialClass: 'gaseous_jet', materialLabel: '"Ethylene"' }
    expect(flameParams({ ...jet, flow: 0.5 }).tilt).toBe(0)
    expect(flameParams({ ...jet, flow: 0.5 }).elongation).toBeLessThan(flameParams(jet).elongation)
  })
  it('smoke-generation samples are non-flaming', () => {
    const f = flameParams({ ...base, materialClass: 'smoke_source_material', materialLabel: null })
    expect(f.regime).toBe('non_flaming'); expect(f.soot).toBe(0)
  })
})

describe('contract-driven UI data', () => {
  it('CFI is excluded from primary selectors but all its records remain', () => {
    expect(Object.keys(spine.primary_selector_excluded ?? {})).toEqual(['PSI-39'])
    expect(spine.records.filter(r => r.inv === 'PSI-39').length).toBe(87)
    expect(spine.metrics.filter(m => m.investigation === 'PSI-39' && !m.restricted).length).toBe(0)
  })
  it('fire-safety insights and flame evidence cite resolvable sources', () => {
    for (const i of spine.fire_safety_insights!) {
      const url = i.ref ? spine.references![i.ref]?.url : spine.scenario_sources[i.source!]?.url
      expect(url).toMatch(/^https:\/\//)
    }
    for (const f of spine.flame_evidence!) expect(spine.references![f.ref]).toBeTruthy()
  })
})

describe('fire-safety advisory (deterministic, never "safe")', () => {
  const iss = () => queryFromScenario(spine, 'iss_cabin'), lunar = () => queryFromScenario(spine, 'lunar_habitat')
  it('ISS preset: matching measurements → evidence available', () => {
    const a = advise(spine, iss()); expect(a.level).toBe('evidence'); expect(a.matching).toBe(18)
    expect(a.po2Kpa).toBeCloseTo(101.3529 * 0.21, 3)
  })
  it('Lunar preset: LUCI simulated lunar-g burning → hazard indicated, with source', () => {
    const a = advise(spine, lunar()); expect(a.level).toBe('hazard')
    expect(a.rules.map(r => r.ref)).toContain('luci_2025'); expect(a.po2Kpa).toBeCloseTo(56.5370 * 0.34, 2)
  })
  it('no evidence and no rule → insufficient, not safe', () => {
    const a = advise(spine, { ...iss(), material: { cls: 'gaseous_jet', label: null } })
    expect(a.level).toBe('insufficient'); expect(a.summary).toMatch(/Avoid relying on this scenario as safe/)
    expect(JSON.stringify(a)).not.toMatch(/safe to (light|ignite)/i)
  })
  it('rules need every stated condition; disabled controls never satisfy a condition', () => {
    const r = spine.fire_safety_rules!.find(x => x.id === 'enriched-quiescent')!
    const q = { ...iss(), oxygen: { enabled: true, value: 0.30, h: 0.005 }, flow: { enabled: true, value: 0, h: 0.005 } }
    expect(ruleApplies(r, q)).toBe(true)
    expect(ruleApplies(r, { ...q, oxygen: { ...q.oxygen, value: 0.21 } })).toBe(false)
    expect(ruleApplies(r, { ...q, flow: { ...q.flow, enabled: false } })).toBe(false)
  })
  it('every rule cites a stored reference', () => {
    for (const r of spine.fire_safety_rules!) expect(spine.references![r.ref]?.url).toMatch(/^https:/)
  })
})

describe('partial-gravity evidence stays outside the catalogue', () => {
  it('related studies match gravity but not the Lunar Habitat atmosphere', () => {
    const rs = relatedStudies(spine, queryFromScenario(spine, 'lunar_habitat'))
    expect(rs.length).toBe(3)
    for (const r of rs) { expect(r.matches.some(m => m.startsWith('gravity'))).toBe(true); expect(r.differs.length).toBeGreaterThan(0) }
    expect(relatedStudies(spine, queryFromScenario(spine, 'iss_cabin'))).toEqual([])
  })
  it('Lunar remains a coverage gap: supplemental studies are not condition records', () => {
    expect(analyze(spine.records, queryFromScenario(spine, 'lunar_habitat')).eligibleEvidenceCount).toBe(0)
    expect(spine.records.some(r => r.id.includes('luci'))).toBe(false)
  })
  it('LUCI values are copied with their 1 g comparison and calculated gravity note', () => {
    const l = spine.partial_gravity_evidence!.find(e => e.id === 'luci-pmma')!
    expect(l.measurements.find(m => m.parameter === 'Flame tip spread rate')).toMatchObject({ value: 1.5, unit: 'mm/s', one_g: 4.0 })
    expect(((2 * Math.PI * 11 / 60) ** 2 * 1.22) / 9.80665).toBeCloseTo(l.gravity_g!, 2)
  })
})

describe('fire safety insights (deterministic, source-linked, never "safe")', () => {
  const iss = () => queryFromScenario(spine, 'iss_cabin'), lunar = () => queryFromScenario(spine, 'lunar_habitat')
  const text = (q: ReturnType<typeof iss>) => buildInsights(spine, q).map(i => i.text).join(' ')
  it('calculates P_O2 = P_total × fraction for both presets', () => {
    expect(snapshot(iss()).po2Kpa!.toFixed(2)).toBe('21.28')
    expect(snapshot(lunar()).po2Kpa!.toFixed(2)).toBe('19.22')
    expect(presetSummary(spine, 'iss_cabin', iss()).matching).toBe(18)
    expect(presetSummary(spine, 'lunar_habitat', iss()).matching).toBe(0)
  })
  it('explains that a higher O2 fraction can mean lower partial pressure', () => {
    expect(buildInsights(spine, lunar()).some(i => i.id === 'po2-vs-fraction' && i.kind === 'relationship')).toBe(true)
    expect(buildInsights(spine, iss()).some(i => i.id === 'po2-vs-fraction')).toBe(false)
  })
  it('insights change with conditions instead of repeating one generic text', () => {
    expect(text(iss())).not.toBe(text(lunar()))
    expect(text({ ...iss(), material: { cls: 'liquid_droplet', label: null } })).not.toBe(text({ ...iss(), material: { cls: 'gaseous_jet', label: null } }))
    expect(text(lunar())).toMatch(/0\.41× the 1 g value/)
  })
  it('every published or sourced insight resolves to a stored reference; measured numbers come from the spine', () => {
    for (const q of [iss(), lunar(), { ...iss(), material: { cls: 'solid_material', label: null }, flow: { enabled: true, value: 0.05, h: 0.005 } }]) {
      for (const i of buildInsights(spine, q)) {
        if (i.kind === 'published') expect(spine.references![i.ref!]).toBeTruthy()
        if (i.ref) expect(spine.references![i.ref]).toBeTruthy()
      }
    }
    const solid = buildInsights(spine, { ...iss(), material: { cls: 'solid_material', label: null }, flow: { enabled: true, value: 0.05, h: 0.005 } })
    expect(solid.find(i => i.id === 'bass-ext')!.text).toMatch(/above the measured extinction velocity .* \(10 ± 5 mm\/s/)
  })
  it('no matching evidence → explicit gap, never a safety verdict', () => {
    const q = { ...iss(), material: { cls: 'gaseous_jet', label: null } }
    const all = buildInsights(spine, q)
    expect(all.some(i => i.topic === 'spread' && i.kind === 'gap')).toBe(true)
    expect(JSON.stringify(all)).not.toMatch(/\bis safe\b|safe to (light|ignite)/i)
  })
})

describe('categorical chart axes', () => {
  it('SAME-R material axis maps records to categories and is never interpolated', () => {
    const recs = spine.records.filter(r => r.inv === 'PSI-101')
    const cats = [...new Set(recs.map(r => (r.c.material.label ?? 'Not reported').replaceAll('"', '')))].sort()
    const { points } = measuredPoints(recs, 'net_aging_time', 'material', cats)
    expect(points.length).toBeGreaterThan(0)
    expect(points.every(p => Number.isInteger(p.x) && p.x >= 0 && p.x < cats.length)).toBe(true)
  })
})

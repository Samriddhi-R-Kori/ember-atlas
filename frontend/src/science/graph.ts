// Deterministic evidence-graph derivation. Every node and edge carries an inspectable
// provenance string; no edge is AI-proposed. Gap nodes are produced by the shared gap engine.
import type { Spine } from '../types/spine'
import { analyze, enabledDims, exclusionSummary, fmtDim, qualityAssessment, queryFromScenario, suggestExperiment, DIM_LABEL, type Analysis, type Query } from './gapEngine'
import type { Dim } from '../types/spine'

export type NodeKind = 'scenario' | 'investigation' | 'paper' | 'material' | 'equipment' | 'coverage_gap' | 'quality_gap' | 'planned' | 'partial_gravity'
export type EdgeKind = 'matches' | 'reports' | 'tested' | 'informs' | 'planned' | 'proposed'
export type GraphNode = { id: string; kind: NodeKind; label: string; accent?: 'blue' | 'red' | 'neutral'; size: number
  summary: string; provenance: string; detail: Record<string, unknown>; tier: 'core' | 'progressive'; scenario?: string; parent?: string }
export type GraphEdge = { id: string; source: string; target: string; kind: EdgeKind; weight: number; explanation: string; confirmed: boolean }
export type EvidenceGraph = { nodes: GraphNode[]; edges: GraphEdge[]; analyses: Record<string, Analysis> }
export type GapExplanation = {
  gap_type: 'coverage' | 'evidence_quality'; requested: { dim: string; value: string }[]
  with_evidence: string[]; without_evidence: string[]; not_reported: string[]
  considered: number; qualifying: number; qualifying_unique: number; blocked: number
  exclusions: { inv: string; reason: string; count: number }[]
  quality: { label: string; count: number; detail: string }[]
  examples: { record: string; label: string; states: Record<string, string> }[]
  suggestion: string; rule: string
  related_studies?: { id: string; title: string; kind: string; matches: string[]; differs: string[] }[]
}

const PAPERS_PER_INVESTIGATION = 4

export function titleMatches(title: string, keywords: string[]) {
  const t = title.toLowerCase()
  return keywords.filter(k => new RegExp(`\\b${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i').test(t))
}

const shortName = (spine: Spine, inv: string) => spine.investigations.find(i => i.id === inv)?.short ?? inv

export function explainGap(spine: Spine, a: Analysis, type: 'coverage' | 'evidence_quality'): GapExplanation {
  const enabled = enabledDims(a.query)
  const q = qualityAssessment(a)
  const examples = (type === 'coverage' ? a.nearest : a.blocked.length ? a.blocked : a.eligible).slice(0, 4).map(m => ({
    record: m.record.id, label: `${shortName(spine, m.record.inv)} ${m.record.ident ?? ''} · row ${m.record.row}`,
    states: Object.fromEntries(enabled.map(d => [DIM_LABEL[d], m.dims[d].state.replace('_', ' ')])) }))
  return {
    gap_type: type, requested: enabled.map(d => ({ dim: DIM_LABEL[d], value: fmtDim(d, a.query) })),
    with_evidence: a.matchedDims.map(d => DIM_LABEL[d]), without_evidence: a.mismatchedDims.map(d => DIM_LABEL[d]),
    not_reported: a.notReportedDims.map(d => DIM_LABEL[d]),
    considered: a.considered, qualifying: a.sourceRecordCount, qualifying_unique: a.eligibleEvidenceCount, blocked: a.blocked.length,
    exclusions: exclusionSummary(a, spine.records).slice(0, 8).map(e => ({ inv: shortName(spine, e.inv), reason: e.reason, count: e.count })),
    quality: q.reasons.map(r => ({ label: r.label, count: r.count, detail: r.detail })),
    examples, suggestion: suggestExperiment(a, type === 'coverage'), rule: a.rule,
    related_studies: relatedStudies(spine, a.query),
  }
}

// Supplemental partial-gravity studies compared with the requested conditions (they are not catalogue records).
export function relatedStudies(spine: Spine, q: Query) {
  if (!q.gravity.enabled || q.gravity.value <= 0.02) return []
  return (spine.partial_gravity_evidence ?? []).filter(e => e.gravity_g !== null).map(e => {
    const matches: string[] = [], differs: string[] = []
    ;(Math.abs((e.gravity_g ?? 0) - q.gravity.value) <= 0.02 ? matches : differs).push(`gravity ${e.gravity}`)
    if (q.oxygen.enabled) (e.oxygen_frac !== null && Math.abs(e.oxygen_frac - q.oxygen.value) <= 0.01 ? matches : differs).push(`O₂ ${e.oxygen || 'not stated'}`)
    if (q.pressure.enabled) (e.pressure_kpa !== null && Math.abs(e.pressure_kpa - q.pressure.value / 1000) <= 1 ? matches : differs).push(`pressure ${e.pressure || 'not stated'}`)
    return { id: e.id, title: `${spine.references?.[e.ref]?.id ?? e.ref} · ${e.material}`, kind: e.kind, matches, differs }
  })
}

function gapNodes(spine: Spine, scenarioId: string, query: Query, suffix: string, label: string, tier: 'core' | 'progressive', parent?: string) {
  const a = analyze(spine.records, query)
  const scen = spine.scenarios.find(s => s.id === scenarioId)!
  const nodes: GraphNode[] = []; const edges: GraphEdge[] = []
  const conds = enabledDims(query).map(d => fmtDim(d, query)).join(' · ')
  const q = qualityAssessment(a)
  const from = parent ?? `scenario:${scenarioId}`
  if (a.coverage === 'coverage_gap') {
    const id = `gap:coverage:${scenarioId}${suffix}`
    const missing = a.mismatchedDims.map(d => DIM_LABEL[d]).join(', ')
    nodes.push({ id, kind: 'coverage_gap', label: `∅ Coverage gap · ${scen.name}${label}`, size: tier === 'core' ? 30 : 20, accent: scen.accent, tier, scenario: scenarioId, parent,
      summary: `No record in our catalogue combines ${conds}.${missing ? ` Nothing indexed reaches the requested ${missing}.` : ''}`,
      provenance: 'Shared gap engine (strict matching within reported precision).',
      detail: { explanation: explainGap(spine, a, 'coverage') } })
    edges.push({ id: `e:${id}`, source: from, target: id, kind: 'informs', weight: 1, confirmed: true,
      explanation: `Coverage gap for ${conds}: no qualifying record (deterministic gap-engine output).` })
  }
  // Quality gaps: always at scenario level when related records exist; progressive ones only when blocking.
  if (q.severity === 'blocking' || (tier === 'core' && q.severity === 'limiting')) {
    const id = `gap:quality:${scenarioId}${suffix}`
    const invs = [...new Set((a.blocked.length ? a.blocked : a.eligible).map(m => m.record.inv))]
    nodes.push({ id, kind: 'quality_gap', label: `⚠ Evidence-quality gap · ${scen.name}${label}`, size: tier === 'core' ? 26 : 18, accent: scen.accent, tier, scenario: scenarioId, parent,
      summary: q.severity === 'blocking'
        ? `${a.blocked.length} related records match every reported condition but cannot qualify: ${q.reasons.slice(0, 2).map(r => r.label.toLowerCase()).join(' and ')}.`
        : `${a.eligibleEvidenceCount} qualifying records exist, but ${q.reasons.slice(0, 3).map(r => r.label.toLowerCase()).join(', ')} limit any conclusion.`,
      provenance: 'Shared gap engine: evidence-quality assessment of related records.',
      detail: { explanation: explainGap(spine, a, 'evidence_quality'), severity: q.severity } })
    edges.push({ id: `e:${id}`, source: from, target: id, kind: 'informs', weight: 1, confirmed: true,
      explanation: `Evidence-quality gap (${q.severity}) for ${conds}.` })
    for (const inv of invs) edges.push({ id: `e:${id}:${inv}`, source: `inv:${inv}`, target: id, kind: 'informs', weight: 0.5, confirmed: true,
      explanation: `${shortName(spine, inv)} records are related to this request; their limitations define the gap.` })
  }
  return { nodes, edges, analysis: a }
}

export function buildGraph(spine: Spine, baseQuery?: Partial<Query>): EvidenceGraph {
  const nodes: GraphNode[] = []; const edges: GraphEdge[] = []; const analyses: Record<string, Analysis> = {}
  for (const s of spine.scenarios) {
    nodes.push({ id: `scenario:${s.id}`, kind: 'scenario', label: s.name, accent: s.accent, size: 46, tier: 'core',
      summary: Object.values(s.conditions).map(c => c.display).join(' · '),
      provenance: 'Source-backed proposed design preset (see Resources → Experimental Conditions).',
      detail: { status: s.status, conditions: s.conditions, assumptions: s.assumptions, version: s.version } })
  }
  for (const inv of spine.investigations) {
    nodes.push({ id: `inv:${inv.id}`, kind: 'investigation', label: inv.short, accent: 'neutral', size: 24 + Math.sqrt(inv.condition_records) * 1.4, tier: 'core',
      summary: `${inv.title} — ${inv.platform}. ${inv.condition_records} source records (node size; not independent experiments).`,
      provenance: `NASA PSI catalog ${inv.id} (DOI ${inv.doi}); records from pinned dataset ${spine.dataset.version}.`,
      detail: { doi: inv.doi, catalog: inv.catalog_url, scale: inv.scale, gravity: inv.gravity, ranges: inv.condition_ranges,
        materials: inv.materials, exact_repeats_retained: inv.exact_repeats_retained, status: inv.status } })
  }
  for (const [cls, meta] of Object.entries(spine.material_classes)) {
    nodes.push({ id: `mat:${cls}`, kind: 'material', label: meta.label, size: 26, tier: 'core', accent: 'neutral',
      summary: meta.basis, provenance: 'Scientific contract material-class mapping.', detail: { basis: meta.basis } })
  }
  for (const inv of spine.investigations) edges.push({ id: `e:tested:${inv.id}`, source: `inv:${inv.id}`, target: `mat:${inv.material_class}`,
    kind: 'tested', weight: 1, confirmed: true, explanation: spine.material_classes[inv.material_class].basis })

  // Equipment areas and papers, linked only by explicit title-keyword rules.
  const usedAreas = new Set<string>()
  for (const inv of spine.investigations) {
    const ranked = spine.papers.filter(p => p.investigations.includes(inv.id))
      .map(p => ({ p, hits: Object.entries(spine.equipment_areas).map(([k, a]) => [k, titleMatches(p.title, a.keywords)] as const).filter(([, h]) => h.length) }))
      .sort((a, b) => b.hits.length - a.hits.length || a.p.id.localeCompare(b.p.id)).slice(0, PAPERS_PER_INVESTIGATION)
    for (const { p, hits } of ranked) {
      if (!nodes.some(n => n.id === p.id)) nodes.push({ id: p.id, kind: 'paper', label: p.title.length > 46 ? p.title.slice(0, 44) + '…' : p.title, size: 16, tier: 'core', accent: 'neutral',
        summary: `${p.title}${p.authors ? ' — ' + p.authors : ''}. Title-only record; conclusions not extracted.`,
        provenance: p.provenance, detail: { doi: p.doi, link: p.source_link, investigations: p.investigations, verification_scope: p.verification_scope } })
      edges.push({ id: `e:reports:${inv.id}:${p.id}`, source: `inv:${inv.id}`, target: p.id, kind: 'reports', weight: 0.6, confirmed: true,
        explanation: `Listed as a publication of ${inv.id} in the NASA PSI catalog.` })
      for (const [area, words] of hits) {
        usedAreas.add(area)
        edges.push({ id: `e:informs:${p.id}:${area}`, source: p.id, target: `eq:${area}`, kind: 'informs', weight: 0.5, confirmed: true,
          explanation: `Title-keyword rule matched "${words.join('", "')}". Keyword match only — not a reviewed finding.` })
      }
    }
  }
  for (const [k, a] of Object.entries(spine.equipment_areas)) if (usedAreas.has(k)) nodes.push({ id: `eq:${k}`, kind: 'equipment', label: a.label, size: 24, tier: 'core', accent: 'neutral',
    summary: `Equipment/application area. Linked papers matched title keywords: ${a.keywords.join(', ')}.`,
    provenance: 'Scientific contract equipment-area keyword list.', detail: { keywords: a.keywords } })

  // Supplemental partial-gravity studies (measured in simulated/aircraft lunar gravity, or reviews). Not catalogue records.
  const lunar = spine.scenarios.find(x => x.conditions.gravity.value > 0)
  for (const e of spine.partial_gravity_evidence ?? []) {
    const ref = spine.references?.[e.ref]
    nodes.push({ id: `pg:${e.id}`, kind: 'partial_gravity', label: `${e.id.startsWith('luci') ? 'LUCI' : ref?.id.split(' ')[0] ?? e.id} · ${e.material.split(',')[0].split('(')[0].trim()}`, size: 20, tier: 'core', accent: 'red',
      summary: e.statement, provenance: `${ref?.title ?? e.ref} (${e.locator}).`,
      detail: { study: e, url: ref?.url } })
    if (lunar) edges.push({ id: `e:pg:${e.id}:${lunar.id}`, source: `pg:${e.id}`, target: `scenario:${lunar.id}`, kind: 'informs', weight: 0.6, confirmed: true,
      explanation: `${e.kind === 'review' ? 'Review' : 'Measured'} evidence at ${e.gravity}; ${e.oxygen || 'O₂ not stated'}, ${e.pressure || 'pressure not stated'} — partial match to this scenario.` })
    edges.push({ id: `e:pg:${e.id}:mat`, source: `pg:${e.id}`, target: `mat:${e.material_class}`, kind: 'tested', weight: 0.5, confirmed: true,
      explanation: `Tested material: ${e.material}.` })
  }

  // FM2 planned experiment.
  const fm2 = spine.fm2
  nodes.push({ id: 'planned:fm2', kind: 'planned', label: 'FM2 (planned)', size: 28, tier: 'core', accent: 'red',
    summary: `${fm2.status_label}. ${fm2.status_detail}`, provenance: fm2.sources.map(s => spine.scenario_sources[s].id).join(', '),
    detail: { planned_conditions: fm2.planned_conditions, does_not_establish: fm2.does_not_establish } })
  for (const s of spine.scenarios) {
    const pc = fm2.planned_conditions.find(c => Math.abs(c.oxygen - s.conditions.oxygen.value) < 1e-9
      && Math.abs(c.pressure_psia * 6894.757293168 - s.conditions.pressure.value) <= s.conditions.pressure.half_precision)
    if (pc) edges.push({ id: `e:planned:${s.id}`, source: 'planned:fm2', target: `scenario:${s.id}`, kind: 'planned', weight: 1, confirmed: true,
      explanation: `FM2 plans "${pc.label}" at ${Math.round(pc.oxygen * 100)}% O₂ / ${pc.pressure_psia} psia (${pc.gravity} gravity) — equal to this scenario's atmosphere. Planned, not measured.` })
  }
  edges.push({ id: 'e:proposed:fm2:solid', source: 'planned:fm2', target: 'mat:solid_material', kind: 'proposed', weight: 0.7, confirmed: true,
    explanation: 'FM2 planned samples are solids (SIBAL fabric, acrylic rods) per NTRS 20240015307.' })

  // Scenario ↔ investigation matching and scenario gaps from the shared engine.
  for (const s of spine.scenarios) {
    const q = queryFromScenario(spine, s.id, baseQuery)
    const core = gapNodes(spine, s.id, q, '', '', 'core')
    analyses[s.id] = core.analysis
    nodes.push(...core.nodes); edges.push(...core.edges)
    for (const res of Object.values(core.analysis.byInvestigation)) {
      if (!res.bestMatchedDims) continue
      const matched = Object.entries(res.dimCounts).filter(([d, c]) => c.matched > 0 && q && enabledDims(q).includes(d as never)).map(([d]) => DIM_LABEL[d as never])
      edges.push({ id: `e:matches:${s.id}:${res.inv}`, source: `scenario:${s.id}`, target: `inv:${res.inv}`, kind: 'matches',
        weight: res.bestMatchedDims / Math.max(1, res.enabledDims), confirmed: true,
        explanation: `Best record matches ${res.bestMatchedDims}/${res.enabledDims} enabled dimensions (${matched.join(', ')}). ${res.eligible} qualifying source records (${res.eligibleUnique} unique). Ring position = matching completeness, not applicability.` })
    }
    // Progressive gaps (revealed when the scenario is explored): which condition pairs break, then which
    // material classes. Bounded: ≤3 pairs + ≤4 classes per scenario, created only where a gap exists.
    const dims = enabledDims(q).filter(d => d !== 'material')
    for (let i = 0; i < dims.length; i++) for (let j = i + 1; j < dims.length; j++) {
      const keep = new Set<Dim>([dims[i], dims[j]])
      const pq: Query = { ...q, gravity: { ...q.gravity, enabled: keep.has('gravity') }, oxygen: { ...q.oxygen, enabled: keep.has('oxygen') },
        pressure: { ...q.pressure, enabled: keep.has('pressure') }, flow: { ...q.flow, enabled: keep.has('flow') } }
      const prog = gapNodes(spine, s.id, pq, `:pair:${dims[i]}+${dims[j]}`, ` · ${DIM_LABEL[dims[i]]} + ${DIM_LABEL[dims[j]]}`, 'progressive', `scenario:${s.id}`)
      nodes.push(...prog.nodes); edges.push(...prog.edges)
    }
    for (const [cls, meta] of Object.entries(spine.material_classes)) {
      const pq = { ...q, material: { cls, label: null } }
      const prog = gapNodes(spine, s.id, pq, `:${cls}`, ` · ${meta.label}`, 'progressive', `scenario:${s.id}`)
      for (const n of prog.nodes) { nodes.push(n); edges.push({ id: `e:${n.id}:mat`, source: `mat:${cls}`, target: n.id, kind: 'informs', weight: 0.4, confirmed: true,
        explanation: `Scenario query restricted to material class "${meta.label}".` }) }
      edges.push(...prog.edges)
    }
  }
  return { nodes, edges: edges.filter(e => nodes.some(n => n.id === e.source) && nodes.some(n => n.id === e.target)), analyses }
}

// Concentric ranking for a selected scenario: lower ring = more complete matching (not applicability).
export function concentricRank(graph: EvidenceGraph, scenarioId: string): Record<string, number> {
  const rank: Record<string, number> = { [`scenario:${scenarioId}`]: 10 }
  for (const e of graph.edges) if (e.kind === 'matches' && e.source === `scenario:${scenarioId}`) rank[e.target] = 6 + 3 * e.weight
  for (const n of graph.nodes) {
    if (rank[n.id] !== undefined) continue
    if ((n.kind === 'coverage_gap' || n.kind === 'quality_gap') && n.scenario === scenarioId) rank[n.id] = n.tier === 'core' ? 7.5 : 4
    else if (n.kind === 'investigation') rank[n.id] = 5
    else if (n.kind === 'planned') rank[n.id] = 6
    else if (n.kind === 'partial_gravity') rank[n.id] = n.accent === 'red' && scenarioId !== 'iss_cabin' ? 7 : 2
    else if (n.kind === 'material' || n.kind === 'equipment') rank[n.id] = 3
    else rank[n.id] = 1
  }
  return rank
}

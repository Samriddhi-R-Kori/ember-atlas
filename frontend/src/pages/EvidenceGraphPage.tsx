import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import cytoscape, { type Core, type ElementDefinition } from 'cytoscape'
import { Crosshair, Focus, List, Network, RotateCcw, Search, Sparkles } from 'lucide-react'
import { useAppState } from '../state/AppState'
import { buildGraph, concentricRank, type EdgeKind, type GapExplanation, type GraphNode, type NodeKind } from '../science/graph'
import { human } from '../lib/format'

const BLUE = '#2563EB', RED = '#D91B5C', NEUTRAL = '#8EA3C7'
const NODE_KINDS: { kind: NodeKind; label: string; shape: string }[] = [
  { kind: 'scenario', label: 'Scenario', shape: 'diamond' }, { kind: 'investigation', label: 'Investigation', shape: 'circle' },
  { kind: 'paper', label: 'Paper', shape: '' }, { kind: 'material', label: 'Material class', shape: 'hex' },
  { kind: 'equipment', label: 'Equipment area', shape: 'tri' }, { kind: 'coverage_gap', label: 'Coverage gap', shape: 'dash' },
  { kind: 'quality_gap', label: 'Evidence-quality gap', shape: 'dash' }, { kind: 'planned', label: 'Planned experiment', shape: 'dash' },
  { kind: 'partial_gravity', label: 'Partial-gravity study', shape: 'diamond' },
]
const EDGE_KINDS: EdgeKind[] = ['matches', 'reports', 'tested', 'informs', 'planned', 'proposed']
const accentColor = (a?: string) => a === 'blue' ? BLUE : a === 'red' ? RED : NEUTRAL

function stylesheet(): cytoscape.Stylesheet[] {
  return ([
    { selector: 'node', style: { 'background-color': 'data(color)', 'background-opacity': 0.9, width: 'data(size)', height: 'data(size)', label: 'data(label)',
      color: '#D1D5DB', 'font-size': 9, 'font-family': 'Inter, sans-serif', 'text-valign': 'bottom', 'text-margin-y': 5, 'text-wrap': 'wrap', 'text-max-width': '120px',
      'text-outline-color': '#05070d', 'text-outline-width': 2, 'border-width': 1, 'border-color': 'data(color)', 'border-opacity': 0.9,
      'underlay-color': 'data(color)', 'underlay-opacity': 0.16, 'underlay-padding': 7, 'underlay-shape': 'ellipse',
      'transition-property': 'opacity, underlay-opacity, border-width', 'transition-duration': 250 } },
    { selector: 'node[kind="scenario"]', style: { shape: 'diamond', 'font-size': 12, 'font-weight': 700, 'underlay-opacity': 0.3, 'underlay-padding': 14, color: '#fff' } },
    { selector: 'node[kind="investigation"]', style: { shape: 'ellipse', 'background-color': '#16233F', 'border-width': 2, 'font-size': 11, 'font-weight': 600, color: '#E5E7EB' } },
    { selector: 'node[kind="paper"]', style: { shape: 'round-rectangle', 'background-color': '#111827', 'font-size': 7.5, color: '#9CA3AF', 'underlay-opacity': 0.06, 'min-zoomed-font-size': 9 } },
    { selector: 'node[kind="material"]', style: { shape: 'hexagon', 'background-color': '#1B1530', 'border-color': '#8B5CF6', 'underlay-color': '#8B5CF6' } },
    { selector: 'node[kind="equipment"]', style: { shape: 'triangle', 'background-color': '#0F2A2A', 'border-color': '#22D3EE', 'underlay-color': '#22D3EE' } },
    { selector: 'node[kind="coverage_gap"], node[kind="quality_gap"]', style: { shape: 'ellipse', 'background-color': '#05070d', 'border-style': 'dashed', 'border-width': 2,
      'underlay-opacity': 0.22, color: '#F3F4F6', 'font-size': 8.5 } },
    { selector: 'node[kind="quality_gap"]', style: { 'border-style': 'dashed', 'background-color': '#0d0a05', 'border-color': '#F2B84B', 'underlay-color': '#F2B84B' } },
    { selector: 'node[kind="planned"]', style: { 'background-color': '#14070d', 'border-style': 'dashed', 'border-width': 2 } },
    { selector: 'node[kind="partial_gravity"]', style: { shape: 'round-diamond', 'background-color': '#1A0812', 'border-width': 2, 'border-color': RED, 'underlay-color': RED, 'underlay-opacity': 0.22, color: '#F9C3D5', 'font-size': 8.5 } },
    { selector: 'edge', style: { width: 'mapData(weight, 0, 1, 0.5, 2.6)', 'line-color': 'data(color)', opacity: 0.38, 'curve-style': 'bezier',
      'target-arrow-shape': 'none', 'transition-property': 'opacity, width', 'transition-duration': 250 } },
    { selector: 'edge[kind="planned"], edge[kind="proposed"]', style: { 'line-style': 'dashed', 'line-dash-pattern': [5, 4] } },
    { selector: '.faded', style: { opacity: 0.08 } },
    { selector: 'node.highlight', style: { 'underlay-opacity': 0.42, 'border-width': 3 } },
    { selector: 'edge.highlight', style: { opacity: 0.95 } },
    { selector: 'node:selected', style: { 'border-color': '#ffffff', 'border-width': 3, 'underlay-opacity': 0.55 } },
    { selector: '.pulse', style: { 'underlay-opacity': 0.4 } },
  ] as unknown) as cytoscape.Stylesheet[]
}

function edgeColor(kind: EdgeKind, sourceAccent?: string) {
  if (kind === 'matches') return accentColor(sourceAccent)
  return ({ reports: '#64748B', tested: '#8B5CF6', informs: '#38BDF8', planned: RED, proposed: '#F472B6' } as Record<string, string>)[kind] ?? '#64748B'
}

function GapDetail({ x }: { x: GapExplanation }) {
  const { openSource } = useAppState()
  return <div className="gap-detail" data-testid="gap-explanation">
    <div className={`gap-type ${x.gap_type}`}>{x.gap_type === 'coverage'
      ? <><strong>∅ Coverage gap</strong> — no record in our catalogue combines these conditions.</>
      : <><strong>⚠ Evidence-quality gap</strong> — related records exist but cannot support a reliable conclusion.</>}</div>
    <div className="kicker">Requested combination</div>
    <div className="status-row">{x.requested.map(r => <span key={r.dim} className="chip">{r.dim}: <span className="mono">{r.value}</span></span>)}</div>
    <div className="kicker">Evidence by dimension</div>
    <div className="status-row">
      {x.with_evidence.map(dim => <span key={dim} className="dim-chip matched">✓ {dim}</span>)}
      {x.without_evidence.map(dim => <span key={dim} className="dim-chip mismatched">✗ {dim}</span>)}
    </div>
    <p className="note">✓ some catalogue record matches this condition · ✗ no catalogue record matches it.</p>
    <div className="kicker">Records considered</div>
    <p className="note"><span className="mono">{x.considered.toLocaleString()}</span> catalogue records compared · <span className="mono">{x.qualifying_unique}</span> match every condition</p>
    {x.exclusions.length > 0 && <><div className="kicker">Why records did not match</div>
      <table className="table compact"><tbody>{x.exclusions.map(e => <tr key={e.inv + e.reason}><td>{e.inv}</td><td>{e.reason}</td><td className="mono">{e.count}</td></tr>)}</tbody></table></>}
    {x.gap_type === 'evidence_quality' && x.quality.length > 0 && <><div className="kicker">Quality limitations</div>
      <ul className="list-plain note">{x.quality.map(q => <li key={q.label}><strong>{q.label}</strong> — {q.detail}</li>)}</ul></>}
    {x.examples.length > 0 && <><div className="kicker">{x.gap_type === 'coverage' ? 'Nearest records' : 'Related records'}</div>
      <ul className="list-plain">{x.examples.map(r => <li key={r.record}><button className="btn sm" onClick={() => openSource({ kind: 'record', recordId: r.record })}>{r.label}</button>
        <div className="note">{Object.entries(r.states).map(([k, v]) => `${k}: ${v}`).join(' · ')}</div></li>)}</ul></>}
    {x.related_studies && x.related_studies.length > 0 && <><div className="kicker">Related partial-gravity studies (outside the catalogue)</div>
      <ul className="list-plain" data-testid="related-studies">{x.related_studies.map(r => <li key={r.id} className="note"><strong>{r.title}</strong><br />
        {r.matches.length > 0 && <span className="dim-chip matched">✓ {r.matches.join(' · ')}</span>} {r.differs.length > 0 && <span className="dim-chip mismatched">✗ {r.differs.join(' · ')}</span>}</li>)}</ul></>}
    <div className="kicker">What would address it</div>
    <p className="note suggestion">{x.suggestion} <span className="badge candidate">Proposal · needs review</span></p>
    <p className="note faint">Scope: our indexed catalogue only — not proof that no such NASA experiment exists.</p>
  </div>
}

function Drawer({ node, graphEdges, onFocus, focusId, setFocusId }: { node: GraphNode | null; graphEdges: ReturnType<typeof buildGraph>['edges']; onFocus: (id: string) => void; focusId: string | null; setFocusId: (id: string | null) => void }) {
  const { spine, setScenario, openSource } = useAppState()
  const go = (p: string) => { window.location.hash = `#/${p}` }
  if (!node) return <aside className="card drawer" aria-label="Evidence details"><div className="card-h"><div><h2>Evidence details</h2><p>Select a node to inspect its provenance.</p></div></div>
    <ul className="list-plain note"><li>Node size for investigations = source-record count (not independent experiments).</li>
      <li>Ring distance in scenario mode = matching completeness, not scientific applicability.</li>
      <li>Every edge carries a deterministic explanation; no edge is AI-proposed.</li>
      <li>∅ coverage gap: no record combines the conditions. ⚠ evidence-quality gap: records exist but cannot support a reliable conclusion.</li>
      <li>Gaps describe our catalogue only — not what NASA has or has not tested.</li></ul></aside>
  const links = graphEdges.filter(e => e.source === node.id || e.target === node.id)
  const d = node.detail as Record<string, unknown>
  const label = node.kind === 'planned' ? 'planned' : node.kind.includes('gap') ? 'unknown' : node.kind === 'scenario' ? 'planned' : 'measured'
  return <aside className="card drawer" aria-label="Evidence details" data-testid="evidence-drawer">
    <div className="kicker">{human(node.kind)}</div>
    <h2 style={{ fontSize: 16, margin: '4px 0 6px' }}>{node.label}</h2>
    <div className="status-row" style={{ marginBottom: 8 }}>
      <span className={`badge ${label}`}>{node.kind === 'coverage_gap' ? 'Coverage gap' : node.kind === 'quality_gap' ? 'Evidence-quality gap' : node.kind === 'scenario' ? 'Proposed preset' : node.kind === 'planned' ? 'Planned' : node.kind === 'paper' ? 'Title only' : 'Indexed source'}</span>
      <button className="btn sm" aria-pressed={focusId === node.id} onClick={() => setFocusId(focusId === node.id ? null : node.id)} data-testid="focus-mode"><Focus size={11} />{focusId === node.id ? 'Exit focus' : 'Focus'}</button>
    </div>
    <p className="note" style={{ fontSize: 12, color: '#D1D5DB' }}>{node.summary}</p>
    <p className="note" style={{ marginTop: 6 }}><strong>Source:</strong> {node.provenance}</p>
    {(node.kind === 'coverage_gap' || node.kind === 'quality_gap') && d.explanation !== undefined && <GapDetail x={d.explanation as GapExplanation} />}
    {node.kind === 'investigation' && <dl className="kv" style={{ marginTop: 8 }}>
      <dt>DOI</dt><dd className="mono">{String(d.doi)}</dd><dt>Scale</dt><dd>{String(d.scale)}</dd><dt>Gravity</dt><dd>{String(d.gravity)}</dd>
      <dt>Materials</dt><dd>{Object.keys(d.materials as object).slice(0, 6).join(', ').replaceAll('"', '')}</dd>
</dl>}
    {node.kind === 'investigation' && (spine.source_findings ?? []).some(f => `inv:${f.inv}` === node.id) && <><div className="kicker" style={{ marginTop: 10 }}>Key findings</div>
      <ul className="list-plain" data-testid="drawer-findings">{(spine.source_findings ?? []).filter(f => `inv:${f.inv}` === node.id).map((f, i) => { const r = spine.references?.[f.ref]
        return <li key={i} className="note">{f.statement} {r && <a href={r.url} target="_blank" rel="noreferrer" className="src-link">{r.id} p.{f.pdf_page}</a>}</li> })}</ul></>}
    {node.kind === 'partial_gravity' && (() => { const st = d.study as import('../types/spine').PartialGravityEvidence
      return <div className="paper" style={{ marginTop: 8 }} data-testid="study-detail"><dl className="kv">
        <dt>Evidence type</dt><dd>{st.kind === 'measured_simulated_lunar_g' ? 'Measured · simulated lunar gravity' : st.kind === 'measured_parabolic_flight' ? 'Measured · parabolic flight' : st.kind === 'review' ? 'Research review' : 'Planned'}</dd>
        <dt>Platform</dt><dd>{st.platform}</dd><dt>Gravity</dt><dd>{st.gravity}{st.gravity_note ? ` (${st.gravity_note})` : ''}</dd>
        <dt>Material</dt><dd>{st.material}</dd>{st.oxygen && <><dt>Oxygen</dt><dd>{st.oxygen}</dd></>}{st.pressure && <><dt>Pressure</dt><dd>{st.pressure}</dd></>}{st.airflow && <><dt>Airflow</dt><dd>{st.airflow}</dd></>}</dl>
        {st.measurements.length > 0 && <table className="table compact" style={{ marginTop: 6 }}><thead><tr><th>Measured</th><th>Lunar-g</th><th>1 g</th></tr></thead><tbody>
          {st.measurements.map(m => <tr key={m.parameter}><td>{m.parameter}</td><td className="mono">{m.value} {m.unit}</td><td className="mono">{m.one_g ?? '—'} {m.one_g !== null ? m.unit : ''}</td></tr>)}</tbody></table>}
        {typeof d.url === 'string' && <a className="src-link" href={d.url} target="_blank" rel="noreferrer">{st.locator} · open source</a>}</div> })()}
    {node.kind === 'scenario' && <dl className="kv" style={{ marginTop: 8 }}>{Object.entries(d.conditions as Record<string, { display: string; source: string | null }>).map(([k, c]) =>
      <Fragment key={k}><dt>{k}</dt><dd>{c.display}{c.source ? <> · <a href={spine.scenario_sources[c.source].url} target="_blank" rel="noreferrer">{spine.scenario_sources[c.source].id}</a></> : ''}</dd></Fragment>)}</dl>}
    {node.kind === 'paper' && <button className="btn" style={{ marginTop: 8 }} onClick={() => openSource({ kind: 'paper', paperId: node.id })}>Open source panel</button>}
    {node.kind === 'planned' && <ul className="list-plain note" style={{ marginTop: 8 }}>{(d.does_not_establish as string[]).map(x => <li key={x}>• {x}</li>)}</ul>}
    <div className="kicker" style={{ marginTop: 12 }}>Backlinks ({links.length})</div>
    <ul className="list-plain" style={{ marginTop: 6 }}>{links.slice(0, 14).map(e => <li key={e.id} className="note">
      <button className="btn" style={{ padding: '2px 7px', marginRight: 6 }} onClick={() => onFocus(e.source === node.id ? e.target : e.source)}>{e.kind}</button>{e.explanation}</li>)}</ul>
    <div className="status-row" style={{ marginTop: 12 }}>
      {node.kind === 'scenario' && <button className="btn primary" onClick={() => { setScenario(node.id.split(':')[1]); go('simulator') }}>Open in Simulator</button>}
      {node.scenario && <button className="btn primary" onClick={() => { setScenario(node.scenario!); go('simulator') }}>Open in Simulator</button>}
    </div>
  </aside>
}

export default function EvidenceGraphPage() {
  const { spine, scenarioId, setScenario, query } = useAppState()
  const graph = useMemo(() => buildGraph(spine, { flow: query.flow }), [spine, query.flow])
  const container = useRef<HTMLDivElement>(null); const cyRef = useRef<Core | null>(null); const layoutRef = useRef<cytoscape.Layouts | null>(null)
  const [selected, setSelected] = useState<GraphNode | null>(null)
  const [kinds, setKinds] = useState<Set<NodeKind>>(new Set(NODE_KINDS.map(k => k.kind)))
  const [edgeKinds, setEdgeKinds] = useState<Set<EdgeKind>>(new Set(EDGE_KINDS))
  const [progressive, setProgressive] = useState(false)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [focusId, setFocusId] = useState<string | null>(null)
  const [layoutMode, setLayoutMode] = useState<'organic' | 'rings'>('organic')
  const [listView, setListView] = useState(false)
  const [search, setSearch] = useState('')
  const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

  const visible = useMemo(() => {
    const base = graph.nodes.filter(n => kinds.has(n.kind) && (n.tier === 'core' || progressive || (n.parent !== undefined && expanded.has(n.parent))))
    if (!focusId) return base
    const hood = new Set([focusId, ...graph.edges.filter(e => e.source === focusId || e.target === focusId).flatMap(e => [e.source, e.target])])
    return base.filter(n => hood.has(n.id))
  }, [graph, kinds, progressive, expanded, focusId])

  useEffect(() => {
    if (!container.current || listView) return
    const ids = new Set(visible.map(n => n.id))
    const accent = Object.fromEntries(graph.nodes.map(n => [n.id, n.accent]))
    const elements: ElementDefinition[] = [
      ...visible.map(n => ({ data: { id: n.id, label: n.label, kind: n.kind, size: n.size, color: accentColor(n.accent) } })),
      ...graph.edges.filter(e => ids.has(e.source) && ids.has(e.target) && edgeKinds.has(e.kind))
        .map(e => ({ data: { id: e.id, source: e.source, target: e.target, kind: e.kind, weight: e.weight, color: edgeColor(e.kind, accent[e.source]) } })),
    ]
    const cy = cytoscape({ container: container.current, elements, style: stylesheet(), minZoom: 0.25, maxZoom: 3, pixelRatio: 'auto' })
    cyRef.current = cy
    cy.on('mouseover', 'node', e => {
      const hood = e.target.closedNeighborhood()
      cy.elements().not(hood).addClass('faded'); hood.addClass('highlight')
    })
    cy.on('mouseout', 'node', () => cy.elements().removeClass('faded highlight'))
    cy.on('tap', 'node', e => {
      const node = graph.nodes.find(n => n.id === e.target.id()) ?? null
      setSelected(node)
      const scen = node?.kind === 'scenario' ? node.id : node?.scenario ? `scenario:${node.scenario}` : null
      if (scen) setExpanded(x => x.has(scen) ? x : new Set([...x, scen]))
      cy.animate({ center: { eles: e.target }, zoom: Math.max(cy.zoom(), 1.1) }, { duration: reduce ? 0 : 600, easing: 'ease-in-out-cubic' })
    })
    cy.on('tap', e => { if (e.target === cy) setSelected(null) })
    let pulse: ReturnType<typeof setInterval> | undefined
    if (!reduce) pulse = setInterval(() => cy.nodes('[kind="coverage_gap"], [kind="quality_gap"], [kind="planned"]').toggleClass('pulse'), 1400)
    return () => { if (pulse) clearInterval(pulse); layoutRef.current?.stop(); layoutRef.current = null; cy.stop(true, true); cy.elements().stop(true, true); cy.destroy(); cyRef.current = null }
  }, [visible, edgeKinds, graph, listView, reduce])

  useEffect(() => {
    const cy = cyRef.current; if (!cy) return
    const rank = concentricRank(graph, scenarioId)
    const layout = layoutMode === 'rings'
      ? cy.layout({ name: 'concentric', concentric: (n: cytoscape.NodeSingular) => rank[n.id()] ?? 1, levelWidth: () => 1.5, minNodeSpacing: 22,
          animate: !reduce, animationDuration: 900, animationEasing: 'ease-in-out-cubic', fit: true, padding: 30 } as cytoscape.LayoutOptions)
      : cy.layout({ name: 'cose', animate: reduce ? false : 'end', animationDuration: 1100, animationEasing: 'ease-in-out-cubic', randomize: false, nodeRepulsion: () => 9000, idealEdgeLength: () => 70,
          edgeElasticity: () => 80, gravity: 0.35, numIter: 1200, fit: true, padding: 30 } as cytoscape.LayoutOptions)
    layoutRef.current = layout
    layout.run()
    return () => { if (!cy.destroyed()) layout.stop() }
  }, [layoutMode, scenarioId, graph, visible, edgeKinds, listView, reduce])

  const focus = (id: string) => {
    const cy = cyRef.current; const node = graph.nodes.find(n => n.id === id)
    if (node) setSelected(node)
    if (!cy) return
    const el = cy.getElementById(id); if (el.empty()) return
    cy.$(':selected').unselect(); el.select()
    cy.animate({ center: { eles: el }, zoom: 1.3 }, { duration: reduce ? 0 : 600 })
  }
  const runSearch = () => {
    const hit = visible.find(n => n.label.toLowerCase().includes(search.toLowerCase()) || n.summary.toLowerCase().includes(search.toLowerCase()))
    if (hit) focus(hit.id)
  }
  const toggle = <T,>(set: Set<T>, v: T) => { const n = new Set(set); if (n.has(v)) n.delete(v); else n.add(v); return n }
  const counts = useMemo(() => Object.fromEntries(NODE_KINDS.map(k => [k.kind, visible.filter(n => n.kind === k.kind).length])), [visible])

  return <div className="page"><div className="graph-grid">
    <aside className="card" aria-label="Graph controls" style={{ overflowY: 'auto' }}>
      <div className="card-h"><div><h2><Network size={14} /> Evidence graph</h2><p>{visible.length} nodes · deterministic relationships</p></div></div>
      <label className="note" htmlFor="graph-search">Search</label>
      <div style={{ display: 'flex', gap: 6, margin: '4px 0 10px' }}>
        <input id="graph-search" className="input" value={search} placeholder="FLEX, PMMA, gap…" onChange={e => setSearch(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') runSearch() }} />
        <button className="btn" onClick={runSearch} aria-label="Find node"><Search size={13} /></button>
      </div>
      <div className="kicker">Layout</div>
      <div className="seg" role="group" aria-label="Layout" style={{ width: '100%', margin: '6px 0 10px' }}>
        <button className="blue" style={{ flex: 1 }} aria-pressed={layoutMode === 'organic'} onClick={() => setLayoutMode('organic')}>Organic</button>
        <button className={scenarioId === 'iss_cabin' ? 'blue' : 'red'} style={{ flex: 1 }} aria-pressed={layoutMode === 'rings'} onClick={() => setLayoutMode('rings')}><Crosshair size={12} />Scenario rings</button>
      </div>
      <div className="kicker">Scenario focus</div>
      <div className="seg" role="group" aria-label="Graph scenario" style={{ width: '100%', margin: '6px 0 10px' }}>
        {spine.scenarios.map(s => <button key={s.id} className={s.accent} style={{ flex: 1 }} aria-pressed={scenarioId === s.id} onClick={() => { setScenario(s.id); setLayoutMode('rings') }}>{s.name}</button>)}
      </div>
      <div className="kicker">Node types</div>
      <ul className="list-plain" style={{ margin: '6px 0 10px', gap: 4 }}>{NODE_KINDS.map(k => <li key={k.kind}><label className="chip" style={{ width: '100%' }}>
        <input type="checkbox" checked={kinds.has(k.kind)} onChange={() => setKinds(toggle(kinds, k.kind))} />
        <span className={`legend-shape ${k.shape}`} style={{ color: k.kind === 'quality_gap' ? '#F2B84B' : k.kind === 'material' ? '#8B5CF6' : k.kind === 'equipment' ? '#22D3EE' : (k.kind === 'planned' || k.kind === 'partial_gravity') ? RED : '#8EA3C7' }} />
        {k.label}<span className="mono faint" style={{ marginLeft: 'auto' }}>{counts[k.kind]}</span></label></li>)}</ul>
      <div className="kicker">Edge types</div>
      <div className="status-row" style={{ margin: '6px 0 10px' }}>{EDGE_KINDS.map(k => <label key={k} className="chip"><input type="checkbox" checked={edgeKinds.has(k)} onChange={() => setEdgeKinds(toggle(edgeKinds, k))} />{k}</label>)}</div>
      <label className="chip" style={{ width: '100%', marginBottom: 10 }}><input type="checkbox" checked={progressive} onChange={e => setProgressive(e.target.checked)} /><Sparkles size={12} /> Show all detailed gaps</label>
      {expanded.size > 0 && !progressive && <p className="note" style={{ margin: '-4px 0 10px' }}>Detailed gaps revealed for {[...expanded].map(e => spine.scenarios.find(s => `scenario:${s.id}` === e)?.name).join(', ')}.</p>}
      {focusId && <button className="btn sm" style={{ marginBottom: 10 }} onClick={() => setFocusId(null)}><Focus size={11} />Exit focus mode</button>}
      <div className="kicker">Scenario legend</div>
      <p className="note" style={{ margin: '4px 0 10px' }}><span className="dot blue" /> ISS Cabin &nbsp; <span className="dot red" /> Lunar Habitat. ∅ coverage gap · ⚠ evidence-quality gap · dashed edges = planned/proposed. Click a scenario or gap to reveal detailed gaps.</p>
      <div className="status-row">
        <button className="btn" onClick={() => setListView(v => !v)} aria-pressed={listView}><List size={13} />{listView ? 'Graph view' : 'List view'}</button>
        <button className="btn" onClick={() => { setKinds(new Set(NODE_KINDS.map(k => k.kind))); setEdgeKinds(new Set(EDGE_KINDS)); setProgressive(false); setExpanded(new Set()); setFocusId(null); setLayoutMode('organic'); setSelected(null); setSearch('') }}><RotateCcw size={13} />Reset</button>
      </div>
    </aside>
    <div className="graph-canvas" data-testid="graph-canvas">
      {!listView && <div ref={container} className="cy" aria-label="Interactive evidence graph. Use List view for an accessible table." role="application" />}
      {listView && <div className="list-view"><table className="table" aria-label="Graph nodes"><thead><tr><th>Type</th><th>Node</th><th>Summary</th><th>Links</th></tr></thead>
        <tbody>{visible.map(n => <tr key={n.id}><td>{human(n.kind)}</td><td><button className="btn" onClick={() => { setSelected(n); const sc = n.kind === 'scenario' ? n.id : n.scenario ? `scenario:${n.scenario}` : null; if (sc) setExpanded(x => new Set([...x, sc])) }}>{n.label}</button></td><td className="note">{n.summary}</td>
          <td className="mono">{graph.edges.filter(e => e.source === n.id || e.target === n.id).length}</td></tr>)}</tbody></table></div>}
      {!listView && <div className="graph-hud"><span className="chip">Investigation node size = source records, not experiments</span>
        {layoutMode === 'rings' && <span className="chip">Inner ring = more dimensions matched (not applicability)</span>}</div>}
    </div>
    <Drawer node={selected} graphEdges={graph.edges} onFocus={focus} focusId={focusId} setFocusId={setFocusId} />
  </div></div>
}

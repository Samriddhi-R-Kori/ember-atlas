import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, BookOpen, Check, CircleSlash, Crosshair, ExternalLink, Flame, Gauge, Moon, Orbit, RotateCcw, ShieldAlert, Wind, X } from 'lucide-react'
import { advise, buildInsights, KIND_LABEL, presetSummary, snapshot, TOPIC_LABEL, type Insight, type InsightTopic } from '../science/fireSafety'
import { primaryInvestigations, useAppState, UI_RANGES } from '../state/AppState'
import { analyze, COVERAGE_LABEL, DIM_LABEL, enabledDims, type Query, type QueryDim, type RecordMatch } from '../science/gapEngine'
import { interpolate, measuredPoints, eligibleGroups, type XKey } from '../science/interpolation'
import FlameCanvas from '../components/flame/FlameCanvas'
import { describeRegime, flameParams } from '../components/flame/flameModel'
import MeasurementChart from '../components/charts/MeasurementChart'
import { EvidenceBadge } from '../components/shared/Evidence'
import { displayValue, human, trim, unitLabel } from '../lib/format'
import type { Dim, NumericDim, Spine, SpineRecord } from '../types/spine'

const NUM: { dim: NumericDim | 'gravity'; label: string; icon: typeof Gauge }[] = [
  { dim: 'gravity', label: 'Gravity', icon: Gauge }, { dim: 'flow', label: 'Airflow', icon: Wind },
  { dim: 'pressure', label: 'Pressure', icon: Gauge }, { dim: 'oxygen', label: 'Ambient O₂', icon: Flame },
]

function fmtControl(dim: string, v: number) {
  return dim === 'pressure' ? `${trim(v / 1000, 5)} kPa` : dim === 'oxygen' ? `${trim(v * 100, 3)} %` : dim === 'flow' ? `${trim(v, 3)} m/s` : `${trim(v, 3)} g`
}
export const recordName = (spine: Spine, r: SpineRecord) => `${spine.investigations.find(i => i.id === r.inv)?.short ?? r.inv} ${r.inv === 'PSI-69' ? 'Test ' : ''}${r.ident ?? ''}`.trim()
function recordValue(r: SpineRecord, d: Dim) {
  if (d === 'gravity') return r.c.gravity.s === 'reported' ? 'μg' : '—'
  if (d === 'material') return r.c.material.label?.replaceAll('"', '') ?? '—'
  const e = r.c[d]
  if (e.s !== 'reported' || e.v === undefined) return '—'
  return fmtControl(d, e.v)
}

function RangeIndicator({ spine, dim }: { spine: Spine; dim: NumericDim | 'gravity' }) {
  const r = UI_RANGES[dim]
  const spans = dim === 'gravity'
    ? [{ inv: 'ISS', min: 0, max: 0 }]
    : spine.investigations.filter(i => i.condition_ranges[dim].min !== null).map(i => ({ inv: i.short, min: i.condition_ranges[dim].min!, max: i.condition_ranges[dim].max! }))
  const pct = (v: number) => Math.max(0, Math.min(100, (v - r.min) / (r.max - r.min) * 100))
  return <div>
    <div className="coverage-bar" aria-hidden>{spans.map(s => <span key={s.inv} style={{ left: `${pct(s.min)}%`, width: `${Math.max(0.8, pct(s.max) - pct(s.min))}%` }} title={`${s.inv}: ${s.min}–${s.max}`} />)}</div>
    <div className="coverage-legend"><span>indexed data: {dim === 'gravity' ? 'ISS (orbital μg)' : spans.length ? spans.map(s => s.inv).join(', ') : 'none'}</span></div>
  </div>
}

function Controls() {
  const { spine, query, updateQuery, resetScenario, scenarioId, setScenario, applyMeasuredConditions, measuredFrom } = useAppState()
  const shown = useMemo(() => new Set(primaryInvestigations(spine).map(i => i.id)), [spine])
  const materialOptions = useMemo(() => primaryInvestigations(spine).flatMap(i => Object.keys(i.materials).map(m => ({ cls: i.material_class, label: m, inv: i.short }))), [spine])
  const setDim = (dim: NumericDim | 'gravity', patch: Partial<QueryDim>) => updateQuery({ [dim]: { ...query[dim], ...patch } } as Partial<Query>)
  const demos = (spine.demonstration_records ?? []).filter(d => spine.records.some(r => r.id === d.record_id && shown.has(r.inv)))
  return <section className="card area-controls" aria-label="Scenario controls">
    <div className="card-h"><div><h2>Scenario controls</h2><p>Explore conditions against the indexed evidence.</p></div>
      <button className="btn" onClick={resetScenario} title="Restore preset values"><RotateCcw size={13} />Reset</button></div>
    <div className="seg" role="group" aria-label="Scenario preset" style={{ width: '100%' }}>
      {spine.scenarios.map(s => <button key={s.id} className={s.accent} style={{ flex: 1, justifyContent: 'center' }} aria-pressed={scenarioId === s.id && !measuredFrom} onClick={() => setScenario(s.id)}>{s.name}</button>)}
    </div>
    {demos.length > 0 && <div className="control">
      <div className="control-head"><span>Demonstration presets</span><span className="faint">measured records</span></div>
      <div className="demo-list">{demos.map(d => <button key={d.id} className="demo-chip" data-testid={`demo-${d.id}`} aria-pressed={measuredFrom?.recordId === d.record_id}
        title={d.why} onClick={() => applyMeasuredConditions(d.record_id)}><Crosshair size={12} />{d.label}</button>)}</div>
    </div>}
    <div className="control">
      <label className="control-head" htmlFor="material"><span>Material</span><span className="faint">{query.material.label ? 'specific' : query.material.cls ? 'class' : 'any'}</span></label>
      <select id="material" className="select" value={query.material.label ? `l:${query.material.label}` : query.material.cls ? `c:${query.material.cls}` : ''}
        onChange={e => { const v = e.target.value
          if (!v) updateQuery({ material: { cls: null, label: null } })
          else if (v.startsWith('c:')) updateQuery({ material: { cls: v.slice(2), label: null } })
          else { const o = materialOptions.find(m => m.label === v.slice(2)); updateQuery({ material: { cls: o?.cls ?? null, label: v.slice(2) } }) } }}>
        <option value="">Any material</option>
        <optgroup label="Material class">{Object.entries(spine.material_classes).map(([k, m]) => <option key={k} value={`c:${k}`}>{m.label}</option>)}</optgroup>
        <optgroup label="Source label">{materialOptions.map(m => <option key={m.inv + m.label} value={`l:${m.label}`}>{m.label.replaceAll('"', '')} · {m.inv}</option>)}</optgroup>
        {query.material.label && !materialOptions.some(m => m.label === query.material.label) && <option value={`l:${query.material.label}`}>{query.material.label.replaceAll('"', '')}</option>}
      </select>
    </div>
    {NUM.map(({ dim, label, icon: Icon }) => {
      const r = UI_RANGES[dim]; const q = query[dim]
      return <div className="control" key={dim}>
        <div className="control-head">
          <label><input type="checkbox" checked={q.enabled} onChange={e => setDim(dim, { enabled: e.target.checked })} aria-label={`Use ${label} in matching`} /><Icon size={13} />{label}</label>
          <span className="mono">{q.enabled ? fmtControl(dim, q.value) : <span className="faint" title="Not used in matching; move the slider or tick the box to include it">{fmtControl(dim, q.value)} · any</span>}</span>
        </div>
        <input className="range" type="range" min={r.min} max={r.max} step={r.step} value={Math.min(r.max, Math.max(r.min, q.value))} data-off={!q.enabled || undefined}
          aria-label={`${label} slider`} onChange={e => setDim(dim, { enabled: true, value: Number(e.target.value), h: r.step / 2 })} />
        <RangeIndicator spine={spine} dim={dim} />
      </div>
    })}
  </section>
}

function DimChip({ m, d }: { m: RecordMatch; d: Dim }) {
  const st = m.dims[d].state
  const Icon = st === 'matched' ? Check : st === 'mismatched' ? X : st === 'restricted' ? ShieldAlert : CircleSlash
  const title = st === 'matched' ? 'Matches the request' : st === 'mismatched' ? 'Differs from the request' : st === 'restricted' ? `Value not usable for matching: ${m.dims[d].why ?? 'unit or method unresolved'}` : m.dims[d].why ?? human(st)
  return <span className={`dim-chip ${st}`} title={`${DIM_LABEL[d]}: ${title}`}><Icon size={10} />{DIM_LABEL[d]} <span className="mono">{recordValue(m.record, d)}</span></span>
}

function EvidenceRow({ m, dims }: { m: RecordMatch; dims: Dim[] }) {
  const { spine, openSource, applyMeasuredConditions } = useAppState()
  const metric = Object.entries(m.record.m).find(([, v]) => v.s === 'reported')
  const label = metric ? spine.metrics.find(x => x.key === metric[0] && x.investigation === m.record.inv)?.label : null
  return <li className="evidence-row" data-testid="evidence-row">
    <div className="evidence-row-h">
      <strong>{recordName(spine, m.record)}</strong><span className="faint mono">row {m.record.row}{m.record.dup ? ' · repeat' : ''}</span>
      {metric && <span className="mono metric-inline" title={label ?? ''}>{label}: {displayValue(metric[1].v, metric[1].u)}</span>}
    </div>
    <div className="status-row">{dims.map(d => <DimChip key={d} m={m} d={d} />)}</div>
    <div className="status-row">
      <button className="btn sm" onClick={() => openSource({ kind: 'record', recordId: m.record.id })}>Inspect source</button>
      <button className="btn sm" onClick={() => applyMeasuredConditions(m.record.id)} data-testid="use-measured"><Crosshair size={11} />Use measured conditions</button>
    </div>
  </li>
}

function CoverageCard() {
  const { spine, query, measuredFrom } = useAppState()
  const a = useMemo(() => analyze(spine.records, query), [spine, query])
  const [all, setAll] = useState(false)
  const dims = enabledDims(query)
  const showDims: Dim[] = dims.length ? dims : ['gravity', 'oxygen', 'pressure']
  const source = measuredFrom ? spine.records.find(r => r.id === measuredFrom.recordId) : null
  const uniqueEligible = a.eligible.filter(m => !m.record.dup)
  const list = all ? a.eligible : a.eligible.slice(0, 4)
  return <section className="card area-coverage" aria-label="Evidence Coverage" data-testid="evidence-coverage">
    <div className="card-h"><div><div className="step-kicker" title="Measured records ordered by how closely their reported conditions match yours (deterministic strict matching)">Rank</div><h2>Evidence Coverage</h2>
      <p>{source ? <>Conditions loaded from <strong>{recordName(spine, source)}</strong> (row {source.row}){measuredFrom!.unconstrained.length ? <> · open: {measuredFrom!.unconstrained.map(u => DIM_LABEL[u.dim as Dim]).join(', ')}</> : null}</>
        : `${dims.map(d => DIM_LABEL[d]).join(' · ') || 'No condition'} compared with every measured record`}</p></div>
      <div className="status-row">
        <span className={`badge ${a.coverage === 'covered' ? 'measured' : a.coverage === 'sparse' ? 'restricted' : 'fail'}`} data-testid="coverage-status">{COVERAGE_LABEL[a.coverage]}</span>
      </div>
    </div>
    <div className="cov-layout">
      <div className="tiles" aria-live="polite">
        <div className="tile"><span className="mono big" data-testid="eligible-count">{a.eligibleEvidenceCount}</span><span>Matching measurements</span><small>exact strict matches</small></div>
        <div className="tile"><span className="mono big">{a.sourceRecordCount}</span><span>Source rows</span><small>incl. repeated rows</small></div>
      </div>
      <div className="evidence-lists">
        {a.eligible.length > 0 ? <>
          <div className="kicker">Matching evidence ({uniqueEligible.length})</div>
          <ul className="list-plain" data-testid="matching-evidence">{list.map(m => <EvidenceRow key={m.record.id} m={m} dims={showDims} />)}</ul>
          {a.eligible.length > 4 && <button className="btn sm" onClick={() => setAll(v => !v)}>{all ? 'Show fewer' : `Show all ${a.eligible.length}`}</button>}
        </> : <>
          <div className="kicker">Nearest available evidence</div>
          <p className="note" style={{ marginBottom: 6 }} data-testid="no-match-note">No measurements match these conditions in the current catalogue. Closest records, ranked by how many conditions match:</p>
          <ul className="list-plain" data-testid="nearest-evidence">{a.nearest.slice(0, 4).map(m => <EvidenceRow key={m.record.id} m={m} dims={showDims} />)}</ul>
        </>}
      </div>
    </div>
  </section>
}

function FlamePanel() {
  const { query } = useAppState()
  const inputs = { gravity: query.gravity.enabled ? query.gravity.value : 0, flow: query.flow.enabled ? query.flow.value : 0,
    oxygen: query.oxygen.enabled ? query.oxygen.value : 0.21, pressureKpa: query.pressure.enabled ? query.pressure.value / 1000 : 101.3,
    materialClass: query.material.cls, materialLabel: query.material.label }
  const f = flameParams(inputs)
  return <section className="card area-flame" aria-label="Flame visualizer">
    <div className="card-h"><div><h2>Flame visualizer</h2><p>{inputs.gravity > 0.02 ? 'Buoyant convection shapes the flame.' : 'No buoyant rise: transport by diffusion and forced flow.'}</p></div>
      <a className="chip" href="#/resources" title="How the renderer works and what it does not claim">Illustrative · method</a></div>
    <div className="flame-stage">
      <FlameCanvas {...inputs} />
      <div className="flame-overlay"><div className="status-row">{describeRegime(f).map(x => <span key={x} className="chip">{x}</span>)}</div></div>
    </div>
  </section>
}

// Records whose material agrees with the selected material (class or literal label), independent of other conditions.
export function materialMatches(r: SpineRecord, q: Query) {
  if (q.material.label) return (r.c.material.label ?? '').replaceAll('"', '').replace(/\s+/g, ' ') === q.material.label.replaceAll('"', '').replace(/\s+/g, ' ')
  if (q.material.cls) return r.c.material.cls === q.material.cls
  return true
}

function ChartPanel() {
  const { spine, query, investigation, setInvestigation, openSource } = useAppState()
  const invs = primaryInvestigations(spine)
  const invId = invs.some(i => i.id === investigation) ? investigation : invs[0].id
  // Material drives the investigation: choosing a fuel or material shows the investigation that measured it.
  const materialInv = useMemo(() => {
    if (query.material.label) return invs.find(i => Object.keys(i.materials).some(m => m.replaceAll('"', '') === query.material.label!.replaceAll('"', '')))?.id ?? null
    if (query.material.cls) return invs.find(i => i.material_class === query.material.cls)?.id ?? null
    return null
  }, [query.material.label, query.material.cls, invs])
  useEffect(() => { if (materialInv && materialInv !== investigation) setInvestigation(materialInv) }, [materialInv]) // eslint-disable-line react-hooks/exhaustive-deps
  const metrics = spine.metrics.filter(m => m.investigation === invId)
  const usable = metrics.filter(m => !m.restricted)
  const [metricKey, setMetricKey] = useState<string>('')
  const metric = usable.find(m => m.key === metricKey) ?? usable[0]
  const inv = spine.investigations.find(i => i.id === invId)!
  const records = useMemo(() => spine.records.filter(r => r.inv === invId), [spine, invId])
  const materials = useMemo(() => [...new Set(records.map(r => (r.c.material.label ?? 'Not reported').replaceAll('"', '')))].sort(), [records])
  const xOptions: { key: XKey; label: string; unit: string | null }[] = [
    ...(['oxygen', 'pressure', 'flow'] as const).filter(d => inv.condition_ranges[d].min !== null && inv.condition_ranges[d].min !== inv.condition_ranges[d].max).map(d => ({ key: d as XKey, label: DIM_LABEL[d], unit: inv.condition_ranges[d].unit })),
    ...Object.keys(records.find(r => r.role === 'condition_source')?.x ?? {}).map(k => ({ key: `x:${k}` as XKey, label: human(k), unit: null })),
    ...(materials.length > 1 ? [{ key: 'material' as XKey, label: 'Material (category)', unit: null }] : []),
    { key: 'row', label: 'Source row (order only, not time)', unit: null },
  ]
  const [xKeyState, setXKey] = useState<XKey | ''>('')
  const xOpt = xOptions.find(o => o.key === xKeyState) ?? xOptions[0]
  const categorical = xOpt.key === 'material' || xOpt.key === 'row'
  const { points } = useMemo(() => metric ? measuredPoints(records, metric.key, xOpt.key, materials) : { points: [], excluded: {} }, [records, metric, xOpt.key, materials])
  const xUnit = xOpt.unit ?? (xOpt.key.startsWith('x:') ? (records.find(r => r.x[xOpt.key.slice(2)]?.u)?.x[xOpt.key.slice(2)]?.u ?? null) : null)
  const analysis = useMemo(() => analyze(spine.records, query), [spine, query])
  const eligible = useMemo(() => new Set(analysis.eligible.map(m => m.record.id)), [analysis])
  const materialSet = useMemo(() => (query.material.cls || query.material.label) ? new Set(records.filter(r => materialMatches(r, query)).map(r => r.id)) : null, [records, query])
  const queryX = (xOpt.key === 'oxygen' || xOpt.key === 'pressure' || xOpt.key === 'flow') && query[xOpt.key].enabled ? query[xOpt.key].value : null
  // Interpolation lines only on physical numeric axes: never across categories or source-row order.
  const groups = categorical ? [] : eligibleGroups(points)
  const qualifyingGroup = groups.find(g => points.some(p => p.group === g && eligible.has(p.record.id))) ?? null
  const interp = queryX !== null && qualifyingGroup ? interpolate(points, qualifyingGroup, queryX) : null
  const nQual = points.filter(p => eligible.has(p.record.id)).length
  const nMat = materialSet ? points.filter(p => materialSet.has(p.record.id)).length : null
  const matLabel = query.material.label?.replaceAll('"', '') ?? (query.material.cls ? spine.material_classes[query.material.cls]?.label : null)
  return <section className="card area-chart" aria-label="Measurement chart">
    <div className="card-h"><div><div className="step-kicker" title="Measured values from the indexed NASA records">Summarize</div><h2>Measured evidence</h2><p>Each point is a source record. Bright points match every selected condition{matLabel ? '; faded points are other materials' : ''}.</p></div><EvidenceBadge label="measured" /></div>
    <div className="chart-selects">
      <select className="select" aria-label="Investigation" value={invId} onChange={e => { setInvestigation(e.target.value); setMetricKey(''); setXKey('') }}>
        {invs.map(i => <option key={i.id} value={i.id}>{i.short} · {i.id}</option>)}</select>
      <select className="select" aria-label="Metric" value={metric?.key ?? ''} onChange={e => setMetricKey(e.target.value)}>
        {usable.map(m => <option key={m.key} value={m.key}>{m.label} ({unitLabel(m.unit)})</option>)}
        {!usable.length && <option value="">No plottable metric</option>}</select>
      <select className="select" aria-label="X axis" value={xOpt.key} onChange={e => setXKey(e.target.value as XKey)}>
        {xOptions.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}</select>
    </div>
    {metric && points.length
      ? <MeasurementChart points={points} xLabel={xOpt.label} xUnit={xUnit} yLabel={metric.label} yUnit={metric.unit} eligible={eligible} materialSet={materialSet} queryX={queryX}
          xCategories={xOpt.key === 'material' ? materials : null} showInterpolation={groups.length > 0} onPoint={id => openSource({ kind: 'record', recordId: id, metric: metric.label })} />
      : <div className="empty-state" style={{ minHeight: 200, display: 'grid', placeItems: 'center' }}>{usable.length ? 'No measurement for this axis' : `No plottable metric for ${inv.short}`}</div>}
    <div className="status-row" style={{ marginTop: 6 }}>
      <span className="badge measured">{points.length} points</span>
      {nMat !== null && <span className="badge interpolated" data-testid="chart-material">{nMat} {matLabel}</span>}
      <span className={`badge ${nQual ? 'ok' : 'unknown'}`} data-testid="chart-qualifying">{nQual} match current conditions</span>
      {interp?.status === 'interpolated' && <span className="badge interpolated">Interpolated {displayValue(interp.value, metric!.unit)} (n={interp.n})</span>}
    </div>
    {nQual === 0 && points.length > 0 && <p className="note" style={{ marginTop: 6 }} data-testid="chart-no-match">No {inv.short} measurement matches every selected condition. The plotted points are measured values at other conditions; no curve is synthesised.</p>}
    {materials.length > 6 && points.length > 0 && <p className="note" style={{ marginTop: 6 }}>{materials.length} materials: colours identify the material; hover a point for its name.</p>}
    {xOpt.key === 'row' && <p className="note" style={{ marginTop: 6 }}>Source-row order is not elapsed time, so points are not connected.</p>}
    {metric?.criterion && <p className="note" style={{ marginTop: 6 }}>{metric.criterion}.</p>}
  </section>
}

function EvidencePanel() {
  const { spine, investigation, openSource } = useAppState()
  const invs = primaryInvestigations(spine)
  const inv = invs.find(i => i.id === investigation) ?? invs[0]
  const papers = spine.papers.filter(p => p.investigations.includes(inv.id))
  const findings = (spine.source_findings ?? []).filter(f => f.inv === inv.id)
  return <aside className="card area-evidence" aria-label="Source-linked evidence">
    <div className="card-h"><div><h2><BookOpen size={14} /> Evidence · {inv.short}</h2><p>{inv.title}</p></div></div>
    <dl className="kv" style={{ marginBottom: 10 }}>
      <dt>Investigation DOI</dt><dd className="mono"><a href={`https://doi.org/${inv.doi}`} target="_blank" rel="noreferrer">{inv.doi}</a></dd>
      <dt>Platform</dt><dd>{inv.platform}</dd><dt>Gravity</dt><dd>{inv.gravity}</dd>
      <dt>Records</dt><dd className="mono">{inv.condition_records} source records · {inv.exact_repeats_retained} exact repeats</dd>
    </dl>
    {findings.length > 0 && <><div className="kicker" style={{ margin: '6px 0' }}>Key findings ({findings.length})</div>
      <ul className="list-plain" style={{ marginBottom: 10 }} data-testid="investigation-findings">{findings.map((f, i) => { const r = spine.references?.[f.ref]
        return <li key={i} className="paper"><p className="note" style={{ color: '#D1D5DB' }}>{f.statement}</p>
          {r && <a className="src-link" href={r.url} target="_blank" rel="noreferrer">{r.id} · PDF p.{f.pdf_page} <ExternalLink size={10} /></a>}</li> })}</ul></>}
    <div className="kicker" style={{ margin: '6px 0' }}>NASA-listed publications ({papers.length})</div>
    <div className="scroll-y" style={{ maxHeight: 520 }}><ul className="list-plain">
      {papers.map(p => <li key={p.id} className="paper">
        <h4>{p.title}</h4>
        <div className="status-row"><span className="mono faint">{p.doi ? `DOI ${p.doi}` : 'No DOI listed'}</span></div>
        <div className="status-row"><button className="btn sm" onClick={() => openSource({ kind: 'paper', paperId: p.id })}>Details</button>{p.doi && <a className="btn sm" href={p.source_link} target="_blank" rel="noreferrer">doi.org <ExternalLink size={10} /></a>}</div>
      </li>)}
    </ul></div>
  </aside>
}

const TOPIC_ORDER: InsightTopic[] = ['oxygen', 'persistence', 'convection', 'fuel', 'smoke', 'spread', 'habitat']
const fmt = { g: (v: number | null) => v === null ? 'not set' : v <= 0.02 ? `${trim(v, 3)} g · microgravity` : `${trim(v, 3)} g`,
  o2: (v: number | null) => v === null ? 'not set' : `${trim(v * 100, 3)} % O₂`, kpa: (v: number | null) => v === null ? 'not set' : `${+v.toFixed(2)} kPa`,
  flow: (v: number | null) => v === null ? 'not set' : `${trim(v * 1000, 4)} mm/s` }

function InsightItem({ i }: { i: Insight }) {
  const { spine } = useAppState()
  const r = i.ref ? spine.references?.[i.ref] : undefined
  const inv = i.inv ? spine.investigations.find(x => x.id === i.inv) : undefined
  return <li className={`fsi-item k-${i.kind}`} data-testid="fire-insight" data-kind={i.kind}>
    <span className={`fsi-kind k-${i.kind}`}>{KIND_LABEL[i.kind]}</span>
    <p>{i.text}</p>
    {(r || inv) && <div className="fsi-src">{inv && <span className="mono">{inv.short} · {inv.id}</span>}
      {r && <a href={r.url} target="_blank" rel="noreferrer" className="src-link">{r.id}{i.locator ? ` · ${i.locator}` : ''} <ExternalLink size={10} /></a>}</div>}
  </li>
}

function FireSafetyInsights() {
  const { spine, query, scenarioId, measuredFrom, setScenario } = useAppState()
  const adv = useMemo(() => advise(spine, query), [spine, query])
  const insights = useMemo(() => buildInsights(spine, query), [spine, query])
  const snap = snapshot(query)
  const presets = useMemo(() => ['iss_cabin', 'lunar_habitat'].filter(id => spine.scenarios.some(x => x.id === id)).map(id => presetSummary(spine, id, query)), [spine, query])
  const analysis = useMemo(() => analyze(spine.records, query), [spine, query])
  const byTopic = TOPIC_ORDER.map(t => [t, insights.filter(i => i.topic === t)] as const).filter(([, l]) => l.length)
  const refs = [...new Map(insights.filter(i => i.ref && spine.references?.[i.ref]).map(i => [i.ref!, spine.references![i.ref!]])).values()]
  const invIds = [...new Set(insights.map(i => i.inv).filter(Boolean) as string[])]
  const counts = { measured: insights.filter(i => i.kind === 'measured').length, published: insights.filter(i => i.kind === 'published').length,
    derived: insights.filter(i => i.kind === 'calculated' || i.kind === 'relationship').length, gap: insights.filter(i => i.kind === 'gap').length }
  const material = query.material.label?.replaceAll('"', '') ?? (query.material.cls ? spine.material_classes[query.material.cls]?.label : 'Any material')
  const scenarioName = measuredFrom ? 'Measured record' : spine.scenarios.find(x => x.id === scenarioId)?.name ?? 'Custom'
  return <section className={`card area-insights fsi adv-${adv.level}`} aria-label="Fire Safety Insights" data-testid="card-fire-safety">
    <div className="fsi-head">
      <div><div className="step-kicker" title="Source-backed interpretation of the current conditions; never a safety certification">Interpret</div>
        <h2 className="fsi-title">Fire Safety Insights</h2>
        <p className="note">Interprets the selected conditions using NASA measurements, published findings and basic physics. It is not a safety certification or a prediction.</p></div>
      <div className="advisory" data-testid="advisory" data-level={adv.level}>
        {adv.level === 'hazard' ? <AlertTriangle size={20} /> : adv.level === 'evidence' ? <Flame size={20} /> : <ShieldAlert size={20} />}
        <div><strong>{adv.headline}</strong><p>{adv.summary}</p></div>
      </div>
    </div>

    <div className="fsi-grid">
      <div className="fsi-panel fsi-overview" data-testid="fsi-overview">
        <div className="fsi-panel-h"><h3>Scenario overview</h3><span className="chip">{scenarioName}</span></div>
        <dl className="fsi-values">
          <div><dt>Material / fuel</dt><dd data-testid="ov-material">{material}</dd></div>
          <div><dt>Gravity</dt><dd className="mono" data-testid="ov-gravity">{fmt.g(snap.gravity)}</dd></div>
          <div><dt>Oxygen</dt><dd className="mono" data-testid="ov-oxygen">{fmt.o2(snap.oxygen)}</dd></div>
          <div><dt>Total pressure</dt><dd className="mono" data-testid="ov-pressure">{fmt.kpa(snap.pressureKpa)}</dd></div>
          <div><dt>Airflow</dt><dd className="mono" data-testid="ov-flow">{fmt.flow(snap.flow)}</dd></div>
          <div className="hl"><dt>O₂ partial pressure <span className="fsi-kind k-calculated">Calculated</span></dt><dd className="mono" data-testid="ov-po2">{fmt.kpa(snap.po2Kpa === null ? null : +snap.po2Kpa.toFixed(2))}</dd></div>
        </dl>
        <p className="formula" aria-label="P O2 equals P total times O2 percentage over 100">P<sub>O₂</sub> = P<sub>total</sub> × (O₂ % ⁄ 100)</p>
      </div>

      <div className="fsi-panel fsi-compare" data-testid="fsi-compare">
        <div className="fsi-panel-h"><h3>ISS vs Lunar Habitat</h3></div>
        <table className="table fsi-table"><thead><tr><th /><th className="iss"><Orbit size={12} /> ISS-like</th><th className="lunar"><Moon size={12} /> Lunar habitat</th><th>Current</th></tr></thead>
          <tbody>
            <tr><th>Gravity</th>{presets.map(p => <td key={p.id} className="mono">{trim(p.snap.gravity ?? 0, 3)} g</td>)}<td className="mono">{snap.gravity === null ? '—' : `${trim(snap.gravity, 3)} g`}</td></tr>
            <tr><th>O₂ fraction</th>{presets.map(p => <td key={p.id} className="mono">{trim((p.snap.oxygen ?? 0) * 100, 3)} %</td>)}<td className="mono">{snap.oxygen === null ? '—' : `${trim(snap.oxygen * 100, 3)} %`}</td></tr>
            <tr><th>Total pressure</th>{presets.map(p => <td key={p.id} className="mono">{(p.snap.pressureKpa ?? 0).toFixed(2)} kPa</td>)}<td className="mono">{snap.pressureKpa === null ? '—' : `${snap.pressureKpa.toFixed(2)} kPa`}</td></tr>
            <tr className="hl"><th>P<sub>O₂</sub> (calculated)</th>{presets.map(p => <td key={p.id} className="mono" data-testid={`po2-${p.id}`}>{p.snap.po2Kpa?.toFixed(2)} kPa</td>)}<td className="mono">{snap.po2Kpa === null ? '—' : `${snap.po2Kpa.toFixed(2)} kPa`}</td></tr>
            <tr><th>Buoyancy scale √g</th>{presets.map(p => <td key={p.id} className="mono">{p.snap.buoyancyRatio?.toFixed(2)}</td>)}<td className="mono">{snap.buoyancyRatio === null ? '—' : snap.buoyancyRatio.toFixed(2)}</td></tr>
            <tr><th>Matching NASA measurements</th>{presets.map(p => <td key={p.id} className="mono" data-testid={`match-${p.id}`}>{p.matching}</td>)}<td className="mono">{analysis.eligibleEvidenceCount}</td></tr>
            <tr><th>Partial-gravity studies</th>{presets.map(p => <td key={p.id} className="mono">{p.partialGravityStudies}</td>)}<td className="mono">—</td></tr>
          </tbody></table>
        {presets.length === 2 && <p className="note">The lunar habitat reference has a higher O₂ <em>fraction</em> ({trim((presets[1].snap.oxygen ?? 0) * 100, 3)}% vs {trim((presets[0].snap.oxygen ?? 0) * 100, 3)}%) but a lower O₂ <em>partial pressure</em> ({presets[1].snap.po2Kpa?.toFixed(2)} vs {presets[0].snap.po2Kpa?.toFixed(2)} kPa) because its total pressure is lower. A higher oxygen percentage does not by itself mean more oxygen. Neither number says which environment is safer: gravity, airflow and material also decide whether a flame survives.</p>}
        <div className="status-row">{presets.map(p => <button key={p.id} className="btn sm" onClick={() => setScenario(p.id)} aria-pressed={scenarioId === p.id && !measuredFrom}>Load {p.name}</button>)}</div>
      </div>

      <div className="fsi-panel fsi-insights" data-testid="fsi-insights">
        <div className="fsi-panel-h"><h3>Fire behaviour insights</h3>
          <div className="fsi-legend">{(['measured', 'published', 'calculated', 'relationship', 'gap'] as const).map(k => <span key={k} className={`fsi-kind k-${k}`}>{KIND_LABEL[k]}</span>)}</div></div>
        <div className="fsi-topics">{byTopic.map(([t, list]) => <div key={t} className="fsi-topic" data-topic={t}>
          <h4>{TOPIC_LABEL[t]}</h4><ul className="list-plain">{list.map(i => <InsightItem key={i.id} i={i} />)}</ul></div>)}</div>
      </div>

      <div className="fsi-panel fsi-evidence" data-testid="fsi-evidence">
        <div className="fsi-panel-h"><h3>Evidence behind these insights</h3></div>
        <div className="fsi-meters">
          <div><span className="mono big">{analysis.eligibleEvidenceCount}</span><span>catalogue matches</span><small className={`badge ${analysis.coverage === 'covered' ? 'measured' : analysis.coverage === 'sparse' ? 'restricted' : 'fail'}`}>{COVERAGE_LABEL[analysis.coverage]}</small></div>
          <div><span className="mono big">{counts.measured}</span><span>measured</span></div>
          <div><span className="mono big">{counts.published}</span><span>published findings</span></div>
          <div><span className="mono big">{counts.derived}</span><span>calculations &amp; physics</span></div>
          <div><span className="mono big">{counts.gap}</span><span>evidence gaps</span></div>
        </div>
        {invIds.length > 0 && <><div className="kicker">NASA investigations</div>
          <div className="status-row">{invIds.map(id => { const inv = spine.investigations.find(i => i.id === id)!; return <a key={id} className="chip" href={`https://doi.org/${inv.doi}`} target="_blank" rel="noreferrer">{inv.short} · {inv.id}</a> })}</div></>}
        <div className="kicker">Sources cited</div>
        <ul className="list-plain fsi-refs" data-testid="fsi-refs">{refs.map(r => <li key={r.id}><a href={r.url} target="_blank" rel="noreferrer">{r.id} <ExternalLink size={10} /></a><span className="note">{r.title}</span></li>)}
          {refs.length === 0 && <li className="note">No published source applies to these conditions.</li>}</ul>
        <p className="note">Partial-gravity studies (LUCI, Konno, Gollner) are kept outside the NASA PSI catalogue and do not count as catalogue matches.</p>
      </div>
    </div>
  </section>
}

function MetricCards() {
  const { spine, query, openSource } = useAppState()
  const analysis = useMemo(() => analyze(spine.records, query), [spine, query])
  const rates = analysis.eligible.filter(m => m.record.m.burning_rate?.s === 'reported')
  const values = rates.map(m => m.record.m.burning_rate.v!).sort((a, b) => a - b)
  const median = values.length ? values[Math.floor((values.length - 1) / 2)] : null
  const model = spine.models?.models[0]
  return <div className="area-cards">
    <div className="card metric-card" data-testid="card-combustion-rate">
      <div className="kicker">Combustion rate</div>
      {median !== null ? <>
        <div className="value">{trim(median, 3)} <span className="dim" style={{ fontSize: 12 }}>mm²/s median</span></div>
        <div className="status-row"><EvidenceBadge label="measured" /><span className="badge unknown">n={values.length}</span></div>
        <p className="note">FLEX droplet burning-rate constants of matching records, range {trim(values[0], 3)}–{trim(values[values.length - 1], 3)} mm²/s.</p>
        <button className="btn sm" onClick={() => openSource({ kind: 'record', recordId: rates[0].record.id, metric: 'Burning-rate constant' })}>Inspect first record</button>
      </> : <>
        <div className="value unavailable">No matching measurement</div>
        <p className="note">No record with a reported burning-rate constant matches every selected condition.</p>
      </>}
    </div>
    <div className="card metric-card" data-testid="card-validation">
      <div className="kicker">FM2 lunar flammability</div>
      <div className="value unavailable">FM2 · {spine.fm2.status_label}</div>
      <EvidenceBadge label="planned" />
      <p className="note">Planned lunar-surface burns at {spine.fm2.planned_conditions.map(c => `${Math.round(c.oxygen * 100)}% O₂ / ${c.pressure_psia} psia`).join(' and ')}. Closest flown data: LUCI, simulated lunar gravity (2025).</p>
      {model && <p className="note">FLEX burning-rate regression: grouped-CV MAE {trim(model.validation.metrics.ridge.mae, 2)} mm²/s. Predictions disabled.</p>}
    </div>
  </div>
}

export default function SimulatorPage() {
  return <div className="page"><div className="sim-grid"><Controls /><FlamePanel /><ChartPanel /><EvidencePanel /><CoverageCard /><MetricCards /><FireSafetyInsights /></div></div>
}

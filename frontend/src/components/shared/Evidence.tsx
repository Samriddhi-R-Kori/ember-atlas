import { Crosshair, ExternalLink, X } from 'lucide-react'
import { Fragment, useEffect, useState, type ReactNode } from 'react'
import { useAppState } from '../../state/AppState'
import { displayValue, human, shortPath } from '../../lib/format'
import type { SpineRecord } from '../../types/spine'

export type Label = 'measured' | 'interpolated' | 'extrapolated' | 'planned' | 'unknown' | 'restricted' | 'candidate' | 'model_prediction'
const TEXT: Record<Label, string> = {
  measured: 'Measured', interpolated: 'Interpolated', extrapolated: 'Extrapolated · no value', planned: 'Planned',
  unknown: 'Unknown', restricted: 'Restricted', candidate: 'AI candidate · pending review', model_prediction: 'Model prediction — not measured',
}
export function EvidenceBadge({ label, title }: { label: Label; title?: string }) {
  const { spine } = useAppState()
  return <span className={`badge ${label === 'candidate' ? 'candidate' : label === 'model_prediction' ? 'warn' : label}`} title={title ?? spine.labels[label] ?? ''}>{TEXT[label]}</span>
}

function RecordSource({ record, metric }: { record: SpineRecord; metric?: string }) {
  const { spine, mode, applyMeasuredConditions, openSource } = useAppState()
  const src = spine.sources[record.src]
  const inv = spine.investigations.find(i => i.id === record.inv)!
  const [detail, setDetail] = useState<null | { observations: { heading: string; original_value: unknown; normalized_value: string | null; normalized_unit: string | null; value_status: string; coordinate: string | null }[] }>(null)
  useEffect(() => {
    if (mode !== 'live_api') return
    const c = new AbortController()
    fetch(`/api/records/detail?record_id=${encodeURIComponent(record.id)}`, { signal: c.signal }).then(r => r.ok ? r.json() : null).then(setDetail).catch(() => {})
    return () => c.abort()
  }, [record.id, mode])
  const rows: [string, ReturnType<typeof entryRow>][] = [
    ['Gravity', { original: record.c.gravity.o ?? '—', normalized: record.c.gravity.s === 'reported' ? spine.gravity_rule.label : 'Not reported', state: record.c.gravity.s, loc: 'record flight-context classification', why: record.c.gravity.why }],
    ['Material', { original: record.c.material.label ?? '—', normalized: record.c.material.cls ? spine.material_classes[record.c.material.cls]?.label : 'Not reported', state: record.c.material.s, loc: record.c.material.loc ?? '', why: undefined }],
    ...(['oxygen', 'pressure', 'flow'] as const).map(d => [d[0].toUpperCase() + d.slice(1), entryRow(record.c[d])] as [string, ReturnType<typeof entryRow>]),
    ...Object.entries(record.m).map(([k, v]) => [spine.metrics.find(m => m.key === k && m.investigation === record.inv)?.label ?? k, entryRow(v)] as [string, ReturnType<typeof entryRow>]),
    ...Object.entries(record.x).map(([k, v]) => [human(k), entryRow(v)] as [string, ReturnType<typeof entryRow>]),
  ]
  return <div className="doc" style={{ gap: 12 }}>
    <div>
      <div className="kicker">Source record</div>
      <h3 style={{ fontSize: 16, marginTop: 4 }}>{inv.short} / {record.ident ?? `row ${record.row}`}{metric ? ` · ${metric}` : ''}</h3>
      <div className="status-row" style={{ marginTop: 6 }}>
        <EvidenceBadge label="measured" title="Reported in a scientific source (provisional curated value)" />
        {record.dup && <span className="badge warn">Exact repeat retained</span>}
        {record.role === 'condition_source' && <button className="btn sm" data-testid="panel-use-measured" onClick={() => { applyMeasuredConditions(record.id); openSource(null); window.location.hash = '#/simulator' }}><Crosshair size={11} />Use measured conditions</button>}
      </div>
    </div>
    <dl className="kv">
      <dt>Investigation</dt><dd>{inv.id} · {inv.title}</dd>
      <dt>Source file</dt><dd className="mono">{shortPath(src.path)}{record.sheet ? ` · ${record.sheet}` : ''} · row {record.row}</dd>
      <dt>SHA-256</dt><dd className="mono" style={{ fontSize: 10.5 }}>{src.sha256}</dd>
      <dt>Provenance</dt><dd>{human(src.provenance_status)} · {src.license ?? 'rights under review'}</dd>
      <dt>Dataset release</dt><dd className="mono">{spine.dataset.version} · {spine.dataset.manifest_sha256.slice(0, 12)}…</dd>
      <dt>Official source</dt><dd>{src.download ? <a href={src.download} target="_blank" rel="noreferrer">NASA download <ExternalLink size={11} /></a> : '—'} {inv.doi && <> · <a href={`https://doi.org/${inv.doi}`} target="_blank" rel="noreferrer">{inv.doi}</a></>}</dd>
    </dl>
    <div style={{ overflowX: 'auto' }}>
      <table className="table">
        <thead><tr><th>Quantity</th><th>Original</th><th>Normalized</th><th>Location</th></tr></thead>
        <tbody>{rows.map(([name, r]) => <tr key={name}><td>{name}</td><td className="mono">{r.original}</td><td className="mono" title={r.why ?? ''}>{r.normalized}</td>
          <td className="mono">{r.loc}</td></tr>)}</tbody>
      </table>
    </div>
    <p className="note">Normalized values are unit conversions of the original source values.</p>
    {record.flags.length > 0 && <details><summary className="note">Source notes ({record.flags.length})</summary>
      <ul className="note">{record.flags.map(f => <li key={f}>{human(f)}</li>)}</ul></details>}
    {detail && <details><summary className="note">Full database observation list ({detail.observations.length})</summary>
      <table className="table"><tbody>{detail.observations.map((o, i) => <tr key={i}><td>{o.heading}</td><td className="mono">{String(o.original_value ?? '—')}</td><td className="mono">{o.normalized_value ?? '—'} {o.normalized_unit ?? ''}</td><td>{human(o.value_status)}</td><td className="mono">{o.coordinate}</td></tr>)}</tbody></table></details>}
  </div>
}

function entryRow(e: { s: string; o?: string; v?: number; u?: string; loc?: string; why?: string; vs?: string }) {
  return { original: e.o === undefined || e.o === '' ? '—' : e.o, normalized: e.s === 'reported' ? displayValue(e.v, e.u) : '—',
    state: e.vs === 'estimated' && e.s === 'reported' ? 'reported' : e.s, loc: e.loc ?? '', why: e.why ?? (e.vs === 'estimated' ? 'Source marks this value as approximate' : undefined) }
}

export function SourcePanel() {
  const { source, openSource, spine } = useAppState()
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') openSource(null) }
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey)
  }, [openSource])
  if (!source) return null
  let body: ReactNode = null
  if (source.kind === 'record') {
    const record = spine.records.find(r => r.id === source.recordId)
    body = record ? <RecordSource record={record} metric={source.metric} /> : <div className="empty-state">Source unavailable</div>
  } else if (source.kind === 'paper') {
    const p = spine.papers.find(x => x.id === source.paperId)!
    body = <div className="doc" style={{ gap: 10 }}><div className="kicker">Publication · NASA-listed</div><h3 style={{ fontSize: 15 }}>{p.title}</h3>
      <dl className="kv"><dt>Authors</dt><dd>{p.authors ?? 'Not listed'}</dd><dt>DOI</dt><dd className="mono">{p.doi ?? 'Not listed in catalog'}</dd>
        <dt>Investigations</dt><dd>{p.investigations.join(', ')}</dd><dt>Link</dt><dd><a href={p.source_link} target="_blank" rel="noreferrer">{p.source_link}</a></dd>
        <dt>Provenance</dt><dd>{p.provenance}</dd><dt>Scope</dt><dd>{human(p.verification_scope)} · citation only</dd></dl></div>
  } else {
    body = <div className="doc" style={{ gap: 10 }}><h3 style={{ fontSize: 15 }}>{source.title}</h3>
      <dl className="kv">{Object.entries(source.body).map(([k, v]) => <Fragment key={k}><dt>{human(k)}</dt><dd>{typeof v === 'string' ? v : <pre className="mono" style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{JSON.stringify(v, null, 1)}</pre>}</dd></Fragment>)}</dl></div>
  }
  return <aside className="source-panel" role="dialog" aria-label="Source details">
    <div style={{ display: 'flex', justifyContent: 'flex-end' }}><button className="btn" onClick={() => openSource(null)} aria-label="Close source panel"><X size={14} /> Close</button></div>
    {body}
  </aside>
}

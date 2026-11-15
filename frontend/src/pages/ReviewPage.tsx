import { apiUrl } from '../lib/apiBase'
import { useEffect, useState } from 'react'
import { useAppState } from '../state/AppState'
import { postJson } from '../lib/data'
import { human } from '../lib/format'

type Item = { id: string; kind: string; investigation: string; review_status: string; flags: string[]
  payload: { title: string; finding: string; categories: string[] }
  source: { document: string; pdf_page: string | number; section: string; path: string }
  extraction: { method: string; model?: string; date?: string }; history: { decision: string; reviewer: string; timestamp: string; note: string }[] }

// Team-only interface: reads/writes require the API on loopback with EMBER_ATLAS_REVIEW_ENABLED=1,
// and every decision requires the reviewer token. It is never part of the static build data.
export default function ReviewPage() {
  const { mode } = useAppState()
  const [items, setItems] = useState<Item[]>([]); const [error, setError] = useState('')
  const [reviewer, setReviewer] = useState(''); const [token, setToken] = useState('')
  const load = () => fetch(apiUrl('/review/queue')).then(async r => { if (!r.ok) throw new Error((await r.json()).detail); return r.json() })
    .then(d => { setItems(d.items); setError('') }).catch(e => setError((e as Error).message))
  useEffect(() => { if (mode === 'live_api') void load() }, [mode])
  if (mode !== 'live_api') return <div className="page"><div className="empty-state">The review queue is a local team tool and is unavailable in the static demo.</div></div>
  const decide = async (id: string, decision: string, note: string, corrections: string) => {
    try {
      await postJson(`/review/${encodeURIComponent(id)}/decision`, { decision, reviewer, note, corrections: corrections ? JSON.parse(corrections) : null }, { 'X-Reviewer-Token': token })
      await load()
    } catch (e) { setError((e as Error).message) }
  }
  return <div className="page">
    <div className="card"><div className="card-h"><div><h2>Local source-review queue</h2><p>Confirm, correct, reject or request clarification. Decisions are append-only with reviewer identity and timestamp.</p></div></div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <input className="input" placeholder="Reviewer name (recorded)" value={reviewer} onChange={e => setReviewer(e.target.value)} aria-label="Reviewer name" />
        <input className="input" type="password" placeholder="Reviewer token" value={token} onChange={e => setToken(e.target.value)} aria-label="Reviewer token" />
      </div>
      {error && <p className="note warn" role="alert">{error}</p>}</div>
    {items.map(item => <ReviewCard key={item.id} item={item} onDecide={decide} />)}
  </div>
}

function ReviewCard({ item, onDecide }: { item: Item; onDecide: (id: string, d: string, note: string, corrections: string) => void }) {
  const [note, setNote] = useState(''); const [corr, setCorr] = useState('')
  return <div className="card">
    <div className="status-row"><span className="badge candidate">{human(item.review_status)}</span><span className="mono faint">{item.id} · {item.investigation}</span>{item.flags.map(f => <span key={f} className="badge warn">{f}</span>)}</div>
    <h3 style={{ margin: '6px 0' }}>{item.payload.title}</h3><p className="note" style={{ color: '#E5E7EB' }}>{item.payload.finding}</p>
    <p className="note">{item.source.document} · PDF p.{String(item.source.pdf_page)} · {item.source.section} · <span className="mono">{item.source.path}</span></p>
    <p className="note">Extraction: {item.extraction.method} {item.extraction.model ?? ''} {item.extraction.date ?? ''}</p>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, margin: '8px 0' }}>
      <input className="input" placeholder="Note / source evidence" value={note} onChange={e => setNote(e.target.value)} aria-label={`Note for ${item.id}`} />
      <input className="input" placeholder='Corrections JSON, e.g. {"finding":"…"}' value={corr} onChange={e => setCorr(e.target.value)} aria-label={`Corrections for ${item.id}`} />
    </div>
    <div className="status-row">{['confirm', 'correct', 'reject', 'request_clarification'].map(d => <button key={d} className="btn" onClick={() => onDecide(item.id, d, note, corr)}>{human(d)}</button>)}</div>
    {item.history.length > 0 && <ul className="note">{item.history.map((h, i) => <li key={i}>{h.timestamp} · {h.reviewer} · {h.decision}{h.note ? ` — ${h.note}` : ''}</li>)}</ul>}
  </div>
}

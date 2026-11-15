import { lazy, Suspense, useEffect, useState } from 'react'
import { loadSpine, type LoadResult } from './lib/data'
import { AppStateProvider } from './state/AppState'
import { TopNav, PAGES } from './components/layout/TopNav'
import { SourcePanel } from './components/shared/Evidence'
import SimulatorPage from './pages/SimulatorPage'

const EvidenceGraphPage = lazy(() => import('./pages/EvidenceGraphPage'))
const EarthPage = lazy(() => import('./pages/EarthPage'))
const ResourcesPage = lazy(() => import('./pages/ResourcesPage'))
const ReviewPage = lazy(() => import('./pages/ReviewPage'))
const LegacyObservatory = lazy(() => import('./LegacyObservatory'))

const VALID = new Set([...PAGES.map(p => p.id), 'records', 'review'])
// Former routes stay valid: '#/method' → Resources, '#/equipment' → Earth Applications.
const ALIAS: Record<string, string> = { method: 'resources', equipment: 'earth' }
const fromHash = () => { const raw = window.location.hash.replace(/^#\/?/, '').split(/[/?]/)[0]; const p = ALIAS[raw] ?? raw; return VALID.has(p) ? p : 'simulator' }

export default function App() {
  const [data, setData] = useState<LoadResult | null>(null)
  const [error, setError] = useState('')
  const [page, setPage] = useState(fromHash)
  useEffect(() => { const c = new AbortController(); loadSpine(c.signal).then(setData).catch(e => { if (e.name !== 'AbortError') setError(e.message) }); return () => c.abort() }, [])
  useEffect(() => { const on = () => setPage(fromHash()); window.addEventListener('hashchange', on); return () => window.removeEventListener('hashchange', on) }, [])
  useEffect(() => { document.title = `${PAGES.find(p => p.id === page)?.label ?? 'Source records'} · Ember Atlas` }, [page])
  const go = (p: string) => { window.location.hash = `#/${p}` }
  if (error) return <div className="ff" style={{ padding: 30 }}><h1>Ember Atlas</h1><p role="alert" style={{ marginTop: 10 }}>Evidence data unavailable: {error}</p><p className="dim">Start the local API or build the static export. No fallback data is shown.</p></div>
  if (!data) return <div className="ff" style={{ padding: 30 }} role="status">Loading source-linked evidence…</div>
  return <AppStateProvider spine={data.spine} mode={data.mode} exportVersion={data.exportVersion}>
    <div className="ff">
      <TopNav page={page} go={go} />
      <Suspense fallback={<div className="page" role="status">Loading…</div>}>
        {page === 'simulator' && <SimulatorPage />}
        {page === 'graph' && <EvidenceGraphPage />}
        {page === 'earth' && <EarthPage />}
        {page === 'resources' && <ResourcesPage />}
        {page === 'review' && <ReviewPage />}
        {page === 'records' && (data.mode === 'live_api'
          ? <div className="page"><div className="legacy-frame"><LegacyObservatory /></div></div>
          : <div className="page"><div className="empty-state">The source-record workbench needs the local API; it is unavailable in the static demo.</div></div>)}
      </Suspense>
      <footer className="page" style={{ paddingTop: 0 }}><div className="note" style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <span>Independent research project · not endorsed by NASA.</span>
        <a href="#/records">Source-record workbench</a></div></footer>
      <SourcePanel />
    </div>
  </AppStateProvider>
}

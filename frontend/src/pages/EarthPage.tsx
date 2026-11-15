import { useEffect, useRef, useState } from 'react'

// Earth Applications: the Ember Atlas module (public/earth/index.html, built by earth-module/build_earth.py from the
// supplied ZIP) runs isolated in a same-origin iframe so its global CSS, globals and hash router cannot collide with
// the dashboard. The dashboard provides the navigation; the module's own sidebar is hidden in embedded mode.
export const EARTH_VIEWS = [
  ['data', 'Data & background'], ['materials', 'Building materials'], ['safety', 'Fire safety'], ['burners', 'Cleaner burners'],
  ['wildfire', 'Wildfire spread'], ['soot', 'Soot & air pollution'], ['engines', 'Engine efficiency'],
] as const
type View = typeof EARTH_VIEWS[number][0]
const isView = (v: string): v is View => EARTH_VIEWS.some(x => x[0] === v)
const viewFromHash = (): View => { const v = window.location.hash.replace(/^#\/?/, '').split('/')[1] ?? ''; return isView(v) ? v : 'data' }

export default function EarthPage() {
  const frame = useRef<HTMLIFrameElement>(null)
  const [view, setView] = useState<View>(viewFromHash)
  const [height, setHeight] = useState(900)
  const [src] = useState(() => `${import.meta.env.BASE_URL}earth/index.html#${viewFromHash()}`)
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || e.source !== frame.current?.contentWindow || !e.data) return
      if (e.data.type === 'earth:height' && typeof e.data.h === 'number') setHeight(Math.max(600, Math.min(20000, e.data.h)))
      if (e.data.type === 'earth:view' && isView(String(e.data.view))) {
        const v = e.data.view as View
        setView(v)
        if (viewFromHash() !== v) history.replaceState(null, '', `#/earth/${v}`)
      }
    }
    const onHash = () => { const v = viewFromHash(); setView(v); frame.current?.contentWindow?.postMessage({ type: 'earth:show', view: v }, window.location.origin) }
    window.addEventListener('message', onMsg); window.addEventListener('hashchange', onHash)
    return () => { window.removeEventListener('message', onMsg); window.removeEventListener('hashchange', onHash) }
  }, [])
  const select = (v: View) => {
    setView(v)
    history.replaceState(null, '', `#/earth/${v}`)
    frame.current?.contentWindow?.postMessage({ type: 'earth:show', view: v }, window.location.origin)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  return <div className="page earth-page">
    <div className="earth-head">
      <div><div className="kicker">Bonus challenge</div><h1 className="earth-title">Earth Applications</h1>
        <p className="note">How microgravity combustion research reaches fire safety, cleaner energy and climate on Earth.</p></div>
      <nav className="earth-tabs" aria-label="Earth applications" role="tablist">
        {EARTH_VIEWS.map(([id, label]) => <button key={id} role="tab" aria-selected={view === id} className="earth-tab" data-view={id} onClick={() => select(id)}>{label}</button>)}
      </nav>
    </div>
    <iframe ref={frame} className="earth-frame" title="Earth Applications" src={src} style={{ height }} data-testid="earth-frame" />
  </div>
}

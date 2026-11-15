import { Moon, Orbit } from 'lucide-react'
import { useAppState } from '../../state/AppState'

export const PAGES = [
  { id: 'simulator', label: 'Scenario Simulator' },
  { id: 'graph', label: 'Cinematic Evidence Graph' },
  { id: 'earth', label: 'Earth Applications' },
  { id: 'resources', label: 'Resources' },
] as const

export function TopNav({ page, go }: { page: string; go: (p: string) => void }) {
  const { spine, scenarioId, setScenario, customized, mode, exportVersion, measuredFrom } = useAppState()
  const review = spine.dataset.scientific_approval ? 'scientifically approved' : 'provisional, review in progress'
  return <>
    <header className="topnav">
      <div className="brand-title">EMBER ATLAS<small>Flame in Freefall · Combustion Evidence Dashboard</small></div>
      <nav className="navtabs" aria-label="Primary">
        {PAGES.map(p => <button key={p.id} className="navtab" aria-current={page === p.id ? 'page' : undefined} onClick={() => go(p.id)}>{p.label}</button>)}
      </nav>
      <div className="nav-right">
        <div className="seg" role="group" aria-label="Scenario">
          {spine.scenarios.map(s => <button key={s.id} className={s.accent} aria-pressed={scenarioId === s.id && !measuredFrom} onClick={() => setScenario(s.id)}>
            {s.id === 'iss_cabin' ? <Orbit size={13} /> : <Moon size={13} />}{s.name}</button>)}
        </div>
        {customized && <span className="status-pill" title={measuredFrom ? 'Conditions loaded from a measured source record' : 'Sliders differ from the preset'}><span className="dot" />{measuredFrom ? 'Measured record' : 'Custom'}</span>}
        <a className="status-pill" href="#/resources" title={`Dataset ${spine.dataset.version} (${review})${exportVersion ? ` · export ${exportVersion}` : ''}. See Resources → Scientific Limitations.`}>
          <span className={`dot ${mode === 'live_api' ? 'live' : ''}`} />{mode === 'live_api' ? 'Live DB' : 'Static'} · {spine.dataset.version}
        </a>
      </div>
    </header>
  </>
}

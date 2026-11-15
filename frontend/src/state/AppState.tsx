import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import type { Spine } from '../types/spine'
import { queryFromRecord, queryFromScenario, type Query } from '../science/gapEngine'

// UI exploration ranges (not dataset coverage claims). The pressure range spans both presets
// (56.5 and 101.3 kPa) and the FLEX measured range (70–309 kPa); the previous 100 kPa maximum made
// the ISS 101.3 kPa preset unreachable once the slider was touched.
export const UI_RANGES = {
  gravity: { min: 0, max: 1, step: 0.005, unit: 'g' },
  flow: { min: 0, max: 1, step: 0.01, unit: 'm/s' },
  pressure: { min: 40_000, max: 320_000, step: 100, unit: 'Pa' },
  oxygen: { min: 0.10, max: 0.50, step: 0.01, unit: 'mol/mol' },
} as const

export type SourceTarget = { kind: 'record'; recordId: string; metric?: string } | { kind: 'paper'; paperId: string } | { kind: 'text'; title: string; body: Record<string, unknown> }
export type MeasuredFrom = { recordId: string; unconstrained: { dim: string; why: string }[] }

type State = {
  spine: Spine; mode: 'live_api' | 'static_export'; exportVersion?: string
  scenarioId: string; query: Query; customized: boolean; measuredFrom: MeasuredFrom | null
  setScenario: (id: string) => void; updateQuery: (q: Partial<Query>) => void; resetScenario: () => void
  applyMeasuredConditions: (recordId: string) => void
  investigation: string; setInvestigation: (id: string) => void
  source: SourceTarget | null; openSource: (t: SourceTarget | null) => void
  focusNode: string | null; setFocusNode: (id: string | null) => void
}
const Ctx = createContext<State | null>(null)

// Investigations offered in primary selectors (CFI excluded per contract; it stays in all other views).
export const primaryInvestigations = (spine: Spine) => spine.investigations.filter(i => !(i.id in (spine.primary_selector_excluded ?? {})))

export function AppStateProvider({ spine, mode, exportVersion, children }: { spine: Spine; mode: State['mode']; exportVersion?: string; children: ReactNode }) {
  const [scenarioId, setScenarioId] = useState(spine.scenarios[0].id)
  const [query, setQuery] = useState<Query>(() => queryFromScenario(spine, spine.scenarios[0].id))
  const [customized, setCustomized] = useState(false)
  const [measuredFrom, setMeasuredFrom] = useState<MeasuredFrom | null>(null)
  const [investigation, setInvestigation] = useState('PSI-69')
  const [source, openSource] = useState<SourceTarget | null>(null)
  const [focusNode, setFocusNode] = useState<string | null>(null)
  const measuredRef = useRef<MeasuredFrom | null>(null); measuredRef.current = measuredFrom
  // User-chosen airflow/material carry over between scenarios; values loaded from a measured record do not.
  const setScenario = useCallback((id: string) => {
    setScenarioId(id)
    const fromRecord = measuredRef.current !== null
    setQuery(q => queryFromScenario(spine, id, fromRecord ? undefined : { flow: q.flow, material: q.material }))
    setCustomized(false); setMeasuredFrom(null)
  }, [spine])
  const updateQuery = useCallback((patch: Partial<Query>) => { setQuery(q => ({ ...q, ...patch })); setCustomized(true); setMeasuredFrom(null) }, [])
  const resetScenario = useCallback(() => { setQuery(queryFromScenario(spine, scenarioId)); setCustomized(false); setMeasuredFrom(null) }, [spine, scenarioId])
  const applyMeasuredConditions = useCallback((recordId: string) => {
    const record = spine.records.find(r => r.id === recordId)
    if (!record) return
    const { query: q, unconstrained } = queryFromRecord(record)
    setQuery(q); setCustomized(true); setMeasuredFrom({ recordId, unconstrained })
    if (primaryInvestigations(spine).some(i => i.id === record.inv)) setInvestigation(record.inv)
  }, [spine])
  const value = useMemo(() => ({ spine, mode, exportVersion, scenarioId, query, customized, measuredFrom, setScenario, updateQuery, resetScenario,
    applyMeasuredConditions, investigation, setInvestigation, source, openSource, focusNode, setFocusNode }),
  [spine, mode, exportVersion, scenarioId, query, customized, measuredFrom, setScenario, updateQuery, resetScenario, applyMeasuredConditions, investigation, source, focusNode])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAppState() {
  const v = useContext(Ctx)
  if (!v) throw new Error('AppState missing')
  return v
}

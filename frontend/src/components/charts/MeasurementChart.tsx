import { useEffect, useRef } from 'react'
import Plotly from 'plotly.js-basic-dist-min'
import type { Point } from '../../science/interpolation'
import { eligibleGroups, levels } from '../../science/interpolation'
import { axisScale, unitLabel } from '../../lib/format'

const PALETTE = ['#3B82F6', '#D91B5C', '#8B5CF6', '#22D3EE', '#F59E0B', '#10B981', '#F472B6', '#94A3B8']

// Three emphasis tiers: records matching every selected condition (bright, outlined), records of the selected material
// (normal), other records (faded). With no material selected, every non-matching record is drawn normally.
export default function MeasurementChart({ points, xLabel, xUnit, yLabel, yUnit, eligible, materialSet = null, queryX, onPoint, showInterpolation, xCategories = null }:
  { points: Point[]; xLabel: string; xUnit: string | null; yLabel: string; yUnit: string | null; eligible: Set<string>; materialSet?: Set<string> | null
    queryX: number | null; onPoint: (id: string) => void; showInterpolation: boolean; xCategories?: string[] | null }) {
  const ref = useRef<HTMLDivElement>(null)
  const cb = useRef(onPoint); cb.current = onPoint
  useEffect(() => {
    const el = ref.current; if (!el) return
    let active = true
    const sx = xCategories ? 1 : axisScale(xUnit), sy = axisScale(yUnit)
    const tier = (id: string) => eligible.has(id) ? 2 : !materialSet || materialSet.has(id) ? 1 : 0
    const materials = [...new Set(points.map(p => p.record.c.material.label ?? 'Not reported'))]
    const traces: Record<string, unknown>[] = materials.map((mat, i) => {
      const ps = points.filter(p => (p.record.c.material.label ?? 'Not reported') === mat)
      return { type: 'scatter', mode: 'markers', name: mat.replaceAll('"', ''), x: ps.map(p => p.x * sx), y: ps.map(p => p.y * sy),
        customdata: ps.map(p => [p.record.id, p.record.ident ?? `row ${p.record.row}`, p.record.row, ['different material', 'outside current conditions', 'matches current conditions'][tier(p.record.id)], p.record.flags.length]),
        marker: { color: PALETTE[i % PALETTE.length], size: ps.map(p => [5, 6, 11][tier(p.record.id)]), opacity: ps.map(p => [0.14, 0.5, 1][tier(p.record.id)]),
          line: { color: ps.map(p => tier(p.record.id) === 2 ? '#ffffff' : 'rgba(0,0,0,0)'), width: 1.2 } },
        hovertemplate: `<b>%{customdata[1]}</b> (source row %{customdata[2]})<br>${xLabel}: ${xCategories ? '%{text}' : '%{x}'}<br>${yLabel}: %{y} ${unitLabel(yUnit)}<br>MEASURED · %{customdata[3]}<br>click for source<extra>%{fullData.name}</extra>`,
        text: xCategories ? ps.map(p => xCategories[p.x]) : undefined }
    })
    if (showInterpolation) {
      for (const g of eligibleGroups(points)) {
        const lv = levels(points.filter(p => p.group === g))
        traces.push({ type: 'scatter', mode: 'lines', name: 'Interpolated (linear, within group)', showlegend: false, hoverinfo: 'skip',
          x: lv.map(l => l.x * sx), y: lv.map(l => l.y * sy), line: { color: 'rgba(199,181,255,0.55)', width: 1.2, dash: 'dot' } })
      }
    }
    const xs = points.map(p => p.x * sx)
    const shapes: Record<string, unknown>[] = []
    if (xs.length && !xCategories) shapes.push({ type: 'rect', xref: 'x', yref: 'paper', x0: Math.min(...xs), x1: Math.max(...xs), y0: 0, y1: 1, fillcolor: 'rgba(37,99,235,0.06)', line: { width: 0 }, layer: 'below' })
    if (queryX !== null) shapes.push({ type: 'line', xref: 'x', yref: 'paper', x0: queryX * sx, x1: queryX * sx, y0: 0, y1: 1, line: { color: '#D91B5C', width: 1.5, dash: 'dash' } })
    void Plotly.newPlot(el, traces, {
      autosize: true, height: materials.length <= 6 ? 350 : 320, margin: { t: 10, r: 10, b: materials.length <= 6 ? 70 : 46, l: 56 }, paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)',
      font: { family: 'Inter, sans-serif', color: '#9CA3AF', size: 11 }, hovermode: 'closest', shapes,
      xaxis: { title: { text: `${xLabel}${xUnit ? ` (${unitLabel(xUnit)})` : ''}` }, gridcolor: 'rgba(255,255,255,0.06)', zeroline: false,
        ...(xCategories ? { tickvals: xCategories.map((_, i) => i), ticktext: xCategories, range: [-0.6, xCategories.length - 0.4] } : {}) },
      yaxis: { title: { text: `${yLabel} (${unitLabel(yUnit)})` }, gridcolor: 'rgba(255,255,255,0.06)', zeroline: false },
      showlegend: materials.length <= 6, legend: { orientation: 'h', y: -0.3, font: { size: 10 } }, hoverlabel: { bgcolor: '#0B0E14', bordercolor: '#1E56B3', font: { family: 'JetBrains Mono, monospace', size: 11 } },
    }, { responsive: true, displaylogo: false, modeBarButtonsToRemove: ['toImage', 'lasso2d', 'select2d'] }).then(plot => {
      if (!active) return
      ;(plot as unknown as { on: (e: string, f: (d: { points: { customdata: string[] }[] }) => void) => void })
        .on('plotly_click', d => { const id = d.points[0]?.customdata?.[0]; if (id) cb.current(id) })
    })
    return () => { active = false; Plotly.purge(el) }
  }, [points, xLabel, xUnit, yLabel, yUnit, eligible, materialSet, queryX, showInterpolation, xCategories])
  return <div ref={ref} className="plot-box" data-testid="measurement-chart" role="img" aria-label={`${yLabel} versus ${xLabel}; measured source values`} />
}

// Interpolation eligibility. Interpolation is only considered inside a compatibility group:
// same investigation, metric, literal material label, every other condition/context value equal
// as reported (original strings). Requires >= 3 measured points AND >= 3 distinct x levels.
// Linear interpolation between adjacent level medians; never outside the measured domain.
import type { SpineRecord } from '../types/spine'

export type XKey = 'oxygen' | 'pressure' | 'flow' | `x:${string}` | 'row' | 'material'
export type Point = { x: number; y: number; record: SpineRecord; group: string }
export const MIN_POINTS = 3

// 'material' maps a record to the index of its label in `categories` (a categorical axis, never interpolated).
export function xValue(record: SpineRecord, key: XKey, categories?: string[]): number | null {
  if (key === 'row') return record.row
  if (key === 'material') { const i = (categories ?? []).indexOf((record.c.material.label ?? 'Not reported').replaceAll('"', '')); return i < 0 ? null : i }
  const entry = key.startsWith('x:') ? record.x[key.slice(2)] : record.c[key as 'oxygen' | 'pressure' | 'flow']
  return entry && entry.s === 'reported' && entry.v !== undefined ? entry.v : null
}

export function compatibilityKey(record: SpineRecord, metric: string, key: XKey): string {
  const parts = [record.inv, metric, `material=${record.c.material.label ?? '∅'}`]
  for (const d of ['oxygen', 'pressure', 'flow'] as const) if (d !== key) parts.push(`${d}=${record.c[d].s}:${record.c[d].o ?? ''}`)
  for (const [k, v] of Object.entries(record.x).sort()) if (`x:${k}` !== key && k !== 'initial_diameter_mm') parts.push(`${k}=${v.s}:${v.o ?? ''}`)
  return parts.join('|')
}

export function measuredPoints(records: SpineRecord[], metric: string, key: XKey, categories?: string[]): { points: Point[]; excluded: Record<string, number> } {
  const points: Point[] = []; const excluded: Record<string, number> = {}
  const bump = (k: string) => { excluded[k] = (excluded[k] ?? 0) + 1 }
  for (const r of records) {
    const m = r.m[metric]
    if (!m) continue
    if (m.s !== 'reported' || m.v === undefined) { bump(m.s === 'restricted' ? 'restricted' : 'not_reported'); continue }
    const x = xValue(r, key, categories)
    if (x === null) { bump('x_not_usable'); continue }
    points.push({ x, y: m.v, record: r, group: compatibilityKey(r, metric, key) })
  }
  return { points, excluded }
}

export type InterpolationResult =
  | { status: 'interpolated'; value: number; lower: { x: number; y: number }; upper: { x: number; y: number }; group: string; n: number; levels: number }
  | { status: 'sparse'; n: number; levels: number; group: string | null }
  | { status: 'outside_domain'; min: number; max: number; group: string }
  | { status: 'no_group' }

function median(values: number[]) {
  const s = [...values].sort((a, b) => a - b); const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

export function levels(points: Point[]) {
  const by = new Map<number, number[]>()
  for (const p of points) by.set(p.x, [...(by.get(p.x) ?? []), p.y])
  return [...by.entries()].map(([x, ys]) => ({ x, y: median(ys), n: ys.length })).sort((a, b) => a.x - b.x)
}

export function interpolate(points: Point[], group: string | null, x: number): InterpolationResult {
  if (!group) return { status: 'no_group' }
  const members = points.filter(p => p.group === group)
  const lv = levels(members)
  if (members.length < MIN_POINTS || lv.length < MIN_POINTS) return { status: 'sparse', n: members.length, levels: lv.length, group }
  const min = lv[0].x, max = lv[lv.length - 1].x
  if (x < min || x > max) return { status: 'outside_domain', min, max, group }
  for (let i = 0; i < lv.length - 1; i++) {
    const a = lv[i], b = lv[i + 1]
    if (x >= a.x && x <= b.x) {
      const t = b.x === a.x ? 0 : (x - a.x) / (b.x - a.x)
      return { status: 'interpolated', value: a.y + t * (b.y - a.y), lower: a, upper: b, group, n: members.length, levels: lv.length }
    }
  }
  return { status: 'interpolated', value: lv[lv.length - 1].y, lower: lv[lv.length - 1], upper: lv[lv.length - 1], group, n: members.length, levels: lv.length }
}

export function eligibleGroups(points: Point[]) {
  const groups = new Map<string, Point[]>()
  for (const p of points) groups.set(p.group, [...(groups.get(p.group) ?? []), p])
  return [...groups.entries()].filter(([, ps]) => ps.length >= MIN_POINTS && levels(ps).length >= MIN_POINTS).map(([g]) => g)
}

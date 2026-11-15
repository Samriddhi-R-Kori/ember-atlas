import type { Spine } from '../types/spine'

// Data source selection: the live local API when reachable, otherwise the versioned static
// export bundled under public/data (public demo mode). VITE_STATIC_ONLY=1 forces static mode.
const STATIC_ONLY = import.meta.env.VITE_STATIC_ONLY === '1'
const BASE = import.meta.env.BASE_URL

export type LoadResult = { spine: Spine; mode: 'live_api' | 'static_export'; exportVersion?: string }

async function loadStatic(signal?: AbortSignal): Promise<LoadResult> {
  const latest = await fetch(`${BASE}data/latest.json`, { signal })
  if (!latest.ok) throw new Error('Static data export not found')
  const manifest = await latest.json() as { path: string; export_version: string; sha256: string }
  const response = await fetch(`${BASE}${manifest.path}`, { signal })
  if (!response.ok) throw new Error('Static data export could not be loaded')
  const text = await response.text()
  if (globalThis.crypto?.subtle) {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
    const hex = [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('')
    if (hex !== manifest.sha256) throw new Error('Static data export failed its SHA-256 integrity check')
  }
  return { spine: JSON.parse(text) as Spine, mode: 'static_export', exportVersion: manifest.export_version }
}

export async function loadSpine(signal?: AbortSignal): Promise<LoadResult> {
  if (!STATIC_ONLY) {
    try {
      const response = await fetch('/api/spine', { signal })
      if (response.ok) return { spine: await response.json() as Spine, mode: 'live_api' }
    } catch (error) {
      if ((error as Error).name === 'AbortError') throw error
    }
  }
  return loadStatic(signal)
}

export const apiAvailable = (mode: string) => mode === 'live_api'

export async function postJson<T>(path: string, body: unknown, headers: Record<string, string> = {}): Promise<T> {
  const response = await fetch('/api' + path, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error((payload as { detail?: string }).detail || `Request failed (${response.status})`)
  return payload as T
}

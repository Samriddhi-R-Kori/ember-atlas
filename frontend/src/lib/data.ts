import type { Spine } from '../types/spine'
import { API_BASE, apiUrl } from './apiBase'

// Data source selection: the live API (local, or VITE_API_BASE_URL when hosted) when reachable, otherwise the
// versioned, SHA-256-checked static export bundled under public/data. VITE_STATIC_ONLY=1 forces static mode.
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

// A hosted free-tier backend can take up to about a minute to wake, so a remote API gets a longer timeout.
export const API_TIMEOUT_MS = API_BASE ? 75_000 : 8_000
export const remoteApi = Boolean(API_BASE) && !STATIC_ONLY

export async function loadLive(signal?: AbortSignal): Promise<LoadResult> {
  const timeout = new AbortController()
  const timer = setTimeout(() => timeout.abort(), API_TIMEOUT_MS)
  const onAbort = () => timeout.abort()
  signal?.addEventListener('abort', onAbort)
  try {
    const response = await fetch(apiUrl('/spine'), { signal: timeout.signal })
    if (!response.ok) throw new Error(`API responded ${response.status}`)
    return { spine: await response.json() as Spine, mode: 'live_api' }
  } finally { clearTimeout(timer); signal?.removeEventListener('abort', onAbort) }
}

export async function loadSpine(signal?: AbortSignal): Promise<LoadResult> {
  if (!STATIC_ONLY) {
    try { return await loadLive(signal) } catch (error) {
      if (signal?.aborted) throw error
    }
  }
  return loadStatic(signal)
}

export { loadStatic }

export const apiAvailable = (mode: string) => mode === 'live_api'

export async function postJson<T>(path: string, body: unknown, headers: Record<string, string> = {}): Promise<T> {
  const response = await fetch(apiUrl(path), { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error((payload as { detail?: string }).detail || `Request failed (${response.status})`)
  return payload as T
}

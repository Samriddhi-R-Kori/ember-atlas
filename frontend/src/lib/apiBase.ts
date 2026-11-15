// Base URL of the Ember Atlas API. Empty in development (Vite proxies /api to the local backend);
// set VITE_API_BASE_URL at build time for a separately hosted backend (e.g. https://<service>.onrender.com).
// Only a public URL belongs here: never put credentials in a VITE_ variable (they are bundled into the site).
export const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '')
export const apiUrl = (path: string) => `${API_BASE}/api${path}`

// Serves dist-static with no API and checks that the public demo renders from the export.
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'
import { chromium } from '@playwright/test'
const root = new URL('../dist-static/', import.meta.url).pathname
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.woff2': 'font/woff2', '.woff': 'font/woff' }
const server = createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://x').pathname)
  if (path.startsWith('/api/')) { res.writeHead(404); return res.end('no api in static mode') }
  try { const file = join(root, normalize(path === '/' ? '/index.html' : path)); res.writeHead(200, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream' }); res.end(await readFile(file)) }
  catch { res.writeHead(404); res.end() }
}).listen(5181, '127.0.0.1')
const browser = await chromium.launch(); const page = await browser.newPage({ viewport: { width: 1440, height: 950 } })
const errors = []; page.on('pageerror', e => errors.push(e.message))
let ok = true
try {
  for (const p of ['simulator', 'graph', 'earth', 'resources']) {
    await page.goto(`http://127.0.0.1:5181/#/${p}`); await page.waitForTimeout(p === 'graph' ? 2500 : 1200)
    const body = await page.locator('body').innerText()
    if (!body.includes('Static · p0_v1_review')) { ok = false; console.log('missing static status on', p) }
    for (const s of ['Review: scientific approval pending', 'Qualitative visualization — not a validated combustion prediction', 'Title-level record only.', 'Provisional evidence. Scientific approval pending']) if (body.includes(s)) { ok = false; console.log('removed text present on', p, s) }
    if (p === 'simulator' && !(body.includes('258 points') && body.includes('Evidence Coverage'))) { ok = false; console.log('chart missing') }
    if (p === 'resources' && !body.includes('Partial-gravity combustion evidence')) { ok = false; console.log('resources lunar evidence missing') }
    if (p === 'earth' && !(await page.frameLocator('[data-testid=earth-frame]').locator('#overview').isVisible())) { ok = false; console.log('earth module missing') }
    await page.screenshot({ path: `../assets/screenshots/static_${p}.png`, fullPage: p !== 'graph' })
  }
} finally { await browser.close(); server.close() }
if (errors.length) { ok = false; console.log('page errors', errors) }
console.log(ok ? 'STATIC demo renders all four pages from the export with no API' : 'STATIC smoke FAILED')
process.exit(ok ? 0 : 1)

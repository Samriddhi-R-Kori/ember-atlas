import { test, expect, type Page } from '@playwright/test'
const SHOTS = '../assets/screenshots'

const REMOVED = [
  'Provisional evidence. Scientific approval pending · source records are not verified experiment runs · nothing here certifies combustion or material safety.',
  'Review: scientific approval pending',
  'Title-level record only. No result from this paper is used as a measurement unless it appears in a reviewed finding.',
  'Qualitative visualization — not a validated combustion prediction',
  'Scientific approval pending', 'Provisional evidence', 'Metadata not available', 'Metadata missing', 'Blocked metadata',
  'blocked by metadata', 'Verified runs', 'Under review', 'Unverified source', 'This source needs to be verified',
  'Source records are not verified experiment runs', 'Nothing here certifies', 'Matching tolerance', 'Equipment & Earth',
  'Restricted parameter', 'Key limits', 'Gravity: orbital μg only', 'No validated predictive uncertainty', 'Docker Compose orchestration',
  'Docker is not installed', 'Not performed — no qualified external sign-off', 'Retrieval-audit regression tests', 'Injection resistance',
]

function trackErrors(page: Page) {
  const errors: string[] = []
  page.on('pageerror', e => errors.push(e.message))
  return errors
}
const eligible = async (page: Page) => Number(await page.getByTestId('eligible-count').innerText())

test('navigation: four pages incl. Resources, removed wording absent, no Mars', async ({ page }) => {
  const errors = trackErrors(page)
  await page.goto('/#/simulator')
  const nav = page.getByRole('navigation', { name: 'Primary' })
  await expect(nav.getByRole('button', { name: 'Method & Limits' })).toHaveCount(0)
  for (const name of ['Scenario Simulator', 'Cinematic Evidence Graph', 'Earth Applications', 'Resources']) {
    await nav.getByRole('button', { name }).click()
    await expect(nav.getByRole('button', { name })).toHaveAttribute('aria-current', 'page')
    await page.waitForTimeout(300)
    const body = await page.locator('body').innerText()
    for (const s of REMOVED) expect(body).not.toContain(s)
    expect(body.toLowerCase()).not.toMatch(/\bmars\b|martian/)
  }
  await expect(page).toHaveTitle(/Resources/)
  await expect(page.getByText(/Independent research project · not endorsed by NASA/)).toBeVisible()
  await page.goto('/#/equipment')   // former route resolves to Earth Applications
  await expect(nav.getByRole('button', { name: 'Earth Applications' })).toHaveAttribute('aria-current', 'page')
  await page.goto('/#/method')   // former route still resolves
  await expect(nav.getByRole('button', { name: 'Resources' })).toHaveAttribute('aria-current', 'page')
  expect(errors).toEqual([])
})

test('simulator: strict coverage, no tolerance dropdown, real chart and cards', async ({ page }) => {
  const errors = trackErrors(page)
  await page.goto('/#/simulator')
  await expect(page.getByRole('heading', { name: 'Evidence Coverage' })).toBeVisible()
  await expect(page.locator('#band')).toHaveCount(0)
  await expect(page.getByText(/Matching tolerance|Exploratory/)).toHaveCount(0)
  await expect(page.getByTestId('flame-canvas')).toBeVisible()
  await expect(page.locator('.js-plotly-plot')).toBeVisible()
  await expect(page.getByText('258 points')).toBeVisible()
  expect(await eligible(page)).toBe(18)
  await expect(page.getByTestId('coverage-status')).toHaveText('Covered')
  await expect(page.getByTestId('matching-evidence').getByTestId('evidence-row').first()).toContainText('FLEX Test')
  await expect(page.getByTestId('card-buoyancy')).toHaveCount(0)
  const fsi = page.getByTestId('card-fire-safety')
  await expect(fsi).toContainText('Fire Safety Insights')
  await expect(page.getByTestId('card-sootiness')).toHaveCount(0)
  await expect(page.getByTestId('ov-po2')).toHaveText('21.28 kPa')
  await expect(page.getByTestId('po2-iss_cabin')).toHaveText('21.28 kPa')
  await expect(page.getByTestId('po2-lunar_habitat')).toHaveText('19.22 kPa')
  await expect(page.getByTestId('fsi-insights').getByTestId('fire-insight').first()).toBeVisible()
  await expect(page.getByTestId('advisory')).toHaveAttribute('data-level', 'evidence')
  await expect(page.getByTestId('card-fire-safety')).toContainText('Do not assume ignition is safe')
  await expect(page.getByTestId('card-fire-safety')).not.toContainText(/safe to (light|ignite)/i)
  await expect(page.getByTestId('card-fire-safety')).toContainText('higher O₂ fraction')
  await expect(page.getByTestId('card-validation')).toContainText('FM2 · Planned · no results yet')
  await expect(page.getByTestId('card-combustion-rate')).toContainText('mm²/s median')
  await page.screenshot({ path: `${SHOTS}/01_scenario_simulator.png`, fullPage: true })
  // Partial gravity: honest coverage gap with nearest evidence and the differing dimension shown.
  await page.getByLabel('Gravity slider').fill('0.3')
  await expect(page.getByTestId('coverage-status')).toHaveText('Coverage gap')
  expect(await eligible(page)).toBe(0)
  await expect(page.getByTestId('nearest-evidence').locator('.dim-chip.mismatched').first()).toContainText('Gravity')
  await expect(page.getByTestId('card-combustion-rate')).toContainText('No matching measurement')
  // Nearest evidence → Use measured conditions produces a genuine exact match.
  await page.getByTestId('nearest-evidence').getByTestId('use-measured').first().click()
  expect(await eligible(page)).toBeGreaterThan(0)
  await expect(page.getByTestId('evidence-coverage')).toContainText('Conditions loaded from')
  // Chart point → source panel → Use measured conditions.
  await page.getByTitle('Restore preset values').click()
  const point = await page.locator('.scatterlayer .point').first().boundingBox()
  await page.mouse.click(point!.x + point!.width / 2, point!.y + point!.height / 2)
  const panel = page.getByRole('dialog', { name: 'Source details' })
  await expect(panel).toContainText('SHA-256'); await expect(panel).toContainText('FLEX.csv')
  for (const s of REMOVED) await expect(panel).not.toContainText(s)
  await panel.getByTestId('panel-use-measured').click()
  expect(await eligible(page)).toBeGreaterThan(0)
  expect(errors).toEqual([])
})

test('demonstration presets yield real eligible evidence; ISS pressure is reachable by slider', async ({ page }) => {
  await page.goto('/#/simulator')
  await page.getByTestId('demo-demo_flex_methanol_air').click()
  expect(await eligible(page)).toBeGreaterThanOrEqual(1)
  await expect(page.getByTestId('matching-evidence')).toContainText('FLEX Test 4')
  await page.getByTestId('demo-demo_spice_ethylene_coflow').click()
  expect(await eligible(page)).toBeGreaterThanOrEqual(1)
  await expect(page.getByTestId('evidence-coverage')).toContainText('open: Ambient O₂')
  await page.getByTestId('demo-demo_bass_pmma_film').click()
  expect(await eligible(page)).toBeGreaterThanOrEqual(1)
  await page.screenshot({ path: `${SHOTS}/01b_demonstration_preset.png`, fullPage: true })
  // Regression: the pressure slider previously stopped at 100 kPa, below the 101.3 kPa ISS preset.
  await page.getByRole('group', { name: 'Scenario preset' }).getByRole('button', { name: 'ISS Cabin' }).click()
  await page.getByLabel('Pressure slider').fill('101300')
  expect(await eligible(page)).toBeGreaterThan(0)
})

test('CFI is absent from primary selectors but discoverable in Resources', async ({ page }) => {
  await page.goto('/#/simulator')
  await expect(page.getByLabel('Investigation').locator('option')).toHaveCount(4)
  const inv = await page.getByLabel('Investigation').locator('option').allInnerTexts()
  expect(inv.some(t => /CFI|PSI-39/.test(t))).toBe(false)
  expect(inv.length).toBe(4)
  const mats = await page.locator('#material option').allInnerTexts()
  expect(mats.some(t => /· CFI/.test(t))).toBe(false)
  await page.goto('/#/resources')
  await expect(page.getByTestId('cfi-note')).toContainText('All 87 CFI records remain')
})

test('flame renderer responds to gravity and material', async ({ page }) => {
  await page.goto('/#/simulator')
  const canvas = page.getByTestId('flame-canvas')
  await expect(canvas).toHaveAttribute('data-renderer', /webgl|2d/)
  await page.getByLabel('Gravity slider').fill('0'); await page.waitForTimeout(900)
  const a = await canvas.screenshot()
  await page.getByLabel('Gravity slider').fill('1'); await page.waitForTimeout(900)
  const b = await canvas.screenshot()
  expect(Buffer.compare(a, b)).not.toBe(0)
  await expect(page.locator('.flame-overlay')).toContainText('Buoyant plume')
  await page.selectOption('#material', 'c:smoke_source_material')
  await expect(page.locator('.flame-overlay')).toContainText('no flame')
  await expect(page.getByRole('link', { name: /Illustrative/ })).toHaveAttribute('href', '#/resources')
})

test('evidence graph: distinct gap types, full explanations, progressive gaps and focus', async ({ page }) => {
  const errors = trackErrors(page)
  await page.goto('/#/graph')
  await expect(page.locator('.cy canvas').first()).toBeVisible()
  await page.waitForTimeout(1800)
  await page.screenshot({ path: `${SHOTS}/02_evidence_graph.png` })
  await page.getByRole('button', { name: 'Scenario rings' }).click()
  await page.waitForTimeout(1300)
  await page.screenshot({ path: `${SHOTS}/02b_evidence_graph_rings.png` })
  await page.getByRole('button', { name: 'List view' }).click()
  const table = page.getByRole('table', { name: 'Graph nodes' })
  await expect(table.getByRole('button', { name: '⚠ Evidence-quality gap · ISS Cabin', exact: true })).toBeVisible()
  const before = await table.locator('tbody tr').count()
  await table.getByRole('button', { name: '∅ Coverage gap · Lunar Habitat', exact: true }).click()
  const drawer = page.getByTestId('evidence-drawer')
  const x = drawer.getByTestId('gap-explanation')
  for (const s of ['Requested combination', 'Evidence by dimension', 'Records considered', 'Why records did not match', 'Nearest records', 'Related partial-gravity studies', 'What would address it', 'not proof that no such NASA experiment exists'])
    await expect(x).toContainText(s)
  await expect(drawer).not.toContainText('Review: scientific approval pending')
  expect(await table.locator('tbody tr').count()).toBeGreaterThan(before)   // detailed gaps revealed
  await drawer.getByTestId('focus-mode').click()
  expect(await table.locator('tbody tr').count()).toBeLessThan(before)
  await drawer.getByTestId('focus-mode').click()
  await x.getByRole('button').filter({ hasText: /row \d+/ }).first().click()
  await expect(page.getByRole('dialog', { name: 'Source details' })).toBeVisible()
  expect(errors).toEqual([])
})

test('scenario selection is synchronized between simulator and evidence graph', async ({ page }) => {
  const errors = trackErrors(page)
  await page.goto('/#/simulator')
  await page.getByRole('group', { name: 'Scenario', exact: true }).getByRole('button', { name: 'Lunar Habitat' }).click()
  await expect(page.locator('.control-head').filter({ hasText: 'Pressure' })).toContainText('56.537 kPa')
  await expect(page.getByTestId('coverage-status')).toHaveText('Coverage gap')
  await page.getByRole('navigation', { name: 'Primary' }).getByRole('button', { name: 'Cinematic Evidence Graph' }).click()
  await expect(page.getByRole('group', { name: 'Graph scenario' }).getByRole('button', { name: 'Lunar Habitat' })).toHaveAttribute('aria-pressed', 'true')
  expect(errors).toEqual([])
})

test('earth applications: integrated module, seven views, demos, no second sidebar', async ({ page }) => {
  const errors = trackErrors(page)
  await page.goto('/#/earth')
  const frame = page.frameLocator('[data-testid=earth-frame]')
  await expect(frame.locator('#overview')).toBeVisible()
  await expect(frame.locator('#side')).toBeHidden()
  for (const v of ['materials', 'safety', 'burners', 'wildfire', 'soot', 'engines', 'data']) {
    await page.locator(`.earth-tab[data-view=${v}]`).click()
    await expect(frame.locator(v === 'data' ? '#overview' : `#${v}`)).toBeVisible()
    await expect(page).toHaveURL(new RegExp(`#/earth/${v}$`))
  }
  await page.locator('.earth-tab[data-view=materials]').click()
  await frame.locator('#o2').fill('30')
  await expect(frame.locator('#msum')).toContainText('At 30% oxygen')
  await page.locator('.earth-tab[data-view=engines]').click()
  await frame.locator('#er').fill('14')
  await expect(frame.locator('#eout')).toContainText('54.7%')   // 1 − 14^(1−γ), γ = 1.30 at an exact mix
  await page.locator('.earth-tab[data-view=wildfire]').click()
  await frame.locator('#ws').fill('20')
  await expect(frame.locator('#wout')).toContainText('4.0×')     // 2^(20/10) upslope factor
  await page.locator('.earth-tab[data-view=burners]').click()
  await frame.locator('#bd').fill('40')
  await expect(frame.locator('#bdv')).toHaveText('40%')
  await page.locator('.earth-tab[data-view=soot]').click()
  await expect(frame.locator('#prod tr').first()).toBeVisible()
  await expect(frame.locator('#psvg')).toBeVisible()
  // Embedded module uses the dashboard design tokens (background #050608, cards #0B0E14).
  expect(await frame.locator('body').evaluate(b => getComputedStyle(b).backgroundColor)).toBe('rgb(5, 6, 8)')
  expect(await frame.locator('#engines .ctl').evaluate(e => getComputedStyle(e).backgroundColor)).toBe('rgb(11, 14, 20)')
  await page.locator('.earth-tab[data-view=safety]').click()
  await expect(frame.locator('#safety .srcs')).toContainText('[13]')
  await expect(frame.locator('#safety .srcs')).toContainText('NTRS 20210022542')
  await expect(frame.locator('body')).not.toContainText('not from your NASA files')
  const h = await page.$eval('[data-testid=earth-frame]', e => parseInt(e.style.height))
  expect(h).toBeGreaterThan(900); expect(h).toBeLessThan(4000)   // auto-height follows the safety view, no nested scrollbar
  await page.locator('.earth-tab[data-view=data]').click()
  await page.screenshot({ path: `${SHOTS}/03_earth_applications.png`, fullPage: true })
  expect(errors).toEqual([])
})

test('fire safety advisory responds to conditions and never certifies safety', async ({ page }) => {
  await page.goto('/#/simulator')
  const adv = page.getByTestId('advisory')
  await expect(adv).toHaveAttribute('data-level', 'evidence')
  await page.getByRole('group', { name: 'Scenario preset' }).getByRole('button', { name: 'Lunar Habitat' }).click()
  await expect(adv).toHaveAttribute('data-level', 'hazard')
  await expect(page.getByTestId('card-fire-safety')).toContainText('NTRS-20250010653')
  await page.getByRole('group', { name: 'Scenario preset' }).getByRole('button', { name: 'ISS Cabin' }).click()
  await page.selectOption('#material', 'c:gaseous_jet')
  await expect(adv).toHaveAttribute('data-level', 'insufficient')
  await expect(adv).toContainText('Avoid relying on this scenario as safe')
  await expect(page.getByTestId('card-buoyancy')).toHaveCount(0)
})

test('fire safety insights, chart and coverage stay synchronized with every control', async ({ page }) => {
  const errors = trackErrors(page)
  await page.goto('/#/simulator')
  const fsi = page.getByTestId('card-fire-safety')
  // Oxygen and pressure: overview and calculated partial pressure update together.
  await page.getByLabel('Ambient O₂ slider').fill('0.3')
  await expect(page.getByTestId('ov-oxygen')).toHaveText('30 % O₂')
  await expect(page.getByTestId('ov-po2')).toHaveText('30.41 kPa')
  await page.getByLabel('Pressure slider').fill('200000')
  await expect(page.getByTestId('ov-pressure')).toHaveText('200 kPa')
  await expect(page.getByTestId('ov-po2')).toHaveText('60 kPa')
  // Airflow: a disabled control becomes active when its slider moves (no locked controls).
  await page.getByTitle('Restore preset values').click()
  await expect(page.getByTestId('ov-flow')).toHaveText('not set')
  await page.selectOption('#material', 'c:solid_material')
  await page.getByLabel('Airflow slider').fill('0.05')
  await expect(page.getByTestId('ov-flow')).toHaveText('50 mm/s')
  await expect(page.getByLabel('Use Airflow in matching')).toBeChecked()
  await expect(fsi.locator('[data-kind=measured]').filter({ hasText: 'extinction velocity' })).toContainText('above')
  // Material drives the chart: the solid-material investigation is shown and its points counted.
  await expect(page.getByLabel('Investigation')).toHaveValue('PSI-25')
  await expect(page.getByTestId('chart-material')).toContainText('Solid materials')
  await expect(page.getByTestId('ov-material')).toHaveText('Solid materials')
  // Gravity: partial gravity brings in calculated buoyancy scaling and lunar-g measurements.
  await page.getByLabel('Gravity slider').fill('0.165')
  await expect(fsi).toContainText('0.41× the 1 g value')
  await expect(fsi.locator('[data-kind=measured]').filter({ hasText: 'LUCI' }).first()).toBeVisible()
  await expect(page.getByTestId('chart-qualifying')).toContainText('0 match')
  await expect(page.getByTestId('chart-no-match')).toBeVisible()
  await expect(fsi).not.toContainText(/\bis safe\b|safe to (light|ignite)/i)
  // SAME-R: no source-row index plotted as time; default axis is categorical material.
  await page.selectOption('#material', 'c:smoke_source_material')
  await expect(page.getByLabel('Investigation')).toHaveValue('PSI-101')
  await expect(page.getByLabel('X axis')).toHaveValue('material')
  await expect(page.locator('.scatterlayer .js-line')).toHaveCount(0)
  // Preset switching restores the reference values everywhere.
  await page.getByRole('group', { name: 'Scenario preset' }).getByRole('button', { name: 'Lunar Habitat' }).click()
  await expect(page.getByTestId('ov-po2')).toHaveText('19.22 kPa')
  await expect(page.getByTestId('advisory')).toHaveAttribute('data-level', 'hazard')
  await page.locator('.area-insights').screenshot({ path: `${SHOTS}/01c_fire_safety_insights.png` })
  expect(errors).toEqual([])
})

test('resources page: twelve sections, methods, lunar evidence, limits; no Q&A or status bar', async ({ page }) => {
  const errors = trackErrors(page)
  await page.goto('/#/resources')
  await expect(page.getByRole('heading', { name: 'Scientific resource center' })).toBeVisible()
  const nav = page.getByRole('navigation', { name: 'Resources sections' })
  for (const s of ['Project Overview', 'Scientific Dataset', 'NASA Investigations', 'Research Papers', 'Experimental Conditions', 'Measurement Methods',
    'Evidence Coverage & Gaps', 'FM2 & Lunar Research', 'AI & Machine Learning', 'Validation Results', 'Scientific Limitations', 'References & Downloads'])
    await expect(nav.getByRole('button', { name: s })).toBeVisible()
  await expect(page.getByText('Strict matching (the only mode)')).toBeVisible()
  await expect(page.getByTestId('flame-evidence').locator('li')).toHaveCount(9)
  await expect(page.getByTestId('demo-table').locator('tbody tr')).toHaveCount(3)
  await expect(page.getByTestId('partial-gravity-table').locator('tbody tr')).toHaveCount(4)
  await expect(page.getByTestId('resource-findings').locator('li')).toHaveCount(12)
  await expect(page.getByTestId('calculations')).toContainText('19.2 kPa')
  await expect(page.getByTestId('validation-checks')).toBeVisible()
  await expect(page.getByTestId('validation-checks')).not.toContainText('Docker')
  // AI & ML section: verified metrics, formulas, timeline, gap workflow, technology grid
  const ml = page.locator('#resources-09')
  await expect(ml.getByTestId('ml-timeline').locator('li')).toHaveCount(5)
  await expect(ml.getByTestId('ml-results')).toContainText('0.047')
  await expect(ml.getByTestId('ml-results')).toContainText('257')
  await expect(ml).toContainText('257 records'); await expect(ml).toContainText('107 groups')
  await expect(ml.getByTestId('gap-flow').locator('li')).toHaveCount(5)
  await expect(ml.getByTestId('tech-grid').locator('> div')).toHaveCount(9)
  await expect(ml.getByTestId('gap-example')).toContainText('Methane')
  await expect(ml.locator('.equation')).toHaveCount(4)
  await expect(ml).toContainText('Our objective is not simply to visualize flames')
  await expect(ml).not.toContainText(/Citation accuracy|Trap pass rate|Refusal/i)
  await expect(page.getByTestId('ask-box')).toHaveCount(0)
  await expect(page.locator('.notice-block')).toHaveCount(0)
  const lim = page.locator('#resources-11')
  await expect(lim.locator('table')).toHaveCount(1)
  await expect(lim.locator('ul')).toHaveCount(1)
  await expect(lim.getByTestId('open-issues').locator('th')).toHaveText(['Issue', 'Required to resolve'])
  await expect(page.getByRole('heading', { name: 'Key limits' })).toHaveCount(0)
  await expect(page.getByText(/predictions are disabled/i).first()).toBeVisible()
  await page.screenshot({ path: `${SHOTS}/04_resources.png`, fullPage: true })
  expect(errors).toEqual([])
})

test('mobile layout stacks without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 })
  for (const p of ['simulator', 'graph', 'earth', 'resources']) {
    await page.goto(`/#/${p}`)
    await page.waitForTimeout(600)
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(overflow, p).toBeLessThanOrEqual(1)
  }
  await page.goto('/#/simulator')
  await expect(page.getByTestId('flame-canvas')).toBeVisible()
  await page.screenshot({ path: `${SHOTS}/05_simulator_mobile.png`, fullPage: true })
})

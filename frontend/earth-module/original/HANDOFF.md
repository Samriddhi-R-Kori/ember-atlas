# Ember Atlas, page 3: "Earth applications" (handoff for Claude)

Read this file first. It tells you what the code is, how to embed it in another website, and what is and is not backed by the user's NASA files.

## What this is
A dashboard page for the NASA Space Apps 2026 challenge "Flame in Free Fall" (Earth-applications bonus). It is page 3 of the user's existing "Ember Atlas" dashboard (3 other tabs, rectangle-shaped). It shows how microgravity combustion research from NASA's Physical Sciences Informatics (PSI) repository connects to six Earth uses.

Live (private to owner) artifact: https://claude.ai/artifact/Cf5Q8dY4Xn6YYjDRc2YsFr

## There is no backend
Everything is client-side: one HTML file with inline CSS and JS, no build step, no framework, no API calls.
- The "database" is two JS constants inside `src/app.js`: `const R=[...]` (25 PSI records) and `const REFS={...}` (12 references). Both are also exported as readable JSON in `data/`.
- State is URL hash routing (`#data`, `#materials`, `#safety`, `#burners`, `#wildfire`, `#soot`, `#engines`) plus one optional localStorage key `ea-side` (sidebar collapsed or not, wrapped in try/catch).
- Only external request: Google Fonts (Bricolage Grotesque, Figtree). Everything else is inline. If the host site blocks Google Fonts it falls back to system-ui.
- Needs no server. Works from a file:// URL.

## Files
```
standalone/index.html     the whole page, ready to host (this is what is published)
src/head.html             <head> up to the style tag (fonts, meta)
src/styles.css            all CSS (dark navy scheme, CSS variables in :root)
src/body.html             all markup (sidebar + 7 views + footer)
src/app.js                all JS (data, citations, particle fire engine, 5 simulations, routing)
data/psi_records.json     the 25 NASA PSI records with DOIs, as objects
data/references.json      the 12 numbered references (n1..n12) and which are not from the user's files
build.py                  python3 build.py  -> rebuilds standalone/index.html from src/
embed-iframe-example.html section snippet that iframes the page
```
After editing anything in `src/`, run `python3 build.py`.

## Layout and views
`.shell` is a CSS grid: 232px sidebar (collapses to a 64px icon rail, auto at <=860px; top strip at <=560px) and `#main` (scrolls). Views are `<section class="view" id="...">`, one visible at a time (`.on`).

| Sidebar tab (in order) | view id | hash |
|---|---|---|
| Data and background (default, first) | `overview` + `evidence` (both data-v="data") | `#data` |
| Building materials | `materials` | `#materials` |
| Fire safety | `safety` | `#safety` |
| Cleaner burners | `burners` | `#burners` |
| Wildfire spread | `wildfire` | `#wildfire` |
| Soot and air pollution | `soot` | `#soot` |
| Engine efficiency | `engines` | `#engines` |

The tab list is `const VIEWS=[[id,label,badge],...]` in `app.js`; `show(v,push)` switches views.

## How to add it to another website

### Option A (recommended): iframe section
Host `standalone/index.html` and use `embed-iframe-example.html`. No conflicts with the host's CSS or JS. Hash routing works inside the iframe. Give the iframe at least ~640px height; the page fills its own viewport height with an internal scrolling area.

### Option B: inline section (more work, read these cautions)
`styles.css` and `app.js` assume they own the whole page. Before inlining:
1. **Global CSS**: it styles `html, body, a, h1-h3, p, footer, *`, and sets `html,body{height:100%}` and `.shell{height:100vh}`. Scope every rule under a wrapper such as `#earth-app`, and replace `100vh` with the section's height.
2. **Class and id collisions**: generic names (`.card`, `.chip`, `.band`, `.wrap`, `.flag`, `.track`, `.src`, `.rec`, `#main`, `#tabs`, `#side`, `#hero`) may collide with the host. Prefix them or use a shadow root.
3. **JS globals**: `app.js` is one script with top-level `const`/`function` declarations and a global `$`/`$$` helper. Wrap it in an IIFE or load it as a module so it does not leak.
4. **Routing**: it listens to `hashchange` and reads `location.hash`. If the host uses hash routing, change `show()` to use an in-section state or a namespaced hash such as `#earth/wildfire`.
5. **Fonts**: copy the Google Fonts link from `head.html` into the host, or change `--display` / `--body` in `:root` to the host's fonts.
6. **Theme**: all colours are CSS variables at the top of `styles.css` (`--paper`, `--card`, `--line`, `--ink`, `--ug` blue accent, `--earth` amber, `--weak`, `--ok`). Flame colours are NOT theme variables; they live in `const RAMP` in `app.js` (cyan-blue core to yellow to orange to dark red). Keep them natural.
7. Animation: one shared requestAnimationFrame loop with a scene registry (`addScene`, `SCENES`, `loop`); only visible scenes tick. `prefers-reduced-motion` is respected.

### Option C: React/Vue/etc.
Not componentised. Easiest is Option A. If porting, the units that map cleanly to components are: the Fire particle engine (`class Fire`), the wildfire cellular automaton (`wBuild`, `wStep`, `wDraw`, `wild()`), the engine cutaway (`engDraw`, `eng()`), the burner scene (`bnTick`), the burn-test scene (`btTick`), and the materials oxygen-index list (`MAT`).

## Data sources (the user's own files)
NASA PSI investigation record pages (25 records: PSI-10, 20, 21, 22, 23, 25, 26, 39, 60, 62, 68, 69, 98, 99, 100, 101, 102, 106, 107, 108, 115, 117, 142, 159, 181), each with a DOI, plus these pages (also in `data/references.json`):
1. https://www.nasa.gov/glenn/glenn-expertise-space-exploration/physical-sciences-program/combustion-science/
2. https://www.nasa.gov/image-article/candle-flame-1g-vs-microgravity/
3. https://www.nasa.gov/missions/station/a-researchers-guide-to-combustion-science/
4. https://www.grc.nasa.gov/www/k-12/airplane/combst1.html
5. https://science.nasa.gov/earth/earth-observatory/biomass-burning/
6. https://eng.libretexts.org/Bookshelves/Environmental_Engineering_(Sustainability_and_Conservation)/Energy_Conservation_for_Environmental_Protection_(Pisupati)/04%3A_Energy_and_the_Environment/4.01%3A_New_Page
7. https://ugc.berkeley.edu/background-content/burning-of-fossil-fuels/
12. https://svs.gsfc.nasa.gov/31394/ (NASA Scientific Visualization Studio, "NASA Studies Fire in Microgravity")

Citations appear as numbered markers (`<span class="cs" data-c="n2,n12">`) and per-tab source lists (`<div class="srcs" data-s="...">`); `fillCites()` renders both from `REFS` and `R`. To add a source, add it to `REFS`, then reference its key in a `data-c` or `data-s` attribute.

## Honesty rules the page follows (do not remove)
- The NASA PSI files are record pages (metadata, DOIs), not numeric datasets. The page does not plot NASA measurements it does not have.
- **Not from the user's files** (shown with red citation markers and a red note): n8 Rothermel (1972) moisture damping, n9 limiting-oxygen-index values for the 11 building materials (typical handbook figures), n10 ideal Otto cycle and the ~12:1 knock / 0.6 lean thresholds, n11 wildfire rules of thumb (spread ~ wind, ~doubling per 10 degrees of slope). They have NOT been checked against a primary source. Verify before publishing or presenting; check the oxygen-index numbers against a supplier data sheet and the Rothermel title/report number.
- Visuals are illustrations or textbook models, labelled as such: the candle (interpolated between NASA's 1 g and 0 g images), the wildfire map (stochastic grid on made-up terrain), the engine cutaway, the burner flames.
- The wildfire tab is marked as the weakest link to microgravity data; NOx/SO2 rows on the pollution tab say "not addressed".
- The Berkeley (ugc.berkeley.edu) and NASA links were taken from the user's files and messages; they were not opened or verified during the build.

## Known limits
- Not tested in the user's own browser or on their real Ember Atlas code. Colours match a screenshot of their dashboard (dark navy, blue active state, amber warnings), but fonts and spacing are approximations.
- The page is a self-contained rectangle with its own sidebar; if the host already has a sidebar, this will be a second one inside the section.
- Intermediate-gravity states of the hero flame (Moon, in-between) were not re-checked after the last flame change.

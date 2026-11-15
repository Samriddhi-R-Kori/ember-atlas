# Ember Atlas — Flame in Freefall

*NASA Space Apps Challenge 2026 · Flame in Free Fall*

**[▶ Live dashboard](https://samriddhi-r-kori.github.io/ember-atlas/)** · **[Source code](https://github.com/Samriddhi-R-Kori/ember-atlas)** · **[Scientific data](dataset/README.md)** · **[Documentation](docs/ARCHITECTURE.md)** · **[NASA research sources](docs/SOURCES.md)** · [API health](https://ember-atlas-api-9l9i.onrender.com/api/health)

> The live API runs on a free hosting plan that sleeps when idle; the first visit can take up to a minute while it wakes. The page offers to continue at once with the bundled, checksum-verified copy of the same data.

**Ember Atlas** is an interactive evidence-exploration platform for NASA microgravity combustion research. It brings together five International Space Station investigations in one source-linked catalogue:

- FLEX: flame extinguishment;
- CFI: cool flames;
- SAME-R: smoke aerosols;
- SPICE: smoke points;
- BASS-II: burning of solids.

Ember Atlas lets you explore that evidence through a scenario simulator, scientific graphs, fire-safety insights, a cinematic evidence network, research-gap analysis and Earth applications.

Every number in the dashboard traces back to a NASA source file, row and column, or to a cited report page. Where the evidence is thin, Ember Atlas says so instead of filling the gap.

> Independent research project, not endorsed by NASA. The curated data is **provisional**: no qualified external scientific review has been completed. Nothing in Ember Atlas certifies that any condition or material is safe.

![Scenario Simulator](assets/screenshots/01_scenario_simulator.png)

---

## Project Overview

**The problem.** The NASA *Flame in Free Fall* challenge asks how microgravity combustion research can inform spacecraft fire safety, future lunar habitats and fire on Earth. The evidence is fragmented: each NASA Physical Sciences Informatics (PSI) investigation has its own spreadsheets, units, conventions, repeated rows and reports. Comparing it, or seeing where it is missing, is hard.

**What Ember Atlas does:**

- It reconciles the five investigations into one provenance-preserving dataset, without changing a single original value.
- It loads that dataset into PostgreSQL and serves it to a dashboard.
- It shows only measurements that **strictly** match the conditions you choose.
- It explains *why* a scenario is or isn't covered by experiments.
- It separates measured NASA data from calculations, published findings and illustrative visuals.

## Project Objectives

1. **Consolidate** the five NASA PSI combustion investigations into one source-linked dataset without altering a single original value.
2. **Match honestly:** show only measurements that strictly fit a chosen scenario, and explain gaps instead of filling them.
3. **Interpret responsibly:** turn measurements, published findings and basic physics into fire-safety insights for ISS-like and lunar-habitat atmospheres, never into safety certificates.
4. **Reveal research gaps:** count where experimental coverage is dense, sparse or missing.
5. **Connect to Earth:** show how microgravity combustion research informs building materials, fire safety, burners, wildfire, pollution and engines.
6. **Stay reproducible:** rebuild the database, the analyses and the model from this repository alone.

## Features

**1. Scenario Simulator**
- **Controls:** ISS Cabin and Lunar Habitat presets, plus controls for material/fuel, gravity, O₂, pressure and airflow. All controls stay in sync across the page.
- **Animated flame:** an illustrative WebGL flame; no numbers are read from it.
- **Measured-evidence graphs:** Plotly charts with one point per NASA source record. Records are emphasized at three levels: matching every condition, same material, and other.
- **Evidence Coverage:** records ranked by strict matching.
- **Fire Safety Insights:**
  - a scenario overview with calculated O₂ partial pressure;
  - an ISS vs Lunar comparison: 21.28 vs 19.22 kPa P<sub>O₂</sub>, because a higher O₂ *fraction* can mean *less* oxygen;
  - seven topics, each insight labelled *Measured*, *Published finding*, *Calculated*, *Physical relationship* or *Evidence gap*, with citations.

  It never returns a "safe" verdict.

**2. Cinematic Evidence Graph.** A Cytoscape.js network of investigations, NASA-listed publications, materials, scenarios, partial-gravity studies and deterministic coverage gaps. Each gap explains the requested combination, which records were considered and excluded, and why.

**3. Earth Applications.** Seven interactive views show how microgravity combustion research reaches Earth: data and background, building materials (oxygen index), fire safety, cleaner burners, wildfire spread, soot and air pollution, and engine efficiency. Every claim is cited.

**4. Resources.** Methodology, datasets, investigations, papers and findings, calculations, FM2 and lunar research, AI & machine learning, validation results, scientific limitations and references.

**Also included:**
- **Research Gap Explorer:** a parameter × parameter coverage matrix in the source-record workbench (`#/records`).
- **12 AI-assisted findings:** each one page-verified.
- **A ridge-regression model** of FLEX burning rates. It is evaluated only; predictions are disabled.

## Scientific Data

All data is from NASA's [Physical Sciences Informatics](https://psi.nasa.gov/) repository. Each catalog declares **CC0-1.0**, and the eight data files are byte-identical to NASA downloads.

| Investigation | NASA id | What it measured | DOI |
|---|---|---|---|
| **FLEX**, Flame Extinguishment Experiment | PSI-69 | Droplet burning rates and extinction (methanol, n-heptane; O₂ 12–34%, 70–309 kPa) | [10.60555/mbq8-0451](https://doi.org/10.60555/mbq8-0451) |
| **CFI**, Cool Flames Investigation | PSI-39 | Low-temperature (cool-flame) droplet burning | [10.60555/m6pj-a914](https://doi.org/10.60555/m6pj-a914) |
| **SAME-R**, Smoke Aerosol Measurement Experiment Reflight | PSI-101 | Smoke from heated spacecraft materials | [10.60555/2np7-jv14](https://doi.org/10.60555/2np7-jv14) |
| **SPICE**, Smoke Point In Co-flow Experiment | PSI-107 | Gas-jet flames, smoke points, soot | [10.60555/9kbh-e962](https://doi.org/10.60555/9kbh-e962) |
| **BASS-II**, Burning and Suppression of Solids II | PSI-25 | Flame spread and extinction over solids | [10.60555/4qc4-de67](https://doi.org/10.60555/4qc4-de67) |

The data covers 1,068 experimental-table rows (42 exact repeats retained) and 19,641 SPICE workbook cells. In PostgreSQL that becomes 1,716 source records, 24,097 parameter observations and 248 measurements.

Partial-gravity sources are kept *outside* the catalogue: NASA LUCI, Konno et al., Gollner et al. and ACME. See [`dataset/README.md`](dataset/README.md).

## Architecture

```
dataset/raw (NASA files) ─► curation/ (extraction · units · reconciliation · evidence review) ─► dataset/processed
                                                                                                  │ hash-verified
                                                                                                  ▼
       ml/ (ridge regression, grouped CV) ◄── spine ◄── backend/ FastAPI + science layer ◄── PostgreSQL (database/)
                                                 │
                                                 ├─► /api/spine, /api/coverage, /api/records/detail …
                                                 └─► static export (frontend/public/data) for a database-free demo
                                                          ▼
                                     frontend/ React + TypeScript: Simulator · Evidence Graph · Earth · Resources
```

**One shared data spine.** All pages read the same JSON contract. It is served live from PostgreSQL, or from a SHA-256-verified static export.

**Deterministic logic.** Matching, gap detection and fire-safety rules are pure TypeScript and Python functions with unit tests.

**One path configuration.** Every component resolves paths through [`ember_atlas/paths.py`](ember_atlas/paths.py).

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the full source-to-visualization data flow.

## Public Hosting

```
Browser ──► GitHub Pages  https://samriddhi-r-kori.github.io/ember-atlas/   (static React build, frontend/)
              │  VITE_API_BASE_URL (public URL only)
              ▼
            Render web service  https://ember-atlas-api-9l9i.onrender.com   (FastAPI, render.yaml, free plan)
              │  DATABASE_URL (secret, stored only in Render)
              ▼
            Neon PostgreSQL (free plan, persistent)   loaded by the real pipeline at build time:
            restore_references.py → init_database.py (migrations + hash-verified ingestion + record counts)
```

- **Frontend:** every push to `main` runs `.github/workflows/deploy.yml`: `npm ci`, the unit tests, a production build with base `/ember-atlas/`, deployment to GitHub Pages and a live response check. Routes use hashes (`#/simulator`), and `404.html` redirects direct links such as `/ember-atlas/graph`.
- **Backend:** Render redeploys automatically from `main`. Its build re-verifies and (idempotently) ingests the dataset, and it only accepts browser requests from the Pages origin (CORS). Each client is limited to 300 requests a minute. The review tools that can write data are disabled.
- **Fallback:** if the API is unreachable, the site can run entirely on the bundled static export, which holds the same records, checked by SHA-256. The Research Gap Explorer needs the live API.

See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) for setup, limits and costs.

## Repository Structure

```
ember-atlas/
├── frontend/          React/TypeScript dashboard (src/pages, src/science, src/components), Earth module (earth-module/),
│                      static data export (public/data), Vitest unit tests and Playwright browser tests
├── backend/           FastAPI app (app/main.py), ORM models, ingestion, research/gap API, science layer
│                      (app/science: contract, spine, export, retrieval audit), pytest suite (tests/)
├── curation/          dataset pipeline: raw NASA files → dataset/processed (extract, units, reconcile, review)
├── dataset/           THE scientific data: raw/<investigation>, processed/, metadata/ (manifest, baseline,
│                      data dictionary), references/ (catalog snapshots, manifests, findings), README.md
├── database/          Alembic migrations, generated schema.sql, README.md
├── ml/                ridge regression: config, preprocessing, training, evaluation, artifacts, reports, README.md
├── ember_atlas/       shared configuration (paths, investigation registry)
├── scripts/           install, restore references, build/validate dataset, init database, start servers,
│                      build artifacts, export static, verify; research/ (PDF candidate extraction)
├── tests/curation/    curation pipeline regression tests
├── docs/              ARCHITECTURE, SOURCES, MIGRATION, AI_SOURCES, scientific/ (reviews, issues, contract), verification/
├── assets/screenshots/
├── requirements.txt · requirements.lock · requirements-dev.txt · pyproject.toml
└── README.md · LICENSE · CONTRIBUTING.md · .env.example · .gitignore
```

## Technology Stack

| Layer | Technologies |
|---|---|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS, Plotly.js, Cytoscape.js, WebGL (flame), lucide-react |
| Backend | Python 3.10+, FastAPI, SQLAlchemy 2, Alembic, psycopg 3, Uvicorn |
| Database | PostgreSQL (14+ tested) |
| Science / ML | NumPy (closed-form ridge regression), openpyxl and xlrd (workbook extraction), poppler `pdftotext` (citation checks) |
| Testing | pytest, Vitest, Playwright (Chromium) |

## Getting Started

On Ubuntu 22.04 or newer, the whole setup is:

```bash
git clone https://github.com/Samriddhi-R-Kori/ember-atlas.git && cd ember-atlas
bash scripts/install.sh --with-browsers         # .venv + npm ci + Chromium
cp .env.example .env                            # set DATABASE_URL
python3 scripts/restore_references.py --download
bash scripts/start_backend.sh                   # terminal 1: init database (first run) + API on :8000
bash scripts/start_frontend.sh                  # terminal 2: dashboard on http://127.0.0.1:5173
```

## Installation

**System packages:**

```bash
sudo apt update
sudo apt install -y git python3 python3-venv postgresql poppler-utils curl
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - && sudo apt install -y nodejs   # Node.js 22 (developed with 22.16)
```

**Project dependencies:**

```bash
python3 -m venv .venv && .venv/bin/pip install -r requirements.lock      # Python (exact tested versions, incl. NumPy)
(cd frontend && npm ci --legacy-peer-deps)                                # frontend (lockfile)
(cd frontend && npx playwright install chromium)                          # only for browser tests
```

`bash scripts/install.sh` does the same. `--legacy-peer-deps` avoids an npm peer-resolution error with Vitest's optional peers.

## Dataset Setup

The NASA data files, catalog snapshots, processed release and manifests are all committed. Only the cited reference documents are not committed: report PDFs and DOCX guides, a university thesis, papers and two web assets, about 110 MB. Their redistribution rights are not established.

The pipeline and database ingestion verify their hashes, so restore them once:

```bash
.venv/bin/python scripts/restore_references.py --download   # official URLs; a file is written only if its SHA-256 matches
.venv/bin/python scripts/validate_dataset.py                # files, hashes, baseline and record counts vs dataset/metadata/manifest.json
```

To regenerate `dataset/processed/` from the raw files, run `python scripts/build_dataset.py`. Details are in [`dataset/README.md`](dataset/README.md).

## Environment Configuration

Copy `.env.example` to `.env`. The scripts read it automatically; it is git-ignored.

| Variable | Purpose | Default |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection (`postgresql+psycopg://user:password@host:port/db`) | — (required) |
| `EMBER_ATLAS_TEST_DATABASE_URL` | Database for the PostgreSQL integration tests (they use isolated schemas) | `DATABASE_URL` |
| `API_HOST`, `API_PORT` | FastAPI bind address | `127.0.0.1`, `8000` |
| `WEB_PORT` | Vite dev server port (it proxies `/api` to `API_PORT`) | `5173` |
| `EMBER_ATLAS_DATASET_DIR` | Relocate the `dataset/` folder | `./dataset` |
| `EMBER_ATLAS_REVIEW_ENABLED`, `EMBER_ATLAS_REVIEWER_TOKEN` | Local-only review queue for AI-assisted findings | off |
| `EMBER_ATLAS_LLM_PROVIDER` | Optional LLM for `/api/ask`; empty means deterministic extractive answers | empty |

## Database Setup

```bash
sudo -u postgres psql -c "CREATE ROLE ember_atlas LOGIN PASSWORD 'choose-a-local-password';"
sudo -u postgres psql -c "CREATE DATABASE ember_atlas OWNER ember_atlas;"
# in .env: DATABASE_URL=postgresql+psycopg://ember_atlas:choose-a-local-password@127.0.0.1:5432/ember_atlas
set -a; . ./.env; set +a
.venv/bin/python scripts/init_database.py
```

`init_database.py` runs three steps:

1. It applies the Alembic migrations.
2. It loads `dataset/processed/` in one transaction, after verifying every pinned hash.
3. It checks the expected counts: 1,716 source records, 24,097 observations, 248 measurements, 363 quality issues, 35,015 evidence locations and 2,960 reconciliation links.

Re-running it is safe. See [`database/README.md`](database/README.md).

## Running the Backend

```bash
bash scripts/start_backend.sh
```

The script loads `.env` and runs `scripts/init_database.py`. That command is idempotent: it applies migrations, verifies the hashes and checks the counts. The script then serves FastAPI on `API_HOST:API_PORT` (default http://127.0.0.1:8000; `GET /api/health`, `GET /api/spine`, `GET /api/coverage` …).

## Running the Frontend

```bash
bash scripts/start_frontend.sh    # = cd frontend && npm run dev
```

Open **http://127.0.0.1:5173/**. The four pages are `#/simulator`, `#/graph`, `#/earth` and `#/resources`; the Research Gap Explorer is at `#/records`.

**Database-free demo:** `cd frontend && VITE_STATIC_ONLY=1 npx vite build --outDir dist-static --base ./` builds a static site from `frontend/public/data`.

**Refresh the static export:** after changing the data contract, run `python scripts/export_static.py`. `python scripts/build_artifacts.py` also rebuilds the inventory, the model and the retrieval audit.

## Machine Learning

A **ridge regression of the FLEX droplet burning-rate constant** (mm²/s). The full write-up is in [`ml/README.md`](ml/README.md).

| | |
|---|---|
| Data | 257 FLEX records in 107 condition groups. Only FLEX is used. |
| Inputs | fuel, O₂, pressure, He fraction, CO₂ fraction, initial droplet diameter |
| Method | β̂ = (XᵀX + λI)⁻¹Xᵀy on standardized features, with an unpenalized mean intercept, solved in closed form with NumPy |
| Choosing λ | Picked from {0.01 … 100} by inner grouped cross-validation |
| Evaluation | 5-fold **grouped** cross-validation, so repeated test conditions never straddle the train/test split |

| Model | MAE (mm²/s) |
|---|---|
| Ridge regression | **0.0475** |
| Per-fuel mean baseline | 0.102 |
| Global mean baseline | 0.107 |

The model is `not_approved`; predictions are disabled in the UI and no model output is shown as a measurement. `python -m ml.train --check` reproduces these metrics.

## Research Gap Detection

For two selected parameters A and B, the Research Gap Explorer counts the qualifying records in each cell:

C(a, b) = Σᵢ 𝟙(Aᵢ = a ∧ Bᵢ = b)

**Binning:**
- Categorical values, and numeric parameters with eight or fewer distinct values, use exact levels.
- Other numeric parameters use equal-width bins within the observed range (default 4).
- Records with missing or unusable metadata are reported separately and never counted as empty cells. Exact repeats stay in the counts.

**Cell classes:**

| Class | Meaning |
|---|---|
| **Observed** | Count is at or above the threshold |
| **Sparse** | Count is above zero but below the threshold (default 3) |
| **Unobserved** | Count is zero |

**Example:** for SPICE fuel × nozzle diameter, methane has 2, 2 and 0 records at the 0.41, 0.76 and 1.60 mm nozzles. A test pins this example.

The Simulator and Evidence Graph apply the same idea with *strict matching*: a record qualifies only if every selected condition matches within that record's reported precision.

A gap describes **this catalogue only**. It is not proof that no experiment exists.

## Scientific Methodology

| Kind | How it is shown | Example |
|---|---|---|
| **Measured NASA evidence** | Source values with file, row, column and SHA-256 provenance. Nothing is imputed, and missing, zero, dash and disputed values stay distinct. | FLEX burning-rate constants |
| **Published findings** | Statements tied to a report page | BASS-II extinction velocity, Table 2.1 |
| **Calculations and physical relationships** | Labelled as such | P<sub>O₂</sub> = P<sub>total</sub> × O₂ fraction; buoyant velocity ∝ √g |
| **Qualitative visualization** | The flame renderer and Earth demonstrations, which are illustrative and produce no numbers | |
| **ML estimates** | Evaluated only, never displayed as values | |

Open scientific issues are listed in [`docs/scientific/OUTSTANDING_SCIENTIFIC_ISSUES.md`](docs/scientific/OUTSTANDING_SCIENTIFIC_ISSUES.md). There are 12, including SPICE calibration, FLEX Test 114 pressure and run identities.

## Testing

```bash
set -a; . ./.env; set +a                              # DATABASE_URL (+ EMBER_ATLAS_TEST_DATABASE_URL, defaults to it)
.venv/bin/python -m pytest -q                         # 30 curation + 47 backend/API/science/ML tests (PostgreSQL)
(cd frontend && npx vitest run)                       # 48 unit tests: gap engine, fire-safety insights, graph, interpolation
(cd frontend && npx playwright test)                  # 17 browser journeys (starts or reuses API_PORT/WEB_PORT servers)
.venv/bin/python scripts/verify.py                    # everything above + dataset validation, ML reproduction, schema drift,
                                                      # production + static builds, static smoke test, bundle secret scan
```

`verify.py` writes [`docs/verification/VERIFICATION_RESULTS.md`](docs/verification/VERIFICATION_RESULTS.md). The Resources page displays the same results.

## Data Sources and Attribution

**NASA Physical Sciences Informatics:**
- Investigations: PSI-69 FLEX, PSI-39 CFI, PSI-101 SAME-R, PSI-107 SPICE and PSI-25 BASS-II. The data is CC0-1.0; please cite the DOIs above.
- The NASA and PSI investigation teams collected all measurements. Ember Atlas only curates and visualizes them.

**Cited reports** (retrieved locally, not redistributed):
- NASA/TP-2015-216046 (FLEX)
- NASA/TM-20210011385 (BASS-II)
- NTRS 20130000422 / AIAA 2012-3536 (SAME-2)
- PSI-107 SPICE Final Report and 30-Day Report
- PSI-39 CFI Final Report
- PSI-101 SAME-R Final Report
- SPICE M.S. thesis (University of Maryland)

**Partial-gravity sources:**
- NASA LUCI, NTRS 20250010653
- Konno et al., *Proc. Combust. Inst.* 39
- Gollner et al., NTRS 20210022402
- ACME, NTRS 20210022542

**Earth Applications references:**
- Rothermel (1972), USDA INT-115
- CSIRO slope effects
- NASA Glenn Otto-cycle guide
- other sources cited in the module ([1]–[15])

**Upstream packaging:** the raw NASA files were first obtained through the open-source Fotia project (MIT; [`dataset/upstream/FOTIA_LICENSE`](dataset/upstream/FOTIA_LICENSE)). No Fotia application code is included.

**Licence:** see [`LICENSE`](LICENSE). The code and documentation are all rights reserved, and third-party material keeps its own terms.

**Migration:** [`docs/MIGRATION.md`](docs/MIGRATION.md) records how this repository was created from the original research workspace, with integrity checks.

**Sources:** every dataset, report, scientific resource, library and font used is listed with its URL and licence in [`docs/SOURCES.md`](docs/SOURCES.md).

**Contributors:** Samriddhi Kori (repository owner and sole commit author of the original project repository).

*Ember Atlas is an independent research project for the NASA Space Apps Challenge 2026 and is not endorsed by NASA.*

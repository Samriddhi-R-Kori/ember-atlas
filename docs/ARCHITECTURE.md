# Ember Atlas architecture and data flow

Ember Atlas is a modular monolith. The pieces are:

| Piece | Location | Role |
|---|---|---|
| Dataset | `dataset/` | One directory holds all scientific data |
| Curation pipeline | `curation/` | Turns the raw files into the processed release |
| PostgreSQL evidence store | `database/` | Alembic migrations and the generated schema |
| FastAPI backend | `backend/app/` | API, matching rules and the data spine |
| Machine learning | `ml/` | Ridge regression training and evaluation |
| React dashboard | `frontend/` | The four dashboard pages |

Every path is resolved through `ember_atlas/paths.py`. `EMBER_ATLAS_DATASET_DIR` can relocate the dataset.

```
dataset/raw/<investigation>/        NASA PSI files (CC0), hashed
        │  curation/extract.py      csv.reader · xlrd (+BIFF formula tokens) · openpyxl (formula + cached value)
        ▼
curation/pipeline.py + review.py    missingness, units, duplicates kept, reconciliation candidates, evidence review
        │  (verifies dataset/references/* hashes and byte identity with official NASA downloads)
        ▼
dataset/processed/                  source_records · observations · quality_issues · spice/* · review/* · build_manifest
        │  scripts/build_dataset.py pins dataset/metadata/baseline.json
        ▼
backend/app/ingestion.py            verifies baseline hashes → curation.ingest (SQLite interchange) → PostgreSQL (one transaction)
        ▼
PostgreSQL (database/migrations)    investigation · source_record · evidence_location · parameter_definition · parameter_observation ·
                                    measurement · media_asset · reconciliation_link · quality_issue · record_quality · dataset_release
        ▼
backend/app/science/spine.py        one JSON "spine": records with conditions (c), extra parameters (x), metrics (m),
  + contract.py                     scenarios, references, findings, partial-gravity evidence, fire-safety rules
        ▼
FastAPI  /api/spine  /api/coverage  /api/records/detail  /api/series  /api/comparison …
        │                         └── scripts/export_static.py → frontend/public/data/<version>/spine.json (static demo)
        ▼
frontend/src/lib/data.ts            live API, or the SHA-256-checked static export
        ▼
React pages                         Simulator · Evidence Graph · Earth Applications · Resources (+ #/records workbench)
```

## Per-feature trace

| Feature | Frontend | Logic | Data |
|---|---|---|---|
| Scenario Simulator controls, Evidence Coverage | `pages/SimulatorPage.tsx`, `state/AppState.tsx` | `science/gapEngine.ts` (strict matching within each record's reported precision) | spine `records[].c` ← `parameter_observation` ← `dataset/raw/*/<table>` |
| Scientific graphs | `components/charts/MeasurementChart.tsx` | `science/interpolation.ts` (compatible groups only) | spine `records[].m`, `metrics` ← `measurement` / observations |
| Fire Safety Insights | `SimulatorPage.tsx` | `science/fireSafety.ts` (`advise`, `buildInsights`) | spine `fire_safety_rules`, `source_findings`, `flame_evidence`, `partial_gravity_evidence` ← `backend/app/science/contract.py` (each cites `dataset/references/*`) |
| Cinematic Evidence Graph | `pages/EvidenceGraphPage.tsx` (Cytoscape.js) | `science/graph.ts` | spine `investigations`, `papers` (NASA catalog snapshots in `dataset/references/nasa-psi/`), gaps from `gapEngine.ts` |
| Research Gap Explorer | `ResearchWorkbench.tsx` (`#/records`, live mode) | `backend/app/research.py` `coverage_grid` via `/api/coverage` | PostgreSQL observations of one investigation's experimental table |
| Earth Applications | `pages/EarthPage.tsx` + `public/earth/index.html` | `earth-module/build_earth.py` builds from hash-pinned `earth-module/original/` | built-in demonstration data and cited references (`[1]`–`[15]`) |
| Resources, ML section | `pages/ResourcesPage.tsx` | none (display) | spine `models` ← `ml/artifacts/registry.json`; `verification` ← `docs/verification/` |
| AI-assisted findings | Simulator, Graph, Resources | none (display) | `dataset/references/findings/candidates.jsonl` → `contract.SOURCE_FINDINGS` (page-verified, review pending) |
| Machine learning | Resources (metrics only) | `ml/` | spine records of PSI-69 (FLEX) only |

## Identifiers

Every source record ID is `<dataset-relative file>::<sheet or CSV>::<row>`, for example
`dataset/raw/flex/FLEX.csv::CSV::5`.

Evidence-location, definition and observation IDs are SHA-256 digests derived from those identifiers. They are deterministic for a given dataset layout.

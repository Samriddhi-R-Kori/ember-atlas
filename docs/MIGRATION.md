# Migration record: Flame in Freefall workspace → Ember Atlas

On 2026-11-15, Ember Atlas was created as an independent repository with its own git history. Its source was the research workspace's original application folder and the NASA PSI files that had been packaged by the Fotia reference project. The source workspace and its git repository were not modified.

## Layout changes

| Before (workspace) | Ember Atlas |
|---|---|
| `02_Fotia/combustion_science/microgravity_investigation/PSI-<n>/csv/*` and `info.md`, `layout.json` | `dataset/raw/{flex,cfi,same-r,spice,bass-ii}/` (original file names, bytes unchanged) |
| `…/datasets/curated/p0_v1_review/` | `dataset/processed/` (regenerated, see below) |
| `…/evidence/p0_review/`, `…/evidence/partial_gravity_review/` | `dataset/references/nasa-psi/`, `dataset/references/partial-gravity/` |
| `…/review_queue/candidates.jsonl` | `dataset/references/findings/candidates.jsonl` (source paths updated; SHA-256 unchanged) |
| `…/reports/P0_ENGINEERING_BASELINE.json` | `dataset/metadata/baseline.json` (re-pinned by `scripts/build_dataset.py`) |
| `…/reports/common_data_dictionary_v1.md` | `dataset/metadata/data_dictionary.md` |
| `…/p0/` | `curation/` (pipeline 1.2.0) |
| `…/backend/migrations`, `alembic.ini` | `database/migrations`, `database/alembic.ini` |
| `…/backend/app/science/modeling.py` | `ml/` (`config.py`, `preprocessing/`, `training/`, `evaluation/`, `train.py`) |
| `…/models/` | `ml/artifacts/` |
| `…/reports/…` (selected) | `docs/scientific/`, `docs/verification/`, `ml/reports/`, `assets/screenshots/` |

## Integrity checks

These checks were run before publication, against the original curated outputs and a read-only view of the original PostgreSQL database.

| Check | Result |
|---|---|
| Raw NASA files | 16 files. SHA-256 identical to the original baseline (`source_hashes` equal after path mapping). |
| Curated outputs (38 files) | 34 identical after mapping the old paths to the new ones. All 1,068 source records, 12,484 observations, 363 quality issues, 19,641 workbook cells, 2,960 reconciliation links and the audits are identical. The other 4 differ only as intended (see below). |
| Database tables (fresh `ember_atlas` vs original) | All 8 counts are equal: 1,716 source records, 24,097 observations, 248 measurements, 363 quality issues, 35,015 evidence locations, 2,960 reconciliation links, 5,461 record-quality rows, 0 experiment runs. |
| Database content | Every table is identical row for row after path mapping, with SHA-256-derived IDs masked. Those IDs are recomputed from the new path identifiers. |
| Investigation distribution | PSI-69 274 · PSI-39 87 · PSI-101 109 · PSI-107 1,117 · PSI-25 129 (source_record table). This is identical to the original. |
| ML evaluation | Retraining from the migrated data reproduced every metric exactly: ridge MAE 0.04746 mm²/s, per-fuel and global baselines, per-fuel results, fold λ, coefficients and intercept. |
| Retrieval audit | 20/20 cases, identical metrics. |
| Static spine | 1,180 records with identical values. The only differences are paths, derived IDs and reworded labels. |
| Gap example (SPICE fuel × nozzle) | Identical counts. Pinned by `backend/tests/test_integration.py::test_spice_fuel_by_nozzle_example_shown_in_resources`. |

The four intended output differences are:

1. `REPORT.md` has a new title.
2. `build_manifest.json` has a new pipeline version, timestamp and code hashes.
3. `review/evidence_snapshots.json` no longer lists eight duplicate copies of official NASA data files. They are byte-identical to `dataset/raw/` files, are kept only once, and are still verified against the official download hashes.
4. `review/third_party_licenses.json` now lists only the upstream data packaging (Fotia, MIT). It previously inventoried the workspace's seven reference-project folders, which are not part of Ember Atlas.

## Defects found and fixed during migration

- **Investigation inferred from file paths:**
  - The review overlay matched the strings `PSI-107/`, `PSI-69/` and `PSI-25/` in file paths. After the move, it silently dropped the SPICE calendar dates and the FLEX burning-rate unit evidence.
  - Per-investigation audits did the same.
  - Both now use `ember_atlas.paths.investigation_of`. The comparison above found the regression, and the fix restored identical output.
- **Missing NumPy:** `requirements` lacked NumPy, which the ML code needs. It is now pinned (`numpy==2.2.6`).
- **Weak output guard:** the curation output guard allowed writes anywhere under `/tmp`. It now always refuses `dataset/raw/` and `dataset/references/`.
- **Verification results leaked a local path:** they recorded absolute interpreter paths. The static-export safety check caught this, and they now record portable commands.

## Not carried over

- **Reference projects** (`01_`–`08_` folders), their submodules and the workspace audit script: they are not part of the application.
- **Historical outputs and development reports:**
  - the superseded curated output `p0_v1`, the SQLite staging databases and old screenshots;
  - phase-by-phase development reports and logs;
  - historical hash records of the old layout.
- **Scripts:**
  - `create_psi69.py` depended on Fotia's own processed table;
  - `verify_p1a.py`, `verify_mvp.py` and `smoke_startup.py` are superseded by `scripts/verify.py`;
  - `p0/fetch_*.py` rewrote hashed manifests, and `scripts/restore_references.py` replaces them.
- **Docker Compose files:** never executed (Docker was unavailable) and written for the old layout. The supported setup is the Ubuntu workflow in the README.
- **Earth Applications source ZIP:** its full contents are already in `frontend/earth-module/original/` and hash-pinned in `ORIGINAL_SHA256SUMS`.
- **Reference documents:** the PDF/DOCX reports, the SPICE thesis, the partial-gravity papers and two NASA web assets have redistribution rights that are not established. They are restored by checksum from the official URLs (see `dataset/README.md`).

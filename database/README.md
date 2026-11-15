# Ember Atlas database

PostgreSQL holds the evidence store. Its schema is versioned by Alembic and kept in `migrations/`; `0001_baseline.py` applies `0001_baseline.sql`. `schema/schema.sql` is the generated offline SQL of all migrations, kept for reading and review.

## Tables

| Table | Holds |
|---|---|
| `investigation` | The five NASA PSI investigations |
| `evidence_source` | One row per hashed source file |
| `evidence_location` | Exact file, sheet, row and column of every value |
| `source_record` | 1,716 source records: CSV rows and SPICE workbook records |
| `parameter_definition`, `parameter_observation` | Every reported value with original text, normalization and status |
| `measurement` | Source-reported measured quantities |
| `media_asset` | References to SPICE images; the images are not retrieved |
| `reconciliation_link` | Candidate correspondences between records; never merged |
| `quality_issue`, `record_quality` | Open issues and which records they affect |
| `experiment_run`, `operating_condition_segment`, `experiment_recipe`, `research_suggestion` | Empty by design: run identities are not established |
| `dataset_release` | The pinned release (manifest hash, baseline hash, NASA registry) |

## Initialize

```bash
# Ubuntu: sudo apt install postgresql
sudo -u postgres psql -c "CREATE ROLE ember_atlas LOGIN PASSWORD 'choose-a-local-password';"
sudo -u postgres psql -c "CREATE DATABASE ember_atlas OWNER ember_atlas;"
export DATABASE_URL='postgresql+psycopg://ember_atlas:choose-a-local-password@127.0.0.1:5432/ember_atlas'

python scripts/restore_references.py --download   # once; ingestion verifies these hashes
python scripts/init_database.py                   # alembic upgrade head → verified ingestion → record-count check
python scripts/init_database.py --schema          # optional: regenerate schema/schema.sql
```

`init_database.py` performs three steps:

1. It applies the migrations.
2. It runs `backend/app/ingestion.py`, which:
   - verifies every hash pinned in `dataset/metadata/baseline.json` (processed outputs, raw files and reference documents);
   - stages `dataset/processed/` through `curation/ingest.py`;
   - loads everything into PostgreSQL in a single transaction.
3. It checks the table counts against `expected_database_counts` in `dataset/metadata/manifest.json`.

Re-running it is safe: a release that is already loaded is detected and reported as `already_ingested`. A different release is refused rather than overwritten. Use a fresh database for a rebuilt dataset.

No database dump or credentials are kept in the repository. The database is rebuilt entirely from `dataset/`.

`scripts/local_postgres.sh` is optional. It runs a user-owned PostgreSQL cluster on machines without the system service.

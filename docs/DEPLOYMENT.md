# Deployment

| Piece | Host | Plan | URL |
|---|---|---|---|
| Dashboard (React build) | GitHub Pages | free | https://samriddhi-r-kori.github.io/ember-atlas/ |
| API (FastAPI) | Render web service `ember-atlas-api` (`render.yaml`, region Ohio) | free | https://ember-atlas-api-9l9i.onrender.com |
| Database (PostgreSQL) | Neon | free | private connection string, stored only as Render's `DATABASE_URL` |

## How updates go live

- **Push to `main`:**
  - **GitHub Actions** (`.github/workflows/deploy.yml`) runs `npm ci`, `vitest`, a production build (`VITE_BASE_PATH=/ember-atlas/`, `VITE_API_BASE_URL` from the repository variable `EMBER_ATLAS_API_URL`), deploys to Pages and checks the live page.
  - **Render** rebuilds the API. The build runs `pip install -r requirements.lock`, `scripts/restore_references.py --download` (cited documents, SHA-256 verified) and `scripts/init_database.py` (migrations, hash-verified ingestion, record-count check). An already-loaded release is detected and kept. If any step fails, the previous version keeps serving.
- **Rebuilding the dataset** (`scripts/build_dataset.py`) creates a new release ID. Ingestion never overwrites a release, so use a fresh Neon database or branch for it.

## Configuration

| Variable | Where | Value |
|---|---|---|
| `DATABASE_URL` | Render (secret) | Neon direct connection string (`postgresql://…?sslmode=require`; normalized to psycopg 3 by the app) |
| `EMBER_ATLAS_CORS_ORIGINS` | `render.yaml` | `https://samriddhi-r-kori.github.io` |
| `EMBER_ATLAS_RATE_LIMIT_PER_MINUTE` | `render.yaml` | `300` per client |
| `EMBER_ATLAS_REVIEW_ENABLED` | `render.yaml` | `0` (the review endpoints that can write data are off) |
| `EMBER_ATLAS_API_URL` | GitHub repository variable (public) | the Render URL above |

No secret is stored in the repository or the website bundle.

## Free-plan limits (no recurring cost)

- **Render free web service:**
  - It sleeps after a period without traffic. The next visit wakes it in up to about a minute; the dashboard explains this and offers the bundled data meanwhile.
  - Free instance hours are limited per month across the workspace.
  - [Render free plan](https://render.com/free).
- **Neon free plan:**
  - 1 GB storage per project (Ember Atlas uses about 64 MB) and 100 compute hours a month.
  - It scales to zero after 5 minutes idle and wakes in under a second.
  - It does not expire.
  - [Neon plan limits](https://neon.com/faqs/free-plan-limits-and-quotas).
- **Render's own free PostgreSQL was not used.** It expires after 30 days and is deleted after a 14-day grace period ([Render Postgres plans](https://render.com/docs/postgresql-refresh)).
- **GitHub Pages:** free for public repositories.

Upgrading any of these is optional and would be a billing decision for the repository owner.

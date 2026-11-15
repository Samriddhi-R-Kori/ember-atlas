# Ember Atlas verification results

Executed 2026-11-15T11:19:45+00:00 by `python scripts/verify.py`.

| Check | Status | Detail | Command |
|---|---|---|---|
| Dataset manifest, hashes and record counts | passed | dataset OK: files, hashes, baseline and record counts match the manifest | `python scripts/validate_dataset.py` |
| Curation pipeline regression tests (pytest) | passed | 30 passed in 8.63s | `python -m pytest -q -p no:cacheprovider tests` |
| PostgreSQL API, research, science and ML tests (pytest) | passed | 47 passed, 1 warning in 13.15s | `python -m pytest -q -p no:cacheprovider backend/tests` |
| ML evaluation reproduces registered metrics | passed | grouped-CV metrics reproduced | `python -m ml.train --check` |
| Alembic schema drift check | passed | no schema drift | `python -m alembic -c database/alembic.ini check` |
| Gap engine, interpolation and graph tests (vitest) | passed | 48 passed (48) | `(frontend) npx vitest run` |
| TypeScript + Vite production build | passed | built in 3.85s | `(frontend) npm run build` |
| Static public build (VITE_STATIC_ONLY=1) | passed | built in 3.93s | `(frontend) npx vite build --outDir dist-static --base ./` |
| Browser journeys incl. legacy MVP (Playwright, Chromium) | passed | 17 passed (33.5s) | `(frontend) npx playwright test` |
| Static demo smoke test (no database) | passed | STATIC demo renders all four pages from the export with no API | `(frontend) node scripts/static_smoke.mjs` |
| Static bundle secret/path scan | passed | no database URLs, local paths or reviewer tokens | `scripts/verify.py (scan of frontend/dist-static)` |

#!/usr/bin/env bash
# Install Ember Atlas dependencies into this checkout: Python virtualenv (.venv) and frontend node_modules.
# Prerequisites (Ubuntu): python3 python3-venv nodejs (22.x) npm postgresql poppler-utils
set -euo pipefail
cd "$(dirname "$0")/.."
python3 -m venv .venv
.venv/bin/pip install --upgrade pip >/dev/null
.venv/bin/pip install -r requirements.lock
(cd frontend && npm ci --legacy-peer-deps)
if [[ "${1:-}" == "--with-browsers" ]]; then (cd frontend && npx playwright install chromium); fi
echo "Installed. Next: cp .env.example .env (edit DATABASE_URL), python scripts/restore_references.py --download, bash scripts/start_backend.sh"

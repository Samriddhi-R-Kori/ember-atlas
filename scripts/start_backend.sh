#!/usr/bin/env bash
# Start the Ember Atlas API: initialize/verify the database (idempotent), then serve FastAPI on API_HOST:API_PORT.
set -euo pipefail
cd "$(dirname "$0")/.."
set -a; [[ -f .env ]] && . ./.env; set +a
: "${DATABASE_URL:?Set DATABASE_URL in .env (see .env.example)}"
PY="${PYTHON_BIN:-$PWD/.venv/bin/python}"
export PYTHONPATH="$PWD:$PWD/backend${PYTHONPATH:+:$PYTHONPATH}"
"$PY" scripts/init_database.py
exec "$PY" -m uvicorn app.main:app --host "${API_HOST:-127.0.0.1}" --port "${API_PORT:-8000}"

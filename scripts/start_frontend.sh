#!/usr/bin/env bash
# Start the Ember Atlas dashboard (Vite dev server on WEB_PORT, proxying /api to API_PORT).
set -euo pipefail
cd "$(dirname "$0")/.."
set -a; [[ -f .env ]] && . ./.env; set +a
cd frontend && exec npm run dev

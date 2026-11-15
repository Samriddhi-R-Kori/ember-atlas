# OPTIONAL helper for machines without a system PostgreSQL service. Source it: `source scripts/local_postgres.sh`.
# Runs a user-owned PostgreSQL cluster from binaries in $EMBER_ATLAS_RUNTIME (default ~/.local/share/ember-atlas).
# With the Ubuntu `postgresql` package you do not need this file.
EMBER_ATLAS_RUNTIME="${EMBER_ATLAS_RUNTIME:-${XDG_DATA_HOME:-$HOME/.local/share}/ember-atlas}"
EMBER_ATLAS_PG_PORT="${EMBER_ATLAS_PG_PORT:-55432}"
for d in "$EMBER_ATLAS_RUNTIME"/pg/usr/lib/postgresql/*/bin; do [[ -d "$d" ]] && export PATH="$d:$PATH"; done
[[ -d "$EMBER_ATLAS_RUNTIME/pg/usr/lib/x86_64-linux-gnu" ]] && export LD_LIBRARY_PATH="$EMBER_ATLAS_RUNTIME/pg/usr/lib/x86_64-linux-gnu${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"
[[ -d "$EMBER_ATLAS_RUNTIME/node/bin" ]] && export PATH="$EMBER_ATLAS_RUNTIME/node/bin:$PATH"
[[ -d "$EMBER_ATLAS_RUNTIME/browsers" ]] && export PLAYWRIGHT_BROWSERS_PATH="$EMBER_ATLAS_RUNTIME/browsers"
export DATABASE_URL="${DATABASE_URL:-postgresql+psycopg://ember_atlas@127.0.0.1:$EMBER_ATLAS_PG_PORT/ember_atlas}"
ember_db_init(){ mkdir -p "$EMBER_ATLAS_RUNTIME/run"; initdb -D "$EMBER_ATLAS_RUNTIME/pgdata" -U ember_atlas --auth=trust -E UTF8 && ember_db_start && createdb -h 127.0.0.1 -p "$EMBER_ATLAS_PG_PORT" -U ember_atlas ember_atlas; }
ember_db_start(){ pg_ctl -D "$EMBER_ATLAS_RUNTIME/pgdata" -l "$EMBER_ATLAS_RUNTIME/postgres.log" -o "-h 127.0.0.1 -p $EMBER_ATLAS_PG_PORT -k $EMBER_ATLAS_RUNTIME/run" start; }
ember_db_stop(){ pg_ctl -D "$EMBER_ATLAS_RUNTIME/pgdata" stop; }

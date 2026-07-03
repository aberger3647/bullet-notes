#!/usr/bin/env bash
# Apply pending Supabase migrations (supabase/migrations/*.sql) to the shared
# self-hosted Postgres, auto-detecting local-vs-SSH (shared scripts/supabase-exec.sh).
#
# The deployed app has no SUPABASE_DB_URL/DATABASE_URL set (see AGENTS.md), so
# scripts/migrate.mjs — which the postinstall hook runs on every Dokploy build —
# always no-ops in production. This script is the actual way migrations reach
# the shared instance. It reuses the same bullet_notes_schema_migrations ledger
# scripts/migrate.mjs tracks, so it's safe to run repeatedly: only files not
# already recorded in the ledger are applied, each wrapped in its own
# transaction (ON_ERROR_STOP aborts + rolls back that file on error).
#
#   npm run db:migrate

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=scripts/supabase-exec.sh
source "$SCRIPT_DIR/supabase-exec.sh"
cd "$SCRIPT_DIR/.."

DB_CONTAINER="${SUPABASE_DB_CONTAINER:-cf-supabase-dygaax-supabase-db}"
DB_USER="${SUPABASE_DB_USER:-postgres}"
DB_NAME="${SUPABASE_DB_NAME:-postgres}"
MIGRATIONS_DIR="supabase/migrations"
LEDGER_TABLE="bullet_notes_schema_migrations"

# psql_in: feed SQL/a migration file on stdin to psql, choosing local docker vs SSH.
if supabase_container_is_local "$DB_CONTAINER"; then
  psql_in() { docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 "$@"; }
  where="local docker ($DB_CONTAINER)"
else
  psql_in() { ssh "$SUPABASE_SSH_HOST" "docker exec -i $DB_CONTAINER psql -U $DB_USER -d $DB_NAME -v ON_ERROR_STOP=1 $*"; }
  where="ssh $SUPABASE_SSH_HOST ($DB_CONTAINER)"
fi

echo "Checking $LEDGER_TABLE via $where"
psql_in >/dev/null <<SQL
create table if not exists $LEDGER_TABLE (id text primary key, applied_at timestamptz not null default now());
SQL

applied="$(psql_in -t -A <<<"select id from $LEDGER_TABLE order by id;")"

pending=()
for f in "$MIGRATIONS_DIR"/*.sql; do
  name="$(basename "$f")"
  if ! grep -qx "$name" <<<"$applied"; then
    pending+=("$f")
  fi
done

if [ "${#pending[@]}" -eq 0 ]; then
  echo "No pending migrations."
  exit 0
fi

for f in "${pending[@]}"; do
  name="$(basename "$f")"
  echo "  → $name"
  { echo "begin;"; cat "$f"; echo "insert into $LEDGER_TABLE (id) values ('$name');"; echo "commit;"; } | psql_in
done

echo "Applied ${#pending[@]} migration(s): $(printf '%s ' "${pending[@]##*/}")"

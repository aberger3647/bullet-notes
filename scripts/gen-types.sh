#!/usr/bin/env bash
# Generate src/database-generated.types.ts from the self-hosted Supabase
# Postgres schema. Calls the postgres-meta container's `/generators/typescript`
# endpoint (using the node binary that ships inside the meta image, so no
# curl / wget required).
#
# If the meta container is present on the local Docker daemon (i.e. we're
# already on the Supabase host), exec it directly; otherwise reach it over SSH
# (shared scripts/supabase-exec.sh).
#
# The DB hosts multiple apps; the file emits *all* public-schema tables and
# functions. Re-run this whenever migrations land.
#
#   npm run gen:types

set -euo pipefail

# shellcheck source=scripts/supabase-exec.sh
source "$(cd "$(dirname "$0")" && pwd)/supabase-exec.sh"
cd "$(dirname "$0")/.."

META_CONTAINER="${SUPABASE_META_CONTAINER:-cf-supabase-dygaax-supabase-meta}"
OUT="src/database-generated.types.ts"

if supabase_container_is_local "$META_CONTAINER"; then
  # Already on the Supabase host — no SSH needed.
  docker exec "$META_CONTAINER" node -e "fetch('http://localhost:8080/generators/typescript?included_schemas=public').then(r=>r.text()).then(t=>process.stdout.write(t))" > "$OUT"
else
  # Remote — reach the meta container over SSH.
  ssh "$SUPABASE_SSH_HOST" "docker exec $META_CONTAINER node -e \"fetch('http://localhost:8080/generators/typescript?included_schemas=public').then(r=>r.text()).then(t=>process.stdout.write(t))\"" > "$OUT"
fi

# Reject empty / error output so we don't silently overwrite the file.
if ! grep -q "export type Database" "$OUT"; then
  echo "Generation failed; $OUT does not look like a types file:" >&2
  head -5 "$OUT" >&2
  exit 1
fi

# Prepend a header so editors / reviewers know the file is generated.
TMP=$(mktemp)
{
  echo "// GENERATED — do not edit by hand."
  echo "// Re-run \`npm run gen:types\` after schema migrations."
  echo ""
  cat "$OUT"
} > "$TMP"
mv "$TMP" "$OUT"

echo "Wrote $OUT"

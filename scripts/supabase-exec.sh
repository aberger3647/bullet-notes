# Shared by apply-migrations.sh and gen-types.sh — the single place that
# decides how to reach the self-hosted Supabase containers. If a container is
# running on the LOCAL Docker daemon (we're already on the Supabase/Dokploy
# host) use docker directly; otherwise tunnel the command over SSH. Neither
# script hardcodes a location — they detect it, so this keeps working if the
# DB ever moves off `alex`.
#
# Override with env vars: SUPABASE_SSH_HOST, SUPABASE_DB_CONTAINER,
# SUPABASE_META_CONTAINER, SUPABASE_DB_USER, SUPABASE_DB_NAME.
#
# This file is meant to be `source`d, not executed.

SUPABASE_SSH_HOST="${SUPABASE_SSH_HOST:-alex}"

# True when the container named $1 is running on the local Docker daemon.
supabase_container_is_local() {
  command -v docker >/dev/null 2>&1 &&
    docker ps --format '{{.Names}}' 2>/dev/null | grep -qx "$1"
}

#!/usr/bin/env bash
set -euo pipefail

# 0) Start local Supabase stack (this boots the required Docker services).
supabase start >/dev/null

# 1) Capture `supabase status -o env` output and keep only KEY=VALUE lines
#    (filters out noise like "Stopped services ...").
STATUS_ENV="$(
  supabase status -o env 2>/dev/null \
  | grep -E '^[A-Z0-9_]+=' || true
)"

# 2) Helper to extract a value from STATUS_ENV and strip surrounding quotes.
get_env() {
  local key="$1"
  echo "$STATUS_ENV" \
    | grep -E "^${key}=" \
    | head -n1 \
    | cut -d= -f2- \
    | sed -E 's/^"//; s/"$//'
}

HOST_API_URL="$(get_env API_URL)"
ANON_KEY="$(get_env ANON_KEY)"
SERVICE_ROLE_KEY="$(get_env SERVICE_ROLE_KEY)"

if [[ -z "${HOST_API_URL}" || -z "${SERVICE_ROLE_KEY}" ]]; then
  echo "ERROR: Could not read API_URL or SERVICE_ROLE_KEY from 'supabase status'. Check 'supabase start/status'."
  exit 1
fi

# 3) Write an env file for the Edge Runtime (runs inside Docker).
#    Use Supabase's internal Docker network URL for Kong.
#    (Avoids host.docker.internal quirks on Linux CI runners.)
mkdir -p supabase
cat > supabase/.env.edge <<EOF
SUPABASE_URL=http://kong:8000
SUPABASE_ANON_KEY=${ANON_KEY}
SUPABASE_SERVICE_ROLE_KEY=${SERVICE_ROLE_KEY}
SERVER_SALT=edge-test-salt-local
EOF

# 4) Start Edge Functions server in the background.
supabase functions serve --env-file supabase/.env.edge --no-verify-jwt &
SERVE_PID=$!

# 5) Ensure the background server is killed when the script exits.
trap 'kill "$SERVE_PID" 2>/dev/null || true' EXIT

# 6) Give the server a moment to come up (increase if CI is flaky).
sleep 5

# 7) Run tests on the host machine:
#    - SUPABASE_URL should point to the host-exposed API (usually 127.0.0.1:54321)
#    - SUPABASE_FUNCTIONS_URL points to the functions gateway endpoint on the host
FUNCTIONS_URL="${HOST_API_URL}/functions/v1"

SUPABASE_URL="${HOST_API_URL}" \
SUPABASE_SERVICE_ROLE_KEY="${SERVICE_ROLE_KEY}" \
SUPABASE_FUNCTIONS_URL="${FUNCTIONS_URL}" \
deno test supabase/functions/tests/edge-functions.test.ts \
  --allow-env --allow-net --allow-read

#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

PORT="${PORT:-3010}"
LOCAL_DB_URL="${TEST_DATABASE_URL:-${DATABASE_URL:-mysql://root:rootpassword@127.0.0.1:3307/terp-test}}"
JWT_SECRET="${JWT_SECRET:-local-dev-jwt-secret-1234567890abcdef}"
SKIP_LOCAL_DB_BOOTSTRAP="${SKIP_LOCAL_DB_BOOTSTRAP:-1}"

echo "Starting TERP local accounting/browser QA server on http://127.0.0.1:${PORT}"

exec env \
  PORT="$PORT" \
  NODE_ENV=development \
  QA_AUTH_ENABLED=true \
  JWT_SECRET="$JWT_SECRET" \
  DATABASE_URL="$LOCAL_DB_URL" \
  TEST_DATABASE_URL="$LOCAL_DB_URL" \
  SKIP_LOCAL_DB_BOOTSTRAP="$SKIP_LOCAL_DB_BOOTSTRAP" \
  ./node_modules/.bin/tsx server/_core/index.ts

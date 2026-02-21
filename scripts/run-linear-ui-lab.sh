#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

PORT="${PORT:-3222}"
DB_URL="${DATABASE_URL:-mysql://root:rootpassword@127.0.0.1:3307/terp-test}"
RESET_DB="${RESET_DB:-true}"

JWT_SECRET_VALUE="${JWT_SECRET:-terp-local-linear-lab-secret-2026-02-19-9917}"
NEXTAUTH_SECRET_VALUE="${NEXTAUTH_SECRET:-$JWT_SECRET_VALUE}"

export DATABASE_URL="$DB_URL"
export JWT_SECRET="$JWT_SECRET_VALUE"
export NEXTAUTH_SECRET="$NEXTAUTH_SECRET_VALUE"
export DEMO_MODE="true"
export QA_AUTH_ENABLED="true"

echo "[linear-ui-lab] starting local test database..."
pnpm test:env:up

if [[ "$RESET_DB" == "true" ]]; then
  echo "[linear-ui-lab] resetting database..."
  pnpm test:db:reset

  echo "[linear-ui-lab] seeding baseline QA users..."
  pnpm seed:qa-accounts

  echo "[linear-ui-lab] seeding representative module data..."
  if ! pnpm seed:comprehensive:light; then
    echo "[linear-ui-lab] comprehensive light seed failed, applying fallback seeds..."
    pnpm seed:qa-data || true
    pnpm seed:fill-gaps || true
  fi
fi

echo "[linear-ui-lab] launching isolated frontend on port $PORT..."
echo "[linear-ui-lab] URL: http://localhost:$PORT/dashboard"
echo "[linear-ui-lab] login is skipped (DEMO_MODE=true)."
echo "[linear-ui-lab] this uses your local branch/worktree only and does not touch production."

PORT="$PORT" DATABASE_URL="$DB_URL" DEMO_MODE="true" QA_AUTH_ENABLED="true" JWT_SECRET="$JWT_SECRET_VALUE" NEXTAUTH_SECRET="$NEXTAUTH_SECRET_VALUE" pnpm dev

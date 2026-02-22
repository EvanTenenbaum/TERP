#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

PREFERRED_PORT="${PORT:-3015}"
DB_URL="${DATABASE_URL:-mysql://root:rootpassword@127.0.0.1:3307/terp-test}"
RUN_SEED="${RUN_SEED:-true}"
RESET_DB="${RESET_DB:-true}"

export DATABASE_URL="$DB_URL"
export TEST_DATABASE_URL="${TEST_DATABASE_URL:-$DB_URL}"
export VITE_SKIP_LOGIN_LOCAL="${VITE_SKIP_LOGIN_LOCAL:-true}"
export QA_AUTH_ENABLED="${QA_AUTH_ENABLED:-true}"
export DEMO_MODE="${DEMO_MODE:-true}"
export AUTO_MIGRATE_MODE="${AUTO_MIGRATE_MODE:-detect-only}"
export JWT_SECRET="${JWT_SECRET:-terp-local-redesign-secret-2026-02-20}"
export NEXTAUTH_SECRET="${NEXTAUTH_SECRET:-$JWT_SECRET}"

find_open_port() {
  local start_port="$1"
  local port="$start_port"

  while lsof -tiTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; do
    port=$((port + 1))
  done

  echo "$port"
}

PORT_TO_USE="$(find_open_port "$PREFERRED_PORT")"

echo "[redesign-local] using database: $DB_URL"
echo "[redesign-local] preferred port: $PREFERRED_PORT"
echo "[redesign-local] selected port: $PORT_TO_USE"

echo "[redesign-local] ensuring local test database container is running..."
pnpm test:env:up

if [[ "$RUN_SEED" == "true" ]]; then
  if [[ "$RESET_DB" == "true" ]]; then
    echo "[redesign-local] resetting and reseeding redesign dataset..."
  else
    echo "[redesign-local] seeding without forced reset..."
  fi
  pnpm seed:redesign:v2
else
  echo "[redesign-local] skipping seed (RUN_SEED=false)"
fi

echo "[redesign-local] launch URL: http://localhost:$PORT_TO_USE/purchase-orders"
echo "[redesign-local] login bypass: VITE_SKIP_LOGIN_LOCAL=$VITE_SKIP_LOGIN_LOCAL (dev-only)"
echo "[redesign-local] auto-migrate mode: $AUTO_MIGRATE_MODE"
echo "[redesign-local] this runs only in your local branch/worktree; production is untouched."

PORT="$PORT_TO_USE" pnpm dev

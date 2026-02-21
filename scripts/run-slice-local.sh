#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

PORT="${PORT:-3115}"
DB_URL="${DATABASE_URL:-mysql://root:rootpassword@127.0.0.1:3307/terp-test}"
JWT_SECRET_VALUE="${JWT_SECRET:-terp-local-slice-secret-2026-02-19-0123}"
NEXTAUTH_SECRET_VALUE="${NEXTAUTH_SECRET:-$JWT_SECRET_VALUE}"

export DATABASE_URL="$DB_URL"
export JWT_SECRET="$JWT_SECRET_VALUE"
export NEXTAUTH_SECRET="$NEXTAUTH_SECRET_VALUE"

echo "[slice-local] starting local test database..."
pnpm test:env:up

echo "[slice-local] resetting test database..."
pnpm test:db:reset

echo "[slice-local] seeding QA test accounts..."
pnpm seed:qa-accounts

echo "[slice-local] launching app on port $PORT ..."
echo "[slice-local] open: http://localhost:$PORT/slice-v1-lab/purchase-orders"
echo "[slice-local] login is skipped for this isolated lab frontend."

PORT="$PORT" DATABASE_URL="$DB_URL" JWT_SECRET="$JWT_SECRET_VALUE" NEXTAUTH_SECRET="$NEXTAUTH_SECRET_VALUE" pnpm dev

#!/usr/bin/env bash
set -euo pipefail
if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL not set"
  exit 1
fi
for m in prisma/migrations/*/migration.sql; do
  echo "Applying $m"
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$m"
done

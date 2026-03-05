#!/usr/bin/env bash
set -euo pipefail

# STX-002: strict, fast-fail preflight gate for staging stress runs.
# Contract reference: docs/testing/STRESS_TESTING_RUNBOOK.md

ENV_NAME="staging"
TARGET_URL="https://terp-staging-yicld.ondigitalocean.app"
OUTPUT_DIR=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --env)
      ENV_NAME="${2:-staging}"
      shift 2
      ;;
    --env=*)
      ENV_NAME="${1#--env=}"
      shift
      ;;
    --env\\=*)
      ENV_NAME="${1#--env\\=}"
      shift
      ;;
    --target-url)
      TARGET_URL="${2:-$TARGET_URL}"
      shift 2
      ;;
    --target-url=*)
      TARGET_URL="${1#--target-url=}"
      shift
      ;;
    --target-url\\=*)
      TARGET_URL="${1#--target-url\\=}"
      shift
      ;;
    --output-dir)
      OUTPUT_DIR="${2:-}"
      shift 2
      ;;
    --output-dir=*)
      OUTPUT_DIR="${1#--output-dir=}"
      shift
      ;;
    --output-dir\\=*)
      OUTPUT_DIR="${1#--output-dir\\=}"
      shift
      ;;
    *)
      echo "Unknown argument: $1" >&2
      echo "Usage: bash scripts/stress/preflight.sh [--env staging] [--target-url URL] [--output-dir DIR]" >&2
      exit 1
      ;;
  esac
done

if [[ -z "$OUTPUT_DIR" ]]; then
  OUTPUT_DIR="qa-results/stress/preflight-$(date +%Y%m%d-%H%M%S)"
fi

mkdir -p "$OUTPUT_DIR"
BLOCKERS_FILE="$OUTPUT_DIR/BLOCKERS.md"
LOG_FILE="$OUTPUT_DIR/preflight.log"

exec > >(tee "$LOG_FILE") 2>&1

declare -a BLOCKERS=()

add_blocker() {
  BLOCKERS+=("$1")
  echo "[BLOCKER] $1"
}

echo "== TERP STRESS PREFLIGHT =="
echo "env: $ENV_NAME"
echo "target: $TARGET_URL"
echo "output: $OUTPUT_DIR"
echo "policy: NO_REPAIR=1 (no auto-fix)"

if [[ "$ENV_NAME" != "staging" ]]; then
  add_blocker "Only --env staging is supported by this stress command contract"
fi

# 1) Staging URL reachable
status_code="$(curl -sS -o /dev/null -w "%{http_code}" --max-time 15 "$TARGET_URL/api/health" || echo 000)"
if [[ "$status_code" != "200" ]]; then
  root_code="$(curl -sS -o /dev/null -w "%{http_code}" --max-time 15 "$TARGET_URL" || echo 000)"
  if [[ "$root_code" != "200" && "$root_code" != "302" ]]; then
    add_blocker "Target not reachable: /api/health=$status_code, /=$root_code"
  fi
fi

# 2) Auth prerequisites present
if [[ -z "${STRESS_AUTH_TOKEN:-}" && ( -z "${STRESS_ADMIN_EMAIL:-}" || -z "${STRESS_ADMIN_PASSWORD:-}" ) ]]; then
  add_blocker "Missing auth prerequisites: set STRESS_AUTH_TOKEN or STRESS_ADMIN_EMAIL+STRESS_ADMIN_PASSWORD"
fi

# 3) Invariant DB connectivity ready
if [[ -z "${DATABASE_URL:-}" && -z "${TEST_DATABASE_URL:-}" ]]; then
  add_blocker "Missing DATABASE_URL/TEST_DATABASE_URL required for invariant gate"
else
  node <<'NODE' || add_blocker "Invariant DB connectivity check failed"
const mysql = require("mysql2/promise");
(async () => {
  const url = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
  const conn = await mysql.createConnection(url);
  await conn.execute("SELECT 1");
  await conn.end();
})().catch((err) => {
  console.error(err?.message || err);
  process.exit(1);
});
NODE
fi

# 4) docker/k6 availability
if ! command -v k6 >/dev/null 2>&1 && ! command -v docker >/dev/null 2>&1; then
  add_blocker "Neither k6 nor docker found; one is required for API load lane"
fi

# 5) playwright runtime availability
if ! command -v pnpm >/dev/null 2>&1; then
  add_blocker "pnpm not found"
fi

if (( ${#BLOCKERS[@]} > 0 )); then
  {
    echo "# Stress Preflight Blockers"
    echo ""
    echo "Run: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
    echo "Target: $TARGET_URL"
    echo ""
    for b in "${BLOCKERS[@]}"; do
      echo "- $b"
    done
  } > "$BLOCKERS_FILE"
  echo "Preflight failed with ${#BLOCKERS[@]} blocker(s)."
  echo "Blocker report: $BLOCKERS_FILE"
  exit 1
fi

echo "Preflight PASSED"
exit 0

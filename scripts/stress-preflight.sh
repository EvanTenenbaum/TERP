#!/usr/bin/env bash
# stress-preflight.sh — Strict preflight gate for TERP staging stress tests
#
# Usage:
#   bash scripts/stress-preflight.sh
#
# Exit codes:
#   0 — All checks passed, safe to run stress tests
#   1 — One or more checks failed; do NOT run stress tests
#
# Required env vars:
#   STRESS_TARGET_URL   — The staging base URL to test against

set -euo pipefail

# ── Colors ────────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RESET='\033[0m'

pass() { echo -e "${GREEN}[PASS]${RESET} $*"; }
fail() { echo -e "${RED}[FAIL]${RESET} $*"; }
warn() { echo -e "${YELLOW}[WARN]${RESET} $*"; }
info() { echo -e "${CYAN}[INFO]${RESET} $*"; }

FAILURES=0

check_fail() {
  fail "$1"
  FAILURES=$((FAILURES + 1))
}

# ── Header ────────────────────────────────────────────────────────────────────
echo ""
echo "================================================================"
echo "  TERP Stress Test Preflight Gate"
echo "================================================================"
echo ""

# ── Check 1: STRESS_TARGET_URL is set ────────────────────────────────────────
info "Check 1/6: STRESS_TARGET_URL environment variable"
if [[ -z "${STRESS_TARGET_URL:-}" ]]; then
  check_fail "STRESS_TARGET_URL is not set. Export it before running."
  echo "         Example: export STRESS_TARGET_URL=https://terp-staging-yicld.ondigitalocean.app"
else
  pass "STRESS_TARGET_URL=${STRESS_TARGET_URL}"
fi

# ── Check 2: Staging URL is healthy ──────────────────────────────────────────
info "Check 2/6: Staging URL reachability"
if [[ -n "${STRESS_TARGET_URL:-}" ]]; then
  HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
    --max-time 15 \
    --connect-timeout 10 \
    "${STRESS_TARGET_URL}/api/health" 2>/dev/null || echo "000")

  if [[ "$HTTP_STATUS" == "200" ]]; then
    pass "Staging /api/health returned HTTP 200"
  elif [[ "$HTTP_STATUS" == "000" ]]; then
    # Try the root path if /api/health doesn't exist
    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
      --max-time 15 \
      --connect-timeout 10 \
      "${STRESS_TARGET_URL}" 2>/dev/null || echo "000")

    if [[ "$HTTP_STATUS" == "200" ]] || [[ "$HTTP_STATUS" == "302" ]]; then
      warn "No /api/health endpoint; root path returned HTTP ${HTTP_STATUS}. Continuing."
    else
      check_fail "Staging URL unreachable (HTTP ${HTTP_STATUS}). Cannot proceed."
    fi
  elif [[ "$HTTP_STATUS" =~ ^5 ]]; then
    check_fail "Staging returned HTTP ${HTTP_STATUS} — server error. Investigate before stress testing."
  else
    warn "Staging health returned HTTP ${HTTP_STATUS} — proceeding with caution."
  fi
else
  warn "Skipping reachability check (STRESS_TARGET_URL not set)"
fi

# ── Check 3: Stress tool is installed ────────────────────────────────────────
info "Check 3/6: Stress tool availability (k6 or autocannon)"
STRESS_TOOL="${STRESS_TOOL:-k6}"

if command -v k6 &>/dev/null; then
  K6_VERSION=$(k6 version 2>/dev/null | head -1 || echo "unknown")
  pass "k6 is available: ${K6_VERSION}"
  STRESS_TOOL="k6"
elif command -v autocannon &>/dev/null; then
  AC_VERSION=$(autocannon --version 2>/dev/null | head -1 || echo "unknown")
  pass "autocannon is available: ${AC_VERSION}"
  STRESS_TOOL="autocannon"
else
  check_fail "No stress tool found. Install k6 (preferred) or autocannon."
  echo "         k6:         https://k6.io/docs/getting-started/installation/"
  echo "         autocannon: npm install -g autocannon"
fi

# ── Check 4: Auth token or credentials are provided ──────────────────────────
info "Check 4/6: Authentication credentials"
HAS_AUTH=0

if [[ -n "${STRESS_AUTH_TOKEN:-}" ]]; then
  pass "STRESS_AUTH_TOKEN is set (${#STRESS_AUTH_TOKEN} chars)"
  HAS_AUTH=1
fi

if [[ -n "${STRESS_ADMIN_EMAIL:-}" ]] && [[ -n "${STRESS_ADMIN_PASSWORD:-}" ]]; then
  pass "STRESS_ADMIN_EMAIL + STRESS_ADMIN_PASSWORD are set"
  HAS_AUTH=1
fi

if [[ "$HAS_AUTH" -eq 0 ]]; then
  warn "No auth credentials set. Authenticated endpoint tests will fail."
  warn "Set STRESS_AUTH_TOKEN or STRESS_ADMIN_EMAIL + STRESS_ADMIN_PASSWORD."
fi

# ── Check 5: No active deploys detected ──────────────────────────────────────
info "Check 5/6: Active deployment detection"
# We can't query DigitalOcean directly without the API token, so we do a
# lightweight heuristic: check if the staging URL returns consistent results.
if [[ -n "${STRESS_TARGET_URL:-}" ]]; then
  RESPONSE_1=$(curl -s -o /dev/null -w "%{http_code}" \
    --max-time 10 \
    "${STRESS_TARGET_URL}/api/health" 2>/dev/null || echo "000")
  sleep 1
  RESPONSE_2=$(curl -s -o /dev/null -w "%{http_code}" \
    --max-time 10 \
    "${STRESS_TARGET_URL}/api/health" 2>/dev/null || echo "000")

  if [[ "$RESPONSE_1" == "$RESPONSE_2" ]]; then
    pass "Staging appears stable (consistent responses: HTTP ${RESPONSE_1})"
  else
    warn "Staging responses inconsistent (${RESPONSE_1} vs ${RESPONSE_2}) — possible active deploy."
    warn "Wait for deploy to complete before running stress tests."
  fi

  # Check for DO_DEPLOYING_TOKEN if available
  if [[ -n "${DIGITALOCEAN_API_TOKEN:-}" ]]; then
    info "DigitalOcean API token present — checking for active deploys..."
    # If we had jq + doctl, we'd check here. Document the manual step.
    warn "Manual check required: Visit DigitalOcean dashboard to verify no deploys are in progress."
  else
    warn "DIGITALOCEAN_API_TOKEN not set — cannot auto-detect active deploys."
    warn "Manually verify no deploys are in progress before continuing."
  fi
else
  warn "Skipping deployment check (STRESS_TARGET_URL not set)"
fi

# ── Check 6: Output directory is writable ────────────────────────────────────
info "Check 6/6: Output directory"
OUTPUT_DIR="${STRESS_OUTPUT_DIR:-./stress-results}"

if mkdir -p "$OUTPUT_DIR" 2>/dev/null; then
  if touch "${OUTPUT_DIR}/.preflight-write-test" 2>/dev/null; then
    rm -f "${OUTPUT_DIR}/.preflight-write-test"
    pass "Output directory is writable: ${OUTPUT_DIR}"
  else
    check_fail "Output directory exists but is not writable: ${OUTPUT_DIR}"
  fi
else
  check_fail "Cannot create output directory: ${OUTPUT_DIR}"
fi

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
echo "================================================================"
if [[ "$FAILURES" -eq 0 ]]; then
  echo -e "${GREEN}  PREFLIGHT PASSED — Safe to run stress tests${RESET}"
  echo ""
  echo "  Tool:   ${STRESS_TOOL}"
  echo "  Target: ${STRESS_TARGET_URL:-<not set>}"
  echo "  Output: ${OUTPUT_DIR}"
else
  echo -e "${RED}  PREFLIGHT FAILED — ${FAILURES} check(s) failed${RESET}"
  echo ""
  echo "  Fix the above issues before running stress tests."
fi
echo "================================================================"
echo ""

exit "$FAILURES"

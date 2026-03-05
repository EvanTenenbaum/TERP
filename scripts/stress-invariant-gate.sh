#!/usr/bin/env bash
# stress-invariant-gate.sh — Invariant strict gate + artifact bundle (STX-008)
#
# Validates stress test result artifacts against pass/fail invariants.
# Bundles all artifacts into a timestamped archive for reporting.
#
# This gate runs AFTER stress profiles complete. It reads the summary JSON
# files produced by k6 and applies hard invariants. If any invariant fails,
# the gate exits 1.
#
# Usage:
#   bash scripts/stress-invariant-gate.sh [--results-dir ./stress-results]
#
# Invariants checked:
#   - Smoke: p95 < 500ms, error rate < 1%
#   - Peak:  p95 < 2000ms, error rate < 5%
#   - Soak:  p95 < 1000ms, error rate < 2%, no pool saturation events
#
# Exit codes:
#   0 — All invariants passed
#   1 — One or more invariants failed

set -euo pipefail

# ── Colors ────────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

pass()   { echo -e "${GREEN}[PASS]${RESET}  $*"; }
fail()   { echo -e "${RED}[FAIL]${RESET}  $*"; }
warn()   { echo -e "${YELLOW}[WARN]${RESET}  $*"; }
info()   { echo -e "${CYAN}[INFO]${RESET}  $*"; }
header() { echo -e "\n${BOLD}${CYAN}═══ $* ═══${RESET}\n"; }

FAILURES=0
RESULTS_DIR="./stress-results"
RUN_ID=$(date +%Y%m%d-%H%M%S)

# ── Argument parsing ──────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case "$1" in
    --results-dir)
      RESULTS_DIR="${2:-./stress-results}"
      shift 2
      ;;
    *)
      echo "Unknown argument: $1"
      echo "Usage: bash scripts/stress-invariant-gate.sh [--results-dir DIR]"
      exit 1
      ;;
  esac
done

# ── Header ────────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}================================================================${RESET}"
echo -e "${BOLD}  TERP Stress Test Invariant Gate${RESET}"
echo -e "${BOLD}================================================================${RESET}"
echo "  Results dir: ${RESULTS_DIR}"
echo "  Run ID:      ${RUN_ID}"
echo ""

# ── Check jq availability ─────────────────────────────────────────────────────
if ! command -v jq &>/dev/null; then
  warn "jq not installed — JSON parsing unavailable. Checking text output logs only."
  HAS_JQ=0
else
  HAS_JQ=1
fi

# ── Helper: extract metric from k6 summary JSON ───────────────────────────────
# k6 summary JSON structure: metrics.<name>.values.<stat>
extract_metric() {
  local file="$1"
  local metric_path="$2"  # e.g., .metrics.http_req_duration.values."p(95)"
  local default="${3:-N/A}"

  if [[ "$HAS_JQ" -eq 0 ]] || [[ ! -f "$file" ]]; then
    echo "$default"
    return
  fi

  jq -r "${metric_path} // \"${default}\"" "$file" 2>/dev/null || echo "$default"
}

# ── Helper: compare two numbers ───────────────────────────────────────────────
# Returns 0 if value <= threshold, 1 if value > threshold
numeric_check() {
  local value="$1"
  local threshold="$2"

  if [[ "$value" == "N/A" ]] || [[ -z "$value" ]]; then
    return 2  # Cannot determine
  fi

  # Use bc for floating point comparison
  if command -v bc &>/dev/null; then
    local result
    result=$(echo "$value <= $threshold" | bc -l 2>/dev/null || echo "0")
    if [[ "$result" == "1" ]]; then
      return 0
    else
      return 1
    fi
  else
    # Fallback: integer comparison (truncate)
    local int_value="${value%%.*}"
    local int_threshold="${threshold%%.*}"
    if [[ "$int_value" -le "$int_threshold" ]]; then
      return 0
    else
      return 1
    fi
  fi
}

# ── Invariant check function ──────────────────────────────────────────────────
check_profile_invariants() {
  local profile="$1"
  local p95_threshold="$2"
  local error_rate_threshold="$3"  # as decimal (e.g., 0.01 for 1%)
  local check_pool_saturation="${4:-0}"

  local summary_file="${RESULTS_DIR}/${profile}-summary.json"
  local output_log="${RESULTS_DIR}/${profile}-output.log"
  local profile_failures=0

  header "Invariants: ${profile} profile"

  if [[ ! -f "$summary_file" ]] && [[ ! -f "$output_log" ]]; then
    warn "No artifacts found for '${profile}' profile. Was this profile run?"
    echo "  Skipping invariant check for missing profile."
    return 0
  fi

  # Check 1: p95 latency
  info "Checking p95 latency (threshold: <${p95_threshold}ms)"
  if [[ "$HAS_JQ" -eq 1 ]] && [[ -f "$summary_file" ]]; then
    local p95
    p95=$(extract_metric "$summary_file" '.metrics.http_req_duration.values."p(95)"' "N/A")

    if [[ "$p95" == "N/A" ]]; then
      warn "Could not extract p95 from ${summary_file}"
    elif numeric_check "$p95" "$p95_threshold"; then
      pass "p95 latency: ${p95}ms <= ${p95_threshold}ms"
    else
      fail "p95 latency: ${p95}ms > ${p95_threshold}ms threshold"
      profile_failures=$((profile_failures + 1))
    fi
  else
    warn "Cannot check p95 without jq and summary JSON"
  fi

  # Check 2: Error rate
  info "Checking error rate (threshold: <$(echo "$error_rate_threshold * 100" | bc 2>/dev/null || echo "${error_rate_threshold}")%)"
  if [[ "$HAS_JQ" -eq 1 ]] && [[ -f "$summary_file" ]]; then
    local error_rate
    error_rate=$(extract_metric "$summary_file" '.metrics.http_req_failed.values.rate' "N/A")

    if [[ "$error_rate" == "N/A" ]]; then
      warn "Could not extract error rate from ${summary_file}"
    elif numeric_check "$error_rate" "$error_rate_threshold"; then
      local error_pct
      error_pct=$(echo "scale=2; $error_rate * 100" | bc 2>/dev/null || echo "${error_rate}")
      pass "Error rate: ${error_pct}% <= $(echo "scale=0; $error_rate_threshold * 100" | bc 2>/dev/null || echo "${error_rate_threshold}")%"
    else
      local error_pct
      error_pct=$(echo "scale=2; $error_rate * 100" | bc 2>/dev/null || echo "${error_rate}")
      fail "Error rate: ${error_pct}% > $(echo "scale=0; $error_rate_threshold * 100" | bc 2>/dev/null || echo "${error_rate_threshold}")% threshold"
      profile_failures=$((profile_failures + 1))
    fi
  else
    warn "Cannot check error rate without jq and summary JSON"
  fi

  # Check 3: Pool saturation (soak only)
  if [[ "$check_pool_saturation" -eq 1 ]]; then
    info "Checking MySQL pool saturation events (threshold: 0 expected at soak VU level)"
    if [[ "$HAS_JQ" -eq 1 ]] && [[ -f "$summary_file" ]]; then
      local pool_events
      pool_events=$(extract_metric "$summary_file" '.metrics.mysql_pool_saturation_events.values.count' "0")

      if [[ "$pool_events" == "N/A" ]] || [[ "$pool_events" == "0" ]] || [[ -z "$pool_events" ]]; then
        pass "Pool saturation events: 0 (expected)"
      else
        warn "Pool saturation events: ${pool_events} (unexpected during soak — possible connection leak)"
        warn "This is a warning, not a hard failure. Escalate to Evan before production promotion."
      fi
    else
      warn "Cannot check pool saturation without jq and summary JSON"
    fi
  fi

  if [[ "$profile_failures" -eq 0 ]]; then
    success "${profile} profile invariants: ALL PASSED"
  else
    error "${profile} profile invariants: ${profile_failures} FAILED"
    FAILURES=$((FAILURES + profile_failures))
  fi

  return "$profile_failures"
}

# ── Run invariant checks ──────────────────────────────────────────────────────
# Args: profile  p95_threshold_ms  error_rate_decimal  check_pool_saturation
check_profile_invariants "smoke" "500"  "0.01" "0" || true
check_profile_invariants "peak"  "2000" "0.05" "0" || true
check_profile_invariants "soak"  "1000" "0.02" "1" || true

# ── Artifact bundle ───────────────────────────────────────────────────────────
header "Artifact Bundle"

BUNDLE_NAME="stress-artifacts-${RUN_ID}.tar.gz"
BUNDLE_PATH="${RESULTS_DIR}/${BUNDLE_NAME}"

# Create archive directory for historical storage
ARCHIVE_DIR="${RESULTS_DIR}/archive/$(date +%Y-%m-%d)"
mkdir -p "$ARCHIVE_DIR"

# Collect files to bundle
FILES_TO_BUNDLE=()
for f in \
  "${RESULTS_DIR}/smoke-summary.json" \
  "${RESULTS_DIR}/peak-summary.json" \
  "${RESULTS_DIR}/soak-summary.json" \
  "${RESULTS_DIR}/smoke-output.log" \
  "${RESULTS_DIR}/peak-output.log" \
  "${RESULTS_DIR}/soak-output.log" \
  "${RESULTS_DIR}"/stress-report-*.md; do
  if [[ -f "$f" ]]; then
    FILES_TO_BUNDLE+=("$(basename "$f")")
  fi
done

if [[ "${#FILES_TO_BUNDLE[@]}" -eq 0 ]]; then
  warn "No artifact files found to bundle in ${RESULTS_DIR}"
  warn "Were stress profiles run before this gate?"
else
  if command -v tar &>/dev/null; then
    (cd "$RESULTS_DIR" && tar -czf "$BUNDLE_NAME" "${FILES_TO_BUNDLE[@]}" 2>/dev/null) || true
    if [[ -f "$BUNDLE_PATH" ]]; then
      # Copy to archive
      cp "$BUNDLE_PATH" "${ARCHIVE_DIR}/${BUNDLE_NAME}" 2>/dev/null || true
      pass "Artifact bundle created: ${BUNDLE_PATH}"
      info "Archived to: ${ARCHIVE_DIR}/${BUNDLE_NAME}"

      # List bundle contents
      info "Bundle contents:"
      tar -tzf "$BUNDLE_PATH" 2>/dev/null | while read -r f; do
        echo "    - $f"
      done || true
    else
      warn "Failed to create artifact bundle"
    fi
  else
    warn "tar not available — skipping artifact bundle"
  fi
fi

# ── Invariant report ──────────────────────────────────────────────────────────
INVARIANT_REPORT="${RESULTS_DIR}/invariant-report-${RUN_ID}.md"

cat > "$INVARIANT_REPORT" <<EOF
# Stress Test Invariant Gate Report

**Date**: $(date -u +"%Y-%m-%d %H:%M:%S UTC")
**Run ID**: ${RUN_ID}
**Results Directory**: ${RESULTS_DIR}

## Invariant Thresholds

| Profile | p95 Threshold | Error Rate Threshold | Pool Saturation |
|---------|---------------|----------------------|-----------------|
| Smoke   | < 500ms       | < 1%                 | N/A             |
| Peak    | < 2000ms      | < 5%                 | N/A (expected)  |
| Soak    | < 1000ms      | < 2%                 | 0 (warning)     |

## Result

**Overall**: $([ "$FAILURES" -eq 0 ] && echo "PASSED" || echo "FAILED (${FAILURES} invariant failure(s))")

## Artifacts

- Bundle: \`${BUNDLE_NAME}\`
- Archive: \`${ARCHIVE_DIR}/${BUNDLE_NAME}\`
EOF

pass "Invariant report written: ${INVARIANT_REPORT}"

# ── Final summary ─────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}================================================================${RESET}"
if [[ "$FAILURES" -eq 0 ]]; then
  echo -e "${GREEN}${BOLD}  INVARIANT GATE PASSED — All thresholds met${RESET}"
else
  echo -e "${RED}${BOLD}  INVARIANT GATE FAILED — ${FAILURES} invariant(s) violated${RESET}"
  echo ""
  echo "  Do not promote staging to production until these are resolved."
fi
echo ""
echo "  Bundle:  ${BUNDLE_PATH}"
echo "  Report:  ${INVARIANT_REPORT}"
echo -e "${BOLD}================================================================${RESET}"
echo ""

exit "$FAILURES"

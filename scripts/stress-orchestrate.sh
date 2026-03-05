#!/usr/bin/env bash
# stress-orchestrate.sh — TERP staging stress test orchestrator
#
# Orchestrates: preflight -> stress run -> artifact collection -> report
#
# Usage:
#   bash scripts/stress-orchestrate.sh [--profile smoke|peak|soak|all]
#
# Flags:
#   --profile <name>    Run a specific profile (default: all)
#   --skip-preflight    Skip the preflight gate (NOT recommended)
#
# Always runs with NO_REPAIR=1 — no automatic fixes during stress testing.
#
# Required env vars:
#   STRESS_TARGET_URL   — The staging base URL
#
# Optional env vars:
#   STRESS_AUTH_TOKEN       — Bearer token for auth
#   STRESS_ADMIN_EMAIL      — Admin email (alternative auth)
#   STRESS_ADMIN_PASSWORD   — Admin password (alternative auth)
#   STRESS_OUTPUT_DIR       — Output directory (default: ./stress-results)
#   STRESS_TOOL             — k6 or autocannon (default: k6)

set -euo pipefail

# ── NO_REPAIR enforcement ─────────────────────────────────────────────────────
# CRITICAL: Never attempt automatic repairs during stress testing.
# This would corrupt the measurement and potentially cause data integrity issues.
export NO_REPAIR=1

# ── Colors ────────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

info()    { echo -e "${CYAN}[INFO]${RESET}  $*"; }
success() { echo -e "${GREEN}[OK]${RESET}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${RESET}  $*"; }
error()   { echo -e "${RED}[ERROR]${RESET} $*" >&2; }
header()  { echo -e "\n${BOLD}${CYAN}═══ $* ═══${RESET}\n"; }

# ── Defaults ──────────────────────────────────────────────────────────────────
PROFILE="all"
SKIP_PREFLIGHT=0
OUTPUT_DIR="${STRESS_OUTPUT_DIR:-./stress-results}"
STRESS_TOOL="${STRESS_TOOL:-k6}"
STRESS_TARGET_URL="${STRESS_TARGET_URL:-}"

START_TIME=$(date +%s)
RUN_ID=$(date +%Y%m%d-%H%M%S)

# ── Argument parsing ──────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case "$1" in
    --profile)
      PROFILE="${2:-all}"
      shift 2
      ;;
    --skip-preflight)
      SKIP_PREFLIGHT=1
      shift
      ;;
    *)
      error "Unknown argument: $1"
      echo "Usage: bash scripts/stress-orchestrate.sh [--profile smoke|peak|soak|all] [--skip-preflight]"
      exit 1
      ;;
  esac
done

# ── Validate tool detection ───────────────────────────────────────────────────
if command -v k6 &>/dev/null; then
  STRESS_TOOL="k6"
elif command -v autocannon &>/dev/null; then
  STRESS_TOOL="autocannon"
fi

# ── Header ────────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}================================================================${RESET}"
echo -e "${BOLD}  TERP Staging Stress Test Orchestrator${RESET}"
echo -e "${BOLD}================================================================${RESET}"
echo "  Run ID:  ${RUN_ID}"
echo "  Profile: ${PROFILE}"
echo "  Tool:    ${STRESS_TOOL}"
echo "  Target:  ${STRESS_TARGET_URL:-<NOT SET>}"
echo "  Output:  ${OUTPUT_DIR}"
echo -e "  ${YELLOW}NO_REPAIR=1 is enforced — no automatic fixes will occur${RESET}"
echo ""

# ── Create output directory ───────────────────────────────────────────────────
mkdir -p "${OUTPUT_DIR}"
REPORT_FILE="${OUTPUT_DIR}/stress-report-${RUN_ID}.md"

# Initialize report
cat > "$REPORT_FILE" <<EOF
# TERP Stress Test Report

**Run ID**: ${RUN_ID}
**Date**: $(date -u +"%Y-%m-%d %H:%M:%S UTC")
**Profile**: ${PROFILE}
**Tool**: ${STRESS_TOOL}
**Target**: ${STRESS_TARGET_URL:-<not set>}
**NO_REPAIR**: enforced

---

EOF

OVERALL_EXIT=0

# ── Step 1: Preflight ─────────────────────────────────────────────────────────
header "Step 1: Preflight Gate"

if [[ "$SKIP_PREFLIGHT" -eq 1 ]]; then
  warn "Preflight skipped via --skip-preflight flag. THIS IS NOT RECOMMENDED."
  echo "- **Preflight**: SKIPPED (--skip-preflight flag used)" >> "$REPORT_FILE"
else
  SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  if bash "${SCRIPT_DIR}/stress-preflight.sh"; then
    success "Preflight passed"
    echo "- **Preflight**: PASSED" >> "$REPORT_FILE"
  else
    error "Preflight FAILED. Aborting stress run."
    echo "- **Preflight**: FAILED — stress run aborted" >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
    echo "## Result: ABORTED (preflight failure)" >> "$REPORT_FILE"
    exit 1
  fi
fi

# ── Step 2: Run stress profiles ───────────────────────────────────────────────
header "Step 2: Stress Profiles"

echo "## Profile Results" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

run_k6_profile() {
  local name="$1"
  local script="tests/stress/${name}.k6.js"
  local summary_file="${OUTPUT_DIR}/${name}-summary.json"

  info "Running ${name} profile via k6..."

  if [[ ! -f "$script" ]]; then
    error "k6 script not found: ${script}"
    echo "### ${name}: SKIPPED (script not found: ${script})" >> "$REPORT_FILE"
    return 1
  fi

  local k6_exit=0
  k6 run \
    --summary-export "${summary_file}" \
    --env STRESS_TARGET_URL="${STRESS_TARGET_URL}" \
    --env STRESS_AUTH_TOKEN="${STRESS_AUTH_TOKEN:-}" \
    --env NO_REPAIR="${NO_REPAIR}" \
    "$script" 2>&1 | tee "${OUTPUT_DIR}/${name}-output.log" || k6_exit=$?

  if [[ "$k6_exit" -eq 0 ]]; then
    success "${name} profile PASSED"
    echo "### ${name}: PASSED" >> "$REPORT_FILE"
  else
    error "${name} profile FAILED (exit code: ${k6_exit})"
    echo "### ${name}: FAILED (exit code: ${k6_exit})" >> "$REPORT_FILE"
    OVERALL_EXIT=1
  fi

  if [[ -f "$summary_file" ]]; then
    echo "" >> "$REPORT_FILE"
    echo '```json' >> "$REPORT_FILE"
    # Include key metrics only (p95, error rate)
    cat "$summary_file" | grep -E '"p\(95\)"|"rate"|"http_req_failed"|"http_req_duration"' \
      | head -20 >> "$REPORT_FILE" 2>/dev/null || true
    echo '```' >> "$REPORT_FILE"
  fi

  echo "" >> "$REPORT_FILE"
  return "$k6_exit"
}

run_autocannon_profile() {
  local name="$1"
  local duration_s="$2"
  local connections="$3"
  local summary_file="${OUTPUT_DIR}/${name}-summary.json"

  if [[ -z "$STRESS_TARGET_URL" ]]; then
    error "STRESS_TARGET_URL is not set. Cannot run autocannon."
    echo "### ${name}: FAILED (STRESS_TARGET_URL not set)" >> "$REPORT_FILE"
    OVERALL_EXIT=1
    return 1
  fi

  info "Running ${name} profile via autocannon (${connections} connections, ${duration_s}s)..."

  local ac_exit=0
  autocannon \
    --connections "$connections" \
    --duration "$duration_s" \
    --json \
    "${STRESS_TARGET_URL}/api/health" \
    > "$summary_file" 2>"${OUTPUT_DIR}/${name}-errors.log" || ac_exit=$?

  if [[ "$ac_exit" -eq 0 ]]; then
    # Parse the JSON to check error rate
    local errors non2xx total error_rate
    errors=$(cat "$summary_file" | grep -o '"errors":[0-9]*' | grep -o '[0-9]*' | head -1 || echo "0")
    non2xx=$(cat "$summary_file" | grep -o '"non2xx":[0-9]*' | grep -o '[0-9]*' | head -1 || echo "0")
    total=$(cat "$summary_file" | grep -o '"totalCompletedRequests":[0-9]*' | grep -o '[0-9]*' | head -1 || echo "1")

    local failed=$((errors + non2xx))
    if [[ "$total" -gt 0 ]]; then
      error_rate=$(echo "scale=4; $failed / $total * 100" | bc 2>/dev/null || echo "unknown")
    else
      error_rate="unknown"
    fi

    success "${name} profile completed (error rate: ${error_rate}%)"
    echo "### ${name}: COMPLETED (error rate: ${error_rate}%)" >> "$REPORT_FILE"
  else
    error "${name} profile FAILED (exit code: ${ac_exit})"
    echo "### ${name}: FAILED (exit code: ${ac_exit})" >> "$REPORT_FILE"
    OVERALL_EXIT=1
  fi

  echo "" >> "$REPORT_FILE"
}

run_profile() {
  local name="$1"
  local ac_duration="${2:-30}"
  local ac_connections="${3:-10}"

  if [[ "$STRESS_TOOL" == "k6" ]]; then
    run_k6_profile "$name" || true
  else
    run_autocannon_profile "$name" "$ac_duration" "$ac_connections" || true
  fi
}

case "$PROFILE" in
  smoke)
    run_profile "smoke" 30 10
    ;;
  peak)
    run_profile "peak" 120 50
    ;;
  soak)
    run_profile "soak" 600 20
    ;;
  all)
    info "Running all profiles: smoke -> peak -> soak"
    run_profile "smoke" 30 10
    run_profile "peak" 120 50
    run_profile "soak" 600 20
    ;;
  *)
    error "Unknown profile: ${PROFILE}. Use smoke, peak, soak, or all."
    exit 1
    ;;
esac

# ── Step 3: Artifact collection ───────────────────────────────────────────────
header "Step 3: Artifact Collection"

ARTIFACT_ARCHIVE="${OUTPUT_DIR}/artifacts-${RUN_ID}.tar.gz"

# Collect all output files into a timestamped archive
if command -v tar &>/dev/null; then
  tar -czf "$ARTIFACT_ARCHIVE" -C "$OUTPUT_DIR" \
    $(ls "${OUTPUT_DIR}" | grep -v "artifacts-" | grep -v "archive" || true) \
    2>/dev/null || true
  success "Artifacts archived: ${ARTIFACT_ARCHIVE}"
  echo "" >> "$REPORT_FILE"
  echo "## Artifacts" >> "$REPORT_FILE"
  echo "" >> "$REPORT_FILE"
  echo "- Archive: \`${ARTIFACT_ARCHIVE}\`" >> "$REPORT_FILE"
  ls "${OUTPUT_DIR}"/*.json 2>/dev/null | while read -r f; do
    echo "- $(basename "$f")" >> "$REPORT_FILE"
  done || true
else
  warn "tar not available — skipping artifact archive"
fi

# ── Step 4: Final report ──────────────────────────────────────────────────────
header "Step 4: Report"

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

cat >> "$REPORT_FILE" <<EOF

---

## Run Summary

| Field | Value |
|-------|-------|
| Run ID | ${RUN_ID} |
| Duration | ${DURATION}s |
| Tool | ${STRESS_TOOL} |
| Target | ${STRESS_TARGET_URL:-<not set>} |
| Overall Result | $([ "$OVERALL_EXIT" -eq 0 ] && echo "PASSED" || echo "FAILED") |

EOF

echo ""
echo -e "${BOLD}================================================================${RESET}"
if [[ "$OVERALL_EXIT" -eq 0 ]]; then
  echo -e "${GREEN}${BOLD}  STRESS RUN COMPLETE — ALL PROFILES PASSED${RESET}"
else
  echo -e "${RED}${BOLD}  STRESS RUN COMPLETE — ONE OR MORE PROFILES FAILED${RESET}"
fi
echo ""
echo "  Report: ${REPORT_FILE}"
echo "  Run duration: ${DURATION}s"
echo -e "${BOLD}================================================================${RESET}"
echo ""

exit "$OVERALL_EXIT"

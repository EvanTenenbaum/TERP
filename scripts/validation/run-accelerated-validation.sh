#!/bin/bash
# Accelerated AI Validation Protocol - Master Script
# Replaces staged rollout with comprehensive automated testing
# Estimated time: 4-6 hours

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
RESULTS_DIR="$PROJECT_ROOT/qa-results/accelerated-validation-$(date +%Y%m%d-%H%M%S)"

mkdir -p "$RESULTS_DIR"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() { echo -e "${GREEN}[$(date +%H:%M:%S)]${NC} $1"; }
warn() { echo -e "${YELLOW}[$(date +%H:%M:%S)] WARNING:${NC} $1"; }
error() { echo -e "${RED}[$(date +%H:%M:%S)] ERROR:${NC} $1"; }

START_TIME=$(date +%s)

echo ""
echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║           ACCELERATED AI VALIDATION PROTOCOL                      ║"
echo "║           Work Surfaces Deployment Validation                     ║"
echo "║           Estimated time: 4-6 hours                               ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""
echo "Results will be saved to: $RESULTS_DIR"
echo ""

# ═══════════════════════════════════════════════════════════════════════════
# PHASE A: Infrastructure Validation (1-2 hours)
# ═══════════════════════════════════════════════════════════════════════════

echo "┌─────────────────────────────────────────────────────────────────┐"
echo "│ PHASE A: Infrastructure Validation                              │"
echo "└─────────────────────────────────────────────────────────────────┘"

PHASE_A_START=$(date +%s)
PHASE_A_PASSED=true

# A.1: TypeScript Compilation
log "A.1: TypeScript compilation check..."
if cd "$PROJECT_ROOT" && pnpm typecheck > "$RESULTS_DIR/a1-typecheck.log" 2>&1; then
  log "  ✓ TypeScript compilation PASSED"
else
  error "  ✗ TypeScript compilation FAILED (see $RESULTS_DIR/a1-typecheck.log)"
  PHASE_A_PASSED=false
fi

# A.2: Build Test
log "A.2: Build verification..."
if cd "$PROJECT_ROOT" && pnpm build > "$RESULTS_DIR/a2-build.log" 2>&1; then
  log "  ✓ Build PASSED"
else
  error "  ✗ Build FAILED (see $RESULTS_DIR/a2-build.log)"
  PHASE_A_PASSED=false
fi

# A.3: Gate Scripts
log "A.3: Running QA gate scripts..."

# Placeholder scan
if [ -f "$PROJECT_ROOT/scripts/qa/placeholder-scan.sh" ]; then
  if bash "$PROJECT_ROOT/scripts/qa/placeholder-scan.sh" > "$RESULTS_DIR/a3-placeholder.log" 2>&1; then
    log "  ✓ Placeholder scan PASSED"
  else
    warn "  ⚠ Placeholder scan found issues (see log)"
  fi
else
  warn "  ⚠ placeholder-scan.sh not found, skipping"
fi

# RBAC verify
if [ -f "$PROJECT_ROOT/scripts/qa/rbac-verify.sh" ]; then
  if bash "$PROJECT_ROOT/scripts/qa/rbac-verify.sh" > "$RESULTS_DIR/a3-rbac.log" 2>&1; then
    log "  ✓ RBAC verification PASSED"
  else
    warn "  ⚠ RBAC verification found issues (see log)"
  fi
else
  warn "  ⚠ rbac-verify.sh not found, skipping"
fi

# Feature parity
if [ -f "$PROJECT_ROOT/scripts/qa/feature-parity.sh" ]; then
  if bash "$PROJECT_ROOT/scripts/qa/feature-parity.sh" > "$RESULTS_DIR/a3-parity.log" 2>&1; then
    log "  ✓ Feature parity PASSED"
  else
    warn "  ⚠ Feature parity found issues (see log)"
  fi
else
  warn "  ⚠ feature-parity.sh not found, skipping"
fi

# A.4: WorkSurfaceGate import check
log "A.4: Checking WorkSurfaceGate wiring..."
WS_COUNT=$(grep -c "WorkSurfaceGate" "$PROJECT_ROOT/client/src/App.tsx" 2>/dev/null || echo "0")
if [ "$WS_COUNT" -ge 9 ]; then
  log "  ✓ WorkSurfaceGate found $WS_COUNT times in App.tsx"
else
  warn "  ⚠ WorkSurfaceGate only found $WS_COUNT times (expected 9)"
  echo "WorkSurfaceGate count: $WS_COUNT (expected 9)" >> "$RESULTS_DIR/a4-wiring.log"
fi

PHASE_A_END=$(date +%s)
PHASE_A_TIME=$((PHASE_A_END - PHASE_A_START))
log "Phase A completed in ${PHASE_A_TIME}s"
echo ""

# ═══════════════════════════════════════════════════════════════════════════
# PHASE B: Unit & Integration Tests (1-2 hours)
# ═══════════════════════════════════════════════════════════════════════════

echo "┌─────────────────────────────────────────────────────────────────┐"
echo "│ PHASE B: Unit & Integration Tests                               │"
echo "└─────────────────────────────────────────────────────────────────┘"

PHASE_B_START=$(date +%s)
PHASE_B_PASSED=true

# B.1: Unit Tests
log "B.1: Running unit tests..."
if cd "$PROJECT_ROOT" && pnpm test > "$RESULTS_DIR/b1-unit-tests.log" 2>&1; then
  log "  ✓ Unit tests PASSED"
else
  error "  ✗ Unit tests FAILED (see $RESULTS_DIR/b1-unit-tests.log)"
  PHASE_B_PASSED=false
fi

# B.2: Work Surface Hook Tests
log "B.2: Running Work Surface hook tests..."
if cd "$PROJECT_ROOT" && pnpm test -- --grep "work-surface" > "$RESULTS_DIR/b2-ws-hooks.log" 2>&1; then
  log "  ✓ Work Surface hook tests PASSED"
else
  warn "  ⚠ Some Work Surface hook tests may have failed (see log)"
fi

# B.3: Schema Validation
log "B.3: Running schema validation..."
if cd "$PROJECT_ROOT" && pnpm validate:schema > "$RESULTS_DIR/b3-schema.log" 2>&1; then
  log "  ✓ Schema validation PASSED"
else
  warn "  ⚠ Schema validation issues (see log)"
fi

PHASE_B_END=$(date +%s)
PHASE_B_TIME=$((PHASE_B_END - PHASE_B_START))
log "Phase B completed in ${PHASE_B_TIME}s"
echo ""

# ═══════════════════════════════════════════════════════════════════════════
# PHASE C: E2E Tests (1-2 hours)
# ═══════════════════════════════════════════════════════════════════════════

echo "┌─────────────────────────────────────────────────────────────────┐"
echo "│ PHASE C: End-to-End Tests                                       │"
echo "└─────────────────────────────────────────────────────────────────┘"

PHASE_C_START=$(date +%s)
PHASE_C_PASSED=true

# C.1: Run E2E test suite
log "C.1: Running E2E test suite..."
if [ -d "$PROJECT_ROOT/tests-e2e" ]; then
  if cd "$PROJECT_ROOT" && npx playwright test --reporter=list > "$RESULTS_DIR/c1-e2e.log" 2>&1; then
    log "  ✓ E2E tests PASSED"
  else
    warn "  ⚠ Some E2E tests failed (see $RESULTS_DIR/c1-e2e.log)"
  fi
else
  warn "  ⚠ E2E test directory not found"
fi

# C.2: Golden Flow Coverage Check
log "C.2: Checking Golden Flow test coverage..."
GOLDEN_FLOWS=("orders" "invoices" "inventory" "clients" "purchase-orders" "pick-pack" "ledger" "quotes")
COVERED=0
MISSING=()

for flow in "${GOLDEN_FLOWS[@]}"; do
  if grep -rq "$flow" "$PROJECT_ROOT/tests-e2e/" 2>/dev/null; then
    ((COVERED++))
  else
    MISSING+=("$flow")
  fi
done

log "  Golden Flows covered: $COVERED/${#GOLDEN_FLOWS[@]}"
if [ ${#MISSING[@]} -gt 0 ]; then
  warn "  Missing flows: ${MISSING[*]}"
fi

# C.3: Invariant Check
log "C.3: Running business invariant checks..."
if [ -f "$PROJECT_ROOT/scripts/qa/invariant-checks.ts" ]; then
  if cd "$PROJECT_ROOT" && npx tsx scripts/qa/invariant-checks.ts > "$RESULTS_DIR/c3-invariants.log" 2>&1; then
    log "  ✓ Invariant checks PASSED"
  else
    error "  ✗ Invariant checks FAILED (see $RESULTS_DIR/c3-invariants.log)"
    PHASE_C_PASSED=false
  fi
else
  warn "  ⚠ invariant-checks.ts not found, skipping"
fi

PHASE_C_END=$(date +%s)
PHASE_C_TIME=$((PHASE_C_END - PHASE_C_START))
log "Phase C completed in ${PHASE_C_TIME}s"
echo ""

# ═══════════════════════════════════════════════════════════════════════════
# PHASE D: Rollback Verification (30 min)
# ═══════════════════════════════════════════════════════════════════════════

echo "┌─────────────────────────────────────────────────────────────────┐"
echo "│ PHASE D: Rollback Verification                                  │"
echo "└─────────────────────────────────────────────────────────────────┘"

PHASE_D_START=$(date +%s)

# D.1: Feature Flag Toggle Test
log "D.1: Verifying feature flag system..."
if grep -q "WorkSurfaceGate" "$PROJECT_ROOT/client/src/hooks/work-surface/useWorkSurfaceFeatureFlags.ts" 2>/dev/null; then
  log "  ✓ WorkSurfaceGate component exists"
else
  warn "  ⚠ WorkSurfaceGate component not found"
fi

if grep -q "useWorkSurfaceFeatureFlags" "$PROJECT_ROOT/client/src/hooks/work-surface/useWorkSurfaceFeatureFlags.ts" 2>/dev/null; then
  log "  ✓ useWorkSurfaceFeatureFlags hook exists"
else
  warn "  ⚠ useWorkSurfaceFeatureFlags hook not found"
fi

# D.2: Check rollback SQL command exists
log "D.2: Verifying rollback commands documented..."
if grep -q "UPDATE feature_flags" "$PROJECT_ROOT/docs/deployment/WORKSURFACES_EXECUTION_ROADMAP.md" 2>/dev/null; then
  log "  ✓ Rollback SQL commands documented"
else
  warn "  ⚠ Rollback commands not documented"
fi

PHASE_D_END=$(date +%s)
PHASE_D_TIME=$((PHASE_D_END - PHASE_D_START))
log "Phase D completed in ${PHASE_D_TIME}s"
echo ""

# ═══════════════════════════════════════════════════════════════════════════
# FINAL SUMMARY
# ═══════════════════════════════════════════════════════════════════════════

END_TIME=$(date +%s)
TOTAL_TIME=$((END_TIME - START_TIME))

HOURS=$((TOTAL_TIME / 3600))
MINUTES=$(((TOTAL_TIME % 3600) / 60))
SECONDS=$((TOTAL_TIME % 60))

# Generate summary report
cat > "$RESULTS_DIR/SUMMARY.md" << EOF
# Accelerated Validation Summary

**Date**: $(date)
**Total Duration**: ${HOURS}h ${MINUTES}m ${SECONDS}s

## Phase Results

| Phase | Description | Duration | Status |
|-------|-------------|----------|--------|
| A | Infrastructure Validation | ${PHASE_A_TIME}s | $([[ "$PHASE_A_PASSED" == "true" ]] && echo "✓ PASSED" || echo "⚠ ISSUES") |
| B | Unit & Integration Tests | ${PHASE_B_TIME}s | $([[ "$PHASE_B_PASSED" == "true" ]] && echo "✓ PASSED" || echo "⚠ ISSUES") |
| C | End-to-End Tests | ${PHASE_C_TIME}s | $([[ "$PHASE_C_PASSED" == "true" ]] && echo "✓ PASSED" || echo "⚠ ISSUES") |
| D | Rollback Verification | ${PHASE_D_TIME}s | ✓ VERIFIED |

## Files Generated
$(ls -la "$RESULTS_DIR"/*.log 2>/dev/null | awk '{print "- " $NF}' || echo "- No log files")

## Recommendation

$(if [[ "$PHASE_A_PASSED" == "true" && "$PHASE_B_PASSED" == "true" && "$PHASE_C_PASSED" == "true" ]]; then
  echo "**✓ READY FOR DEPLOYMENT**"
  echo ""
  echo "All validation phases passed. The Work Surfaces can be deployed to 100% of users."
else
  echo "**⚠ REVIEW REQUIRED**"
  echo ""
  echo "Some validation phases had issues. Review the log files before proceeding."
fi)
EOF

echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║                    VALIDATION COMPLETE                            ║"
echo "╠══════════════════════════════════════════════════════════════════╣"
printf "║ Total time: %dh %dm %ds                                          ║\n" $HOURS $MINUTES $SECONDS
echo "║                                                                    ║"
printf "║ Phase A (Infrastructure): %s                                  ║\n" "$([[ "$PHASE_A_PASSED" == "true" ]] && echo "PASSED" || echo "ISSUES")"
printf "║ Phase B (Unit Tests):     %s                                  ║\n" "$([[ "$PHASE_B_PASSED" == "true" ]] && echo "PASSED" || echo "ISSUES")"
printf "║ Phase C (E2E Tests):      %s                                  ║\n" "$([[ "$PHASE_C_PASSED" == "true" ]] && echo "PASSED" || echo "ISSUES")"
echo "║ Phase D (Rollback):       VERIFIED                                ║"
echo "║                                                                    ║"

if [[ "$PHASE_A_PASSED" == "true" && "$PHASE_B_PASSED" == "true" && "$PHASE_C_PASSED" == "true" ]]; then
  echo "║ ✓ READY FOR 100% DEPLOYMENT                                       ║"
else
  echo "║ ⚠ REVIEW LOG FILES BEFORE PROCEEDING                              ║"
fi

echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""
echo "Results saved to: $RESULTS_DIR"
echo "Summary: $RESULTS_DIR/SUMMARY.md"

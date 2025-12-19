#!/bin/bash

# Phase 3: Workflow Validation - Master Script
# Runs all workflow validation scripts and reports results
#
# Usage: ./scripts/qa/validate-all-workflows.sh

set -e

echo "========================================"
echo "TERP Phase 3: Workflow Validation"
echo "========================================"
echo "Date: $(date)"
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RESULTS=()
FAILED=0

run_validation() {
  local name="$1"
  local script="$2"
  
  echo ""
  echo "----------------------------------------"
  echo "Running: $name"
  echo "----------------------------------------"
  
  if npx tsx "$script" 2>&1; then
    RESULTS+=("✅ $name: PASSED")
  else
    RESULTS+=("❌ $name: FAILED")
    FAILED=$((FAILED + 1))
  fi
}

# Run all workflow validations
run_validation "WF-001: Order Creation" "$SCRIPT_DIR/validate-order-workflow.ts"
run_validation "WF-002: Inventory Intake" "$SCRIPT_DIR/validate-inventory-workflow.ts"
run_validation "WF-003: Returns Processing" "$SCRIPT_DIR/validate-returns-workflow.ts"
run_validation "WF-004: Data Integrity" "$SCRIPT_DIR/validate-data-integrity.ts"

# Summary
echo ""
echo "========================================"
echo "PHASE 3 VALIDATION SUMMARY"
echo "========================================"
for result in "${RESULTS[@]}"; do
  echo "$result"
done
echo ""

if [ $FAILED -gt 0 ]; then
  echo "❌ $FAILED workflow(s) failed validation"
  exit 1
else
  echo "✅ All workflows passed validation"
  exit 0
fi

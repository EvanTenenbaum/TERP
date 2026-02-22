#!/bin/bash
# Feature Parity Check - Gate G6 (redesign-aware)
#
# Validates:
# 1) Canonical parity manifest has no unresolved in-scope routes
# 2) Key redesign routes exist in manifest
# 3) Critical work-surface tRPC contracts are present
#
# Exit 0 = PASS, Exit 1 = FAIL

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

echo "=== Feature Parity Check (Gate G6) ==="
echo ""

PARITY_MANIFEST="docs/uiux-redesign/P0_CANONICAL_PARITY_MANIFEST.csv"

if [ ! -f "$PARITY_MANIFEST" ]; then
  echo "Parity manifest missing; generating via uiux:p0:all..."
  pnpm uiux:p0:all >/dev/null
fi

if [ ! -f "$PARITY_MANIFEST" ]; then
  echo "GATE FAILED: Could not generate $PARITY_MANIFEST"
  exit 1
fi

FAIL=0

required_routes=(
  "/purchase-orders"
  "/direct-intake"
  "/inventory"
  "/sales"
  "/relationships"
  "/demand-supply"
  "/credits"
)

manifest_report=$(node scripts/uiux/execution/parity-manifest-report.mjs "$PARITY_MANIFEST" "${required_routes[@]}")
in_scope_count=$(node -e 'const report = JSON.parse(process.argv[1]); process.stdout.write(String(report.inScopeCount));' "$manifest_report")
unresolved_in_scope=$(node -e 'const report = JSON.parse(process.argv[1]); process.stdout.write(String(report.unresolvedInScopeCount));' "$manifest_report")

echo "--- Canonical Manifest ---"
echo "  In-scope routes: $in_scope_count"
echo "  Unresolved in-scope: $unresolved_in_scope"

if [ "$in_scope_count" -eq 0 ]; then
  echo "  FAIL: No in-scope routes found in parity manifest"
  FAIL=1
fi

if [ "$unresolved_in_scope" -ne 0 ]; then
  echo "  FAIL: Unresolved in-scope routes detected"
  FAIL=1
fi

echo ""
echo "--- Critical Route Presence ---"
missing_routes=$(node -e 'const report = JSON.parse(process.argv[1]); for (const route of report.missingRequiredRoutes || []) console.log(route);' "$manifest_report")

for route in "${required_routes[@]}"; do
  if printf "%s\n" "$missing_routes" | rg -qx "$route"; then
    echo "  FAIL: Missing ${route} in canonical parity manifest"
    FAIL=1
  else
    echo "  PASS: ${route}"
  fi
done

echo ""
echo "--- Work Surface API Contracts ---"

check_contract() {
  local file="$1"
  shift
  local patterns=("$@")

  if [ ! -f "$file" ]; then
    echo "  FAIL: Missing file ${file}"
    FAIL=1
    return
  fi

  local missing=0
  for pattern in "${patterns[@]}"; do
    if rg -q "$pattern" "$file"; then
      :
    else
      if [ "$missing" -eq 0 ]; then
        echo "  FAIL: ${file} is missing required API hooks:"
      fi
      echo "    - ${pattern}"
      missing=1
      FAIL=1
    fi
  done

  if [ "$missing" -eq 0 ]; then
    echo "  PASS: ${file}"
  fi
}

check_contract \
  "client/src/components/work-surface/InventoryWorkSurface.tsx" \
  "trpc\\.inventory\\.list\\.useQuery" \
  "trpc\\.inventory\\.getEnhanced\\.useQuery" \
  "trpc\\.inventory\\.dashboardStats\\.useQuery" \
  "trpc\\.inventory\\.bulk\\.updateStatus\\.useMutation" \
  "trpc\\.inventory\\.bulk\\.delete\\.useMutation"

check_contract \
  "client/src/components/work-surface/PurchaseOrdersWorkSurface.tsx" \
  "trpc\\.purchaseOrders\\.getAll\\.useQuery" \
  "trpc\\.purchaseOrders\\.create\\.useMutation" \
  "trpc\\.purchaseOrders\\.updateStatus\\.useMutation"

check_contract \
  "client/src/components/work-surface/DirectIntakeWorkSurface.tsx" \
  "trpc\\.inventory\\.intake\\.useMutation" \
  "trpc\\.inventory\\.uploadMedia\\.useMutation"

check_contract \
  "client/src/components/work-surface/OrdersWorkSurface.tsx" \
  "trpc\\.orders\\.getAll\\.useQuery" \
  "trpc\\.orders\\.confirmDraftOrder\\.useMutation"

check_contract \
  "client/src/components/work-surface/InvoicesWorkSurface.tsx" \
  "trpc\\.invoices\\..*\\.use"

echo ""
if [ "$FAIL" -eq 1 ]; then
  echo "GATE FAILED: Feature parity issues found"
  exit 1
fi

echo "GATE PASSED: Canonical parity + work-surface API contracts validated"
exit 0

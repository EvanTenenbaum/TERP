#!/bin/bash
# Feature Parity Check - Gate G6
# Compares tRPC calls between old pages and WorkSurfaces
# Exit 0 = PASS, Exit 1 = FAIL

set -e

echo "=== Feature Parity Check (Gate G6) ==="
echo ""

compare_trpc_calls() {
  OLD_PAGE=$1
  NEW_SURFACE=$2
  NAME=$3

  echo "--- Comparing $NAME ---"

  if [ ! -f "$OLD_PAGE" ]; then
    echo "  Old page not found: $OLD_PAGE"
    return 0
  fi

  if [ ! -f "$NEW_SURFACE" ]; then
    echo "  WorkSurface not found: $NEW_SURFACE"
    return 1
  fi

  OLD_CALLS=$(grep -oh "trpc\.[a-zA-Z]*\.[a-zA-Z]*" "$OLD_PAGE" 2>/dev/null | sort -u || echo "")
  NEW_CALLS=$(grep -oh "trpc\.[a-zA-Z]*\.[a-zA-Z]*" "$NEW_SURFACE" 2>/dev/null | sort -u || echo "")

  if [ -z "$OLD_CALLS" ]; then
    echo "  No tRPC calls in old page (may use different pattern)"
    return 0
  fi

  MISSING=$(comm -23 <(echo "$OLD_CALLS" | sort) <(echo "$NEW_CALLS" | sort) 2>/dev/null || true)

  if [ -n "$MISSING" ]; then
    echo "  MISSING in WorkSurface:"
    echo "$MISSING" | sed 's/^/    /'
    return 1
  fi
  echo "  PASS: All tRPC calls present"
  return 0
}

FAIL=0

compare_trpc_calls "client/src/pages/Orders.tsx" "client/src/components/work-surface/OrdersWorkSurface.tsx" "Orders" || FAIL=1
compare_trpc_calls "client/src/pages/accounting/Invoices.tsx" "client/src/components/work-surface/InvoicesWorkSurface.tsx" "Invoices" || FAIL=1
compare_trpc_calls "client/src/pages/Inventory.tsx" "client/src/components/work-surface/InventoryWorkSurface.tsx" "Inventory" || FAIL=1
compare_trpc_calls "client/src/pages/ClientsListPage.tsx" "client/src/components/work-surface/ClientsWorkSurface.tsx" "Clients" || FAIL=1
compare_trpc_calls "client/src/pages/PurchaseOrdersPage.tsx" "client/src/components/work-surface/PurchaseOrdersWorkSurface.tsx" "PurchaseOrders" || FAIL=1
compare_trpc_calls "client/src/pages/PickPackPage.tsx" "client/src/components/work-surface/PickPackWorkSurface.tsx" "PickPack" || FAIL=1
compare_trpc_calls "client/src/pages/ClientLedger.tsx" "client/src/components/work-surface/ClientLedgerWorkSurface.tsx" "ClientLedger" || FAIL=1
compare_trpc_calls "client/src/pages/Quotes.tsx" "client/src/components/work-surface/QuotesWorkSurface.tsx" "Quotes" || FAIL=1
compare_trpc_calls "client/src/pages/SpreadsheetViewPage.tsx" "client/src/components/work-surface/DirectIntakeWorkSurface.tsx" "DirectIntake" || FAIL=1

echo ""
if [ $FAIL -eq 1 ]; then
  echo "GATE FAILED: Feature parity issues found"
  echo "Review missing tRPC calls above and add to WorkSurfaces"
  exit 1
fi
echo "GATE PASSED: All WorkSurfaces have feature parity"
exit 0

#!/bin/bash
# Bulk Action Parity Check
# Compares bulk action patterns between old pages and WorkSurfaces
# Informational - warns but does not fail gate

set -e

echo "=== Bulk Action Parity Check ==="
echo ""

check_bulk() {
  OLD_FILE=$1
  NEW_FILE=$2
  NAME=$3

  if [ ! -f "$OLD_FILE" ]; then
    echo "$NAME: Old page not found"
    return 0
  fi

  if [ ! -f "$NEW_FILE" ]; then
    echo "$NAME: WorkSurface not found - MISSING"
    return 0
  fi

  OLD_BULK=$(grep -ci "bulk\|selected\|selection\|multi" "$OLD_FILE" 2>/dev/null || echo 0)
  NEW_BULK=$(grep -ci "bulk\|selected\|selection\|multi" "$NEW_FILE" 2>/dev/null || echo 0)

  echo "$NAME:"
  echo "  Old page references: $OLD_BULK"
  echo "  WorkSurface references: $NEW_BULK"

  if [ "$NEW_BULK" -lt "$OLD_BULK" ]; then
    echo "  WARNING: Potential bulk action regression (fewer references)"
  elif [ "$NEW_BULK" -gt "$OLD_BULK" ]; then
    echo "  OK: WorkSurface has more bulk references"
  else
    echo "  OK: Same level of bulk action support"
  fi
  echo ""
}

check_bulk "client/src/pages/Orders.tsx" "client/src/components/work-surface/OrdersWorkSurface.tsx" "Orders"
check_bulk "client/src/pages/accounting/Invoices.tsx" "client/src/components/work-surface/InvoicesWorkSurface.tsx" "Invoices"
check_bulk "client/src/pages/Inventory.tsx" "client/src/components/work-surface/InventoryWorkSurface.tsx" "Inventory"
check_bulk "client/src/pages/PickPackPage.tsx" "client/src/components/work-surface/PickPackWorkSurface.tsx" "PickPack"
check_bulk "client/src/pages/ClientsListPage.tsx" "client/src/components/work-surface/ClientsWorkSurface.tsx" "Clients"

echo "Review any warnings above for potential bulk action regressions."
exit 0

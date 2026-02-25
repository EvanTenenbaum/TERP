#!/bin/bash
# Placeholder Scan - Gate G4
# Scans critical paths for unfinished implementation markers
# Exit 0 = PASS, Exit 1 = FAIL

set -euo pipefail

CRITICAL_PATHS=(
  "client/src/components/work-surface/"
  "client/src/hooks/work-surface/"
  "server/routers/accounting.ts"
  "server/routers/invoices.ts"
  "server/routers/inventoryMovements.ts"
  "server/routers/orders.ts"
  "server/routers/payments.ts"
  "server/routers/pickPack.ts"
  "server/routers/clientLedger.ts"
  "server/routers/purchaseOrders.ts"
  "server/routers/poReceiving.ts"
  "server/routers/inventory.ts"
)

echo "=== Placeholder Scan (Gate G4) ==="
echo ""

# Intentionally does NOT match generic input placeholders used in form fields.
# Removed 'TBD' - too many false positives in legitimate comments.
PATTERN='TODO|FIXME|XXX|HACK|coming soon|not implemented|stub implementation'
FAIL=0
for path in "${CRITICAL_PATHS[@]}"; do
  if [ -e "$path" ]; then
    # Filter out false positives: placeholder attributes, test/spec files
    MATCHES=$(rg -n -i "$PATTERN" "$path" 2>/dev/null \
      | grep -v 'placeholder=' \
      | grep -v '\.test\.' \
      | grep -v '\.spec\.' \
      || true)
    if [ -n "$MATCHES" ]; then
      echo "FAIL: Found unfinished implementation marker in $path"
      echo "$MATCHES"
      echo ""
      FAIL=1
    fi
  fi
done

echo ""
if [ $FAIL -eq 1 ]; then
  echo "GATE FAILED: Placeholders found in critical paths"
  exit 1
fi
echo "GATE PASSED: No placeholders in critical paths"
exit 0

#!/bin/bash
# Placeholder Scan - Gate G4
# Scans critical paths for TODO, FIXME, XXX, HACK, placeholder text
# Exit 0 = PASS, Exit 1 = FAIL

set -e

CRITICAL_PATHS=(
  "client/src/components/work-surface/"
  "client/src/hooks/work-surface/"
  "server/src/routers/accounting.ts"
  "server/src/routers/invoices.ts"
  "server/src/routers/inventoryMovements.ts"
  "server/src/routers/orders.ts"
)

echo "=== Placeholder Scan (Gate G4) ==="
echo ""

FAIL=0
for path in "${CRITICAL_PATHS[@]}"; do
  if [ -e "$path" ]; then
    MATCHES=$(grep -rn "TODO\|FIXME\|XXX\|HACK\|coming soon\|placeholder" "$path" 2>/dev/null || true)
    if [ -n "$MATCHES" ]; then
      echo "FAIL: Found placeholder in $path"
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

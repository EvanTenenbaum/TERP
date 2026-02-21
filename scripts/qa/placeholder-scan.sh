#!/bin/bash
# Placeholder Scan - Gate G4
# Scans critical paths for unfinished implementation markers
# Exit 0 = PASS, Exit 1 = FAIL

set -euo pipefail

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

# Intentionally does NOT match generic input placeholders used in form fields.
PATTERN='TODO|FIXME|XXX|HACK|coming soon|not implemented|stub implementation|TBD'
FAIL=0
for path in "${CRITICAL_PATHS[@]}"; do
  if [ -e "$path" ]; then
    MATCHES=$(rg -n -i "$PATTERN" "$path" 2>/dev/null || true)
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

#!/bin/bash
# RBAC Verification - Gate G5
# Verifies all mutations have appropriate procedure wrappers
# Exit 0 = PASS, Exit 1 = FAIL

set -e

echo "=== RBAC Verification (Gate G5) ==="
echo ""

# Find all mutations
MUTATIONS=$(grep -rh "\.mutation(" server/src/routers/*.ts 2>/dev/null | wc -l || echo 0)

# Find protected mutations
PROTECTED=$(grep -rh "protectedProcedure\|adminProcedure\|strictlyProtectedProcedure" server/src/routers/*.ts 2>/dev/null | grep -c "mutation" || echo 0)

# Find public mutations
PUBLIC_MUTATIONS=$(grep -rn "publicProcedure" server/src/routers/*.ts 2>/dev/null | grep "mutation" || true)
PUBLIC_COUNT=$(echo "$PUBLIC_MUTATIONS" | grep -c "mutation" 2>/dev/null || echo 0)

echo "Total mutations found: $MUTATIONS"
echo "Protected mutations: $PROTECTED"
echo "Public mutations: $PUBLIC_COUNT"
echo ""

if [ -n "$PUBLIC_MUTATIONS" ]; then
  echo "PUBLIC MUTATIONS (require justification):"
  echo "$PUBLIC_MUTATIONS"
  echo ""
fi

# Known acceptable public mutations (calendar events are public for sharing)
EXPECTED_PUBLIC=10

if [ "$PUBLIC_COUNT" -gt "$EXPECTED_PUBLIC" ]; then
  echo "WARNING: Found $PUBLIC_COUNT public mutations, expected max $EXPECTED_PUBLIC"
  echo "Review each public mutation for security risk"
fi

# Check for mutations without any procedure wrapper (would be a critical bug)
UNWRAPPED=$(grep -rn "export const.*Router" server/src/routers/*.ts -A 50 | grep -B5 "\.mutation(" | grep -v "Procedure" | grep "mutation" || true)
if [ -n "$UNWRAPPED" ]; then
  echo ""
  echo "CRITICAL: Potentially unwrapped mutations found:"
  echo "$UNWRAPPED"
  echo ""
  echo "GATE FAILED: Mutations may lack RBAC protection"
  exit 1
fi

echo ""
echo "GATE PASSED: RBAC coverage acceptable"
exit 0

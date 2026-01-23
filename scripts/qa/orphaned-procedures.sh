#!/bin/bash
# Orphaned Procedure Detection
# Finds tRPC procedures with no UI callers
# Informational - does not fail gate

set -e

echo "=== Orphaned Procedure Detection ==="
echo ""

# Extract all procedure names from routers
echo "Scanning server routers..."
grep -roh "\.[a-zA-Z]*\s*:" server/src/routers/*.ts 2>/dev/null | sed 's/[.: ]//g' | sort -u > /tmp/all_procs.txt
TOTAL_PROCS=$(wc -l < /tmp/all_procs.txt)

# Extract all procedure calls from UI
echo "Scanning client code..."
grep -roh "trpc\.[a-zA-Z]*\.[a-zA-Z]*" client/src/ 2>/dev/null | sed 's/trpc\.[a-zA-Z]*\.//g' | sort -u > /tmp/ui_calls.txt
TOTAL_CALLS=$(wc -l < /tmp/ui_calls.txt)

echo ""
echo "Total procedures in routers: $TOTAL_PROCS"
echo "Total unique procedures called from UI: $TOTAL_CALLS"
echo ""

# Find procedures with no callers
ORPHANS=$(comm -23 /tmp/all_procs.txt /tmp/ui_calls.txt 2>/dev/null || true)
ORPHAN_COUNT=$(echo "$ORPHANS" | grep -c "." || echo 0)

echo "Procedures with no UI callers: $ORPHAN_COUNT"
if [ -n "$ORPHANS" ] && [ "$ORPHAN_COUNT" -gt 0 ]; then
  echo ""
  echo "Orphaned procedures (first 30):"
  echo "$ORPHANS" | head -30 | sed 's/^/  /'
fi

echo ""
echo "Note: Some procedures are intentionally API-only (scheduled tasks, webhooks)."
echo "Cross-reference with USER_FLOW_MATRIX.csv to determine if orphan is expected."

# Cleanup
rm -f /tmp/all_procs.txt /tmp/ui_calls.txt

exit 0

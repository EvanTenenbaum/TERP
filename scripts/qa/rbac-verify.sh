#!/bin/bash
# RBAC Verification - Gate G5
# Verifies all mutations have appropriate procedure wrappers
# Exit 0 = PASS, Exit 1 = FAIL

set -euo pipefail

echo "=== RBAC Verification (Gate G5) ==="
echo ""

ROUTER_DIR="server/routers"

if [ ! -d "$ROUTER_DIR" ]; then
  echo "GATE FAILED: Router directory not found: $ROUTER_DIR"
  exit 1
fi

MUTATION_LINES=$(rg -n "\.mutation\(" "$ROUTER_DIR" -g '*.ts' || true)
TOTAL_MUTATIONS=$(printf "%s\n" "$MUTATION_LINES" | sed '/^$/d' | wc -l | tr -d ' ')

if [ "$TOTAL_MUTATIONS" -eq 0 ]; then
  echo "GATE FAILED: No mutations found. RBAC scan is likely misconfigured."
  exit 1
fi

PROTECTED_COUNT=0
PUBLIC_COUNT=0
UNCLASSIFIED_COUNT=0
PUBLIC_MUTATIONS=""
UNCLASSIFIED_MUTATIONS=""

while IFS= read -r entry; do
  [ -z "$entry" ] && continue
  file="${entry%%:*}"
  rest="${entry#*:}"
  line="${rest%%:*}"
  start=$((line > 80 ? line - 80 : 1))
  context=$(sed -n "${start},${line}p" "$file")

  if printf "%s\n" "$context" | rg -q "publicProcedure"; then
    PUBLIC_COUNT=$((PUBLIC_COUNT + 1))
    PUBLIC_MUTATIONS="${PUBLIC_MUTATIONS}${entry}
"
  elif printf "%s\n" "$context" | rg -q "[A-Za-z0-9_]+Procedure|requirePermission\("; then
    PROTECTED_COUNT=$((PROTECTED_COUNT + 1))
  else
    UNCLASSIFIED_COUNT=$((UNCLASSIFIED_COUNT + 1))
    UNCLASSIFIED_MUTATIONS="${UNCLASSIFIED_MUTATIONS}${entry}
"
  fi
done <<< "$MUTATION_LINES"

echo "Total mutations found: $TOTAL_MUTATIONS"
echo "Protected mutations: $PROTECTED_COUNT"
echo "Public mutations: $PUBLIC_COUNT"
echo "Unclassified mutations: $UNCLASSIFIED_COUNT"
echo ""

if [ -n "$PUBLIC_MUTATIONS" ]; then
  echo "PUBLIC MUTATIONS (require justification):"
  echo "$PUBLIC_MUTATIONS"
  echo ""
fi

# Known acceptable public mutations (calendar events are public for sharing)
EXPECTED_PUBLIC=12

if [ "$PUBLIC_COUNT" -gt "$EXPECTED_PUBLIC" ]; then
  echo "GATE FAILED: Found $PUBLIC_COUNT public mutations, expected max $EXPECTED_PUBLIC"
  echo "Review and justify each public mutation before continuing"
  exit 1
fi

if [ "$UNCLASSIFIED_COUNT" -gt 0 ]; then
  echo "GATE FAILED: $UNCLASSIFIED_COUNT mutation(s) are not clearly protected/public."
  echo "Review mutation wrappers in $ROUTER_DIR:"
  echo "$UNCLASSIFIED_MUTATIONS"
  exit 1
fi

echo ""
echo "GATE PASSED: RBAC coverage acceptable"
exit 0

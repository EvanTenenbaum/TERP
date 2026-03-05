#!/usr/bin/env bash
# =============================================================================
# TERP Terminology Census (LEX-005)
#
# Scans all .tsx and .ts files for deprecated terms and produces a reproducible
# report of term occurrences.
#
# Usage:
#   bash scripts/terminology-census.sh
#   bash scripts/terminology-census.sh --json        # JSON output
#   bash scripts/terminology-census.sh --summary     # Summary only (no file list)
#
# Output is deterministic between runs on the same codebase state.
# Exit code: always 0 (census never fails — use drift-audit for failure mode)
# =============================================================================

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCRIPT_NAME="terminology-census"
VERSION="1.0.0"
RUN_DATE="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

# ─── Output mode ──────────────────────────────────────────────────────────────
OUTPUT_JSON=false
SUMMARY_ONLY=false

for arg in "$@"; do
  case "$arg" in
    --json)    OUTPUT_JSON=true ;;
    --summary) SUMMARY_ONLY=true ;;
  esac
done

# ─── Deprecated term definitions ──────────────────────────────────────────────
# Format: "TERM|CANONICAL|FAMILY|PATTERN"
# PATTERN is a grep-compatible extended regex
DEPRECATED_TERMS=(
  # Supplier family — Vendor deprecated
  "Vendor|Supplier|party|\\bVendor\\b"
  "vendor|Supplier|party|\\bvendor\\b"
  "vendorId|supplierClientId|party|\\bvendorId\\b"
  # Note: vendors table references are allowed in specific legacy files
  "db.query.vendors|clients with isSeller|party|db\\.query\\.vendors"

  # Intake family — Receiving deprecated
  "Receiving|Intake|intake|\\bReceiving\\b"
  "receiving_session|intake_session|intake|\\breceiving[_-]session\\b"
  "DirectEntry|Direct Intake|intake|\\bDirectEntry\\b"
  "direct_entry|direct_intake|intake|\\bdirect[_-]entry\\b"
  "ManualIntake|Direct Intake|intake|\\bManualIntake\\b"
  "manual_intake|direct_intake|intake|\\bmanual[_-]intake\\b"

  # Sales family — Sale/Estimate deprecated as document nouns
  "Estimate|Quote|sales|\\bEstimate\\b"

  # Product family — InventoryItem deprecated as type name
  "InventoryItem|Batch|product|\\bInventoryItem\\b"
  "inventory_item|batch|product|\\binventory[_-]item\\b"
)

# ─── Files to scan ────────────────────────────────────────────────────────────
# Deterministic: find sorted by path, excluding build artifacts and node_modules
mapfile -t SCAN_FILES < <(
  find "$REPO_ROOT/client/src" "$REPO_ROOT/server" \
    -type f \( -name "*.ts" -o -name "*.tsx" \) \
    -not -path "*/node_modules/*" \
    -not -path "*/dist/*" \
    -not -path "*/.next/*" \
    | sort
)

TOTAL_FILES="${#SCAN_FILES[@]}"

# ─── Legacy exempt files (deprecated terms allowed here) ──────────────────────
EXEMPT_PATTERNS=(
  "drizzle/schema.ts"
  "server/inventoryDb.ts"
  "server/routers/vendors.ts"
  "server/vendorContextDb.ts"
  "server/vendorSupplyDb.ts"
  "server/services/vendorMappingService.ts"
  "server/services/payablesService.ts"
  "client/src/components/vendors/"
  "client/src/lib/nomenclature.ts"
  "server/routers/intakeReceipts.ts"
  "server/routers/pricing.ts"
)

is_exempt() {
  local file="$1"
  local rel_file="${file#$REPO_ROOT/}"
  for pattern in "${EXEMPT_PATTERNS[@]}"; do
    if [[ "$rel_file" == *"$pattern"* ]]; then
      return 0
    fi
  done
  return 1
}

# ─── Data collection ──────────────────────────────────────────────────────────
declare -A TERM_TOTAL_COUNTS
declare -A TERM_EXEMPT_COUNTS
declare -A TERM_NON_EXEMPT_COUNTS

# Initialize counters
for entry in "${DEPRECATED_TERMS[@]}"; do
  IFS='|' read -r term canonical family pattern <<< "$entry"
  TERM_TOTAL_COUNTS["$term"]=0
  TERM_EXEMPT_COUNTS["$term"]=0
  TERM_NON_EXEMPT_COUNTS["$term"]=0
done

# Per-file results for full report
declare -A FILE_HITS  # file -> "term:count term:count ..."

for file in "${SCAN_FILES[@]}"; do
  file_hits=""
  for entry in "${DEPRECATED_TERMS[@]}"; do
    IFS='|' read -r term canonical family pattern <<< "$entry"

    count=$(grep -cE "$pattern" "$file" 2>/dev/null || true)
    if [[ "$count" -gt 0 ]]; then
      TERM_TOTAL_COUNTS["$term"]=$((TERM_TOTAL_COUNTS["$term"] + count))
      if is_exempt "$file"; then
        TERM_EXEMPT_COUNTS["$term"]=$((TERM_EXEMPT_COUNTS["$term"] + count))
      else
        TERM_NON_EXEMPT_COUNTS["$term"]=$((TERM_NON_EXEMPT_COUNTS["$term"] + count))
        file_hits="${file_hits}${term}:${count} "
      fi
    fi
  done

  if [[ -n "$file_hits" ]]; then
    FILE_HITS["$file"]="${file_hits% }"
  fi
done

# ─── Output ───────────────────────────────────────────────────────────────────

if [[ "$OUTPUT_JSON" == "true" ]]; then
  # JSON output
  echo "{"
  echo "  \"script\": \"$SCRIPT_NAME\","
  echo "  \"version\": \"$VERSION\","
  echo "  \"run_date\": \"$RUN_DATE\","
  echo "  \"total_files_scanned\": $TOTAL_FILES,"
  echo "  \"results\": ["

  first_term=true
  for entry in "${DEPRECATED_TERMS[@]}"; do
    IFS='|' read -r term canonical family pattern <<< "$entry"
    total="${TERM_TOTAL_COUNTS[$term]:-0}"
    exempt="${TERM_EXEMPT_COUNTS[$term]:-0}"
    non_exempt="${TERM_NON_EXEMPT_COUNTS[$term]:-0}"

    if [[ "$first_term" == "true" ]]; then
      first_term=false
    else
      echo "    ,"
    fi
    echo "    {"
    echo "      \"deprecated_term\": \"$term\","
    echo "      \"canonical_term\": \"$canonical\","
    echo "      \"family\": \"$family\","
    echo "      \"total_occurrences\": $total,"
    echo "      \"exempt_occurrences\": $exempt,"
    echo "      \"non_exempt_occurrences\": $non_exempt"
    echo "    }"
  done

  echo "  ]"
  echo "}"
  exit 0
fi

# Human-readable output
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║           TERP Terminology Census Report                     ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "  Version : $VERSION"
echo "  Run Date: $RUN_DATE"
echo "  Files   : $TOTAL_FILES TypeScript/TSX files scanned"
echo ""

# Group by family
FAMILIES=("party" "intake" "sales" "product")
FAMILY_NAMES=("Party (Supplier vs Vendor)" "Intake (Intake vs Receiving)" "Sales (Order/Quote terminology)" "Product (Batch vs InventoryItem)")

GRAND_TOTAL_NON_EXEMPT=0

for i in "${!FAMILIES[@]}"; do
  family="${FAMILIES[$i]}"
  family_name="${FAMILY_NAMES[$i]}"

  family_total=0
  family_output=""

  for entry in "${DEPRECATED_TERMS[@]}"; do
    IFS='|' read -r term canonical fam pattern <<< "$entry"
    [[ "$fam" != "$family" ]] && continue

    total="${TERM_TOTAL_COUNTS[$term]:-0}"
    exempt="${TERM_EXEMPT_COUNTS[$term]:-0}"
    non_exempt="${TERM_NON_EXEMPT_COUNTS[$term]:-0}"
    family_total=$((family_total + non_exempt))
    GRAND_TOTAL_NON_EXEMPT=$((GRAND_TOTAL_NON_EXEMPT + non_exempt))

    status="OK"
    [[ "$non_exempt" -gt 0 ]] && status="DRIFT"

    family_output+=$(printf "    %-30s → %-25s  [%s] total=%-4d exempt=%-4d new_code=%-4d\n" \
      "\"$term\"" "\"$canonical\"" "$status" "$total" "$exempt" "$non_exempt")
    family_output+=$'\n'
  done

  echo "── $family_name ──────────────────────────────────────────"
  printf "%s" "$family_output"
  echo ""
done

echo "────────────────────────────────────────────────────────────────"
if [[ "$GRAND_TOTAL_NON_EXEMPT" -eq 0 ]]; then
  echo "  RESULT: CLEAN — No deprecated terms in non-exempt code"
else
  echo "  RESULT: $GRAND_TOTAL_NON_EXEMPT deprecated term occurrence(s) in non-exempt code"
  echo "          Run 'pnpm terminology:audit' for strict enforcement"
fi
echo "────────────────────────────────────────────────────────────────"
echo ""

# File-level detail (unless summary-only)
if [[ "$SUMMARY_ONLY" == "false" ]] && [[ "${#FILE_HITS[@]}" -gt 0 ]]; then
  echo "FILES WITH DEPRECATED TERMS (non-exempt only):"
  echo ""

  # Sort file paths for determinism
  mapfile -t SORTED_HIT_FILES < <(
    for f in "${!FILE_HITS[@]}"; do echo "$f"; done | sort
  )

  for file in "${SORTED_HIT_FILES[@]}"; do
    rel_file="${file#$REPO_ROOT/}"
    hits="${FILE_HITS[$file]}"
    echo "  $rel_file"

    for hit in $hits; do
      IFS=':' read -r term count <<< "$hit"
      printf "    %-30s %d occurrence(s)\n" "$term" "$count"
    done
    echo ""
  done
fi

exit 0

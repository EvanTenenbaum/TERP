#!/usr/bin/env bash
# =============================================================================
# TERP Terminology Drift Audit (LEX-006)
#
# Checks for usage of deprecated terms in new/modified code.
# Exits with code 1 if drift is detected in non-exempt files.
#
# Usage:
#   bash scripts/terminology-drift-audit.sh              # audit all .ts/.tsx
#   bash scripts/terminology-drift-audit.sh --staged     # audit git-staged files only
#   bash scripts/terminology-drift-audit.sh --changed    # audit git-changed files vs main
#   bash scripts/terminology-drift-audit.sh --strict     # fail on ANY occurrence, no exemptions
#
# Exit codes:
#   0 = no drift detected (or all occurrences are in exempt files)
#   1 = drift detected in non-exempt code
# =============================================================================

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VERSION="1.0.0"

# ─── Argument parsing ─────────────────────────────────────────────────────────
AUDIT_MODE="all"   # all | staged | changed
STRICT_MODE=false

for arg in "$@"; do
  case "$arg" in
    --staged)  AUDIT_MODE="staged" ;;
    --changed) AUDIT_MODE="changed" ;;
    --strict)  STRICT_MODE=true ;;
  esac
done

# ─── Deprecated term definitions ──────────────────────────────────────────────
# Format: "TERM|CANONICAL|FAMILY|PATTERN|SEVERITY"
# SEVERITY: error = fail on any non-exempt occurrence, warning = report only
DEPRECATED_TERMS=(
  # Supplier family — Vendor deprecated (severity: error)
  "Vendor (UI label)|Supplier|party|\\bVendor\\b|error"
  "vendor (variable)|supplierClientId|party|\\bvendor\\b|error"
  "vendorId|supplierClientId|party|\\bvendorId\\b|error"
  "db.query.vendors|db.query.clients (isSeller)|party|db\\.query\\.vendors|error"

  # Intake family — Receiving deprecated (severity: error)
  "Receiving (label)|Intake|intake|\\bReceiving\\b|error"
  "DirectEntry|Direct Intake|intake|\\bDirectEntry\\b|error"
  "direct_entry|direct_intake|intake|\\bdirect[_-]entry\\b|error"
  "ManualIntake|Direct Intake|intake|\\bManualIntake\\b|error"
  "manual_intake|direct_intake|intake|\\bmanual[_-]intake\\b|error"

  # Sales family
  "Estimate (label)|Quote|sales|\\bEstimate\\b|warning"
  "Sale (noun)|Sales Order|sales|\\bSale\\b|warning"
  "Shipping (lifecycle)|Fulfillment|sales|\\bShipping\\b|warning"

  # Product family — InventoryItem as type name (severity: error)
  "InventoryItem (type)|Batch|product|\\bInventoryItem\\b|error"
  "inventory_item (type)|batch|product|\\binventory[_-]item\\b|error"

  # Brand family — Grower deprecated (severity: warning)
  "Grower|Farmer/Brand|brand|\\bGrower\\b|warning"
  "grower|farmer/brand|brand|\\bgrower\\b|warning"
)

# ─── Legacy exempt files ───────────────────────────────────────────────────────
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
  # Audit and census scripts themselves
  "scripts/terminology-census.sh"
  "scripts/terminology-drift-audit.sh"
  # Test files for terminology
  "tests/terminology/"
  # Drizzle migration files
  "drizzle/"
)

is_exempt() {
  local file="$1"
  if [[ "$STRICT_MODE" == "true" ]]; then
    return 1  # No exemptions in strict mode
  fi
  local rel_file="${file#$REPO_ROOT/}"
  for pattern in "${EXEMPT_PATTERNS[@]}"; do
    if [[ "$rel_file" == *"$pattern"* ]]; then
      return 0
    fi
  done
  return 1
}

# ─── File selection ───────────────────────────────────────────────────────────
get_files_to_audit() {
  case "$AUDIT_MODE" in
    staged)
      git -C "$REPO_ROOT" diff --cached --name-only --diff-filter=ACMR 2>/dev/null \
        | grep -E '\.(ts|tsx)$' \
        | sed "s|^|$REPO_ROOT/|" \
        | sort \
        || true
      ;;
    changed)
      local base_branch
      base_branch="$(git -C "$REPO_ROOT" merge-base HEAD origin/main 2>/dev/null || echo "HEAD~1")"
      git -C "$REPO_ROOT" diff --name-only "$base_branch"...HEAD 2>/dev/null \
        | grep -E '\.(ts|tsx)$' \
        | sed "s|^|$REPO_ROOT/|" \
        | sort \
        || true
      ;;
    all)
      find "$REPO_ROOT/client/src" "$REPO_ROOT/server" \
        -type f \( -name "*.ts" -o -name "*.tsx" \) \
        -not -path "*/node_modules/*" \
        -not -path "*/dist/*" \
        | sort
      ;;
  esac
}

mapfile -t FILES_TO_AUDIT < <(get_files_to_audit)

# ─── Main audit ───────────────────────────────────────────────────────────────
DRIFT_COUNT=0
ERROR_COUNT=0
WARNING_COUNT=0

declare -a DRIFT_REPORT

for file in "${FILES_TO_AUDIT[@]}"; do
  [[ ! -f "$file" ]] && continue
  is_exempt_file=false
  is_exempt "$file" && is_exempt_file=true

  for entry in "${DEPRECATED_TERMS[@]}"; do
    IFS='|' read -r term canonical family pattern severity <<< "$entry"

    matches=$(grep -nE "$pattern" "$file" 2>/dev/null || true)
    [[ -z "$matches" ]] && continue

    if [[ "$is_exempt_file" == "true" ]]; then
      # In strict mode, exempt files still pass — strict disables exemption list
      # which was handled in is_exempt(), so this path won't run in strict mode
      continue
    fi

    rel_file="${file#$REPO_ROOT/}"
    while IFS= read -r match; do
      DRIFT_REPORT+=("[$severity] $rel_file | $match | use '$canonical' instead of '$term'")
      DRIFT_COUNT=$((DRIFT_COUNT + 1))
      if [[ "$severity" == "error" ]]; then
        ERROR_COUNT=$((ERROR_COUNT + 1))
      else
        WARNING_COUNT=$((WARNING_COUNT + 1))
      fi
    done <<< "$matches"
  done
done

# ─── Output ───────────────────────────────────────────────────────────────────
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║          TERP Terminology Drift Audit                        ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "  Mode    : $AUDIT_MODE${STRICT_MODE:+ (STRICT)}"
echo "  Version : $VERSION"
echo "  Files   : ${#FILES_TO_AUDIT[@]} files checked"
echo ""

if [[ "$DRIFT_COUNT" -eq 0 ]]; then
  echo "  ✓ PASS — No terminology drift detected"
  echo ""
  exit 0
fi

echo "  VIOLATIONS DETECTED: $DRIFT_COUNT total ($ERROR_COUNT errors, $WARNING_COUNT warnings)"
echo ""

for line in "${DRIFT_REPORT[@]}"; do
  echo "  $line"
done

echo ""

if [[ "$ERROR_COUNT" -gt 0 ]]; then
  echo "  RESULT: FAIL — $ERROR_COUNT error(s) detected. Fix deprecated terminology before merging."
  echo ""
  echo "  Reference: docs/terminology/TERMINOLOGY_BIBLE.md"
  echo "  Quick fix: run 'bash scripts/terminology-census.sh' for full codebase view"
  echo ""
  exit 1
else
  echo "  RESULT: WARN — $WARNING_COUNT warning(s) detected. Consider updating to canonical terms."
  echo "  (Warnings do not block merge)"
  echo ""
  exit 0
fi

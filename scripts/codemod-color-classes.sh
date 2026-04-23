#!/usr/bin/env bash
# TER-1240: Codemod to replace raw Tailwind color classes with semantic variants
#
# This script performs the following transformations:
# 1. Replace Badge components with raw colors → semantic Badge variants  
# 2. Replace common status color patterns → CSS vars
# 3. Replace background/text colors with semantic equivalents
#
# Usage: bash scripts/codemod-color-classes.sh [--dry-run]

set -euo pipefail

DRY_RUN=false
if [[ "${1:-}" == "--dry-run" ]]; then
  DRY_RUN=true
  echo "🔍 DRY RUN MODE - No files will be modified"
else
  echo "✨ LIVE MODE - Files will be modified"
fi

echo "🎨 TER-1240: Color Class Codemod"
echo "================================"
echo ""

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

FILES_CHANGED=0
TOTAL_REPLACEMENTS=0

# Function to process a single file
process_file() {
  local file="$1"
  local temp_file="${file}.codemod.tmp"
  local changes=0
  
  cp "$file" "$temp_file"
  
  # Replace success colors (green) with CSS vars
  if grep -q 'bg-green-\(50\|100\)' "$temp_file"; then
    perl -pi -e 's/bg-green-(?:50|100)\b/bg-[var(--success-bg)]/g' "$temp_file"
    ((changes++)) || true
  fi
  
  if grep -q 'text-green-\(600\|700\|800\)' "$temp_file"; then
    perl -pi -e 's/text-green-(?:600|700|800)\b/text-[var(--success)]/g' "$temp_file"
    ((changes++)) || true
  fi
  
  # Replace warning colors (yellow/orange) with CSS vars
  if grep -q 'bg-\(yellow\|orange\)-\(50\|100\)' "$temp_file"; then
    perl -pi -e 's/bg-(?:yellow|orange)-(?:50|100)\b/bg-[var(--warning-bg)]/g' "$temp_file"
    ((changes++)) || true
  fi
  
  if grep -q 'text-\(yellow\|orange\)-\(600\|700\|800\)' "$temp_file"; then
    perl -pi -e 's/text-(?:yellow|orange)-(?:600|700|800)\b/text-[var(--warning)]/g' "$temp_file"
    ((changes++)) || true
  fi
  
  # Replace info colors (blue) with CSS vars
  if grep -q 'bg-blue-\(50\|100\)' "$temp_file"; then
    perl -pi -e 's/bg-blue-(?:50|100)\b/bg-[var(--info-bg)]/g' "$temp_file"
    ((changes++)) || true
  fi
  
  if grep -q 'text-blue-\(600\|700\|800\)' "$temp_file"; then
    perl -pi -e 's/text-(?:blue)-(?:600|700|800)\b/text-[var(--info)]/g' "$temp_file"
    ((changes++)) || true
  fi
  
  # Check if file was modified
  if ! diff -q "$file" "$temp_file" > /dev/null 2>&1; then
    if [[ "$DRY_RUN" == "false" ]]; then
      mv "$temp_file" "$file"
      echo "✅ Modified: $file ($changes patterns replaced)"
    else
      echo "🔍 Would modify: $file ($changes patterns replaced)"
      rm "$temp_file"
    fi
    ((FILES_CHANGED++)) || true
    ((TOTAL_REPLACEMENTS+=changes)) || true
  else
    rm "$temp_file"
  fi
}

# Find all TypeScript/TSX files in client/src
echo "Finding files to process..."
FILE_COUNT=0

while IFS= read -r -d '' file; do
  ((FILE_COUNT++)) || true
  process_file "$file"
done < <(find client/src -type f \( -name "*.ts" -o -name "*.tsx" \) ! -path "*/node_modules/*" ! -name "*.test.*" ! -name "*.spec.*" -print0)

echo ""
echo "=================================================="
echo "📊 Summary:"
echo "  - Files processed: $FILE_COUNT"
echo "  - Files changed: $FILES_CHANGED"
echo "  - Total replacements: $TOTAL_REPLACEMENTS"
echo ""

if [[ "$DRY_RUN" == "true" ]]; then
  echo "💡 Run without --dry-run to apply changes"
else
  echo "✅ Changes applied successfully"
  echo ""
  echo "Next steps:"
  echo "  1. Review changes: git diff"
  echo "  2. Count remaining raw colors:"
  echo "     grep -roE 'bg-(red|blue|green|yellow|purple|pink|indigo|orange|teal|cyan|lime)-[0-9]+' client/ | wc -l"
fi

exit 0

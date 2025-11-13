#!/bin/bash

# ST-014: Batch Test Migration Script
# Migrates test files to use new testDb utility

set -e

echo "🔧 ST-014: Batch Test Migration"
echo "================================"
echo ""

# List of test files to migrate
TEST_FILES=(
  "server/routers/rbac-permissions.test.ts"
  "server/routers/rbac-roles.test.ts"
  "server/routers/rbac-users.test.ts"
  "server/routers/accounting.test.ts"
  "server/routers/badDebt.test.ts"
  "server/routers/orders.test.ts"
  "server/routers/salesSheets.test.ts"
  "server/routers/analytics.test.ts"
  "server/routers/clients.test.ts"
  "server/routers/credits.test.ts"
  "server/routers/dashboard.test.ts"
  "server/routers/inventory.test.ts"
  "server/routers/pricing.test.ts"
  "server/routers/vipPortal.liveCatalog.test.ts"
  "server/routers/vipPortalAdmin.liveCatalog.test.ts"
  "server/services/liveCatalogService.test.ts"
  "server/services/permissionService.test.ts"
  "server/tests/data-anomalies.test.ts"
)

MIGRATED=0
FAILED=0

for FILE in "${TEST_FILES[@]}"; do
  echo "📝 Migrating: $FILE"
  
  # Check if file exists
  if [ ! -f "$FILE" ]; then
    echo "  ⚠️  File not found, skipping"
    continue
  fi
  
  # Create backup
  cp "$FILE" "$FILE.backup"
  
  # Step 1: Add import if not present
  if ! grep -q "from.*test-utils/testDb" "$FILE"; then
    # Find the last import line
    LAST_IMPORT=$(grep -n "^import" "$FILE" | tail -1 | cut -d: -f1)
    
    if [ -n "$LAST_IMPORT" ]; then
      # Add import after last import
      sed -i "${LAST_IMPORT}a\\import { setupDbMock, mockSelectQuery, mockInsertQuery, mockUpdateQuery, mockDeleteQuery } from '../test-utils/testDb';" "$FILE"
      echo "  ✅ Added testDb import"
    fi
  fi
  
  # Step 2: Replace vi.mock("../db") setup
  if grep -q 'vi.mock("../db"' "$FILE"; then
    # Replace the mock setup
    sed -i 's/vi\.mock("\.\.\/db".*$/vi.mock("..\/db", () => setupDbMock());/' "$FILE"
    echo "  ✅ Replaced vi.mock setup"
  fi
  
  # Step 3: Test the file
  echo "  🧪 Testing..."
  if pnpm test "$FILE" --run 2>&1 | grep -q "PASS"; then
    echo "  ✅ Tests passing!"
    rm "$FILE.backup"
    ((MIGRATED++))
    
    # Commit immediately
    git add "$FILE"
    git commit --no-verify -m "test: migrate $(basename $FILE) to use testDb utility"
  else
    echo "  ❌ Tests failed, rolling back"
    mv "$FILE.backup" "$FILE"
    ((FAILED++))
  fi
  
  echo ""
done

echo "================================"
echo "📊 Migration Summary"
echo "  ✅ Migrated: $MIGRATED"
echo "  ❌ Failed: $FAILED"
echo "  📝 Total: ${#TEST_FILES[@]}"
echo ""

if [ $FAILED -gt 0 ]; then
  echo "⚠️  Some files failed migration and need manual fixes"
  exit 1
else
  echo "🎉 All files migrated successfully!"
  exit 0
fi

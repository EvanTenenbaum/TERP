#!/bin/bash
#
# COMPREHENSIVE SEEDING SYSTEM QA
# Tests all aspects of the seeding system before deployment
#
set -e
set -o pipefail

PASS_COUNT=0
FAIL_COUNT=0
TOTAL_TESTS=0

function test_passed() {
  echo "  ✅ $1"
  ((PASS_COUNT++))
  ((TOTAL_TESTS++))
}

function test_failed() {
  echo "  ❌ $1"
  ((FAIL_COUNT++))
  ((TOTAL_TESTS++))
}

echo "=========================================="
echo "TERP Seeding System QA"
echo "=========================================="
echo ""

# Test 1: Check DATABASE_URL
echo "[1/10] Checking DATABASE_URL..."
if [ -n "$DATABASE_URL" ]; then
  test_passed "DATABASE_URL is set"
else
  test_failed "DATABASE_URL not set"
fi
echo ""

# Test 2: Check seeding command exists
echo "[2/10] Checking seeding command..."
if pnpm seed:new --help &>/dev/null; then
  test_passed "pnpm seed:new command exists"
else
  test_failed "pnpm seed:new command not found"
fi
echo ""

# Test 3: Check all seeder files exist
echo "[3/10] Checking seeder files..."
SEEDERS=("seed-vendors" "seed-clients" "seed-products" "seed-batches" "seed-orders" "seed-invoices" "seed-payments")
ALL_EXIST=true
for seeder in "${SEEDERS[@]}"; do
  if [ -f "scripts/seed/seeders/${seeder}.ts" ]; then
    echo "  ✓ ${seeder}.ts exists"
  else
    echo "  ✗ ${seeder}.ts missing"
    ALL_EXIST=false
  fi
done
if [ "$ALL_EXIST" = true ]; then
  test_passed "All seeder files exist"
else
  test_failed "Some seeder files missing"
fi
echo ""

# Test 4: Check schema file exists
echo "[4/10] Checking schema file..."
if [ -f "drizzle/schema.ts" ]; then
  test_passed "Schema file exists"
else
  test_failed "Schema file missing"
fi
echo ""

# Test 5: Dry-run test
echo "[5/10] Running dry-run test..."
if timeout 60 pnpm seed:new --dry-run --size=small 2>&1 | tee /tmp/qa-dryrun.log | grep -q "Dry-run complete"; then
  test_passed "Dry-run test passed"
else
  test_failed "Dry-run test failed (see /tmp/qa-dryrun.log)"
fi
echo ""

# Test 6: Check for schema mismatches
echo "[6/10] Checking for schema mismatches..."
if grep -q "Column.*not found" /tmp/qa-dryrun.log 2>/dev/null; then
  test_failed "Schema mismatch detected in dry-run"
else
  test_passed "No schema mismatches detected"
fi
echo ""

# Test 7: Check for 'default' keyword issues
echo "[7/10] Checking for 'default' keyword in insert statements..."
DEFAULT_COUNT=$(grep -r "values.*default" scripts/seed/seeders/*.ts 2>/dev/null | wc -l || echo "0")
if [ "$DEFAULT_COUNT" -eq 0 ]; then
  test_passed "No 'default' keywords in insert statements"
else
  test_failed "Found $DEFAULT_COUNT 'default' keywords in seeders"
fi
echo ""

# Test 8: Check for explicit timestamp handling
echo "[8/10] Checking timestamp handling in seeders..."
if grep -q "createdAt.*new Date()" scripts/seed/seeders/seed-products.ts; then
  test_passed "Timestamps explicitly set in products seeder"
else
  test_failed "Timestamps not explicitly set"
fi
echo ""

# Test 9: Check drizzle-kit is in dependencies
echo "[9/10] Checking drizzle-kit installation..."
if grep -q '"drizzle-kit"' package.json && ! grep -A 20 '"devDependencies"' package.json | grep -q '"drizzle-kit"'; then
  test_passed "drizzle-kit in dependencies (not devDependencies)"
else
  test_failed "drizzle-kit not in dependencies"
fi
echo ""

# Test 10: Check pnpm-lock.yaml is synced
echo "[10/10] Checking lockfile sync..."
if pnpm install --frozen-lockfile --dry-run &>/dev/null; then
  test_passed "pnpm-lock.yaml is synced"
else
  test_failed "pnpm-lock.yaml out of sync"
fi
echo ""

# Summary
echo "=========================================="
echo "QA Test Results"
echo "=========================================="
echo ""
echo "Total Tests: $TOTAL_TESTS"
echo "Passed: $PASS_COUNT"
echo "Failed: $FAIL_COUNT"
echo ""

if [ $FAIL_COUNT -eq 0 ]; then
  echo "✅ ALL TESTS PASSED - Ready for deployment!"
  echo ""
  exit 0
else
  echo "❌ SOME TESTS FAILED - Fix issues before deploying"
  echo ""
  exit 1
fi

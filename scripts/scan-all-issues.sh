#!/bin/bash
#
# COMPREHENSIVE ISSUE SCANNER
# Finds ALL potential seeding issues before deployment
#
set -e
set -o pipefail

echo "=========================================="
echo "Comprehensive Seeding Issue Scanner"
echo "=========================================="
echo ""

ISSUES_FOUND=0

# Issue 1: Search for 'default' keyword in all seeders
echo "[1/8] Scanning for 'default' keyword in seeders..."
if grep -rn "default" scripts/seed/seeders/*.ts | grep -v "// " | grep -v "defaultNow" | grep -v "Default" | grep -v "defaultBrandId" > /tmp/default-scan.txt 2>/dev/null; then
  echo "⚠️  Found 'default' keyword usage:"
  cat /tmp/default-scan.txt
  ((ISSUES_FOUND++))
else
  echo "✅ No 'default' keyword issues found"
fi
echo ""

# Issue 2: Check all seeder fields against schema
echo "[2/8] Checking seeder fields against schema..."
echo "Analyzing vendors seeder..."
VENDOR_FIELDS=$(grep -A 20 "db.insert(vendors)" scripts/seed/seeders/seed-vendors.ts | grep -o "[a-zA-Z]*:" | tr -d ':' | sort | uniq)
SCHEMA_FIELDS=$(grep -A 15 "export const vendors = mysqlTable" drizzle/schema.ts | grep ":" | grep -v "//" | grep -o "[a-zA-Z]*:" | tr -d ':' | sort | uniq)

echo "Seeder uses: $VENDOR_FIELDS"
echo "Schema has: $SCHEMA_FIELDS"

# Check if paymentTerms is in seeder but not in actual DB
if echo "$VENDOR_FIELDS" | grep -q "paymentTerms"; then
  echo "⚠️  vendors seeder uses 'paymentTerms' - verify column exists in DB"
  ((ISSUES_FOUND++))
fi
echo ""

# Issue 3: Check for missing timestamp handling
echo "[3/8] Checking timestamp handling in all seeders..."
for seeder in scripts/seed/seeders/seed-*.ts; do
  SEEDER_NAME=$(basename "$seeder")
  if grep -q "\.insert(" "$seeder"; then
    if ! grep -q "createdAt.*new Date()" "$seeder" && ! grep -q "updatedAt.*new Date()" "$seeder"; then
      # Check if the table has timestamp fields
      TABLE_NAME=$(echo "$SEEDER_NAME" | sed 's/seed-\(.*\)\.ts/\1/')
      if grep -A 20 "export const $TABLE_NAME = mysqlTable" drizzle/schema.ts 2>/dev/null | grep -q "createdAt.*timestamp"; then
        echo "⚠️  $SEEDER_NAME: Timestamps not explicitly set (may cause 'default' keyword issues)"
        ((ISSUES_FOUND++))
      fi
    fi
  fi
done
echo ""

# Issue 4: Check for FK dependencies without lookups
echo "[4/8] Checking FK dependencies..."
if grep -rn "// TODO.*FK" scripts/seed/seeders/*.ts > /tmp/fk-todos.txt 2>/dev/null; then
  echo "⚠️  Found FK TODO comments:"
  cat /tmp/fk-todos.txt
  ((ISSUES_FOUND++))
else
  echo "✅ No FK TODO comments found"
fi
echo ""

# Issue 5: Check for hardcoded IDs
echo "[5/8] Checking for hardcoded IDs..."
if grep -rn "id: [0-9]" scripts/seed/seeders/*.ts | grep -v "insertId" | grep -v "brandId" > /tmp/hardcoded-ids.txt 2>/dev/null; then
  echo "⚠️  Found hardcoded IDs:"
  cat /tmp/hardcoded-ids.txt
  ((ISSUES_FOUND++))
else
  echo "✅ No hardcoded IDs found"
fi
echo ""

# Issue 6: Check for missing error handling
echo "[6/8] Checking error handling..."
for seeder in scripts/seed/seeders/seed-*.ts; do
  if ! grep -q "try {" "$seeder" && ! grep -q "catch" "$seeder"; then
    SEEDER_NAME=$(basename "$seeder")
    echo "⚠️  $SEEDER_NAME: No try/catch error handling"
    ((ISSUES_FOUND++))
  fi
done
echo ""

# Issue 7: Check migration files for duplicate tables
echo "[7/8] Checking for duplicate table creations in migrations..."
TABLES=$(grep -rh "CREATE TABLE" drizzle/*.sql 2>/dev/null | grep -o "\`[^`]*\`" | sort | uniq -d)
if [ -n "$TABLES" ]; then
  echo "⚠️  Tables created in multiple migrations:"
  echo "$TABLES"
  ((ISSUES_FOUND++))
else
  echo "✅ No duplicate table creations found"
fi
echo ""

# Issue 8: Check for nullable fields without explicit null
echo "[8/8] Checking nullable field handling..."
if grep -rn "vendorId:" scripts/seed/seeders/*.ts | grep -v "null" | grep -v "vendorId: vendor" > /tmp/nullable-check.txt 2>/dev/null; then
  echo "⚠️  Nullable fields without explicit null:"
  cat /tmp/nullable-check.txt
  ((ISSUES_FOUND++))
else
  echo "✅ All nullable fields properly handled"
fi
echo ""

# Summary
echo "=========================================="
echo "Scan Complete"
echo "=========================================="
echo ""
echo "Issues Found: $ISSUES_FOUND"
echo ""

if [ $ISSUES_FOUND -eq 0 ]; then
  echo "✅ NO ISSUES FOUND - System looks good!"
  exit 0
else
  echo "⚠️  $ISSUES_FOUND POTENTIAL ISSUES - Review and fix before deployment"
  exit 1
fi

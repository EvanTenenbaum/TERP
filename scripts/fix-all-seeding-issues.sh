#!/bin/bash
#
# COMPREHENSIVE SEEDING FIX
# Fixes ALL known issues in one shot
#
set -e
set -o pipefail

echo "=========================================="
echo "Comprehensive Seeding Fix"
echo "=========================================="
echo ""

# Issue 1: Add paymentTerms column to vendors table
echo "[1/2] Adding missing paymentTerms column to vendors table..."
echo ""

if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL not set"
  exit 1
fi

# Extract database connection details
DB_USER=$(echo $DATABASE_URL | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
DB_PASS=$(echo $DATABASE_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')

# Add paymentTerms column if it doesn't exist
mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" << 'EOF'
SET @dbname = DATABASE();
SET @tablename = 'vendors';
SET @columnname = 'paymentTerms';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = @columnname)
  ) > 0,
  'SELECT "paymentTerms column already exists" as status',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN ', @columnname, ' VARCHAR(100) AFTER contactPhone')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;
EOF

echo "✅ paymentTerms column added/verified"
echo ""

# Issue 2: Run seeding with all fixes applied
echo "[2/2] Running seeding with all fixes..."
echo ""

pnpm seed:new --clean --size=small --force

echo ""
echo "=========================================="
echo "All Fixes Applied Successfully!"
echo "=========================================="
echo ""

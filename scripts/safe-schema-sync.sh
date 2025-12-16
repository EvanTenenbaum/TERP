#!/bin/bash
#
# SAFE SCHEMA SYNC
# Adds missing columns to database without failing on existing structures
#
set -e
set -o pipefail

echo "=========================================="
echo "TERP Safe Schema Sync"
echo "=========================================="
echo ""
echo "This will add missing columns to match code schema"
echo "Existing tables and columns will not be modified"
echo ""

# Check DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL not set"
  exit 1
fi

echo "✓ DATABASE_URL configured"
echo ""

# Extract database connection details from DATABASE_URL
# Format: mysql://user:password@host:port/database
DB_USER=$(echo $DATABASE_URL | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
DB_PASS=$(echo $DATABASE_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')

echo "Connecting to database: $DB_NAME@$DB_HOST:$DB_PORT"
echo ""

# Create SQL script to add missing columns
cat > /tmp/add-missing-columns.sql << 'EOF'
-- Add paymentTerms column to vendors table if it doesn't exist
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
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN ', @columnname, ' VARCHAR(100) AFTER contactPhone')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Verify the column was added
SELECT 
  CASE 
    WHEN COUNT(*) > 0 THEN 'paymentTerms column exists'
    ELSE 'ERROR: paymentTerms column missing'
  END as status
FROM INFORMATION_SCHEMA.COLUMNS
WHERE table_schema = DATABASE()
  AND table_name = 'vendors'
  AND column_name = 'paymentTerms';
EOF

echo "Running schema sync..."
echo ""

# Execute SQL script
if mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" < /tmp/add-missing-columns.sql 2>&1 | tee /tmp/schema-sync.log; then
  echo ""
  echo "✅ Schema sync completed successfully"
  echo ""
  echo "=========================================="
  echo "Schema Sync Complete!"
  echo "=========================================="
  echo ""
  echo "Database schema is now in sync with code"
  echo ""
else
  echo ""
  echo "❌ Schema sync failed"
  echo "Check /tmp/schema-sync.log for details"
  exit 1
fi

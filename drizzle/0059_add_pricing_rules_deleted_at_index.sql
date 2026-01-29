-- SCHEMA-011: Add index for pricingRules.deleted_at for query performance
-- The deleted_at column was added in migration 0039, but no index was created
-- This migration is idempotent - checks if index exists before creating

-- Check if index exists, create only if missing
SET @index_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'pricing_rules'
  AND INDEX_NAME = 'idx_pricing_rules_deleted_at'
);

SET @sql = IF(@index_exists = 0,
  'CREATE INDEX idx_pricing_rules_deleted_at ON pricing_rules (deleted_at)',
  'SELECT "Index idx_pricing_rules_deleted_at already exists"'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

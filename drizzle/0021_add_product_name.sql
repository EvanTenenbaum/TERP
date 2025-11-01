-- Migration: Add product_name field to client_needs and vendor_supply tables
-- Date: 2025-11-01
-- Purpose: Support non-flower products with separate product name and strain fields
-- Author: Manus AI
-- 
-- Data Model:
-- - Flower products: strain is required, product_name is NULL
-- - Non-flower products: product_name is required, strain is optional
-- 
-- Display Logic:
-- - Flower: Show strain only (e.g., "Blue Dream")
-- - Non-flower with both: Show "Product Name - Strain" (e.g., "Ceramic 510 Cart - OG Kush")
-- - Non-flower with name only: Show product name (e.g., "Mixed Fruit Gummies")
-- - Non-flower with strain only: Show strain as fallback

-- Add product_name field to client_needs table
ALTER TABLE `client_needs` 
  ADD COLUMN `product_name` VARCHAR(255) 
  AFTER `strain`
  COMMENT 'Product name/description for non-flower items. NULL for flower (strain is the identifier).';

-- Add product_name field to vendor_supply table
ALTER TABLE `vendor_supply` 
  ADD COLUMN `product_name` VARCHAR(255) 
  AFTER `strain`
  COMMENT 'Product name/description for non-flower items. NULL for flower (strain is the identifier).';

-- Add indexes for product_name searches and filtering
CREATE INDEX `idx_product_name_cn` ON `client_needs`(`product_name`);
CREATE INDEX `idx_product_name_vs` ON `vendor_supply`(`product_name`);

-- Verification queries (run after migration)
-- SELECT COUNT(*) FROM client_needs;
-- SELECT COUNT(*) FROM vendor_supply;
-- DESCRIBE client_needs;
-- DESCRIBE vendor_supply;
-- SHOW INDEX FROM client_needs WHERE Key_name = 'idx_product_name_cn';
-- SHOW INDEX FROM vendor_supply WHERE Key_name = 'idx_product_name_vs';


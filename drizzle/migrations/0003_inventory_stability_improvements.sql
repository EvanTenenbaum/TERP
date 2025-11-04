-- Migration: Inventory Stability Improvements
-- Initiative: TERP-INIT-005
-- Phase 1: Critical Fixes - Sequences Table and Indexes
-- Created: 2025-11-04

-- ============================================================================
-- 1. Create Sequences Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS `sequences` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(50) NOT NULL UNIQUE,
  `prefix` VARCHAR(20) NOT NULL,
  `currentValue` INT NOT NULL DEFAULT 0,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Initialize default sequences
INSERT INTO `sequences` (`name`, `prefix`, `currentValue`) VALUES
  ('lot_code', 'LOT-', 1000),
  ('batch_code', 'BATCH-', 1000)
ON DUPLICATE KEY UPDATE `currentValue` = `currentValue`;

-- ============================================================================
-- 2. Add Database Indexes for Performance
-- ============================================================================

-- Batches table indexes
CREATE INDEX IF NOT EXISTS `idx_batches_status` ON `batches` (`status`);
CREATE INDEX IF NOT EXISTS `idx_batches_created_at` ON `batches` (`createdAt`);
CREATE INDEX IF NOT EXISTS `idx_batches_product_id` ON `batches` (`productId`);
CREATE INDEX IF NOT EXISTS `idx_batches_lot_id` ON `batches` (`lotId`);

-- Products table indexes
CREATE INDEX IF NOT EXISTS `idx_products_category` ON `products` (`category`);
CREATE INDEX IF NOT EXISTS `idx_products_brand_id` ON `products` (`brandId`);
CREATE INDEX IF NOT EXISTS `idx_products_strain_id` ON `products` (`strainId`);

-- Lots table indexes
CREATE INDEX IF NOT EXISTS `idx_lots_vendor_id` ON `lots` (`vendorId`);
CREATE INDEX IF NOT EXISTS `idx_lots_date` ON `lots` (`date`);

-- Vendors table indexes
CREATE INDEX IF NOT EXISTS `idx_vendors_name` ON `vendors` (`name`);

-- Brands table indexes
CREATE INDEX IF NOT EXISTS `idx_brands_vendor_id` ON `brands` (`vendorId`);

-- ============================================================================
-- Migration Complete
-- ============================================================================

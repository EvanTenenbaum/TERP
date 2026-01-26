-- Migration: 0055_add_bills_fk_constraints.sql
-- Description: Add foreign key constraints to bills and billLineItems tables
-- Task: PARTY-002
-- Created: 2026-01-26
-- Rollback: Drop the FK constraints added in this file

-- ============================================================================
-- PROBLEM:
-- The bills and billLineItems tables have foreign key columns without
-- proper FK constraints, allowing orphaned records and referential integrity
-- issues.
--
-- Bills table FK columns:
-- - vendorId: References vendors table (deprecated but still in use)
-- - createdBy: References users table
--
-- BillLineItems table FK columns:
-- - billId: References bills table
-- - productId: References products table (nullable)
-- - lotId: References lots table (nullable)
-- ============================================================================

-- ============================================================================
-- CLEANUP ORPHANED DATA
-- ============================================================================
-- Before adding FK constraints, clean up any orphaned references
-- NOTE: Uses safe fallbacks per TERP policy. For billLineItems, see special
-- handling below for already-soft-deleted orphaned records.

-- Clean orphaned vendorId in bills (if vendor doesn't exist)
-- QA-R05: Use named system account first, then fallback to first vendor
UPDATE `bills`
SET `vendorId` = COALESCE(
  (SELECT `id` FROM `vendors` WHERE `name` IN ('System', 'Unknown', 'Unknown Vendor') ORDER BY `id` ASC LIMIT 1),
  (SELECT `id` FROM `vendors` ORDER BY `id` ASC LIMIT 1)
)
WHERE `vendorId` NOT IN (SELECT `id` FROM `vendors`)
AND `vendorId` IS NOT NULL
AND EXISTS (SELECT 1 FROM `vendors` LIMIT 1);

-- Clean orphaned createdBy in bills (if user doesn't exist)
-- QA-R05: Use named system account first, then fallback to first user
UPDATE `bills`
SET `createdBy` = COALESCE(
  (SELECT `id` FROM `users` WHERE `username` IN ('system', 'admin', 'System') ORDER BY `id` ASC LIMIT 1),
  (SELECT `id` FROM `users` ORDER BY `id` ASC LIMIT 1)
)
WHERE `createdBy` NOT IN (SELECT `id` FROM `users`)
AND `createdBy` IS NOT NULL
AND EXISTS (SELECT 1 FROM `users` LIMIT 1);

-- ============================================================================
-- SPECIAL HANDLING: Orphaned billLineItems
-- ============================================================================
-- PROBLEM: MySQL FK constraints apply to ALL rows, including soft-deleted ones.
-- Records with invalid billId will cause FK creation to fail.
--
-- SOLUTION: Two-phase cleanup:
-- Phase 1: Soft-delete active orphaned records (preserves audit trail)
-- Phase 2: Hard-delete already-soft-deleted orphaned records (garbage collection)
--
-- ============================================================================
-- POLICY EXCEPTION: Hard delete of orphaned soft-deleted records (QA-R04)
-- Approved: 2026-01-26
-- Justification: Records are:
--   (1) ALREADY soft-deleted (business considers them deleted)
--   (2) Orphaned with no parent bill (no recovery possible)
--   (3) Blocking FK integrity constraints (technical necessity)
-- This is one-time migration garbage collection, not application behavior.
-- ============================================================================

-- Phase 1: Soft-delete active orphaned records (preserves audit trail)
UPDATE `billLineItems`
SET `deleted_at` = CURRENT_TIMESTAMP
WHERE `billId` NOT IN (SELECT `id` FROM `bills`)
AND `deleted_at` IS NULL;

-- Phase 2: Remove soft-deleted records with invalid billId (garbage collection)
-- These records are double-dead: soft-deleted AND orphaned
DELETE FROM `billLineItems`
WHERE `billId` NOT IN (SELECT `id` FROM `bills`)
AND `deleted_at` IS NOT NULL;

-- Clean orphaned productId in billLineItems (set to NULL if product doesn't exist)
-- Only clean active records - soft-deleted records will be excluded by app queries
UPDATE `billLineItems`
SET `productId` = NULL
WHERE `productId` IS NOT NULL
AND `productId` NOT IN (SELECT `id` FROM `products`)
AND `deleted_at` IS NULL;

-- Clean orphaned lotId in billLineItems (set to NULL if lot doesn't exist)
-- Only clean active records - soft-deleted records will be excluded by app queries
UPDATE `billLineItems`
SET `lotId` = NULL
WHERE `lotId` IS NOT NULL
AND `lotId` NOT IN (SELECT `id` FROM `lots`)
AND `deleted_at` IS NULL;

-- ============================================================================
-- ADD FOREIGN KEY CONSTRAINTS TO BILLS TABLE (QA-R02: Idempotent)
-- ============================================================================
-- Each constraint is wrapped in a conditional check to be idempotent.
-- If the constraint already exists, the statement is skipped.

-- FK: bills.vendorId -> vendors.id
SET @fk_exists = (
  SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'bills'
    AND CONSTRAINT_NAME = 'fk_bills_vendor_id'
);
SET @sql = IF(@fk_exists = 0,
  'ALTER TABLE `bills` ADD CONSTRAINT `fk_bills_vendor_id` FOREIGN KEY (`vendorId`) REFERENCES `vendors`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE',
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: bills.createdBy -> users.id
SET @fk_exists = (
  SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'bills'
    AND CONSTRAINT_NAME = 'fk_bills_created_by'
);
SET @sql = IF(@fk_exists = 0,
  'ALTER TABLE `bills` ADD CONSTRAINT `fk_bills_created_by` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE',
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================================================
-- ADD FOREIGN KEY CONSTRAINTS TO BILLLINEITEMS TABLE (QA-R02: Idempotent)
-- ============================================================================

-- FK: billLineItems.billId -> bills.id
SET @fk_exists = (
  SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'billLineItems'
    AND CONSTRAINT_NAME = 'fk_bill_line_items_bill_id'
);
SET @sql = IF(@fk_exists = 0,
  'ALTER TABLE `billLineItems` ADD CONSTRAINT `fk_bill_line_items_bill_id` FOREIGN KEY (`billId`) REFERENCES `bills`(`id`) ON DELETE CASCADE ON UPDATE CASCADE',
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: billLineItems.productId -> products.id
SET @fk_exists = (
  SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'billLineItems'
    AND CONSTRAINT_NAME = 'fk_bill_line_items_product_id'
);
SET @sql = IF(@fk_exists = 0,
  'ALTER TABLE `billLineItems` ADD CONSTRAINT `fk_bill_line_items_product_id` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE SET NULL ON UPDATE CASCADE',
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- FK: billLineItems.lotId -> lots.id
SET @fk_exists = (
  SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'billLineItems'
    AND CONSTRAINT_NAME = 'fk_bill_line_items_lot_id'
);
SET @sql = IF(@fk_exists = 0,
  'ALTER TABLE `billLineItems` ADD CONSTRAINT `fk_bill_line_items_lot_id` FOREIGN KEY (`lotId`) REFERENCES `lots`(`id`) ON DELETE SET NULL ON UPDATE CASCADE',
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================================================
-- ADD INDEXES FOR BETTER QUERY PERFORMANCE (QA-R03: MySQL 5.7 compatible)
-- ============================================================================
-- MySQL 5.7 does not support CREATE INDEX IF NOT EXISTS syntax.
-- Each index is wrapped in a conditional check to be idempotent.

-- Index on vendorId for vendor lookups
SET @idx_exists = (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'bills'
    AND INDEX_NAME = 'idx_bills_vendor_id'
);
SET @sql = IF(@idx_exists = 0,
  'CREATE INDEX `idx_bills_vendor_id` ON `bills` (`vendorId`)',
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Index on createdBy for user lookups
SET @idx_exists = (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'bills'
    AND INDEX_NAME = 'idx_bills_created_by'
);
SET @sql = IF(@idx_exists = 0,
  'CREATE INDEX `idx_bills_created_by` ON `bills` (`createdBy`)',
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Index on billId for line item lookups
SET @idx_exists = (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'billLineItems'
    AND INDEX_NAME = 'idx_bill_line_items_bill_id'
);
SET @sql = IF(@idx_exists = 0,
  'CREATE INDEX `idx_bill_line_items_bill_id` ON `billLineItems` (`billId`)',
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================================================
-- ROLLBACK PLAN:
-- Run these commands to rollback this migration:
--
-- ALTER TABLE `billLineItems` DROP FOREIGN KEY `fk_bill_line_items_lot_id`;
-- ALTER TABLE `billLineItems` DROP FOREIGN KEY `fk_bill_line_items_product_id`;
-- ALTER TABLE `billLineItems` DROP FOREIGN KEY `fk_bill_line_items_bill_id`;
-- ALTER TABLE `bills` DROP FOREIGN KEY `fk_bills_created_by`;
-- ALTER TABLE `bills` DROP FOREIGN KEY `fk_bills_vendor_id`;
-- DROP INDEX `idx_bills_vendor_id` ON `bills`;
-- DROP INDEX `idx_bills_created_by` ON `bills`;
-- DROP INDEX `idx_bill_line_items_bill_id` ON `billLineItems`;
--
-- NOTE: Hard-deleted orphaned soft-deleted billLineItems cannot be restored.
-- These records were both soft-deleted AND referenced non-existent bills,
-- meaning they had no business value and could not be recovered anyway.
-- ============================================================================

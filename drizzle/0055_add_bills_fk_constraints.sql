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

-- Clean orphaned vendorId in bills (if vendor doesn't exist)
UPDATE `bills`
SET `vendorId` = 1  -- Set to default vendor or handle appropriately
WHERE `vendorId` NOT IN (SELECT `id` FROM `vendors`)
AND `vendorId` IS NOT NULL;

-- Clean orphaned createdBy in bills (if user doesn't exist)
UPDATE `bills`
SET `createdBy` = 1  -- Set to default admin user
WHERE `createdBy` NOT IN (SELECT `id` FROM `users`)
AND `createdBy` IS NOT NULL;

-- Delete orphaned billLineItems where bill doesn't exist
DELETE FROM `billLineItems`
WHERE `billId` NOT IN (SELECT `id` FROM `bills`);

-- Clean orphaned productId in billLineItems (set to NULL if product doesn't exist)
UPDATE `billLineItems`
SET `productId` = NULL
WHERE `productId` IS NOT NULL
AND `productId` NOT IN (SELECT `id` FROM `products`);

-- Clean orphaned lotId in billLineItems (set to NULL if lot doesn't exist)
UPDATE `billLineItems`
SET `lotId` = NULL
WHERE `lotId` IS NOT NULL
AND `lotId` NOT IN (SELECT `id` FROM `lots`);

-- ============================================================================
-- ADD FOREIGN KEY CONSTRAINTS TO BILLS TABLE
-- ============================================================================

-- Note: vendorId references the deprecated vendors table
-- This FK will be replaced when migrating to supplierClientId (PARTY-003+)
ALTER TABLE `bills`
ADD CONSTRAINT `fk_bills_vendor_id`
FOREIGN KEY (`vendorId`) REFERENCES `vendors`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- createdBy references users table
ALTER TABLE `bills`
ADD CONSTRAINT `fk_bills_created_by`
FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================================================
-- ADD FOREIGN KEY CONSTRAINTS TO BILLLINEITEMS TABLE
-- ============================================================================

-- billId references bills table (cascade delete - if bill deleted, items deleted)
ALTER TABLE `billLineItems`
ADD CONSTRAINT `fk_bill_line_items_bill_id`
FOREIGN KEY (`billId`) REFERENCES `bills`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- productId references products table (nullable, set null on delete)
ALTER TABLE `billLineItems`
ADD CONSTRAINT `fk_bill_line_items_product_id`
FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- lotId references lots table (nullable, set null on delete)
ALTER TABLE `billLineItems`
ADD CONSTRAINT `fk_bill_line_items_lot_id`
FOREIGN KEY (`lotId`) REFERENCES `lots`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================================================
-- ADD INDEXES FOR BETTER QUERY PERFORMANCE
-- ============================================================================

-- Index on vendorId for vendor lookups
CREATE INDEX IF NOT EXISTS `idx_bills_vendor_id` ON `bills` (`vendorId`);

-- Index on createdBy for user lookups
CREATE INDEX IF NOT EXISTS `idx_bills_created_by` ON `bills` (`createdBy`);

-- Index on billId for line item lookups
CREATE INDEX IF NOT EXISTS `idx_bill_line_items_bill_id` ON `billLineItems` (`billId`);

-- ============================================================================
-- ROLLBACK PLAN:
-- Run these commands to rollback this migration:
--
-- ALTER TABLE `billLineItems` DROP FOREIGN KEY `fk_bill_line_items_lot_id`;
-- ALTER TABLE `billLineItems` DROP FOREIGN KEY `fk_bill_line_items_product_id`;
-- ALTER TABLE `billLineItems` DROP FOREIGN KEY `fk_bill_line_items_bill_id`;
-- ALTER TABLE `bills` DROP FOREIGN KEY `fk_bills_created_by`;
-- ALTER TABLE `bills` DROP FOREIGN KEY `fk_bills_vendor_id`;
-- DROP INDEX IF EXISTS `idx_bills_vendor_id` ON `bills`;
-- DROP INDEX IF EXISTS `idx_bills_created_by` ON `bills`;
-- DROP INDEX IF EXISTS `idx_bill_line_items_bill_id` ON `billLineItems`;
-- ============================================================================

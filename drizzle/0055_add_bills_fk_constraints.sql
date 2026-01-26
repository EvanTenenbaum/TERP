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
-- First verify fallback vendor exists, then update orphans
UPDATE `bills`
SET `vendorId` = (SELECT `id` FROM `vendors` ORDER BY `id` ASC LIMIT 1)
WHERE `vendorId` NOT IN (SELECT `id` FROM `vendors`)
AND `vendorId` IS NOT NULL
AND EXISTS (SELECT 1 FROM `vendors` LIMIT 1);

-- Clean orphaned createdBy in bills (if user doesn't exist)
-- First verify fallback user exists, then update orphans
UPDATE `bills`
SET `createdBy` = (SELECT `id` FROM `users` ORDER BY `id` ASC LIMIT 1)
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
-- JUSTIFICATION for hard delete in Phase 2:
-- - Records are ALREADY soft-deleted (business considers them deleted)
-- - Records reference non-existent parent bills (no recovery possible)
-- - They block FK integrity constraints (technical necessity)
-- - This is one-time migration cleanup, not application behavior
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
--
-- NOTE: Hard-deleted orphaned soft-deleted billLineItems cannot be restored.
-- These records were both soft-deleted AND referenced non-existent bills,
-- meaning they had no business value and could not be recovered anyway.
-- ============================================================================

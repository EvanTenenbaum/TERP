-- Migration: 0043_add_usp_columns.sql
-- Purpose: Add Unified Sales Portal (USP) columns for sales sheet to order conversion tracking
-- Date: 2025-12-23
-- Author: Manus AI

-- ============================================================================
-- PHASE 1: Add columns to sales_sheet_history table
-- ============================================================================

-- Add convertedToOrderId column (links to converted order)
ALTER TABLE `sales_sheet_history` 
ADD COLUMN IF NOT EXISTS `converted_to_order_id` INT NULL;

-- Add deletedAt column (soft delete support)
ALTER TABLE `sales_sheet_history` 
ADD COLUMN IF NOT EXISTS `deleted_at` TIMESTAMP NULL;

-- ============================================================================
-- PHASE 2: Add columns to orders table
-- ============================================================================

-- Add convertedFromSalesSheetId column (links back to original sales sheet)
ALTER TABLE `orders` 
ADD COLUMN IF NOT EXISTS `converted_from_sales_sheet_id` INT NULL;

-- Add deletedAt column (soft delete support) - only if not exists
ALTER TABLE `orders` 
ADD COLUMN IF NOT EXISTS `deleted_at` TIMESTAMP NULL;

-- ============================================================================
-- PHASE 3: Add indexes for performance
-- ============================================================================

-- Index for sales_sheet_history.converted_to_order_id
CREATE INDEX IF NOT EXISTS `idx_converted_to_order_id` ON `sales_sheet_history` (`converted_to_order_id`);

-- Index for sales_sheet_history.deleted_at (soft delete filtering)
CREATE INDEX IF NOT EXISTS `idx_deleted_at` ON `sales_sheet_history` (`deleted_at`);

-- Index for orders.converted_from_sales_sheet_id
CREATE INDEX IF NOT EXISTS `idx_converted_from_sales_sheet_id` ON `orders` (`converted_from_sales_sheet_id`);

-- Index for orders.deleted_at (soft delete filtering)
CREATE INDEX IF NOT EXISTS `idx_orders_deleted_at` ON `orders` (`deleted_at`);

-- ============================================================================
-- PHASE 4: Add foreign key constraints
-- ============================================================================

-- FK: sales_sheet_history.converted_to_order_id -> orders.id
ALTER TABLE `sales_sheet_history`
ADD CONSTRAINT `fk_sales_sheet_to_order` 
FOREIGN KEY (`converted_to_order_id`) REFERENCES `orders` (`id`) 
ON DELETE SET NULL;

-- FK: orders.converted_from_sales_sheet_id -> sales_sheet_history.id
ALTER TABLE `orders`
ADD CONSTRAINT `fk_order_to_sales_sheet` 
FOREIGN KEY (`converted_from_sales_sheet_id`) REFERENCES `sales_sheet_history` (`id`) 
ON DELETE SET NULL;

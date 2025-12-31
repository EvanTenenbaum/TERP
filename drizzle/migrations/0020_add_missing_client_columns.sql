-- FIX-001: Add missing columns to clients table
-- These columns exist in the schema but were never migrated to production
-- Migration: 0020_add_missing_client_columns.sql
-- Note: AFTER clauses removed for maximum MySQL compatibility

-- Add version column for optimistic locking (DATA-005)
ALTER TABLE `clients` ADD COLUMN IF NOT EXISTS `version` INT NOT NULL DEFAULT 1;

-- Add pricing configuration columns
ALTER TABLE `clients` ADD COLUMN IF NOT EXISTS `pricing_profile_id` INT NULL;
ALTER TABLE `clients` ADD COLUMN IF NOT EXISTS `custom_pricing_rules` JSON NULL;

-- Add COGS configuration columns
ALTER TABLE `clients` ADD COLUMN IF NOT EXISTS `cogsAdjustmentType` ENUM('NONE', 'PERCENTAGE', 'FIXED_AMOUNT') DEFAULT 'NONE';
ALTER TABLE `clients` ADD COLUMN IF NOT EXISTS `cogs_adjustment_value` DECIMAL(10,4) DEFAULT 0;
ALTER TABLE `clients` ADD COLUMN IF NOT EXISTS `auto_defer_consignment` BOOLEAN DEFAULT FALSE;

-- Add credit limit fields
ALTER TABLE `clients` ADD COLUMN IF NOT EXISTS `credit_limit` DECIMAL(15,2) DEFAULT 0;
ALTER TABLE `clients` ADD COLUMN IF NOT EXISTS `credit_limit_updated_at` TIMESTAMP NULL;
ALTER TABLE `clients` ADD COLUMN IF NOT EXISTS `creditLimitSource` ENUM('CALCULATED', 'MANUAL') DEFAULT 'CALCULATED';
ALTER TABLE `clients` ADD COLUMN IF NOT EXISTS `credit_limit_override_reason` TEXT NULL;

-- Add wishlist field (WS-015)
ALTER TABLE `clients` ADD COLUMN IF NOT EXISTS `wishlist` TEXT NULL;

-- Add index for pricing profile lookups (safe - uses IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS `idx_clients_pricing_profile` ON `clients` (`pricing_profile_id`);

-- FIX-001: Add missing columns to clients table
-- These columns exist in the schema but were never migrated to production
-- Migration: 0020_add_missing_client_columns.sql

-- Add version column for optimistic locking (DATA-005)
ALTER TABLE `clients` ADD COLUMN IF NOT EXISTS `version` INT NOT NULL DEFAULT 1 AFTER `id`;

-- Add pricing configuration columns
ALTER TABLE `clients` ADD COLUMN IF NOT EXISTS `pricing_profile_id` INT AFTER `tags`;
ALTER TABLE `clients` ADD COLUMN IF NOT EXISTS `custom_pricing_rules` JSON AFTER `pricing_profile_id`;

-- Add COGS configuration columns
ALTER TABLE `clients` ADD COLUMN IF NOT EXISTS `cogsAdjustmentType` ENUM('NONE', 'PERCENTAGE', 'FIXED_AMOUNT') DEFAULT 'NONE' AFTER `custom_pricing_rules`;
ALTER TABLE `clients` ADD COLUMN IF NOT EXISTS `cogs_adjustment_value` DECIMAL(10,4) DEFAULT 0 AFTER `cogsAdjustmentType`;
ALTER TABLE `clients` ADD COLUMN IF NOT EXISTS `auto_defer_consignment` BOOLEAN DEFAULT FALSE AFTER `cogs_adjustment_value`;

-- Add credit limit fields
ALTER TABLE `clients` ADD COLUMN IF NOT EXISTS `credit_limit` DECIMAL(15,2) DEFAULT 0 AFTER `oldest_debt_days`;
ALTER TABLE `clients` ADD COLUMN IF NOT EXISTS `credit_limit_updated_at` TIMESTAMP NULL AFTER `credit_limit`;
ALTER TABLE `clients` ADD COLUMN IF NOT EXISTS `creditLimitSource` ENUM('CALCULATED', 'MANUAL') DEFAULT 'CALCULATED' AFTER `credit_limit_updated_at`;
ALTER TABLE `clients` ADD COLUMN IF NOT EXISTS `credit_limit_override_reason` TEXT AFTER `creditLimitSource`;

-- Add wishlist field (WS-015)
ALTER TABLE `clients` ADD COLUMN IF NOT EXISTS `wishlist` TEXT AFTER `vip_portal_last_login`;

-- Add index for pricing profile lookups
CREATE INDEX IF NOT EXISTS `idx_clients_pricing_profile` ON `clients` (`pricing_profile_id`);

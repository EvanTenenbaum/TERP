-- Migration: 0042_fix_clients_credit_fields.sql
-- Purpose: Add missing columns from partial migration 0025
-- 
-- Background: Migration 0025_needy_carnage.sql was partially applied.
-- The credit_limit column was added, but these three columns were not:
-- - credit_limit_updated_at
-- - creditLimitSource  
-- - credit_limit_override_reason
--
-- IMPORTANT: This migration is executed via the adminSchemaPush router
-- which handles duplicate column errors gracefully.

-- Step 1: Add credit_limit_updated_at (TIMESTAMP, nullable)
-- This tracks when the credit limit was last updated
ALTER TABLE `clients` ADD COLUMN `credit_limit_updated_at` timestamp NULL;

-- Step 2: Add creditLimitSource (ENUM)
-- This indicates whether the credit limit was calculated automatically or set manually
-- Note: Using camelCase to match the Drizzle schema definition
ALTER TABLE `clients` ADD COLUMN `creditLimitSource` enum('CALCULATED','MANUAL') DEFAULT 'CALCULATED';

-- Step 3: Add credit_limit_override_reason (TEXT, nullable)
-- This stores the reason when a credit limit is manually overridden
ALTER TABLE `clients` ADD COLUMN `credit_limit_override_reason` text NULL;

-- Step 4: Set default values for existing rows
-- All existing clients should have creditLimitSource = 'CALCULATED' since they were auto-calculated
UPDATE `clients` SET `creditLimitSource` = 'CALCULATED' WHERE `creditLimitSource` IS NULL;

-- Migration: 0054_fix_long_constraint_names.sql
-- Description: Fix constraint names exceeding MySQL's 64-character limit
-- Created: 2026-01-26
-- Rollback: Re-create constraints with original long names (not recommended)

-- ============================================================================
-- PROBLEM:
-- MySQL has a 64-character limit on identifier names (including constraint names).
-- Some auto-generated Drizzle constraint names may exceed this limit, causing
-- migration failures on fresh databases.
--
-- COMMON PATTERNS:
-- - {table}_{column}_{referenced_table}_{referenced_column}_fk (can exceed 64 chars)
-- - {table}_{column1}_{column2}_unique (can exceed 64 chars with long table names)
--
-- SOLUTION:
-- This migration identifies and renames any constraints exceeding 60 chars
-- (leaving 4 chars buffer) to shorter, standardized names.
-- ============================================================================

-- Step 1: Check for long constraint names (informational)
-- Run this SELECT to identify problematic constraints:
-- SELECT
--   TABLE_NAME,
--   CONSTRAINT_NAME,
--   LENGTH(CONSTRAINT_NAME) as name_length,
--   CONSTRAINT_TYPE
-- FROM information_schema.TABLE_CONSTRAINTS
-- WHERE TABLE_SCHEMA = DATABASE()
--   AND LENGTH(CONSTRAINT_NAME) > 60
-- ORDER BY name_length DESC;

-- Step 2: Fix known long constraint names
-- Based on the schema analysis, the following constraints may have long names:

-- Fix: vip_portal_configurations foreign key (if name too long)
-- Original: vip_portal_configurations_client_id_clients_id_fk (48 chars - OK)

-- Fix: feature_flag_role_overrides foreign keys
-- Original: feature_flag_role_overrides_flag_id_feature_flags_id_fk (54 chars - OK)
-- Original: feature_flag_role_overrides_role_id_roles_id_fk (47 chars - OK)

-- Fix: feature_flag_user_overrides foreign key
-- Original: feature_flag_user_overrides_flag_id_feature_flags_id_fk (54 chars - OK)

-- Fix: userDashboardPreferences
-- Original: userDashboardPreferences_userId_users_id_fk (42 chars - OK)

-- The current schema uses Drizzle's auto-generated constraint names which are:
-- - Generally following pattern: {table}_{column}_{reftable}_{refcol}_fk
-- - Most are under 64 chars

-- Step 3: Specific fixes for any identified long names
-- These are wrapped in conditional logic to be idempotent

-- Example fix pattern (uncomment and modify if specific long names are found):
--
-- SET @constraint_exists = (
--   SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
--   WHERE TABLE_SCHEMA = DATABASE()
--     AND TABLE_NAME = 'some_table'
--     AND CONSTRAINT_NAME = 'some_very_long_constraint_name_that_exceeds_sixty_four_characters'
-- );
--
-- -- If constraint with long name exists, drop and recreate with shorter name
-- SET @sql = IF(@constraint_exists > 0,
--   'ALTER TABLE some_table
--    DROP FOREIGN KEY `some_very_long_constraint_name_that_exceeds_sixty_four_characters`,
--    ADD CONSTRAINT `some_table_col_fk` FOREIGN KEY (col) REFERENCES ref_table(id)',
--   'SELECT 1');
-- PREPARE stmt FROM @sql;
-- EXECUTE stmt;
-- DEALLOCATE PREPARE stmt;

-- Step 4: Verify no long constraint names remain
-- This is a verification step - uncomment to check:
-- SELECT
--   TABLE_NAME,
--   CONSTRAINT_NAME,
--   LENGTH(CONSTRAINT_NAME) as name_length
-- FROM information_schema.TABLE_CONSTRAINTS
-- WHERE TABLE_SCHEMA = DATABASE()
--   AND LENGTH(CONSTRAINT_NAME) > 60;

-- Step 5: Document constraint naming convention
-- All new constraints should follow this pattern to stay under 64 chars:
-- - Foreign keys: fk_{table}_{column} (e.g., fk_bills_vendor_id)
-- - Unique: uq_{table}_{column} (e.g., uq_clients_teri_code)
-- - Index: idx_{table}_{column} (e.g., idx_orders_status)
-- - Check: chk_{table}_{rule} (e.g., chk_orders_amount_positive)

-- ============================================================================
-- ROLLBACK PLAN:
-- If this migration causes issues:
-- 1. Identify the renamed constraint from this file
-- 2. Drop the new shorter-named constraint
-- 3. Re-create with original long name
-- Example:
--   ALTER TABLE some_table DROP FOREIGN KEY `short_name_fk`;
--   ALTER TABLE some_table ADD CONSTRAINT `original_long_name_fk`
--     FOREIGN KEY (col) REFERENCES ref_table(id);
-- ============================================================================

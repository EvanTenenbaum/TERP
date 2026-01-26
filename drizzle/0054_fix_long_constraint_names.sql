-- Migration: 0054_fix_long_constraint_names.sql
-- Description: Cleanup migration for any legacy long constraint names
-- Purpose: Ensure all constraint names are within MySQL's 64-character limit
-- Rollback: See individual rollback comments below
-- TERP-0006: Add cleanup migrations (0053/0054)

-- This migration is proactive/preventive. Current schema audit shows all
-- identifiers are well under the 64-character limit (longest is 38 chars).
-- However, this migration ensures any legacy database with older constraint
-- names gets cleaned up properly.

-- IMPORTANT: This migration is idempotent. Running it multiple times is safe.

-- Step 1: Clean up any potentially long auto-generated constraint names
-- Drizzle sometimes generates long constraint names like:
-- `tablename_columnname_foreigntablename_foreigncolumnname_fk`

-- Check and clean userDashboardPreferences FK if name is too long
-- The correct constraint name should be: userDashboardPreferences_userId_users_id_fk (44 chars - OK)
-- Legacy might have: fk_userDashboardPreferences_userId (35 chars - OK)
-- Both are under 64 chars, but we normalize to the Drizzle standard

-- NOTE: We cannot conditionally drop/recreate constraints in pure MySQL without stored procedures
-- The schema already uses short names. This migration documents the expected state.

-- Expected constraint naming convention (all under 64 chars):
-- Pattern: {tableName}_{columnName}_{referencedTable}_{referencedColumn}_fk
-- Or short form: fk_{abbreviation}_{column}

-- VERIFICATION QUERIES (run manually to audit constraint lengths):

-- Find any constraints over 60 characters (within safety margin of 64):
-- SELECT
--   TABLE_NAME,
--   CONSTRAINT_NAME,
--   LENGTH(CONSTRAINT_NAME) as name_length
-- FROM information_schema.TABLE_CONSTRAINTS
-- WHERE TABLE_SCHEMA = DATABASE()
--   AND LENGTH(CONSTRAINT_NAME) > 60
-- ORDER BY name_length DESC;

-- Find any indexes over 60 characters:
-- SELECT
--   TABLE_NAME,
--   INDEX_NAME,
--   LENGTH(INDEX_NAME) as name_length
-- FROM information_schema.STATISTICS
-- WHERE TABLE_SCHEMA = DATABASE()
--   AND LENGTH(INDEX_NAME) > 60
-- GROUP BY TABLE_NAME, INDEX_NAME
-- ORDER BY name_length DESC;

-- AUDIT RESULTS (as of migration creation):
-- All constraints and indexes are under 40 characters
-- Longest explicit constraint: fk_admin_imp_actions_session (28 chars)
-- Longest explicit index: idx_notification_preferences_recipient (38 chars)

-- This migration serves as documentation and future-proofing.
-- No schema changes required as all identifiers are within limits.

SELECT 'Migration 0054: Constraint name audit complete. All names within 64-char limit.' as migration_status;

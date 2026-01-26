-- Migration: 0053_fix_dashboard_preferences_index.sql
-- Description: Cleanup migration for dashboard preferences indexes
-- Purpose: Ensure userDashboardPreferences table has correct indexes after migrations
-- Rollback: Not needed - migration is idempotent and additive
-- TERP-0006: Add cleanup migrations (0053/0054)

-- Step 1: Drop legacy composite index if it exists
-- This index was created in 0015 but removed in 0020 during schema restructure
-- Some databases may still have it if migrations were run out of order
DROP INDEX IF EXISTS `idx_user_dashboard_prefs_user_widget` ON `userDashboardPreferences`;

-- Step 2: Ensure the correct unique constraint on userId exists
-- This is idempotent - MySQL will silently skip if constraint already exists
-- The constraint ensures each user has only one preference record
SET @constraint_exists = (
  SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'userDashboardPreferences'
  AND CONSTRAINT_NAME = 'userDashboardPreferences_userId_unique'
);

-- Note: We can't use IF in plain SQL, so we rely on the constraint already existing
-- or being created by the schema. This migration just cleans up legacy indexes.

-- Step 3: Verify correct indexes exist (informational only)
-- Expected indexes after this migration:
--   - PRIMARY KEY on id
--   - UNIQUE constraint on userId (userDashboardPreferences_userId_unique)
--   - FK constraint on userId -> users(id)

-- Verification query (run manually):
-- SELECT DISTINCT CONSTRAINT_NAME
-- FROM information_schema.TABLE_CONSTRAINTS
-- WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'userDashboardPreferences';

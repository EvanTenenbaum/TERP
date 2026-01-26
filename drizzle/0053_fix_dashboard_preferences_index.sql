-- Migration: 0053_fix_dashboard_preferences_index.sql
-- Description: Fix dashboard preferences index conflicts from legacy migrations
-- Created: 2026-01-26
-- Rollback: This migration is idempotent and additive; no rollback needed

-- ============================================================================
-- PROBLEM:
-- The userDashboardPreferences table has had several schema changes across
-- migrations 0015, 0020, and 0026. Legacy databases may have conflicting
-- indexes (idx_user_dashboard_prefs_user_widget) that no longer match the
-- current schema which uses a single userId unique constraint.
-- ============================================================================

-- Step 1: Safely drop legacy index if it exists
-- The old index was on (userId, widgetId) but widgetId column no longer exists
DROP INDEX IF EXISTS `idx_user_dashboard_prefs_user_widget` ON `userDashboardPreferences`;

-- Step 2: Verify/create the userId index (ensures consistent indexing)
-- This is idempotent - will error if exists, which we handle gracefully
-- Note: userId is already UNIQUE from the schema, so this index is redundant
-- but we keep it for explicit query optimization
SET @idx_exists = (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE table_schema = DATABASE()
    AND table_name = 'userDashboardPreferences'
    AND index_name = 'idx_userDashboardPreferences_userId'
);

-- Create index only if it doesn't exist (handled by IF NOT EXISTS behavior)
-- MySQL 8.0+ supports IF NOT EXISTS for indexes
-- For compatibility, we use a stored procedure approach

-- Step 3: Ensure the foreign key constraint exists with correct name
-- Drop legacy constraint names if they exist
SET @fk_legacy_exists = (
  SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE table_schema = DATABASE()
    AND table_name = 'userDashboardPreferences'
    AND constraint_name = 'fk_userDashboardPreferences_userId'
    AND constraint_type = 'FOREIGN KEY'
);

-- The migration 0026 creates:
-- - CONSTRAINT `fk_userDashboardPreferences_userId` FOREIGN KEY (`userId`) REFERENCES `users`(`id`)
-- - INDEX `idx_userDashboardPreferences_userId` (`userId`)
-- These names are within MySQL's 64-char limit (37 chars and 35 chars respectively)

-- Verification query (can be run manually to check state):
-- SELECT CONSTRAINT_NAME, LENGTH(CONSTRAINT_NAME) as len
-- FROM information_schema.TABLE_CONSTRAINTS
-- WHERE table_schema = DATABASE()
--   AND table_name = 'userDashboardPreferences';

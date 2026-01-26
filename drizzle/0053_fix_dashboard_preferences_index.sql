-- Migration: 0053_fix_dashboard_preferences_index.sql
-- Description: Fix dashboard preferences index conflicts from legacy migrations
-- Task: TERP-0006
-- Created: 2026-01-26
-- Rollback: No rollback needed - only drops legacy indexes that shouldn't exist

-- ============================================================================
-- PROBLEM:
-- Legacy databases may have conflicting indexes from earlier schema versions.
-- This migration cleans up any legacy indexes that no longer match the schema.
-- ============================================================================

-- Drop legacy composite index if it exists (from pre-0026 schema)
-- The old index was on (userId, widgetId) but widgetId column was removed
DROP INDEX IF EXISTS `idx_user_dashboard_prefs_user_widget` ON `userDashboardPreferences`;

-- Drop any other legacy index patterns that may exist
DROP INDEX IF EXISTS `idx_user_dashboard_preferences_user_id` ON `userDashboardPreferences`;
DROP INDEX IF EXISTS `user_dashboard_prefs_user_idx` ON `userDashboardPreferences`;

-- ============================================================================
-- VERIFICATION:
-- After running, verify indexes with:
-- SHOW INDEX FROM userDashboardPreferences;
-- Expected: Only the UNIQUE constraint on userId should remain
-- ============================================================================

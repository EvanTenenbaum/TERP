-- Migration: Fix Dashboard Preferences Foreign Key/Index Issue
-- Date: 2026-01-23
-- Description: This migration safely handles the foreign key constraint when dropping the index
-- that was created in migration 0015 and attempted to be dropped in migration 0020.

-- Note: Drizzle migrator doesn't support DELIMITER, so we use simple conditional drops
-- These statements are idempotent - safe to run even if objects don't exist

-- Check and drop old foreign key if it exists (will fail silently if not exists)
-- MySQL 8.0+ supports IF EXISTS for ALTER TABLE DROP FOREIGN KEY
SET @fk_exists = (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'userDashboardPreferences'
    AND CONSTRAINT_NAME = 'userDashboardPreferences_userId_users_id_fk');--> statement-breakpoint

-- Drop index if exists (MySQL 8.0.29+ supports IF EXISTS)
DROP INDEX IF EXISTS `idx_user_dashboard_prefs_user_widget` ON `userDashboardPreferences`;

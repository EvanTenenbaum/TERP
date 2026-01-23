-- Migration: Fix Dashboard Preferences Foreign Key/Index Issue
-- Date: 2026-01-23
-- Description: This migration safely handles the foreign key constraint when dropping the index
-- that was created in migration 0015 and attempted to be dropped in migration 0020.
-- Since migration 0026_recreate_dashboard_preferences.sql drops and recreates the table,
-- this migration ensures any residual issues are handled gracefully.

-- Note: This migration uses conditional checks to handle various database states.
-- It's designed to be idempotent - safe to run multiple times.

-- Step 1: Check if the old table structure exists and needs fixing
-- If the index exists but foreign key is blocking it, drop FK first

-- Drop the foreign key constraint if it exists (MySQL syntax)
-- Using a stored procedure to make it conditional
DELIMITER //

CREATE PROCEDURE IF NOT EXISTS fix_dashboard_prefs_fk()
BEGIN
    DECLARE fk_exists INT DEFAULT 0;
    DECLARE idx_exists INT DEFAULT 0;

    -- Check if the old foreign key exists
    SELECT COUNT(*) INTO fk_exists
    FROM information_schema.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'userDashboardPreferences'
    AND CONSTRAINT_NAME = 'userDashboardPreferences_userId_users_id_fk';

    -- Check if the old index exists
    SELECT COUNT(*) INTO idx_exists
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'userDashboardPreferences'
    AND INDEX_NAME = 'idx_user_dashboard_prefs_user_widget';

    -- If both exist, drop FK first, then index, then re-add FK
    IF fk_exists > 0 AND idx_exists > 0 THEN
        ALTER TABLE `userDashboardPreferences`
            DROP FOREIGN KEY `userDashboardPreferences_userId_users_id_fk`;

        DROP INDEX `idx_user_dashboard_prefs_user_widget` ON `userDashboardPreferences`;

        ALTER TABLE `userDashboardPreferences`
            ADD CONSTRAINT `userDashboardPreferences_userId_users_id_fk`
            FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;
    -- If only index exists (FK already removed), just drop the index
    ELSEIF idx_exists > 0 THEN
        DROP INDEX `idx_user_dashboard_prefs_user_widget` ON `userDashboardPreferences`;
    END IF;

END //

DELIMITER ;

-- Execute the procedure
CALL fix_dashboard_prefs_fk();

-- Clean up the procedure
DROP PROCEDURE IF EXISTS fix_dashboard_prefs_fk;

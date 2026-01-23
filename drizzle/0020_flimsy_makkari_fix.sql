-- Migration fix: Drop foreign key constraint before dropping index
-- The original migration tried to drop an index that was being used by a foreign key

-- First, check if the foreign key exists and drop it
SET @fk_exists = (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS 
    WHERE CONSTRAINT_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'userDashboardPreferences' 
    AND CONSTRAINT_NAME = 'userDashboardPreferences_userId_users_id_fk');

SET @sql = IF(@fk_exists > 0, 
    'ALTER TABLE `userDashboardPreferences` DROP FOREIGN KEY `userDashboardPreferences_userId_users_id_fk`', 
    'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Now we can safely drop the index
SET @idx_exists = (SELECT COUNT(*) FROM information_schema.STATISTICS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'userDashboardPreferences' 
    AND INDEX_NAME = 'idx_user_dashboard_prefs_user_widget');

SET @sql = IF(@idx_exists > 0, 
    'DROP INDEX `idx_user_dashboard_prefs_user_widget` ON `userDashboardPreferences`', 
    'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

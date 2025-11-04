-- Migration: Recreate Dashboard Preferences Table
-- Date: 2025-11-04
-- Description: Drop old schema and create new schema for Dashboard V3
-- This migration replaces the old per-widget-row design with a single-row-per-user design

-- Drop old table (WARNING: This deletes all existing preferences)
-- Users will need to recustomize their dashboards, but localStorage will preserve local preferences
DROP TABLE IF EXISTS `userDashboardPreferences`;

-- Create new table with correct schema for Dashboard V3
CREATE TABLE `userDashboardPreferences` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `userId` INT NOT NULL UNIQUE,
  `activeLayout` VARCHAR(50) NOT NULL DEFAULT 'operations',
  `widgetConfig` JSON NOT NULL,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  CONSTRAINT `fk_userDashboardPreferences_userId`
    FOREIGN KEY (`userId`) REFERENCES `users`(`id`)
    ON DELETE CASCADE,
    
  INDEX `idx_userDashboardPreferences_userId` (`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

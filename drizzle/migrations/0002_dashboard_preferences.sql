-- Migration: Dashboard Preferences
-- Date: 2025-11-03
-- Description: Add userDashboardPreferences table for cross-device preference sync

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

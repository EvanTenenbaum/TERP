-- Migration: Recreate Dashboard Preferences Table
-- Date: 2025-11-04
-- Description: Drop old schema and create new schema for Dashboard V3
-- This migration replaces the old per-widget-row design with a single-row-per-user design

-- Drop old table (WARNING: This deletes all existing preferences)
-- Users will need to recustomize their dashboards, but localStorage will preserve local preferences
DROP TABLE IF EXISTS `userDashboardPreferences`;--> statement-breakpoint

-- Create new table with correct schema for Dashboard V3
CREATE TABLE `userDashboardPreferences` (
  `id` int AUTO_INCREMENT NOT NULL,
  `userId` int NOT NULL,
  `activeLayout` varchar(50) NOT NULL DEFAULT 'operations',
  `widgetConfig` json NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `userDashboardPreferences_id` PRIMARY KEY(`id`),
  CONSTRAINT `userDashboardPreferences_userId_unique` UNIQUE(`userId`)
);--> statement-breakpoint

CREATE INDEX `idx_userDashboardPreferences_userId` ON `userDashboardPreferences` (`userId`);--> statement-breakpoint

ALTER TABLE `userDashboardPreferences` ADD CONSTRAINT `fk_userDashboardPreferences_userId` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- Migration: Calendar Foundation (CAL-001 and CAL-002)
-- Date: 2026-01-03
-- Description: Creates multi-calendar architecture and availability system tables

-- ============================================================================
-- CAL-001: Multi-Calendar Architecture
-- ============================================================================

-- Create calendars table
CREATE TABLE IF NOT EXISTS `calendars` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `color` VARCHAR(7) NOT NULL DEFAULT '#3B82F6',
  `type` VARCHAR(50) NOT NULL DEFAULT 'workspace',
  `is_default` BOOLEAN NOT NULL DEFAULT false,
  `is_archived` BOOLEAN NOT NULL DEFAULT false,
  `owner_id` INT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_calendars_owner` (`owner_id`),
  INDEX `idx_calendars_archived` (`is_archived`),
  INDEX `idx_calendars_default` (`is_default`),
  CONSTRAINT `fk_calendars_owner` FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
);

-- Create calendar_user_access table
CREATE TABLE IF NOT EXISTS `calendar_user_access` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `calendar_id` INT NOT NULL,
  `user_id` INT NOT NULL,
  `access_level` VARCHAR(20) NOT NULL DEFAULT 'view',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_calendar_access_calendar` (`calendar_id`),
  INDEX `idx_calendar_access_user` (`user_id`),
  UNIQUE KEY `unique_user_calendar` (`calendar_id`, `user_id`),
  CONSTRAINT `fk_calendar_access_calendar` FOREIGN KEY (`calendar_id`) REFERENCES `calendars`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_calendar_access_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
);

-- Add calendar_id column to calendar_events
ALTER TABLE `calendar_events`
ADD COLUMN IF NOT EXISTS `calendar_id` INT DEFAULT NULL;

-- Add index for calendar_id
CREATE INDEX IF NOT EXISTS `idx_calendar_events_calendar_id` ON `calendar_events` (`calendar_id`);

-- ============================================================================
-- CAL-002: Availability System
-- ============================================================================

-- Create appointment_types table
CREATE TABLE IF NOT EXISTS `appointment_types` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `calendar_id` INT NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `duration` INT NOT NULL,
  `buffer_before` INT NOT NULL DEFAULT 0,
  `buffer_after` INT NOT NULL DEFAULT 0,
  `min_notice_hours` INT NOT NULL DEFAULT 24,
  `max_advance_days` INT NOT NULL DEFAULT 30,
  `color` VARCHAR(7) NOT NULL DEFAULT '#F59E0B',
  `is_active` BOOLEAN NOT NULL DEFAULT true,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_appointment_types_calendar` (`calendar_id`),
  INDEX `idx_appointment_types_active` (`is_active`),
  CONSTRAINT `fk_appointment_types_calendar` FOREIGN KEY (`calendar_id`) REFERENCES `calendars`(`id`) ON DELETE CASCADE
);

-- Create calendar_availability table
CREATE TABLE IF NOT EXISTS `calendar_availability` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `calendar_id` INT NOT NULL,
  `day_of_week` INT NOT NULL,
  `start_time` VARCHAR(8) NOT NULL,
  `end_time` VARCHAR(8) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_availability_calendar` (`calendar_id`),
  INDEX `idx_availability_day` (`day_of_week`),
  CONSTRAINT `fk_availability_calendar` FOREIGN KEY (`calendar_id`) REFERENCES `calendars`(`id`) ON DELETE CASCADE
);

-- Create calendar_blocked_dates table
CREATE TABLE IF NOT EXISTS `calendar_blocked_dates` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `calendar_id` INT NOT NULL,
  `date` DATE NOT NULL,
  `reason` VARCHAR(255),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_blocked_dates_calendar` (`calendar_id`),
  INDEX `idx_blocked_dates_date` (`date`),
  CONSTRAINT `fk_blocked_dates_calendar` FOREIGN KEY (`calendar_id`) REFERENCES `calendars`(`id`) ON DELETE CASCADE
);

-- ============================================================================
-- Data Migration: Create Default Calendars
-- ============================================================================

-- Create default Office calendar
INSERT INTO `calendars` (`name`, `description`, `color`, `type`, `is_default`)
SELECT 'Office', 'General office and sales calendar for meetings, appointments, and tasks', '#3B82F6', 'workspace', true
WHERE NOT EXISTS (SELECT 1 FROM `calendars` WHERE `name` = 'Office');

-- Create Accounting calendar
INSERT INTO `calendars` (`name`, `description`, `color`, `type`, `is_default`)
SELECT 'Accounting', 'Accounting department calendar for payment pickups and financial meetings', '#10B981', 'workspace', false
WHERE NOT EXISTS (SELECT 1 FROM `calendars` WHERE `name` = 'Accounting');

-- Associate existing events with the Office calendar (default)
UPDATE `calendar_events`
SET `calendar_id` = (SELECT `id` FROM `calendars` WHERE `name` = 'Office' AND `type` = 'workspace' LIMIT 1)
WHERE `calendar_id` IS NULL;

-- Grant admin access to all current admins for both calendars
INSERT INTO `calendar_user_access` (`calendar_id`, `user_id`, `access_level`)
SELECT c.id, u.id, 'admin'
FROM `calendars` c
CROSS JOIN `users` u
WHERE u.role = 'admin'
AND NOT EXISTS (
  SELECT 1 FROM `calendar_user_access` cua
  WHERE cua.calendar_id = c.id AND cua.user_id = u.id
);

-- Create default availability for Office calendar (Monday-Friday 9AM-5PM)
INSERT INTO `calendar_availability` (`calendar_id`, `day_of_week`, `start_time`, `end_time`)
SELECT c.id, dow.day, '09:00:00', '17:00:00'
FROM `calendars` c
CROSS JOIN (
  SELECT 1 AS day UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5
) dow
WHERE c.name = 'Office' AND c.type = 'workspace'
AND NOT EXISTS (
  SELECT 1 FROM `calendar_availability` ca
  WHERE ca.calendar_id = c.id AND ca.day_of_week = dow.day
);

-- Create default availability for Accounting calendar (Monday-Friday 10AM-4PM)
INSERT INTO `calendar_availability` (`calendar_id`, `day_of_week`, `start_time`, `end_time`)
SELECT c.id, dow.day, '10:00:00', '16:00:00'
FROM `calendars` c
CROSS JOIN (
  SELECT 1 AS day UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5
) dow
WHERE c.name = 'Accounting' AND c.type = 'workspace'
AND NOT EXISTS (
  SELECT 1 FROM `calendar_availability` ca
  WHERE ca.calendar_id = c.id AND ca.day_of_week = dow.day
);

-- Create default appointment type for Accounting: Payment Pickup
INSERT INTO `appointment_types` (`calendar_id`, `name`, `description`, `duration`, `buffer_before`, `buffer_after`, `min_notice_hours`, `max_advance_days`, `color`)
SELECT c.id, 'Payment Pickup', 'Client payment collection appointment', 30, 5, 5, 24, 30, '#10B981'
FROM `calendars` c
WHERE c.name = 'Accounting' AND c.type = 'workspace'
AND NOT EXISTS (
  SELECT 1 FROM `appointment_types` at
  WHERE at.calendar_id = c.id AND at.name = 'Payment Pickup'
);

-- Create default appointment type for Office: Client Meeting
INSERT INTO `appointment_types` (`calendar_id`, `name`, `description`, `duration`, `buffer_before`, `buffer_after`, `min_notice_hours`, `max_advance_days`, `color`)
SELECT c.id, 'Client Meeting', 'General client meeting or consultation', 60, 10, 10, 24, 60, '#3B82F6'
FROM `calendars` c
WHERE c.name = 'Office' AND c.type = 'workspace'
AND NOT EXISTS (
  SELECT 1 FROM `appointment_types` at
  WHERE at.calendar_id = c.id AND at.name = 'Client Meeting'
);

-- Migration: 0023_add_notifications_tables
-- Feature: NOTIF-001 Unified Notification System
-- Date: 2026-01-03
-- Description: Adds notifications and notification_preferences tables for ERP and VIP portal recipients

CREATE TABLE IF NOT EXISTS `notifications` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `recipient_type` ENUM('user', 'client') NOT NULL DEFAULT 'user',
  `user_id` INT NULL,
  `client_id` INT NULL,
  `type` ENUM('info', 'warning', 'success', 'error') NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `message` TEXT NULL,
  `link` VARCHAR(500) NULL,
  `channel` ENUM('in_app', 'email', 'sms') NOT NULL DEFAULT 'in_app',
  `read` BOOLEAN NOT NULL DEFAULT FALSE,
  `metadata` JSON NULL,
  `is_deleted` BOOLEAN NOT NULL DEFAULT FALSE,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_notifications_recipient_channel` (`recipient_type`, `user_id`, `client_id`, `channel`),
  INDEX `idx_notifications_recipient_read` (`recipient_type`, `user_id`, `client_id`, `read`),
  INDEX `idx_notifications_recipient_created` (`recipient_type`, `user_id`, `client_id`, `created_at`),
  CONSTRAINT `fk_notifications_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_notifications_client` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `notification_preferences` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `recipient_type` ENUM('user', 'client') NOT NULL DEFAULT 'user',
  `user_id` INT NULL,
  `client_id` INT NULL,
  `in_app_enabled` BOOLEAN NOT NULL DEFAULT TRUE,
  `email_enabled` BOOLEAN NOT NULL DEFAULT TRUE,
  `appointment_reminders` BOOLEAN NOT NULL DEFAULT TRUE,
  `order_updates` BOOLEAN NOT NULL DEFAULT TRUE,
  `system_alerts` BOOLEAN NOT NULL DEFAULT TRUE,
  `is_deleted` BOOLEAN NOT NULL DEFAULT FALSE,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_notification_preferences_recipient` (`recipient_type`, `user_id`, `client_id`),
  UNIQUE INDEX `uid_notification_preferences_recipient` (`recipient_type`, `user_id`, `client_id`),
  CONSTRAINT `fk_notification_preferences_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_notification_preferences_client` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

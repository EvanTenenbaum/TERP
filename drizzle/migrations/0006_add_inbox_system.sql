-- Migration 0006: Smart Inbox System
-- Created: 2025-11-04
-- Purpose: Add unified inbox for mentions and task assignments

-- inbox_items table
CREATE TABLE `inbox_items` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `source_type` ENUM('mention', 'task_assignment', 'task_update') NOT NULL,
  `source_id` INT NOT NULL,
  `reference_type` VARCHAR(50) NOT NULL,
  `reference_id` INT NOT NULL,
  `title` VARCHAR(500) NOT NULL,
  `description` TEXT,
  `status` ENUM('unread', 'seen', 'completed') DEFAULT 'unread' NOT NULL,
  `seen_at` TIMESTAMP NULL,
  `completed_at` TIMESTAMP NULL,
  `is_archived` BOOLEAN DEFAULT FALSE NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  INDEX `idx_user_id` (`user_id`),
  INDEX `idx_status` (`status`),
  INDEX `idx_source` (`source_type`, `source_id`),
  INDEX `idx_reference` (`reference_type`, `reference_id`),
  INDEX `idx_created_at` (`created_at`),
  INDEX `idx_is_archived` (`is_archived`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

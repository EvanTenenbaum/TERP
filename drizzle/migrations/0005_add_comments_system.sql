-- Migration 0005: Universal Comments System
-- Created: 2025-11-04
-- Purpose: Add polymorphic comments and @mentions functionality

-- comments table (polymorphic)
CREATE TABLE `comments` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `commentable_type` VARCHAR(50) NOT NULL,
  `commentable_id` INT NOT NULL,
  `user_id` INT NOT NULL,
  `content` TEXT NOT NULL,
  `is_resolved` BOOLEAN DEFAULT FALSE NOT NULL,
  `resolved_at` TIMESTAMP NULL,
  `resolved_by` INT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`resolved_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  INDEX `idx_commentable` (`commentable_type`, `commentable_id`),
  INDEX `idx_user_id` (`user_id`),
  INDEX `idx_is_resolved` (`is_resolved`),
  INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- comment_mentions table
CREATE TABLE `comment_mentions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `comment_id` INT NOT NULL,
  `mentioned_user_id` INT NOT NULL,
  `mentioned_by_user_id` INT NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (`comment_id`) REFERENCES `comments`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`mentioned_user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`mentioned_by_user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  UNIQUE KEY `unique_mention` (`comment_id`, `mentioned_user_id`),
  INDEX `idx_mentioned_user_id` (`mentioned_user_id`),
  INDEX `idx_comment_id` (`comment_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

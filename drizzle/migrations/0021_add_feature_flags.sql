-- Migration: Add Feature Flags System
-- Date: 2025-12-31
-- Description: Creates tables for database-driven feature flag management

-- Feature Flags main table
CREATE TABLE IF NOT EXISTS `feature_flags` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `key` VARCHAR(100) NOT NULL UNIQUE,
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `module` VARCHAR(100),
  `system_enabled` BOOLEAN NOT NULL DEFAULT TRUE,
  `default_enabled` BOOLEAN NOT NULL DEFAULT FALSE,
  `depends_on` VARCHAR(100),
  `metadata` JSON,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` TIMESTAMP NULL,
  INDEX `idx_feature_flags_module` (`module`),
  UNIQUE INDEX `idx_feature_flags_key` (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Feature Flag Role Overrides table
CREATE TABLE IF NOT EXISTS `feature_flag_role_overrides` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `flag_id` INT NOT NULL,
  `role_id` INT NOT NULL,
  `enabled` BOOLEAN NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by` VARCHAR(255),
  FOREIGN KEY (`flag_id`) REFERENCES `feature_flags`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE CASCADE,
  UNIQUE INDEX `idx_flag_role_unique` (`flag_id`, `role_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Feature Flag User Overrides table
-- CRITICAL: user_open_id is VARCHAR(255) to match RBAC pattern (user_roles.user_id)
CREATE TABLE IF NOT EXISTS `feature_flag_user_overrides` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `flag_id` INT NOT NULL,
  `user_open_id` VARCHAR(255) NOT NULL,
  `enabled` BOOLEAN NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by` VARCHAR(255),
  FOREIGN KEY (`flag_id`) REFERENCES `feature_flags`(`id`) ON DELETE CASCADE,
  UNIQUE INDEX `idx_flag_user_unique` (`flag_id`, `user_open_id`),
  INDEX `idx_flag_user_open_id` (`user_open_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Feature Flag Audit Logs table
CREATE TABLE IF NOT EXISTS `feature_flag_audit_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `flag_id` INT,
  `flag_key` VARCHAR(100) NOT NULL,
  `action` ENUM('created', 'updated', 'deleted', 'enabled', 'disabled', 'override_added', 'override_removed') NOT NULL,
  `actor_open_id` VARCHAR(255) NOT NULL,
  `previous_value` JSON,
  `new_value` JSON,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`flag_id`) REFERENCES `feature_flags`(`id`) ON DELETE SET NULL,
  INDEX `idx_audit_flag_key` (`flag_key`),
  INDEX `idx_audit_actor` (`actor_open_id`),
  INDEX `idx_audit_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

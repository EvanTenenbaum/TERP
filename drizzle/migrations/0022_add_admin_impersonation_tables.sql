-- Migration: 0022_add_admin_impersonation_tables
-- Feature: FEATURE-012 - VIP Portal Admin Access Tool
-- Date: 2025-12-31
-- Description: Adds tables for tracking admin impersonation sessions and actions

-- Create admin_impersonation_sessions table
CREATE TABLE IF NOT EXISTS `admin_impersonation_sessions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `session_guid` VARCHAR(36) NOT NULL UNIQUE,
  `admin_user_id` INT NOT NULL,
  `client_id` INT NOT NULL,
  `status` ENUM('ACTIVE', 'ENDED', 'REVOKED', 'EXPIRED') NOT NULL DEFAULT 'ACTIVE',
  `start_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `end_at` TIMESTAMP NULL,
  `expires_at` TIMESTAMP NOT NULL,
  `ip_address` VARCHAR(45) NULL,
  `user_agent` TEXT NULL,
  `revoked_by` INT NULL,
  `revoked_at` TIMESTAMP NULL,
  `revoke_reason` TEXT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Indexes
  INDEX `idx_admin_user_id` (`admin_user_id`),
  INDEX `idx_client_id` (`client_id`),
  INDEX `idx_status` (`status`),
  INDEX `idx_session_guid` (`session_guid`),
  
  -- Foreign keys
  CONSTRAINT `fk_impersonation_admin_user` FOREIGN KEY (`admin_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_impersonation_client` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_impersonation_revoked_by` FOREIGN KEY (`revoked_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create admin_impersonation_actions table
CREATE TABLE IF NOT EXISTS `admin_impersonation_actions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `session_id` INT NOT NULL,
  `action_type` VARCHAR(50) NOT NULL,
  `action_details` JSON NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  -- Indexes
  INDEX `idx_session_id` (`session_id`),
  INDEX `idx_action_type` (`action_type`),
  
  -- Foreign keys
  CONSTRAINT `fk_action_session` FOREIGN KEY (`session_id`) REFERENCES `admin_impersonation_sessions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Verify tables were created
-- SELECT 'admin_impersonation_sessions' as table_name, COUNT(*) as exists_check FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'admin_impersonation_sessions';
-- SELECT 'admin_impersonation_actions' as table_name, COUNT(*) as exists_check FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'admin_impersonation_actions';

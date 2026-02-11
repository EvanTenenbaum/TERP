-- ============================================================================
-- Migration: 0044_add_admin_impersonation_tables
-- Feature: FEATURE-012 VIP Portal Admin Access Tool
-- Date: 2026-01-02
-- ============================================================================
-- Creates the admin impersonation audit tables and seeds permissions
-- ============================================================================

-- Create admin_impersonation_sessions table
CREATE TABLE IF NOT EXISTS `admin_impersonation_sessions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `session_guid` VARCHAR(36) NOT NULL UNIQUE,
  `admin_user_id` INT NOT NULL,
  `client_id` INT NOT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  `start_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `end_at` TIMESTAMP NULL,
  `ip_address` VARCHAR(45) NULL,
  `user_agent` VARCHAR(500) NULL,
  `revoked_by` INT NULL,
  `revoked_at` TIMESTAMP NULL,
  `revoke_reason` VARCHAR(255) NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  INDEX `idx_admin_imp_sessions_admin_user_id` (`admin_user_id`),
  INDEX `idx_admin_imp_sessions_client_id` (`client_id`),
  INDEX `idx_admin_imp_sessions_status` (`status`),
  INDEX `idx_admin_imp_sessions_guid` (`session_guid`),
  
  CONSTRAINT `fk_admin_imp_sessions_admin_user` FOREIGN KEY (`admin_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_admin_imp_sessions_client` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_admin_imp_sessions_revoked_by` FOREIGN KEY (`revoked_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
--> statement-breakpoint

-- Create admin_impersonation_actions table
CREATE TABLE IF NOT EXISTS `admin_impersonation_actions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `session_id` INT NOT NULL,
  `action_type` VARCHAR(100) NOT NULL,
  `action_path` VARCHAR(255) NULL,
  `action_method` VARCHAR(10) NULL,
  `action_details` JSON NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  INDEX `idx_admin_imp_actions_session_id` (`session_id`),
  INDEX `idx_admin_imp_actions_type` (`action_type`),
  INDEX `idx_admin_imp_actions_created_at` (`created_at`),
  
  CONSTRAINT `fk_admin_imp_actions_session` FOREIGN KEY (`session_id`) REFERENCES `admin_impersonation_sessions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
--> statement-breakpoint

-- Seed new permissions
INSERT IGNORE INTO `permissions` (`name`, `description`, `module`, `created_at`, `updated_at`)
VALUES 
  ('admin:impersonate', 'Can impersonate clients in VIP portal with full audit logging', 'admin', NOW(), NOW()),
  ('admin:impersonate:audit', 'Can view impersonation audit logs and session history', 'admin', NOW(), NOW());
--> statement-breakpoint

-- Assign permissions to Super Admin role
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`, `created_at`)
SELECT r.id, p.id, NOW()
FROM `roles` r, `permissions` p
WHERE r.name = 'Super Admin' 
  AND p.name IN ('admin:impersonate', 'admin:impersonate:audit');

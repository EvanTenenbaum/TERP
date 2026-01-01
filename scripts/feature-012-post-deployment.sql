-- ============================================================================
-- FEATURE-012: VIP Portal Admin Access Tool - Post-Deployment Script
-- ============================================================================
-- This script must be run after deploying FEATURE-012 to production.
-- It creates the required database tables and seeds the new permissions.
-- 
-- IMPORTANT: Run this script against the production database.
-- ============================================================================

-- ============================================================================
-- STEP 1: Create Database Tables
-- ============================================================================

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
  
  -- Indexes for performance
  INDEX `idx_admin_user_id` (`admin_user_id`),
  INDEX `idx_client_id` (`client_id`),
  INDEX `idx_status` (`status`),
  INDEX `idx_session_guid` (`session_guid`),
  
  -- Foreign keys for data integrity
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
  
  -- Indexes for performance
  INDEX `idx_session_id` (`session_id`),
  INDEX `idx_action_type` (`action_type`),
  
  -- Foreign key to sessions table
  CONSTRAINT `fk_action_session` FOREIGN KEY (`session_id`) REFERENCES `admin_impersonation_sessions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- STEP 2: Seed New Permissions
-- ============================================================================

-- Insert the new permissions (ignore if they already exist)
INSERT IGNORE INTO `permissions` (`name`, `description`, `module`, `created_at`, `updated_at`)
VALUES 
  ('admin:impersonate', 'Can impersonate clients in VIP portal with full audit logging', 'admin', NOW(), NOW()),
  ('admin:impersonate:audit', 'Can view impersonation audit logs and session history', 'admin', NOW(), NOW());

-- ============================================================================
-- STEP 3: Assign Permissions to Super Admin Role
-- ============================================================================

-- Get the Super Admin role ID (usually id=1, but we'll look it up to be safe)
SET @super_admin_role_id = (SELECT id FROM `roles` WHERE `name` = 'Super Admin' LIMIT 1);

-- Get the permission IDs
SET @impersonate_perm_id = (SELECT id FROM `permissions` WHERE `name` = 'admin:impersonate' LIMIT 1);
SET @audit_perm_id = (SELECT id FROM `permissions` WHERE `name` = 'admin:impersonate:audit' LIMIT 1);

-- Assign permissions to Super Admin role (ignore if already assigned)
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`, `created_at`)
SELECT @super_admin_role_id, @impersonate_perm_id, NOW()
WHERE @super_admin_role_id IS NOT NULL AND @impersonate_perm_id IS NOT NULL;

INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`, `created_at`)
SELECT @super_admin_role_id, @audit_perm_id, NOW()
WHERE @super_admin_role_id IS NOT NULL AND @audit_perm_id IS NOT NULL;

-- ============================================================================
-- STEP 4: Verification Queries
-- ============================================================================

-- Verify tables were created
SELECT 'admin_impersonation_sessions' as table_name, 
       COUNT(*) as exists_check 
FROM information_schema.tables 
WHERE table_schema = DATABASE() 
  AND table_name = 'admin_impersonation_sessions';

SELECT 'admin_impersonation_actions' as table_name, 
       COUNT(*) as exists_check 
FROM information_schema.tables 
WHERE table_schema = DATABASE() 
  AND table_name = 'admin_impersonation_actions';

-- Verify permissions were created
SELECT id, name, description, module 
FROM `permissions` 
WHERE `name` IN ('admin:impersonate', 'admin:impersonate:audit');

-- Verify Super Admin has the permissions
SELECT r.name as role_name, p.name as permission_name
FROM `role_permissions` rp
JOIN `roles` r ON rp.role_id = r.id
JOIN `permissions` p ON rp.permission_id = p.id
WHERE p.name IN ('admin:impersonate', 'admin:impersonate:audit');

-- ============================================================================
-- DONE! FEATURE-012 post-deployment complete.
-- ============================================================================

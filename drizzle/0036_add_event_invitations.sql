-- Migration: 0036_add_event_invitations
-- Description: Add event invitation workflow tables
-- Date: 2025-11-14
-- Task: QA-044

-- ============================================================================
-- TABLE: calendar_event_invitations
-- ============================================================================

CREATE TABLE IF NOT EXISTS `calendar_event_invitations` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  
  -- Event reference
  `event_id` INT NOT NULL,
  
  -- Invitee information (polymorphic)
  `invitee_type` ENUM('USER', 'CLIENT', 'EXTERNAL') NOT NULL,
  `user_id` INT DEFAULT NULL,
  `client_id` INT DEFAULT NULL,
  `external_email` VARCHAR(320) DEFAULT NULL,
  `external_name` VARCHAR(255) DEFAULT NULL,
  
  -- Invitation details
  `role` ENUM('ORGANIZER', 'REQUIRED', 'OPTIONAL', 'OBSERVER') NOT NULL DEFAULT 'REQUIRED',
  `message` TEXT DEFAULT NULL,
  
  -- Status tracking
  `status` ENUM('DRAFT', 'PENDING', 'ACCEPTED', 'DECLINED', 'AUTO_ACCEPTED', 'CANCELLED', 'EXPIRED') NOT NULL DEFAULT 'DRAFT',
  
  -- Auto-accept functionality
  `auto_accept` BOOLEAN NOT NULL DEFAULT FALSE,
  `auto_accept_reason` VARCHAR(255) DEFAULT NULL,
  
  -- Admin controls
  `admin_override` BOOLEAN NOT NULL DEFAULT FALSE,
  `overridden_by` INT DEFAULT NULL,
  `override_reason` TEXT DEFAULT NULL,
  `overridden_at` TIMESTAMP DEFAULT NULL,
  
  -- Timestamps
  `sent_at` TIMESTAMP DEFAULT NULL,
  `responded_at` TIMESTAMP DEFAULT NULL,
  `expires_at` TIMESTAMP DEFAULT NULL,
  
  -- Metadata
  `created_by` INT NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Link to participant record
  `participant_id` INT DEFAULT NULL,
  
  -- Foreign keys
  CONSTRAINT `fk_invitation_event` FOREIGN KEY (`event_id`) REFERENCES `calendar_events`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_invitation_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_invitation_client` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_invitation_created_by` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`),
  CONSTRAINT `fk_invitation_overridden_by` FOREIGN KEY (`overridden_by`) REFERENCES `users`(`id`),
  CONSTRAINT `fk_invitation_participant` FOREIGN KEY (`participant_id`) REFERENCES `calendar_event_participants`(`id`) ON DELETE SET NULL,
  
  -- Indexes
  INDEX `idx_invitation_event` (`event_id`),
  INDEX `idx_invitation_user` (`user_id`),
  INDEX `idx_invitation_client` (`client_id`),
  INDEX `idx_invitation_status` (`status`),
  INDEX `idx_invitation_created_by` (`created_by`),
  
  -- Unique constraint: one invitation per invitee per event
  UNIQUE INDEX `idx_unique_invitation` (`event_id`, `invitee_type`, `user_id`, `client_id`, `external_email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABLE: calendar_invitation_settings
-- ============================================================================

CREATE TABLE IF NOT EXISTS `calendar_invitation_settings` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  
  `user_id` INT NOT NULL UNIQUE,
  
  -- Auto-accept rules
  `auto_accept_all` BOOLEAN NOT NULL DEFAULT FALSE,
  `auto_accept_from_organizers` JSON DEFAULT NULL, -- Array of user IDs
  `auto_accept_by_event_type` JSON DEFAULT NULL,   -- Array of event types
  `auto_accept_by_module` JSON DEFAULT NULL,       -- Array of modules
  
  -- Notification preferences
  `notify_on_invitation` BOOLEAN NOT NULL DEFAULT TRUE,
  `notify_on_auto_accept` BOOLEAN NOT NULL DEFAULT TRUE,
  
  -- Metadata
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Foreign keys
  CONSTRAINT `fk_invitation_settings_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABLE: calendar_invitation_history
-- ============================================================================

CREATE TABLE IF NOT EXISTS `calendar_invitation_history` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  
  `invitation_id` INT NOT NULL,
  
  `action` ENUM('CREATED', 'SENT', 'ACCEPTED', 'DECLINED', 'AUTO_ACCEPTED', 'CANCELLED', 'EXPIRED', 'ADMIN_OVERRIDE', 'RESENT') NOT NULL,
  
  `performed_by` INT DEFAULT NULL,
  `performed_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  `notes` TEXT DEFAULT NULL,
  `metadata` JSON DEFAULT NULL,
  
  -- Foreign keys
  CONSTRAINT `fk_invitation_history_invitation` FOREIGN KEY (`invitation_id`) REFERENCES `calendar_event_invitations`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_invitation_history_performed_by` FOREIGN KEY (`performed_by`) REFERENCES `users`(`id`),
  
  -- Indexes
  INDEX `idx_history_invitation` (`invitation_id`),
  INDEX `idx_history_performed_by` (`performed_by`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

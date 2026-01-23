-- ============================================================================
-- Migration: 0044_add_admin_impersonation_tables
-- Feature: FEATURE-012 VIP Portal Admin Access Tool
-- Date: 2026-01-02
-- ============================================================================
-- Creates the admin impersonation audit tables and seeds permissions
-- ============================================================================

CREATE TABLE `admin_impersonation_sessions` (
  `id` int AUTO_INCREMENT NOT NULL,
  `session_guid` varchar(36) NOT NULL,
  `admin_user_id` int NOT NULL,
  `client_id` int NOT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'ACTIVE',
  `start_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `end_at` timestamp NULL,
  `ip_address` varchar(45) NULL,
  `user_agent` varchar(500) NULL,
  `revoked_by` int NULL,
  `revoked_at` timestamp NULL,
  `revoke_reason` varchar(255) NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `admin_impersonation_sessions_id` PRIMARY KEY(`id`),
  CONSTRAINT `admin_impersonation_sessions_session_guid_unique` UNIQUE(`session_guid`)
);--> statement-breakpoint

CREATE TABLE `admin_impersonation_actions` (
  `id` int AUTO_INCREMENT NOT NULL,
  `session_id` int NOT NULL,
  `action_type` varchar(100) NOT NULL,
  `action_path` varchar(255) NULL,
  `action_method` varchar(10) NULL,
  `action_details` json NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `admin_impersonation_actions_id` PRIMARY KEY(`id`)
);--> statement-breakpoint

ALTER TABLE `admin_impersonation_sessions` ADD CONSTRAINT `admin_imp_sessions_admin_user_fk` FOREIGN KEY (`admin_user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `admin_impersonation_sessions` ADD CONSTRAINT `admin_imp_sessions_client_fk` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `admin_impersonation_sessions` ADD CONSTRAINT `admin_imp_sessions_revoked_by_fk` FOREIGN KEY (`revoked_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `admin_impersonation_actions` ADD CONSTRAINT `admin_imp_actions_session_fk` FOREIGN KEY (`session_id`) REFERENCES `admin_impersonation_sessions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint

CREATE INDEX `idx_admin_imp_sessions_admin` ON `admin_impersonation_sessions` (`admin_user_id`);--> statement-breakpoint
CREATE INDEX `idx_admin_imp_sessions_client` ON `admin_impersonation_sessions` (`client_id`);--> statement-breakpoint
CREATE INDEX `idx_admin_imp_sessions_status` ON `admin_impersonation_sessions` (`status`);--> statement-breakpoint
CREATE INDEX `idx_admin_imp_sessions_guid` ON `admin_impersonation_sessions` (`session_guid`);--> statement-breakpoint
CREATE INDEX `idx_admin_imp_actions_session` ON `admin_impersonation_actions` (`session_id`);--> statement-breakpoint
CREATE INDEX `idx_admin_imp_actions_type` ON `admin_impersonation_actions` (`action_type`);--> statement-breakpoint
CREATE INDEX `idx_admin_imp_actions_created` ON `admin_impersonation_actions` (`created_at`);--> statement-breakpoint

-- Note: Permission seeding moved to application-level seeding script
-- The INSERT IGNORE statements are not compatible with Drizzle migrations
-- Permissions 'admin:impersonate' and 'admin:impersonate:audit' should be
-- seeded via scripts/seed or application startup

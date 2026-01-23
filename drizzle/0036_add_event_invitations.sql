-- Migration: 0036_add_event_invitations
-- Description: Add event invitation workflow tables
-- Date: 2025-11-14
-- Task: QA-044

CREATE TABLE `calendar_event_invitations` (
  `id` int AUTO_INCREMENT NOT NULL,
  `event_id` int NOT NULL,
  `invitee_type` enum('USER','CLIENT','EXTERNAL') NOT NULL,
  `user_id` int DEFAULT NULL,
  `client_id` int DEFAULT NULL,
  `external_email` varchar(320) DEFAULT NULL,
  `external_name` varchar(255) DEFAULT NULL,
  `role` enum('ORGANIZER','REQUIRED','OPTIONAL','OBSERVER') NOT NULL DEFAULT 'REQUIRED',
  `message` text DEFAULT NULL,
  `status` enum('DRAFT','PENDING','ACCEPTED','DECLINED','AUTO_ACCEPTED','CANCELLED','EXPIRED') NOT NULL DEFAULT 'DRAFT',
  `auto_accept` boolean NOT NULL DEFAULT FALSE,
  `auto_accept_reason` varchar(255) DEFAULT NULL,
  `admin_override` boolean NOT NULL DEFAULT FALSE,
  `overridden_by` int DEFAULT NULL,
  `override_reason` text DEFAULT NULL,
  `overridden_at` timestamp DEFAULT NULL,
  `sent_at` timestamp DEFAULT NULL,
  `responded_at` timestamp DEFAULT NULL,
  `expires_at` timestamp DEFAULT NULL,
  `created_by` int NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `participant_id` int DEFAULT NULL,
  CONSTRAINT `calendar_event_invitations_id` PRIMARY KEY(`id`)
);--> statement-breakpoint

CREATE TABLE `calendar_invitation_settings` (
  `id` int AUTO_INCREMENT NOT NULL,
  `user_id` int NOT NULL,
  `auto_accept_all` boolean NOT NULL DEFAULT FALSE,
  `auto_accept_from_organizers` json DEFAULT NULL,
  `auto_accept_by_event_type` json DEFAULT NULL,
  `auto_accept_by_module` json DEFAULT NULL,
  `notify_on_invitation` boolean NOT NULL DEFAULT TRUE,
  `notify_on_auto_accept` boolean NOT NULL DEFAULT TRUE,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `calendar_invitation_settings_id` PRIMARY KEY(`id`),
  CONSTRAINT `calendar_invitation_settings_user_id_unique` UNIQUE(`user_id`)
);--> statement-breakpoint

CREATE TABLE `calendar_invitation_history` (
  `id` int AUTO_INCREMENT NOT NULL,
  `invitation_id` int NOT NULL,
  `action` enum('CREATED','SENT','ACCEPTED','DECLINED','AUTO_ACCEPTED','CANCELLED','EXPIRED','ADMIN_OVERRIDE','RESENT') NOT NULL,
  `performed_by` int DEFAULT NULL,
  `performed_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `notes` text DEFAULT NULL,
  `metadata` json DEFAULT NULL,
  CONSTRAINT `calendar_invitation_history_id` PRIMARY KEY(`id`)
);--> statement-breakpoint

ALTER TABLE `calendar_event_invitations` ADD CONSTRAINT `fk_invitation_event` FOREIGN KEY (`event_id`) REFERENCES `calendar_events`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;--> statement-breakpoint
ALTER TABLE `calendar_event_invitations` ADD CONSTRAINT `fk_invitation_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;--> statement-breakpoint
ALTER TABLE `calendar_event_invitations` ADD CONSTRAINT `fk_invitation_client` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;--> statement-breakpoint
ALTER TABLE `calendar_event_invitations` ADD CONSTRAINT `fk_invitation_created_by` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;--> statement-breakpoint
ALTER TABLE `calendar_event_invitations` ADD CONSTRAINT `fk_invitation_overridden_by` FOREIGN KEY (`overridden_by`) REFERENCES `users`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;--> statement-breakpoint
ALTER TABLE `calendar_event_invitations` ADD CONSTRAINT `fk_invitation_participant` FOREIGN KEY (`participant_id`) REFERENCES `calendar_event_participants`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;--> statement-breakpoint
ALTER TABLE `calendar_invitation_settings` ADD CONSTRAINT `fk_invitation_settings_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;--> statement-breakpoint
ALTER TABLE `calendar_invitation_history` ADD CONSTRAINT `fk_invitation_history_invitation` FOREIGN KEY (`invitation_id`) REFERENCES `calendar_event_invitations`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;--> statement-breakpoint
ALTER TABLE `calendar_invitation_history` ADD CONSTRAINT `fk_invitation_history_performed_by` FOREIGN KEY (`performed_by`) REFERENCES `users`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;--> statement-breakpoint

CREATE INDEX `idx_invitation_event` ON `calendar_event_invitations` (`event_id`);--> statement-breakpoint
CREATE INDEX `idx_invitation_user` ON `calendar_event_invitations` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_invitation_client` ON `calendar_event_invitations` (`client_id`);--> statement-breakpoint
CREATE INDEX `idx_invitation_status` ON `calendar_event_invitations` (`status`);--> statement-breakpoint
CREATE INDEX `idx_invitation_created_by` ON `calendar_event_invitations` (`created_by`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_unique_invitation` ON `calendar_event_invitations` (`event_id`, `invitee_type`, `user_id`, `client_id`, `external_email`);--> statement-breakpoint
CREATE INDEX `idx_history_invitation` ON `calendar_invitation_history` (`invitation_id`);--> statement-breakpoint
CREATE INDEX `idx_history_performed_by` ON `calendar_invitation_history` (`performed_by`);

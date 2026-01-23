-- Migration: Add credit_visibility_settings table
-- Created: 2025-12-22
-- Purpose: Support per-location credit UI visibility controls

CREATE TABLE `credit_visibility_settings` (
  `id` int AUTO_INCREMENT NOT NULL,
  `location_id` int DEFAULT NULL,
  `show_credit_in_client_list` tinyint(1) NOT NULL DEFAULT 1,
  `show_credit_banner_in_orders` tinyint(1) NOT NULL DEFAULT 1,
  `show_credit_widget_in_profile` tinyint(1) NOT NULL DEFAULT 1,
  `show_signal_breakdown` tinyint(1) NOT NULL DEFAULT 1,
  `show_audit_log` tinyint(1) NOT NULL DEFAULT 1,
  `credit_enforcement_mode` enum('WARNING','SOFT_BLOCK','HARD_BLOCK') NOT NULL DEFAULT 'WARNING',
  `warning_threshold_percent` int NOT NULL DEFAULT 75,
  `alert_threshold_percent` int NOT NULL DEFAULT 90,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `credit_visibility_settings_id` PRIMARY KEY(`id`)
);--> statement-breakpoint

CREATE INDEX `idx_credit_visibility_location` ON `credit_visibility_settings` (`location_id`);

-- Note: Default global settings seed data should be handled via application-level
-- seeding scripts (scripts/seed) to avoid issues with Drizzle's migrator handling
-- INSERT statements. Seed the following default record:
-- location_id: NULL, all visibility flags: true, credit_enforcement_mode: 'WARNING',
-- warning_threshold_percent: 75, alert_threshold_percent: 90

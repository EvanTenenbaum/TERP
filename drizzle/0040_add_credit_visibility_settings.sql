-- Migration: Add credit_visibility_settings table
-- Created: 2025-12-22
-- Purpose: Support per-location credit UI visibility controls

CREATE TABLE IF NOT EXISTS `credit_visibility_settings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `location_id` int DEFAULT NULL,
  `show_credit_in_client_list` boolean NOT NULL DEFAULT true,
  `show_credit_banner_in_orders` boolean NOT NULL DEFAULT true,
  `show_credit_widget_in_profile` boolean NOT NULL DEFAULT true,
  `show_signal_breakdown` boolean NOT NULL DEFAULT true,
  `show_audit_log` boolean NOT NULL DEFAULT true,
  `credit_enforcement_mode` enum('WARNING','SOFT_BLOCK','HARD_BLOCK') NOT NULL DEFAULT 'WARNING',
  `warning_threshold_percent` int NOT NULL DEFAULT 75,
  `alert_threshold_percent` int NOT NULL DEFAULT 90,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_credit_visibility_location` (`location_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default global settings
INSERT INTO `credit_visibility_settings` (
  `location_id`,
  `show_credit_in_client_list`,
  `show_credit_banner_in_orders`,
  `show_credit_widget_in_profile`,
  `show_signal_breakdown`,
  `show_audit_log`,
  `credit_enforcement_mode`,
  `warning_threshold_percent`,
  `alert_threshold_percent`
) VALUES (
  NULL,
  true,
  true,
  true,
  true,
  true,
  'WARNING',
  75,
  90
);

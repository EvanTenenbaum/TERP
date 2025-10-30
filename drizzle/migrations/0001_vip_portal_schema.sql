-- VIP Portal Schema Migration
-- Generated: 2025-10-30
-- Description: Adds VIP Client Portal tables and fields

-- Add VIP Portal fields to clients table
ALTER TABLE `clients` 
ADD COLUMN `vip_portal_enabled` BOOLEAN DEFAULT FALSE AFTER `oldest_debt_days`,
ADD COLUMN `vip_portal_last_login` TIMESTAMP NULL AFTER `vip_portal_enabled`;

-- Create vip_portal_configurations table
CREATE TABLE `vip_portal_configurations` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `client_id` INT NOT NULL UNIQUE,
  `module_dashboard_enabled` BOOLEAN NOT NULL DEFAULT TRUE,
  `module_ar_enabled` BOOLEAN NOT NULL DEFAULT TRUE,
  `module_ap_enabled` BOOLEAN NOT NULL DEFAULT TRUE,
  `module_transaction_history_enabled` BOOLEAN NOT NULL DEFAULT TRUE,
  `module_vip_tier_enabled` BOOLEAN NOT NULL DEFAULT TRUE,
  `module_credit_center_enabled` BOOLEAN NOT NULL DEFAULT TRUE,
  `module_marketplace_needs_enabled` BOOLEAN NOT NULL DEFAULT TRUE,
  `module_marketplace_supply_enabled` BOOLEAN NOT NULL DEFAULT TRUE,
  `module_leaderboard_enabled` BOOLEAN NOT NULL DEFAULT FALSE,
  `features_config` JSON,
  `leaderboard_type` VARCHAR(50) DEFAULT 'ytd_spend',
  `leaderboard_display_mode` VARCHAR(20) DEFAULT 'blackbox',
  `leaderboard_show_suggestions` BOOLEAN DEFAULT TRUE,
  `leaderboard_minimum_clients` INT DEFAULT 5,
  `advanced_options` JSON,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE CASCADE,
  INDEX `idx_vip_portal_client_id` (`client_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create vip_portal_auth table
CREATE TABLE `vip_portal_auth` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `client_id` INT NOT NULL UNIQUE,
  `email` VARCHAR(320) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255),
  `google_id` VARCHAR(255),
  `microsoft_id` VARCHAR(255),
  `session_token` VARCHAR(255),
  `session_expires_at` TIMESTAMP NULL,
  `reset_token` VARCHAR(255),
  `reset_token_expires_at` TIMESTAMP NULL,
  `last_login_at` TIMESTAMP NULL,
  `login_count` INT NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE CASCADE,
  INDEX `idx_vip_portal_email` (`email`),
  INDEX `idx_vip_portal_session_token` (`session_token`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

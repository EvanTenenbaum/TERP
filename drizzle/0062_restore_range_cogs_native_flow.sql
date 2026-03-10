-- Migration: 0062_restore_range_cogs_native_flow.sql
-- Description: Restore native range-based COGS defaults, line-item metadata, and vendor exception tracking
-- Created: 2026-03-10

CREATE TABLE IF NOT EXISTS `range_pricing_channel_settings` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `deleted_at` TIMESTAMP NULL,
  `channel` ENUM('SALES_SHEET', 'LIVE_SHOPPING', 'VIP_SHOPPING') NOT NULL UNIQUE,
  `default_basis` ENUM('LOW', 'MID', 'HIGH', 'MANUAL') NOT NULL DEFAULT 'MID',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uq_range_pricing_channel` (`channel`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
--> statement-breakpoint

INSERT IGNORE INTO `range_pricing_channel_settings` (`channel`, `default_basis`)
VALUES
  ('SALES_SHEET', 'MID'),
  ('LIVE_SHOPPING', 'MID'),
  ('VIP_SHOPPING', 'MID');
--> statement-breakpoint

ALTER TABLE `order_line_items`
  ADD COLUMN `effective_cogs_basis` ENUM('LOW', 'MID', 'HIGH', 'MANUAL') NOT NULL DEFAULT 'MANUAL' AFTER `original_cogs_per_unit`,
  ADD COLUMN `original_range_min` DECIMAL(15,4) NULL AFTER `effective_cogs_basis`,
  ADD COLUMN `original_range_max` DECIMAL(15,4) NULL AFTER `original_range_min`,
  ADD COLUMN `is_below_vendor_range` BOOLEAN NOT NULL DEFAULT FALSE AFTER `original_range_max`,
  ADD COLUMN `below_range_reason` TEXT NULL AFTER `is_below_vendor_range`;

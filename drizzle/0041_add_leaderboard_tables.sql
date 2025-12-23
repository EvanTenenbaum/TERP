-- Migration: Add Leaderboard System Tables
-- Created: 2025-12-22
-- Description: Creates tables for the unified leaderboard system

-- Leaderboard Weight Configurations (user-specific weights)
CREATE TABLE IF NOT EXISTS `leaderboard_weight_configs` (
  `id` int AUTO_INCREMENT NOT NULL,
  `user_id` int NOT NULL,
  `config_name` varchar(100) NOT NULL DEFAULT 'default',
  `client_type` enum('CUSTOMER','SUPPLIER','ALL') NOT NULL DEFAULT 'ALL',
  `weights` json NOT NULL,
  `is_active` boolean NOT NULL DEFAULT true,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` timestamp,
  CONSTRAINT `leaderboard_weight_configs_id` PRIMARY KEY(`id`),
  CONSTRAINT `idx_user_config_type` UNIQUE(`user_id`,`config_name`,`client_type`)
);

-- Leaderboard Default Weights (system-wide defaults)
CREATE TABLE IF NOT EXISTS `leaderboard_default_weights` (
  `id` int AUTO_INCREMENT NOT NULL,
  `client_type` enum('CUSTOMER','SUPPLIER','ALL') NOT NULL,
  `weights` json NOT NULL,
  `updated_by` int,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `leaderboard_default_weights_id` PRIMARY KEY(`id`),
  CONSTRAINT `idx_default_weights_client_type` UNIQUE(`client_type`)
);

-- Leaderboard Metric Cache (cached calculations)
CREATE TABLE IF NOT EXISTS `leaderboard_metric_cache` (
  `id` int AUTO_INCREMENT NOT NULL,
  `client_id` int NOT NULL,
  `metric_type` varchar(50) NOT NULL,
  `metric_value` decimal(15,4),
  `sample_size` int NOT NULL DEFAULT 0,
  `is_significant` boolean NOT NULL DEFAULT false,
  `raw_data` json,
  `calculated_at` timestamp NOT NULL DEFAULT (now()),
  `expires_at` timestamp NOT NULL,
  CONSTRAINT `leaderboard_metric_cache_id` PRIMARY KEY(`id`),
  CONSTRAINT `idx_client_metric` UNIQUE(`client_id`,`metric_type`)
);

-- Leaderboard Rank History (historical snapshots)
CREATE TABLE IF NOT EXISTS `leaderboard_rank_history` (
  `id` int AUTO_INCREMENT NOT NULL,
  `client_id` int NOT NULL,
  `snapshot_date` date NOT NULL,
  `master_rank` int,
  `master_score` decimal(10,4),
  `financial_rank` int,
  `engagement_rank` int,
  `reliability_rank` int,
  `growth_rank` int,
  `total_clients` int NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `leaderboard_rank_history_id` PRIMARY KEY(`id`),
  CONSTRAINT `idx_client_date` UNIQUE(`client_id`,`snapshot_date`)
);

-- Dashboard Widget Configurations (user widget preferences)
CREATE TABLE IF NOT EXISTS `dashboard_widget_configs` (
  `id` int AUTO_INCREMENT NOT NULL,
  `user_id` int NOT NULL,
  `widget_type` varchar(50) NOT NULL,
  `config` json NOT NULL,
  `position` int NOT NULL DEFAULT 0,
  `is_visible` boolean NOT NULL DEFAULT true,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `dashboard_widget_configs_id` PRIMARY KEY(`id`),
  CONSTRAINT `idx_user_widget` UNIQUE(`user_id`,`widget_type`)
);

-- Add indexes for performance
CREATE INDEX `idx_user_active` ON `leaderboard_weight_configs` (`user_id`,`is_active`);
CREATE INDEX `idx_expires` ON `leaderboard_metric_cache` (`expires_at`);
CREATE INDEX `idx_metric_type` ON `leaderboard_metric_cache` (`metric_type`);
CREATE INDEX `idx_snapshot_date` ON `leaderboard_rank_history` (`snapshot_date`);

-- Add foreign key constraints
ALTER TABLE `leaderboard_weight_configs` ADD CONSTRAINT `leaderboard_weight_configs_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE `leaderboard_default_weights` ADD CONSTRAINT `leaderboard_default_weights_updated_by_users_id_fk` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;
ALTER TABLE `leaderboard_metric_cache` ADD CONSTRAINT `leaderboard_metric_cache_client_id_clients_id_fk` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE `leaderboard_rank_history` ADD CONSTRAINT `leaderboard_rank_history_client_id_clients_id_fk` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE `dashboard_widget_configs` ADD CONSTRAINT `dashboard_widget_configs_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

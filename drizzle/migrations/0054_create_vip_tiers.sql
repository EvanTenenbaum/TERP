-- VIP Tier System Migration (FEAT-019)
-- Generated: 2026-01-14
-- Description: Creates VIP tier tables for configurable tier management

-- Create vip_tiers table
CREATE TABLE `vip_tiers` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(50) NOT NULL UNIQUE,
  `display_name` VARCHAR(100) NOT NULL,
  `description` TEXT,
  `level` INT NOT NULL DEFAULT 0,
  `color` VARCHAR(7) NOT NULL DEFAULT '#6B7280',
  `icon` VARCHAR(50),

  -- Requirements to reach this tier
  `min_spend_ytd` DECIMAL(15, 2) DEFAULT 0,
  `min_orders_ytd` INT DEFAULT 0,
  `min_account_age_days` INT DEFAULT 0,
  `min_payment_on_time_rate` DECIMAL(5, 2) DEFAULT 0,

  -- Benefits
  `discount_percentage` DECIMAL(5, 2) DEFAULT 0,
  `credit_limit_multiplier` DECIMAL(5, 2) DEFAULT 1.00,
  `priority_support` BOOLEAN DEFAULT FALSE,
  `early_access_to_products` BOOLEAN DEFAULT FALSE,
  `free_shipping` BOOLEAN DEFAULT FALSE,
  `dedicated_rep` BOOLEAN DEFAULT FALSE,
  `custom_benefits` JSON,

  `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
  `is_default` BOOLEAN DEFAULT FALSE,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX `idx_vip_tiers_level` (`level`),
  INDEX `idx_vip_tiers_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create client_vip_status table
CREATE TABLE `client_vip_status` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `client_id` INT NOT NULL UNIQUE,
  `current_tier_id` INT,

  -- Metrics for tier calculation
  `ytd_spend` DECIMAL(15, 2) DEFAULT 0,
  `ytd_orders` INT DEFAULT 0,
  `payment_on_time_rate` DECIMAL(5, 2) DEFAULT 100,
  `lifetime_spend` DECIMAL(15, 2) DEFAULT 0,

  -- Manual override
  `manual_tier_override` BOOLEAN DEFAULT FALSE,
  `override_reason` TEXT,
  `override_by` INT,
  `override_at` TIMESTAMP NULL,

  -- Tier progression tracking
  `last_tier_change_at` TIMESTAMP NULL,
  `last_calculated_at` TIMESTAMP NULL,
  `next_tier_progress` DECIMAL(5, 2) DEFAULT 0,

  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`current_tier_id`) REFERENCES `vip_tiers`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`override_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,

  INDEX `idx_client_vip_status_client_id` (`client_id`),
  INDEX `idx_client_vip_status_tier_id` (`current_tier_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create vip_tier_history table
CREATE TABLE `vip_tier_history` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `client_id` INT NOT NULL,
  `previous_tier_id` INT,
  `new_tier_id` INT,
  `change_reason` VARCHAR(50) NOT NULL,
  `change_details` TEXT,
  `changed_by` INT,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`previous_tier_id`) REFERENCES `vip_tiers`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`new_tier_id`) REFERENCES `vip_tiers`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`changed_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,

  INDEX `idx_vip_tier_history_client_id` (`client_id`),
  INDEX `idx_vip_tier_history_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default tier configuration
-- These tiers are based on overall performance score (payment speed 35%, volume 40%, loyalty 25%)
INSERT INTO `vip_tiers` (`name`, `display_name`, `description`, `level`, `color`, `icon`, `min_spend_ytd`, `discount_percentage`, `credit_limit_multiplier`, `priority_support`, `early_access_to_products`, `free_shipping`, `dedicated_rep`, `is_active`, `is_default`) VALUES
  ('BRONZE', 'Bronze', 'Entry level tier for new clients', 0, '#CD7F32', 'Medal', 0, 0, 1.00, FALSE, FALSE, FALSE, FALSE, TRUE, TRUE),
  ('GOLD', 'Gold', 'Good performing clients with solid payment history', 50, '#FFD700', 'Award', 10000, 5, 1.25, FALSE, FALSE, FALSE, FALSE, TRUE, FALSE),
  ('PLATINUM', 'Platinum', 'High performing clients with excellent payment speed and volume', 75, '#E5E4E2', 'Crown', 50000, 10, 1.50, TRUE, TRUE, FALSE, FALSE, TRUE, FALSE),
  ('DIAMOND', 'Diamond', 'Top tier clients with exceptional performance across all metrics', 90, '#B9F2FF', 'Gem', 100000, 15, 2.00, TRUE, TRUE, TRUE, TRUE, TRUE, FALSE);

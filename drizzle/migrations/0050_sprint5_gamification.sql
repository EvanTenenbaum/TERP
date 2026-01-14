-- Sprint 5 Track B: Gamification System
-- TASK-IDs: MEET-044, MEET-045, FEAT-006
--
-- Features:
-- - MEET-044: Anonymized VIP Leaderboard
-- - MEET-045: Rewards System (Medals, Markup %)
-- - FEAT-006: Full Referral (Couch Tax) Workflow

-- ============================================================================
-- MEET-044: Anonymized Leaderboard
-- ============================================================================

-- VIP Leaderboard Snapshots
CREATE TABLE IF NOT EXISTS `vip_leaderboard_snapshots` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `period` ENUM('WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY', 'ALL_TIME') NOT NULL,
  `period_start_date` DATE NOT NULL,
  `period_end_date` DATE NOT NULL,
  `leaderboard_type` ENUM('TOTAL_SPENT', 'ORDER_COUNT', 'REFERRALS', 'ACTIVITY', 'ACHIEVEMENTS') NOT NULL,
  `client_id` INT NOT NULL,
  `anonymized_name` VARCHAR(100) NOT NULL,
  `rank` INT NOT NULL,
  `previous_rank` INT,
  `rank_change` INT,
  `score` DECIMAL(15, 2) NOT NULL,
  `percentile` DECIMAL(5, 2) NOT NULL,
  `snapshot_taken_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_vip_lb_period` (`period`),
  INDEX `idx_vip_lb_type` (`leaderboard_type`),
  INDEX `idx_vip_lb_client` (`client_id`),
  INDEX `idx_vip_lb_rank` (`rank`),
  INDEX `idx_vip_lb_date_range` (`period_start_date`, `period_end_date`),
  UNIQUE KEY `idx_vip_lb_unique` (`client_id`, `period`, `leaderboard_type`, `period_start_date`),
  CONSTRAINT `fk_vip_lb_client` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE CASCADE
);

-- Leaderboard Display Settings
CREATE TABLE IF NOT EXISTS `leaderboard_display_settings` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `client_id` INT NOT NULL UNIQUE,
  `opt_out_of_leaderboard` BOOLEAN DEFAULT FALSE NOT NULL,
  `preferred_anonymous_prefix` VARCHAR(50) DEFAULT 'VIP Member',
  `show_tier_badge` BOOLEAN DEFAULT TRUE NOT NULL,
  `show_achievement_count` BOOLEAN DEFAULT TRUE NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_lb_display_client` (`client_id`),
  CONSTRAINT `fk_lb_display_client` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE CASCADE
);

-- ============================================================================
-- MEET-045: Rewards System (Medals, Markup %)
-- ============================================================================

-- Achievement Definitions
CREATE TABLE IF NOT EXISTS `achievements` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `code` VARCHAR(50) NOT NULL UNIQUE,
  `name` VARCHAR(100) NOT NULL,
  `description` TEXT NOT NULL,
  `category` ENUM('SPENDING', 'ORDERS', 'LOYALTY', 'REFERRALS', 'ENGAGEMENT', 'SPECIAL') NOT NULL,
  `medal` ENUM('BRONZE', 'SILVER', 'GOLD', 'PLATINUM') NOT NULL,
  `icon` VARCHAR(50) NOT NULL DEFAULT 'award',
  `color` VARCHAR(7) NOT NULL DEFAULT '#6B7280',
  `requirement_type` ENUM('TOTAL_SPENT', 'ORDER_COUNT', 'CONSECUTIVE_MONTHS', 'ACCOUNT_AGE_DAYS', 'REFERRAL_COUNT', 'REFERRAL_REVENUE', 'ACTIVITY_SCORE', 'MANUAL') NOT NULL,
  `requirement_value` DECIMAL(15, 2) NOT NULL,
  `points_awarded` INT DEFAULT 0 NOT NULL,
  `markup_discount_percent` DECIMAL(5, 2) DEFAULT 0,
  `parent_achievement_id` INT,
  `is_active` BOOLEAN DEFAULT TRUE NOT NULL,
  `is_secret` BOOLEAN DEFAULT FALSE NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_achievements_code` (`code`),
  INDEX `idx_achievements_category` (`category`),
  INDEX `idx_achievements_medal` (`medal`),
  INDEX `idx_achievements_active` (`is_active`)
);

-- Client Achievements
CREATE TABLE IF NOT EXISTS `client_achievements` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `client_id` INT NOT NULL,
  `achievement_id` INT NOT NULL,
  `earned_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `earned_value` DECIMAL(15, 2),
  `progress_value` DECIMAL(15, 2) DEFAULT 0,
  `progress_percent` DECIMAL(5, 2) DEFAULT 0,
  `is_pinned` BOOLEAN DEFAULT FALSE NOT NULL,
  `is_hidden` BOOLEAN DEFAULT FALSE NOT NULL,
  `notification_sent` BOOLEAN DEFAULT FALSE NOT NULL,
  `viewed_at` TIMESTAMP,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_client_achievements_client` (`client_id`),
  INDEX `idx_client_achievements_achievement` (`achievement_id`),
  INDEX `idx_client_achievements_earned` (`earned_at`),
  UNIQUE KEY `idx_client_achievement_unique` (`client_id`, `achievement_id`),
  CONSTRAINT `fk_client_achievements_client` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_client_achievements_achievement` FOREIGN KEY (`achievement_id`) REFERENCES `achievements` (`id`) ON DELETE CASCADE
);

-- Points Ledger
CREATE TABLE IF NOT EXISTS `points_ledger` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `client_id` INT NOT NULL,
  `transaction_type` ENUM('EARNED_ACHIEVEMENT', 'EARNED_PURCHASE', 'EARNED_REFERRAL', 'EARNED_BONUS', 'REDEEMED', 'EXPIRED', 'ADJUSTED') NOT NULL,
  `points` INT NOT NULL,
  `balance_after` INT NOT NULL,
  `reference_type` VARCHAR(50),
  `reference_id` INT,
  `description` VARCHAR(255) NOT NULL,
  `notes` TEXT,
  `expires_at` TIMESTAMP,
  `processed_by_id` INT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_points_ledger_client` (`client_id`),
  INDEX `idx_points_ledger_type` (`transaction_type`),
  INDEX `idx_points_ledger_created` (`created_at`),
  INDEX `idx_points_ledger_expires` (`expires_at`),
  INDEX `idx_points_ledger_reference` (`reference_type`, `reference_id`),
  CONSTRAINT `fk_points_ledger_client` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_points_ledger_processor` FOREIGN KEY (`processed_by_id`) REFERENCES `users` (`id`)
);

-- Client Points Summary
CREATE TABLE IF NOT EXISTS `client_points_summary` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `client_id` INT NOT NULL UNIQUE,
  `current_balance` INT DEFAULT 0 NOT NULL,
  `lifetime_earned` INT DEFAULT 0 NOT NULL,
  `lifetime_redeemed` INT DEFAULT 0 NOT NULL,
  `lifetime_expired` INT DEFAULT 0 NOT NULL,
  `total_achievements` INT DEFAULT 0 NOT NULL,
  `bronze_count` INT DEFAULT 0 NOT NULL,
  `silver_count` INT DEFAULT 0 NOT NULL,
  `gold_count` INT DEFAULT 0 NOT NULL,
  `platinum_count` INT DEFAULT 0 NOT NULL,
  `achievement_markup_discount` DECIMAL(5, 2) DEFAULT 0,
  `last_calculated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_points_summary_client` (`client_id`),
  INDEX `idx_points_summary_balance` (`current_balance`),
  CONSTRAINT `fk_points_summary_client` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE CASCADE
);

-- Reward Catalog
CREATE TABLE IF NOT EXISTS `reward_catalog` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `code` VARCHAR(50) NOT NULL UNIQUE,
  `name` VARCHAR(100) NOT NULL,
  `description` TEXT NOT NULL,
  `points_cost` INT NOT NULL,
  `reward_type` ENUM('MARKUP_DISCOUNT', 'FIXED_DISCOUNT', 'FREE_SHIPPING', 'PRIORITY_SERVICE', 'EXCLUSIVE_ACCESS', 'CUSTOM') NOT NULL,
  `reward_value` DECIMAL(10, 2) NOT NULL,
  `icon` VARCHAR(50) DEFAULT 'gift',
  `color` VARCHAR(7) DEFAULT '#10B981',
  `image_url` VARCHAR(500),
  `is_active` BOOLEAN DEFAULT TRUE NOT NULL,
  `available_from` TIMESTAMP,
  `available_until` TIMESTAMP,
  `quantity_available` INT,
  `quantity_redeemed` INT DEFAULT 0 NOT NULL,
  `min_tier_required` VARCHAR(50),
  `min_achievements_required` INT DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_reward_catalog_code` (`code`),
  INDEX `idx_reward_catalog_active` (`is_active`),
  INDEX `idx_reward_catalog_type` (`reward_type`),
  INDEX `idx_reward_catalog_cost` (`points_cost`)
);

-- Reward Redemptions
CREATE TABLE IF NOT EXISTS `reward_redemptions` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `client_id` INT NOT NULL,
  `reward_id` INT NOT NULL,
  `points_spent` INT NOT NULL,
  `status` ENUM('PENDING', 'APPROVED', 'APPLIED', 'EXPIRED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
  `applied_to_order_id` INT,
  `expires_at` TIMESTAMP,
  `approved_by_id` INT,
  `approved_at` TIMESTAMP,
  `notes` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_redemptions_client` (`client_id`),
  INDEX `idx_redemptions_reward` (`reward_id`),
  INDEX `idx_redemptions_status` (`status`),
  INDEX `idx_redemptions_order` (`applied_to_order_id`),
  INDEX `idx_redemptions_expires` (`expires_at`),
  CONSTRAINT `fk_redemptions_client` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_redemptions_reward` FOREIGN KEY (`reward_id`) REFERENCES `reward_catalog` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_redemptions_order` FOREIGN KEY (`applied_to_order_id`) REFERENCES `orders` (`id`),
  CONSTRAINT `fk_redemptions_approver` FOREIGN KEY (`approved_by_id`) REFERENCES `users` (`id`)
);

-- ============================================================================
-- FEAT-006: Referral (Couch Tax) System
-- ============================================================================

-- Client Referral Codes
CREATE TABLE IF NOT EXISTS `client_referral_codes` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `client_id` INT NOT NULL UNIQUE,
  `code` VARCHAR(20) NOT NULL UNIQUE,
  `code_type` ENUM('AUTO_GENERATED', 'CUSTOM') NOT NULL DEFAULT 'AUTO_GENERATED',
  `is_active` BOOLEAN DEFAULT TRUE NOT NULL,
  `times_used` INT DEFAULT 0 NOT NULL,
  `total_referral_revenue` DECIMAL(15, 2) DEFAULT 0,
  `total_couch_tax_earned` DECIMAL(15, 2) DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_referral_codes_client` (`client_id`),
  INDEX `idx_referral_codes_code` (`code`),
  INDEX `idx_referral_codes_active` (`is_active`),
  CONSTRAINT `fk_referral_codes_client` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE CASCADE
);

-- Referral Tracking
CREATE TABLE IF NOT EXISTS `referral_tracking` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `referrer_client_id` INT NOT NULL,
  `referral_code_used` VARCHAR(20),
  `referred_client_id` INT NOT NULL,
  `status` ENUM('PENDING', 'CONVERTED', 'COUCH_TAX_ACTIVE', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
  `converted_at` TIMESTAMP,
  `first_order_id` INT,
  `couch_tax_percent` DECIMAL(5, 2) DEFAULT 5.00,
  `couch_tax_order_limit` INT DEFAULT 3,
  `couch_tax_order_count` INT DEFAULT 0 NOT NULL,
  `attribution_expires_at` TIMESTAMP,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_referral_tracking_referrer` (`referrer_client_id`),
  INDEX `idx_referral_tracking_referred` (`referred_client_id`),
  INDEX `idx_referral_tracking_status` (`status`),
  INDEX `idx_referral_tracking_code` (`referral_code_used`),
  UNIQUE KEY `idx_referral_tracking_unique` (`referrer_client_id`, `referred_client_id`),
  CONSTRAINT `fk_referral_tracking_referrer` FOREIGN KEY (`referrer_client_id`) REFERENCES `clients` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_referral_tracking_referred` FOREIGN KEY (`referred_client_id`) REFERENCES `clients` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_referral_tracking_first_order` FOREIGN KEY (`first_order_id`) REFERENCES `orders` (`id`)
);

-- Couch Tax Payouts
CREATE TABLE IF NOT EXISTS `couch_tax_payouts` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `referral_tracking_id` INT NOT NULL,
  `referrer_client_id` INT NOT NULL,
  `order_id` INT NOT NULL,
  `order_sequence` INT NOT NULL,
  `order_total` DECIMAL(15, 2) NOT NULL,
  `couch_tax_percent` DECIMAL(5, 2) NOT NULL,
  `payout_amount` DECIMAL(15, 2) NOT NULL,
  `status` ENUM('PENDING', 'APPROVED', 'PAID', 'VOID') NOT NULL DEFAULT 'PENDING',
  `paid_at` TIMESTAMP,
  `payment_method` VARCHAR(50),
  `payment_reference` VARCHAR(100),
  `processed_by_id` INT,
  `notes` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_couch_tax_referral` (`referral_tracking_id`),
  INDEX `idx_couch_tax_referrer` (`referrer_client_id`),
  INDEX `idx_couch_tax_order` (`order_id`),
  INDEX `idx_couch_tax_status` (`status`),
  UNIQUE KEY `idx_couch_tax_unique` (`referral_tracking_id`, `order_id`),
  CONSTRAINT `fk_couch_tax_referral` FOREIGN KEY (`referral_tracking_id`) REFERENCES `referral_tracking` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_couch_tax_referrer` FOREIGN KEY (`referrer_client_id`) REFERENCES `clients` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_couch_tax_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_couch_tax_processor` FOREIGN KEY (`processed_by_id`) REFERENCES `users` (`id`)
);

-- Referral Settings
CREATE TABLE IF NOT EXISTS `referral_settings` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `is_active` BOOLEAN DEFAULT TRUE NOT NULL,
  `default_couch_tax_percent` DECIMAL(5, 2) DEFAULT 5.00,
  `default_couch_tax_order_limit` INT DEFAULT 3,
  `min_order_value_for_couch` DECIMAL(10, 2) DEFAULT 100.00,
  `min_referrer_account_age_days` INT DEFAULT 30,
  `attribution_window_days` INT DEFAULT 30,
  `points_per_referral` INT DEFAULT 500,
  `points_per_referral_order` INT DEFAULT 100,
  `max_payout_per_month` DECIMAL(10, 2),
  `max_active_referrals` INT,
  `updated_by_id` INT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_referral_settings_updater` FOREIGN KEY (`updated_by_id`) REFERENCES `users` (`id`)
);

-- ============================================================================
-- SEED DATA: Default Achievements
-- ============================================================================

INSERT INTO `achievements` (`code`, `name`, `description`, `category`, `medal`, `icon`, `color`, `requirement_type`, `requirement_value`, `points_awarded`, `markup_discount_percent`) VALUES
-- Spending Achievements
('FIRST_PURCHASE', 'First Purchase', 'Made your first purchase', 'SPENDING', 'BRONZE', 'shopping-cart', '#CD7F32', 'ORDER_COUNT', 1, 100, 0),
('SPENT_1K', 'Big Spender', 'Spent $1,000 total', 'SPENDING', 'BRONZE', 'trending-up', '#CD7F32', 'TOTAL_SPENT', 1000, 250, 0.5),
('SPENT_5K', 'High Roller', 'Spent $5,000 total', 'SPENDING', 'SILVER', 'trending-up', '#C0C0C0', 'TOTAL_SPENT', 5000, 500, 1.0),
('SPENT_10K', 'VIP Spender', 'Spent $10,000 total', 'SPENDING', 'GOLD', 'trending-up', '#FFD700', 'TOTAL_SPENT', 10000, 1000, 1.5),
('SPENT_25K', 'Elite Member', 'Spent $25,000 total', 'SPENDING', 'PLATINUM', 'crown', '#E5E4E2', 'TOTAL_SPENT', 25000, 2500, 2.0),

-- Order Achievements
('ORDERS_10', 'Regular Customer', 'Placed 10 orders', 'ORDERS', 'BRONZE', 'target', '#CD7F32', 'ORDER_COUNT', 10, 200, 0),
('ORDERS_25', 'Frequent Buyer', 'Placed 25 orders', 'ORDERS', 'SILVER', 'target', '#C0C0C0', 'ORDER_COUNT', 25, 400, 0.5),
('ORDERS_50', 'Power Shopper', 'Placed 50 orders', 'ORDERS', 'GOLD', 'target', '#FFD700', 'ORDER_COUNT', 50, 750, 1.0),
('ORDERS_100', 'Order Master', 'Placed 100 orders', 'ORDERS', 'PLATINUM', 'trophy', '#E5E4E2', 'ORDER_COUNT', 100, 1500, 1.5),

-- Loyalty Achievements
('LOYALTY_30', 'One Month Strong', 'Account active for 30 days', 'LOYALTY', 'BRONZE', 'heart', '#CD7F32', 'ACCOUNT_AGE_DAYS', 30, 50, 0),
('LOYALTY_90', 'Quarter Year', '3 months of membership', 'LOYALTY', 'SILVER', 'heart', '#C0C0C0', 'ACCOUNT_AGE_DAYS', 90, 150, 0),
('LOYALTY_365', 'Year One', '1 year of membership', 'LOYALTY', 'GOLD', 'heart', '#FFD700', 'ACCOUNT_AGE_DAYS', 365, 500, 0.5),
('LOYALTY_730', 'Two Year Veteran', '2 years of membership', 'LOYALTY', 'PLATINUM', 'award', '#E5E4E2', 'ACCOUNT_AGE_DAYS', 730, 1000, 1.0),

-- Referral Achievements
('REFERRAL_1', 'First Referral', 'Referred your first friend', 'REFERRALS', 'BRONZE', 'users', '#CD7F32', 'REFERRAL_COUNT', 1, 250, 0),
('REFERRAL_5', 'Social Butterfly', 'Referred 5 friends', 'REFERRALS', 'SILVER', 'users', '#C0C0C0', 'REFERRAL_COUNT', 5, 500, 0.5),
('REFERRAL_10', 'Community Builder', 'Referred 10 friends', 'REFERRALS', 'GOLD', 'users', '#FFD700', 'REFERRAL_COUNT', 10, 1000, 1.0),
('REFERRAL_25', 'Ambassador', 'Referred 25 friends', 'REFERRALS', 'PLATINUM', 'crown', '#E5E4E2', 'REFERRAL_COUNT', 25, 2500, 2.0);

-- ============================================================================
-- SEED DATA: Default Rewards
-- ============================================================================

INSERT INTO `reward_catalog` (`code`, `name`, `description`, `points_cost`, `reward_type`, `reward_value`, `icon`, `color`) VALUES
('MARKUP_5', '5% Markup Discount', 'Get 5% off the markup on your next order', 500, 'MARKUP_DISCOUNT', 5.00, 'percent', '#10B981'),
('MARKUP_10', '10% Markup Discount', 'Get 10% off the markup on your next order', 1000, 'MARKUP_DISCOUNT', 10.00, 'percent', '#059669'),
('MARKUP_15', '15% Markup Discount', 'Get 15% off the markup on your next order', 2000, 'MARKUP_DISCOUNT', 15.00, 'percent', '#047857'),
('PRIORITY', 'Priority Processing', 'Get priority handling on your next 3 orders', 750, 'PRIORITY_SERVICE', 3.00, 'crown', '#8B5CF6'),
('EARLY_ACCESS', 'Early Access', 'Get early access to new products for 1 week', 1500, 'EXCLUSIVE_ACCESS', 7.00, 'star', '#F59E0B');

-- ============================================================================
-- SEED DATA: Default Referral Settings
-- ============================================================================

INSERT INTO `referral_settings` (`is_active`, `default_couch_tax_percent`, `default_couch_tax_order_limit`, `min_order_value_for_couch`, `min_referrer_account_age_days`, `attribution_window_days`, `points_per_referral`, `points_per_referral_order`)
VALUES (TRUE, 5.00, 3, 100.00, 30, 30, 500, 100);

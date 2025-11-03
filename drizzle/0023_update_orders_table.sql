-- Migration 0023: Update orders table for v2.0 enhancements
-- Add order-level adjustment and versioning fields

ALTER TABLE `orders`
ADD COLUMN `order_level_adjustment_amount` DECIMAL(10,2) DEFAULT 0 AFTER `total`,
ADD COLUMN `order_level_adjustment_type` ENUM('PERCENT', 'DOLLAR') AFTER `order_level_adjustment_amount`,
ADD COLUMN `order_level_adjustment_mode` ENUM('DISCOUNT', 'MARKUP') AFTER `order_level_adjustment_type`,
ADD COLUMN `show_adjustment_on_document` BOOLEAN DEFAULT TRUE AFTER `order_level_adjustment_mode`,
ADD COLUMN `version` INT UNSIGNED NOT NULL DEFAULT 1 AFTER `show_adjustment_on_document`;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS `idx_order_type` ON `orders` (`orderType`);
CREATE INDEX IF NOT EXISTS `idx_created_at` ON `orders` (`createdAt`);

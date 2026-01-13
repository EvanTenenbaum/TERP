-- Sprint 3 Track B: Pricing Engine Migration
-- FEAT-004-BE: Pricing & Credit Logic Backend
-- MEET-014: Variable Markups (Age/Quantity)
-- MEET-061/062: Price History

-- ============================================================================
-- Order Price Adjustments Table
-- Tracks all price adjustments made during order creation for audit trail
-- ============================================================================

CREATE TABLE IF NOT EXISTS `order_price_adjustments` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `order_id` INT NOT NULL,
  `adjustment_type` ENUM('ITEM', 'CATEGORY', 'ORDER') NOT NULL,
  `target_id` INT NULL COMMENT 'productId for ITEM type, null for CATEGORY/ORDER',
  `target_category` VARCHAR(100) NULL COMMENT 'category name for CATEGORY type',
  `adjustment_mode` ENUM('PERCENT', 'FIXED') NOT NULL,
  `adjustment_value` DECIMAL(10, 2) NOT NULL COMMENT 'negative for discount, positive for markup',
  `original_price` DECIMAL(15, 2) NULL,
  `adjusted_price` DECIMAL(15, 2) NULL,
  `reason` TEXT NULL,
  `notes` TEXT NULL COMMENT 'MEET-038: Notes on product pricing',
  `adjusted_by` INT NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`adjusted_by`) REFERENCES `users`(`id`),
  INDEX `idx_opa_order` (`order_id`),
  INDEX `idx_opa_type` (`adjustment_type`),
  INDEX `idx_opa_category` (`target_category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- Variable Markup Rules Table
-- MEET-014: Configurable age-based and quantity-based markup/discount rules
-- ============================================================================

CREATE TABLE IF NOT EXISTS `variable_markup_rules` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `profile_id` INT NULL COMMENT 'Links to pricing profile',
  `rule_type` ENUM('AGE', 'QUANTITY') NOT NULL,
  `threshold_min` INT NOT NULL DEFAULT 0 COMMENT 'For AGE: days threshold, For QUANTITY: units threshold',
  `threshold_max` INT NULL COMMENT 'null = unlimited',
  `adjustment_mode` ENUM('PERCENT', 'FIXED') NOT NULL,
  `adjustment_value` DECIMAL(10, 2) NOT NULL,
  `category` VARCHAR(100) NULL COMMENT 'Optional category filter',
  `is_active` BOOLEAN DEFAULT TRUE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`profile_id`) REFERENCES `pricing_profiles`(`id`) ON DELETE CASCADE,
  INDEX `idx_vmr_profile` (`profile_id`),
  INDEX `idx_vmr_type` (`rule_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- Credit Override Requests Table
-- FEAT-004-BE: Tracks credit limit override requests and approvals
-- ============================================================================

CREATE TABLE IF NOT EXISTS `credit_override_requests` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `order_id` INT NOT NULL,
  `client_id` INT NOT NULL,
  `requested_amount` DECIMAL(15, 2) NOT NULL,
  `available_credit` DECIMAL(15, 2) NOT NULL,
  `shortfall` DECIMAL(15, 2) NOT NULL,
  `reason` TEXT NOT NULL,
  `status` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
  `requested_by` INT NOT NULL,
  `reviewed_by` INT NULL,
  `review_notes` TEXT NULL,
  `requested_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `reviewed_at` TIMESTAMP NULL,
  FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`requested_by`) REFERENCES `users`(`id`),
  FOREIGN KEY (`reviewed_by`) REFERENCES `users`(`id`),
  INDEX `idx_cor_order` (`order_id`),
  INDEX `idx_cor_client` (`client_id`),
  INDEX `idx_cor_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- Price History Table
-- MEET-061/062: Tracks historical prices for products by client
-- ============================================================================

CREATE TABLE IF NOT EXISTS `price_history` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `product_id` INT NOT NULL,
  `batch_id` INT NULL,
  `client_id` INT NULL COMMENT 'null for general price history',
  `order_id` INT NULL,
  `transaction_type` ENUM('PURCHASE', 'SALE') NOT NULL,
  `unit_price` DECIMAL(15, 4) NOT NULL,
  `quantity` DECIMAL(15, 4) NOT NULL,
  `total_price` DECIMAL(15, 2) NOT NULL,
  `supplier_id` INT NULL COMMENT 'Supplier info for PURCHASE transactions',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`batch_id`) REFERENCES `batches`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`supplier_id`) REFERENCES `clients`(`id`) ON DELETE SET NULL,
  INDEX `idx_ph_product` (`product_id`),
  INDEX `idx_ph_client` (`client_id`),
  INDEX `idx_ph_supplier` (`supplier_id`),
  INDEX `idx_ph_type` (`transaction_type`),
  INDEX `idx_ph_created` (`created_at`),
  INDEX `idx_ph_product_client` (`product_id`, `client_id`, `transaction_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- Orders Table Additions
-- FEAT-004-BE: Credit Override fields
-- ============================================================================

ALTER TABLE `orders`
  ADD COLUMN IF NOT EXISTS `credit_override_approved` BOOLEAN DEFAULT FALSE AFTER `related_sample_request_id`,
  ADD COLUMN IF NOT EXISTS `credit_override_by` INT NULL AFTER `credit_override_approved`,
  ADD COLUMN IF NOT EXISTS `credit_override_reason` TEXT NULL AFTER `credit_override_by`,
  ADD COLUMN IF NOT EXISTS `credit_override_request_id` INT NULL AFTER `credit_override_reason`;

-- Add foreign key constraint for credit_override_by (if not exists)
-- Note: Some MySQL versions don't support IF NOT EXISTS for constraints
-- This is a safe ALTER that will fail silently if constraint already exists
-- ALTER TABLE `orders` ADD CONSTRAINT `fk_orders_credit_override_by`
--   FOREIGN KEY (`credit_override_by`) REFERENCES `users`(`id`);

-- ============================================================================
-- Seed default variable markup rules for standard pricing profiles
-- ============================================================================

-- Example: Age-based discount (products > 30 days old get 5% off)
INSERT IGNORE INTO `variable_markup_rules`
  (`profile_id`, `rule_type`, `threshold_min`, `threshold_max`, `adjustment_mode`, `adjustment_value`, `is_active`)
SELECT
  p.id, 'AGE', 30, 60, 'PERCENT', -5.00, TRUE
FROM `pricing_profiles` p
WHERE p.name = 'Standard'
LIMIT 1;

-- Example: Quantity discount (10+ units get 3% off)
INSERT IGNORE INTO `variable_markup_rules`
  (`profile_id`, `rule_type`, `threshold_min`, `threshold_max`, `adjustment_mode`, `adjustment_value`, `is_active`)
SELECT
  p.id, 'QUANTITY', 10, 50, 'PERCENT', -3.00, TRUE
FROM `pricing_profiles` p
WHERE p.name = 'Standard'
LIMIT 1;

-- Example: Bulk quantity discount (50+ units get 7% off)
INSERT IGNORE INTO `variable_markup_rules`
  (`profile_id`, `rule_type`, `threshold_min`, `threshold_max`, `adjustment_mode`, `adjustment_value`, `is_active`)
SELECT
  p.id, 'QUANTITY', 50, NULL, 'PERCENT', -7.00, TRUE
FROM `pricing_profiles` p
WHERE p.name = 'Standard'
LIMIT 1;

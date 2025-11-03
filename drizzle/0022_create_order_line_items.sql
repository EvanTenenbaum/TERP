-- Migration 0022: Create order_line_items table
-- Normalized storage for order line items with COGS and margin tracking

CREATE TABLE IF NOT EXISTS `order_line_items` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `order_id` INT NOT NULL,
  `batch_id` INT NOT NULL,
  `product_display_name` VARCHAR(255),
  `quantity` DECIMAL(10,2) NOT NULL,
  `cogs_per_unit` DECIMAL(10,2) NOT NULL,
  `original_cogs_per_unit` DECIMAL(10,2) NOT NULL,
  `is_cogs_overridden` BOOLEAN NOT NULL DEFAULT FALSE,
  `cogs_override_reason` TEXT,
  `margin_percent` DECIMAL(5,2) NOT NULL,
  `margin_dollar` DECIMAL(10,2) NOT NULL,
  `is_margin_overridden` BOOLEAN NOT NULL DEFAULT FALSE,
  `margin_source` ENUM('CUSTOMER_PROFILE', 'DEFAULT', 'MANUAL') NOT NULL,
  `unit_price` DECIMAL(10,2) NOT NULL,
  `line_total` DECIMAL(10,2) NOT NULL,
  `is_sample` BOOLEAN NOT NULL DEFAULT FALSE,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_order_id` (`order_id`),
  INDEX `idx_batch_id` (`batch_id`),
  CONSTRAINT `fk_order_line_items_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Migration 0025: Create pricing_defaults table
-- Default margin percentages by product category

CREATE TABLE IF NOT EXISTS `pricing_defaults` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `category` VARCHAR(100) NOT NULL UNIQUE,
  `default_margin_percent` DECIMAL(5,2) NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_category` (`category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Migration 0025: Create pricing_defaults table
-- Default margin percentages by product category

CREATE TABLE `pricing_defaults` (
  `id` int AUTO_INCREMENT NOT NULL,
  `category` varchar(100) NOT NULL,
  `default_margin_percent` decimal(5,2) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `pricing_defaults_id` PRIMARY KEY(`id`),
  CONSTRAINT `pricing_defaults_category_unique` UNIQUE(`category`)
);--> statement-breakpoint

CREATE INDEX `idx_pricing_defaults_category` ON `pricing_defaults` (`category`);

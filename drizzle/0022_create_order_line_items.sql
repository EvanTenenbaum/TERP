-- Migration 0022: Create order_line_items table
-- Normalized storage for order line items with COGS and margin tracking

CREATE TABLE `order_line_items` (
  `id` int AUTO_INCREMENT NOT NULL,
  `order_id` int NOT NULL,
  `batch_id` int NOT NULL,
  `product_display_name` varchar(255),
  `quantity` decimal(10,2) NOT NULL,
  `cogs_per_unit` decimal(10,2) NOT NULL,
  `original_cogs_per_unit` decimal(10,2) NOT NULL,
  `is_cogs_overridden` tinyint(1) NOT NULL DEFAULT 0,
  `cogs_override_reason` text,
  `margin_percent` decimal(5,2) NOT NULL,
  `margin_dollar` decimal(10,2) NOT NULL,
  `is_margin_overridden` tinyint(1) NOT NULL DEFAULT 0,
  `margin_source` enum('CUSTOMER_PROFILE','DEFAULT','MANUAL') NOT NULL,
  `unit_price` decimal(10,2) NOT NULL,
  `line_total` decimal(10,2) NOT NULL,
  `is_sample` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `order_line_items_id` PRIMARY KEY(`id`)
);--> statement-breakpoint

CREATE INDEX `idx_order_line_items_order_id` ON `order_line_items` (`order_id`);--> statement-breakpoint
CREATE INDEX `idx_order_line_items_batch_id` ON `order_line_items` (`batch_id`);--> statement-breakpoint

ALTER TABLE `order_line_items` ADD CONSTRAINT `fk_order_line_items_order` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

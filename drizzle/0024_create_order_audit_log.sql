-- Migration 0024: Create order_audit_log table
-- Complete audit trail for order changes

CREATE TABLE `order_audit_log` (
  `id` int AUTO_INCREMENT NOT NULL,
  `order_id` int NOT NULL,
  `action` varchar(50) NOT NULL,
  `changes` json,
  `user_id` int,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `order_audit_log_id` PRIMARY KEY(`id`)
);--> statement-breakpoint

CREATE INDEX `idx_order_audit_log_order_id` ON `order_audit_log` (`order_id`);--> statement-breakpoint
CREATE INDEX `idx_order_audit_log_created_at` ON `order_audit_log` (`created_at`);--> statement-breakpoint

ALTER TABLE `order_audit_log` ADD CONSTRAINT `fk_order_audit_log_order` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

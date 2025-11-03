-- Migration 0024: Create order_audit_log table
-- Complete audit trail for order changes

CREATE TABLE IF NOT EXISTS `order_audit_log` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `order_id` INT NOT NULL,
  `action` VARCHAR(50) NOT NULL,
  `changes` JSON,
  `user_id` INT,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_order_id` (`order_id`),
  INDEX `idx_created_at` (`created_at`),
  CONSTRAINT `fk_order_audit_log_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

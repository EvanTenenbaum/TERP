-- FEAT-009 through FEAT-015 Implementation Migration
-- This migration adds schema support for:
-- FEAT-009: Product Subcategories (Enhanced subcategory support)
-- FEAT-010: Default Warehouse Selection (User preferences)
-- FEAT-011: COGS Logic Integration (Already exists, minor enhancements)
-- FEAT-012: Grade Field Optional (Organization settings)
-- FEAT-013: Packaged Unit Type (Unit types table)
-- FEAT-014: Expected Delivery Field (Hidden via feature flag)
-- FEAT-015: Finance Status Customization (Custom finance statuses)

-- ============================================================================
-- FEAT-010: User Preferences Table (Default Warehouse)
-- ============================================================================
CREATE TABLE IF NOT EXISTS `user_preferences` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `default_warehouse_id` INT,
  `default_location_id` INT,
  `show_cogs_in_orders` TINYINT(1) NOT NULL DEFAULT 1,
  `show_margin_in_orders` TINYINT(1) NOT NULL DEFAULT 1,
  `show_grade_field` TINYINT(1) NOT NULL DEFAULT 1,
  `hide_expected_delivery` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_user_preferences_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_preferences_warehouse` FOREIGN KEY (`default_warehouse_id`) REFERENCES `locations`(`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_user_preferences_location` FOREIGN KEY (`default_location_id`) REFERENCES `locations`(`id`) ON DELETE SET NULL,
  UNIQUE KEY `unique_user_preferences` (`user_id`)
);

CREATE INDEX `idx_user_preferences_user_id` ON `user_preferences`(`user_id`);

-- ============================================================================
-- FEAT-012 & FEAT-014: Organization Settings Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS `organization_settings` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `setting_key` VARCHAR(100) NOT NULL,
  `setting_value` JSON,
  `setting_type` ENUM('BOOLEAN', 'STRING', 'NUMBER', 'JSON') NOT NULL DEFAULT 'STRING',
  `description` TEXT,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `unique_setting_key` (`setting_key`)
);

-- Insert default organization settings
INSERT INTO `organization_settings` (`setting_key`, `setting_value`, `setting_type`, `description`) VALUES
  ('grade_field_enabled', 'true', 'BOOLEAN', 'Show/hide the grade field in product and batch forms'),
  ('grade_field_required', 'false', 'BOOLEAN', 'Make grade field required when enabled'),
  ('expected_delivery_enabled', 'true', 'BOOLEAN', 'Show/hide expected delivery date in purchase orders'),
  ('cogs_display_mode', '"VISIBLE"', 'STRING', 'COGS display mode: VISIBLE, HIDDEN, or ADMIN_ONLY'),
  ('default_unit_of_measure', '"EA"', 'STRING', 'Default unit of measure for new products'),
  ('packaged_unit_enabled', 'true', 'BOOLEAN', 'Enable PACKAGED as a unit type option')
ON DUPLICATE KEY UPDATE `updated_at` = CURRENT_TIMESTAMP;

-- ============================================================================
-- FEAT-013: Unit Types Table (Packaged support)
-- ============================================================================
CREATE TABLE IF NOT EXISTS `unit_types` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `code` VARCHAR(20) NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `description` TEXT,
  `category` ENUM('WEIGHT', 'COUNT', 'VOLUME', 'PACKAGED') NOT NULL,
  `conversion_factor` DECIMAL(15, 6) DEFAULT 1.000000,
  `base_unit_code` VARCHAR(20),
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `sort_order` INT NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `unique_unit_code` (`code`)
);

-- Insert default unit types including PACKAGED
INSERT INTO `unit_types` (`code`, `name`, `description`, `category`, `conversion_factor`, `base_unit_code`, `sort_order`) VALUES
  ('EA', 'Each', 'Individual unit count', 'COUNT', 1, NULL, 10),
  ('G', 'Gram', 'Weight in grams', 'WEIGHT', 1, NULL, 20),
  ('OZ', 'Ounce', 'Weight in ounces (28.3495g)', 'WEIGHT', 28.3495, 'G', 30),
  ('LB', 'Pound', 'Weight in pounds (453.592g)', 'WEIGHT', 453.592, 'G', 40),
  ('KG', 'Kilogram', 'Weight in kilograms (1000g)', 'WEIGHT', 1000, 'G', 50),
  ('ML', 'Milliliter', 'Volume in milliliters', 'VOLUME', 1, NULL, 60),
  ('L', 'Liter', 'Volume in liters (1000ml)', 'VOLUME', 1000, 'ML', 70),
  ('PKG', 'Package', 'Pre-packaged unit (variable contents)', 'PACKAGED', 1, NULL, 80),
  ('BOX', 'Box', 'Box container (packaged)', 'PACKAGED', 1, NULL, 90),
  ('CASE', 'Case', 'Case container (packaged)', 'PACKAGED', 1, NULL, 100)
ON DUPLICATE KEY UPDATE `updated_at` = CURRENT_TIMESTAMP;

-- ============================================================================
-- FEAT-015: Custom Finance Statuses Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS `custom_finance_statuses` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `entity_type` ENUM('INVOICE', 'ORDER', 'PAYMENT', 'BILL', 'CREDIT') NOT NULL,
  `status_code` VARCHAR(50) NOT NULL,
  `status_label` VARCHAR(100) NOT NULL,
  `description` TEXT,
  `color` VARCHAR(7) DEFAULT '#6B7280',
  `sort_order` INT NOT NULL DEFAULT 0,
  `is_default` TINYINT(1) NOT NULL DEFAULT 0,
  `is_terminal` TINYINT(1) NOT NULL DEFAULT 0,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `unique_entity_status` (`entity_type`, `status_code`)
);

CREATE INDEX `idx_custom_finance_statuses_entity` ON `custom_finance_statuses`(`entity_type`);
CREATE INDEX `idx_custom_finance_statuses_active` ON `custom_finance_statuses`(`is_active`);

-- Insert default finance statuses for customization
INSERT INTO `custom_finance_statuses` (`entity_type`, `status_code`, `status_label`, `description`, `color`, `sort_order`, `is_default`, `is_terminal`) VALUES
  -- Invoice statuses
  ('INVOICE', 'DRAFT', 'Draft', 'Invoice is being prepared', '#9CA3AF', 10, 1, 0),
  ('INVOICE', 'SENT', 'Sent', 'Invoice has been sent to customer', '#3B82F6', 20, 0, 0),
  ('INVOICE', 'VIEWED', 'Viewed', 'Customer has viewed the invoice', '#8B5CF6', 30, 0, 0),
  ('INVOICE', 'PARTIAL', 'Partially Paid', 'Partial payment received', '#F59E0B', 40, 0, 0),
  ('INVOICE', 'PAID', 'Paid', 'Invoice fully paid', '#10B981', 50, 0, 1),
  ('INVOICE', 'OVERDUE', 'Overdue', 'Payment is past due', '#EF4444', 60, 0, 0),
  ('INVOICE', 'VOID', 'Void', 'Invoice cancelled/voided', '#6B7280', 70, 0, 1),
  -- Order statuses
  ('ORDER', 'PENDING', 'Pending', 'Order awaiting payment confirmation', '#F59E0B', 10, 1, 0),
  ('ORDER', 'PARTIAL', 'Partial Payment', 'Order has partial payment', '#8B5CF6', 20, 0, 0),
  ('ORDER', 'PAID', 'Paid', 'Order fully paid', '#10B981', 30, 0, 0),
  ('ORDER', 'OVERDUE', 'Overdue', 'Payment is past due', '#EF4444', 40, 0, 0),
  ('ORDER', 'CANCELLED', 'Cancelled', 'Order has been cancelled', '#6B7280', 50, 0, 1),
  -- Payment statuses
  ('PAYMENT', 'PENDING', 'Pending', 'Payment processing', '#F59E0B', 10, 1, 0),
  ('PAYMENT', 'COMPLETED', 'Completed', 'Payment completed successfully', '#10B981', 20, 0, 1),
  ('PAYMENT', 'FAILED', 'Failed', 'Payment failed', '#EF4444', 30, 0, 1),
  ('PAYMENT', 'REFUNDED', 'Refunded', 'Payment has been refunded', '#8B5CF6', 40, 0, 1)
ON DUPLICATE KEY UPDATE `updated_at` = CURRENT_TIMESTAMP;

-- ============================================================================
-- FEAT-009: Enhance subcategory support with parent category display
-- ============================================================================
-- Add display_name to subcategories for hierarchical display
ALTER TABLE `subcategories`
  ADD COLUMN IF NOT EXISTS `display_name` VARCHAR(255) GENERATED ALWAYS AS (
    CONCAT((SELECT name FROM categories WHERE id = categoryId), ' > ', name)
  ) VIRTUAL;

-- Note: The products table already has subcategory field defined in schema.ts
-- This ensures proper hierarchical categorization is available

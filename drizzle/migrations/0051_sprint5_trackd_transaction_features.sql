-- Sprint 5 Track D: Transaction & Product Features Migration
-- MEET-017, MEET-018, MEET-035, MEET-032, MEET-070, MEET-009, MEET-019, MEET-036

-- ============================================================================
-- 5.D.1: MEET-017 - Invoice Disputes
-- ============================================================================

CREATE TABLE IF NOT EXISTS `invoice_disputes` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `invoice_id` INT NOT NULL,
  `client_id` INT NOT NULL,
  `dispute_number` VARCHAR(50) NOT NULL UNIQUE,
  `dispute_status` ENUM('OPEN', 'UNDER_REVIEW', 'RESOLVED', 'REJECTED', 'ESCALATED') NOT NULL DEFAULT 'OPEN',
  `dispute_reason` TEXT NOT NULL,
  `disputed_amount` DECIMAL(15,2) NOT NULL,
  `resolution_notes` TEXT,
  `adjustment_amount` DECIMAL(15,2),
  `resolved_at` TIMESTAMP NULL,
  `resolved_by` INT,
  `created_by` INT NOT NULL,
  `assigned_to` INT,
  `deleted_at` TIMESTAMP NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  INDEX `idx_invoice_disputes_invoice` (`invoice_id`),
  INDEX `idx_invoice_disputes_client` (`client_id`),
  INDEX `idx_invoice_disputes_status` (`dispute_status`),
  INDEX `idx_invoice_disputes_created` (`created_at`),
  CONSTRAINT `fk_disputes_invoice` FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_disputes_client` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_disputes_creator` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_disputes_resolver` FOREIGN KEY (`resolved_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_disputes_assignee` FOREIGN KEY (`assigned_to`) REFERENCES `users`(`id`) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS `dispute_attachments` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `dispute_id` INT NOT NULL,
  `filename` VARCHAR(255) NOT NULL,
  `file_url` VARCHAR(1000) NOT NULL,
  `file_type` VARCHAR(100),
  `file_size` INT,
  `uploaded_by` INT NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  INDEX `idx_dispute_attachments_dispute` (`dispute_id`),
  CONSTRAINT `fk_attachments_dispute` FOREIGN KEY (`dispute_id`) REFERENCES `invoice_disputes`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_attachments_uploader` FOREIGN KEY (`uploaded_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS `dispute_notes` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `dispute_id` INT NOT NULL,
  `note` TEXT NOT NULL,
  `is_internal` BOOLEAN DEFAULT TRUE NOT NULL,
  `created_by` INT NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  INDEX `idx_dispute_notes_dispute` (`dispute_id`),
  INDEX `idx_dispute_notes_created` (`created_at`),
  CONSTRAINT `fk_notes_dispute` FOREIGN KEY (`dispute_id`) REFERENCES `invoice_disputes`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_notes_creator` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT
);

-- ============================================================================
-- 5.D.2: MEET-018 - Transaction Fees Per Client
-- ============================================================================

CREATE TABLE IF NOT EXISTS `client_transaction_fees` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `client_id` INT NOT NULL UNIQUE,
  `fee_type` ENUM('PERCENTAGE', 'FLAT') NOT NULL DEFAULT 'PERCENTAGE',
  `fee_value` DECIMAL(10,4) NOT NULL DEFAULT 0,
  `min_fee` DECIMAL(10,2),
  `max_fee` DECIMAL(10,2),
  `apply_to_all_orders` BOOLEAN DEFAULT TRUE NOT NULL,
  `is_active` BOOLEAN DEFAULT TRUE NOT NULL,
  `notes` TEXT,
  `deleted_at` TIMESTAMP NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  `created_by` INT,
  INDEX `idx_client_fees_client` (`client_id`),
  INDEX `idx_client_fees_active` (`is_active`),
  CONSTRAINT `fk_client_fees_client` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_client_fees_creator` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS `order_transaction_fees` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `order_id` INT NOT NULL,
  `client_fee_config_id` INT,
  `fee_type` ENUM('PERCENTAGE', 'FLAT') NOT NULL,
  `fee_rate` DECIMAL(10,4) NOT NULL,
  `order_subtotal` DECIMAL(15,2) NOT NULL,
  `fee_amount` DECIMAL(15,2) NOT NULL,
  `is_overridden` BOOLEAN DEFAULT FALSE NOT NULL,
  `override_reason` TEXT,
  `overridden_by` INT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  INDEX `idx_order_fees_order` (`order_id`),
  INDEX `idx_order_fees_client_config` (`client_fee_config_id`),
  CONSTRAINT `fk_order_fees_order` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_order_fees_config` FOREIGN KEY (`client_fee_config_id`) REFERENCES `client_transaction_fees`(`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_order_fees_overrider` FOREIGN KEY (`overridden_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
);

-- ============================================================================
-- 5.D.3: MEET-035 - Payment Terms
-- ============================================================================

CREATE TABLE IF NOT EXISTS `client_payment_terms_config` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `client_id` INT NOT NULL UNIQUE,
  `default_payment_terms` ENUM('CASH', 'COD', 'NET_7', 'NET_15', 'NET_30', 'NET_45', 'NET_60', 'CONSIGNMENT', 'INSTALLMENT', 'PREPAID') NOT NULL DEFAULT 'NET_30',
  `consignment_due_days` INT DEFAULT 60,
  `consignment_limit` DECIMAL(15,2),
  `early_payment_discount` DECIMAL(5,2),
  `early_payment_days` INT,
  `late_fee_percent` DECIMAL(5,2),
  `late_fee_grace_days` INT DEFAULT 0,
  `show_terms_on_invoice` BOOLEAN DEFAULT TRUE NOT NULL,
  `custom_terms_text` TEXT,
  `notes` TEXT,
  `deleted_at` TIMESTAMP NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  INDEX `idx_payment_terms_client` (`client_id`),
  CONSTRAINT `fk_payment_terms_client` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE CASCADE
);

-- ============================================================================
-- 5.D.4: MEET-032 - Customizable Categories
-- ============================================================================

CREATE TABLE IF NOT EXISTS `product_categories` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `slug` VARCHAR(100) NOT NULL UNIQUE,
  `description` TEXT,
  `parent_id` INT,
  `level` INT NOT NULL DEFAULT 0,
  `path` VARCHAR(500),
  `sort_order` INT DEFAULT 0 NOT NULL,
  `icon_name` VARCHAR(50),
  `color` VARCHAR(20),
  `is_active` BOOLEAN DEFAULT TRUE NOT NULL,
  `metadata` JSON,
  `deleted_at` TIMESTAMP NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  INDEX `idx_product_categories_parent` (`parent_id`),
  INDEX `idx_product_categories_level` (`level`),
  INDEX `idx_product_categories_slug` (`slug`),
  INDEX `idx_product_categories_sort` (`sort_order`),
  CONSTRAINT `fk_categories_parent` FOREIGN KEY (`parent_id`) REFERENCES `product_categories`(`id`) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS `product_category_assignments` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `product_id` INT NOT NULL,
  `category_id` INT NOT NULL,
  `is_primary` BOOLEAN DEFAULT FALSE NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  INDEX `idx_pca_product` (`product_id`),
  INDEX `idx_pca_category` (`category_id`),
  UNIQUE KEY `unique_product_category` (`product_id`, `category_id`),
  CONSTRAINT `fk_pca_product` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_pca_category` FOREIGN KEY (`category_id`) REFERENCES `product_categories`(`id`) ON DELETE CASCADE
);

-- ============================================================================
-- 5.D.5: MEET-070 - Product Grades
-- ============================================================================

CREATE TABLE IF NOT EXISTS `product_grades` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `code` VARCHAR(20) NOT NULL UNIQUE,
  `name` VARCHAR(100) NOT NULL,
  `description` TEXT,
  `sort_order` INT NOT NULL DEFAULT 0,
  `color` VARCHAR(20),
  `pricing_multiplier` DECIMAL(5,4) DEFAULT 1.0000,
  `suggested_markup_percent` DECIMAL(5,2),
  `is_active` BOOLEAN DEFAULT TRUE NOT NULL,
  `deleted_at` TIMESTAMP NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  INDEX `idx_product_grades_code` (`code`),
  INDEX `idx_product_grades_sort` (`sort_order`)
);

-- Seed default grades
INSERT INTO `product_grades` (`code`, `name`, `description`, `sort_order`, `color`, `pricing_multiplier`, `suggested_markup_percent`) VALUES
('AAAA', 'Quad A', 'Premium top-shelf quality', 1, '#FFD700', 1.5000, 40.00),
('AAA', 'Triple A', 'High quality', 2, '#C0C0C0', 1.3000, 35.00),
('AA', 'Double A', 'Above average quality', 3, '#CD7F32', 1.1500, 30.00),
('A', 'Single A', 'Standard quality', 4, '#4CAF50', 1.0000, 25.00),
('B', 'B Grade', 'Below average quality', 5, '#2196F3', 0.8500, 20.00),
('C', 'C Grade', 'Economy grade', 6, '#9E9E9E', 0.7000, 15.00)
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- ============================================================================
-- 5.D.6: MEET-009 - Service Billing
-- ============================================================================

CREATE TABLE IF NOT EXISTS `service_definitions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `code` VARCHAR(50) NOT NULL UNIQUE,
  `description` TEXT,
  `service_type` ENUM('SHIPPING', 'HANDLING', 'CONSULTING', 'PROCESSING', 'STORAGE', 'PACKAGING', 'TESTING', 'INSURANCE', 'RUSH_FEE', 'OTHER') NOT NULL,
  `default_price` DECIMAL(15,2) NOT NULL DEFAULT 0,
  `pricing_unit` VARCHAR(50) DEFAULT 'each',
  `is_taxable` BOOLEAN DEFAULT TRUE NOT NULL,
  `tax_rate` DECIMAL(5,2),
  `is_active` BOOLEAN DEFAULT TRUE NOT NULL,
  `deleted_at` TIMESTAMP NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  INDEX `idx_service_definitions_code` (`code`),
  INDEX `idx_service_definitions_type` (`service_type`),
  INDEX `idx_service_definitions_active` (`is_active`)
);

-- Seed default service definitions
INSERT INTO `service_definitions` (`name`, `code`, `description`, `service_type`, `default_price`, `pricing_unit`) VALUES
('Standard Shipping', 'SHIP-STD', 'Standard ground shipping', 'SHIPPING', 25.00, 'each'),
('Express Shipping', 'SHIP-EXP', 'Express 2-day shipping', 'SHIPPING', 50.00, 'each'),
('Overnight Shipping', 'SHIP-OVN', 'Next-day delivery', 'SHIPPING', 100.00, 'each'),
('Packaging Fee', 'PKG-STD', 'Custom packaging service', 'PACKAGING', 10.00, 'per unit'),
('Storage Fee', 'STOR-DAY', 'Daily storage charge', 'STORAGE', 5.00, 'per day'),
('Rush Processing', 'RUSH-FEE', 'Priority processing fee', 'RUSH_FEE', 75.00, 'each'),
('Consulting', 'CONSULT', 'Hourly consulting rate', 'CONSULTING', 150.00, 'per hour'),
('Lab Testing', 'TEST-LAB', 'Laboratory testing fee', 'TESTING', 200.00, 'per sample')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

CREATE TABLE IF NOT EXISTS `order_service_charges` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `order_id` INT NOT NULL,
  `service_definition_id` INT,
  `service_name` VARCHAR(100) NOT NULL,
  `service_type` ENUM('SHIPPING', 'HANDLING', 'CONSULTING', 'PROCESSING', 'STORAGE', 'PACKAGING', 'TESTING', 'INSURANCE', 'RUSH_FEE', 'OTHER') NOT NULL,
  `description` TEXT,
  `quantity` DECIMAL(10,2) NOT NULL DEFAULT 1,
  `unit_price` DECIMAL(15,2) NOT NULL,
  `total_price` DECIMAL(15,2) NOT NULL,
  `is_taxable` BOOLEAN DEFAULT TRUE NOT NULL,
  `tax_amount` DECIMAL(15,2) DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `created_by` INT,
  INDEX `idx_order_services_order` (`order_id`),
  INDEX `idx_order_services_definition` (`service_definition_id`),
  INDEX `idx_order_services_type` (`service_type`),
  CONSTRAINT `fk_order_services_order` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_order_services_def` FOREIGN KEY (`service_definition_id`) REFERENCES `service_definitions`(`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_order_services_creator` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS `service_invoices` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `invoice_number` VARCHAR(50) NOT NULL UNIQUE,
  `client_id` INT NOT NULL,
  `invoice_date` DATE NOT NULL,
  `due_date` DATE NOT NULL,
  `subtotal` DECIMAL(15,2) NOT NULL,
  `tax_amount` DECIMAL(15,2) DEFAULT 0,
  `total_amount` DECIMAL(15,2) NOT NULL,
  `amount_paid` DECIMAL(15,2) DEFAULT 0,
  `amount_due` DECIMAL(15,2) NOT NULL,
  `status` ENUM('DRAFT', 'SENT', 'PARTIAL', 'PAID', 'OVERDUE', 'VOID') NOT NULL DEFAULT 'DRAFT',
  `notes` TEXT,
  `deleted_at` TIMESTAMP NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  `created_by` INT NOT NULL,
  INDEX `idx_service_invoices_client` (`client_id`),
  INDEX `idx_service_invoices_status` (`status`),
  INDEX `idx_service_invoices_date` (`invoice_date`),
  CONSTRAINT `fk_service_invoices_client` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_service_invoices_creator` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS `service_invoice_line_items` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `service_invoice_id` INT NOT NULL,
  `service_definition_id` INT,
  `service_name` VARCHAR(100) NOT NULL,
  `service_type` ENUM('SHIPPING', 'HANDLING', 'CONSULTING', 'PROCESSING', 'STORAGE', 'PACKAGING', 'TESTING', 'INSURANCE', 'RUSH_FEE', 'OTHER') NOT NULL,
  `description` TEXT,
  `quantity` DECIMAL(10,2) NOT NULL DEFAULT 1,
  `unit_price` DECIMAL(15,2) NOT NULL,
  `line_total` DECIMAL(15,2) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  INDEX `idx_sili_invoice` (`service_invoice_id`),
  CONSTRAINT `fk_sili_invoice` FOREIGN KEY (`service_invoice_id`) REFERENCES `service_invoices`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_sili_service_def` FOREIGN KEY (`service_definition_id`) REFERENCES `service_definitions`(`id`) ON DELETE SET NULL
);

-- ============================================================================
-- 5.D.7: MEET-019 - Crypto Payment Tracking
-- ============================================================================

CREATE TABLE IF NOT EXISTS `crypto_payments` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `payment_id` INT,
  `client_id` INT,
  `crypto_currency` ENUM('BTC', 'ETH', 'USDT', 'USDC', 'SOL', 'XRP', 'OTHER') NOT NULL,
  `wallet_address` VARCHAR(255),
  `transaction_hash` VARCHAR(255),
  `crypto_amount` DECIMAL(20,8) NOT NULL,
  `usd_amount` DECIMAL(15,2) NOT NULL,
  `exchange_rate` DECIMAL(20,8) NOT NULL,
  `network_fee` DECIMAL(20,8),
  `confirmations` INT DEFAULT 0,
  `is_confirmed` BOOLEAN DEFAULT FALSE NOT NULL,
  `confirmed_at` TIMESTAMP NULL,
  `payment_date` TIMESTAMP NOT NULL,
  `notes` TEXT,
  `deleted_at` TIMESTAMP NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  INDEX `idx_crypto_payments_payment` (`payment_id`),
  INDEX `idx_crypto_payments_client` (`client_id`),
  INDEX `idx_crypto_payments_currency` (`crypto_currency`),
  INDEX `idx_crypto_payments_hash` (`transaction_hash`),
  CONSTRAINT `fk_crypto_payments_client` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS `client_crypto_wallets` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `client_id` INT NOT NULL,
  `crypto_currency` ENUM('BTC', 'ETH', 'USDT', 'USDC', 'SOL', 'XRP', 'OTHER') NOT NULL,
  `wallet_address` VARCHAR(255) NOT NULL,
  `wallet_label` VARCHAR(100),
  `is_default` BOOLEAN DEFAULT FALSE NOT NULL,
  `is_verified` BOOLEAN DEFAULT FALSE NOT NULL,
  `deleted_at` TIMESTAMP NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  INDEX `idx_client_wallets_client` (`client_id`),
  INDEX `idx_client_wallets_currency` (`crypto_currency`),
  UNIQUE KEY `unique_client_wallet` (`client_id`, `crypto_currency`, `wallet_address`),
  CONSTRAINT `fk_client_wallets_client` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE CASCADE
);

-- ============================================================================
-- 5.D.8: MEET-036 - Installment Payments
-- ============================================================================

CREATE TABLE IF NOT EXISTS `installment_plans` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `invoice_id` INT,
  `order_id` INT,
  `client_id` INT NOT NULL,
  `plan_name` VARCHAR(100),
  `total_amount` DECIMAL(15,2) NOT NULL,
  `number_of_installments` INT NOT NULL,
  `frequency` ENUM('WEEKLY', 'BIWEEKLY', 'MONTHLY', 'CUSTOM') NOT NULL DEFAULT 'MONTHLY',
  `first_payment_date` DATE NOT NULL,
  `down_payment_amount` DECIMAL(15,2) DEFAULT 0,
  `total_paid` DECIMAL(15,2) DEFAULT 0,
  `remaining_balance` DECIMAL(15,2) NOT NULL,
  `status` ENUM('ACTIVE', 'COMPLETED', 'DEFAULTED', 'CANCELLED') NOT NULL DEFAULT 'ACTIVE',
  `interest_rate` DECIMAL(5,2) DEFAULT 0,
  `late_fee_amount` DECIMAL(10,2) DEFAULT 0,
  `notes` TEXT,
  `deleted_at` TIMESTAMP NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  `created_by` INT NOT NULL,
  INDEX `idx_installment_plans_invoice` (`invoice_id`),
  INDEX `idx_installment_plans_order` (`order_id`),
  INDEX `idx_installment_plans_client` (`client_id`),
  INDEX `idx_installment_plans_status` (`status`),
  CONSTRAINT `fk_installment_plans_invoice` FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_installment_plans_order` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_installment_plans_client` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_installment_plans_creator` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS `installments` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `plan_id` INT NOT NULL,
  `installment_number` INT NOT NULL,
  `due_date` DATE NOT NULL,
  `amount_due` DECIMAL(15,2) NOT NULL,
  `amount_paid` DECIMAL(15,2) DEFAULT 0,
  `paid_date` DATE,
  `payment_id` INT,
  `status` ENUM('SCHEDULED', 'PENDING', 'PAID', 'PARTIAL', 'OVERDUE', 'CANCELLED') NOT NULL DEFAULT 'SCHEDULED',
  `late_fee_applied` DECIMAL(10,2) DEFAULT 0,
  `reminder_sent_at` TIMESTAMP NULL,
  `notes` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  INDEX `idx_installments_plan` (`plan_id`),
  INDEX `idx_installments_due_date` (`due_date`),
  INDEX `idx_installments_status` (`status`),
  CONSTRAINT `fk_installments_plan` FOREIGN KEY (`plan_id`) REFERENCES `installment_plans`(`id`) ON DELETE CASCADE
);

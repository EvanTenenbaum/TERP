-- FEAT-009 through FEAT-015 Implementation Migration
-- FEAT-009: Product Subcategories (Enhanced subcategory support)
-- FEAT-010: Default Warehouse Selection (User preferences)
-- FEAT-012: Grade Field Optional (Organization settings)
-- FEAT-013: Packaged Unit Type (Unit types table)
-- FEAT-015: Finance Status Customization (Custom finance statuses)

CREATE TABLE `user_preferences` (
  `id` int AUTO_INCREMENT NOT NULL,
  `user_id` int NOT NULL,
  `default_warehouse_id` int,
  `default_location_id` int,
  `show_cogs_in_orders` tinyint(1) NOT NULL DEFAULT 1,
  `show_margin_in_orders` tinyint(1) NOT NULL DEFAULT 1,
  `show_grade_field` tinyint(1) NOT NULL DEFAULT 1,
  `hide_expected_delivery` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `user_preferences_id` PRIMARY KEY(`id`),
  CONSTRAINT `unique_user_preferences` UNIQUE(`user_id`)
);--> statement-breakpoint

CREATE TABLE `organization_settings` (
  `id` int AUTO_INCREMENT NOT NULL,
  `setting_key` varchar(100) NOT NULL,
  `setting_value` json,
  `setting_type` enum('BOOLEAN','STRING','NUMBER','JSON') NOT NULL DEFAULT 'STRING',
  `description` text,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `organization_settings_id` PRIMARY KEY(`id`),
  CONSTRAINT `unique_setting_key` UNIQUE(`setting_key`)
);--> statement-breakpoint

CREATE TABLE `unit_types` (
  `id` int AUTO_INCREMENT NOT NULL,
  `code` varchar(20) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` text,
  `category` enum('WEIGHT','COUNT','VOLUME','PACKAGED') NOT NULL,
  `conversion_factor` decimal(15,6) DEFAULT 1.000000,
  `base_unit_code` varchar(20),
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `sort_order` int NOT NULL DEFAULT 0,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `unit_types_id` PRIMARY KEY(`id`),
  CONSTRAINT `unique_unit_code` UNIQUE(`code`)
);--> statement-breakpoint

CREATE TABLE `custom_finance_statuses` (
  `id` int AUTO_INCREMENT NOT NULL,
  `entity_type` enum('INVOICE','ORDER','PAYMENT','BILL','CREDIT') NOT NULL,
  `status_code` varchar(50) NOT NULL,
  `status_label` varchar(100) NOT NULL,
  `description` text,
  `color` varchar(7) DEFAULT '#6B7280',
  `sort_order` int NOT NULL DEFAULT 0,
  `is_default` tinyint(1) NOT NULL DEFAULT 0,
  `is_terminal` tinyint(1) NOT NULL DEFAULT 0,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `custom_finance_statuses_id` PRIMARY KEY(`id`),
  CONSTRAINT `unique_entity_status` UNIQUE(`entity_type`, `status_code`)
);--> statement-breakpoint

ALTER TABLE `user_preferences` ADD CONSTRAINT `fk_user_preferences_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;--> statement-breakpoint
ALTER TABLE `user_preferences` ADD CONSTRAINT `fk_user_preferences_warehouse` FOREIGN KEY (`default_warehouse_id`) REFERENCES `locations`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;--> statement-breakpoint
ALTER TABLE `user_preferences` ADD CONSTRAINT `fk_user_preferences_location` FOREIGN KEY (`default_location_id`) REFERENCES `locations`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;--> statement-breakpoint

CREATE INDEX `idx_user_preferences_user_id` ON `user_preferences`(`user_id`);--> statement-breakpoint
CREATE INDEX `idx_custom_finance_statuses_entity` ON `custom_finance_statuses`(`entity_type`);--> statement-breakpoint
CREATE INDEX `idx_custom_finance_statuses_active` ON `custom_finance_statuses`(`is_active`);--> statement-breakpoint

-- Note: Seed data for organization_settings, unit_types, and custom_finance_statuses
-- should be handled via application-level seeding scripts (scripts/seed)
-- to avoid issues with Drizzle's migrator handling INSERT statements.

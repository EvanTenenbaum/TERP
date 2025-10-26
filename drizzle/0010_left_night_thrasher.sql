CREATE TABLE `pricing_profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`rules` json NOT NULL,
	`created_by` int,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pricing_profiles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pricing_rules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`adjustment_type` enum('PERCENT_MARKUP','PERCENT_MARKDOWN','DOLLAR_MARKUP','DOLLAR_MARKDOWN') NOT NULL,
	`adjustment_value` decimal(10,2) NOT NULL,
	`conditions` json NOT NULL,
	`logic_type` enum('AND','OR') DEFAULT 'AND',
	`priority` int DEFAULT 0,
	`is_active` boolean DEFAULT true,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pricing_rules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sales_sheet_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`client_id` int NOT NULL,
	`created_by` int NOT NULL,
	`template_id` int,
	`items` json NOT NULL,
	`total_value` decimal(15,2) NOT NULL,
	`item_count` int NOT NULL,
	`notes` text,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `sales_sheet_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sales_sheet_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`client_id` int,
	`filters` json NOT NULL,
	`selected_items` json NOT NULL,
	`column_visibility` json NOT NULL,
	`created_by` int NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	`last_used_at` timestamp,
	CONSTRAINT `sales_sheet_templates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `pricing_profiles` ADD CONSTRAINT `pricing_profiles_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sales_sheet_history` ADD CONSTRAINT `sales_sheet_history_client_id_clients_id_fk` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sales_sheet_history` ADD CONSTRAINT `sales_sheet_history_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sales_sheet_history` ADD CONSTRAINT `sales_sheet_history_template_id_sales_sheet_templates_id_fk` FOREIGN KEY (`template_id`) REFERENCES `sales_sheet_templates`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sales_sheet_templates` ADD CONSTRAINT `sales_sheet_templates_client_id_clients_id_fk` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sales_sheet_templates` ADD CONSTRAINT `sales_sheet_templates_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_priority` ON `pricing_rules` (`priority`);--> statement-breakpoint
CREATE INDEX `idx_client_id` ON `sales_sheet_history` (`client_id`);--> statement-breakpoint
CREATE INDEX `idx_created_by` ON `sales_sheet_history` (`created_by`);--> statement-breakpoint
CREATE INDEX `idx_created_at` ON `sales_sheet_history` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_client_id` ON `sales_sheet_templates` (`client_id`);--> statement-breakpoint
CREATE INDEX `idx_created_by` ON `sales_sheet_templates` (`created_by`);
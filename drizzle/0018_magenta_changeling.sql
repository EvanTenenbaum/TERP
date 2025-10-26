CREATE TABLE `alert_configurations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`alert_type` enum('LOW_STOCK','EXPIRING_BATCH','OVERDUE_PAYMENT','HIGH_VALUE_ORDER','SAMPLE_CONVERSION','CUSTOM') NOT NULL,
	`target_type` enum('GLOBAL','PRODUCT','BATCH','CLIENT','CATEGORY') NOT NULL,
	`target_id` int,
	`threshold_value` decimal(15,4) NOT NULL,
	`threshold_operator` enum('LESS_THAN','GREATER_THAN','EQUALS') NOT NULL,
	`delivery_method` enum('DASHBOARD','EMAIL','BOTH') NOT NULL DEFAULT 'DASHBOARD',
	`email_address` varchar(255),
	`is_active` boolean DEFAULT true,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `alert_configurations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `intake_session_batches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`intake_session_id` int NOT NULL,
	`batch_id` int NOT NULL,
	`received_qty` decimal(15,4) NOT NULL,
	`unit_cost` decimal(15,4) NOT NULL,
	`total_cost` decimal(15,4) NOT NULL,
	`internal_notes` text,
	`vendor_notes` text,
	`cogs_agreement` text,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `intake_session_batches_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `intake_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`session_number` varchar(50) NOT NULL,
	`vendor_id` int NOT NULL,
	`status` enum('IN_PROGRESS','COMPLETED','CANCELLED') NOT NULL DEFAULT 'IN_PROGRESS',
	`receive_date` date NOT NULL,
	`received_by` int NOT NULL,
	`paymentTerms` enum('COD','NET_7','NET_15','NET_30','CONSIGNMENT','PARTIAL') NOT NULL,
	`payment_due_date` date,
	`total_amount` decimal(15,2) DEFAULT '0',
	`amount_paid` decimal(15,2) DEFAULT '0',
	`internal_notes` text,
	`vendor_notes` text,
	`receipt_generated` boolean DEFAULT false,
	`receipt_generated_at` timestamp,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`completed_at` timestamp,
	CONSTRAINT `intake_sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `intake_sessions_session_number_unique` UNIQUE(`session_number`)
);
--> statement-breakpoint
CREATE TABLE `recurring_orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`client_id` int NOT NULL,
	`frequency` enum('DAILY','WEEKLY','BIWEEKLY','MONTHLY','QUARTERLY') NOT NULL,
	`day_of_week` int,
	`day_of_month` int,
	`order_template` json NOT NULL,
	`status` enum('ACTIVE','PAUSED','CANCELLED') NOT NULL DEFAULT 'ACTIVE',
	`start_date` date NOT NULL,
	`end_date` date,
	`last_generated_date` date,
	`next_generation_date` date NOT NULL,
	`notify_client` boolean DEFAULT true,
	`notify_email` varchar(255),
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`created_by` int NOT NULL,
	CONSTRAINT `recurring_orders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `alert_configurations` ADD CONSTRAINT `alert_configurations_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `intake_session_batches` ADD CONSTRAINT `intake_session_batches_intake_session_id_intake_sessions_id_fk` FOREIGN KEY (`intake_session_id`) REFERENCES `intake_sessions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `intake_session_batches` ADD CONSTRAINT `intake_session_batches_batch_id_batches_id_fk` FOREIGN KEY (`batch_id`) REFERENCES `batches`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `intake_sessions` ADD CONSTRAINT `intake_sessions_vendor_id_clients_id_fk` FOREIGN KEY (`vendor_id`) REFERENCES `clients`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `intake_sessions` ADD CONSTRAINT `intake_sessions_received_by_users_id_fk` FOREIGN KEY (`received_by`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `recurring_orders` ADD CONSTRAINT `recurring_orders_client_id_clients_id_fk` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `recurring_orders` ADD CONSTRAINT `recurring_orders_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_user_id` ON `alert_configurations` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_alert_type` ON `alert_configurations` (`alert_type`);--> statement-breakpoint
CREATE INDEX `idx_is_active` ON `alert_configurations` (`is_active`);--> statement-breakpoint
CREATE INDEX `idx_intake_session_id` ON `intake_session_batches` (`intake_session_id`);--> statement-breakpoint
CREATE INDEX `idx_batch_id` ON `intake_session_batches` (`batch_id`);--> statement-breakpoint
CREATE INDEX `idx_vendor_id` ON `intake_sessions` (`vendor_id`);--> statement-breakpoint
CREATE INDEX `idx_status` ON `intake_sessions` (`status`);--> statement-breakpoint
CREATE INDEX `idx_receive_date` ON `intake_sessions` (`receive_date`);--> statement-breakpoint
CREATE INDEX `idx_client_id` ON `recurring_orders` (`client_id`);--> statement-breakpoint
CREATE INDEX `idx_status` ON `recurring_orders` (`status`);--> statement-breakpoint
CREATE INDEX `idx_next_generation_date` ON `recurring_orders` (`next_generation_date`);
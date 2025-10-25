CREATE TABLE `client_credit_limits` (
	`id` int AUTO_INCREMENT NOT NULL,
	`client_id` int NOT NULL,
	`credit_limit` decimal(15,2) NOT NULL DEFAULT '0',
	`current_exposure` decimal(15,2) NOT NULL DEFAULT '0',
	`utilization_percent` decimal(5,2) NOT NULL DEFAULT '0',
	`credit_health_score` decimal(5,2) NOT NULL DEFAULT '0',
	`base_capacity` decimal(15,2) NOT NULL DEFAULT '0',
	`risk_modifier` decimal(5,4) NOT NULL DEFAULT '1',
	`directional_factor` decimal(5,4) NOT NULL DEFAULT '1',
	`mode` enum('LEARNING','ACTIVE') NOT NULL DEFAULT 'LEARNING',
	`confidence_score` decimal(5,2) NOT NULL DEFAULT '0',
	`data_readiness` decimal(5,2) NOT NULL DEFAULT '0',
	`trend` enum('IMPROVING','STABLE','WORSENING') NOT NULL DEFAULT 'STABLE',
	`last_calculated` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `client_credit_limits_id` PRIMARY KEY(`id`),
	CONSTRAINT `client_credit_limits_client_id_unique` UNIQUE(`client_id`)
);
--> statement-breakpoint
CREATE TABLE `credit_audit_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`client_id` int NOT NULL,
	`event_type` enum('LIMIT_CALCULATED','LIMIT_INCREASED','LIMIT_DECREASED','MODE_CHANGED','MANUAL_OVERRIDE','EXPOSURE_EXCEEDED') NOT NULL,
	`old_value` decimal(15,2),
	`new_value` decimal(15,2),
	`change_percent` decimal(5,2),
	`reason` text,
	`metadata` json,
	`triggered_by` int,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `credit_audit_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `credit_signal_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`client_id` int NOT NULL,
	`revenue_momentum` decimal(5,2) NOT NULL DEFAULT '0',
	`cash_collection_strength` decimal(5,2) NOT NULL DEFAULT '0',
	`profitability_quality` decimal(5,2) NOT NULL DEFAULT '0',
	`debt_aging_risk` decimal(5,2) NOT NULL DEFAULT '0',
	`repayment_velocity` decimal(5,2) NOT NULL DEFAULT '0',
	`tenure_depth` decimal(5,2) NOT NULL DEFAULT '0',
	`revenue_momentum_trend` int NOT NULL DEFAULT 0,
	`cash_collection_trend` int NOT NULL DEFAULT 0,
	`profitability_trend` int NOT NULL DEFAULT 0,
	`debt_aging_trend` int NOT NULL DEFAULT 0,
	`repayment_velocity_trend` int NOT NULL DEFAULT 0,
	`calculation_metadata` json,
	`calculated_at` timestamp DEFAULT (now()),
	CONSTRAINT `credit_signal_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `credit_system_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`revenue_momentum_weight` int NOT NULL DEFAULT 20,
	`cash_collection_weight` int NOT NULL DEFAULT 25,
	`profitability_weight` int NOT NULL DEFAULT 20,
	`debt_aging_weight` int NOT NULL DEFAULT 15,
	`repayment_velocity_weight` int NOT NULL DEFAULT 10,
	`tenure_weight` int NOT NULL DEFAULT 10,
	`learning_mode_threshold` int NOT NULL DEFAULT 3,
	`min_invoices_for_activation` int NOT NULL DEFAULT 15,
	`directional_sensitivity` decimal(5,4) NOT NULL DEFAULT '0.1',
	`revenue_multiplier` decimal(5,2) NOT NULL DEFAULT '2',
	`margin_multiplier` decimal(5,2) NOT NULL DEFAULT '2.5',
	`global_min_limit` decimal(15,2) NOT NULL DEFAULT '1000',
	`global_max_limit` decimal(15,2) NOT NULL DEFAULT '1000000',
	`updated_by` int,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `credit_system_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `client_credit_limits` ADD CONSTRAINT `client_credit_limits_client_id_clients_id_fk` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `credit_audit_log` ADD CONSTRAINT `credit_audit_log_client_id_clients_id_fk` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `credit_audit_log` ADD CONSTRAINT `credit_audit_log_triggered_by_users_id_fk` FOREIGN KEY (`triggered_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `credit_signal_history` ADD CONSTRAINT `credit_signal_history_client_id_clients_id_fk` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `credit_system_settings` ADD CONSTRAINT `credit_system_settings_updated_by_users_id_fk` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_client_id` ON `client_credit_limits` (`client_id`);--> statement-breakpoint
CREATE INDEX `idx_client_id` ON `credit_audit_log` (`client_id`);--> statement-breakpoint
CREATE INDEX `idx_created_at` ON `credit_audit_log` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_client_id` ON `credit_signal_history` (`client_id`);--> statement-breakpoint
CREATE INDEX `idx_calculated_at` ON `credit_signal_history` (`calculated_at`);
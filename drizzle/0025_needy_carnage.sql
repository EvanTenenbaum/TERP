CREATE TABLE `credit_visibility_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`location_id` int,
	`show_credit_in_client_list` boolean NOT NULL DEFAULT true,
	`show_credit_banner_in_orders` boolean NOT NULL DEFAULT true,
	`show_credit_widget_in_profile` boolean NOT NULL DEFAULT true,
	`show_signal_breakdown` boolean NOT NULL DEFAULT true,
	`show_audit_log` boolean NOT NULL DEFAULT true,
	`creditEnforcementMode` enum('WARNING','SOFT_BLOCK','HARD_BLOCK') NOT NULL DEFAULT 'WARNING',
	`warning_threshold_percent` int NOT NULL DEFAULT 75,
	`alert_threshold_percent` int NOT NULL DEFAULT 90,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `credit_visibility_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `clients` ADD `credit_limit` decimal(15,2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE `clients` ADD `credit_limit_updated_at` timestamp;--> statement-breakpoint
ALTER TABLE `clients` ADD `creditLimitSource` enum('CALCULATED','MANUAL') DEFAULT 'CALCULATED';--> statement-breakpoint
ALTER TABLE `clients` ADD `credit_limit_override_reason` text;--> statement-breakpoint
CREATE INDEX `idx_location_id` ON `credit_visibility_settings` (`location_id`);
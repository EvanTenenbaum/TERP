CREATE TABLE `vendorNotes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`vendorId` int NOT NULL,
	`userId` int NOT NULL,
	`note` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `vendorNotes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `client_catalog_views` (
	`id` int AUTO_INCREMENT NOT NULL,
	`client_id` int NOT NULL,
	`name` varchar(100) NOT NULL,
	`filters` json NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `client_catalog_views_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `client_draft_interests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`client_id` int NOT NULL,
	`batch_id` int NOT NULL,
	`added_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `client_draft_interests_id` PRIMARY KEY(`id`),
	CONSTRAINT `idx_client_draft_unique` UNIQUE(`client_id`,`batch_id`)
);
--> statement-breakpoint
CREATE TABLE `client_interest_list_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`interest_list_id` int NOT NULL,
	`batch_id` int NOT NULL,
	`item_name` varchar(255) NOT NULL,
	`category` varchar(100),
	`subcategory` varchar(100),
	`price_at_interest` decimal(10,2) NOT NULL,
	`quantity_at_interest` decimal(10,2),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `client_interest_list_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `client_interest_lists` (
	`id` int AUTO_INCREMENT NOT NULL,
	`client_id` int NOT NULL,
	`submitted_at` timestamp NOT NULL DEFAULT (now()),
	`status` varchar(20) NOT NULL DEFAULT 'NEW',
	`total_items` int NOT NULL,
	`total_value` decimal(10,2) NOT NULL,
	`reviewed_at` timestamp,
	`reviewed_by` int,
	`converted_to_order_id` int,
	`converted_at` timestamp,
	`converted_by` int,
	`notes` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `client_interest_lists_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `client_price_alerts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`client_id` int NOT NULL,
	`batch_id` int NOT NULL,
	`target_price` decimal(10,2) NOT NULL,
	`active` boolean NOT NULL DEFAULT true,
	`triggered_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`expires_at` timestamp NOT NULL,
	CONSTRAINT `client_price_alerts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `vendors` ADD `paymentTerms` varchar(100);--> statement-breakpoint
ALTER TABLE `vip_portal_configurations` ADD `module_live_catalog_enabled` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `vendorNotes` ADD CONSTRAINT `vendorNotes_vendorId_vendors_id_fk` FOREIGN KEY (`vendorId`) REFERENCES `vendors`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vendorNotes` ADD CONSTRAINT `vendorNotes_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `client_catalog_views` ADD CONSTRAINT `client_catalog_views_client_id_clients_id_fk` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `client_draft_interests` ADD CONSTRAINT `client_draft_interests_client_id_clients_id_fk` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `client_interest_list_items` ADD CONSTRAINT `cli_interest_items_list_id_fk` FOREIGN KEY (`interest_list_id`) REFERENCES `client_interest_lists`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `client_interest_lists` ADD CONSTRAINT `client_interest_lists_client_id_clients_id_fk` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `client_price_alerts` ADD CONSTRAINT `client_price_alerts_client_id_clients_id_fk` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_client_catalog_views_client_id` ON `client_catalog_views` (`client_id`);--> statement-breakpoint
CREATE INDEX `idx_client_draft_interests_client_id` ON `client_draft_interests` (`client_id`);--> statement-breakpoint
CREATE INDEX `idx_client_draft_interests_batch_id` ON `client_draft_interests` (`batch_id`);--> statement-breakpoint
CREATE INDEX `idx_interest_list_items_list_id` ON `client_interest_list_items` (`interest_list_id`);--> statement-breakpoint
CREATE INDEX `idx_interest_list_items_batch_id` ON `client_interest_list_items` (`batch_id`);--> statement-breakpoint
CREATE INDEX `idx_client_interest_lists_client_id` ON `client_interest_lists` (`client_id`);--> statement-breakpoint
CREATE INDEX `idx_client_interest_lists_status` ON `client_interest_lists` (`status`);--> statement-breakpoint
CREATE INDEX `idx_client_price_alerts_client_id` ON `client_price_alerts` (`client_id`);--> statement-breakpoint
CREATE INDEX `idx_client_price_alerts_batch_id` ON `client_price_alerts` (`batch_id`);--> statement-breakpoint
CREATE INDEX `idx_client_price_alerts_active` ON `client_price_alerts` (`active`);--> statement-breakpoint
ALTER TABLE `vip_portal_configurations` DROP COLUMN `module_leaderboard_enabled`;--> statement-breakpoint
ALTER TABLE `vip_portal_configurations` DROP COLUMN `leaderboard_type`;--> statement-breakpoint
ALTER TABLE `vip_portal_configurations` DROP COLUMN `leaderboard_display_mode`;--> statement-breakpoint
ALTER TABLE `vip_portal_configurations` DROP COLUMN `leaderboard_show_suggestions`;--> statement-breakpoint
ALTER TABLE `vip_portal_configurations` DROP COLUMN `leaderboard_minimum_clients`;
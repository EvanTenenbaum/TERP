CREATE TABLE `client_communications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`client_id` int NOT NULL,
	`communicationType` enum('CALL','EMAIL','MEETING','NOTE') NOT NULL,
	`subject` varchar(255) NOT NULL,
	`notes` text,
	`communicated_at` timestamp NOT NULL,
	`logged_by` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `client_communications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `client_needs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`client_id` int NOT NULL,
	`strain` varchar(255),
	`category` varchar(100),
	`subcategory` varchar(100),
	`grade` varchar(50),
	`quantity_min` decimal(15,4),
	`quantity_max` decimal(15,4),
	`price_max` decimal(15,2),
	`status` enum('ACTIVE','FULFILLED','EXPIRED','CANCELLED') NOT NULL DEFAULT 'ACTIVE',
	`priority` enum('LOW','MEDIUM','HIGH','URGENT') NOT NULL DEFAULT 'MEDIUM',
	`needed_by` date,
	`expires_at` timestamp,
	`fulfilled_at` timestamp,
	`notes` text,
	`internal_notes` text,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`created_by` int NOT NULL,
	CONSTRAINT `client_needs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `inventoryViews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`filters` json NOT NULL,
	`createdBy` int,
	`isShared` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `inventoryViews_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `match_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`client_need_id` int,
	`client_id` int NOT NULL,
	`inventory_batch_id` int,
	`vendor_supply_id` int,
	`historical_order_id` int,
	`match_type` enum('EXACT','CLOSE','HISTORICAL') NOT NULL,
	`confidence_score` decimal(5,2) NOT NULL,
	`match_reasons` json NOT NULL,
	`user_action` enum('CREATED_QUOTE','CONTACTED_VENDOR','DISMISSED','NONE'),
	`actioned_at` timestamp,
	`actioned_by` int,
	`resulted_in_sale` boolean DEFAULT false,
	`sale_order_id` int,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `match_records_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `order_status_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`order_id` int NOT NULL,
	`fulfillmentStatus` enum('PENDING','PACKED','SHIPPED') NOT NULL DEFAULT 'PENDING',
	`changed_by` int NOT NULL,
	`changed_at` timestamp NOT NULL DEFAULT (now()),
	`notes` text,
	CONSTRAINT `order_status_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `returns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`order_id` int NOT NULL,
	`items` json NOT NULL,
	`returnReason` enum('DEFECTIVE','WRONG_ITEM','NOT_AS_DESCRIBED','CUSTOMER_CHANGED_MIND','OTHER') NOT NULL,
	`notes` text,
	`processed_by` int NOT NULL,
	`processed_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `returns_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `vendor_supply` (
	`id` int AUTO_INCREMENT NOT NULL,
	`vendor_id` int NOT NULL,
	`strain` varchar(255),
	`category` varchar(100),
	`subcategory` varchar(100),
	`grade` varchar(50),
	`quantity_available` decimal(15,4) NOT NULL,
	`unit_price` decimal(15,2),
	`status` enum('AVAILABLE','RESERVED','PURCHASED','EXPIRED') NOT NULL DEFAULT 'AVAILABLE',
	`available_until` timestamp,
	`reserved_at` timestamp,
	`purchased_at` timestamp,
	`notes` text,
	`internal_notes` text,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`created_by` int NOT NULL,
	CONSTRAINT `vendor_supply_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `inventoryMovements` MODIFY COLUMN `inventoryMovementType` enum('INTAKE','SALE','RETURN','REFUND_RETURN','ADJUSTMENT','QUARANTINE','RELEASE_FROM_QUARANTINE','DISPOSAL','TRANSFER','SAMPLE') NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `is_draft` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `client_need_id` int;--> statement-breakpoint
ALTER TABLE `orders` ADD `fulfillmentStatus` enum('PENDING','PACKED','SHIPPED') DEFAULT 'PENDING';--> statement-breakpoint
ALTER TABLE `orders` ADD `packed_at` timestamp;--> statement-breakpoint
ALTER TABLE `orders` ADD `packed_by` int;--> statement-breakpoint
ALTER TABLE `orders` ADD `shipped_at` timestamp;--> statement-breakpoint
ALTER TABLE `orders` ADD `shipped_by` int;--> statement-breakpoint
ALTER TABLE `orders` ADD `confirmed_at` timestamp;--> statement-breakpoint
ALTER TABLE `client_communications` ADD CONSTRAINT `client_communications_client_id_clients_id_fk` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `client_communications` ADD CONSTRAINT `client_communications_logged_by_users_id_fk` FOREIGN KEY (`logged_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `client_needs` ADD CONSTRAINT `client_needs_client_id_clients_id_fk` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `client_needs` ADD CONSTRAINT `client_needs_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inventoryViews` ADD CONSTRAINT `inventoryViews_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `match_records` ADD CONSTRAINT `match_records_client_need_id_client_needs_id_fk` FOREIGN KEY (`client_need_id`) REFERENCES `client_needs`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `match_records` ADD CONSTRAINT `match_records_client_id_clients_id_fk` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `match_records` ADD CONSTRAINT `match_records_inventory_batch_id_batches_id_fk` FOREIGN KEY (`inventory_batch_id`) REFERENCES `batches`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `match_records` ADD CONSTRAINT `match_records_vendor_supply_id_vendor_supply_id_fk` FOREIGN KEY (`vendor_supply_id`) REFERENCES `vendor_supply`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `match_records` ADD CONSTRAINT `match_records_historical_order_id_orders_id_fk` FOREIGN KEY (`historical_order_id`) REFERENCES `orders`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `match_records` ADD CONSTRAINT `match_records_actioned_by_users_id_fk` FOREIGN KEY (`actioned_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `match_records` ADD CONSTRAINT `match_records_sale_order_id_orders_id_fk` FOREIGN KEY (`sale_order_id`) REFERENCES `orders`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `order_status_history` ADD CONSTRAINT `order_status_history_order_id_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `order_status_history` ADD CONSTRAINT `order_status_history_changed_by_users_id_fk` FOREIGN KEY (`changed_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `returns` ADD CONSTRAINT `returns_order_id_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `returns` ADD CONSTRAINT `returns_processed_by_users_id_fk` FOREIGN KEY (`processed_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vendor_supply` ADD CONSTRAINT `vendor_supply_vendor_id_vendors_id_fk` FOREIGN KEY (`vendor_id`) REFERENCES `vendors`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vendor_supply` ADD CONSTRAINT `vendor_supply_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_client_id` ON `client_communications` (`client_id`);--> statement-breakpoint
CREATE INDEX `idx_communicated_at` ON `client_communications` (`communicated_at`);--> statement-breakpoint
CREATE INDEX `idx_type` ON `client_communications` (`communicationType`);--> statement-breakpoint
CREATE INDEX `idx_client_id` ON `client_needs` (`client_id`);--> statement-breakpoint
CREATE INDEX `idx_status` ON `client_needs` (`status`);--> statement-breakpoint
CREATE INDEX `idx_strain` ON `client_needs` (`strain`);--> statement-breakpoint
CREATE INDEX `idx_category` ON `client_needs` (`category`);--> statement-breakpoint
CREATE INDEX `idx_priority` ON `client_needs` (`priority`);--> statement-breakpoint
CREATE INDEX `idx_inventory_views_created_by` ON `inventoryViews` (`createdBy`);--> statement-breakpoint
CREATE INDEX `idx_client_need_id` ON `match_records` (`client_need_id`);--> statement-breakpoint
CREATE INDEX `idx_client_id` ON `match_records` (`client_id`);--> statement-breakpoint
CREATE INDEX `idx_match_type` ON `match_records` (`match_type`);--> statement-breakpoint
CREATE INDEX `idx_user_action` ON `match_records` (`user_action`);--> statement-breakpoint
CREATE INDEX `idx_order_id` ON `order_status_history` (`order_id`);--> statement-breakpoint
CREATE INDEX `idx_changed_at` ON `order_status_history` (`changed_at`);--> statement-breakpoint
CREATE INDEX `idx_order_id` ON `returns` (`order_id`);--> statement-breakpoint
CREATE INDEX `idx_processed_at` ON `returns` (`processed_at`);--> statement-breakpoint
CREATE INDEX `idx_vendor_id` ON `vendor_supply` (`vendor_id`);--> statement-breakpoint
CREATE INDEX `idx_status` ON `vendor_supply` (`status`);--> statement-breakpoint
CREATE INDEX `idx_strain` ON `vendor_supply` (`strain`);--> statement-breakpoint
CREATE INDEX `idx_category` ON `vendor_supply` (`category`);--> statement-breakpoint
ALTER TABLE `orders` ADD CONSTRAINT `orders_packed_by_users_id_fk` FOREIGN KEY (`packed_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `orders` ADD CONSTRAINT `orders_shipped_by_users_id_fk` FOREIGN KEY (`shipped_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_is_draft` ON `orders` (`is_draft`);--> statement-breakpoint
CREATE INDEX `idx_fulfillment_status` ON `orders` (`fulfillmentStatus`);
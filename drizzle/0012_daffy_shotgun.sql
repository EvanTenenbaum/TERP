CREATE TABLE `cogs_rules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`condition_field` enum('QUANTITY','TOTAL_VALUE','CLIENT_TIER','PAYMENT_TERMS'),
	`condition_operator` enum('GT','GTE','LT','LTE','EQ'),
	`condition_value` decimal(15,4),
	`adjustment_type` enum('PERCENTAGE','FIXED_AMOUNT','USE_MIN','USE_MAX'),
	`adjustment_value` decimal(10,4),
	`priority` int DEFAULT 0,
	`is_active` boolean DEFAULT true,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `cogs_rules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `creditApplications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`creditId` int NOT NULL,
	`invoiceId` int NOT NULL,
	`amountApplied` varchar(20) NOT NULL,
	`appliedDate` timestamp NOT NULL,
	`notes` text,
	`appliedBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `creditApplications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `credits` (
	`id` int AUTO_INCREMENT NOT NULL,
	`creditNumber` varchar(50) NOT NULL,
	`clientId` int NOT NULL,
	`transactionId` int,
	`creditAmount` varchar(20) NOT NULL,
	`amountUsed` varchar(20) NOT NULL DEFAULT '0',
	`amountRemaining` varchar(20) NOT NULL,
	`creditReason` varchar(100),
	`expirationDate` timestamp,
	`creditStatus` enum('ACTIVE','PARTIALLY_USED','FULLY_USED','EXPIRED','VOID') NOT NULL DEFAULT 'ACTIVE',
	`notes` text,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `credits_id` PRIMARY KEY(`id`),
	CONSTRAINT `credits_creditNumber_unique` UNIQUE(`creditNumber`)
);
--> statement-breakpoint
CREATE TABLE `inventoryMovements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`batchId` int NOT NULL,
	`inventoryMovementType` enum('INTAKE','SALE','REFUND_RETURN','ADJUSTMENT','QUARANTINE','RELEASE_FROM_QUARANTINE','DISPOSAL','TRANSFER','SAMPLE') NOT NULL,
	`quantityChange` varchar(20) NOT NULL,
	`quantityBefore` varchar(20) NOT NULL,
	`quantityAfter` varchar(20) NOT NULL,
	`referenceType` varchar(50),
	`referenceId` int,
	`reason` text,
	`performedBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `inventoryMovements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`order_number` varchar(50) NOT NULL,
	`orderType` enum('QUOTE','SALE') NOT NULL,
	`client_id` int NOT NULL,
	`items` json NOT NULL,
	`subtotal` decimal(15,2) NOT NULL,
	`tax` decimal(15,2) DEFAULT '0',
	`discount` decimal(15,2) DEFAULT '0',
	`total` decimal(15,2) NOT NULL,
	`total_cogs` decimal(15,2),
	`total_margin` decimal(15,2),
	`avg_margin_percent` decimal(5,2),
	`valid_until` date,
	`quoteStatus` enum('DRAFT','SENT','VIEWED','ACCEPTED','REJECTED','EXPIRED','CONVERTED'),
	`paymentTerms` enum('COD','NET_7','NET_15','NET_30','CONSIGNMENT','PARTIAL') NOT NULL,
	`cash_payment` decimal(15,2) DEFAULT '0',
	`due_date` date,
	`saleStatus` enum('PENDING','PARTIAL','PAID','OVERDUE','CANCELLED'),
	`invoice_id` int,
	`converted_from_order_id` int,
	`converted_at` timestamp,
	`notes` text,
	`created_by` int NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `orders_order_number_unique` UNIQUE(`order_number`)
);
--> statement-breakpoint
CREATE TABLE `paymentMethods` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(50) NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text,
	`isActive` int NOT NULL DEFAULT 1,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `paymentMethods_id` PRIMARY KEY(`id`),
	CONSTRAINT `paymentMethods_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `sample_inventory_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`batch_id` int NOT NULL,
	`order_id` int,
	`quantity` decimal(15,4) NOT NULL,
	`action` enum('ALLOCATED','RELEASED','CONSUMED') NOT NULL,
	`notes` text,
	`created_by` int,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `sample_inventory_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `transactionLinks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`parentTransactionId` int NOT NULL,
	`childTransactionId` int NOT NULL,
	`transactionLinkType` enum('REFUND_OF','PAYMENT_FOR','CREDIT_APPLIED_TO','CONVERTED_FROM','PARTIAL_OF','RELATED_TO') NOT NULL,
	`linkAmount` varchar(20),
	`notes` text,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `transactionLinks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`transactionNumber` varchar(50) NOT NULL,
	`transactionType` enum('INVOICE','PAYMENT','REFUND','CREDIT','QUOTE','ORDER','SALE') NOT NULL,
	`clientId` int NOT NULL,
	`transactionDate` timestamp NOT NULL,
	`amount` varchar(20) NOT NULL,
	`transactionStatus` enum('DRAFT','PENDING','CONFIRMED','COMPLETED','PARTIAL','PAID','OVERDUE','VOID','WRITTEN_OFF') NOT NULL,
	`notes` text,
	`metadata` text,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `transactions_id` PRIMARY KEY(`id`),
	CONSTRAINT `transactions_transactionNumber_unique` UNIQUE(`transactionNumber`)
);
--> statement-breakpoint
ALTER TABLE `batches` ADD `sampleQty` varchar(20) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE `clients` ADD `cogsAdjustmentType` enum('NONE','PERCENTAGE','FIXED_AMOUNT') DEFAULT 'NONE';--> statement-breakpoint
ALTER TABLE `clients` ADD `cogs_adjustment_value` decimal(10,4) DEFAULT '0';--> statement-breakpoint
ALTER TABLE `clients` ADD `auto_defer_consignment` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `orders` ADD CONSTRAINT `orders_client_id_clients_id_fk` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `orders` ADD CONSTRAINT `orders_converted_from_order_id_orders_id_fk` FOREIGN KEY (`converted_from_order_id`) REFERENCES `orders`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `orders` ADD CONSTRAINT `orders_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sample_inventory_log` ADD CONSTRAINT `sample_inventory_log_batch_id_batches_id_fk` FOREIGN KEY (`batch_id`) REFERENCES `batches`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sample_inventory_log` ADD CONSTRAINT `sample_inventory_log_order_id_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sample_inventory_log` ADD CONSTRAINT `sample_inventory_log_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_priority` ON `cogs_rules` (`priority`);--> statement-breakpoint
CREATE INDEX `idx_is_active` ON `cogs_rules` (`is_active`);--> statement-breakpoint
CREATE INDEX `idx_credit_applications_credit` ON `creditApplications` (`creditId`);--> statement-breakpoint
CREATE INDEX `idx_credit_applications_invoice` ON `creditApplications` (`invoiceId`);--> statement-breakpoint
CREATE INDEX `idx_credits_client_id` ON `credits` (`clientId`);--> statement-breakpoint
CREATE INDEX `idx_credits_status` ON `credits` (`creditStatus`);--> statement-breakpoint
CREATE INDEX `idx_credits_expiration` ON `credits` (`expirationDate`);--> statement-breakpoint
CREATE INDEX `idx_inventory_movements_batch` ON `inventoryMovements` (`batchId`);--> statement-breakpoint
CREATE INDEX `idx_inventory_movements_type` ON `inventoryMovements` (`inventoryMovementType`);--> statement-breakpoint
CREATE INDEX `idx_inventory_movements_reference` ON `inventoryMovements` (`referenceType`,`referenceId`);--> statement-breakpoint
CREATE INDEX `idx_inventory_movements_created` ON `inventoryMovements` (`createdAt`);--> statement-breakpoint
CREATE INDEX `idx_client_id` ON `orders` (`client_id`);--> statement-breakpoint
CREATE INDEX `idx_order_type` ON `orders` (`orderType`);--> statement-breakpoint
CREATE INDEX `idx_quote_status` ON `orders` (`quoteStatus`);--> statement-breakpoint
CREATE INDEX `idx_sale_status` ON `orders` (`saleStatus`);--> statement-breakpoint
CREATE INDEX `idx_created_at` ON `orders` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_payment_methods_active` ON `paymentMethods` (`isActive`);--> statement-breakpoint
CREATE INDEX `idx_payment_methods_sort` ON `paymentMethods` (`sortOrder`);--> statement-breakpoint
CREATE INDEX `idx_batch_id` ON `sample_inventory_log` (`batch_id`);--> statement-breakpoint
CREATE INDEX `idx_order_id` ON `sample_inventory_log` (`order_id`);--> statement-breakpoint
CREATE INDEX `idx_created_at` ON `sample_inventory_log` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_transaction_links_parent` ON `transactionLinks` (`parentTransactionId`);--> statement-breakpoint
CREATE INDEX `idx_transaction_links_child` ON `transactionLinks` (`childTransactionId`);--> statement-breakpoint
CREATE INDEX `idx_transaction_links_type` ON `transactionLinks` (`transactionLinkType`);--> statement-breakpoint
CREATE INDEX `idx_transactions_client_id` ON `transactions` (`clientId`);--> statement-breakpoint
CREATE INDEX `idx_transactions_type` ON `transactions` (`transactionType`);--> statement-breakpoint
CREATE INDEX `idx_transactions_date` ON `transactions` (`transactionDate`);--> statement-breakpoint
CREATE INDEX `idx_transactions_status` ON `transactions` (`transactionStatus`);
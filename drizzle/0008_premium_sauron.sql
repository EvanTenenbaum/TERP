CREATE TABLE `client_activity` (
	`id` int AUTO_INCREMENT NOT NULL,
	`client_id` int NOT NULL,
	`user_id` int NOT NULL,
	`activity_type` enum('CREATED','UPDATED','TRANSACTION_ADDED','PAYMENT_RECORDED','NOTE_ADDED','TAG_ADDED','TAG_REMOVED') NOT NULL,
	`metadata` json,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `client_activity_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `client_notes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`client_id` int NOT NULL,
	`note_id` int NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `client_notes_id` PRIMARY KEY(`id`),
	CONSTRAINT `unique_client_note` UNIQUE(`client_id`,`note_id`)
);
--> statement-breakpoint
CREATE TABLE `client_transactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`client_id` int NOT NULL,
	`transaction_type` enum('INVOICE','PAYMENT','QUOTE','ORDER','REFUND','CREDIT') NOT NULL,
	`transaction_number` varchar(100),
	`transaction_date` date NOT NULL,
	`amount` decimal(15,2) NOT NULL,
	`payment_status` enum('PAID','PENDING','OVERDUE','PARTIAL') DEFAULT 'PENDING',
	`payment_date` date,
	`payment_amount` decimal(15,2),
	`notes` text,
	`metadata` json,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `client_transactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `clients` (
	`id` int AUTO_INCREMENT NOT NULL,
	`teri_code` varchar(50) NOT NULL,
	`name` varchar(255) NOT NULL,
	`email` varchar(255),
	`phone` varchar(50),
	`address` text,
	`is_buyer` boolean DEFAULT false,
	`is_seller` boolean DEFAULT false,
	`is_brand` boolean DEFAULT false,
	`is_referee` boolean DEFAULT false,
	`is_contractor` boolean DEFAULT false,
	`tags` json,
	`total_spent` decimal(15,2) DEFAULT '0',
	`total_profit` decimal(15,2) DEFAULT '0',
	`avg_profit_margin` decimal(5,2) DEFAULT '0',
	`total_owed` decimal(15,2) DEFAULT '0',
	`oldest_debt_days` int DEFAULT 0,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `clients_id` PRIMARY KEY(`id`),
	CONSTRAINT `clients_teri_code_unique` UNIQUE(`teri_code`)
);
--> statement-breakpoint
ALTER TABLE `client_activity` ADD CONSTRAINT `client_activity_client_id_clients_id_fk` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `client_activity` ADD CONSTRAINT `client_activity_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `client_notes` ADD CONSTRAINT `client_notes_client_id_clients_id_fk` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `client_notes` ADD CONSTRAINT `client_notes_note_id_freeform_notes_id_fk` FOREIGN KEY (`note_id`) REFERENCES `freeform_notes`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `client_transactions` ADD CONSTRAINT `client_transactions_client_id_clients_id_fk` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_client_id` ON `client_activity` (`client_id`);--> statement-breakpoint
CREATE INDEX `idx_client_id` ON `client_transactions` (`client_id`);--> statement-breakpoint
CREATE INDEX `idx_transaction_date` ON `client_transactions` (`transaction_date`);--> statement-breakpoint
CREATE INDEX `idx_payment_status` ON `client_transactions` (`payment_status`);--> statement-breakpoint
CREATE INDEX `idx_teri_code` ON `clients` (`teri_code`);--> statement-breakpoint
CREATE INDEX `idx_total_owed` ON `clients` (`total_owed`);
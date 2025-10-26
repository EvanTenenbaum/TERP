CREATE TABLE `sampleAllocations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clientId` int NOT NULL,
	`monthYear` varchar(7) NOT NULL,
	`allocatedQuantity` varchar(20) NOT NULL,
	`usedQuantity` varchar(20) NOT NULL DEFAULT '0',
	`remainingQuantity` varchar(20) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sampleAllocations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sampleRequests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clientId` int NOT NULL,
	`requestedBy` int NOT NULL,
	`requestDate` timestamp NOT NULL DEFAULT (now()),
	`products` json NOT NULL,
	`sampleRequestStatus` enum('PENDING','FULFILLED','CANCELLED') NOT NULL DEFAULT 'PENDING',
	`fulfilledDate` timestamp,
	`fulfilledBy` int,
	`cancelledDate` timestamp,
	`cancelledBy` int,
	`cancellationReason` text,
	`notes` text,
	`totalCost` decimal(10,2),
	`relatedOrderId` int,
	`conversionDate` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sampleRequests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `batches` ADD `sampleOnly` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `batches` ADD `sampleAvailable` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `related_sample_request_id` int;--> statement-breakpoint
ALTER TABLE `sampleAllocations` ADD CONSTRAINT `sampleAllocations_clientId_clients_id_fk` FOREIGN KEY (`clientId`) REFERENCES `clients`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sampleRequests` ADD CONSTRAINT `sampleRequests_clientId_clients_id_fk` FOREIGN KEY (`clientId`) REFERENCES `clients`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sampleRequests` ADD CONSTRAINT `sampleRequests_requestedBy_users_id_fk` FOREIGN KEY (`requestedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sampleRequests` ADD CONSTRAINT `sampleRequests_fulfilledBy_users_id_fk` FOREIGN KEY (`fulfilledBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sampleRequests` ADD CONSTRAINT `sampleRequests_cancelledBy_users_id_fk` FOREIGN KEY (`cancelledBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sampleRequests` ADD CONSTRAINT `sampleRequests_relatedOrderId_orders_id_fk` FOREIGN KEY (`relatedOrderId`) REFERENCES `orders`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_sample_allocations_client_month` ON `sampleAllocations` (`clientId`,`monthYear`);--> statement-breakpoint
CREATE INDEX `idx_sample_allocations_unique` ON `sampleAllocations` (`clientId`,`monthYear`);--> statement-breakpoint
CREATE INDEX `idx_sample_requests_client` ON `sampleRequests` (`clientId`);--> statement-breakpoint
CREATE INDEX `idx_sample_requests_status` ON `sampleRequests` (`sampleRequestStatus`);--> statement-breakpoint
CREATE INDEX `idx_sample_requests_date` ON `sampleRequests` (`requestDate`);--> statement-breakpoint
CREATE INDEX `idx_sample_requests_order` ON `sampleRequests` (`relatedOrderId`);
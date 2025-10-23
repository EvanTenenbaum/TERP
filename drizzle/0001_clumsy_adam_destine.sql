CREATE TABLE `auditLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`actorId` int NOT NULL,
	`entity` varchar(50) NOT NULL,
	`entityId` int NOT NULL,
	`action` varchar(100) NOT NULL,
	`before` text,
	`after` text,
	`reason` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `auditLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `batchLocations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`batchId` int NOT NULL,
	`site` varchar(100) NOT NULL,
	`zone` varchar(100),
	`rack` varchar(100),
	`shelf` varchar(100),
	`bin` varchar(100),
	`qty` varchar(20) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `batchLocations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `batches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(50) NOT NULL,
	`sku` varchar(100) NOT NULL,
	`productId` int NOT NULL,
	`lotId` int NOT NULL,
	`batchStatus` enum('AWAITING_INTAKE','QC_PENDING','LIVE','ON_HOLD','QUARANTINED','SOLD_OUT','CLOSED') NOT NULL DEFAULT 'AWAITING_INTAKE',
	`grade` varchar(10),
	`isSample` int NOT NULL DEFAULT 0,
	`cogsMode` enum('FIXED','FLOOR','RANGE') NOT NULL,
	`unitCogs` varchar(20),
	`unitCogsFloor` varchar(20),
	`unitCogsMin` varchar(20),
	`unitCogsMax` varchar(20),
	`paymentTerms` enum('COD','NET_7','NET_15','NET_30','CONSIGNMENT','PARTIAL') NOT NULL,
	`metadata` text,
	`onHandQty` varchar(20) NOT NULL DEFAULT '0',
	`reservedQty` varchar(20) NOT NULL DEFAULT '0',
	`quarantineQty` varchar(20) NOT NULL DEFAULT '0',
	`holdQty` varchar(20) NOT NULL DEFAULT '0',
	`defectiveQty` varchar(20) NOT NULL DEFAULT '0',
	`publishEcom` int NOT NULL DEFAULT 0,
	`publishB2b` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `batches_id` PRIMARY KEY(`id`),
	CONSTRAINT `batches_code_unique` UNIQUE(`code`),
	CONSTRAINT `batches_sku_unique` UNIQUE(`sku`)
);
--> statement-breakpoint
CREATE TABLE `brands` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`vendorId` int,
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `brands_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `lots` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(50) NOT NULL,
	`vendorId` int NOT NULL,
	`date` timestamp NOT NULL,
	`siteCode` varchar(20) NOT NULL,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `lots_id` PRIMARY KEY(`id`),
	CONSTRAINT `lots_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `productSynonyms` (
	`id` int AUTO_INCREMENT NOT NULL,
	`productId` int NOT NULL,
	`synonym` varchar(500) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `productSynonyms_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` int AUTO_INCREMENT NOT NULL,
	`brandId` int NOT NULL,
	`nameCanonical` varchar(500) NOT NULL,
	`category` varchar(100) NOT NULL,
	`subcategory` varchar(100),
	`uomSellable` varchar(20) NOT NULL DEFAULT 'EA',
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `products_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `vendors` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`contactName` varchar(255),
	`contactEmail` varchar(320),
	`contactPhone` varchar(50),
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `vendors_id` PRIMARY KEY(`id`),
	CONSTRAINT `vendors_name_unique` UNIQUE(`name`)
);

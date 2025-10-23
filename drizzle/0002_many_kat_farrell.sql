CREATE TABLE `categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text,
	`isActive` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `categories_id` PRIMARY KEY(`id`),
	CONSTRAINT `categories_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `cogsHistory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`batchId` int NOT NULL,
	`oldCogs` varchar(20),
	`newCogs` varchar(20) NOT NULL,
	`changeType` varchar(50) NOT NULL,
	`affectedSalesCount` int DEFAULT 0,
	`reason` text,
	`changedBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `cogsHistory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `grades` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(50) NOT NULL,
	`description` text,
	`sortOrder` int DEFAULT 0,
	`isActive` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `grades_id` PRIMARY KEY(`id`),
	CONSTRAINT `grades_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `locations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`site` varchar(100) NOT NULL,
	`zone` varchar(100),
	`rack` varchar(100),
	`shelf` varchar(100),
	`bin` varchar(100),
	`isActive` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `locations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `paymentHistory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`batchId` int NOT NULL,
	`vendorId` int NOT NULL,
	`amount` varchar(20) NOT NULL,
	`paymentDate` timestamp NOT NULL,
	`paymentMethod` varchar(50),
	`notes` text,
	`recordedBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `paymentHistory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `productMedia` (
	`id` int AUTO_INCREMENT NOT NULL,
	`productId` int NOT NULL,
	`url` varchar(1000) NOT NULL,
	`type` varchar(50) NOT NULL,
	`filename` varchar(255) NOT NULL,
	`size` int,
	`uploadedBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `productMedia_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `productTags` (
	`id` int AUTO_INCREMENT NOT NULL,
	`productId` int NOT NULL,
	`tagId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `productTags_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sales` (
	`id` int AUTO_INCREMENT NOT NULL,
	`batchId` int NOT NULL,
	`productId` int NOT NULL,
	`quantity` varchar(20) NOT NULL,
	`cogsAtSale` varchar(20) NOT NULL,
	`salePrice` varchar(20) NOT NULL,
	`cogsOverride` int NOT NULL DEFAULT 0,
	`customerId` int,
	`saleDate` timestamp NOT NULL,
	`notes` text,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sales_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `strains` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`standardizedName` varchar(255) NOT NULL,
	`aliases` text,
	`category` varchar(50),
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `strains_id` PRIMARY KEY(`id`),
	CONSTRAINT `strains_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `subcategories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`categoryId` int NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text,
	`isActive` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `subcategories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tags` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`standardizedName` varchar(100) NOT NULL,
	`category` varchar(50),
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tags_id` PRIMARY KEY(`id`),
	CONSTRAINT `tags_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
ALTER TABLE `batches` MODIFY COLUMN `batchStatus` enum('AWAITING_INTAKE','LIVE','PHOTOGRAPHY_COMPLETE','ON_HOLD','QUARANTINED','SOLD_OUT','CLOSED') NOT NULL DEFAULT 'AWAITING_INTAKE';--> statement-breakpoint
ALTER TABLE `batches` MODIFY COLUMN `cogsMode` enum('FIXED','RANGE') NOT NULL;--> statement-breakpoint
ALTER TABLE `batches` ADD `amountPaid` varchar(20) DEFAULT '0';--> statement-breakpoint
ALTER TABLE `products` ADD `strainId` int;--> statement-breakpoint
ALTER TABLE `batches` DROP COLUMN `unitCogsFloor`;--> statement-breakpoint
ALTER TABLE `lots` DROP COLUMN `siteCode`;
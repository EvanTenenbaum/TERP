CREATE TABLE `accounts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`accountNumber` varchar(20) NOT NULL,
	`accountName` varchar(255) NOT NULL,
	`accountType` enum('ASSET','LIABILITY','EQUITY','REVENUE','EXPENSE') NOT NULL,
	`parentAccountId` int,
	`isActive` boolean NOT NULL DEFAULT true,
	`normalBalance` enum('DEBIT','CREDIT') NOT NULL,
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `accounts_id` PRIMARY KEY(`id`),
	CONSTRAINT `accounts_accountNumber_unique` UNIQUE(`accountNumber`)
);
--> statement-breakpoint
CREATE TABLE `fiscalPeriods` (
	`id` int AUTO_INCREMENT NOT NULL,
	`periodName` varchar(100) NOT NULL,
	`startDate` date NOT NULL,
	`endDate` date NOT NULL,
	`fiscalYear` int NOT NULL,
	`status` enum('OPEN','CLOSED','LOCKED') NOT NULL DEFAULT 'OPEN',
	`closedAt` timestamp,
	`closedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `fiscalPeriods_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ledgerEntries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`entryNumber` varchar(50) NOT NULL,
	`entryDate` date NOT NULL,
	`accountId` int NOT NULL,
	`debit` decimal(12,2) NOT NULL DEFAULT '0.00',
	`credit` decimal(12,2) NOT NULL DEFAULT '0.00',
	`description` text,
	`referenceType` varchar(50),
	`referenceId` int,
	`fiscalPeriodId` int NOT NULL,
	`isManual` boolean NOT NULL DEFAULT false,
	`isPosted` boolean NOT NULL DEFAULT false,
	`postedAt` timestamp,
	`postedBy` int,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ledgerEntries_id` PRIMARY KEY(`id`),
	CONSTRAINT `ledgerEntries_entryNumber_unique` UNIQUE(`entryNumber`)
);

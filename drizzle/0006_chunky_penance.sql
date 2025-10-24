CREATE TABLE `bankAccounts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`accountName` varchar(255) NOT NULL,
	`accountNumber` varchar(50) NOT NULL,
	`bankName` varchar(255) NOT NULL,
	`accountType` enum('CHECKING','SAVINGS','MONEY_MARKET','CREDIT_CARD') NOT NULL,
	`currency` varchar(3) NOT NULL DEFAULT 'USD',
	`currentBalance` decimal(12,2) NOT NULL DEFAULT '0.00',
	`isActive` boolean NOT NULL DEFAULT true,
	`ledgerAccountId` int,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `bankAccounts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `bankTransactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`bankAccountId` int NOT NULL,
	`transactionDate` date NOT NULL,
	`transactionType` enum('DEPOSIT','WITHDRAWAL','TRANSFER','FEE','INTEREST') NOT NULL,
	`amount` decimal(12,2) NOT NULL,
	`description` text,
	`referenceNumber` varchar(100),
	`paymentId` int,
	`isReconciled` boolean NOT NULL DEFAULT false,
	`reconciledAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `bankTransactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `expenseCategories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`categoryName` varchar(255) NOT NULL,
	`parentCategoryId` int,
	`ledgerAccountId` int,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `expenseCategories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `expenses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`expenseNumber` varchar(50) NOT NULL,
	`expenseDate` date NOT NULL,
	`categoryId` int NOT NULL,
	`vendorId` int,
	`amount` decimal(12,2) NOT NULL,
	`taxAmount` decimal(12,2) NOT NULL DEFAULT '0.00',
	`totalAmount` decimal(12,2) NOT NULL,
	`paymentMethod` enum('CASH','CHECK','CREDIT_CARD','DEBIT_CARD','BANK_TRANSFER','OTHER') NOT NULL,
	`bankAccountId` int,
	`description` text,
	`receiptUrl` varchar(500),
	`billId` int,
	`isReimbursable` boolean NOT NULL DEFAULT false,
	`isReimbursed` boolean NOT NULL DEFAULT false,
	`reimbursedAt` timestamp,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `expenses_id` PRIMARY KEY(`id`),
	CONSTRAINT `expenses_expenseNumber_unique` UNIQUE(`expenseNumber`)
);

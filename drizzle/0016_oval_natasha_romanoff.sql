CREATE TABLE `salesSheetVersions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`templateId` int NOT NULL,
	`versionNumber` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`filters` json NOT NULL,
	`selected_items` json NOT NULL,
	`column_visibility` json NOT NULL,
	`changes` text,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `salesSheetVersions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `sales_sheet_templates` ADD `expiration_date` timestamp;--> statement-breakpoint
ALTER TABLE `sales_sheet_templates` ADD `is_active` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `sales_sheet_templates` ADD `current_version` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `salesSheetVersions` ADD CONSTRAINT `salesSheetVersions_templateId_sales_sheet_templates_id_fk` FOREIGN KEY (`templateId`) REFERENCES `sales_sheet_templates`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `salesSheetVersions` ADD CONSTRAINT `salesSheetVersions_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_sales_sheet_versions_template` ON `salesSheetVersions` (`templateId`,`versionNumber`);
CREATE TABLE `inventoryAlerts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`inventoryAlertType` enum('LOW_STOCK','EXPIRING','OVERSTOCK','SLOW_MOVING') NOT NULL,
	`batchId` int NOT NULL,
	`threshold` decimal(10,2),
	`currentValue` decimal(10,2),
	`alertSeverity` enum('LOW','MEDIUM','HIGH') NOT NULL,
	`alertStatus` enum('ACTIVE','ACKNOWLEDGED','RESOLVED') NOT NULL DEFAULT 'ACTIVE',
	`message` text,
	`acknowledgedBy` int,
	`acknowledgedAt` timestamp,
	`resolvedAt` timestamp,
	`resolution` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `inventoryAlerts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `userDashboardPreferences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`widgetId` varchar(100) NOT NULL,
	`isVisible` int NOT NULL DEFAULT 1,
	`sortOrder` int NOT NULL DEFAULT 0,
	`config` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `userDashboardPreferences_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `inventoryAlerts` ADD CONSTRAINT `inventoryAlerts_batchId_batches_id_fk` FOREIGN KEY (`batchId`) REFERENCES `batches`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inventoryAlerts` ADD CONSTRAINT `inventoryAlerts_acknowledgedBy_users_id_fk` FOREIGN KEY (`acknowledgedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `userDashboardPreferences` ADD CONSTRAINT `userDashboardPreferences_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_inventory_alerts_batch` ON `inventoryAlerts` (`batchId`);--> statement-breakpoint
CREATE INDEX `idx_inventory_alerts_status` ON `inventoryAlerts` (`alertStatus`);--> statement-breakpoint
CREATE INDEX `idx_inventory_alerts_type` ON `inventoryAlerts` (`inventoryAlertType`);--> statement-breakpoint
CREATE INDEX `idx_inventory_alerts_severity` ON `inventoryAlerts` (`alertSeverity`);--> statement-breakpoint
CREATE INDEX `idx_user_dashboard_prefs_user_widget` ON `userDashboardPreferences` (`userId`,`widgetId`);
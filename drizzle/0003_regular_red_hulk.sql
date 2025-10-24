CREATE TABLE `dashboard_kpi_configs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`role` enum('user','admin') NOT NULL,
	`kpiType` varchar(100) NOT NULL,
	`position` int NOT NULL,
	`isVisible` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `dashboard_kpi_configs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `dashboard_widget_layouts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`role` enum('user','admin'),
	`widgetType` varchar(100) NOT NULL,
	`position` int NOT NULL,
	`width` int NOT NULL DEFAULT 1,
	`height` int NOT NULL DEFAULT 1,
	`isVisible` boolean NOT NULL DEFAULT true,
	`config` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `dashboard_widget_layouts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `scratch_pad_notes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`content` text NOT NULL,
	`isCompleted` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`completedAt` timestamp,
	CONSTRAINT `scratch_pad_notes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `dashboard_widget_layouts` ADD CONSTRAINT `dashboard_widget_layouts_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `scratch_pad_notes` ADD CONSTRAINT `scratch_pad_notes_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;
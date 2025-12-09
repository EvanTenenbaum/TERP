CREATE TABLE `roles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text,
	`is_system_role` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `roles_id` PRIMARY KEY(`id`),
	CONSTRAINT `roles_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `permissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text,
	`module` varchar(50) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `permissions_id` PRIMARY KEY(`id`),
	CONSTRAINT `permissions_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `role_permissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`role_id` int NOT NULL,
	`permission_id` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `role_permissions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_roles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` varchar(255) NOT NULL,
	`role_id` int NOT NULL,
	`assigned_at` timestamp NOT NULL DEFAULT (now()),
	`assigned_by` varchar(255),
	CONSTRAINT `user_roles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_permission_overrides` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` varchar(255) NOT NULL,
	`permission_id` int NOT NULL,
	`granted` int NOT NULL,
	`granted_at` timestamp NOT NULL DEFAULT (now()),
	`granted_by` varchar(255),
	CONSTRAINT `user_permission_overrides_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `role_permissions` ADD CONSTRAINT `role_permissions_role_id_roles_id_fk` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `role_permissions` ADD CONSTRAINT `role_permissions_permission_id_permissions_id_fk` FOREIGN KEY (`permission_id`) REFERENCES `permissions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_roles` ADD CONSTRAINT `user_roles_role_id_roles_id_fk` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_permission_overrides` ADD CONSTRAINT `user_permission_overrides_permission_id_permissions_id_fk` FOREIGN KEY (`permission_id`) REFERENCES `permissions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_roles_name` ON `roles` (`name`);--> statement-breakpoint
CREATE INDEX `idx_permissions_name` ON `permissions` (`name`);--> statement-breakpoint
CREATE INDEX `idx_permissions_module` ON `permissions` (`module`);--> statement-breakpoint
CREATE INDEX `idx_role_permissions_role` ON `role_permissions` (`role_id`);--> statement-breakpoint
CREATE INDEX `idx_role_permissions_permission` ON `role_permissions` (`permission_id`);--> statement-breakpoint
CREATE INDEX `idx_user_roles_user` ON `user_roles` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_user_roles_role` ON `user_roles` (`role_id`);--> statement-breakpoint
CREATE INDEX `idx_user_permission_overrides_user` ON `user_permission_overrides` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_user_permission_overrides_permission` ON `user_permission_overrides` (`permission_id`);

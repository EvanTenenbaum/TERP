CREATE TABLE `tagGroupMembers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`groupId` int NOT NULL,
	`tagId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `tagGroupMembers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tagGroups` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text,
	`color` varchar(7),
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tagGroups_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tagHierarchy` (
	`id` int AUTO_INCREMENT NOT NULL,
	`parentTagId` int NOT NULL,
	`childTagId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `tagHierarchy_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `tagGroupMembers` ADD CONSTRAINT `tagGroupMembers_groupId_tagGroups_id_fk` FOREIGN KEY (`groupId`) REFERENCES `tagGroups`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tagGroupMembers` ADD CONSTRAINT `tagGroupMembers_tagId_tags_id_fk` FOREIGN KEY (`tagId`) REFERENCES `tags`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tagGroups` ADD CONSTRAINT `tagGroups_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tagHierarchy` ADD CONSTRAINT `tagHierarchy_parentTagId_tags_id_fk` FOREIGN KEY (`parentTagId`) REFERENCES `tags`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tagHierarchy` ADD CONSTRAINT `tagHierarchy_childTagId_tags_id_fk` FOREIGN KEY (`childTagId`) REFERENCES `tags`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_tag_group_members_group_tag` ON `tagGroupMembers` (`groupId`,`tagId`);--> statement-breakpoint
CREATE INDEX `idx_tag_hierarchy_parent_child` ON `tagHierarchy` (`parentTagId`,`childTagId`);--> statement-breakpoint
CREATE INDEX `idx_tag_hierarchy_unique` ON `tagHierarchy` (`parentTagId`,`childTagId`);
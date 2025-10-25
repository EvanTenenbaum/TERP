CREATE TABLE `freeform_notes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(500) NOT NULL DEFAULT 'Untitled Note',
	`content` json,
	`templateType` varchar(100),
	`tags` json,
	`isPinned` boolean NOT NULL DEFAULT false,
	`isArchived` boolean NOT NULL DEFAULT false,
	`sharedWith` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastViewedAt` timestamp,
	CONSTRAINT `freeform_notes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `note_activity` (
	`id` int AUTO_INCREMENT NOT NULL,
	`noteId` int NOT NULL,
	`userId` int NOT NULL,
	`activityType` enum('CREATED','UPDATED','COMMENTED','SHARED','ARCHIVED','RESTORED','PINNED','UNPINNED','TEMPLATE_APPLIED') NOT NULL,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `note_activity_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `note_comments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`noteId` int NOT NULL,
	`userId` int NOT NULL,
	`content` text NOT NULL,
	`parentCommentId` int,
	`isResolved` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `note_comments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `freeform_notes` ADD CONSTRAINT `freeform_notes_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `note_activity` ADD CONSTRAINT `note_activity_noteId_freeform_notes_id_fk` FOREIGN KEY (`noteId`) REFERENCES `freeform_notes`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `note_activity` ADD CONSTRAINT `note_activity_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `note_comments` ADD CONSTRAINT `note_comments_noteId_freeform_notes_id_fk` FOREIGN KEY (`noteId`) REFERENCES `freeform_notes`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `note_comments` ADD CONSTRAINT `note_comments_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;
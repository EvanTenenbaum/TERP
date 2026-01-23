-- Migration: Add vendor notes table
-- Feature: MF-016 Vendor Notes & History
-- Date: 2025-11-05

CREATE TABLE `vendorNotes` (
  `id` int AUTO_INCREMENT NOT NULL,
  `vendorId` int NOT NULL,
  `userId` int NOT NULL,
  `note` text NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `vendorNotes_id` PRIMARY KEY(`id`)
);--> statement-breakpoint

CREATE INDEX `idx_vendorNotes_vendorId` ON `vendorNotes` (`vendorId`);--> statement-breakpoint
CREATE INDEX `idx_vendorNotes_userId` ON `vendorNotes` (`userId`);--> statement-breakpoint

ALTER TABLE `vendorNotes` ADD CONSTRAINT `vendorNotes_vendorId_fk` FOREIGN KEY (`vendorId`) REFERENCES `vendors`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;--> statement-breakpoint
ALTER TABLE `vendorNotes` ADD CONSTRAINT `vendorNotes_userId_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

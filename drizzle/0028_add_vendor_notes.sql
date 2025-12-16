-- Migration: Add vendor notes table
-- Feature: MF-016 Vendor Notes & History
-- Date: 2025-11-05

CREATE TABLE IF NOT EXISTS `vendorNotes` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `vendorId` int NOT NULL,
  `userId` int NOT NULL,
  `note` text NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`vendorId`) REFERENCES `vendors`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`userId`) REFERENCES `users`(`id`)
);

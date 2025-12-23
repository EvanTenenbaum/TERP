-- Migration: 0001_live_shopping
-- Description: Create tables for Live Shopping feature (Sessions, Cart Items, Price Overrides)
-- Generated: 2025-12-24

-- ============================================================================
-- Live Shopping Sessions Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS `liveShoppingSessions` (
    `id` int AUTO_INCREMENT PRIMARY KEY NOT NULL,
    `hostUserId` int NOT NULL,
    `clientId` int NOT NULL,
    `status` enum('SCHEDULED','ACTIVE','PAUSED','ENDED','CONVERTED','CANCELLED') NOT NULL DEFAULT 'SCHEDULED',
    `roomCode` varchar(64) NOT NULL,
    `scheduledAt` timestamp NULL,
    `startedAt` timestamp NULL,
    `endedAt` timestamp NULL,
    `title` varchar(255),
    `internalNotes` text,
    `sessionConfig` json,
    `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `deleted_at` timestamp NULL,
    CONSTRAINT `liveShoppingSessions_roomCode_unique` UNIQUE(`roomCode`),
    CONSTRAINT `liveShoppingSessions_hostUserId_users_id_fk` FOREIGN KEY (`hostUserId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE NO ACTION,
    CONSTRAINT `liveShoppingSessions_clientId_clients_id_fk` FOREIGN KEY (`clientId`) REFERENCES `clients`(`id`) ON DELETE RESTRICT ON UPDATE NO ACTION
);

-- Indexes for liveShoppingSessions
CREATE INDEX IF NOT EXISTS `idx_lss_host` ON `liveShoppingSessions` (`hostUserId`);
CREATE INDEX IF NOT EXISTS `idx_lss_client` ON `liveShoppingSessions` (`clientId`);
CREATE INDEX IF NOT EXISTS `idx_lss_status` ON `liveShoppingSessions` (`status`);
CREATE INDEX IF NOT EXISTS `idx_lss_room` ON `liveShoppingSessions` (`roomCode`);

-- ============================================================================
-- Session Cart Items Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS `sessionCartItems` (
    `id` int AUTO_INCREMENT PRIMARY KEY NOT NULL,
    `sessionId` int NOT NULL,
    `batchId` int NOT NULL,
    `productId` int NOT NULL,
    `quantity` decimal(15, 4) NOT NULL DEFAULT '1.0000',
    `unitPrice` decimal(15, 2) NOT NULL,
    `addedByRole` enum('HOST','CLIENT') NOT NULL,
    `isSample` boolean NOT NULL DEFAULT false,
    `isHighlighted` boolean DEFAULT false,
    `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `deleted_at` timestamp NULL,
    CONSTRAINT `sessionCartItems_sessionId_liveShoppingSessions_id_fk` FOREIGN KEY (`sessionId`) REFERENCES `liveShoppingSessions`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT `sessionCartItems_batchId_batches_id_fk` FOREIGN KEY (`batchId`) REFERENCES `batches`(`id`) ON DELETE RESTRICT ON UPDATE NO ACTION,
    CONSTRAINT `sessionCartItems_productId_products_id_fk` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE RESTRICT ON UPDATE NO ACTION
);

-- Indexes for sessionCartItems
CREATE INDEX IF NOT EXISTS `idx_sci_session` ON `sessionCartItems` (`sessionId`);
CREATE INDEX IF NOT EXISTS `idx_sci_batch` ON `sessionCartItems` (`batchId`);

-- ============================================================================
-- Session Price Overrides Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS `sessionPriceOverrides` (
    `id` int AUTO_INCREMENT PRIMARY KEY NOT NULL,
    `sessionId` int NOT NULL,
    `productId` int NOT NULL,
    `overridePrice` decimal(15, 2) NOT NULL,
    `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `sessionPriceOverrides_sessionId_liveShoppingSessions_id_fk` FOREIGN KEY (`sessionId`) REFERENCES `liveShoppingSessions`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT `sessionPriceOverrides_productId_products_id_fk` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION
);

-- Indexes for sessionPriceOverrides
CREATE INDEX IF NOT EXISTS `idx_spo_unique` ON `sessionPriceOverrides` (`sessionId`, `productId`);

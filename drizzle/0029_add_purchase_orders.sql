-- Create Purchase Order Status Enum
-- (MySQL enums are defined in schema, this is for documentation)

-- Create Purchase Orders table
CREATE TABLE IF NOT EXISTS `purchaseOrders` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `poNumber` VARCHAR(50) NOT NULL UNIQUE,
  `vendorId` INT NOT NULL,
  `intakeSessionId` INT NULL,
  `status` ENUM('DRAFT', 'SENT', 'CONFIRMED', 'RECEIVING', 'RECEIVED', 'CANCELLED') NOT NULL DEFAULT 'DRAFT',
  `orderDate` DATE NOT NULL,
  `expectedDeliveryDate` DATE NULL,
  `actualDeliveryDate` DATE NULL,
  `subtotal` DECIMAL(15, 2) DEFAULT 0,
  `tax` DECIMAL(15, 2) DEFAULT 0,
  `shipping` DECIMAL(15, 2) DEFAULT 0,
  `total` DECIMAL(15, 2) DEFAULT 0,
  `paymentTerms` VARCHAR(100) NULL,
  `paymentDueDate` DATE NULL,
  `notes` TEXT NULL,
  `vendorNotes` TEXT NULL,
  `createdBy` INT NOT NULL,
  `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updatedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  `sentAt` TIMESTAMP NULL,
  `confirmedAt` TIMESTAMP NULL,
  FOREIGN KEY (`vendorId`) REFERENCES `vendors`(`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`intakeSessionId`) REFERENCES `intake_sessions`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE RESTRICT,
  INDEX `idx_po_vendor_id` (`vendorId`),
  INDEX `idx_po_status` (`status`),
  INDEX `idx_po_order_date` (`orderDate`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create Purchase Order Items table
CREATE TABLE IF NOT EXISTS `purchaseOrderItems` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `purchaseOrderId` INT NOT NULL,
  `productId` INT NOT NULL,
  `quantityOrdered` DECIMAL(15, 4) NOT NULL,
  `quantityReceived` DECIMAL(15, 4) DEFAULT 0,
  `unitCost` DECIMAL(15, 4) NOT NULL,
  `totalCost` DECIMAL(15, 4) NOT NULL,
  `notes` TEXT NULL,
  `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updatedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (`purchaseOrderId`) REFERENCES `purchaseOrders`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE RESTRICT,
  INDEX `idx_poi_po_id` (`purchaseOrderId`),
  INDEX `idx_poi_product_id` (`productId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

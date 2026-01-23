-- Create Purchase Orders table
CREATE TABLE `purchaseOrders` (
  `id` int AUTO_INCREMENT NOT NULL,
  `poNumber` varchar(50) NOT NULL,
  `vendorId` int NOT NULL,
  `intakeSessionId` int NULL,
  `status` enum('DRAFT','SENT','CONFIRMED','RECEIVING','RECEIVED','CANCELLED') NOT NULL DEFAULT 'DRAFT',
  `orderDate` date NOT NULL,
  `expectedDeliveryDate` date NULL,
  `actualDeliveryDate` date NULL,
  `subtotal` decimal(15,2) DEFAULT 0,
  `tax` decimal(15,2) DEFAULT 0,
  `shipping` decimal(15,2) DEFAULT 0,
  `total` decimal(15,2) DEFAULT 0,
  `paymentTerms` varchar(100) NULL,
  `paymentDueDate` date NULL,
  `notes` text NULL,
  `vendorNotes` text NULL,
  `createdBy` int NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `sentAt` timestamp NULL,
  `confirmedAt` timestamp NULL,
  CONSTRAINT `purchaseOrders_id` PRIMARY KEY(`id`),
  CONSTRAINT `purchaseOrders_poNumber_unique` UNIQUE(`poNumber`)
);--> statement-breakpoint

CREATE TABLE `purchaseOrderItems` (
  `id` int AUTO_INCREMENT NOT NULL,
  `purchaseOrderId` int NOT NULL,
  `productId` int NOT NULL,
  `quantityOrdered` decimal(15,4) NOT NULL,
  `quantityReceived` decimal(15,4) DEFAULT 0,
  `unitCost` decimal(15,4) NOT NULL,
  `totalCost` decimal(15,4) NOT NULL,
  `notes` text NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `purchaseOrderItems_id` PRIMARY KEY(`id`)
);--> statement-breakpoint

ALTER TABLE `purchaseOrders` ADD CONSTRAINT `purchaseOrders_vendorId_fk` FOREIGN KEY (`vendorId`) REFERENCES `vendors`(`id`) ON DELETE RESTRICT ON UPDATE NO ACTION;--> statement-breakpoint
ALTER TABLE `purchaseOrders` ADD CONSTRAINT `purchaseOrders_intakeSessionId_fk` FOREIGN KEY (`intakeSessionId`) REFERENCES `intake_sessions`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;--> statement-breakpoint
ALTER TABLE `purchaseOrders` ADD CONSTRAINT `purchaseOrders_createdBy_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE NO ACTION;--> statement-breakpoint
ALTER TABLE `purchaseOrderItems` ADD CONSTRAINT `purchaseOrderItems_purchaseOrderId_fk` FOREIGN KEY (`purchaseOrderId`) REFERENCES `purchaseOrders`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;--> statement-breakpoint
ALTER TABLE `purchaseOrderItems` ADD CONSTRAINT `purchaseOrderItems_productId_fk` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE RESTRICT ON UPDATE NO ACTION;--> statement-breakpoint

CREATE INDEX `idx_po_vendor_id` ON `purchaseOrders` (`vendorId`);--> statement-breakpoint
CREATE INDEX `idx_po_status` ON `purchaseOrders` (`status`);--> statement-breakpoint
CREATE INDEX `idx_po_order_date` ON `purchaseOrders` (`orderDate`);--> statement-breakpoint
CREATE INDEX `idx_poi_po_id` ON `purchaseOrderItems` (`purchaseOrderId`);--> statement-breakpoint
CREATE INDEX `idx_poi_product_id` ON `purchaseOrderItems` (`productId`);

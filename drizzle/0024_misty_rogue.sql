ALTER TABLE `batches` ADD `version` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `clients` ADD `version` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `invoices` ADD `deleted_at` timestamp;--> statement-breakpoint
ALTER TABLE `invoices` ADD `version` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `lots` ADD `supplier_client_id` int;--> statement-breakpoint
ALTER TABLE `orders` ADD `version` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `payments` ADD `deleted_at` timestamp;--> statement-breakpoint
ALTER TABLE `purchaseOrders` ADD `supplier_client_id` int;--> statement-breakpoint
ALTER TABLE `invoiceLineItems` ADD CONSTRAINT `invoiceLineItems_invoiceId_invoices_id_fk` FOREIGN KEY (`invoiceId`) REFERENCES `invoices`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `invoiceLineItems` ADD CONSTRAINT `invoiceLineItems_productId_products_id_fk` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `invoiceLineItems` ADD CONSTRAINT `invoiceLineItems_batchId_batches_id_fk` FOREIGN KEY (`batchId`) REFERENCES `batches`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_customerId_clients_id_fk` FOREIGN KEY (`customerId`) REFERENCES `clients`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `lots` ADD CONSTRAINT `lots_supplier_client_id_clients_id_fk` FOREIGN KEY (`supplier_client_id`) REFERENCES `clients`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payments` ADD CONSTRAINT `payments_bankAccountId_bankAccounts_id_fk` FOREIGN KEY (`bankAccountId`) REFERENCES `bankAccounts`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payments` ADD CONSTRAINT `payments_customerId_clients_id_fk` FOREIGN KEY (`customerId`) REFERENCES `clients`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payments` ADD CONSTRAINT `payments_vendorId_clients_id_fk` FOREIGN KEY (`vendorId`) REFERENCES `clients`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payments` ADD CONSTRAINT `payments_invoiceId_invoices_id_fk` FOREIGN KEY (`invoiceId`) REFERENCES `invoices`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payments` ADD CONSTRAINT `payments_billId_bills_id_fk` FOREIGN KEY (`billId`) REFERENCES `bills`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payments` ADD CONSTRAINT `payments_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `purchaseOrders` ADD CONSTRAINT `purchaseOrders_supplier_client_id_clients_id_fk` FOREIGN KEY (`supplier_client_id`) REFERENCES `clients`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sales` ADD CONSTRAINT `sales_customerId_clients_id_fk` FOREIGN KEY (`customerId`) REFERENCES `clients`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sales` ADD CONSTRAINT `sales_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_invoice_line_items_invoice_id` ON `invoiceLineItems` (`invoiceId`);--> statement-breakpoint
CREATE INDEX `idx_invoice_line_items_product_id` ON `invoiceLineItems` (`productId`);--> statement-breakpoint
CREATE INDEX `idx_invoice_line_items_batch_id` ON `invoiceLineItems` (`batchId`);--> statement-breakpoint
CREATE INDEX `idx_invoices_created_by` ON `invoices` (`createdBy`);--> statement-breakpoint
CREATE INDEX `idx_lots_supplier_client_id` ON `lots` (`supplier_client_id`);--> statement-breakpoint
CREATE INDEX `idx_payments_customer_id` ON `payments` (`customerId`);--> statement-breakpoint
CREATE INDEX `idx_payments_vendor_id` ON `payments` (`vendorId`);--> statement-breakpoint
CREATE INDEX `idx_payments_bank_account_id` ON `payments` (`bankAccountId`);--> statement-breakpoint
CREATE INDEX `idx_payments_invoice_id` ON `payments` (`invoiceId`);--> statement-breakpoint
CREATE INDEX `idx_payments_bill_id` ON `payments` (`billId`);--> statement-breakpoint
CREATE INDEX `idx_payments_created_by` ON `payments` (`createdBy`);--> statement-breakpoint
CREATE INDEX `idx_po_supplier_client_id` ON `purchaseOrders` (`supplier_client_id`);--> statement-breakpoint
CREATE INDEX `idx_sales_customer_id` ON `sales` (`customerId`);--> statement-breakpoint
CREATE INDEX `idx_sales_created_by` ON `sales` (`createdBy`);
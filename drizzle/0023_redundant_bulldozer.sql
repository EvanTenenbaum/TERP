CREATE TABLE `batch_status_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`batchId` int NOT NULL,
	`fromStatusId` int,
	`toStatusId` int NOT NULL,
	`changedBy` int NOT NULL,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `batch_status_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `calendar_event_invitations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`event_id` int NOT NULL,
	`invitee_type` enum('USER','CLIENT','EXTERNAL') NOT NULL,
	`user_id` int,
	`client_id` int,
	`external_email` varchar(320),
	`external_name` varchar(255),
	`role` enum('ORGANIZER','REQUIRED','OPTIONAL','OBSERVER') NOT NULL DEFAULT 'REQUIRED',
	`message` text,
	`status` enum('DRAFT','PENDING','ACCEPTED','DECLINED','AUTO_ACCEPTED','CANCELLED','EXPIRED') NOT NULL DEFAULT 'DRAFT',
	`auto_accept` boolean NOT NULL DEFAULT false,
	`auto_accept_reason` varchar(255),
	`admin_override` boolean NOT NULL DEFAULT false,
	`overridden_by` int,
	`override_reason` text,
	`overridden_at` timestamp,
	`sent_at` timestamp,
	`responded_at` timestamp,
	`expires_at` timestamp,
	`created_by` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`participant_id` int,
	CONSTRAINT `calendar_event_invitations_id` PRIMARY KEY(`id`),
	CONSTRAINT `idx_unique_invitation` UNIQUE(`event_id`,`invitee_type`,`user_id`,`client_id`,`external_email`)
);
--> statement-breakpoint
CREATE TABLE `calendar_invitation_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`invitation_id` int NOT NULL,
	`action` enum('CREATED','SENT','ACCEPTED','DECLINED','AUTO_ACCEPTED','CANCELLED','EXPIRED','ADMIN_OVERRIDE','RESENT') NOT NULL,
	`performed_by` int,
	`performed_at` timestamp NOT NULL DEFAULT (now()),
	`notes` text,
	`metadata` json,
	CONSTRAINT `calendar_invitation_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `calendar_invitation_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`auto_accept_all` boolean NOT NULL DEFAULT false,
	`auto_accept_from_organizers` json,
	`auto_accept_by_event_type` json,
	`auto_accept_by_module` json,
	`notify_on_invitation` boolean NOT NULL DEFAULT true,
	`notify_on_auto_accept` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `calendar_invitation_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `calendar_invitation_settings_user_id_unique` UNIQUE(`user_id`)
);
--> statement-breakpoint
CREATE TABLE `deployments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`commitSha` varchar(40) NOT NULL,
	`commitMessage` text NOT NULL,
	`commitTimestamp` timestamp NOT NULL,
	`branch` varchar(255) NOT NULL,
	`author` varchar(255) NOT NULL,
	`pusher` varchar(255) NOT NULL,
	`status` varchar(50) NOT NULL DEFAULT 'pending',
	`startedAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	`duration` int,
	`doDeploymentId` varchar(255),
	`buildLogs` text,
	`deploymentUrl` varchar(500),
	`errorMessage` text,
	`githubDeliveryId` varchar(255),
	`webhookPayload` json,
	CONSTRAINT `deployments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `purchaseOrderItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`purchaseOrderId` int NOT NULL,
	`productId` int NOT NULL,
	`quantityOrdered` decimal(15,4) NOT NULL,
	`quantityReceived` decimal(15,4) DEFAULT '0',
	`unitCost` decimal(15,4) NOT NULL,
	`totalCost` decimal(15,4) NOT NULL,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `purchaseOrderItems_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `purchaseOrders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`poNumber` varchar(50) NOT NULL,
	`vendorId` int NOT NULL,
	`intakeSessionId` int,
	`purchaseOrderStatus` enum('DRAFT','SENT','CONFIRMED','RECEIVING','RECEIVED','CANCELLED') NOT NULL DEFAULT 'DRAFT',
	`orderDate` date NOT NULL,
	`expectedDeliveryDate` date,
	`actualDeliveryDate` date,
	`subtotal` decimal(15,2) DEFAULT '0',
	`tax` decimal(15,2) DEFAULT '0',
	`shipping` decimal(15,2) DEFAULT '0',
	`total` decimal(15,2) DEFAULT '0',
	`paymentTerms` varchar(100),
	`paymentDueDate` date,
	`notes` text,
	`vendorNotes` text,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`sentAt` timestamp,
	`confirmedAt` timestamp,
	CONSTRAINT `purchaseOrders_id` PRIMARY KEY(`id`),
	CONSTRAINT `purchaseOrders_poNumber_unique` UNIQUE(`poNumber`)
);
--> statement-breakpoint
CREATE TABLE `supplier_profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`client_id` int NOT NULL,
	`contact_name` varchar(255),
	`contact_email` varchar(320),
	`contact_phone` varchar(50),
	`payment_terms` varchar(100),
	`supplier_notes` text,
	`legacy_vendor_id` int,
	`preferred_payment_method` enum('CASH','CHECK','WIRE','ACH','CREDIT_CARD','OTHER'),
	`tax_id` varchar(50),
	`license_number` varchar(100),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `supplier_profiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `supplier_profiles_client_id_unique` UNIQUE(`client_id`)
);
--> statement-breakpoint
CREATE TABLE `workflow_statuses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`slug` varchar(50) NOT NULL,
	`color` varchar(20) NOT NULL DEFAULT '#6B7280',
	`order` int NOT NULL DEFAULT 0,
	`isActive` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `workflow_statuses_id` PRIMARY KEY(`id`),
	CONSTRAINT `workflow_statuses_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
DROP INDEX `idx_roles_name` ON `roles`;--> statement-breakpoint
DROP INDEX `idx_permissions_name` ON `permissions`;--> statement-breakpoint
DROP INDEX `idx_permissions_module` ON `permissions`;--> statement-breakpoint
DROP INDEX `idx_role_permissions_role` ON `role_permissions`;--> statement-breakpoint
DROP INDEX `idx_role_permissions_permission` ON `role_permissions`;--> statement-breakpoint
DROP INDEX `idx_user_roles_user` ON `user_roles`;--> statement-breakpoint
DROP INDEX `idx_user_roles_role` ON `user_roles`;--> statement-breakpoint
DROP INDEX `idx_user_permission_overrides_user` ON `user_permission_overrides`;--> statement-breakpoint
DROP INDEX `idx_user_permission_overrides_permission` ON `user_permission_overrides`;--> statement-breakpoint
ALTER TABLE `calendar_events` MODIFY COLUMN `event_type` enum('MEETING','DEADLINE','TASK','DELIVERY','PAYMENT_DUE','FOLLOW_UP','AUDIT','INTAKE','PHOTOGRAPHY','BATCH_EXPIRATION','RECURRING_ORDER','SAMPLE_REQUEST','OTHER','AR_COLLECTION','AP_PAYMENT') NOT NULL;--> statement-breakpoint
ALTER TABLE `accounts` ADD `deleted_at` timestamp;--> statement-breakpoint
ALTER TABLE `auditLogs` ADD `deleted_at` timestamp;--> statement-breakpoint
ALTER TABLE `bankAccounts` ADD `deleted_at` timestamp;--> statement-breakpoint
ALTER TABLE `bankTransactions` ADD `deleted_at` timestamp;--> statement-breakpoint
ALTER TABLE `batchLocations` ADD `deleted_at` timestamp;--> statement-breakpoint
ALTER TABLE `batches` ADD `deleted_at` timestamp;--> statement-breakpoint
ALTER TABLE `batches` ADD `statusId` int;--> statement-breakpoint
ALTER TABLE `batches` ADD `photo_session_event_id` int;--> statement-breakpoint
ALTER TABLE `billLineItems` ADD `deleted_at` timestamp;--> statement-breakpoint
ALTER TABLE `bills` ADD `deleted_at` timestamp;--> statement-breakpoint
ALTER TABLE `brands` ADD `deleted_at` timestamp;--> statement-breakpoint
ALTER TABLE `calendar_events` ADD `client_id` int;--> statement-breakpoint
ALTER TABLE `calendar_events` ADD `vendor_id` int;--> statement-breakpoint
ALTER TABLE `calendar_events` ADD `metadata` json;--> statement-breakpoint
ALTER TABLE `categories` ADD `deleted_at` timestamp;--> statement-breakpoint
ALTER TABLE `cogsHistory` ADD `deleted_at` timestamp;--> statement-breakpoint
ALTER TABLE `credit_system_settings` ADD `deleted_at` timestamp;--> statement-breakpoint
ALTER TABLE `dashboard_kpi_configs` ADD `deleted_at` timestamp;--> statement-breakpoint
ALTER TABLE `dashboard_widget_layouts` ADD `deleted_at` timestamp;--> statement-breakpoint
ALTER TABLE `expenseCategories` ADD `deleted_at` timestamp;--> statement-breakpoint
ALTER TABLE `expenses` ADD `deleted_at` timestamp;--> statement-breakpoint
ALTER TABLE `fiscalPeriods` ADD `deleted_at` timestamp;--> statement-breakpoint
ALTER TABLE `freeform_notes` ADD `deleted_at` timestamp;--> statement-breakpoint
ALTER TABLE `grades` ADD `deleted_at` timestamp;--> statement-breakpoint
ALTER TABLE `inventoryMovements` ADD `deleted_at` timestamp;--> statement-breakpoint
ALTER TABLE `invoiceLineItems` ADD `deleted_at` timestamp;--> statement-breakpoint
ALTER TABLE `ledgerEntries` ADD `deleted_at` timestamp;--> statement-breakpoint
ALTER TABLE `locations` ADD `deleted_at` timestamp;--> statement-breakpoint
ALTER TABLE `lots` ADD `deleted_at` timestamp;--> statement-breakpoint
ALTER TABLE `note_activity` ADD `deleted_at` timestamp;--> statement-breakpoint
ALTER TABLE `note_comments` ADD `deleted_at` timestamp;--> statement-breakpoint
ALTER TABLE `orders` ADD `intake_event_id` int;--> statement-breakpoint
ALTER TABLE `paymentHistory` ADD `deleted_at` timestamp;--> statement-breakpoint
ALTER TABLE `pricing_profiles` ADD `deleted_at` timestamp;--> statement-breakpoint
ALTER TABLE `productMedia` ADD `deleted_at` timestamp;--> statement-breakpoint
ALTER TABLE `productSynonyms` ADD `deleted_at` timestamp;--> statement-breakpoint
ALTER TABLE `productTags` ADD `deleted_at` timestamp;--> statement-breakpoint
ALTER TABLE `products` ADD `deleted_at` timestamp;--> statement-breakpoint
ALTER TABLE `sales` ADD `deleted_at` timestamp;--> statement-breakpoint
ALTER TABLE `scratch_pad_notes` ADD `deleted_at` timestamp;--> statement-breakpoint
ALTER TABLE `sequences` ADD `deleted_at` timestamp;--> statement-breakpoint
ALTER TABLE `strains` ADD `deleted_at` timestamp;--> statement-breakpoint
ALTER TABLE `subcategories` ADD `deleted_at` timestamp;--> statement-breakpoint
ALTER TABLE `tagGroups` ADD `deleted_at` timestamp;--> statement-breakpoint
ALTER TABLE `tags` ADD `deleted_at` timestamp;--> statement-breakpoint
ALTER TABLE `userDashboardPreferences` ADD `deleted_at` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `deleted_at` timestamp;--> statement-breakpoint
ALTER TABLE `vendorNotes` ADD `deleted_at` timestamp;--> statement-breakpoint
ALTER TABLE `vendors` ADD `deleted_at` timestamp;--> statement-breakpoint
ALTER TABLE `batch_status_history` ADD CONSTRAINT `batch_status_history_batchId_batches_id_fk` FOREIGN KEY (`batchId`) REFERENCES `batches`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `batch_status_history` ADD CONSTRAINT `batch_status_history_fromStatusId_workflow_statuses_id_fk` FOREIGN KEY (`fromStatusId`) REFERENCES `workflow_statuses`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `batch_status_history` ADD CONSTRAINT `batch_status_history_toStatusId_workflow_statuses_id_fk` FOREIGN KEY (`toStatusId`) REFERENCES `workflow_statuses`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `batch_status_history` ADD CONSTRAINT `batch_status_history_changedBy_users_id_fk` FOREIGN KEY (`changedBy`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `calendar_event_invitations` ADD CONSTRAINT `calendar_event_invitations_event_id_calendar_events_id_fk` FOREIGN KEY (`event_id`) REFERENCES `calendar_events`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `calendar_event_invitations` ADD CONSTRAINT `calendar_event_invitations_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `calendar_event_invitations` ADD CONSTRAINT `calendar_event_invitations_client_id_clients_id_fk` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `calendar_event_invitations` ADD CONSTRAINT `calendar_event_invitations_overridden_by_users_id_fk` FOREIGN KEY (`overridden_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `calendar_event_invitations` ADD CONSTRAINT `calendar_event_invitations_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `calendar_invitation_history` ADD CONSTRAINT `calendar_invitation_history_performed_by_users_id_fk` FOREIGN KEY (`performed_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `calendar_invitation_settings` ADD CONSTRAINT `calendar_invitation_settings_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `purchaseOrderItems` ADD CONSTRAINT `purchaseOrderItems_purchaseOrderId_purchaseOrders_id_fk` FOREIGN KEY (`purchaseOrderId`) REFERENCES `purchaseOrders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `purchaseOrderItems` ADD CONSTRAINT `purchaseOrderItems_productId_products_id_fk` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `purchaseOrders` ADD CONSTRAINT `purchaseOrders_vendorId_vendors_id_fk` FOREIGN KEY (`vendorId`) REFERENCES `vendors`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `purchaseOrders` ADD CONSTRAINT `purchaseOrders_intakeSessionId_intake_sessions_id_fk` FOREIGN KEY (`intakeSessionId`) REFERENCES `intake_sessions`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `purchaseOrders` ADD CONSTRAINT `purchaseOrders_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `supplier_profiles` ADD CONSTRAINT `supplier_profiles_client_id_clients_id_fk` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_batch_status_history_batchId` ON `batch_status_history` (`batchId`);--> statement-breakpoint
CREATE INDEX `idx_batch_status_history_toStatusId` ON `batch_status_history` (`toStatusId`);--> statement-breakpoint
CREATE INDEX `idx_batch_status_history_changedBy` ON `batch_status_history` (`changedBy`);--> statement-breakpoint
CREATE INDEX `idx_batch_status_history_createdAt` ON `batch_status_history` (`createdAt`);--> statement-breakpoint
CREATE INDEX `idx_invitation_event` ON `calendar_event_invitations` (`event_id`);--> statement-breakpoint
CREATE INDEX `idx_invitation_user` ON `calendar_event_invitations` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_invitation_client` ON `calendar_event_invitations` (`client_id`);--> statement-breakpoint
CREATE INDEX `idx_invitation_status` ON `calendar_event_invitations` (`status`);--> statement-breakpoint
CREATE INDEX `idx_invitation_created_by` ON `calendar_event_invitations` (`created_by`);--> statement-breakpoint
CREATE INDEX `idx_history_invitation` ON `calendar_invitation_history` (`invitation_id`);--> statement-breakpoint
CREATE INDEX `idx_history_performed_by` ON `calendar_invitation_history` (`performed_by`);--> statement-breakpoint
CREATE INDEX `idx_deployments_status` ON `deployments` (`status`);--> statement-breakpoint
CREATE INDEX `idx_deployments_branch` ON `deployments` (`branch`);--> statement-breakpoint
CREATE INDEX `idx_deployments_started_at` ON `deployments` (`startedAt`);--> statement-breakpoint
CREATE INDEX `idx_deployments_commit_sha` ON `deployments` (`commitSha`);--> statement-breakpoint
CREATE INDEX `idx_poi_po_id` ON `purchaseOrderItems` (`purchaseOrderId`);--> statement-breakpoint
CREATE INDEX `idx_poi_product_id` ON `purchaseOrderItems` (`productId`);--> statement-breakpoint
CREATE INDEX `idx_po_vendor_id` ON `purchaseOrders` (`vendorId`);--> statement-breakpoint
CREATE INDEX `idx_po_status` ON `purchaseOrders` (`purchaseOrderStatus`);--> statement-breakpoint
CREATE INDEX `idx_po_order_date` ON `purchaseOrders` (`orderDate`);--> statement-breakpoint
CREATE INDEX `idx_supplier_profiles_client_id` ON `supplier_profiles` (`client_id`);--> statement-breakpoint
CREATE INDEX `idx_supplier_profiles_legacy_vendor` ON `supplier_profiles` (`legacy_vendor_id`);--> statement-breakpoint
CREATE INDEX `idx_workflow_statuses_order` ON `workflow_statuses` (`order`);--> statement-breakpoint
CREATE INDEX `idx_workflow_statuses_isActive` ON `workflow_statuses` (`isActive`);--> statement-breakpoint
ALTER TABLE `batches` ADD CONSTRAINT `batches_statusId_workflow_statuses_id_fk` FOREIGN KEY (`statusId`) REFERENCES `workflow_statuses`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `batches` ADD CONSTRAINT `batches_photo_session_event_id_calendar_events_id_fk` FOREIGN KEY (`photo_session_event_id`) REFERENCES `calendar_events`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `calendar_events` ADD CONSTRAINT `calendar_events_client_id_clients_id_fk` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `calendar_events` ADD CONSTRAINT `calendar_events_vendor_id_vendors_id_fk` FOREIGN KEY (`vendor_id`) REFERENCES `vendors`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `orders` ADD CONSTRAINT `orders_intake_event_id_calendar_events_id_fk` FOREIGN KEY (`intake_event_id`) REFERENCES `calendar_events`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_batches_product_id` ON `batches` (`productId`);--> statement-breakpoint
CREATE INDEX `idx_calendar_events_client_id` ON `calendar_events` (`client_id`);--> statement-breakpoint
CREATE INDEX `idx_calendar_events_vendor_id` ON `calendar_events` (`vendor_id`);--> statement-breakpoint
CREATE INDEX `idx_invoices_customer_id` ON `invoices` (`customerId`);--> statement-breakpoint
CREATE INDEX `idx_ledger_entries_account_id` ON `ledgerEntries` (`accountId`);
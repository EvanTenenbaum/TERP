-- Migration: Add Sales Sheet Drafts Table
-- Task: QA-062 - Sales Sheet Draft Functionality
-- Sprint: D - Sales, Inventory & Quality Assurance

CREATE TABLE `sales_sheet_drafts` (
  `id` int AUTO_INCREMENT NOT NULL,
  `client_id` int NOT NULL,
  `created_by` int NOT NULL,
  `name` varchar(255) NOT NULL,
  `items` json NOT NULL,
  `total_value` decimal(15,2) NOT NULL,
  `item_count` int NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `sales_sheet_drafts_id` PRIMARY KEY(`id`)
);--> statement-breakpoint

CREATE INDEX `idx_sales_sheet_drafts_client_id` ON `sales_sheet_drafts` (`client_id`);--> statement-breakpoint
CREATE INDEX `idx_sales_sheet_drafts_created_by` ON `sales_sheet_drafts` (`created_by`);--> statement-breakpoint
CREATE INDEX `idx_sales_sheet_drafts_updated_at` ON `sales_sheet_drafts` (`updated_at`);--> statement-breakpoint

ALTER TABLE `sales_sheet_drafts` ADD CONSTRAINT `sales_sheet_drafts_client_id_fk` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;--> statement-breakpoint
ALTER TABLE `sales_sheet_drafts` ADD CONSTRAINT `sales_sheet_drafts_created_by_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

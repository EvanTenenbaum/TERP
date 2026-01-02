-- Migration: Add Sales Sheet Drafts Table
-- Task: QA-062 - Sales Sheet Draft Functionality
-- Sprint: D - Sales, Inventory & Quality Assurance

CREATE TABLE IF NOT EXISTS `sales_sheet_drafts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `client_id` int NOT NULL,
  `created_by` int NOT NULL,
  `name` varchar(255) NOT NULL,
  `items` json NOT NULL,
  `total_value` decimal(15,2) NOT NULL,
  `item_count` int NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_drafts_client_id` (`client_id`),
  KEY `idx_drafts_created_by` (`created_by`),
  KEY `idx_drafts_updated_at` (`updated_at`),
  CONSTRAINT `sales_sheet_drafts_client_id_fk` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE CASCADE,
  CONSTRAINT `sales_sheet_drafts_created_by_fk` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

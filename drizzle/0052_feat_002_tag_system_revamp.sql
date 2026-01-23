-- FEAT-002: Tag System Revamp for Clients and Products
-- Adds color-coding, structured categories, and client tag support

-- STEP 1: Add color column to tags table
ALTER TABLE `tags` ADD COLUMN `color` VARCHAR(7) DEFAULT '#6B7280' AFTER `category`;--> statement-breakpoint

-- STEP 2: Update category column to use structured categories
-- Note: MySQL ENUM requires recreating the column
-- First, update any existing categories to match new structure
UPDATE `tags`
SET `category` = CASE
  WHEN `category` IN ('strain_type', 'strain') THEN 'STRAIN'
  WHEN `category` IN ('flavor', 'taste') THEN 'FLAVOR'
  WHEN `category` IN ('effect', 'effects') THEN 'EFFECT'
  WHEN `category` IN ('status', 'state') THEN 'STATUS'
  WHEN `category` IN ('priority', 'importance') THEN 'PRIORITY'
  WHEN `category` IN ('type', 'kind') THEN 'TYPE'
  ELSE 'CUSTOM'
END
WHERE `category` IS NOT NULL;--> statement-breakpoint

UPDATE `tags` SET `category` = 'CUSTOM' WHERE `category` IS NULL;--> statement-breakpoint

ALTER TABLE `tags` MODIFY COLUMN `category` ENUM('STATUS', 'PRIORITY', 'TYPE', 'CUSTOM', 'STRAIN', 'FLAVOR', 'EFFECT') DEFAULT 'CUSTOM';--> statement-breakpoint

-- STEP 3: Create clientTags junction table
CREATE TABLE `clientTags` (
  `id` int AUTO_INCREMENT NOT NULL,
  `clientId` int NOT NULL,
  `tagId` int NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL,
  CONSTRAINT `clientTags_id` PRIMARY KEY(`id`),
  CONSTRAINT `unique_client_tag` UNIQUE(`clientId`, `tagId`)
);--> statement-breakpoint

ALTER TABLE `clientTags` ADD CONSTRAINT `fk_clientTags_client` FOREIGN KEY (`clientId`) REFERENCES `clients`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;--> statement-breakpoint
ALTER TABLE `clientTags` ADD CONSTRAINT `fk_clientTags_tag` FOREIGN KEY (`tagId`) REFERENCES `tags`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;--> statement-breakpoint

CREATE INDEX `idx_clientTags_client` ON `clientTags` (`clientId`);--> statement-breakpoint
CREATE INDEX `idx_clientTags_tag` ON `clientTags` (`tagId`);--> statement-breakpoint
CREATE INDEX `idx_clientTags_client_tag` ON `clientTags` (`clientId`, `tagId`);--> statement-breakpoint

-- STEP 5: Add default color-coded tags (using INSERT IGNORE for idempotency)
-- Note: Seeding is best done via application scripts, but included for completeness
INSERT IGNORE INTO `tags` (`name`, `standardizedName`, `category`, `color`, `description`) VALUES
  ('VIP', 'vip', 'STATUS', '#9333EA', 'VIP client status'),
  ('High Priority', 'high-priority', 'PRIORITY', '#DC2626', 'High priority client or product'),
  ('Medium Priority', 'medium-priority', 'PRIORITY', '#F59E0B', 'Medium priority'),
  ('Low Priority', 'low-priority', 'PRIORITY', '#10B981', 'Low priority'),
  ('Active', 'active', 'STATUS', '#22C55E', 'Currently active'),
  ('Inactive', 'inactive', 'STATUS', '#6B7280', 'Currently inactive'),
  ('New', 'new', 'STATUS', '#3B82F6', 'New client or product'),
  ('Wholesale', 'wholesale', 'TYPE', '#8B5CF6', 'Wholesale client type'),
  ('Retail', 'retail', 'TYPE', '#06B6D4', 'Retail client type'),
  ('Premium', 'premium', 'TYPE', '#F59E0B', 'Premium tier');

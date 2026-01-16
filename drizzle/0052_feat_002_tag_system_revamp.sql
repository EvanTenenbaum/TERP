-- FEAT-002: Tag System Revamp for Clients and Products
-- Adds color-coding, structured categories, and client tag support

-- ============================================================================
-- STEP 1: Add color column to tags table
-- ============================================================================
ALTER TABLE `tags`
ADD COLUMN `color` VARCHAR(7) DEFAULT '#6B7280' AFTER `category`;

-- ============================================================================
-- STEP 2: Update category column to use structured categories
-- ============================================================================
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
WHERE `category` IS NOT NULL;

-- Set NULL categories to default
UPDATE `tags`
SET `category` = 'CUSTOM'
WHERE `category` IS NULL;

-- Change column to ENUM
ALTER TABLE `tags`
MODIFY COLUMN `category` ENUM('STATUS', 'PRIORITY', 'TYPE', 'CUSTOM', 'STRAIN', 'FLAVOR', 'EFFECT') DEFAULT 'CUSTOM';

-- ============================================================================
-- STEP 3: Create clientTags junction table
-- ============================================================================
CREATE TABLE IF NOT EXISTS `clientTags` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `clientId` INT NOT NULL,
  `tagId` INT NOT NULL,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` TIMESTAMP NULL,

  -- Foreign keys
  CONSTRAINT `fk_clientTags_client`
    FOREIGN KEY (`clientId`) REFERENCES `clients`(`id`)
    ON DELETE CASCADE,
  CONSTRAINT `fk_clientTags_tag`
    FOREIGN KEY (`tagId`) REFERENCES `tags`(`id`)
    ON DELETE CASCADE,

  -- Indexes for performance
  INDEX `idx_clientTags_client` (`clientId`),
  INDEX `idx_clientTags_tag` (`tagId`),
  INDEX `idx_clientTags_client_tag` (`clientId`, `tagId`),

  -- Prevent duplicate tag assignments
  UNIQUE KEY `unique_client_tag` (`clientId`, `tagId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- STEP 4: Migrate existing client JSON tags to clientTags table
-- ============================================================================
-- Note: This will be handled by application code if needed
-- The clients.tags JSON field will remain for backward compatibility
-- but new tag management will use the clientTags junction table

-- ============================================================================
-- STEP 5: Add some default color-coded tags for common use cases
-- ============================================================================
INSERT INTO `tags` (`name`, `standardizedName`, `category`, `color`, `description`) VALUES
  ('VIP', 'vip', 'STATUS', '#9333EA', 'VIP client status'),
  ('High Priority', 'high-priority', 'PRIORITY', '#DC2626', 'High priority client or product'),
  ('Medium Priority', 'medium-priority', 'PRIORITY', '#F59E0B', 'Medium priority'),
  ('Low Priority', 'low-priority', 'PRIORITY', '#10B981', 'Low priority'),
  ('Active', 'active', 'STATUS', '#22C55E', 'Currently active'),
  ('Inactive', 'inactive', 'STATUS', '#6B7280', 'Currently inactive'),
  ('New', 'new', 'STATUS', '#3B82F6', 'New client or product'),
  ('Wholesale', 'wholesale', 'TYPE', '#8B5CF6', 'Wholesale client type'),
  ('Retail', 'retail', 'TYPE', '#06B6D4', 'Retail client type'),
  ('Premium', 'premium', 'TYPE', '#F59E0B', 'Premium tier')
ON DUPLICATE KEY UPDATE
  `category` = VALUES(`category`),
  `color` = VALUES(`color`),
  `description` = VALUES(`description`);

-- ============================================================================
-- STEP 6: Update comment for tags table
-- ============================================================================
ALTER TABLE `tags`
COMMENT = 'FEAT-002: Stores product and client tags with color-coding and categories';

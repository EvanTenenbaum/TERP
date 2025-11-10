-- Migration: Add Workflow Queue Management Tables
-- Initiative: 1.3 Workflow Queue Management
-- Date: 2025-11-08
-- Description: Creates workflow_statuses and batch_status_history tables, adds statusId to batches

-- ============================================================================
-- 1. Create workflow_statuses table
-- ============================================================================
CREATE TABLE IF NOT EXISTS `workflow_statuses` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL COMMENT 'Display name for the status',
  `slug` VARCHAR(50) NOT NULL UNIQUE COMMENT 'URL-safe identifier',
  `color` VARCHAR(20) NOT NULL DEFAULT '#6B7280' COMMENT 'Hex color for UI display',
  `order` INT NOT NULL DEFAULT 0 COMMENT 'Display order in Kanban board',
  `isActive` TINYINT NOT NULL DEFAULT 1 COMMENT 'Soft delete flag (0=deleted, 1=active)',
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_workflow_statuses_order` (`order`),
  INDEX `idx_workflow_statuses_isActive` (`isActive`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 2. Create batch_status_history table (audit log)
-- ============================================================================
CREATE TABLE IF NOT EXISTS `batch_status_history` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `batchId` INT NOT NULL COMMENT 'Reference to batches.id',
  `fromStatusId` INT NULL COMMENT 'Previous status (NULL for initial status)',
  `toStatusId` INT NOT NULL COMMENT 'New status',
  `changedBy` INT NOT NULL COMMENT 'User who made the change',
  `notes` TEXT NULL COMMENT 'Optional notes about the status change',
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_batch_status_history_batchId` (`batchId`),
  INDEX `idx_batch_status_history_toStatusId` (`toStatusId`),
  INDEX `idx_batch_status_history_changedBy` (`changedBy`),
  INDEX `idx_batch_status_history_createdAt` (`createdAt`),
  CONSTRAINT `fk_batch_status_history_batchId` 
    FOREIGN KEY (`batchId`) REFERENCES `batches` (`id`) 
    ON DELETE CASCADE,
  CONSTRAINT `fk_batch_status_history_fromStatusId` 
    FOREIGN KEY (`fromStatusId`) REFERENCES `workflow_statuses` (`id`) 
    ON DELETE SET NULL,
  CONSTRAINT `fk_batch_status_history_toStatusId` 
    FOREIGN KEY (`toStatusId`) REFERENCES `workflow_statuses` (`id`) 
    ON DELETE RESTRICT,
  CONSTRAINT `fk_batch_status_history_changedBy` 
    FOREIGN KEY (`changedBy`) REFERENCES `users` (`id`) 
    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 3. Add statusId column to batches table
-- ============================================================================
ALTER TABLE `batches` 
ADD COLUMN `statusId` INT NULL COMMENT 'Reference to workflow_statuses.id (NULL = using legacy status enum)' AFTER `batchStatus`;

-- Add foreign key constraint
ALTER TABLE `batches`
ADD CONSTRAINT `fk_batches_statusId` 
  FOREIGN KEY (`statusId`) REFERENCES `workflow_statuses` (`id`) 
  ON DELETE SET NULL;

-- Add index for performance
ALTER TABLE `batches`
ADD INDEX `idx_batches_statusId` (`statusId`);

-- ============================================================================
-- 4. Insert default workflow statuses (seed data)
-- ============================================================================
INSERT INTO `workflow_statuses` (`name`, `slug`, `color`, `order`, `isActive`) VALUES
  ('Intake Queue', 'intake-queue', '#EF4444', 1, 1),
  ('Quality Check', 'quality-check', '#F59E0B', 2, 1),
  ('Lab Testing', 'lab-testing', '#3B82F6', 3, 1),
  ('Packaging', 'packaging', '#8B5CF6', 4, 1),
  ('Ready for Sale', 'ready-for-sale', '#10B981', 5, 1),
  ('On Hold', 'on-hold', '#6B7280', 6, 1);

-- ============================================================================
-- Migration Notes:
-- ============================================================================
-- - The statusId field is nullable to maintain backward compatibility
-- - Existing batches will continue using the legacy 'status' enum field
-- - New workflow queue feature will use statusId FK
-- - Migration path: Gradually migrate batches from enum to FK-based status
-- - The 'status' enum field will be deprecated in a future migration
-- ============================================================================

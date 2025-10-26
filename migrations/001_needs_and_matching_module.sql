-- ============================================================================
-- TERP Needs & Matching Intelligence Module - Database Migration
-- ============================================================================
-- Version: 1.0.0
-- Date: 2024-12-26
-- Database: MySQL 8.0+
-- 
-- This migration creates 3 new tables for the Needs & Matching module:
-- 1. client_needs - Track client product needs
-- 2. vendor_supply - Track vendor supply items
-- 3. match_records - Record matches for analytics
--
-- IMPORTANT: This is MySQL syntax. Run this on your MySQL database.
-- ============================================================================

-- ============================================================================
-- TABLE: client_needs
-- ============================================================================
-- Tracks client product needs with specifications, priority, and status
-- ============================================================================

CREATE TABLE IF NOT EXISTS `client_needs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `clientId` INT NOT NULL,
  `strain` VARCHAR(100) DEFAULT NULL,
  `category` VARCHAR(100) DEFAULT NULL,
  `subcategory` VARCHAR(100) DEFAULT NULL,
  `grade` VARCHAR(20) DEFAULT NULL,
  `quantityMin` VARCHAR(20) DEFAULT NULL,
  `quantityMax` VARCHAR(20) DEFAULT NULL,
  `priceMax` VARCHAR(20) DEFAULT NULL,
  `neededBy` TIMESTAMP NULL DEFAULT NULL,
  `priority` ENUM('LOW', 'MEDIUM', 'HIGH', 'URGENT') NOT NULL DEFAULT 'MEDIUM',
  `status` ENUM('ACTIVE', 'FULFILLED', 'EXPIRED', 'CANCELLED') NOT NULL DEFAULT 'ACTIVE',
  `notes` TEXT DEFAULT NULL,
  `createdBy` INT NOT NULL,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Indexes for performance
  INDEX `idx_client` (`clientId`),
  INDEX `idx_status` (`status`),
  INDEX `idx_priority` (`priority`),
  INDEX `idx_needed_by` (`neededBy`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABLE: vendor_supply
-- ============================================================================
-- Tracks vendor supply items with availability windows
-- ============================================================================

CREATE TABLE IF NOT EXISTS `vendor_supply` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `vendorId` INT NOT NULL,
  `strain` VARCHAR(100) DEFAULT NULL,
  `category` VARCHAR(100) DEFAULT NULL,
  `subcategory` VARCHAR(100) DEFAULT NULL,
  `grade` VARCHAR(20) DEFAULT NULL,
  `quantityAvailable` VARCHAR(20) DEFAULT NULL,
  `pricePerUnit` VARCHAR(20) DEFAULT NULL,
  `availableUntil` TIMESTAMP NULL DEFAULT NULL,
  `status` ENUM('AVAILABLE', 'RESERVED', 'SOLD', 'EXPIRED') NOT NULL DEFAULT 'AVAILABLE',
  `notes` TEXT DEFAULT NULL,
  `createdBy` INT NOT NULL,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Indexes for performance
  INDEX `idx_vendor` (`vendorId`),
  INDEX `idx_status` (`status`),
  INDEX `idx_available_until` (`availableUntil`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABLE: match_records
-- ============================================================================
-- Records matches between client needs and inventory/vendor supply
-- Used for analytics, learning, and conversion tracking
-- ============================================================================

CREATE TABLE IF NOT EXISTS `match_records` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `clientId` INT NOT NULL,
  `clientNeedId` INT DEFAULT NULL,
  `inventoryBatchId` INT DEFAULT NULL,
  `vendorSupplyId` INT DEFAULT NULL,
  `matchType` ENUM('EXACT', 'CLOSE', 'HISTORICAL') NOT NULL,
  `confidenceScore` VARCHAR(10) DEFAULT NULL,
  `matchReasons` JSON DEFAULT NULL,
  `userAction` ENUM('CREATED_QUOTE', 'CONTACTED_VENDOR', 'DISMISSED') DEFAULT NULL,
  `actionAt` TIMESTAMP NULL DEFAULT NULL,
  `actionBy` INT DEFAULT NULL,
  `resultedInSale` BOOLEAN NOT NULL DEFAULT FALSE,
  `saleOrderId` INT DEFAULT NULL,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  -- Indexes for performance
  INDEX `idx_client` (`clientId`),
  INDEX `idx_need` (`clientNeedId`),
  INDEX `idx_batch` (`inventoryBatchId`),
  INDEX `idx_vendor_supply` (`vendorSupplyId`),
  INDEX `idx_match_type` (`matchType`),
  INDEX `idx_user_action` (`userAction`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these queries after migration to verify tables were created successfully
-- ============================================================================

-- Check if tables exist
SELECT 
  TABLE_NAME,
  TABLE_ROWS,
  CREATE_TIME
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME IN ('client_needs', 'vendor_supply', 'match_records')
ORDER BY TABLE_NAME;

-- Check indexes on client_needs
SHOW INDEX FROM client_needs;

-- Check indexes on vendor_supply
SHOW INDEX FROM vendor_supply;

-- Check indexes on match_records
SHOW INDEX FROM match_records;

-- ============================================================================
-- ROLLBACK SCRIPT (if needed)
-- ============================================================================
-- Uncomment and run these commands if you need to rollback this migration
-- WARNING: This will delete all data in these tables!
-- ============================================================================

-- DROP TABLE IF EXISTS `match_records`;
-- DROP TABLE IF EXISTS `vendor_supply`;
-- DROP TABLE IF EXISTS `client_needs`;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================


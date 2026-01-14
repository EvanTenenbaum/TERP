-- DI-007: Migrate VARCHAR to DECIMAL for Numeric Columns
-- Migrates 29 VARCHAR(20) columns storing numeric data to proper DECIMAL types
-- This improves data integrity, enables proper numeric operations, and prevents string-based arithmetic errors

-- ============================================================================
-- BATCHES TABLE - COGS and Quantity Columns
-- ============================================================================

-- COGS columns: Use DECIMAL(12,4) for cost precision
ALTER TABLE `batches`
  MODIFY COLUMN `unitCogs` DECIMAL(12,4) NULL,
  MODIFY COLUMN `unitCogsMin` DECIMAL(12,4) NULL,
  MODIFY COLUMN `unitCogsMax` DECIMAL(12,4) NULL;

-- Money column: Use DECIMAL(12,2) for currency
ALTER TABLE `batches`
  MODIFY COLUMN `amountPaid` DECIMAL(12,2) DEFAULT 0;

-- Quantity columns: Use DECIMAL(15,4) for inventory quantities with fractional units
ALTER TABLE `batches`
  MODIFY COLUMN `onHandQty` DECIMAL(15,4) NOT NULL DEFAULT 0,
  MODIFY COLUMN `sampleQty` DECIMAL(15,4) NOT NULL DEFAULT 0,
  MODIFY COLUMN `reservedQty` DECIMAL(15,4) NOT NULL DEFAULT 0,
  MODIFY COLUMN `quarantineQty` DECIMAL(15,4) NOT NULL DEFAULT 0,
  MODIFY COLUMN `holdQty` DECIMAL(15,4) NOT NULL DEFAULT 0,
  MODIFY COLUMN `defectiveQty` DECIMAL(15,4) NOT NULL DEFAULT 0;

-- ============================================================================
-- PAYMENT HISTORY TABLE
-- ============================================================================

ALTER TABLE `paymentHistory`
  MODIFY COLUMN `amount` DECIMAL(12,2) NOT NULL;

-- ============================================================================
-- BATCH LOCATIONS TABLE
-- ============================================================================

ALTER TABLE `batchLocations`
  MODIFY COLUMN `qty` DECIMAL(15,4) NOT NULL;

-- ============================================================================
-- SALES TABLE
-- ============================================================================

ALTER TABLE `sales`
  MODIFY COLUMN `quantity` DECIMAL(15,4) NOT NULL,
  MODIFY COLUMN `cogsAtSale` DECIMAL(12,4) NOT NULL,
  MODIFY COLUMN `salePrice` DECIMAL(12,2) NOT NULL;

-- ============================================================================
-- COGS HISTORY TABLE
-- ============================================================================

ALTER TABLE `cogsHistory`
  MODIFY COLUMN `oldCogs` DECIMAL(12,4) NULL,
  MODIFY COLUMN `newCogs` DECIMAL(12,4) NOT NULL;

-- ============================================================================
-- TRANSACTIONS TABLE
-- ============================================================================

ALTER TABLE `transactions`
  MODIFY COLUMN `amount` DECIMAL(12,2) NOT NULL;

-- ============================================================================
-- TRANSACTION LINKS TABLE
-- ============================================================================

ALTER TABLE `transactionLinks`
  MODIFY COLUMN `linkAmount` DECIMAL(12,2) NULL;

-- ============================================================================
-- CREDITS TABLE
-- ============================================================================

ALTER TABLE `credits`
  MODIFY COLUMN `creditAmount` DECIMAL(12,2) NOT NULL,
  MODIFY COLUMN `amountUsed` DECIMAL(12,2) NOT NULL DEFAULT 0,
  MODIFY COLUMN `amountRemaining` DECIMAL(12,2) NOT NULL;

-- ============================================================================
-- CREDIT APPLICATIONS TABLE
-- ============================================================================

ALTER TABLE `creditApplications`
  MODIFY COLUMN `amountApplied` DECIMAL(12,2) NOT NULL;

-- ============================================================================
-- INVENTORY MOVEMENTS TABLE
-- ============================================================================

ALTER TABLE `inventoryMovements`
  MODIFY COLUMN `quantityChange` DECIMAL(15,4) NOT NULL,
  MODIFY COLUMN `quantityBefore` DECIMAL(15,4) NOT NULL,
  MODIFY COLUMN `quantityAfter` DECIMAL(15,4) NOT NULL;

-- ============================================================================
-- SAMPLE ALLOCATIONS TABLE
-- ============================================================================

ALTER TABLE `sampleAllocations`
  MODIFY COLUMN `allocatedQuantity` DECIMAL(15,4) NOT NULL,
  MODIFY COLUMN `usedQuantity` DECIMAL(15,4) NOT NULL DEFAULT 0,
  MODIFY COLUMN `remainingQuantity` DECIMAL(15,4) NOT NULL;

-- ============================================================================
-- MIGRATION NOTES
-- ============================================================================
--
-- Column Type Decisions:
-- - Money/Currency fields: DECIMAL(12,2) - 10 digits before decimal, 2 after
-- - COGS fields: DECIMAL(12,4) - 8 digits before decimal, 4 after for precision
-- - Quantity fields: DECIMAL(15,4) - 11 digits before decimal, 4 after for large quantities
--
-- Default Values:
-- - String "0" defaults are converted to numeric 0
-- - NULL values remain NULL
--
-- Data Conversion:
-- - MySQL automatically converts VARCHAR to DECIMAL during MODIFY COLUMN
-- - Invalid values will be converted to 0 or NULL (depending on column constraints)
-- - Existing numeric strings will be preserved exactly
--
-- Tables Modified (11 tables, 29 columns):
-- 1. batches (10 columns)
-- 2. paymentHistory (1 column)
-- 3. batchLocations (1 column)
-- 4. sales (3 columns)
-- 5. cogsHistory (2 columns)
-- 6. transactions (1 column)
-- 7. transactionLinks (1 column)
-- 8. credits (3 columns)
-- 9. creditApplications (1 column)
-- 10. inventoryMovements (3 columns)
-- 11. sampleAllocations (3 columns)
--
-- Rollback Plan:
-- To rollback, reverse each MODIFY COLUMN statement with VARCHAR(20):
-- Example: ALTER TABLE `batches` MODIFY COLUMN `unitCogs` VARCHAR(20) NULL;
--
-- ============================================================================

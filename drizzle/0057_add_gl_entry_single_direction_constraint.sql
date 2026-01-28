-- Migration: 0057_add_gl_entry_single_direction_constraint.sql
-- Description: Add CHECK constraint to ensure GL entries have either debit OR credit, never both
-- Task: ST-057
-- Created: 2026-01-28
-- Rollback: ALTER TABLE `ledgerEntries` DROP CONSTRAINT `chk_single_direction`;

-- ============================================================================
-- PROBLEM:
-- In double-entry bookkeeping, each ledger entry line should have either a
-- debit OR a credit, never both. Currently, the schema allows both fields
-- to be populated, which violates double-entry accounting principles.
--
-- SOLUTION:
-- Add a CHECK constraint that ensures:
-- - If debit > 0, then credit must = 0
-- - If credit > 0, then debit must = 0
-- - Both can be 0 (for zero-value entries, though uncommon)
-- ============================================================================

-- ============================================================================
-- PHASE 1: AUDIT FOR EXISTING VIOLATIONS
-- ============================================================================
-- Log any violations for debugging (this is informational only)
-- The constraint will fail to apply if violations exist

-- Query to find violations (for reference):
-- SELECT id, accountId, debit, credit
-- FROM `ledgerEntries`
-- WHERE CAST(debit AS DECIMAL(12,2)) > 0
--   AND CAST(credit AS DECIMAL(12,2)) > 0;

-- ============================================================================
-- PHASE 2: FIX ANY EXISTING VIOLATIONS
-- ============================================================================
-- If any entries have both debit AND credit > 0, we need to fix them.
-- Strategy: Keep the larger value, zero out the smaller one.
-- This is a conservative approach that maintains the net effect.
--
-- Example: debit=100, credit=50 becomes debit=50, credit=0 (net debit of 50)
--
-- NOTE: Based on code review, the existing application code always sets
-- one field to the amount and the other to "0.00", so violations are unlikely.

-- For entries where debit > credit, net to debit only
UPDATE `ledgerEntries`
SET
  `debit` = CAST(`debit` AS DECIMAL(12,2)) - CAST(`credit` AS DECIMAL(12,2)),
  `credit` = 0.00
WHERE CAST(`debit` AS DECIMAL(12,2)) > 0
  AND CAST(`credit` AS DECIMAL(12,2)) > 0
  AND CAST(`debit` AS DECIMAL(12,2)) > CAST(`credit` AS DECIMAL(12,2));

-- For entries where credit > debit, net to credit only
UPDATE `ledgerEntries`
SET
  `credit` = CAST(`credit` AS DECIMAL(12,2)) - CAST(`debit` AS DECIMAL(12,2)),
  `debit` = 0.00
WHERE CAST(`debit` AS DECIMAL(12,2)) > 0
  AND CAST(`credit` AS DECIMAL(12,2)) > 0
  AND CAST(`credit` AS DECIMAL(12,2)) > CAST(`debit` AS DECIMAL(12,2));

-- For entries where debit = credit (and both > 0), zero both
-- These are effectively no-ops and can be safely zeroed
UPDATE `ledgerEntries`
SET
  `debit` = 0.00,
  `credit` = 0.00
WHERE CAST(`debit` AS DECIMAL(12,2)) > 0
  AND CAST(`credit` AS DECIMAL(12,2)) > 0
  AND CAST(`debit` AS DECIMAL(12,2)) = CAST(`credit` AS DECIMAL(12,2));

-- ============================================================================
-- PHASE 3: ADD CHECK CONSTRAINT (Idempotent for MySQL 8.0+)
-- ============================================================================
-- MySQL 8.0.16+ supports CHECK constraints
-- We wrap in conditional check to be idempotent

SET @constraint_exists = (
  SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'ledgerEntries'
    AND CONSTRAINT_NAME = 'chk_single_direction'
);
SET @sql = IF(@constraint_exists = 0,
  'ALTER TABLE `ledgerEntries` ADD CONSTRAINT `chk_single_direction` CHECK (
    (CAST(debit AS DECIMAL(12,2)) = 0 AND CAST(credit AS DECIMAL(12,2)) >= 0) OR
    (CAST(credit AS DECIMAL(12,2)) = 0 AND CAST(debit AS DECIMAL(12,2)) >= 0)
  )',
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================================================
-- VERIFICATION:
-- Run this query after migration to verify the constraint exists:
--
-- SELECT CONSTRAINT_NAME, CHECK_CLAUSE
-- FROM information_schema.CHECK_CONSTRAINTS
-- WHERE CONSTRAINT_SCHEMA = DATABASE()
--   AND CONSTRAINT_NAME = 'chk_single_direction';
-- ============================================================================

-- ============================================================================
-- ROLLBACK PLAN:
-- Run this command to rollback this migration:
--
-- ALTER TABLE `ledgerEntries` DROP CONSTRAINT `chk_single_direction`;
--
-- NOTE: The data fixes in Phase 2 cannot be automatically rolled back.
-- If rollback is needed, restore from backup or manually review affected rows.
-- ============================================================================

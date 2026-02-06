-- Migration: 0057_add_gl_entry_single_direction_constraint.sql
-- Description: Add CHECK constraint to ensure GL entries have either debit OR credit, never both
-- Task: ST-057
-- Created: 2026-01-28
-- Optimized: 2026-02-06 - Added indexes, consolidated updates, conditional execution
-- Rollback: ALTER TABLE `ledgerEntries` DROP CONSTRAINT `chk_single_direction`; DROP INDEX idx_ledger_entries_debit; DROP INDEX idx_ledger_entries_credit;

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
--
-- OPTIMIZATIONS:
-- - Add indexes on debit/credit to speed up queries
-- - Check for violations first to avoid unnecessary updates
-- - Consolidate fixes into single UPDATE with CASE logic
-- - Remove unnecessary CASTs (columns are already DECIMAL)
-- ============================================================================

-- ============================================================================
-- PHASE 1: ADD INDEXES FOR PERFORMANCE
-- ============================================================================
-- Add indexes to speed up violation checks and updates
-- These indexes help with WHERE debit > 0 AND credit > 0 conditions

SET @index_debit_exists = (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'ledgerEntries'
    AND INDEX_NAME = 'idx_ledger_entries_debit'
);
SET @sql_debit = IF(@index_debit_exists = 0,
  'CREATE INDEX idx_ledger_entries_debit ON ledgerEntries(debit)',
  'SELECT 1');
PREPARE stmt_debit FROM @sql_debit;
EXECUTE stmt_debit;
DEALLOCATE PREPARE stmt_debit;

SET @index_credit_exists = (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'ledgerEntries'
    AND INDEX_NAME = 'idx_ledger_entries_credit'
);
SET @sql_credit = IF(@index_credit_exists = 0,
  'CREATE INDEX idx_ledger_entries_credit ON ledgerEntries(credit)',
  'SELECT 1');
PREPARE stmt_credit FROM @sql_credit;
EXECUTE stmt_credit;
DEALLOCATE PREPARE stmt_credit;

-- ============================================================================
-- PHASE 2: CHECK AND FIX VIOLATIONS
-- ============================================================================
-- Only run fixes if violations exist to avoid unnecessary table scans

SET @violation_count = (
  SELECT COUNT(*) FROM ledgerEntries
  WHERE debit > 0 AND credit > 0
);

-- If violations exist, fix them in a single UPDATE
SET @sql_fix = IF(@violation_count > 0,
  'UPDATE ledgerEntries
   SET
     debit = CASE
       WHEN debit > credit THEN debit - credit
       WHEN credit > debit THEN 0.00
       ELSE 0.00
     END,
     credit = CASE
       WHEN credit > debit THEN credit - debit
       WHEN debit > credit THEN 0.00
       ELSE 0.00
     END
   WHERE debit > 0 AND credit > 0',
  'SELECT 1');
PREPARE stmt_fix FROM @sql_fix;
EXECUTE stmt_fix;
DEALLOCATE PREPARE stmt_fix;

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
SET @sql_constraint = IF(@constraint_exists = 0,
  'ALTER TABLE `ledgerEntries` ADD CONSTRAINT `chk_single_direction` CHECK (
    (debit = 0 AND credit >= 0) OR
    (credit = 0 AND debit >= 0)
  )',
  'SELECT 1');
PREPARE stmt_constraint FROM @sql_constraint;
EXECUTE stmt_constraint;
DEALLOCATE PREPARE stmt_constraint;

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

-- Migration: 0060_add_batch_quantity_check_constraints.sql
-- Description: Add CHECK constraints to prevent negative batch quantities
-- Task: ST-056
-- Created: 2026-01-28
-- Prerequisite: BUG-117 (race condition fix) is COMPLETE
--
-- This migration adds database-level CHECK constraints to the batches table
-- to ensure quantity columns can never go negative. This is a safety net
-- to catch any application bugs or race conditions that might try to
-- set quantities below zero.
--
-- Related: GF-001, GF-003, GF-007, GF-008 (blocked by this task)
--
-- IMPORTANT: Before running this migration, verify no negative values exist:
-- SELECT id, onHandQty, reservedQty, sampleQty
-- FROM batches
-- WHERE CAST(onHandQty AS DECIMAL(15,4)) < 0
--    OR CAST(reservedQty AS DECIMAL(15,4)) < 0
--    OR CAST(sampleQty AS DECIMAL(15,4)) < 0;

-- ============================================================================
-- STEP 1: Add CHECK constraints for non-negative quantities
-- ============================================================================
-- MySQL requires CAST for decimal comparisons in CHECK constraints

ALTER TABLE `batches`
  ADD CONSTRAINT `chk_batches_onHandQty_nonnegative`
    CHECK (CAST(`onHandQty` AS DECIMAL(15,4)) >= 0),
  ADD CONSTRAINT `chk_batches_reservedQty_nonnegative`
    CHECK (CAST(`reservedQty` AS DECIMAL(15,4)) >= 0),
  ADD CONSTRAINT `chk_batches_sampleQty_nonnegative`
    CHECK (CAST(`sampleQty` AS DECIMAL(15,4)) >= 0);

-- ============================================================================
-- VERIFICATION: Test that constraints are active
-- ============================================================================
-- After migration, these should fail (run manually to verify):
-- UPDATE batches SET onHandQty = -1 WHERE id = 1;  -- Should fail
-- UPDATE batches SET reservedQty = -1 WHERE id = 1;  -- Should fail
-- UPDATE batches SET sampleQty = -1 WHERE id = 1;  -- Should fail

-- ============================================================================
-- ROLLBACK PLAN:
-- ============================================================================
-- To rollback this migration, run:
-- ALTER TABLE `batches`
--   DROP CONSTRAINT `chk_batches_onHandQty_nonnegative`,
--   DROP CONSTRAINT `chk_batches_reservedQty_nonnegative`,
--   DROP CONSTRAINT `chk_batches_sampleQty_nonnegative`;
-- ============================================================================

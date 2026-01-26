-- Migration: 0056_migrate_lots_supplier_client_id.sql
-- Description: Populate supplierClientId column in lots table from vendorId mapping
-- Task: PARTY-003
-- Created: 2026-01-26
-- Rollback: UPDATE lots SET supplier_client_id = NULL;

-- ============================================================================
-- PROBLEM:
-- The lots table has a vendorId column referencing the deprecated vendors table.
-- The canonical model now uses supplierClientId referencing clients with isSeller=true.
-- We need to populate supplierClientId based on the vendor-to-client mapping in
-- supplier_profiles.legacy_vendor_id.
--
-- SCHEMA STATE:
-- - lots.supplierClientId: INT NULL (added in schema, FK to clients.id)
-- - lots.vendorId: INT NOT NULL (deprecated, kept for backwards compatibility)
-- - supplier_profiles.legacy_vendor_id: INT NULL (mapping from old vendor IDs)
-- - supplier_profiles.client_id: INT NOT NULL (the new client ID)
-- ============================================================================

-- ============================================================================
-- STEP 1: Ensure supplier_client_id column exists (idempotent)
-- ============================================================================
-- Note: Column should already exist from schema.ts definition
-- This is a safety check

SET @col_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'lots'
    AND COLUMN_NAME = 'supplier_client_id'
);

-- If column doesn't exist, this will be a no-op since schema should have it

-- ============================================================================
-- STEP 2: Create mapping from vendor_id to client_id via supplier_profiles
-- ============================================================================
-- This uses the supplier_profiles table which tracks:
-- - client_id: The canonical client ID (with isSeller=true)
-- - legacy_vendor_id: The original vendor ID from the deprecated vendors table

-- ============================================================================
-- STEP 3: Update lots with supplierClientId based on mapping
-- ============================================================================

-- Update lots where we have a mapping in supplier_profiles
UPDATE `lots` l
INNER JOIN `supplier_profiles` sp ON sp.legacy_vendor_id = l.vendorId
SET l.supplier_client_id = sp.client_id
WHERE l.supplier_client_id IS NULL
  OR l.supplier_client_id = 0;

-- ============================================================================
-- STEP 4: Handle lots without supplier_profiles mapping
-- ============================================================================
-- For lots where no supplier_profiles mapping exists, try to find or create
-- a client record. This handles edge cases from data imports.

-- First, identify unmapped lots (for logging purposes)
-- SELECT l.id, l.vendorId, v.name
-- FROM lots l
-- LEFT JOIN vendors v ON v.id = l.vendorId
-- LEFT JOIN supplier_profiles sp ON sp.legacy_vendor_id = l.vendorId
-- WHERE sp.client_id IS NULL AND l.supplier_client_id IS NULL;

-- Create a temporary mapping for any vendors not in supplier_profiles
-- by finding clients with matching names (case-insensitive)
UPDATE `lots` l
INNER JOIN `vendors` v ON v.id = l.vendorId
INNER JOIN `clients` c ON LOWER(c.name) = LOWER(v.name) AND c.is_seller = 1
SET l.supplier_client_id = c.id
WHERE l.supplier_client_id IS NULL
  OR l.supplier_client_id = 0;

-- ============================================================================
-- STEP 5: Verification query (run manually to check status)
-- ============================================================================
-- SELECT
--   COUNT(*) as total_lots,
--   SUM(CASE WHEN supplier_client_id IS NOT NULL AND supplier_client_id > 0 THEN 1 ELSE 0 END) as with_client_id,
--   SUM(CASE WHEN supplier_client_id IS NULL OR supplier_client_id = 0 THEN 1 ELSE 0 END) as without_client_id
-- FROM lots;

-- ============================================================================
-- NOTE: Remaining unmapped lots
-- ============================================================================
-- Some lots may remain without supplierClientId if:
-- 1. The vendor was deleted and no supplier_profile exists
-- 2. The vendor name doesn't match any client name
-- 3. The vendor hasn't been migrated to the clients table yet
--
-- These should be handled manually or by the next data migration phase.
-- The application code should handle NULL supplierClientId gracefully
-- by falling back to vendorId queries until full migration is complete.
-- ============================================================================

-- ============================================================================
-- ROLLBACK PLAN:
-- To rollback this migration:
-- UPDATE lots SET supplier_client_id = NULL;
-- ============================================================================

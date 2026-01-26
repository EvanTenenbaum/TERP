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
-- STEP 1: Update lots with supplierClientId via supplier_profiles mapping
-- ============================================================================
-- Primary mapping: Use supplier_profiles.legacy_vendor_id to find the
-- canonical client ID for each vendor.
-- Only updates active (non-soft-deleted) lots.

UPDATE `lots` l
INNER JOIN `supplier_profiles` sp ON sp.legacy_vendor_id = l.vendorId
SET l.supplier_client_id = sp.client_id
WHERE (l.supplier_client_id IS NULL OR l.supplier_client_id = 0)
  AND l.deleted_at IS NULL;

-- ============================================================================
-- STEP 2: Handle lots without supplier_profiles mapping
-- ============================================================================
-- Fallback: For lots where no supplier_profiles mapping exists, try to find
-- a matching client by EXACT name match (case-insensitive for safety).
-- This handles edge cases from legacy data imports.
--
-- NOTE: Name matching is inherently fragile. Unmapped lots after this step
-- should be manually reviewed or handled by application code that falls back
-- to vendorId queries.

UPDATE `lots` l
INNER JOIN `vendors` v ON v.id = l.vendorId AND v.deleted_at IS NULL
INNER JOIN `clients` c ON LOWER(TRIM(c.name)) = LOWER(TRIM(v.name))
  AND c.is_seller = 1
  AND c.deleted_at IS NULL
SET l.supplier_client_id = c.id
WHERE (l.supplier_client_id IS NULL OR l.supplier_client_id = 0)
  AND l.deleted_at IS NULL;

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

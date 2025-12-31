-- Migration: Fix VIP Portal createdBy FK Constraint (BUG-037)
-- Date: 2025-12-31
-- 
-- This migration adds createdByClientId columns to client_needs and vendor_supply
-- tables to support VIP portal client attribution while keeping createdBy for
-- internal user attribution.

-- Make createdBy nullable in client_needs (for VIP portal actions)
ALTER TABLE client_needs MODIFY created_by INT NULL;

-- Add createdByClientId column to client_needs
ALTER TABLE client_needs ADD COLUMN created_by_client_id INT NULL AFTER created_by;

-- Add FK constraint for createdByClientId in client_needs
ALTER TABLE client_needs ADD CONSTRAINT fk_cn_created_by_client
  FOREIGN KEY (created_by_client_id) REFERENCES clients(id) ON DELETE RESTRICT;

-- Make createdBy nullable in vendor_supply (for VIP portal actions)
ALTER TABLE vendor_supply MODIFY created_by INT NULL;

-- Add createdByClientId column to vendor_supply
ALTER TABLE vendor_supply ADD COLUMN created_by_client_id INT NULL AFTER created_by;

-- Add FK constraint for createdByClientId in vendor_supply
ALTER TABLE vendor_supply ADD CONSTRAINT fk_vs_created_by_client
  FOREIGN KEY (created_by_client_id) REFERENCES clients(id) ON DELETE RESTRICT;

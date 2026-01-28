-- PARTY-004: Add soft delete support to vendor_supply table
-- This migration adds:
-- 1. deleted_at column for soft delete tracking
-- 2. Index on deleted_at for efficient filtering

-- Add deleted_at column if it doesn't exist
ALTER TABLE `vendor_supply`
ADD COLUMN IF NOT EXISTS `deleted_at` timestamp NULL DEFAULT NULL;

-- Add index for deleted_at column for efficient queries
CREATE INDEX IF NOT EXISTS `idx_deleted_at_vs` ON `vendor_supply` (`deleted_at`);

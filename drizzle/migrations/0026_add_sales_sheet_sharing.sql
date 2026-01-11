-- Migration: 0026_add_sales_sheet_sharing.sql
-- Purpose: Add sharing and conversion columns to sales_sheet_history for Sales Sheet module
-- Date: 2026-01-11
-- TERP-INIT-016: Sales Sheet sharing and conversion functionality

-- ============================================================================
-- PHASE 1: Add sharing columns to sales_sheet_history table
-- ============================================================================

-- Add share_token column for public access links
ALTER TABLE `sales_sheet_history`
ADD COLUMN IF NOT EXISTS `share_token` VARCHAR(64) NULL;

-- Add share_expires_at column for link expiration
ALTER TABLE `sales_sheet_history`
ADD COLUMN IF NOT EXISTS `share_expires_at` TIMESTAMP NULL;

-- Add view_count column for tracking views
ALTER TABLE `sales_sheet_history`
ADD COLUMN IF NOT EXISTS `view_count` INT NOT NULL DEFAULT 0;

-- Add last_viewed_at column for tracking last view time
ALTER TABLE `sales_sheet_history`
ADD COLUMN IF NOT EXISTS `last_viewed_at` TIMESTAMP NULL;

-- ============================================================================
-- PHASE 2: Add conversion tracking column
-- ============================================================================

-- Add converted_to_session_id column (links to live shopping session)
-- Note: converted_to_order_id already exists from migration 0043_add_usp_columns.sql
ALTER TABLE `sales_sheet_history`
ADD COLUMN IF NOT EXISTS `converted_to_session_id` VARCHAR(36) NULL;

-- ============================================================================
-- PHASE 3: Add indexes for performance
-- ============================================================================

-- Index for share_token lookups
-- Note: Using CREATE INDEX IF NOT EXISTS for idempotency
CREATE INDEX IF NOT EXISTS `idx_sales_sheet_share_token` ON `sales_sheet_history` (`share_token`);

-- ============================================================================
-- VERIFICATION NOTES
-- ============================================================================
--
-- Table: sales_sheet_history (already exists)
-- New columns added:
--   - share_token: VARCHAR(64) NULL - unique token for public sharing
--   - share_expires_at: TIMESTAMP NULL - expiration date for share link
--   - view_count: INT NOT NULL DEFAULT 0 - number of times viewed
--   - last_viewed_at: TIMESTAMP NULL - last view timestamp
--   - converted_to_session_id: VARCHAR(36) NULL - link to live shopping session
--
-- Indexes added:
--   - idx_sales_sheet_share_token on share_token for fast lookups
--
-- Schema.ts column mapping (TypeScript -> SQL):
--   shareToken -> share_token
--   shareExpiresAt -> share_expires_at
--   viewCount -> view_count
--   lastViewedAt -> last_viewed_at
--   convertedToSessionId -> converted_to_session_id

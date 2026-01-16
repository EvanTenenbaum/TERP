-- Migration: 0058_add_live_shopping_timeout_columns
-- Description: Add timeout-related columns to liveShoppingSessions table (MEET-075-BE)
-- Generated: 2026-01-16
-- 
-- This migration adds the following columns:
-- - timeoutSeconds: Default timeout duration in seconds (default 2 hours = 7200)
-- - expiresAt: When the session will auto-expire
-- - autoReleaseEnabled: Whether to release inventory on timeout
-- - lastActivityAt: Last activity timestamp for tracking
-- - extensionCount: Number of times timeout was extended

-- Add timeout configuration columns
ALTER TABLE `liveShoppingSessions` 
ADD COLUMN IF NOT EXISTS `timeoutSeconds` int DEFAULT 7200 AFTER `sessionConfig`;

ALTER TABLE `liveShoppingSessions` 
ADD COLUMN IF NOT EXISTS `expiresAt` timestamp NULL AFTER `timeoutSeconds`;

ALTER TABLE `liveShoppingSessions` 
ADD COLUMN IF NOT EXISTS `autoReleaseEnabled` boolean DEFAULT true AFTER `expiresAt`;

ALTER TABLE `liveShoppingSessions` 
ADD COLUMN IF NOT EXISTS `lastActivityAt` timestamp NULL AFTER `autoReleaseEnabled`;

ALTER TABLE `liveShoppingSessions` 
ADD COLUMN IF NOT EXISTS `extensionCount` int DEFAULT 0 AFTER `lastActivityAt`;

-- Add index for expiresAt to optimize timeout queries
CREATE INDEX IF NOT EXISTS `idx_lss_expires` ON `liveShoppingSessions` (`expiresAt`);

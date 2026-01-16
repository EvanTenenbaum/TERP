-- MEET-075-BE: Live Shopping Session Timeout Enhancement
-- Adds timeout management and activity tracking fields to liveShoppingSessions table

-- Add timeout configuration fields
ALTER TABLE `liveShoppingSessions`
ADD COLUMN `timeoutSeconds` INT DEFAULT 7200 COMMENT 'Session timeout in seconds, 0 = no timeout, default 2 hours';

ALTER TABLE `liveShoppingSessions`
ADD COLUMN `expiresAt` TIMESTAMP NULL COMMENT 'When session will auto-expire';

ALTER TABLE `liveShoppingSessions`
ADD COLUMN `autoReleaseEnabled` BOOLEAN DEFAULT true COMMENT 'Whether inventory is auto-released on timeout';

ALTER TABLE `liveShoppingSessions`
ADD COLUMN `lastActivityAt` TIMESTAMP NULL COMMENT 'Timestamp of last session activity';

ALTER TABLE `liveShoppingSessions`
ADD COLUMN `extensionCount` INT DEFAULT 0 COMMENT 'Number of times timeout was extended';

-- Add index for efficient timeout queries
CREATE INDEX `idx_lss_expires` ON `liveShoppingSessions` (`expiresAt`);

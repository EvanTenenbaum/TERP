-- Rollback Migration: 0036_rollback_event_invitations
-- Description: Rollback event invitation workflow tables
-- Date: 2025-11-14
-- Task: QA-044

-- Drop tables in reverse order of dependencies

DROP TABLE IF EXISTS `calendar_invitation_history`;
DROP TABLE IF EXISTS `calendar_invitation_settings`;
DROP TABLE IF EXISTS `calendar_event_invitations`;

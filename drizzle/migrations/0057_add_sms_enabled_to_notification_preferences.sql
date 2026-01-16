-- Add sms_enabled column to notification_preferences table
-- This fixes a bug where SMS notifications were incorrectly checking emailEnabled

ALTER TABLE `notification_preferences`
  ADD COLUMN `sms_enabled` BOOLEAN NOT NULL DEFAULT FALSE AFTER `email_enabled`;

-- Note: Default is FALSE since SMS typically requires explicit opt-in
-- Existing users will need to enable SMS notifications if they want them

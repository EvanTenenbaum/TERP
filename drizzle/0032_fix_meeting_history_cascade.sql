-- Migration 0032: Fix clientMeetingHistory CASCADE to preserve historical data
-- Version: v3.2
-- Date: 2025-11-10
-- Purpose: Fix #3 from QA Report - Change CASCADE to SET NULL to preserve meeting history

-- Step 1: Find and drop existing foreign key constraint
SET @constraint_name = (
  SELECT CONSTRAINT_NAME
  FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'client_meeting_history'
    AND COLUMN_NAME = 'calendar_event_id'
    AND REFERENCED_TABLE_NAME = 'calendar_events'
  LIMIT 1
);

SET @sql = IF(@constraint_name IS NOT NULL,
  CONCAT('ALTER TABLE client_meeting_history DROP FOREIGN KEY ', @constraint_name),
  'SELECT "No foreign key constraint found - skipping drop" as message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Step 2: Add new foreign key constraint with SET NULL (preserves history)
ALTER TABLE client_meeting_history
ADD CONSTRAINT fk_client_meeting_history_event
FOREIGN KEY (calendar_event_id) REFERENCES calendar_events(id)
ON DELETE SET NULL;

-- Verification query (run after migration):
-- SELECT 
--   CONSTRAINT_NAME,
--   DELETE_RULE
-- FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS
-- WHERE TABLE_NAME = 'client_meeting_history'
--   AND REFERENCED_TABLE_NAME = 'calendar_events';
-- Expected: DELETE_RULE = 'SET NULL'

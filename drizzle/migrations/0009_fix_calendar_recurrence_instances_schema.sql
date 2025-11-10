-- Migration: 0009_fix_calendar_recurrence_instances_schema.sql
-- Description: Fix calendar_recurrence_instances table to match Drizzle schema
-- Date: 2025-11-10
-- Author: AI Agent (Phase 1 & 2 Calendar Improvements)

-- Rename existing columns to match schema
ALTER TABLE calendar_recurrence_instances
  CHANGE COLUMN instance_start_time start_time VARCHAR(8),
  CHANGE COLUMN instance_end_time end_time VARCHAR(8);

-- Add missing columns
ALTER TABLE calendar_recurrence_instances
  ADD COLUMN timezone VARCHAR(50) AFTER end_time,
  ADD COLUMN status ENUM('GENERATED', 'MODIFIED', 'CANCELLED') NOT NULL DEFAULT 'GENERATED' AFTER timezone,
  ADD COLUMN modified_title VARCHAR(255) AFTER status,
  ADD COLUMN modified_description TEXT AFTER modified_title,
  ADD COLUMN modified_location VARCHAR(500) AFTER modified_description,
  ADD COLUMN modified_assigned_to INT AFTER modified_location,
  ADD COLUMN generated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER modified_assigned_to,
  ADD COLUMN modified_at TIMESTAMP AFTER generated_at,
  ADD COLUMN modified_by INT AFTER modified_at;

-- Add foreign key constraints
ALTER TABLE calendar_recurrence_instances
  ADD FOREIGN KEY (modified_assigned_to) REFERENCES users(id),
  ADD FOREIGN KEY (modified_by) REFERENCES users(id);

-- Drop old columns that are no longer needed
ALTER TABLE calendar_recurrence_instances
  DROP COLUMN recurrence_rule_id,
  DROP COLUMN is_exception,
  DROP COLUMN exception_reason,
  DROP COLUMN override_event_id;

-- Verification query (run after migration)
-- SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT 
-- FROM INFORMATION_SCHEMA.COLUMNS 
-- WHERE TABLE_NAME = 'calendar_recurrence_instances' 
-- ORDER BY ORDINAL_POSITION;

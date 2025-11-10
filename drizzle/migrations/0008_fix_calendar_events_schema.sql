-- Migration: 0008_fix_calendar_events_schema.sql
-- Description: Add missing columns to calendar_events table to match Drizzle schema
-- Date: 2025-11-10
-- Author: AI Agent (Phase 1 & 2 Calendar Improvements)

-- Add missing columns to calendar_events table
ALTER TABLE calendar_events
  -- Replace is_all_day with is_floating_time (boolean)
  DROP COLUMN is_all_day,
  ADD COLUMN is_floating_time TINYINT(1) NOT NULL DEFAULT 0 AFTER timezone,
  
  -- Add entity linking columns (polymorphic)
  ADD COLUMN entity_type VARCHAR(50) AFTER is_recurring,
  ADD COLUMN entity_id INT AFTER entity_type,
  
  -- Add assigned_to column for responsibility tracking
  ADD COLUMN assigned_to INT AFTER created_by,
  ADD FOREIGN KEY (assigned_to) REFERENCES users(id),
  
  -- Add auto-generation tracking columns
  ADD COLUMN is_auto_generated TINYINT(1) NOT NULL DEFAULT 0 AFTER visibility,
  ADD COLUMN auto_generation_rule VARCHAR(100) AFTER is_auto_generated;

-- Add index for entity linking
CREATE INDEX idx_calendar_entity ON calendar_events(entity_type, entity_id);

-- Verification query (run after migration)
-- SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT 
-- FROM INFORMATION_SCHEMA.COLUMNS 
-- WHERE TABLE_NAME = 'calendar_events' 
-- AND COLUMN_NAME IN ('is_floating_time', 'entity_type', 'entity_id', 'assigned_to', 'is_auto_generated', 'auto_generation_rule')
-- ORDER BY ORDINAL_POSITION;

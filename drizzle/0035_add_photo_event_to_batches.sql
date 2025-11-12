-- Migration 0035: Add photo_session_event_id to batches table
-- Version: v3.2
-- Date: 2025-11-10
-- Purpose: Link batches to PHOTOGRAPHY calendar events for workflow integration

-- Step 1: Add photo_session_event_id column (nullable)
ALTER TABLE batches
ADD COLUMN photo_session_event_id INT NULL;

-- Step 2: Add foreign key constraint
ALTER TABLE batches
ADD CONSTRAINT fk_batches_photo_session_event
FOREIGN KEY (photo_session_event_id) REFERENCES calendar_events(id)
ON DELETE SET NULL;

-- Step 3: Add index for performance
CREATE INDEX idx_batches_photo_session_event_id
ON batches(photo_session_event_id);

-- Verification query (run after migration):
-- SELECT COUNT(*) as total_batches,
--        COUNT(photo_session_event_id) as batches_with_photo_event
-- FROM batches;
-- Expected: Column exists, no errors

-- Migration: Add vendor_id and timezone columns to calendar_events
-- Version: v3.2
-- Date: 2025-11-10
-- Purpose: Fix #1 (vendor_id) and Fix #18 (timezone) from QA Report

-- Step 1: Add vendor_id column (nullable, foreign key to vendors)
ALTER TABLE calendar_events
ADD COLUMN vendor_id INT NULL
AFTER client_id;

-- Step 2: Add timezone column (not null with default)
ALTER TABLE calendar_events
ADD COLUMN timezone VARCHAR(50) NOT NULL DEFAULT 'America/Los_Angeles'
AFTER metadata;

-- Step 3: Backfill vendor_id from metadata for existing AP_PAYMENT events
UPDATE calendar_events
SET vendor_id = CAST(JSON_EXTRACT(metadata, '$.vendor_id.referenceId') AS UNSIGNED)
WHERE JSON_EXTRACT(metadata, '$.vendor_id.referenceId') IS NOT NULL
  AND event_type = 'AP_PAYMENT';

-- Step 4: Add foreign key constraint for vendor_id
ALTER TABLE calendar_events
ADD CONSTRAINT fk_calendar_events_vendor
FOREIGN KEY (vendor_id) REFERENCES vendors(id)
ON DELETE SET NULL;

-- Step 5: Add index for vendor_id (performance)
CREATE INDEX idx_calendar_events_vendor_id
ON calendar_events(vendor_id);

-- Step 6: Add index for timezone (for queries filtering by timezone)
CREATE INDEX idx_calendar_events_timezone
ON calendar_events(timezone);

-- Verification queries (run after migration):
-- SELECT COUNT(*) as total_events,
--        COUNT(vendor_id) as events_with_vendor_column,
--        SUM(CASE WHEN JSON_EXTRACT(metadata, '$.vendor_id.referenceId') IS NOT NULL THEN 1 ELSE 0 END) as events_with_vendor_metadata,
--        SUM(CASE 
--          WHEN JSON_EXTRACT(metadata, '$.vendor_id.referenceId') IS NOT NULL 
--          AND vendor_id IS NULL 
--          THEN 1 ELSE 0 END) as failed_backfills
-- FROM calendar_events;
-- Expected: failed_backfills = 0

-- SELECT COUNT(*) as events_without_timezone
-- FROM calendar_events
-- WHERE timezone IS NULL;
-- Expected: 0 (all events should have timezone)

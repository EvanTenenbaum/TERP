-- Migration 0031: Add v3.2 Core Columns to calendar_events
-- Version: v3.2
-- Date: 2025-11-10
-- Purpose: Add client_id, vendor_id, metadata columns for v3.2 evolution

-- Step 1: Add client_id column (nullable, for client-facing events)
ALTER TABLE calendar_events
ADD COLUMN client_id INT NULL
AFTER entity_id;

-- Step 2: Add vendor_id column (nullable, for vendor-facing events)
ALTER TABLE calendar_events
ADD COLUMN vendor_id INT NULL
AFTER client_id;

-- Step 3: Add metadata column (JSON, for v3.1 metadata system)
ALTER TABLE calendar_events
ADD COLUMN metadata JSON NULL
AFTER vendor_id;

-- Step 4: Backfill client_id from entityType/entityId
UPDATE calendar_events
SET client_id = entity_id
WHERE entity_type = 'client';

-- Step 5: Backfill vendor_id from entityType/entityId
UPDATE calendar_events
SET vendor_id = entity_id
WHERE entity_type = 'vendor';

-- Step 6: Add foreign key constraint for client_id
ALTER TABLE calendar_events
ADD CONSTRAINT fk_calendar_events_client
FOREIGN KEY (client_id) REFERENCES clients(id)
ON DELETE SET NULL;

-- Step 7: Add foreign key constraint for vendor_id
ALTER TABLE calendar_events
ADD CONSTRAINT fk_calendar_events_vendor
FOREIGN KEY (vendor_id) REFERENCES vendors(id)
ON DELETE SET NULL;

-- Step 8: Add index for client_id (performance)
CREATE INDEX idx_calendar_events_client_id
ON calendar_events(client_id);

-- Step 9: Add index for vendor_id (performance)
CREATE INDEX idx_calendar_events_vendor_id
ON calendar_events(vendor_id);

-- Verification queries (run after migration):
-- SELECT COUNT(*) as total_events,
--        COUNT(client_id) as events_with_client,
--        COUNT(vendor_id) as events_with_vendor,
--        COUNT(CASE WHEN entity_type = 'client' AND client_id IS NULL THEN 1 END) as failed_client_backfills,
--        COUNT(CASE WHEN entity_type = 'vendor' AND vendor_id IS NULL THEN 1 END) as failed_vendor_backfills
-- FROM calendar_events;
-- Expected: failed_client_backfills = 0, failed_vendor_backfills = 0

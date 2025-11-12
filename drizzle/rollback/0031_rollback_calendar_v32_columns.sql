-- Rollback migration for 0031_add_calendar_v32_columns.sql
-- Removes client_id, vendor_id, and metadata columns from calendar_events

ALTER TABLE calendar_events
DROP FOREIGN KEY IF EXISTS fk_calendar_events_client;

ALTER TABLE calendar_events
DROP FOREIGN KEY IF EXISTS fk_calendar_events_vendor;

ALTER TABLE calendar_events
DROP COLUMN IF EXISTS metadata;

ALTER TABLE calendar_events
DROP COLUMN IF EXISTS vendor_id;

ALTER TABLE calendar_events
DROP COLUMN IF EXISTS client_id;

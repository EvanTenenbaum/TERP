-- Rollback migration for 0035_add_photo_event_to_batches.sql
-- Removes photo_session_event_id column from batches table

ALTER TABLE batches
DROP FOREIGN KEY IF EXISTS fk_batches_photo_event;

ALTER TABLE batches
DROP COLUMN IF EXISTS photo_session_event_id;

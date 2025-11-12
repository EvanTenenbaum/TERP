-- Rollback migration for 0032_fix_meeting_history_cascade.sql
-- Restores CASCADE behavior on client_meeting_history foreign key

ALTER TABLE client_meeting_history
DROP FOREIGN KEY IF EXISTS fk_client_meeting_history_event;

ALTER TABLE client_meeting_history
ADD CONSTRAINT fk_client_meeting_history_event
FOREIGN KEY (calendar_event_id) REFERENCES calendar_events(id)
ON DELETE CASCADE;

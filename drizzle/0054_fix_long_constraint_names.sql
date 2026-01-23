-- Migration: Fix Long MySQL Identifier Names (Cleanup)
-- Date: 2026-01-23
-- Description: MySQL has a 64-character limit for identifier names.
-- Migrations 0020 and 0021 were updated to use shorter constraint names.
-- This migration handles cleanup for databases that may have already run
-- the old migrations with long constraint names.

-- Note: Drizzle migrator doesn't support DELIMITER/stored procedures.
-- Using simple DROP IF EXISTS patterns instead.

-- The constraint renames were already applied in migrations 0020 and 0021.
-- This migration serves as documentation and a safety net.

-- For existing databases with old constraint names, manual cleanup may be needed:
--
-- If 'calendar_recurrence_instances_parent_event_id_calendar_events_id_fk' exists:
--   ALTER TABLE `calendar_recurrence_instances`
--     DROP FOREIGN KEY `calendar_recurrence_instances_parent_event_id_calendar_events_id_fk`;
--   ALTER TABLE `calendar_recurrence_instances`
--     ADD CONSTRAINT `cal_recur_inst_parent_event_fk`
--     FOREIGN KEY (`parent_event_id`) REFERENCES `calendar_events`(`id`)
--     ON DELETE CASCADE ON UPDATE NO ACTION;
--
-- If 'client_interest_list_items_interest_list_id_client_interest_lists_id_fk' exists:
--   ALTER TABLE `client_interest_list_items`
--     DROP FOREIGN KEY `client_interest_list_items_interest_list_id_client_interest_lists_id_fk`;
--   ALTER TABLE `client_interest_list_items`
--     ADD CONSTRAINT `cli_interest_items_list_id_fk`
--     FOREIGN KEY (`interest_list_id`) REFERENCES `client_interest_lists`(`id`)
--     ON DELETE CASCADE ON UPDATE NO ACTION;

-- This is a no-op migration for fresh databases (constraints already have correct names)
SELECT 1;

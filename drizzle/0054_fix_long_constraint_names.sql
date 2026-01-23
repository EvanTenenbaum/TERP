-- Migration: Fix Long MySQL Identifier Names (Cleanup)
-- Date: 2026-01-23
-- Description: MySQL has a 64-character limit for identifier names.
-- Migration 0020 was updated to use shorter constraint names.
-- This migration handles cleanup for databases that may have already run
-- the old migration with the long constraint name.
--
-- Old constraint (68 chars - too long):
--   calendar_recurrence_instances_parent_event_id_calendar_events_id_fk
--
-- New constraint (31 chars):
--   cal_recur_inst_parent_event_fk

-- Note: This migration is idempotent - safe to run multiple times.

DELIMITER //

CREATE PROCEDURE IF NOT EXISTS fix_long_constraint_names()
BEGIN
    DECLARE fk_long_exists INT DEFAULT 0;
    DECLARE fk_short_exists INT DEFAULT 0;
    DECLARE table_exists INT DEFAULT 0;

    -- Check if table exists
    SELECT COUNT(*) INTO table_exists
    FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'calendar_recurrence_instances';

    IF table_exists > 0 THEN
        -- Check for old long constraint name
        SELECT COUNT(*) INTO fk_long_exists
        FROM information_schema.TABLE_CONSTRAINTS
        WHERE CONSTRAINT_SCHEMA = DATABASE()
        AND TABLE_NAME = 'calendar_recurrence_instances'
        AND CONSTRAINT_NAME = 'calendar_recurrence_instances_parent_event_id_calendar_events_id_fk';

        -- Check for new short constraint name
        SELECT COUNT(*) INTO fk_short_exists
        FROM information_schema.TABLE_CONSTRAINTS
        WHERE CONSTRAINT_SCHEMA = DATABASE()
        AND TABLE_NAME = 'calendar_recurrence_instances'
        AND CONSTRAINT_NAME = 'cal_recur_inst_parent_event_fk';

        -- If long constraint exists and short one doesn't, rename it
        IF fk_long_exists > 0 AND fk_short_exists = 0 THEN
            -- Drop the long-named constraint
            ALTER TABLE `calendar_recurrence_instances`
                DROP FOREIGN KEY `calendar_recurrence_instances_parent_event_id_calendar_events_id_fk`;

            -- Recreate with shorter name
            ALTER TABLE `calendar_recurrence_instances`
                ADD CONSTRAINT `cal_recur_inst_parent_event_fk`
                FOREIGN KEY (`parent_event_id`) REFERENCES `calendar_events`(`id`)
                ON DELETE CASCADE ON UPDATE NO ACTION;
        END IF;

    END IF;

END //

DELIMITER ;

-- Execute the procedure
CALL fix_long_constraint_names();

-- Clean up the procedure
DROP PROCEDURE IF EXISTS fix_long_constraint_names;

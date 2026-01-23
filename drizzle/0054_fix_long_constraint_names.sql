-- Migration: Fix Long MySQL Identifier Names (Cleanup)
-- Date: 2026-01-23
-- Description: MySQL has a 64-character limit for identifier names.
-- Migrations 0020 and 0021 were updated to use shorter constraint names.
-- This migration handles cleanup for databases that may have already run
-- the old migrations with long constraint names.
--
-- Fixed constraints:
-- 1. calendar_recurrence_instances_parent_event_id_calendar_events_id_fk (68 chars)
--    → cal_recur_inst_parent_event_fk (31 chars)
--
-- 2. client_interest_list_items_interest_list_id_client_interest_lists_id_fk (71 chars)
--    → cli_interest_items_list_id_fk (29 chars)

-- Note: This migration is idempotent - safe to run multiple times.

DELIMITER //

CREATE PROCEDURE IF NOT EXISTS fix_long_constraint_names()
BEGIN
    DECLARE fk_exists INT DEFAULT 0;
    DECLARE fk_short_exists INT DEFAULT 0;
    DECLARE table_exists INT DEFAULT 0;

    -- =========================================================================
    -- Fix 1: calendar_recurrence_instances.parent_event_id
    -- =========================================================================

    SELECT COUNT(*) INTO table_exists
    FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'calendar_recurrence_instances';

    IF table_exists > 0 THEN
        -- Check for old long constraint name
        SELECT COUNT(*) INTO fk_exists
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
        IF fk_exists > 0 AND fk_short_exists = 0 THEN
            ALTER TABLE `calendar_recurrence_instances`
                DROP FOREIGN KEY `calendar_recurrence_instances_parent_event_id_calendar_events_id_fk`;

            ALTER TABLE `calendar_recurrence_instances`
                ADD CONSTRAINT `cal_recur_inst_parent_event_fk`
                FOREIGN KEY (`parent_event_id`) REFERENCES `calendar_events`(`id`)
                ON DELETE CASCADE ON UPDATE NO ACTION;
        END IF;
    END IF;

    -- =========================================================================
    -- Fix 2: client_interest_list_items.interest_list_id
    -- =========================================================================

    SET table_exists = 0;
    SET fk_exists = 0;
    SET fk_short_exists = 0;

    SELECT COUNT(*) INTO table_exists
    FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'client_interest_list_items';

    IF table_exists > 0 THEN
        -- Check for old long constraint name
        SELECT COUNT(*) INTO fk_exists
        FROM information_schema.TABLE_CONSTRAINTS
        WHERE CONSTRAINT_SCHEMA = DATABASE()
        AND TABLE_NAME = 'client_interest_list_items'
        AND CONSTRAINT_NAME = 'client_interest_list_items_interest_list_id_client_interest_lists_id_fk';

        -- Check for new short constraint name
        SELECT COUNT(*) INTO fk_short_exists
        FROM information_schema.TABLE_CONSTRAINTS
        WHERE CONSTRAINT_SCHEMA = DATABASE()
        AND TABLE_NAME = 'client_interest_list_items'
        AND CONSTRAINT_NAME = 'cli_interest_items_list_id_fk';

        -- If long constraint exists and short one doesn't, rename it
        IF fk_exists > 0 AND fk_short_exists = 0 THEN
            ALTER TABLE `client_interest_list_items`
                DROP FOREIGN KEY `client_interest_list_items_interest_list_id_client_interest_lists_id_fk`;

            ALTER TABLE `client_interest_list_items`
                ADD CONSTRAINT `cli_interest_items_list_id_fk`
                FOREIGN KEY (`interest_list_id`) REFERENCES `client_interest_lists`(`id`)
                ON DELETE CASCADE ON UPDATE NO ACTION;
        END IF;
    END IF;

END //

DELIMITER ;

-- Execute the procedure
CALL fix_long_constraint_names();

-- Clean up the procedure
DROP PROCEDURE IF EXISTS fix_long_constraint_names;

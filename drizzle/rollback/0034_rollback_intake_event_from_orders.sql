-- Rollback migration for 0034_add_intake_event_to_orders.sql
-- Removes intake_event_id column from orders table

ALTER TABLE orders
DROP FOREIGN KEY IF EXISTS fk_orders_intake_event;

ALTER TABLE orders
DROP COLUMN IF EXISTS intake_event_id;

-- Migration 0034: Add intake_event_id to orders table
-- Version: v3.2
-- Date: 2025-11-10
-- Purpose: Link orders to INTAKE calendar events for workflow integration

-- Step 1: Add intake_event_id column (nullable)
ALTER TABLE orders
ADD COLUMN intake_event_id INT NULL
AFTER client_id;

-- Step 2: Add foreign key constraint
ALTER TABLE orders
ADD CONSTRAINT fk_orders_intake_event
FOREIGN KEY (intake_event_id) REFERENCES calendar_events(id)
ON DELETE SET NULL;

-- Step 3: Add index for performance
CREATE INDEX idx_orders_intake_event_id
ON orders(intake_event_id);

-- Verification query (run after migration):
-- SELECT COUNT(*) as total_orders,
--        COUNT(intake_event_id) as orders_with_intake_event
-- FROM orders;
-- Expected: Column exists, no errors

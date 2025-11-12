-- Migration 0033: Add AR_COLLECTION and AP_PAYMENT event types
-- Version: v3.2
-- Date: 2025-11-10
-- Purpose: Add new event types for financial workflows

-- Add new event types to enum
ALTER TABLE calendar_events
MODIFY COLUMN event_type ENUM(
  'MEETING',
  'DEADLINE',
  'TASK',
  'DELIVERY',
  'PAYMENT_DUE',
  'FOLLOW_UP',
  'AUDIT',
  'INTAKE',
  'PHOTOGRAPHY',
  'BATCH_EXPIRATION',
  'RECURRING_ORDER',
  'SAMPLE_REQUEST',
  'OTHER',
  'AR_COLLECTION',
  'AP_PAYMENT'
) NOT NULL;

-- Verification query (run after migration):
-- SELECT DISTINCT event_type 
-- FROM calendar_events 
-- ORDER BY event_type;
-- Should include AR_COLLECTION and AP_PAYMENT in available types

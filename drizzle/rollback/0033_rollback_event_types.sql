-- Rollback migration for 0033_add_event_types.sql
-- Removes AR_COLLECTION and AP_PAYMENT event types

ALTER TABLE calendar_events
MODIFY COLUMN event_type ENUM(
  'MEETING', 'DEADLINE', 'TASK', 'DELIVERY', 'PAYMENT_DUE',
  'FOLLOW_UP', 'AUDIT', 'INTAKE', 'PHOTOGRAPHY', 'BATCH_EXPIRATION',
  'RECURRING_ORDER', 'SAMPLE_REQUEST', 'OTHER'
) NOT NULL;

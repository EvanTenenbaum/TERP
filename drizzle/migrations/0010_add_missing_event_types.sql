-- Migration: Add missing event_type enum values
-- Date: 2025-11-10
-- Description: Add TRAINING and PAYMENT_DUE to event_type enum

-- Add new enum values to event_type column
ALTER TABLE calendar_events 
MODIFY COLUMN event_type ENUM(
  'MEETING',
  'DEADLINE',
  'REMINDER',
  'TASK',
  'MILESTONE',
  'TRAINING',
  'PAYMENT_DUE',
  'OTHER'
) NOT NULL DEFAULT 'OTHER';

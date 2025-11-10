-- Migration 0007: Add Missing Index on Calendar Recurrence Instances
-- Created: 2025-11-09
-- Purpose: Fix performance issue with recurring event queries
-- Issue: N+1 query problem identified in adversarial QA
-- Impact: Significant performance improvement for recurring events

-- Add composite index on (parent_event_id, instance_date)
-- This index is critical for efficiently querying recurring event instances
-- within a specific date range for a given parent event
CREATE INDEX `idx_recurrence_parent_date` 
ON `calendar_recurrence_instances`(`parent_event_id`, `instance_date`);

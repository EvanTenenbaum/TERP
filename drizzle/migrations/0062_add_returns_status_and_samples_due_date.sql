-- Migration: 0062_add_returns_status_and_samples_due_date.sql
-- Description: Add dedicated status column to returns table (DISC-RET-002)
--              and dueDate column to sampleRequests table (DISC-SAM-003)
-- Task: DISC-RET-002, DISC-SAM-003
-- Created: 2026-03-24

-- DISC-RET-002: Add status enum column to returns table
-- Replaces notes-embedded status markers with a proper queryable column
ALTER TABLE `returns`
  ADD COLUMN `status` enum('PENDING','APPROVED','REJECTED','RECEIVED','PROCESSED','CANCELLED')
  NOT NULL DEFAULT 'PENDING' AFTER `returnReason`;

CREATE INDEX `idx_returns_status`
  ON `returns` (`status`);

-- Backfill: Mark all existing returns as PROCESSED (they were created before status tracking)
UPDATE `returns` SET `status` = 'PROCESSED' WHERE `processed_at` IS NOT NULL;

-- DISC-SAM-003: Add dueDate column to sampleRequests table
-- Replaces notes-embedded "Due Date: YYYY-MM-DD" pattern with a proper queryable column
ALTER TABLE `sampleRequests`
  ADD COLUMN `dueDate` date NULL AFTER `notes`;

CREATE INDEX `idx_sample_requests_due_date`
  ON `sampleRequests` (`dueDate`);

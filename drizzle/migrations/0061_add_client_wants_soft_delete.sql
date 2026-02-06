-- Migration: 0061_add_client_wants_soft_delete.sql
-- Description: Add deleted_at column for soft-delete support on client_wants
-- Task: QA-003
-- Created: 2026-02-06

ALTER TABLE `client_wants`
  ADD COLUMN `deleted_at` timestamp NULL AFTER `match_count`;

CREATE INDEX `idx_client_wants_deleted_at`
  ON `client_wants` (`deleted_at`);


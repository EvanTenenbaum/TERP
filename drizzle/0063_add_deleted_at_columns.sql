-- fix(db): Add deleted_at columns to tables that had hard deletes
-- This migration adds deletedAt (soft delete) support to tables that
-- previously only supported hard deletion via db.delete().

ALTER TABLE `todo_lists`
  ADD COLUMN IF NOT EXISTS `deleted_at` timestamp NULL DEFAULT NULL;

ALTER TABLE `todo_tasks`
  ADD COLUMN IF NOT EXISTS `deleted_at` timestamp NULL DEFAULT NULL;

ALTER TABLE `comments`
  ADD COLUMN IF NOT EXISTS `deleted_at` timestamp NULL DEFAULT NULL;

ALTER TABLE `inbox_items`
  ADD COLUMN IF NOT EXISTS `deleted_at` timestamp NULL DEFAULT NULL;

ALTER TABLE `client_needs`
  ADD COLUMN IF NOT EXISTS `deleted_at` timestamp NULL DEFAULT NULL;

ALTER TABLE `appointment_types`
  ADD COLUMN IF NOT EXISTS `deleted_at` timestamp NULL DEFAULT NULL;

ALTER TABLE `calendar_blocked_dates`
  ADD COLUMN IF NOT EXISTS `deleted_at` timestamp NULL DEFAULT NULL;

ALTER TABLE `leaderboard_metric_cache`
  ADD COLUMN IF NOT EXISTS `deleted_at` timestamp NULL DEFAULT NULL;

ALTER TABLE `tagHierarchy`
  ADD COLUMN IF NOT EXISTS `deletedAt` timestamp NULL DEFAULT NULL;

ALTER TABLE `vip_tiers`
  ADD COLUMN IF NOT EXISTS `deleted_at` timestamp NULL DEFAULT NULL;

ALTER TABLE `employee_shifts`
  ADD COLUMN IF NOT EXISTS `deleted_at` timestamp NULL DEFAULT NULL;

ALTER TABLE `user_roles`
  ADD COLUMN IF NOT EXISTS `deleted_at` timestamp NULL DEFAULT NULL;

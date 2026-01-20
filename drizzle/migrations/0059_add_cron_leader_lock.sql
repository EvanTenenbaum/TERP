-- Migration: 0059_add_cron_leader_lock
-- Description: Add cron leader lock table for leader election in multi-instance deployments
-- Generated: 2026-01-20
--
-- This migration creates the cron_leader_lock table which is used by the
-- cronLeaderElection utility to ensure that only one instance in a
-- multi-instance deployment executes cron jobs.
--
-- Related: High Memory Usage Remediation
--
-- Design:
-- - Uses lease-based locking with automatic expiration
-- - Leader must refresh lease periodically (heartbeat)
-- - If leader fails, another instance can claim after lease expires
-- - Prevents duplicate cron job execution in horizontally scaled environments

-- Cron Leader Lock table
CREATE TABLE IF NOT EXISTS `cron_leader_lock` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `lock_name` VARCHAR(100) NOT NULL UNIQUE,
  `instance_id` VARCHAR(255) NOT NULL,
  `acquired_at` TIMESTAMP NOT NULL,
  `expires_at` TIMESTAMP NOT NULL,
  `last_heartbeat` TIMESTAMP NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_cll_lock_name` (`lock_name`),
  INDEX `idx_cll_expires_at` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

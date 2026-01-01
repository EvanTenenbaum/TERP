-- Rollback Migration: 0022_rollback_admin_impersonation_tables
-- Feature: FEATURE-012 - VIP Portal Admin Access Tool
-- Date: 2025-12-31
-- Description: Rolls back the admin impersonation tables if needed

-- Drop the actions table first (has foreign key to sessions)
DROP TABLE IF EXISTS `admin_impersonation_actions`;

-- Drop the sessions table
DROP TABLE IF EXISTS `admin_impersonation_sessions`;

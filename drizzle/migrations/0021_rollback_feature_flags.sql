-- Rollback Migration: Remove Feature Flags System
-- Date: 2025-12-31
-- Description: Removes all feature flag tables (use with caution!)
-- 
-- WARNING: This will permanently delete all feature flag data!
-- Only run this if you need to completely remove the feature flag system.

-- Drop tables in reverse order of creation (due to foreign key constraints)
DROP TABLE IF EXISTS `feature_flag_audit_logs`;
DROP TABLE IF EXISTS `feature_flag_user_overrides`;
DROP TABLE IF EXISTS `feature_flag_role_overrides`;
DROP TABLE IF EXISTS `feature_flags`;

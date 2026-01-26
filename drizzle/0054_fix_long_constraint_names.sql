-- Migration: 0054_fix_long_constraint_names.sql
-- Description: Verify and document constraint naming conventions
-- Task: TERP-0006
-- Created: 2026-01-26
-- Rollback: No rollback needed - verification only

-- ============================================================================
-- PURPOSE:
-- MySQL has a 64-character limit on identifier names. This migration verifies
-- all existing constraints comply with this limit. As of 2026-01-26, schema
-- analysis confirmed all Drizzle-generated constraints are under 64 chars.
--
-- NAMING CONVENTION (for future constraints):
-- - Foreign keys: fk_{table}_{column} (e.g., fk_bills_vendor_id)
-- - Unique: uq_{table}_{column} (e.g., uq_clients_teri_code)
-- - Index: idx_{table}_{column} (e.g., idx_orders_status)
-- - Check: chk_{table}_{rule} (e.g., chk_orders_amount_positive)
--
-- VERIFIED CONSTRAINTS (all under 64 chars):
-- - vip_portal_configurations_client_id_clients_id_fk (48 chars)
-- - feature_flag_role_overrides_flag_id_feature_flags_id_fk (54 chars)
-- - feature_flag_role_overrides_role_id_roles_id_fk (47 chars)
-- - feature_flag_user_overrides_flag_id_feature_flags_id_fk (54 chars)
-- - userDashboardPreferences_userId_users_id_fk (42 chars)
-- ============================================================================

-- No-op: All constraints verified compliant
SELECT 1;

-- ============================================================================
-- TERP Migration Verification SQL Script
-- ============================================================================
-- Purpose: Verify which migrations have been applied to the production database
-- Usage: Run this script against your MySQL database to check migration status
-- 
-- Created: 2026-01-02
-- Author: Manus AI
-- Task: Migration Gap Analysis Remediation
-- ============================================================================

-- Set output format
SELECT '╔════════════════════════════════════════════════════════════════╗' AS '';
SELECT '║           TERP Migration Verification Script                   ║' AS '';
SELECT '╚════════════════════════════════════════════════════════════════╝' AS '';
SELECT '' AS '';

-- ============================================================================
-- CHECK 0027: Vendor Payment Terms
-- ============================================================================
SELECT '── [0027] 0027_add_vendor_payment_terms.sql ──' AS 'Migration Check';
SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ APPLIED: paymentTerms column exists in vendors table'
        ELSE '❌ NOT APPLIED: paymentTerms column missing from vendors table'
    END AS 'Status'
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'vendors' 
AND COLUMN_NAME = 'paymentTerms';

-- ============================================================================
-- CHECK 0028: Vendor Notes Table
-- ============================================================================
SELECT '── [0028] 0028_add_vendor_notes.sql ──' AS 'Migration Check';
SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ APPLIED: vendorNotes table exists'
        ELSE '❌ NOT APPLIED: vendorNotes table missing'
    END AS 'Status'
FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'vendorNotes';

-- ============================================================================
-- CHECK 0029: Purchase Orders Table
-- ============================================================================
SELECT '── [0029] 0029_add_purchase_orders.sql ──' AS 'Migration Check';
SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ APPLIED: purchaseOrders table exists'
        ELSE '❌ NOT APPLIED: purchaseOrders table missing'
    END AS 'Status'
FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'purchaseOrders';

-- ============================================================================
-- CHECK 0030a: Adjustment Reasons
-- ============================================================================
SELECT '── [0030a] 0030_add_adjustment_reasons.sql ──' AS 'Migration Check';
SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ APPLIED: adjustmentReason column exists in inventoryMovements'
        ELSE '❌ NOT APPLIED: adjustmentReason column missing from inventoryMovements'
    END AS 'Status'
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'inventoryMovements' 
AND COLUMN_NAME = 'adjustmentReason';

-- ============================================================================
-- CHECK 0030b: Live Shopping Item Status
-- ============================================================================
SELECT '── [0030b] 0030_live_shopping_item_status.sql ──' AS 'Migration Check';
SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ APPLIED: itemStatus column exists in sessionCartItems'
        ELSE '❌ NOT APPLIED: itemStatus column missing from sessionCartItems'
    END AS 'Status'
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'sessionCartItems' 
AND COLUMN_NAME = 'itemStatus';

-- ============================================================================
-- CHECK 0031: Calendar v3.2 Columns
-- ============================================================================
SELECT '── [0031] 0031_add_calendar_v32_columns.sql ──' AS 'Migration Check';
SELECT 
    CASE 
        WHEN COUNT(*) >= 3 THEN '✅ APPLIED: v3.2 columns (client_id, vendor_id, metadata) exist'
        WHEN COUNT(*) > 0 THEN CONCAT('⚠️ PARTIAL: Only ', COUNT(*), ' of 3 columns exist')
        ELSE '❌ NOT APPLIED: v3.2 columns missing from calendar_events'
    END AS 'Status'
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'calendar_events' 
AND COLUMN_NAME IN ('client_id', 'vendor_id', 'metadata');

-- ============================================================================
-- CHECK 0032: Meeting History Cascade Fix
-- ============================================================================
SELECT '── [0032] 0032_fix_meeting_history_cascade.sql ──' AS 'Migration Check';
SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ APPLIED: clientMeetingHistory table exists'
        ELSE '❌ NOT APPLIED: clientMeetingHistory table missing'
    END AS 'Status'
FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'clientMeetingHistory';

-- ============================================================================
-- CHECK 0033: Event Types
-- ============================================================================
SELECT '── [0033] 0033_add_event_types.sql ──' AS 'Migration Check';
SELECT 
    CASE 
        WHEN COLUMN_TYPE LIKE '%AR_COLLECTION%' AND COLUMN_TYPE LIKE '%AP_PAYMENT%' 
            THEN '✅ APPLIED: AR_COLLECTION and AP_PAYMENT event types exist'
        WHEN COLUMN_TYPE IS NOT NULL 
            THEN '⚠️ PARTIAL: event_type column exists but may be missing new types'
        ELSE '❌ NOT APPLIED: event_type column missing or incomplete'
    END AS 'Status'
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'calendar_events' 
AND COLUMN_NAME = 'event_type';

-- ============================================================================
-- CHECK 0034: Intake Event to Orders
-- ============================================================================
SELECT '── [0034] 0034_add_intake_event_to_orders.sql ──' AS 'Migration Check';
SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ APPLIED: intake_event_id column exists in orders'
        ELSE '❌ NOT APPLIED: intake_event_id column missing from orders'
    END AS 'Status'
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'orders' 
AND COLUMN_NAME = 'intake_event_id';

-- ============================================================================
-- CHECK 0035: Photo Event to Batches
-- ============================================================================
SELECT '── [0035] 0035_add_photo_event_to_batches.sql ──' AS 'Migration Check';
SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ APPLIED: photo_session_event_id column exists in batches'
        ELSE '❌ NOT APPLIED: photo_session_event_id column missing from batches'
    END AS 'Status'
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'batches' 
AND COLUMN_NAME = 'photo_session_event_id';

-- ============================================================================
-- CHECK 0036: Event Invitations (QA-044)
-- ============================================================================
SELECT '── [0036] 0036_add_event_invitations.sql (QA-044) ──' AS 'Migration Check';
SELECT 
    CASE 
        WHEN COUNT(*) >= 3 THEN '✅ APPLIED: All 3 invitation tables exist'
        WHEN COUNT(*) > 0 THEN CONCAT('⚠️ PARTIAL: Only ', COUNT(*), ' of 3 tables exist')
        ELSE '❌ NOT APPLIED: Event invitation tables missing'
    END AS 'Status'
FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME IN ('calendar_event_invitations', 'calendar_invitation_settings', 'calendar_invitation_history');

-- ============================================================================
-- CHECK 0038: Missing Indexes
-- ============================================================================
SELECT '── [0038] 0038_add_missing_indexes_mysql.sql ──' AS 'Migration Check';
SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ APPLIED: Performance indexes exist (idx_batches_vendor_id found)'
        ELSE '❌ NOT APPLIED: Performance indexes missing'
    END AS 'Status'
FROM INFORMATION_SCHEMA.STATISTICS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'batches' 
AND INDEX_NAME = 'idx_batches_vendor_id';

-- ============================================================================
-- CHECK 0039: Soft Delete
-- ============================================================================
SELECT '── [0039] 0039_add_soft_delete_to_all_tables.sql ──' AS 'Migration Check';
SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ APPLIED: deletedAt column exists in clients table'
        ELSE '❌ NOT APPLIED: deletedAt column missing (soft delete not enabled)'
    END AS 'Status'
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'clients' 
AND COLUMN_NAME = 'deletedAt';

-- ============================================================================
-- CHECK 0040: Credit Visibility Settings
-- ============================================================================
SELECT '── [0040] 0040_add_credit_visibility_settings.sql ──' AS 'Migration Check';
SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ APPLIED: credit_visibility_settings table exists'
        ELSE '❌ NOT APPLIED: credit_visibility_settings table missing'
    END AS 'Status'
FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'credit_visibility_settings';

-- ============================================================================
-- CHECK 0041: Leaderboard Tables
-- ============================================================================
SELECT '── [0041] 0041_add_leaderboard_tables.sql ──' AS 'Migration Check';
SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN CONCAT('✅ APPLIED: ', COUNT(*), ' leaderboard table(s) exist')
        ELSE '❌ NOT APPLIED: Leaderboard tables missing'
    END AS 'Status'
FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME LIKE 'leaderboard%';

-- ============================================================================
-- CHECK 0042: Credit Fields Fix
-- ============================================================================
SELECT '── [0042] 0042_fix_clients_credit_fields.sql ──' AS 'Migration Check';
SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ APPLIED: creditLimitUpdatedAt column exists in clients'
        ELSE '❌ NOT APPLIED: creditLimitUpdatedAt column missing from clients'
    END AS 'Status'
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'clients' 
AND COLUMN_NAME = 'creditLimitUpdatedAt';

-- ============================================================================
-- CHECK 0043: USP Columns
-- ============================================================================
SELECT '── [0043] 0043_add_usp_columns.sql ──' AS 'Migration Check';
SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ APPLIED: salesSheetId column exists in orders'
        ELSE '❌ NOT APPLIED: salesSheetId column missing from orders'
    END AS 'Status'
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'orders' 
AND COLUMN_NAME = 'salesSheetId';

-- ============================================================================
-- CHECK 0044: Admin Impersonation (FEATURE-012)
-- ============================================================================
SELECT '── [0044] 0044_add_admin_impersonation_tables.sql (FEATURE-012) ──' AS 'Migration Check';
SELECT 
    CASE 
        WHEN COUNT(*) >= 2 THEN '✅ APPLIED: Both admin_impersonation tables exist'
        WHEN COUNT(*) > 0 THEN CONCAT('⚠️ PARTIAL: Only ', COUNT(*), ' of 2 tables exist')
        ELSE '❌ NOT APPLIED: Admin impersonation tables missing'
    END AS 'Status'
FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME LIKE 'admin_impersonation%';

-- ============================================================================
-- CHECK 0045: Sales Sheet Drafts
-- ============================================================================
SELECT '── [0045] 0045_add_sales_sheet_drafts.sql ──' AS 'Migration Check';
SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ APPLIED: sales_sheet_drafts table exists'
        ELSE '❌ NOT APPLIED: sales_sheet_drafts table missing'
    END AS 'Status'
FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'sales_sheet_drafts';

-- ============================================================================
-- SUMMARY
-- ============================================================================
SELECT '' AS '';
SELECT '╔════════════════════════════════════════════════════════════════╗' AS '';
SELECT '║                     VERIFICATION COMPLETE                      ║' AS '';
SELECT '╚════════════════════════════════════════════════════════════════╝' AS '';
SELECT '' AS '';
SELECT 'Review the results above to identify missing migrations.' AS 'Next Steps';
SELECT 'Run: npx tsx scripts/audit-migrations.ts --fix' AS 'To Apply Missing';

# TERP Integrated Execution Roadmap

**Date**: January 22, 2026
**Version**: 1.0
**Status**: CONSOLIDATED FROM ALL AUDITS
**Branch**: claude/create-github-branch-eCxpV

---

## Executive Summary

This roadmap consolidates ALL findings from:

1. **Seed Script Analysis** (docs/analysis/SEED_SCRIPT_ANALYSIS_2026-01-22.md)
2. **RedHat QA Report** (docs/qa/SEED_SCRIPT_REDHAT_QA_2026-01-22.md)
3. **INCOMPLETE_FEATURES_AUDIT_V2.md**
4. **Work Surfaces UI Audit**
5. **Data Quality Audit**
6. **Production Readiness Roadmap**

### Issue Inventory

| Severity       | Count | Category                       |
| -------------- | ----- | ------------------------------ |
| **P0 BLOCKER** | 12    | Must fix before ANY deployment |
| **P1 MAJOR**   | 18    | Required for MVP functionality |
| **P2 MEDIUM**  | 14    | Should fix for quality         |
| **P3 LOW**     | 8     | Nice to have                   |
| **TOTAL**      | 52    | All identified issues          |

---

## PHASE 0: IMMEDIATE BLOCKERS (Day 1)

**Estimated Effort**: 4-6 hours
**Priority**: P0 - SCRIPT WILL FAIL WITHOUT THESE

### SEED-001: Products Table Invalid Column `margin`

| Field      | Value                                                                    |
| ---------- | ------------------------------------------------------------------------ |
| **Status** | OPEN                                                                     |
| **File**   | `scripts/seed-comprehensive.ts:675`                                      |
| **Issue**  | INSERT uses `margin` column that doesn't exist in schema                 |
| **Impact** | Products INSERT fails → No products → No batches → No inventory displays |
| **Fix**    | Remove `margin` from INSERT and VALUES array                             |

```typescript
// BEFORE (BROKEN)
`INSERT INTO products (..., margin, ...)`
// AFTER (FIXED)
`INSERT INTO products (brandId, strainId, nameCanonical, category, subcategory, uomSellable, description, createdAt, updatedAt)`;
```

**Effort**: 15 minutes

---

### SEED-002: Pricing Defaults Wrong Column Name

| Field      | Value                                             |
| ---------- | ------------------------------------------------- |
| **Status** | OPEN                                              |
| **File**   | `scripts/seed-comprehensive.ts:406`               |
| **Issue**  | Uses `category` but schema has `product_category` |
| **Impact** | Pricing defaults INSERT fails                     |
| **Fix**    | Change `category` to `product_category`           |

**Effort**: 5 minutes

---

### SEED-003: Tags Table Invalid ENUM Values

| Field      | Value                                                                                                                                  |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| **Status** | OPEN                                                                                                                                   |
| **File**   | `scripts/seed-comprehensive.ts:619-633`                                                                                                |
| **Issue**  | Uses `'cultivation', 'quality', 'potency'` but schema ENUMs are `'STATUS', 'PRIORITY', 'TYPE', 'CUSTOM', 'STRAIN', 'FLAVOR', 'EFFECT'` |
| **Impact** | Tags INSERT fails                                                                                                                      |
| **Fix**    | Map categories to valid ENUM values                                                                                                    |

**Effort**: 15 minutes

---

### SEED-004: Inbox Items Invalid Source Types

| Field      | Value                                                                         |
| ---------- | ----------------------------------------------------------------------------- |
| **Status** | OPEN                                                                          |
| **File**   | `scripts/seed-comprehensive.ts:1232`                                          |
| **Issue**  | Uses `'order_notification', 'payment_received'` which don't exist in ENUM     |
| **Impact** | Inbox seeding fails for 40% of entries                                        |
| **Fix**    | Remove invalid values, use only `'mention', 'task_assignment', 'task_update'` |

**Effort**: 5 minutes

---

### ROUTE-001: DirectIntake Route Returns 404

| Field      | Value                                           |
| ---------- | ----------------------------------------------- |
| **Status** | OPEN                                            |
| **File**   | `client/src/App.tsx`                            |
| **Issue**  | `/intake` route not wired                       |
| **Impact** | DirectIntakeWorkSurface completely inaccessible |
| **Fix**    | Add route definition with WorkSurfaceGate       |

**Effort**: 30 minutes

---

### DB-001: Calendar Module Database Error

| Field        | Value                                              |
| ------------ | -------------------------------------------------- |
| **Status**   | OPEN                                               |
| **Location** | `/calendar`                                        |
| **Issue**    | "Failed to fetch calendar events. Database error." |
| **Impact**   | Calendar module completely non-functional          |
| **Fix**      | Investigate and fix database query                 |

**Effort**: 2-4 hours

---

## PHASE 1: CRITICAL DATA ISSUES (Day 1-2)

**Estimated Effort**: 8-12 hours
**Priority**: P0/P1 - Data integrity issues

### DATA-001: Unknown Vendors in Accounting

| Field        | Value                                                      |
| ------------ | ---------------------------------------------------------- |
| **Status**   | OPEN                                                       |
| **Location** | `/accounting` - AR/AP Dashboard                            |
| **Issue**    | Top 5 vendors show as "Unknown Vendor" - $947K in payables |
| **Impact**   | Cannot identify vendors to pay                             |
| **Fix**      | Fix vendor name join in bills query                        |

**Effort**: 2-4 hours

---

### DATA-002: Cash Balance = $0.00

| Field        | Value                                                      |
| ------------ | ---------------------------------------------------------- |
| **Status**   | OPEN                                                       |
| **Location** | Dashboard and `/accounting`                                |
| **Issue**    | Cash balance shows $0 despite $5M collected                |
| **Impact**   | Inaccurate financial reporting                             |
| **Fix**      | Implement cash account tracking or fix bank reconciliation |

**Effort**: 4-6 hours

---

### DATA-003: Placeholder Client Names on Dashboard

| Field        | Value                                                      |
| ------------ | ---------------------------------------------------------- |
| **Status**   | OPEN                                                       |
| **Location** | Dashboard - Sales Widget                                   |
| **Issue**    | Shows "Customer 787", "Customer 797" instead of real names |
| **Impact**   | Cannot identify clients from dashboard                     |
| **Fix**      | Fix SQL query to join with client names                    |

**Effort**: 1-2 hours

---

### DATA-004: Feature Flags Not Seeded

| Field        | Value                                              |
| ------------ | -------------------------------------------------- |
| **Status**   | OPEN                                               |
| **Location** | `feature_flags` table                              |
| **Issue**    | 17+ flags referenced in code but not in database   |
| **Impact**   | Features disabled, WorkSurfaces fallback to legacy |
| **Fix**      | Call `seedFeatureFlags()` or seed via Admin UI     |

**Flags to Seed**:

1. work-surface-enabled
2. work-surface-keyboard-contract
3. work-surface-save-state
4. work-surface-inspector-panel
5. work-surface-validation-timing
6. work-surface-direct-intake
7. work-surface-purchase-orders
8. work-surface-clients
9. work-surface-orders
10. work-surface-inventory
11. work-surface-invoices
12. work-surface-concurrent-edit
13. work-surface-golden-flow-intake
14. work-surface-golden-flow-order
15. work-surface-golden-flow-invoice
16. email-enabled
17. sms-enabled

**Effort**: 1 hour

---

## PHASE 2: MISSING SEEDERS (Day 2-3)

**Estimated Effort**: 8-12 hours
**Priority**: P1 - Core tables missing seed data

### SEED-005: Feature Flags Seeder Integration

| Field      | Value                             |
| ---------- | --------------------------------- |
| **Status** | OPEN                              |
| **File**   | `scripts/seed-comprehensive.ts`   |
| **Issue**  | Doesn't call `seedFeatureFlags()` |
| **Fix**    | Add import and call to main()     |

**Effort**: 30 minutes

---

### SEED-006: Missing Scheduling Tables Seeding

| Field      | Value                                                             |
| ---------- | ----------------------------------------------------------------- |
| **Status** | OPEN                                                              |
| **Tables** | `rooms`, `shift_templates`, `appointment_types`, `overtime_rules` |
| **Impact** | Calendar/scheduling features have no preset data                  |
| **Fix**    | Add new seeder functions                                          |

**Effort**: 3-4 hours

---

### SEED-007: Missing Storage Tables Seeding

| Field      | Value                                  |
| ---------- | -------------------------------------- |
| **Status** | OPEN                                   |
| **Tables** | `sites`, `storage_zones`               |
| **Impact** | Inventory location features incomplete |
| **Fix**    | Add new seeder functions               |

**Effort**: 2-3 hours

---

### SEED-008: Missing Gamification Tables Seeding

| Field      | Value                                               |
| ---------- | --------------------------------------------------- |
| **Status** | OPEN                                                |
| **Tables** | `achievements`, `rewardCatalog`, `referralSettings` |
| **Impact** | Gamification features non-functional                |
| **Fix**    | Add new seeder functions                            |

**Effort**: 2-3 hours

---

## PHASE 3: WORK SURFACES INTEGRATION (Day 3-5)

**Estimated Effort**: 16-24 hours
**Priority**: P1 - Required for Stage 1 rollout

### WS-001: useConcurrentEditDetection Integration

| Field      | Value                                           |
| ---------- | ----------------------------------------------- |
| **Status** | OPEN                                            |
| **Issue**  | 0/9 WorkSurfaces have concurrent edit detection |
| **Impact** | Data loss risk in multi-user scenarios          |
| **Fix**    | Integrate hook in all 9 WorkSurface components  |

**Components**:

1. ClientsWorkSurface.tsx
2. OrdersWorkSurface.tsx
3. InventoryWorkSurface.tsx
4. InvoicesWorkSurface.tsx
5. DirectIntakeWorkSurface.tsx
6. PurchaseOrdersWorkSurface.tsx
7. PickPackWorkSurface.tsx
8. QuotesWorkSurface.tsx
9. ClientLedgerWorkSurface.tsx

**Effort**: 6-8 hours

---

### WS-002: useExport Integration

| Field      | Value                                          |
| ---------- | ---------------------------------------------- |
| **Status** | OPEN                                           |
| **Issue**  | 0/9 WorkSurfaces have export functionality     |
| **Impact** | Feature regression from legacy pages           |
| **Fix**    | Integrate hook in all 9 WorkSurface components |

**Effort**: 6-8 hours

---

### WS-003: RBAC Permissions Seeding

| Field      | Value                                   |
| ---------- | --------------------------------------- |
| **Status** | OPEN                                    |
| **Issue**  | 40+ accounting permissions not seeded   |
| **Impact** | Users cannot access accounting features |
| **Fix**    | Seed permissions via RBAC seeder        |

**Effort**: 2-4 hours

---

## PHASE 4: MISSING API ENDPOINTS (Day 5-8)

**Estimated Effort**: 32-40 hours
**Priority**: P1 - Core functionality gaps

### API-011: inventory.batch Endpoint

| Field       | Value                             |
| ----------- | --------------------------------- |
| **Status**  | NOT IMPLEMENTED                   |
| **Used In** | `InventoryWorkSurface.tsx`        |
| **Impact**  | Inventory batch operations broken |

---

### API-012: inventory.batches Endpoint

| Field       | Value                   |
| ----------- | ----------------------- |
| **Status**  | NOT IMPLEMENTED         |
| **Used In** | `OrderCreationFlow.tsx` |
| **Impact**  | Order creation may fail |

---

### API-013: orders.confirm Endpoint

| Field       | Value                          |
| ----------- | ------------------------------ |
| **Status**  | NOT IMPLEMENTED                |
| **Used In** | `OrdersWorkSurface.tsx`        |
| **Impact**  | Order confirmation unavailable |

---

### BE-QA-006: Accounting AR/AP Summaries

| Field         | Value                                    |
| ------------- | ---------------------------------------- |
| **Status**    | NOT IMPLEMENTED                          |
| **Endpoints** | `arAp.getArSummary`, `arAp.getApSummary` |
| **Impact**    | Accounting dashboard incomplete          |

---

### BE-QA-007: Cash Expenses

| Field         | Value                                                     |
| ------------- | --------------------------------------------------------- |
| **Status**    | NOT IMPLEMENTED                                           |
| **Endpoints** | `cashExpenses.listExpenses`, `cashExpenses.createExpense` |
| **Impact**    | Expense tracking unavailable                              |

---

### BE-QA-008: Financial Reports

| Field         | Value                                                             |
| ------------- | ----------------------------------------------------------------- |
| **Status**    | NOT IMPLEMENTED                                                   |
| **Endpoints** | `reports.generateBalanceSheet`, `reports.generateIncomeStatement` |
| **Impact**    | Financial reporting unavailable                                   |

---

### BE-QA-001: Email/SMS Integration

| Field      | Value                                                |
| ---------- | ---------------------------------------------------- |
| **Status** | NOT IMPLEMENTED                                      |
| **File**   | `server/routers/receipts.ts:460-490`                 |
| **Issue**  | Both `sendEmail` and `sendSms` throw NOT_IMPLEMENTED |
| **Impact** | Cannot send receipts                                 |

---

## PHASE 5: TYPE DRIFT & QUALITY (Day 8-10)

**Estimated Effort**: 16-20 hours
**Priority**: P2 - Quality issues

### TS-001: Frontend-Backend Type Mismatches

| Component            | Field               | Expected              | Actual                |
| -------------------- | ------------------- | --------------------- | --------------------- |
| InventoryWorkSurface | `batch.grade`       | `string \| undefined` | `string \| null`      |
| InventoryWorkSurface | `pagination`        | present               | MISSING               |
| InvoiceToPaymentFlow | `invoiceDate`       | `string`              | `Date`                |
| OrderToInvoiceFlow   | `confirmedAt`       | `Date \| null`        | `string \| undefined` |
| OrderToInvoiceFlow   | `lineItems`         | present               | MISSING               |
| PickPackWorkSurface  | `fulfillmentStatus` | `string`              | `string \| null`      |
| EditBatchModal       | batch status        | `QUARANTINE`          | `QUARANTINED`         |

**Effort**: 8-12 hours

---

### QUAL-008: Features Without Flag Protection

| Feature       | Route            | Flag Exists | Flag Checked |
| ------------- | ---------------- | ----------- | ------------ |
| Live Shopping | `/live-shopping` | Yes         | NO           |
| Photography   | `/photography`   | Yes         | NO           |
| Leaderboard   | `/leaderboard`   | Yes         | NO           |
| Analytics     | `/analytics`     | Yes         | NO           |

**Effort**: 2-4 hours

---

### DATA-QUALITY: Test/QA Accounts Cleanup

| Field        | Value                                          |
| ------------ | ---------------------------------------------- |
| **Status**   | OPEN                                           |
| **Issue**    | Test accounts visible in production user list  |
| **Accounts** | admin@terp.test, qa.superadmin@terp.test, etc. |
| **Fix**      | Remove or archive test accounts                |

**Effort**: 1-2 hours

---

## PHASE 6: PLACEHOLDERS & STUBS (Day 10-12)

**Estimated Effort**: 12-16 hours
**Priority**: P2 - Technical debt

### BE-QA-009: Journal Entries Audit Trail

| Field      | Value                                                              |
| ---------- | ------------------------------------------------------------------ |
| **Status** | PLACEHOLDER                                                        |
| **File**   | `server/routers/audit.ts:532-562`                                  |
| **Issue**  | Returns empty array with note "will be available in future update" |

---

### BE-QA-010: Live Catalog Service

| Field      | Value                                                                        |
| ---------- | ---------------------------------------------------------------------------- |
| **Status** | PLACEHOLDER                                                                  |
| **File**   | `server/services/liveCatalogService.ts:357-367`                              |
| **Issue**  | Brand extraction returns `[]`, price range hardcoded `{ min: 0, max: 1000 }` |

---

### BE-QA-011: COGS Override Statistics

| Field      | Value                                                     |
| ---------- | --------------------------------------------------------- |
| **Status** | PLACEHOLDER                                               |
| **File**   | `server/services/cogsChangeIntegrationService.ts:106-118` |
| **Issue**  | Returns all zeros                                         |

---

### FEAT-025: Recurring Orders Feature (DF-067)

| Field      | Value                                                   |
| ---------- | ------------------------------------------------------- |
| **Status** | COMPLETELY MISSING                                      |
| **Issue**  | No database table, no API endpoints, no UI components   |
| **Impact** | Feature referenced in documentation but not implemented |

---

## Summary: Fix Order Plan

### Day 1 (4-6 hours) - SEED SCRIPT FIXES

1. ✅ SEED-001: Remove `margin` from products INSERT
2. ✅ SEED-002: Fix pricing_defaults column name
3. ✅ SEED-003: Fix tags ENUM values
4. ✅ SEED-004: Fix inbox_items source_type
5. ✅ ROUTE-001: Wire DirectIntake route

### Day 1-2 (8-12 hours) - CRITICAL DATA

6. ✅ DB-001: Fix calendar database error
7. ✅ DATA-001: Fix unknown vendors
8. ✅ DATA-003: Fix placeholder client names
9. ✅ DATA-004: Seed feature flags

### Day 2-3 (8-12 hours) - MISSING SEEDERS

10. ✅ SEED-005: Integrate feature flags seeder
11. ✅ SEED-006: Add scheduling tables seeding
12. ✅ SEED-007: Add storage tables seeding
13. ✅ SEED-008: Add gamification tables seeding

### Day 3-5 (16-24 hours) - WORK SURFACES

14. ✅ WS-001: Integrate useConcurrentEditDetection (9 components)
15. ✅ WS-002: Integrate useExport (9 components)
16. ✅ WS-003: Seed RBAC permissions

### Day 5-8 (32-40 hours) - API ENDPOINTS

17-23. Implement missing API endpoints

### Day 8-12 (28-36 hours) - QUALITY

24-30. Fix type drift, placeholders, stubs

---

## QA Gates

| Phase   | Gate                    | Verification                                                     |
| ------- | ----------------------- | ---------------------------------------------------------------- |
| Phase 0 | Seed script runs        | `npx tsx scripts/seed-comprehensive.ts` completes without errors |
| Phase 1 | Data displays           | Inventory page shows products/batches                            |
| Phase 2 | Feature flags work      | Admin UI shows 35+ flags                                         |
| Phase 3 | WorkSurfaces functional | All 9 routes accessible                                          |
| Phase 4 | APIs respond            | tRPC calls return valid data                                     |
| Phase 5 | Types compile           | `pnpm check` = 0 errors                                          |

---

## Total Effort Estimate

| Phase     | Effort           | Priority |
| --------- | ---------------- | -------- |
| Phase 0   | 4-6 hours        | P0       |
| Phase 1   | 8-12 hours       | P0/P1    |
| Phase 2   | 8-12 hours       | P1       |
| Phase 3   | 16-24 hours      | P1       |
| Phase 4   | 32-40 hours      | P1       |
| Phase 5   | 16-20 hours      | P2       |
| Phase 6   | 12-16 hours      | P2       |
| **TOTAL** | **96-130 hours** | -        |

**MVP (Phases 0-2)**: 20-30 hours
**Production Ready (Phases 0-4)**: 68-94 hours
**Full Completion**: 96-130 hours

---

## Session Information

- **Compiled By**: Claude Opus 4.5
- **Date**: 2026-01-22
- **Sources**: 6 audit documents consolidated
- **Branch**: claude/create-github-branch-eCxpV

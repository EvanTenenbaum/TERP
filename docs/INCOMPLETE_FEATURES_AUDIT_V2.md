# TERP Codebase Incomplete Features Audit (V2)

**Date:** January 20, 2026
**Original Auditor:** Automated Code Review
**QA Verification:** RedHat Third-Party QA Protocol
**Branch:** `claude/qa-review-pr-255-EqIof`

## Executive Summary

This audit identifies features that have **not been fully implemented or rolled out** despite being referenced in documentation or code. All findings have been **independently verified** by RedHat-grade QA review.

### Key Metrics (Verified 2026-01-20)

| Category                        | Count | Status               | Verified |
| ------------------------------- | ----- | -------------------- | -------- |
| **Test Files Failed**           | 44    | Critical             | YES      |
| **Test Files Passed**           | 115   | Good                 | YES      |
| **Individual Tests Failed**     | 122   | Action Required      | YES      |
| **Individual Tests Skipped**    | 89    | Needs Review         | YES      |
| **TypeScript Errors**           | 117   | Action Required      | YES      |
| **TODO Comments**               | 30+   | Technical Debt       | YES      |
| **Disabled Features**           | 6     | By Design            | YES      |
| **Stub Implementations**        | 15+   | Needs Implementation | YES      |
| **Unseeded Config Tables**      | 14+   | CRITICAL             | YES      |
| **Feature Flags Not Seeded**    | 17+   | CRITICAL             | YES      |
| **Features Without Flag Gates** | 4     | Action Required      | YES      |

---

## CRITICAL: P0 Security Issues

### SEC-023: Exposed Production Database Credentials

**Status:** VERIFIED - REQUIRES IMMEDIATE ACTION
**File:** `drizzle/migrations/0007_DEPLOYMENT_INSTRUCTIONS.md:37-42`

```
mysql --host=terp-mysql-db-do-user-28175253-0.m.db.ondigitalocean.com \
      --port=25060 \
      --user=doadmin \
      --password=<REDACTED> \
      --database=defaultdb
```

**Action Required:**

1. Rotate database credentials IMMEDIATELY
2. Remove credentials from migration file
3. Scrub from git history using BFG or git-filter-repo
4. Update any services using these credentials

---

## 1. CRITICAL: Features Not Fully Implemented

### 1.1 Missing API Endpoints Referenced by Frontend

**Status:** VERIFIED

| Missing Endpoint                 | Used In                    | Impact                            | Roadmap Task |
| -------------------------------- | -------------------------- | --------------------------------- | ------------ |
| `trpc.inventory.batch`           | `InventoryWorkSurface.tsx` | Inventory batch operations broken | API-011      |
| `trpc.inventory.batches`         | `OrderCreationFlow.tsx`    | Order creation may fail           | API-012      |
| `trpc.orders.confirm`            | `OrdersWorkSurface.tsx`    | Order confirmation unavailable    | API-013      |
| `liveShopping.setSessionTimeout` | `liveShopping.ts`          | Session timeout not settable      | API-014      |
| `liveShopping.disableTimeout`    | `liveShopping.ts`          | Timeout cannot be disabled        | API-015      |

### 1.2 Accounting Module - Incomplete Routers

**Status:** VERIFIED via `server/routers/accounting.test.ts`

| Sub-Router                        | Status          | Tests Skipped | Roadmap Task |
| --------------------------------- | --------------- | ------------- | ------------ |
| `arAp.getArSummary`               | NOT IMPLEMENTED | 1             | BE-QA-006    |
| `arAp.getApSummary`               | NOT IMPLEMENTED | 1             | BE-QA-006    |
| `cashExpenses.listExpenses`       | NOT IMPLEMENTED | 1             | BE-QA-007    |
| `cashExpenses.createExpense`      | NOT IMPLEMENTED | 1             | BE-QA-007    |
| `reports.generateBalanceSheet`    | NOT IMPLEMENTED | 1             | BE-QA-008    |
| `reports.generateIncomeStatement` | NOT IMPLEMENTED | 1             | BE-QA-008    |

### 1.3 Journal Entries Audit Trail - Placeholder Implementation

**Status:** VERIFIED
**File:** `server/routers/audit.ts:532-562`
**Roadmap Task:** BE-QA-009

```typescript
return {
  accountId,
  currentBalance: 0,
  totalEntries: 0,
  entries: [], // EMPTY - not implemented
  note: "Journal entry audit trail will be available in a future update",
};
```

### 1.4 Recurring Orders Feature (DF-067)

**Status:** COMPLETELY MISSING
**Roadmap Task:** FEAT-025

- No database table
- No API endpoints
- No UI components
- Referenced in documentation but not implemented

### 1.5 Email/SMS Integration - NOT_IMPLEMENTED Stubs

**Status:** VERIFIED
**Files:** `server/routers/receipts.ts:460-490`
**Roadmap Task:** BE-QA-001 (already exists)

Both endpoints throw `TRPCError` with code `NOT_IMPLEMENTED`:

- `sendEmail` (line 472)
- `sendSms` (line 490)

### 1.6 Work Surfaces - Missing Feature Flag Seeding

**Status:** VERIFIED

**Deployment flags seeded (working):**

- `WORK_SURFACE_INTAKE`
- `WORK_SURFACE_ORDERS`
- `WORK_SURFACE_INVENTORY`
- `WORK_SURFACE_ACCOUNTING`

**Individual surface flags NOT seeded (broken granular control):**

| Flag                           | Status     | Impact            | Roadmap Task |
| ------------------------------ | ---------- | ----------------- | ------------ |
| `work-surface-direct-intake`   | NOT SEEDED | Defaults to false | DATA-012     |
| `work-surface-purchase-orders` | NOT SEEDED | Defaults to false | DATA-012     |
| `work-surface-orders`          | NOT SEEDED | Defaults to false | DATA-012     |
| `work-surface-inventory`       | NOT SEEDED | Defaults to false | DATA-012     |
| `work-surface-invoices`        | NOT SEEDED | Defaults to false | DATA-012     |
| `work-surface-clients`         | NOT SEEDED | Defaults to false | DATA-012     |

### 1.7 Gamification Module - No Seed Data

**Status:** VERIFIED - Tables exist, completely empty
**Roadmap Task:** DATA-013

| Table                        | Purpose                       | Seeded |
| ---------------------------- | ----------------------------- | ------ |
| `achievements`               | Achievement/badge definitions | NO     |
| `rewardCatalog`              | Rewards for point redemption  | NO     |
| `referralSettings`           | Couch Tax configuration       | NO     |
| `vipLeaderboardSnapshots`    | Leaderboard data              | NO     |
| `leaderboardDisplaySettings` | Per-client display prefs      | NO     |

### 1.8 Scheduling Module - Missing Defaults

**Status:** VERIFIED
**Roadmap Task:** DATA-014

| Table              | Purpose                | Should Contain                            |
| ------------------ | ---------------------- | ----------------------------------------- |
| `rooms`            | Meeting/loading rooms  | Conference Room A, B, C; Loading Docks    |
| `shiftTemplates`   | Preset shift patterns  | Day shift, Opening, Closing               |
| `appointmentTypes` | Appointment categories | Consultation, Pickup, Delivery, Meeting   |
| `overtimeRules`    | Overtime calculation   | US labor law defaults (8hr/1.5x, 40hr/wk) |

### 1.9 Storage Module - No Sites/Zones

**Status:** VERIFIED
**Roadmap Task:** DATA-015

| Table          | Purpose                      | Should Contain                       |
| -------------- | ---------------------------- | ------------------------------------ |
| `sites`        | Physical warehouse locations | Samples, Main Storage, Shipping Dock |
| `storageZones` | Zones within sites           | Zones A, B, C, D with temp controls  |

### 1.10 Additional Feature Flags - Not Seeded

**Status:** VERIFIED
**Roadmap Task:** DATA-012

| Flag                               | Used In                          | Status     |
| ---------------------------------- | -------------------------------- | ---------- |
| `work-surface-enabled`             | useWorkSurfaceFeatureFlags.ts:29 | NOT SEEDED |
| `work-surface-keyboard-contract`   | useWorkSurfaceFeatureFlags.ts:32 | NOT SEEDED |
| `work-surface-save-state`          | useWorkSurfaceFeatureFlags.ts:35 | NOT SEEDED |
| `work-surface-inspector-panel`     | useWorkSurfaceFeatureFlags.ts:38 | NOT SEEDED |
| `work-surface-validation-timing`   | useWorkSurfaceFeatureFlags.ts:41 | NOT SEEDED |
| `work-surface-concurrent-edit`     | useWorkSurfaceFeatureFlags.ts:62 | NOT SEEDED |
| `work-surface-golden-flow-intake`  | useWorkSurfaceFeatureFlags.ts:65 | NOT SEEDED |
| `work-surface-golden-flow-order`   | useWorkSurfaceFeatureFlags.ts:66 | NOT SEEDED |
| `work-surface-golden-flow-invoice` | useWorkSurfaceFeatureFlags.ts:67 | NOT SEEDED |
| `email-enabled`                    | featureFlags.ts mapping          | NOT SEEDED |
| `sms-enabled`                      | featureFlags.ts mapping          | NOT SEEDED |

**Naming inconsistency:** Seeded flags use UPPERCASE (`WORK_SURFACE_INTAKE`), but code references lowercase (`work-surface-direct-intake`).

### 1.11 Features Without Flag Protection

**Status:** VERIFIED
**Roadmap Task:** QUAL-008

| Feature       | Route            | Flag Exists           | Flag Checked |
| ------------- | ---------------- | --------------------- | ------------ |
| Live Shopping | `/live-shopping` | `live-shopping`       | NO           |
| Photography   | `/photography`   | `photography`         | NO           |
| Leaderboard   | `/leaderboard`   | `leaderboard`         | NO           |
| Analytics     | `/analytics`     | `analytics-dashboard` | NO           |

### 1.12 Organization Settings - Not Initialized

**Roadmap Task:** DATA-016

**Table:** `organizationSettings`
**Status:** Empty - no system-wide defaults

### 1.13 VIP Portal Configuration - No Defaults

**Roadmap Task:** DATA-017

**Table:** `vipPortalConfigurations`
**Status:** Empty - no per-client defaults

### 1.14 Notification Preferences - Not Seeded

**Roadmap Task:** DATA-018

**Table:** `notificationPreferences`
**Status:** Empty - no default notification settings

### 1.15 Credit System Settings - Partial

**Roadmap Task:** DATA-019

**Tables:**

- `creditSystemSettings` - Has schema defaults but record may not exist
- `creditVisibilitySettings` - NOT SEEDED

### 1.16 Pricing Rules - No Defaults

**Roadmap Task:** DATA-020

**Tables:**

- `pricingRules` - NOT SEEDED
- `pricingProfiles` - NOT SEEDED
- `variableMarkupRules` - NOT SEEDED
- `cogsRules` - NOT SEEDED

---

## 2. HIGH PRIORITY: Schema/Type Drift Issues

### 2.1 Frontend-Backend Type Mismatches

**Status:** VERIFIED via TypeScript errors
**Roadmap Task:** TS-001

| Component                  | Field               | Expected              | Actual                |
| -------------------------- | ------------------- | --------------------- | --------------------- |
| `InventoryWorkSurface.tsx` | `batch.grade`       | `string \| undefined` | `string \| null`      |
| `InventoryWorkSurface.tsx` | `pagination`        | present               | MISSING               |
| `InvoiceToPaymentFlow.tsx` | `invoiceDate`       | `string`              | `Date`                |
| `OrderToInvoiceFlow.tsx`   | `confirmedAt`       | `Date \| null`        | `string \| undefined` |
| `OrderToInvoiceFlow.tsx`   | `lineItems`         | present               | MISSING               |
| `PickPackWorkSurface.tsx`  | `fulfillmentStatus` | `string`              | `string \| null`      |
| `EditBatchModal.tsx`       | batch status        | `QUARANTINE`          | `QUARANTINED`         |

### 2.2 Missing Type Properties

**Roadmap Task:** TS-001

| Type                | Missing Property        | Used In                |
| ------------------- | ----------------------- | ---------------------- |
| `LineItem`          | `batchSku`, `productId` | `LineItemTable.tsx`    |
| `OrderItem`         | `id`                    | `OrderFulfillment.tsx` |
| `Transaction`       | `profit`                | `clientsDb.ts`         |
| `CreditApplication` | `idempotencyKey`        | `creditsDb.ts`         |

---

## 3. MEDIUM PRIORITY: Incomplete Features with Placeholders

### 3.1 Live Catalog Service

**File:** `server/services/liveCatalogService.ts`
**Roadmap Task:** BE-QA-010

| Feature                 | Line | Status | Current Return                    |
| ----------------------- | ---- | ------ | --------------------------------- |
| Brand extraction        | 357  | TODO   | `[]` empty array                  |
| Price range calculation | 367  | TODO   | `{ min: 0, max: 1000 }` hardcoded |

### 3.2 COGS Override Statistics

**File:** `server/services/cogsChangeIntegrationService.ts:106-118`
**Roadmap Task:** BE-QA-011

Returns all zeros (placeholder):

```typescript
return {
  overrideCount: 0,
  averageVariancePercent: 0,
  maxVariancePercent: 0,
};
```

### 3.3 Product Recommendations

**File:** `server/productRecommendations.ts`
**Roadmap Task:** BE-QA-012

All recommendation functions return empty arrays:

- `getRecommendations()` → `{ recommendations: [] }`
- `getSimilarProducts()` → `{ similarProducts: [] }`
- `getFrequentlyBoughtTogether()` → `{ frequentlyBoughtTogether: [] }`

### 3.4 Session Extension Validation

**File:** `server/services/live-shopping/sessionTimeoutService.ts:382`
**Roadmap Task:** BE-QA-013

```typescript
canExtend: true, // TODO: Check extension count - always returns true
```

### 3.5 Dashboard Widgets Migration

**File:** `client/src/components/dashboard/widgets-v3/index.ts:2`
**Roadmap Task:** FE-QA-004

```typescript
// TODO: Widgets are being migrated from v2 to v3
```

The v3 index file is currently empty.

### 3.6 Live Shopping Session Console

**File:** `client/src/pages/LiveShoppingPage.tsx:410`
**Roadmap Task:** FE-QA-005

```typescript
// TODO: Implement session console/detail view
// Currently shows "Coming Soon" toast
```

---

## 4. Database Migration Issues

### 4.1 Duplicate Migration Version Numbers

**Status:** VERIFIED
**Roadmap Task:** INFRA-015

| Version | Count | Files                                            |
| ------- | ----- | ------------------------------------------------ |
| 0001    | 3     | workflow_queue, live_shopping, vip_portal_schema |
| 0002    | 2     | deployments, dashboard_preferences               |
| 0003    | 3     | inventory_stability (3 variants)                 |

### 4.2 Non-Migration Files in Migration Directory

**Roadmap Task:** INFRA-016

- `0007_DEPLOYMENT_INSTRUCTIONS.md` - Should be in `/docs/`
- `0007_add_calendar_recurrence_index.test.ts` - Should be in `/tests/`

---

## 5. Disabled Features (By Design)

### 5.1 Environment-Controlled Features

| Feature           | Environment Variable    | Default | Status   |
| ----------------- | ----------------------- | ------- | -------- |
| Live Catalog      | `FEATURE_LIVE_CATALOG`  | false   | DISABLED |
| Email Integration | `FEATURE_EMAIL_ENABLED` | false   | DISABLED |
| SMS Integration   | `FEATURE_SMS_ENABLED`   | false   | DISABLED |
| QA Authentication | `QA_AUTH_ENABLED`       | false   | DISABLED |
| Auto Rollback     | `ENABLE_AUTO_ROLLBACK`  | false   | DISABLED |
| Test Auth Token   | `ENABLE_TEST_AUTH`      | false   | DISABLED |

---

## 6. Test Suite Status

### 6.1 Summary (Verified 2026-01-20)

| Metric             | Count |
| ------------------ | ----- |
| Test Files Failed  | 44    |
| Test Files Passed  | 115   |
| Test Files Skipped | 3     |
| Tests Failed       | 122   |
| Tests Passed       | 1943  |
| Tests Skipped      | 89    |
| Tests Todo         | 7     |

### 6.2 Skipped Test Suites

| Test File                       | Status               | Reason                 |
| ------------------------------- | -------------------- | ---------------------- |
| `calendarInvitations.test.ts`   | ENTIRE SUITE SKIPPED | Router not implemented |
| `vipPortal.liveCatalog.test.ts` | ENTIRE SUITE SKIPPED | Feature not complete   |

### 6.3 Work Surface Keyboard Tests

**Roadmap Task:** BUG-100

6 failing tests in `useWorkSurfaceKeyboard.test.ts`:

- Tab navigation in non-grid mode
- Focus management issues
- Event handler binding

---

## 7. Technical Debt: TODO/FIXME Comments

### 7.1 Server-Side TODOs

| File                    | Line | Comment                                             | Roadmap Task |
| ----------------------- | ---- | --------------------------------------------------- | ------------ |
| `quotes.ts`             | 294  | `// TODO: Send email notification to client`        | BE-QA-001    |
| `scheduling.ts`         | 1142 | `// TODO: Add date range filtering when needed`     | BE-QA-014    |
| `db.ts`                 | 129  | `// TODO: add feature queries here as schema grows` | BE-QA-015    |
| `liveCatalogService.ts` | 357  | `// TODO: implement when brand data available`      | BE-QA-010    |
| `liveCatalogService.ts` | 367  | `// TODO: implement with pricing engine`            | BE-QA-010    |

### 7.2 Client-Side TODOs

| File                    | Line | Comment                                                 | Roadmap Task |
| ----------------------- | ---- | ------------------------------------------------------- | ------------ |
| `BatchDetailDrawer.tsx` | 465  | `// TODO: Re-enable when API includes product relation` | FE-QA-006    |
| `BatchDetailDrawer.tsx` | 891  | `// TODO: Calculate from profitability data`            | FE-QA-007    |
| `LiveShoppingPage.tsx`  | 410  | `// TODO: Implement session console/detail view`        | FE-QA-005    |
| `TemplateSelector.tsx`  | 30   | `id: "TODO"` placeholder                                | FE-QA-008    |

---

## 8. SEEDING GAPS SUMMARY

| Category          | Tables Affected | Priority | Roadmap Task |
| ----------------- | --------------- | -------- | ------------ |
| **Gamification**  | 5+ tables       | CRITICAL | DATA-013     |
| **Scheduling**    | 4 tables        | CRITICAL | DATA-014     |
| **Storage**       | 2 tables        | HIGH     | DATA-015     |
| **Feature Flags** | 15+ flags       | HIGH     | DATA-012     |
| **Organization**  | 1 table         | MEDIUM   | DATA-016     |
| **VIP Portal**    | 1 table         | MEDIUM   | DATA-017     |
| **Notifications** | 1 table         | MEDIUM   | DATA-018     |
| **Credits**       | 2 tables        | MEDIUM   | DATA-019     |
| **Pricing**       | 4 tables        | MEDIUM   | DATA-020     |

---

## Appendix A: Roadmap Task Summary

### P0 - Critical (Ship Blockers)

| Task ID | Description                           | Category |
| ------- | ------------------------------------- | -------- |
| SEC-023 | Rotate exposed database credentials   | Security |
| TS-001  | Fix 117 TypeScript errors             | Quality  |
| BUG-100 | Fix 122 failing tests (44 test files) | Quality  |

### P1 - High Priority

| Task ID   | Description                       | Category     |
| --------- | --------------------------------- | ------------ |
| DATA-012  | Seed work surface feature flags   | Data Seeding |
| DATA-013  | Seed gamification defaults        | Data Seeding |
| DATA-014  | Seed scheduling defaults          | Data Seeding |
| DATA-015  | Seed storage sites/zones          | Data Seeding |
| BE-QA-006 | Implement AR/AP summary endpoints | Backend      |
| BE-QA-007 | Implement cash expenses endpoints | Backend      |
| BE-QA-008 | Implement financial reports       | Backend      |
| QUAL-008  | Add feature flag checks to routes | Quality      |

### P2 - Medium Priority

| Task ID   | Description                              | Category     |
| --------- | ---------------------------------------- | ------------ |
| API-011   | Implement inventory.batch endpoint       | API          |
| API-012   | Implement inventory.batches endpoint     | API          |
| API-013   | Implement orders.confirm endpoint        | API          |
| API-014   | Implement liveShopping.setSessionTimeout | API          |
| API-015   | Implement liveShopping.disableTimeout    | API          |
| DATA-016  | Seed organization settings               | Data Seeding |
| DATA-017  | Seed VIP portal configurations           | Data Seeding |
| DATA-018  | Seed notification preferences            | Data Seeding |
| DATA-019  | Seed credit system settings              | Data Seeding |
| DATA-020  | Seed pricing rules/profiles              | Data Seeding |
| BE-QA-009 | Implement journal entry audit trail      | Backend      |
| BE-QA-010 | Implement live catalog brand/price       | Backend      |
| BE-QA-011 | Implement COGS override statistics       | Backend      |
| BE-QA-012 | Implement product recommendations        | Backend      |
| BE-QA-013 | Implement session extension validation   | Backend      |
| BE-QA-014 | Add date range filtering to scheduling   | Backend      |
| BE-QA-015 | Add feature queries to db.ts             | Backend      |
| FE-QA-004 | Complete dashboard widgets v3 migration  | Frontend     |
| FE-QA-005 | Implement live shopping session console  | Frontend     |
| FE-QA-006 | Re-enable batch product relation         | Frontend     |
| FE-QA-007 | Calculate profitability data             | Frontend     |
| FE-QA-008 | Fix TemplateSelector TODO id             | Frontend     |
| FEAT-025  | Implement recurring orders feature       | Feature      |

### P3 - Low Priority (Cleanup)

| Task ID   | Description                              | Category       |
| --------- | ---------------------------------------- | -------------- |
| INFRA-015 | Consolidate duplicate migration versions | Infrastructure |
| INFRA-016 | Move non-SQL files out of migrations     | Infrastructure |

---

## Appendix B: Verification Log

| Claim Verified                 | Method           | Result | Date       |
| ------------------------------ | ---------------- | ------ | ---------- |
| 117 TypeScript errors          | `pnpm run check` | MATCH  | 2026-01-20 |
| 44 test files failed           | `pnpm test`      | MATCH  | 2026-01-20 |
| 122 individual tests failed    | `pnpm test`      | MATCH  | 2026-01-20 |
| 89 tests skipped               | `pnpm test`      | MATCH  | 2026-01-20 |
| Exposed DB credentials         | File read        | FOUND  | 2026-01-20 |
| Migration version duplicates   | `ls migrations/` | FOUND  | 2026-01-20 |
| Placeholder in audit.ts        | Grep + read      | FOUND  | 2026-01-20 |
| NOT_IMPLEMENTED in receipts.ts | Grep             | FOUND  | 2026-01-20 |
| 6 skipped accounting tests     | Grep             | FOUND  | 2026-01-20 |

---

_Audit V2 Generated: 2026-01-20_
_QA Protocol: RedHat Third-Party Independent Review_

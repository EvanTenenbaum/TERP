# TERP Codebase Incomplete Features Audit

**Date:** January 20, 2026
**Auditor:** Automated Code Review
**Branch:** `claude/review-incomplete-features-lXgU4`

## Executive Summary

This audit identifies features that have **not been fully implemented or rolled out** despite being referenced in documentation or code. The findings are verified against actual codebase implementation, not just task status documents.

### Key Metrics

| Category                     | Count | Status               |
| ---------------------------- | ----- | -------------------- |
| **Test Files Failed**        | 44    | Critical             |
| **Test Files Passed**        | 115   | Good                 |
| **Individual Tests Failed**  | 122   | Action Required      |
| **Individual Tests Skipped** | 89    | Needs Review         |
| **TypeScript Errors**        | 117   | Action Required      |
| **TODO Comments**            | 30+   | Technical Debt       |
| **Disabled Features**        | 6     | By Design            |
| **Stub Implementations**     | 15+   | Needs Implementation |

---

## 1. CRITICAL: Features Not Fully Implemented

### 1.1 Missing API Endpoints Referenced by Frontend

The frontend code references these tRPC endpoints that **do not exist**:

| Missing Endpoint                 | Used In                    | Impact                            |
| -------------------------------- | -------------------------- | --------------------------------- |
| `trpc.inventory.batch`           | `InventoryWorkSurface.tsx` | Inventory batch operations broken |
| `trpc.inventory.batches`         | `OrderCreationFlow.tsx`    | Order creation may fail           |
| `trpc.orders.confirm`            | `OrdersWorkSurface.tsx`    | Order confirmation unavailable    |
| `liveShopping.setSessionTimeout` | `liveShopping.ts`          | Session timeout not settable      |
| `liveShopping.disableTimeout`    | `liveShopping.ts`          | Timeout cannot be disabled        |

### 1.2 Accounting Module - Incomplete Routers

**File:** `server/routers/accounting.test.ts`

| Sub-Router                        | Status          | Tests Skipped |
| --------------------------------- | --------------- | ------------- |
| `arAp.getArSummary`               | NOT IMPLEMENTED | 1             |
| `arAp.getApSummary`               | NOT IMPLEMENTED | 1             |
| `cashExpenses.listExpenses`       | NOT IMPLEMENTED | 1             |
| `cashExpenses.createExpense`      | NOT IMPLEMENTED | 1             |
| `reports.generateBalanceSheet`    | NOT IMPLEMENTED | 1             |
| `reports.generateIncomeStatement` | NOT IMPLEMENTED | 1             |

### 1.3 Journal Entries Audit Trail

**File:** `server/routers/audit.ts:532-562`

The `getAccountBalanceBreakdown` endpoint returns **placeholder data**:

```typescript
return {
  accountId,
  currentBalance: 0,
  totalEntries: 0,
  entries: [], // EMPTY - not implemented
  note: "Journal entry audit trail will be available in a future update",
};
```

**Reason:** Journal entries table not yet implemented in schema.

### 1.4 Recurring Orders Feature (DF-067)

**Status:** COMPLETELY MISSING

- No database table
- No API endpoints
- No UI components
- Referenced in documentation but not implemented

### 1.5 Email/SMS Integration

**Files:** `server/routers/receipts.ts`

Both endpoints throw `NOT_IMPLEMENTED` errors:

```typescript
sendEmail: // throws TRPCError with code: "NOT_IMPLEMENTED"
sendSms:   // throws TRPCError with code: "NOT_IMPLEMENTED"
```

**Blocked by:** Missing environment configuration:

- `FEATURE_EMAIL_ENABLED=true` + email service credentials
- `FEATURE_SMS_ENABLED=true` + Twilio credentials

### 1.6 Work Surfaces - Missing Seeding

**Status:** PARTIALLY IMPLEMENTED - Components built but seeding incomplete

**Deployment flags seeded (working):**

- `WORK_SURFACE_INTAKE` ✅
- `WORK_SURFACE_ORDERS` ✅
- `WORK_SURFACE_INVENTORY` ✅
- `WORK_SURFACE_ACCOUNTING` ✅

**Individual surface flags NOT seeded (broken granular control):**

| Flag                           | Status     | Impact            |
| ------------------------------ | ---------- | ----------------- |
| `work-surface-direct-intake`   | NOT SEEDED | Defaults to false |
| `work-surface-purchase-orders` | NOT SEEDED | Defaults to false |
| `work-surface-orders`          | NOT SEEDED | Defaults to false |
| `work-surface-inventory`       | NOT SEEDED | Defaults to false |
| `work-surface-invoices`        | NOT SEEDED | Defaults to false |
| `work-surface-clients`         | NOT SEEDED | Defaults to false |

**File:** `client/src/hooks/work-surface/useWorkSurfaceFeatureFlags.ts` references these flags.

**Additional seeding gaps:**

- `userDashboardPreferences` table exists but is never populated
- No work-surface-specific user preferences fields
- No flag dependency relationships configured

**Files requiring updates:**

- `server/services/seedFeatureFlags.ts` - Add individual flag definitions
- `server/services/seedDefaults.ts` - Add `seedWorkSurfaceDefaults()` function

---

## 2. HIGH PRIORITY: Schema/Type Drift Issues

### 2.1 Frontend-Backend Type Mismatches

These indicate API responses don't match frontend expectations:

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

| Feature                 | Line | Status | Current Return                    |
| ----------------------- | ---- | ------ | --------------------------------- |
| Brand extraction        | 357  | TODO   | `[]` empty array                  |
| Price range calculation | 367  | TODO   | `{ min: 0, max: 1000 }` hardcoded |

### 3.2 COGS Override Statistics

**File:** `server/services/cogsChangeIntegrationService.ts:106-118`

Returns all zeros:

```typescript
return {
  overrideCount: 0, // Placeholder
  averageVariancePercent: 0, // Placeholder
  maxVariancePercent: 0, // Placeholder
};
```

### 3.3 Product Recommendations

**File:** `server/productRecommendations.ts`

All recommendation functions return empty arrays:

- `getRecommendations()` → `{ recommendations: [] }`
- `getSimilarProducts()` → `{ similarProducts: [] }`
- `getFrequentlyBoughtTogether()` → `{ frequentlyBoughtTogether: [] }`

### 3.4 Session Extension Validation

**File:** `server/services/live-shopping/sessionTimeoutService.ts:382`

```typescript
canExtend: true, // TODO: Check extension count - always returns true
```

### 3.5 Dashboard Widgets Migration

**File:** `client/src/components/dashboard/widgets-v3/index.ts:2`

```typescript
// TODO: Widgets are being migrated from v2 to v3
```

The v3 index file is currently empty.

### 3.6 Live Shopping Session Console

**File:** `client/src/pages/LiveShoppingPage.tsx:410`

```typescript
// TODO: Implement session console/detail view
// Currently shows "Coming Soon" toast
```

---

## 4. Database Migration Issues

### 4.1 Duplicate Migration Version Numbers

**Critical:** Multiple migrations share the same version number:

| Version | Count | Files                                            |
| ------- | ----- | ------------------------------------------------ |
| 0001    | 3     | workflow_queue, live_shopping, vip_portal_schema |
| 0002    | 2     | deployments, dashboard_preferences               |
| 0003    | 3     | inventory_stability (3 variants)                 |
| 0020    | 2     | strain_type, flimsy_makkari                      |
| 0021    | 3     | product_name, product_name_fixed, giant_leech    |
| 0030    | 2     | adjustment_reasons, live_shopping_item_status    |

### 4.2 Security Vulnerability

**File:** `drizzle/migrations/0007_DEPLOYMENT_INSTRUCTIONS.md`

Contains **exposed production database credentials**:

- Host: `terp-mysql-db-do-user-28175253-0.m.db.ondigitalocean.com`
- Password: EXPOSED in plaintext

**ACTION REQUIRED:** Rotate credentials immediately and remove from git history.

### 4.3 Non-Migration Files in Migration Directory

- `0007_DEPLOYMENT_INSTRUCTIONS.md` - Should be in `/docs/`
- `0007_add_calendar_recurrence_index.test.ts` - Should be in `/tests/`

### 4.4 Schema Features Not Applied

| Feature             | Migration                        | Status               |
| ------------------- | -------------------------------- | -------------------- |
| Feature Flags       | 0021_add_feature_flags.sql       | Rollback file exists |
| Admin Impersonation | 0022_add_admin_impersonation.sql | Rollback file exists |

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

### 5.2 Metrics Disabled Due to Missing Schema

| Metric                    | Status              | Reason                                  |
| ------------------------- | ------------------- | --------------------------------------- |
| `inventory_expiring_soon` | COMMENTED OUT       | `expirationDate` column doesn't exist   |
| Expected Ship Date        | Returns placeholder | `expectedShipDate` column doesn't exist |

---

## 6. Test Suite Status

### 6.1 Skipped Test Suites (Complete Routers)

| Test File                       | Status               | Reason                 |
| ------------------------------- | -------------------- | ---------------------- |
| `calendarInvitations.test.ts`   | ENTIRE SUITE SKIPPED | Router not implemented |
| `vipPortal.liveCatalog.test.ts` | ENTIRE SUITE SKIPPED | Feature not complete   |

### 6.2 Individual Skipped Tests

**RBAC Tests (8 skipped):** Mock chain issues with `db.select().from().where()` patterns

**Other Tests:**

- `badDebt.test.ts` - Total write-offs retrieval
- `credits.test.ts` - Credit application to invoices
- `inventory.test.ts` - Batch creation from intake, status updates

### 6.3 Failed Tests Summary

| Category               | Failed Count |
| ---------------------- | ------------ |
| Work Surface Keyboard  | 6            |
| Type/Schema Mismatches | 30+          |
| Missing Dependencies   | 20+          |
| Assertion Failures     | 66+          |

---

## 7. Technical Debt: TODO/FIXME Comments

### 7.1 Server-Side TODOs

| File                    | Line | Comment                                             |
| ----------------------- | ---- | --------------------------------------------------- |
| `quotes.ts`             | 294  | `// TODO: Send email notification to client`        |
| `scheduling.ts`         | 1142 | `// TODO: Add date range filtering when needed`     |
| `db.ts`                 | 129  | `// TODO: add feature queries here as schema grows` |
| `liveCatalogService.ts` | 357  | `// TODO: implement when brand data available`      |
| `liveCatalogService.ts` | 367  | `// TODO: implement with pricing engine`            |

### 7.2 Client-Side TODOs

| File                    | Line | Comment                                                 |
| ----------------------- | ---- | ------------------------------------------------------- |
| `BatchDetailDrawer.tsx` | 465  | `// TODO: Re-enable when API includes product relation` |
| `BatchDetailDrawer.tsx` | 891  | `// TODO: Calculate from profitability data`            |
| `LiveShoppingPage.tsx`  | 410  | `// TODO: Implement session console/detail view`        |
| `TemplateSelector.tsx`  | 30   | `id: "TODO"` placeholder                                |

### 7.3 Test TODOs

| File                               | Issue              |
| ---------------------------------- | ------------------ |
| `rbac-permissions.test.ts`         | 4 mock chain TODOs |
| `rbac-roles.test.ts`               | 4 mock chain TODOs |
| `creditsDb.race-condition.test.ts` | Test fixtures TODO |

---

## 8. Recommendations

### 8.1 Immediate Actions (P0)

1. **Rotate Database Credentials** - Security vulnerability in migration file
2. **Fix Missing API Endpoints** - `inventory.batch`, `orders.confirm`
3. **Implement AR/AP Summaries** - Core accounting features
4. **Fix Type Mismatches** - null vs undefined throughout

### 8.2 Short-Term Actions (P1)

1. **Consolidate Duplicate Migrations** - Fix version numbering
2. **Enable Email/SMS Features** - Configure external services
3. **Fix 122 Failing Tests** - Restore test confidence
4. **Seed Work Surface Feature Flags** - Add 6 missing individual surface flags and dependencies

### 8.3 Medium-Term Actions (P2)

1. **Complete Widgets v3 Migration** - Dashboard modernization
2. **Implement Live Shopping Console** - User experience
3. **Add Brand/Price Range to Live Catalog** - Feature completion
4. **Implement Recurring Orders** - Missing feature (DF-067)

### 8.4 Cleanup Tasks

1. Move non-SQL files out of migration directories
2. Remove deprecated feature flag code after full migration
3. Add missing `expirationDate` and `expectedShipDate` columns
4. Fix RBAC test mock chains

---

## Appendix A: Files Requiring Attention

### Critical Files

- `server/routers/accounting.ts` - Missing sub-routers
- `server/routers/receipts.ts` - Email/SMS stubs
- `server/routers/audit.ts` - Placeholder responses
- `drizzle/migrations/0007_DEPLOYMENT_INSTRUCTIONS.md` - SECURITY

### Type Definition Files

- `client/src/types/inventory.ts`
- `client/src/types/orders.ts`
- Schema files in `drizzle/schema*.ts`

### Test Files Needing Fixes

- `server/routers/rbac-permissions.test.ts`
- `server/routers/rbac-roles.test.ts`
- `client/src/hooks/work-surface/__tests__/useWorkSurfaceKeyboard.test.ts`

---

## Appendix B: Reference Documents

- `/docs/roadmaps/MASTER_ROADMAP.md` - Overall project status
- `/.kiro/specs/UNIFIED-EXECUTION-PLAN.md` - Current execution plans
- `/docs/TODO_COMPLETION.md` - Task completion tracking
- `/product-management/initiatives/TERP-INIT-003/` - Calendar feature roadmap

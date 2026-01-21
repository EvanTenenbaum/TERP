# Incomplete Features Audit - Roadmap Tasks

**Generated:** 2026-01-20
**Source:** `docs/INCOMPLETE_FEATURES_AUDIT_V2.md`
**Status:** READY FOR EXECUTION

> **All tasks derived from RedHat QA-verified audit findings.**

---

## Quick Reference: Task Priority Distribution

| Priority  | Count | Description                            |
| --------- | ----- | -------------------------------------- |
| **P0**    | 3     | Ship blockers - must fix before deploy |
| **P1**    | 8     | High priority - core functionality     |
| **P2**    | 24    | Medium - incomplete features           |
| **P3**    | 2     | Low - cleanup/hygiene                  |
| **TOTAL** | 37    |                                        |

---

## P0 - CRITICAL (Ship Blockers)

### SEC-023: Rotate Exposed Production Database Credentials

**Priority:** P0 - BLOCKER
**Status:** NOT STARTED
**Effort:** 2-4h
**Assignee:** Infrastructure Team

**Problem:**
Production database credentials are exposed in `drizzle/migrations/0007_DEPLOYMENT_INSTRUCTIONS.md`:

- Host: `terp-mysql-db-do-user-28175253-0.m.db.ondigitalocean.com`
- Password: `<REDACTED>`

**Objectives:**

1. Rotate database credentials immediately
2. Remove credentials from the file
3. Scrub from git history

**Deliverables:**

- [ ] New database credentials generated
- [ ] All services updated with new credentials
- [ ] File redacted or removed from repository
- [ ] Git history cleaned using BFG or git-filter-repo
- [ ] Verification that old credentials no longer work

**Verification:**

```bash
grep -r "AVNS_Q_RGkS7" . # Should return no results
```

---

### TS-001: Fix Remaining TypeScript Errors (117 errors)

**Priority:** P0 - BLOCKER
**Status:** NOT STARTED
**Effort:** 16-24h
**Module:** Multiple (client/src, server/)

**Problem:**
`pnpm run check` returns 117 TypeScript errors across the codebase:

- Type mismatches between frontend and backend
- Missing properties on types
- Implicit `any` types
- Null/undefined handling issues

**Key Files with Errors:**
| File | Error Count | Primary Issues |
|------|-------------|----------------|
| `InventoryWorkSurface.tsx` | 8 | `batch.grade` null vs undefined |
| `OrdersWorkSurface.tsx` | 2 | Missing `orders.confirm` |
| `PickPackWorkSurface.tsx` | 6 | Argument count mismatches |
| `InvoiceToPaymentFlow.tsx` | 4 | Date type mismatches |
| `OrderCreationFlow.tsx` | 4 | Missing `lineItems` property |
| `OrderToInvoiceFlow.tsx` | 5 | Type incompatibilities |
| `clientLedger.ts` | 6 | Undefined to number assignments |
| `cogs.ts` | 5 | Pino logger API signature |

**Deliverables:**

- [ ] All 117 TypeScript errors resolved
- [ ] `pnpm run check` passes with 0 errors
- [ ] No `any` types introduced as workarounds
- [ ] Types properly aligned between client and server

---

### BUG-100: Fix Failing Test Suite (122 failures across 44 files)

**Priority:** P0 - BLOCKER
**Status:** NOT STARTED
**Effort:** 24-40h
**Module:** Multiple test files

**Problem:**
`pnpm test` shows:

- 44 test files failed
- 122 individual tests failed
- 89 tests skipped

**Key Failing Test Areas:**
| Test File | Failures | Root Cause |
|-----------|----------|------------|
| `useWorkSurfaceKeyboard.test.ts` | 6 | Tab navigation/focus management |
| `accounting.test.ts` | 6 | Skipped due to NOT_IMPLEMENTED |
| Various component tests | Multiple | Type mismatches, API changes |

**Deliverables:**

- [ ] All 122 failing tests fixed or documented as known issues
- [ ] Test pass rate above 95%
- [ ] Skipped tests reviewed and justified
- [ ] CI pipeline passes

---

## P1 - HIGH PRIORITY

### DATA-012: Seed Work Surface Feature Flags

**Priority:** P1
**Status:** NOT STARTED
**Effort:** 4h
**Module:** `scripts/seed/`

**Problem:**
17+ feature flags referenced in code but not seeded in database. Individual work surface flags default to `false`, breaking granular control.

**Flags to Seed:**

```typescript
const flags = [
  "work-surface-enabled",
  "work-surface-direct-intake",
  "work-surface-purchase-orders",
  "work-surface-orders",
  "work-surface-inventory",
  "work-surface-invoices",
  "work-surface-clients",
  "work-surface-keyboard-contract",
  "work-surface-save-state",
  "work-surface-inspector-panel",
  "work-surface-validation-timing",
  "work-surface-concurrent-edit",
  "work-surface-golden-flow-intake",
  "work-surface-golden-flow-order",
  "work-surface-golden-flow-invoice",
  "email-enabled",
  "sms-enabled",
];
```

**Deliverables:**

- [ ] Seed script updated with all flags
- [ ] Naming convention standardized (lowercase with hyphens)
- [ ] Verification script to confirm seeding
- [ ] Documentation updated

---

### DATA-013: Seed Gamification Module Defaults

**Priority:** P1
**Status:** NOT STARTED
**Effort:** 4-8h
**Module:** `scripts/seed/`

**Problem:**
Gamification tables exist but are completely empty:

- `achievements` - No achievement definitions
- `rewardCatalog` - No rewards defined
- `referralSettings` - No Couch Tax configuration
- `vipLeaderboardSnapshots` - No leaderboard data
- `leaderboardDisplaySettings` - No client preferences

**Deliverables:**

- [ ] 10+ achievement definitions seeded
- [ ] 5+ reward catalog items seeded
- [ ] Default referral settings seeded
- [ ] Test leaderboard data created
- [ ] Documentation for adding new achievements

---

### DATA-014: Seed Scheduling Module Defaults

**Priority:** P1
**Status:** NOT STARTED
**Effort:** 4h
**Module:** `scripts/seed/`

**Problem:**
Scheduling-related tables have no default data:

- `rooms` - No meeting/loading room definitions
- `shiftTemplates` - No preset shift patterns
- `appointmentTypes` - No appointment categories
- `overtimeRules` - No overtime calculation rules

**Deliverables:**

- [ ] Default rooms seeded (Conference A/B/C, Loading Docks)
- [ ] Standard shift templates (Day, Opening, Closing)
- [ ] Appointment types (Consultation, Pickup, Delivery, Meeting)
- [ ] US labor law overtime defaults (8hr/1.5x, 40hr/wk)

---

### DATA-015: Seed Storage Sites and Zones

**Priority:** P1
**Status:** NOT STARTED
**Effort:** 2-4h
**Module:** `scripts/seed/`

**Problem:**
Storage management has no site/zone data:

- `sites` table empty
- `storageZones` table empty

**Deliverables:**

- [ ] Default sites seeded (Samples, Main Storage, Shipping Dock)
- [ ] Storage zones created per site
- [ ] Temperature control settings defined
- [ ] Location hierarchy documented

---

### BE-QA-006: Implement AR/AP Summary Endpoints

**Priority:** P1
**Status:** NOT STARTED
**Effort:** 8h
**Module:** `server/routers/accounting.ts`
**Tests:** `server/routers/accounting.test.ts:248-272`

**Problem:**
AR/AP summary endpoints exist in tests but implementations are skipped:

- `arAp.getArSummary` - Returns NOT_IMPLEMENTED
- `arAp.getApSummary` - Returns NOT_IMPLEMENTED

**Deliverables:**

- [ ] `getArSummary` implementation returning real data
- [ ] `getApSummary` implementation returning real data
- [ ] Tests unskipped and passing
- [ ] API documentation updated

---

### BE-QA-007: Implement Cash Expenses Endpoints

**Priority:** P1
**Status:** NOT STARTED
**Effort:** 8h
**Module:** `server/routers/accounting.ts`
**Tests:** `server/routers/accounting.test.ts:298-340`

**Problem:**
Cash expenses endpoints are stubbed:

- `cashExpenses.listExpenses` - Skipped test
- `cashExpenses.createExpense` - Skipped test

**Deliverables:**

- [ ] List expenses implementation
- [ ] Create expense implementation
- [ ] Tests unskipped and passing
- [ ] Integration with expense categories

---

### BE-QA-008: Implement Financial Reports

**Priority:** P1
**Status:** NOT STARTED
**Effort:** 16h
**Module:** `server/routers/accounting.ts`
**Tests:** `server/routers/accounting.test.ts:350-375`

**Problem:**
Financial report generation is not implemented:

- `reports.generateBalanceSheet` - Skipped test
- `reports.generateIncomeStatement` - Skipped test

**Deliverables:**

- [ ] Balance sheet generation from GL data
- [ ] Income statement generation
- [ ] Export to PDF/CSV
- [ ] Date range filtering

---

### QUAL-008: Add Feature Flag Checks to Routes

**Priority:** P1
**Status:** NOT STARTED
**Effort:** 4h
**Module:** `client/src/`

**Problem:**
Several features are accessible without feature flag checks:

- `/live-shopping` - No `live-shopping` flag check
- `/photography` - No `photography` flag check
- `/leaderboard` - No `leaderboard` flag check
- `/analytics` - No `analytics-dashboard` flag check

**Deliverables:**

- [ ] Feature flag checks added to route guards
- [ ] Graceful degradation for disabled features
- [ ] Tests for flag-protected routes

---

## P2 - MEDIUM PRIORITY

### API-011: Implement inventory.batch Endpoint

**Priority:** P2
**Status:** NOT STARTED
**Effort:** 4h
**Module:** `server/routers/inventory.ts`
**Used In:** `InventoryWorkSurface.tsx:397`

---

### API-012: Implement inventory.batches Endpoint

**Priority:** P2
**Status:** NOT STARTED
**Effort:** 4h
**Module:** `server/routers/inventory.ts`
**Used In:** `OrderCreationFlow.tsx:581`

---

### API-013: Implement orders.confirm Endpoint

**Priority:** P2
**Status:** NOT STARTED
**Effort:** 4h
**Module:** `server/routers/orders.ts`
**Used In:** `OrdersWorkSurface.tsx:390`

---

### API-014: Implement liveShopping.setSessionTimeout

**Priority:** P2
**Status:** NOT STARTED
**Effort:** 2h
**Module:** `server/routers/liveShopping.ts`

---

### API-015: Implement liveShopping.disableTimeout

**Priority:** P2
**Status:** NOT STARTED
**Effort:** 2h
**Module:** `server/routers/liveShopping.ts`

---

### DATA-016: Seed Organization Settings

**Priority:** P2
**Status:** NOT STARTED
**Effort:** 2h
**Module:** `scripts/seed/`

---

### DATA-017: Seed VIP Portal Configurations

**Priority:** P2
**Status:** NOT STARTED
**Effort:** 2h
**Module:** `scripts/seed/`

---

### DATA-018: Seed Notification Preferences

**Priority:** P2
**Status:** NOT STARTED
**Effort:** 2h
**Module:** `scripts/seed/`

---

### DATA-019: Seed Credit System Settings

**Priority:** P2
**Status:** NOT STARTED
**Effort:** 2h
**Module:** `scripts/seed/`

---

### DATA-020: Seed Pricing Rules and Profiles

**Priority:** P2
**Status:** NOT STARTED
**Effort:** 4h
**Module:** `scripts/seed/`

---

### BE-QA-009: Implement Journal Entry Audit Trail

**Priority:** P2
**Status:** NOT STARTED
**Effort:** 8h
**Module:** `server/routers/audit.ts:532-562`

**Problem:**
`getAccountBalanceBreakdown` returns placeholder data with note "Journal entry audit trail will be available in a future update"

---

### BE-QA-010: Implement Live Catalog Brand/Price Features

**Priority:** P2
**Status:** NOT STARTED
**Effort:** 8h
**Module:** `server/services/liveCatalogService.ts:357,367`

**Problem:**

- Brand extraction returns empty array (TODO)
- Price range returns hardcoded `{ min: 0, max: 1000 }` (TODO)

---

### BE-QA-011: Implement COGS Override Statistics

**Priority:** P2
**Status:** NOT STARTED
**Effort:** 4h
**Module:** `server/services/cogsChangeIntegrationService.ts:106-118`

---

### BE-QA-012: Implement Product Recommendations

**Priority:** P2
**Status:** NOT STARTED
**Effort:** 16h
**Module:** `server/productRecommendations.ts`

---

### BE-QA-013: Implement Session Extension Validation

**Priority:** P2
**Status:** NOT STARTED
**Effort:** 2h
**Module:** `server/services/live-shopping/sessionTimeoutService.ts:382`

---

### BE-QA-014: Add Date Range Filtering to Scheduling

**Priority:** P2
**Status:** NOT STARTED
**Effort:** 2h
**Module:** `server/routers/scheduling.ts:1142`

---

### BE-QA-015: Add Feature Queries to db.ts

**Priority:** P2
**Status:** NOT STARTED
**Effort:** 4h
**Module:** `server/db.ts:129`

---

### FE-QA-004: Complete Dashboard Widgets V3 Migration

**Priority:** P2
**Status:** NOT STARTED
**Effort:** 16h
**Module:** `client/src/components/dashboard/widgets-v3/`

---

### FE-QA-005: Implement Live Shopping Session Console

**Priority:** P2
**Status:** NOT STARTED
**Effort:** 8h
**Module:** `client/src/pages/LiveShoppingPage.tsx:410`

---

### FE-QA-006: Re-enable Batch Product Relation Display

**Priority:** P2
**Status:** NOT STARTED
**Effort:** 4h
**Module:** `client/src/components/inventory/BatchDetailDrawer.tsx:465`

---

### FE-QA-007: Calculate Profitability Data

**Priority:** P2
**Status:** NOT STARTED
**Effort:** 4h
**Module:** `client/src/components/inventory/BatchDetailDrawer.tsx:891`

---

### FE-QA-008: Fix TemplateSelector TODO ID

**Priority:** P2
**Status:** NOT STARTED
**Effort:** 1h
**Module:** `client/src/components/dashboard/TemplateSelector.tsx:30`

---

### FEAT-025: Implement Recurring Orders Feature

**Priority:** P2
**Status:** NOT STARTED
**Effort:** 40h
**Module:** New feature

**Problem:**
Recurring orders (DF-067) referenced in documentation but completely missing:

- No database table
- No API endpoints
- No UI components

---

## P3 - LOW PRIORITY (Cleanup)

### INFRA-015: Consolidate Duplicate Migration Version Numbers

**Priority:** P3
**Status:** NOT STARTED
**Effort:** 4h
**Module:** `drizzle/migrations/`

**Problem:**
Multiple migrations share the same version number:

- 0001: 3 files
- 0002: 2 files
- 0003: 3 files

---

### INFRA-016: Move Non-SQL Files Out of Migrations Directory

**Priority:** P3
**Status:** NOT STARTED
**Effort:** 1h
**Module:** `drizzle/migrations/`

**Problem:**
Non-migration files in migrations directory:

- `0007_DEPLOYMENT_INSTRUCTIONS.md` → move to `/docs/deployment/`
- `0007_add_calendar_recurrence_index.test.ts` → move to `/tests/migrations/`

---

## Execution Order Recommendation

### Phase 1: Critical Security (Immediate)

1. SEC-023 - Rotate exposed credentials

### Phase 2: Stability (Week 1)

2. TS-001 - Fix TypeScript errors
3. BUG-100 - Fix failing tests

### Phase 3: Core Functionality (Week 2)

4. DATA-012 - Feature flags seeding
5. DATA-013, DATA-014, DATA-015 - Module seeding
6. BE-QA-006, BE-QA-007, BE-QA-008 - Accounting endpoints

### Phase 4: Feature Completion (Week 3+)

7. API-011 through API-015 - Missing endpoints
8. Remaining DATA tasks
9. Remaining BE-QA and FE-QA tasks

### Phase 5: Cleanup

10. INFRA-015, INFRA-016 - Migration hygiene
11. FEAT-025 - Recurring orders (if prioritized)

---

_Generated from INCOMPLETE_FEATURES_AUDIT_V2.md_
_Date: 2026-01-20_

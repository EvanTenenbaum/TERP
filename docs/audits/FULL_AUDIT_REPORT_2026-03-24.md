# TERP Full Audit Report

**Date**: 2026-03-24
**Branch**: `claude/audit-staging-swarms-H44SJ`
**Commit**: `e7f579b`
**Auditors**: 9 parallel automated swarms

---

## Pre-Flight Status

| Check      | Command      | Result                                                     |
| ---------- | ------------ | ---------------------------------------------------------- |
| TypeScript | `pnpm check` | PASS — zero type errors                                    |
| Lint       | `pnpm lint`  | PASS — zero lint errors/warnings                           |
| Tests      | `pnpm test`  | SKIP — Docker daemon not available (infra issue, not code) |
| Build      | `pnpm build` | PASS — client + server bundles built successfully          |

---

## P0 — Critical / Block Deployment

### SEC-P0-1: Unauthenticated Admin Endpoints Exposed in Production

**File**: `server/_core/simpleAuth.ts:238-309`

- `POST /api/auth/create-first-user` — Anyone can create user accounts (no check if users already exist)
- `POST /api/auth/push-schema` — Executes Drizzle schema push with ZERO authentication
- `POST /api/auth/seed` — Triggers data seeding, only gated by env var

**Impact**: Full privilege escalation; potential database destruction.

### SEC-P0-2: Unauthenticated Debug Endpoint Leaks User Context

**File**: `server/_core/index.ts:442-467`
`GET /api/debug/context` returns user ID, email, and role with no auth check and no production-disable guard.

### SEC-P0-3: Unauthenticated Health Metrics Endpoint

**File**: `server/_core/index.ts:389`
`GET /health/metrics` returns detailed runtime metrics (heap, RSS, uptime) with no auth. The tRPC-based `health.metrics` correctly requires `system:metrics` permission but this Express endpoint bypasses it.

### INV-P0-1: `getBatchesWithDetails` Does NOT Filter Soft-Deleted Batches

**File**: `server/inventoryDb.ts:846+`
The main inventory listing function never adds `isNull(batches.deletedAt)`. Soft-deleted batches appear in the enhanced inventory list, aging summary, and all downstream callers.

### INV-P0-2: `getAllBatches` Does NOT Filter Soft-Deleted Batches

**File**: `server/inventoryDb.ts:746-755`
No `isNull(batches.deletedAt)` condition. Deleted batches mixed into results.

### INV-P0-3: `formatQty` Truncates 4-Decimal Data to 2 Decimals

**File**: `server/inventoryUtils.ts:297-298`
DB stores `decimal(15,4)` but `formatQty` uses `toFixed(2)`. Called during intake, this permanently loses precision (10.1234 → "10.12"). Creates phantom shrinkage — a cannabis compliance concern.

### INV-P0-4: Intake Service Still Writes to Deprecated `vendors` Table

**File**: `server/inventoryIntakeService.ts:148-152`
Creates vendor records in deprecated table. New lots get `vendorId` set but NOT `supplierClientId`, leaving null canonical supplier reference.

### SCH-P0-1: `db.query.vendors` in Production Code

**Files**: `server/services/vendorMappingService.ts:180,228`
Active queries against deprecated `vendors` table (CI-blocked pattern).

### SCH-P0-2: Hard-coded `createdBy: 1` in Production Code

**Files**: `server/services/orderService.ts:87`, `server/_core/calendarJobs.ts:280`
Bypasses authentication, corrupts audit trails. Code comments acknowledge it's wrong.

### SCH-P0-3: `: any` Types in Server Code

**File**: `server/matchingEngineEnhanced.ts:373,391,393`
Three `: any` violations in production server code.

### SCH-P0-4: Foreign Keys Referencing Deprecated `vendors` Table

**File**: `drizzle/schema.ts` — 8 FK references to `vendors.id`

### RTR-P0-1: Missing Soft-Delete Filters on `locations` Table

**File**: `server/routers/locations.ts`
All 3 queries return deleted locations to users.

### RTR-P0-2: Missing Soft-Delete Filters on `batches` — 24+ Queries Across 8 Routers

**Routers**: orders, inventory, vipPortal, vipPortalLiveShopping, alerts, returns, client360
Deleted batches visible in order creation, VIP portal, live shopping, alerts, and returns.

### RTR-P0-3: Missing Soft-Delete Filters on `strains` Table

**File**: `server/inventoryDb.ts`
`getAllStrains()` and `getStrainById()` have zero deletedAt filtering.

### GF-P0-1: Hardcoded `createdBy: 1` in VIP Portal Order Creation

**File**: `server/services/orderService.ts:87`
`createOrderFromInterestList` has no `actorId` parameter — every VIP portal order attributed to user 1.

### GF-P0-2: Missing `FOR UPDATE` Lock on Order Confirm

**File**: `server/routers/orders.ts:530-534`
Simple `confirm` reads order without `SELECT FOR UPDATE`. Two concurrent confirms can both pass the `isDraft` check. The `OrderOrchestrator.confirmOrder()` correctly uses `.for("update")`.

### SVC-P0-1: `installmentPayments.createPlan` — No Transaction

**File**: `server/routers/installmentPayments.ts:167-222`
Creates plan + multiple installments without transaction. Partial failure = orphaned records.

### SVC-P0-2: `installmentPayments.recordPayment` — No Transaction

**File**: `server/routers/installmentPayments.ts:392-448`
Updates installment, plan totals, activates next installment without transaction.

### SVC-P0-3: `invoices.generateFromOrder` — No Transaction

**File**: `server/routers/invoices.ts:441-460`
Creates invoice, updates order, syncs client balance — all without transaction. Failure after invoice creation = orphaned invoice.

### SVC-P0-4: `orders.create` (Draft) — No Transaction

**File**: `server/routers/orders.ts:1019-1084`
Inserts order, creates line items via `Promise.all`, logs audit — all without transaction.

### TST-P0-1: Invoices Router (759 Lines) Has ZERO Tests

Core financial entity with no unit test coverage.

### TST-P0-2: Payments Router Tests Entirely SKIPPED

28 transaction rollback tests disabled (`describe.skip`). Critical financial flow completely uncovered.

### TST-P0-3: `orderAccountingService` + `orderPricingService` (~2300 Lines) Untested

GL entry creation and price calculations with no tests.

### TST-P0-4: COGS Router (519 Lines) Untested

Cost basis integrity has no validation.

### TST-P0-5: `clientLedger` Router (926 Lines) Untested

AR/AP reporting accuracy unverified.

**Total P0: 24 findings**

---

## P1 — High Priority (Fix This Week)

### Security

- **SEC-P1-1**: SQL injection vector in `salesSheetEnhancements.ts:437` — `templateId` interpolated directly into SQL string
- **SEC-P1-2**: 38 routers missing `requirePermission` guards (including `poReceiving`, `intakeReceipts`, `organizationSettings`)
- **SEC-P1-3**: Actor attribution bypasses — ~10 routers use `ctx.user.id` / `ctx.user?.id` directly instead of `getAuthenticatedUserId(ctx)` (receipts, credits, rbac-roles, todoTasks, vendorReminders, pricing, cashAudit)

### Schema

- **SCH-P1-1**: Hard deletes (`db.delete()`) in production — `calendarDb.ts:151,714`, `softDelete.ts:137`
- **SCH-P1-2**: Deprecated `vendors` table still actively used in ~15 server files
- **SCH-P1-3**: Enum first-argument mismatches in `schema-sprint5-trackd.ts:596,846`

### Inventory

- **INV-P1-1**: `inventoryMovements` router uses `ctx.user.id` instead of `getAuthenticatedUserId(ctx)` (5 mutations)
- **INV-P1-2**: `inventory.views.list/delete`, `bulk.updateStatus` use `ctx.user?.id` pattern
- **INV-P1-3**: `orderLineItemAllocations` table missing `deletedAt`
- **INV-P1-4**: `sampleAllocations` table missing `deletedAt`
- **INV-P1-5**: `batches` and `lots` tables missing `createdBy`/`updatedBy` audit columns

### Golden Flows

- **GF-P1-1**: State machine not used in simple `confirm` endpoint — ad-hoc checks instead of `orderStateMachine.validateTransition()`
- **GF-P1-2**: Dual order creation paths with different behavior (3 ways to create orders)
- **GF-P1-3**: PO receiving is just a status flip — no inventory records, no `quantityReceived` update, no cost basis
- **GF-P1-4**: PO `updateStatus` has no state machine validation — allows invalid transitions

### Services

- **SVC-P1-1**: Silent inventory clamping to 0 in shipping path — `orders.ts:2255` uses `Math.max(0, ...)` instead of throwing error, masking data corruption
- **SVC-P1-2**: `purchaseOrders.ts` uses deprecated `vendors` table
- **SVC-P1-3**: Dual order logic paths — router vs orchestrator divergence risk

### Router/API

- **RTR-P1-1**: `samples.ts` trusts client-provided actor IDs (`fulfilledBy`, `approvedBy`, `completedBy`, `confirmedBy`)
- **RTR-P1-2**: `organizationSettings.ts` — 12 mutations with no permission checks
- **RTR-P1-3**: `vendorReminders.ts` directly joins deprecated `vendors` table
- **RTR-P1-4**: `pricing.ts:503` uses `ctx.user?.id` — can write `undefined` as actor
- **RTR-P1-5**: Missing soft-delete filters on `payments`, `invoices`, `categories` in analytics/audit/returns

### Frontend

- **FE-P1-1**: Forbidden `userId` in mutation payloads — `ClientNeedsTab.tsx:133`, `ClientInterestWidget.tsx:59` send `userId: user?.id ?? 0`
- **FE-P1-2**: `useClientsData` hook exists but 11 components independently fetch `clients.list` with `limit: 1000`

### Test Coverage

- **TST-P1-1**: 66% of routers (80/121) have no direct tests
- **TST-P1-2**: 9 critical services (~4000 lines) untested (returnProcessing, clientBalanceService, marginCalculationService, etc.)
- **TST-P1-3**: No concurrent payment recording tests
- **TST-P1-4**: No golden flow for returns/refunds lifecycle
- **TST-P1-5**: No RBAC tests for VIP portal, admin, or newer financial endpoints
- **TST-P1-6**: `installmentPayments` (797 lines) and `poReceiving` (873 lines) have no tests

**Total P1: 30 findings**

---

## P2 — Medium Priority (Fix This Sprint)

### Security

- **SEC-P2-1**: Hard deletes in calendar module (`calendarDb.ts`)
- **SEC-P2-2**: CA certificate committed to git
- **SEC-P2-3**: `db.query.vendors` in vendorMappingService
- **SEC-P2-4**: Hardcoded QA password `TerpQA2026!` in 7+ files
- **SEC-P2-5**: `DEMO_MODE` grants super admin to all visitors in production
- **SEC-P2-6**: No CORS configuration
- **SEC-P2-7**: No Helmet/security headers
- **SEC-P2-8**: Weak password policy (4 chars minimum)
- **SEC-P2-9**: `getTestToken` bypasses rate limiting

### Schema

- **SCH-P2-1**: 143/236 tables missing `deletedAt` columns
- **SCH-P2-2**: Mixed column naming (101 tables with snake_case + camelCase)

### Inventory

- **INV-P2-1**: Dual COGS calculation modules with different logic
- **INV-P2-2**: `recordInventoryMovement` not wrapped in transaction
- **INV-P2-3**: `inventoryMovements.record` accepts client-provided `quantityBefore`/`quantityAfter`
- **INV-P2-4**: Floating-point arithmetic for inventory quantities (should use Decimal)
- **INV-P2-5**: `intakeReceipts` tables missing `deletedAt`

### Golden Flows

- **GF-P2-1**: `confirm` uses `withTransaction` instead of `withRetryableTransaction`
- **GF-P2-2**: Order version not incremented in simple `confirm` path
- **GF-P2-3**: Most PO mutations lack `requirePermission` middleware
- **GF-P2-4**: PO mutations lack actor attribution
- **GF-P2-5**: Inventory deduction timing inconsistency between paths
- **GF-P2-6**: `db.query.vendors` in vendorMappingService
- **GF-P2-7**: PO router imports deprecated `vendors` table

### Services

- **SVC-P2-1**: In-memory notification queue (crash = data loss)
- **SVC-P2-2**: vipPortal swallows pricing errors silently
- **SVC-P2-3**: vipPortal email failure not tracked for retry

### Router/API

- **RTR-P2-1**: 655 instances of `throw new Error()` instead of `TRPCError`
- **RTR-P2-2**: `clients.ts` and `credits.ts` use manual `ctx.user.id` checks
- **RTR-P2-3**: `invoices.updateStatus` and `markSent` have no actor attribution
- **RTR-P2-4**: `purchaseOrders.ts` — 10 mutations, 0 transactions, only 2 `getAuthenticatedUserId` calls

### Frontend

- **FE-P2-1**: 3 non-redirect components still call deprecated `trpc.vendors.*`
- **FE-P2-2**: 65 files still use vendor terminology
- **FE-P2-3**: Large monolithic page files (4 pages exceed 1300 lines, only 3 use lazy loading)
- **FE-P2-4**: Sparse ARIA labels (only 5 of 40+ pages)
- **FE-P2-5**: Minimal keyboard navigation

### Test Coverage

- **TST-P2-1**: Heavy mocking in router tests — actual SQL/permissions not tested at unit level
- **TST-P2-2**: E2E concurrency suite is shallow
- **TST-P2-3**: No max-value/overflow boundary tests
- **TST-P2-4**: No timezone/fiscal-period-boundary edge cases

**Total P2: 40 findings**

---

## P3 — Low Priority

| ID       | Finding                                                   |
| -------- | --------------------------------------------------------- |
| SCH-P3-1 | Backup files with forbidden patterns committed            |
| SCH-P3-2 | Historical destructive migrations (expected)              |
| SCH-P3-3 | 2 `: any` in client code                                  |
| INV-P3-1 | Lot code generation outside transaction (sequence gaps)   |
| INV-P3-2 | `sampleAllocations.remainingQuantity` stored vs computed  |
| INV-P3-3 | `paymentHistory` uses deprecated `vendorId`               |
| INV-P3-4 | `batchLocations` missing `version` for optimistic locking |
| GF-P3-1  | Allocation double-prevention well-implemented (positive)  |
| GF-P3-2  | Pricing flow well-structured (positive)                   |
| GF-P3-3  | Party model correctly enforced in PO creation (positive)  |
| GF-P3-4  | Auth appropriately secured (positive)                     |
| SEC-P3-1 | JWT token expiry is 30 days                               |
| SEC-P3-2 | Rate limiting only on tRPC routes, not Express endpoints  |
| SEC-P3-3 | Backup files with vulnerable patterns                     |
| SEC-P3-4 | Body parser accepts 50MB payloads                         |
| SEC-P3-5 | 1 `: any` in poReceiving.ts                               |
| SVC-P3-1 | Penny-rounding drift in adjustment distribution           |
| SVC-P3-2 | `console.error` instead of structured logger              |
| SVC-P3-3 | Plain `Error` vs `TRPCError` in services                  |
| SVC-P3-4 | Vendors table in seed data                                |
| SVC-P3-5 | No dead letter queue for notifications                    |
| RTR-P3-1 | `dataAugmentHttp.ts` orphaned (dead code)                 |
| RTR-P3-2 | 7 routers expose both `list` and `getAll`                 |
| RTR-P3-3 | Inconsistent pagination patterns                          |
| FE-P3-1  | 2 `: any` in frontend (eslint-disabled)                   |
| FE-P3-2  | ~28 pages lack skeleton/spinner loading states            |
| FE-P3-3  | VendorSupplyPage naming                                   |
| TST-P3-1 | ~8% weak assertions (toBeDefined, toBeTruthy)             |
| TST-P3-2 | 3 skipped tests in ordersDb-error-propagation             |

**Total P3: 29 findings**

---

## Audit Summaries

### Schema Audit

4 P0, 4 P1, 2 P2, 3 P3. Core issues: deprecated `vendors` table still referenced by FKs and production code, hardcoded `createdBy: 1`, `: any` types, 143 tables missing `deletedAt`.

### Inventory Audit

4 P0, 5 P1, 5 P2, 4 P3. Core issues: soft-deleted batches appearing in main inventory views, `formatQty` truncating precision during intake, intake service writing to deprecated vendors table, actor attribution bypasses.

### Golden Flows Audit

2 P0, 4 P1, 7 P2, 4 P3. Core issues: hardcoded actor in VIP orders, race condition on order confirm, PO receiving is hollow (status flip only), state machine bypass in simple confirm path.

### Security Audit

3 P0, 3 P1, 9 P2, 5 P3. Core issues: unauthenticated admin endpoints (create-first-user, push-schema), SQL injection vector, 38 routers missing permission guards, DEMO_MODE grants super admin.

### Router & API Audit

3 P0, 6 P1, 4 P2, 3 P3. Core issues: widespread missing soft-delete filters (locations, batches, strains), client-provided actor IDs in samples router, 31 routers lack RBAC.

### Frontend Audit

0 P0, 2 P1, 5 P2, 3 P3. Generally solid — good error boundaries, tRPC usage, no direct fetch calls. Issues: forbidden `userId` in 2 mutation payloads, 11 components duplicating client list fetches.

### Services & Business Logic Audit

4 P0, 3 P1, 5 P2, 5 P3. Core issues: 4 critical multi-table mutations without transactions, silent inventory clamping masking corruption, dual order logic paths.

### Test Coverage Audit

5 P0, 6 P1, 4 P2, 2 P3. Core issues: invoices/payments/COGS/clientLedger routers untested, 66% of routers lack tests, critical services (~4000 lines) untested, payments tests skipped.

---

## Top 10 Recommendations (Priority Order)

1. **Lock down unauthenticated endpoints** — Add auth guards to `/api/auth/create-first-user`, `/api/auth/push-schema`, `/api/auth/seed`, `/api/debug/context`, `/health/metrics`
2. **Add soft-delete filters** — Audit all queries against `batches`, `locations`, `strains`, `invoices`, `payments` for missing `isNull(deletedAt)`
3. **Wrap multi-table mutations in transactions** — `installmentPayments.createPlan`, `installmentPayments.recordPayment`, `invoices.generateFromOrder`, `orders.create`
4. **Fix actor attribution** — Replace all `ctx.user.id` / `ctx.user?.id` with `getAuthenticatedUserId(ctx)`, remove client-provided actor fields from `samples.ts`
5. **Fix `formatQty` precision** — Change `toFixed(2)` to `toFixed(4)` to match `decimal(15,4)` DB columns
6. **Add `FOR UPDATE` lock** to simple order confirm path (`orders.ts:530`)
7. **Add RBAC permission checks** to the 31+ routers currently missing them (prioritize `organizationSettings`, `poReceiving`, `intakeReceipts`)
8. **Fix SQL injection** in `salesSheetEnhancements.ts:437` — parameterize `templateId`
9. **Complete PO receiving** — Implement actual receiving logic (create lots/batches, update quantities, record movements)
10. **Enable critical test suites** — Unskip payments tests, add tests for invoices/COGS/clientLedger routers

---

## Statistics

| Metric                       | Value                               |
| ---------------------------- | ----------------------------------- |
| Total Findings               | **123**                             |
| P0 (Critical)                | 24                                  |
| P1 (High)                    | 30                                  |
| P2 (Medium)                  | 40                                  |
| P3 (Low)                     | 29                                  |
| Routers Audited              | 117                                 |
| Total Procedures             | ~1,336 (683 mutations, 766 queries) |
| Test Files                   | ~300+                               |
| Router Test Coverage         | 34% (41/121)                        |
| Tables Missing `deletedAt`   | 143/236 (61%)                       |
| Routers Missing RBAC         | 31+                                 |
| Actor Attribution Violations | ~15 routers                         |

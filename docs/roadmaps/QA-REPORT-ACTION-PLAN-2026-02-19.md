# QA Report Action Plan — 2026-02-19

**Source:** Exhaustive E2E Test Report (183 tests + 294 invariants)
**Current Pass Rate:** 80.3% (147/183)
**Target Pass Rate:** 98%+
**Mode:** STRICT (backend API mutations, accounting integration)
**Created:** 2026-02-19

---

## Executive Summary

Exhaustive testing revealed 12 bugs across 3 categories. The frontend is production-ready (all 17 pages, all dialogs, all validations working). All 294 data integrity invariants pass. The failures are concentrated in **backend API mutations** — primarily SQL INSERT parameter mismatches and missing seed data. Fixing 4 P0 blockers will recover ~15% pass rate; fixing all 12 issues targets 98%+.

### Root Cause Analysis Summary

| Root Cause Category | Bugs | Impact |
|---|---|---|
| **SQL INSERT / Drizzle column mismatch** | BUG-002, BUG-005, BUG-006, BUG-007 | PO, payables, samples, storage creation broken |
| **Missing seed data in production DB** | BUG-004, BUG-009, BUG-010 | Chart of accounts, QA users, invoice test data |
| **Transaction failure (GL entries)** | BUG-003 | Payment recording rolls back |
| **Generic error masking** | BUG-001 | Intake failure hidden behind "unexpected error" |
| **Tags table schema mismatch** | BUG-008 | Tags SELECT query fails |
| **Business logic inconsistency** | BUG-011, BUG-012 | Quotes validate inventory, error handling gaps |

---

## Linear Issues to Create

### P0 — Critical Blockers (Wave 11A)

#### TER-NEW-001: Direct Intake API returns generic error — investigate and fix root cause
- **Priority:** Urgent
- **Labels:** `bug`, `P0`, `golden-flow`
- **Estimate:** 8h
- **Description:** All `inventory.intake` calls fail with "An unexpected error occurred" (Request ID logged). The `processIntake()` service (`server/inventoryIntakeService.ts:90-380`) throws a raw `Error` at line 376 which is caught by `server/_core/errors.ts:326` and wrapped generically. The batch INSERT at lines 225-261 correctly omits `strainId` (SCHEMA-016), but the transaction may fail at: (a) `findOrCreate` for vendor/brand/product, (b) `batchLocations` insert, (c) `productImages` insert, or (d) consignment payable creation. Need to check production logs for the actual underlying error and fix it. Also improve error propagation so the real cause surfaces.
- **Files:** `server/inventoryIntakeService.ts`, `server/_core/errors.ts`, `server/routers/inventory.ts`
- **Affected Tests:** UJ-001, UJ-003, SM-BATCH-000, CHAIN-001, CHAIN-004-006, CHAIN-008, FUZZ-014 (9 tests)

#### TER-NEW-002: Purchase Order line items INSERT fails — SQL parameter mismatch
- **Priority:** Urgent
- **Labels:** `bug`, `P0`, `golden-flow`
- **Estimate:** 4h
- **Description:** `purchaseOrders.create` at `server/routers/purchaseOrders.ts:273-281` provides only 5 values (purchaseOrderId, productId, quantityOrdered, unitCost, totalCost) for the `purchaseOrderItems` INSERT, but the schema (`drizzle/schema.ts:326-376`) defines 12 columns. Drizzle generates an INSERT with all columns including `quantityReceived`, `notes`, `supplierClientId`, and `deletedAt` which have no explicit defaults in the Drizzle schema definition. Fix: explicitly set nullable columns to `null` and provide defaults for `quantityReceived: "0"`. Compare with the working `addItem` mutation at line 533.
- **Files:** `server/routers/purchaseOrders.ts:273-281`, `drizzle/schema.ts:326-376`
- **Affected Tests:** UJ-004, UJ-005, UJ-006 (3 tests)

#### TER-NEW-003: Payment recording fails — transaction rollback during GL entry creation
- **Priority:** Urgent
- **Labels:** `bug`, `P0`, `golden-flow`
- **Estimate:** 4h
- **Description:** `payments.recordPayment` (`server/routers/payments.ts:314-419`) transaction rolls back when creating GL entries. Account resolution at lines 306-310 calls `getAccountIdByName()` for Cash and AR accounts — if either is missing from chart of accounts (not seeded), it throws `NOT_FOUND`. If accounts exist but `ledgerEntries` INSERT fails (e.g., missing required column, `fiscalPeriodId` returning null from `getFiscalPeriodIdOrDefault`), the whole transaction rolls back and line 437 returns generic "Payment recording failed". Fix: (1) verify chart of accounts is seeded, (2) add pre-transaction validation for all required accounts, (3) improve error message to include actual failure reason.
- **Files:** `server/routers/payments.ts:300-440`, `server/_core/accountLookup.ts`, `server/_core/fiscalPeriod.ts`
- **Affected Tests:** UJ-014, UJ-015, UJ-017 (3 tests)

#### TER-NEW-004: Order status PACKED→SHIPPED fails — missing "Sales Revenue" account
- **Priority:** Urgent
- **Labels:** `bug`, `P0`, `golden-flow`, `data-seeding`
- **Estimate:** 4h
- **Description:** Order creation calls `createInvoiceWithGL()` (`server/services/orderOrchestrator.ts:1288-1290`) which looks up "Sales Revenue" account via `getAccountIdByName(ACCOUNT_NAMES.SALES_REVENUE)`. If account doesn't exist in DB, throws NOT_FOUND and order is never created — so it can never reach PACKED or SHIPPED. The account IS defined in `seedDefaults.ts:514` as account #4000 but either wasn't seeded or was deleted. Fix: (1) Run `seedDefaults` to ensure chart of accounts exists, (2) add defensive check that creates missing accounts if not found, (3) verify all 7 ACCOUNT_NAMES constants exist in prod DB.
- **Files:** `server/services/orderOrchestrator.ts:1274-1350`, `server/services/seedDefaults.ts:511-532`, `server/_core/accountLookup.ts`
- **Affected Tests:** UJ-010 (1 test, but blocks entire order fulfillment)

---

### P1 — High Priority (Wave 11B)

#### TER-NEW-005: Vendor payables INSERT fails — parameter count mismatch
- **Priority:** High
- **Labels:** `bug`, `P1`
- **Estimate:** 4h
- **Description:** `payablesService.createPayable()` (`server/services/payablesService.ts:122-138`) inserts 12 explicit values into `vendor_payables` table which has 28 schema columns. Drizzle generates full INSERT but nullable columns without explicit `.default(null)` in schema cause parameter mismatch. Fix: add explicit `null` values for `dueDate`, `paidDate`, `inventoryZeroAt`, `notificationSentAt`, `notes` in the INSERT, or add `.default(sql`null`)` to schema definition.
- **Files:** `server/services/payablesService.ts:122-138`, `drizzle/schema.ts` (vendor_payables definition)
- **Affected Tests:** CHAIN-009

#### TER-NEW-006: Sample requests INSERT fails — massive parameter mismatch
- **Priority:** High
- **Labels:** `bug`, `P1`
- **Estimate:** 4h
- **Description:** `samplesDb.ts:45-52` provides only 6 values for `sampleRequests` INSERT but schema defines 36 columns. Many columns are nullable (return workflow fields, vendor return fields, etc.) but Drizzle may not handle the implicit NULL for all of them. Fix: explicitly set all nullable groups to `null` in the INSERT, or audit the schema to ensure all optional columns have proper Drizzle defaults.
- **Files:** `server/samplesDb.ts:45-52`, `drizzle/schema.ts:3539-3598`
- **Affected Tests:** CHAIN-010

#### TER-NEW-007: QA test accounts missing — blocks RBAC testing
- **Priority:** High
- **Labels:** `bug`, `P1`, `data-seeding`
- **Estimate:** 4h
- **Description:** Only `qa.superadmin@terp.test` works. The seeding script (`scripts/seed-qa-users.ts:33-64`) defines 6 accounts but with email naming that doesn't match CLAUDE.md protocol: `qa.sales@` (should be `qa.salesmanager@`), `qa.admin@` (should be `qa.superadmin@`). Also missing `qa.salesrep@terp.test`. Fix: (1) Align email addresses in seed script to match CLAUDE.md, (2) Add missing `qa.salesrep@terp.test` account with "Customer Service" role, (3) Run seeder against production DB via DigitalOcean job component.
- **Files:** `scripts/seed-qa-users.ts:33-64`, CLAUDE.md authentication section
- **Affected Tests:** AUTH-admin, AUTH-salesmanager, AUTH-accounting, AUTH-fulfillment, AUTH-auditor (5 tests)

#### TER-NEW-008: Invoice getById returns 404
- **Priority:** High
- **Labels:** `bug`, `P1`
- **Estimate:** 4h
- **Description:** `invoices.getById` (`server/routers/invoices.ts:191-241`) returns 404. The query itself looks correct (joins with clients via `invoices.customerId`). Likely cause: (a) test tried to fetch an invoice ID that doesn't exist, or (b) the `customerId` JOIN fails because of the deprecated naming convention (`customerId` vs `clientId` party model migration). Investigate whether this is a data issue (no test invoices) or a query issue.
- **Files:** `server/routers/invoices.ts:191-241`, `drizzle/schema.ts:1132`
- **Affected Tests:** GF-004-TC-014

---

### P2 — Medium Priority (Wave 11C)

#### TER-NEW-009: Storage zones INSERT fails — parameter mismatch
- **Priority:** Medium
- **Labels:** `bug`, `P2`
- **Estimate:** 2h
- **Description:** `server/routers/storage.ts:142-155` provides 12 values for `storage_zones` INSERT but schema has 24 columns. Missing: `currentCapacity`, `isActive` (should be explicitly `true`), `metadata`. Fix: add explicit values for missing columns.
- **Files:** `server/routers/storage.ts:142-155`
- **Affected Tests:** CHAIN-011

#### TER-NEW-010: Tags table query fails
- **Priority:** Medium
- **Labels:** `bug`, `P2`
- **Estimate:** 2h
- **Description:** Tags SELECT query (`server/routers/tags.ts:52-77`) fails. The LIKE clause searches on `tags.description` which is nullable — MySQL returns NULL (not matching) for `LIKE` on NULL values. But the real issue may be column casing mismatch (`standardizedName` vs `standardized_name`, `createdAt` vs `created_at`). Investigate actual DB column names vs Drizzle schema definition.
- **Files:** `server/routers/tags.ts:52-77`, `drizzle/schema.ts:521-539`
- **Affected Tests:** CHAIN-012

#### TER-NEW-011: Quotes should not validate inventory availability
- **Priority:** Medium
- **Labels:** `enhancement`, `P2`
- **Estimate:** 4h
- **Description:** Creating a QUOTE order fails with "Insufficient available inventory" (`UJ-008`). Quotes are commitments to sell at a price, not inventory reservations. The order creation logic should skip inventory validation for QUOTE type orders. Fix: add `orderType !== "QUOTE"` guard around inventory availability check in order creation flow.
- **Files:** `server/services/orderOrchestrator.ts` (order creation validation)
- **Affected Tests:** UJ-008

#### TER-NEW-012: Order creation error handling — raw validation error
- **Priority:** Low
- **Labels:** `enhancement`, `P2`
- **Estimate:** 2h
- **Description:** `CHAIN-002` shows "Uncaught: Invalid input: expected object" — a Zod validation error not properly caught and formatted. The order creation endpoint should wrap Zod errors in user-friendly TRPCError responses.
- **Files:** `server/routers/orders.ts` (create mutation error handling)
- **Affected Tests:** CHAIN-002

---

## Execution Plan

### Wave 11A: P0 Critical Blockers (STRICT Mode)

**Goal:** Fix 4 critical blockers, recover from 80.3% → ~95% pass rate
**Dependency:** BUG-001 unblocks 9 tests, BUG-002 unblocks 3, BUG-003 unblocks 3, BUG-004 unblocks 1

| Step | Task | File | Change | Est |
|------|------|------|--------|-----|
| 1.1 | Check prod logs for intake error | — | Identify actual exception behind generic error | 15m |
| 1.2 | Fix intake API root cause | `server/inventoryIntakeService.ts` | Fix whatever INSERT/findOrCreate is failing | 30m |
| 1.3 | Improve intake error propagation | `server/inventoryIntakeService.ts:374-378` | Propagate TRPCError instead of raw Error | 10m |
| 1.4 | Fix PO line items INSERT | `server/routers/purchaseOrders.ts:273-281` | Add explicit null/default values for missing columns | 15m |
| 1.5 | Fix payment transaction | `server/routers/payments.ts:300-440` | Add pre-transaction account validation, improve error message | 20m |
| 1.6 | Verify chart of accounts seeded | `server/services/seedDefaults.ts` | Ensure all 7 ACCOUNT_NAMES exist, add defensive seeding | 15m |
| 1.7 | Run verification suite | — | `pnpm check && pnpm lint && pnpm test && pnpm build` | 10m |

**Subtotal:** ~2h active work

### Wave 11B: P1 High Priority (STRICT Mode)

**Goal:** Fix 4 high-priority bugs, reach ~98% pass rate
**Depends on:** Wave 11A committed

| Step | Task | File | Change | Est |
|------|------|------|--------|-----|
| 2.1 | Fix vendor payables INSERT | `server/services/payablesService.ts:122-138` | Add explicit nulls for nullable columns | 15m |
| 2.2 | Fix sample requests INSERT | `server/samplesDb.ts:45-52` | Add explicit nulls for 30 nullable columns | 15m |
| 2.3 | Fix QA user seed script | `scripts/seed-qa-users.ts:33-64` | Align emails to CLAUDE.md, add salesrep account | 15m |
| 2.4 | Investigate invoice getById 404 | `server/routers/invoices.ts:191-241` | Fix query or seed test data | 20m |
| 2.5 | Run verification suite | — | `pnpm check && pnpm lint && pnpm test && pnpm build` | 10m |

**Subtotal:** ~1.5h active work

### Wave 11C: P2 Medium Priority (SAFE Mode)

**Goal:** Fix remaining 4 issues, polish to ~100%
**Depends on:** Wave 11B committed

| Step | Task | File | Change | Est |
|------|------|------|--------|-----|
| 3.1 | Fix storage zones INSERT | `server/routers/storage.ts:142-155` | Add isActive, currentCapacity, metadata | 10m |
| 3.2 | Fix tags table query | `server/routers/tags.ts:52-77` | Fix column casing, handle NULL in LIKE | 15m |
| 3.3 | Skip inventory validation for quotes | `server/services/orderOrchestrator.ts` | Add orderType guard | 15m |
| 3.4 | Improve order creation error handling | `server/routers/orders.ts` | Wrap Zod errors properly | 10m |
| 3.5 | Run verification suite | — | `pnpm check && pnpm lint && pnpm test && pnpm build` | 10m |

**Subtotal:** ~1h active work

---

## Estimation Summary

```
ESTIMATION SUMMARY

Wave 11A (P0 Blockers):
  1. Investigate intake logs                    - 15 min
  2. Fix intake root cause (~50 LOC)            - 30 min
  3. Improve intake error propagation (~10 LOC) - 10 min
  4. Fix PO items INSERT (~15 LOC)              - 15 min
  5. Fix payment transaction (~20 LOC)          - 20 min
  6. Verify/fix chart of accounts seeding       - 15 min
  7. Run verification                           - 10 min
  Subtotal: 115 min (~2h)

Wave 11B (P1 High):
  1. Fix vendor payables INSERT (~10 LOC)       - 15 min
  2. Fix sample requests INSERT (~15 LOC)       - 15 min
  3. Fix QA user seed script (~20 LOC)          - 15 min
  4. Investigate/fix invoice getById            - 20 min
  5. Run verification                           - 10 min
  Subtotal: 75 min (~1.5h)

Wave 11C (P2 Medium):
  1. Fix storage zones INSERT (~5 LOC)          - 10 min
  2. Fix tags query (~10 LOC)                   - 15 min
  3. Add quote inventory skip (~5 LOC)          - 15 min
  4. Improve order error handling (~10 LOC)     - 10 min
  5. Run verification                           - 10 min
  Subtotal: 60 min (~1h)

TOTAL: 250 min (~4.2h)
Roadmap Estimate: 8h (includes buffer for unknowns, cascading failures)
```

---

## Verification Checklist

After each wave:

- [ ] `pnpm check` — TypeScript clean
- [ ] `pnpm lint` — ESLint clean
- [ ] `pnpm test` — All unit tests pass
- [ ] `pnpm build` — Build succeeds
- [ ] Deploy to production
- [ ] Re-run E2E test suite
- [ ] Verify pass rate improvement matches expectations

### Expected Pass Rate Progression

| After Wave | Expected Pass Rate | Tests Fixed |
|---|---|---|
| Wave 11A | ~95% | +16 tests (9 intake cascade + 3 PO + 3 payment + 1 order status) |
| Wave 11B | ~98% | +7 tests (1 payable + 1 sample + 5 QA auth) |
| Wave 11C | ~100% | +4 tests (1 storage + 1 tags + 1 quote + 1 error handling) |

---

## Rollback Plan

Each wave is independently deployable. If any wave introduces regressions:

1. `git revert <wave-commit-hash>`
2. `git push origin main`
3. Monitor deployment via `./scripts/watch-deploy.sh`
4. Document in `docs/incidents/`

---

## Key Insight: Pattern of INSERT Mismatches

5 of the 12 bugs (BUG-002, BUG-005, BUG-006, BUG-007, BUG-009) share the same root cause pattern: **Drizzle ORM generates INSERT statements for ALL defined columns, but the application code only provides values for a subset.** Columns that are nullable but don't have an explicit `.default(null)` in the Drizzle schema cause parameter mismatches.

**Systemic fix to consider:** Audit all `db.insert().values()` calls and ensure every nullable column without a database DEFAULT is explicitly set to `null`. Or add `.default(sql`null`)` to all nullable columns in the schema.

---

*Action plan generated from QA Report v3-deep (2026-02-19)*
*12 Linear issues identified across 3 priority tiers*
*3 waves structured for incremental pass rate recovery*

# TERP Audit Bug Execution Roadmap

**Source**: `docs/audits/FULL_AUDIT_REPORT_2026-03-24.md`
**Created**: 2026-03-25
**Total Tasks**: 56 atomic tasks across 8 waves
**Findings Addressed**: 123 (24 P0 + 30 P1 + 40 P2 + 29 P3)

---

## Execution Philosophy

- **Waves are sequential** — each wave's prerequisites must pass before the next starts
- **Tasks within a wave are parallel** — independent agents can execute concurrently
- **Every task is atomic** — one PR-ready commit, passes `pnpm check && pnpm lint && pnpm build`
- **RED autonomy items** (auth, accounting, migrations) require Evan's approval before merge
- **Test tasks** run after their code-fix counterparts ship

---

## Wave 0: Emergency Security Lockdown (RED — Requires Evan Approval)

> **Gate**: All P0 security vulnerabilities. Deploy before any feature work.
> **Parallelism**: 4 agents

| Task         | Findings | File(s)                                        | Change                                                                                                                                                                               | Autonomy |
| ------------ | -------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- |
| **BUG-W0-1** | SEC-P0-1 | `server/_core/simpleAuth.ts:238-309`           | Add auth guard to `/api/auth/create-first-user` (check if users exist), require admin auth on `/api/auth/push-schema` and `/api/auth/seed`, disable all 3 when `NODE_ENV=production` | RED      |
| **BUG-W0-2** | SEC-P0-2 | `server/_core/index.ts:442-467`                | Wrap `/api/debug/context` in `if (process.env.NODE_ENV !== 'production')` guard + require auth                                                                                       | RED      |
| **BUG-W0-3** | SEC-P0-3 | `server/_core/index.ts:389`                    | Add auth middleware to `/health/metrics` Express route (match the tRPC `system:metrics` permission), keep `/health` unauthenticated                                                  | RED      |
| **BUG-W0-4** | SEC-P1-1 | `server/routers/salesSheetEnhancements.ts:437` | Parameterize `templateId` in SQL query — replace string interpolation with prepared statement parameter                                                                              | RED      |

**Verification**: `pnpm check && pnpm lint && pnpm build` + manual curl tests against staging endpoints

---

## Wave 1: Data Integrity — Soft-Delete Filters (STRICT)

> **Gate**: Deleted records no longer leak to users or downstream logic.
> **Parallelism**: 5 agents

| Task         | Findings           | File(s)                                                                                                                           | Change                                                                                                      |
| ------------ | ------------------ | --------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| **BUG-W1-1** | INV-P0-1, INV-P0-2 | `server/inventoryDb.ts:746,846`                                                                                                   | Add `isNull(batches.deletedAt)` to `getAllBatches` WHERE clause and `getBatchesWithDetails` WHERE clause    |
| **BUG-W1-2** | RTR-P0-1           | `server/routers/locations.ts`                                                                                                     | Add `isNull(locations.deletedAt)` to all 3 query procedures (`list`, `getAll`, `getById`)                   |
| **BUG-W1-3** | RTR-P0-2           | `server/routers/orders.ts`, `inventory.ts`, `vipPortal.ts`, `vipPortalLiveShopping.ts`, `alerts.ts`, `returns.ts`, `client360.ts` | Add `isNull(batches.deletedAt)` to all 24+ batch queries across 8 routers. Audit each JOIN/subquery.        |
| **BUG-W1-4** | RTR-P0-3           | `server/inventoryDb.ts`                                                                                                           | Add `isNull(strains.deletedAt)` to `getAllStrains()` and `getStrainById()`                                  |
| **BUG-W1-5** | RTR-P1-5           | `server/routers/analytics.ts`, `audit.ts`, `returns.ts`, `invoices.ts`, `productCategories.ts`                                    | Add `isNull(deletedAt)` filters for `payments`, `invoices`, `categories` in analytics/audit/returns queries |

**Verification**: `pnpm check && pnpm lint && pnpm build` + query result comparison (count before/after should only decrease)

---

## Wave 2: Transaction Safety & Race Conditions (RED)

> **Gate**: All multi-table mutations are atomic. No race conditions on critical paths.
> **Parallelism**: 5 agents

| Task         | Findings | File(s)                                         | Change                                                                                                                 |
| ------------ | -------- | ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **BUG-W2-1** | SVC-P0-1 | `server/routers/installmentPayments.ts:167-222` | Wrap `createPlan` in `db.transaction()` — plan insert + all installment inserts in one tx                              |
| **BUG-W2-2** | SVC-P0-2 | `server/routers/installmentPayments.ts:392-448` | Wrap `recordPayment` in `db.transaction()` — installment update + plan totals + next activation in one tx              |
| **BUG-W2-3** | SVC-P0-3 | `server/routers/invoices.ts:441-460`            | Wrap `generateFromOrder` in `db.transaction()` — invoice insert + order update + balance sync in one tx                |
| **BUG-W2-4** | SVC-P0-4 | `server/routers/orders.ts:1019-1084`            | Wrap `create` (draft) in `db.transaction()` — order insert + line items + audit log in one tx                          |
| **BUG-W2-5** | GF-P0-2  | `server/routers/orders.ts:530-534`              | Add `.for("update")` to the order SELECT in the simple `confirm` endpoint, matching `OrderOrchestrator.confirmOrder()` |

**Verification**: `pnpm check && pnpm lint && pnpm build` + unit tests for transaction rollback on simulated failure

---

## Wave 3: Actor Attribution & Forbidden Patterns (STRICT)

> **Gate**: All mutations use `getAuthenticatedUserId(ctx)`. No client-provided actors. No hardcoded IDs.
> **Parallelism**: 6 agents

| Task         | Findings                               | File(s)                                                                                          | Change                                                                                                                                                                         |
| ------------ | -------------------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **BUG-W3-1** | SCH-P0-2, GF-P0-1                      | `server/services/orderService.ts:87`, `server/_core/calendarJobs.ts:280`                         | Replace `createdBy: 1` with proper actor propagation. Add `actorId` parameter to `createOrderFromInterestList`. For calendarJobs, use system actor or service account pattern. |
| **BUG-W3-2** | RTR-P1-1                               | `server/routers/samples.ts`                                                                      | Remove `fulfilledBy`, `approvedBy`, `completedBy`, `confirmedBy` from input schemas. Derive all actor IDs from `getAuthenticatedUserId(ctx)`.                                  |
| **BUG-W3-3** | RTR-P1-4, SEC-P1-3 (pricing)           | `server/routers/pricing.ts:503`                                                                  | Replace `ctx.user?.id` with `getAuthenticatedUserId(ctx)` in all mutations                                                                                                     |
| **BUG-W3-4** | SEC-P1-3 (batch 1)                     | `server/routers/receipts.ts`, `server/routers/credits.ts`, `server/routers/rbacRoles.ts`         | Replace `ctx.user.id` / `ctx.user?.id` with `getAuthenticatedUserId(ctx)` in all mutations                                                                                     |
| **BUG-W3-5** | INV-P1-1, INV-P1-2, SEC-P1-3 (batch 2) | `server/routers/inventoryMovements.ts`, `server/routers/inventory.ts` (views/bulk)               | Replace `ctx.user.id` / `ctx.user?.id` with `getAuthenticatedUserId(ctx)` in all 7+ mutations                                                                                  |
| **BUG-W3-6** | SEC-P1-3 (batch 3), RTR-P2-2, RTR-P2-3 | `server/routers/todoTasks.ts`, `vendorReminders.ts`, `cashAudit.ts`, `clients.ts`, `invoices.ts` | Replace manual `ctx.user.id` checks with `getAuthenticatedUserId(ctx)`. Add actor to `invoices.updateStatus` and `markSent`.                                                   |

**Verification**: `pnpm check && pnpm lint && pnpm build` + `grep -r "ctx.user?.id\|ctx.user.id" server/routers/` should return zero hits (excluding type definitions)

---

## Wave 4: Deprecated Vendors Eradication & Schema Fixes (STRICT)

> **Gate**: No production code queries `vendors` table. All forbidden patterns resolved.
> **Parallelism**: 5 agents

| Task         | Findings           | File(s)                                                                                | Change                                                                                                                 |
| ------------ | ------------------ | -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **BUG-W4-1** | INV-P0-4           | `server/inventoryIntakeService.ts:148-152`                                             | Replace vendor record creation with `clients` table lookup/creation (`isSeller=true`). Set `supplierClientId` on lots. |
| **BUG-W4-2** | SCH-P0-1, RTR-P1-3 | `server/services/vendorMappingService.ts:180,228`, `server/routers/vendorReminders.ts` | Replace `db.query.vendors` with `clients` table queries (filter `isSeller=true`). Update vendorReminders JOIN.         |
| **BUG-W4-3** | SVC-P1-2, GF-P2-7  | `server/routers/purchaseOrders.ts:342`                                                 | Replace `from(vendors)` fallback lookup with `clients` query (`isSeller=true`). Remove vendors import.                 |
| **BUG-W4-4** | SCH-P0-3           | `server/matchingEngineEnhanced.ts:373,391,393`                                         | Replace 3 `: any` types with proper type definitions or `unknown`                                                      |
| **BUG-W4-5** | INV-P0-3           | `server/inventoryUtils.ts:297-298`                                                     | Change `formatQty` from `toFixed(2)` to `toFixed(4)` to match `decimal(15,4)` DB column precision                      |

**Verification**: `pnpm check && pnpm lint && pnpm build` + `grep -r "db.query.vendors\|from(vendors)" server/ --include="*.ts"` returns zero hits (excluding vendors.ts shim)

---

## Wave 5: RBAC Hardening & Permission Guards (STRICT)

> **Gate**: All state-changing endpoints require appropriate permissions.
> **Parallelism**: 5 agents (grouped by domain)

| Task         | Findings                   | File(s)                                                                      | Change                                                                                                         |
| ------------ | -------------------------- | ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| **BUG-W5-1** | RTR-P1-2                   | `server/routers/organizationSettings.ts`                                     | Add `requirePermission('organization:manage')` middleware to all 12 mutations                                  |
| **BUG-W5-2** | SEC-P1-2 (warehouse)       | `server/routers/pickPack.ts`, `poReceiving.ts`, `intakeReceipts.ts`          | Add appropriate `requirePermission` middleware (`warehouse:manage`, `inventory:receive`, `inventory:intake`)   |
| **BUG-W5-3** | SEC-P1-2 (batch 1)         | `server/routers/calendarsManagement.ts`, `calendarInvitations.ts`, `tags.ts` | Add `requirePermission` guards to all mutations                                                                |
| **BUG-W5-4** | SEC-P1-2 (batch 2)         | `server/routers/vipPortal.ts`, `vipPortalLiveShopping.ts`                    | Add permission guards for VIP portal mutations                                                                 |
| **BUG-W5-5** | GF-P2-3, GF-P2-4, RTR-P2-4 | `server/routers/purchaseOrders.ts`                                           | Add `requirePermission` to all 10 mutations + add `getAuthenticatedUserId(ctx)` to all actor-attributed fields |

**Verification**: `pnpm check && pnpm lint && pnpm build` + grep for routers with `protectedProcedure` but no `requirePermission`

---

## Wave 6: Business Logic & Error Handling (STRICT)

> **Gate**: State machines enforced, errors properly typed, inventory math safe.
> **Parallelism**: 7 agents

| Task         | Findings                  | File(s)                                                                       | Change                                                                                                                                       |
| ------------ | ------------------------- | ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **BUG-W6-1** | GF-P1-1, GF-P2-1, GF-P2-2 | `server/routers/orders.ts:530+`                                               | Refactor simple `confirm` to use `orderStateMachine.validateTransition()`, use `withRetryableTransaction`, increment order version           |
| **BUG-W6-2** | GF-P1-4                   | `server/routers/purchaseOrders.ts`                                            | Add PO state machine validation to `updateStatus` — define valid transitions, reject invalid ones                                            |
| **BUG-W6-3** | SVC-P1-1                  | `server/routers/orders.ts:2255`                                               | Replace `Math.max(0, ...)` clamping with explicit error throw when inventory goes negative. Add descriptive error message for investigation. |
| **BUG-W6-4** | SCH-P1-1, SEC-P2-1        | `server/calendarDb.ts:151,714`                                                | Replace `db.delete()` with soft-delete (`SET deletedAt = NOW()`) for calendar entries and invitations                                        |
| **BUG-W6-5** | FE-P1-1                   | `client/src/components/ClientNeedsTab.tsx:133`, `ClientInterestWidget.tsx:59` | Remove `userId: user?.id ?? 0` from mutation payloads. Server derives actor from ctx.                                                        |
| **BUG-W6-6** | SCH-P1-3                  | `server/db/schema/schema-sprint5-trackd.ts:596,846`                           | Fix `mysqlEnum` first arguments to match DB column names                                                                                     |
| **BUG-W6-7** | INV-P2-3                  | `server/routers/inventoryMovements.ts`                                        | Remove `quantityBefore`/`quantityAfter` from input schema. Compute server-side from current DB state.                                        |

**Verification**: `pnpm check && pnpm lint && pnpm build` + targeted unit tests for state machine transitions and inventory error paths

---

## Wave 7: Security Hardening & Hygiene (STRICT)

> **Gate**: Production security posture hardened. Weak patterns eliminated.
> **Parallelism**: 5 agents

| Task         | Findings           | File(s)                                  | Change                                                                                                                         |
| ------------ | ------------------ | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| **BUG-W7-1** | SEC-P2-5           | `server/_core/simpleAuth.ts` (DEMO_MODE) | Ensure `DEMO_MODE` is disabled in production (`NODE_ENV=production`). Add runtime guard that throws if DEMO_MODE + production. |
| **BUG-W7-2** | SEC-P2-6, SEC-P2-7 | `server/_core/index.ts`                  | Add CORS configuration (whitelist staging + prod origins). Add Helmet middleware for security headers.                         |
| **BUG-W7-3** | SEC-P2-8           | `server/_core/simpleAuth.ts`             | Increase minimum password length from 4 to 8 characters. Add basic complexity requirement.                                     |
| **BUG-W7-4** | SEC-P3-2           | `server/_core/index.ts`                  | Extend rate limiting to Express routes (auth endpoints, health/metrics) — not just tRPC                                        |
| **BUG-W7-5** | RTR-P3-1           | `server/routers/dataAugmentHttp.ts`      | Delete orphaned router file (dead code, never registered in appRouter)                                                         |

**Verification**: `pnpm check && pnpm lint && pnpm build` + curl test CORS headers, Helmet headers, password rejection

---

## Wave 8: Test Coverage for Critical Financial Paths (SAFE)

> **Gate**: All P0 financial routers have baseline test coverage.
> **Parallelism**: 5 agents

| Task         | Findings | File(s)                                                                                         | Change                                                                                                                                                     |
| ------------ | -------- | ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **BUG-W8-1** | TST-P0-1 | `server/routers/__tests__/invoices.test.ts` (new)                                               | Write unit tests for invoices router: `generateFromOrder` (happy path, missing order, transaction rollback), `list`, `getById`, `updateStatus`, `markSent` |
| **BUG-W8-2** | TST-P0-2 | `server/routers/__tests__/payments.test.ts`                                                     | Unskip the 28 disabled tests. Fix whatever is blocking them (likely DB/mock setup). Add concurrent payment recording test.                                 |
| **BUG-W8-3** | TST-P0-3 | `server/services/__tests__/orderAccountingService.test.ts`, `orderPricingService.test.ts` (new) | Write unit tests for GL entry creation and price calculation logic                                                                                         |
| **BUG-W8-4** | TST-P0-4 | `server/routers/__tests__/cogs.test.ts` (new)                                                   | Write unit tests for COGS router: cost basis calculations, weighted average, FIFO scenarios                                                                |
| **BUG-W8-5** | TST-P0-5 | `server/routers/__tests__/clientLedger.test.ts` (new)                                           | Write unit tests for client ledger: balance calculations, AR/AP accuracy, payment application                                                              |

**Verification**: `pnpm test` — all new tests pass, zero skipped financial tests

---

## Deferred / Backlog (Not in Wave Execution)

These require architectural decisions or larger refactors. Track in Linear, not this roadmap.

| ID                     | Finding                                                            | Reason Deferred                                                                            |
| ---------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| SCH-P0-4               | FK references to deprecated `vendors` table                        | Migration requires coordinated schema change + data migration. Separate migration runbook. |
| SCH-P2-1               | 143 tables missing `deletedAt`                                     | Bulk schema migration — needs migration plan per table group                               |
| SCH-P2-2               | Mixed column naming conventions                                    | Cosmetic — high effort, low value unless combined with other schema changes                |
| INV-P1-3, INV-P1-4     | `orderLineItemAllocations`/`sampleAllocations` missing `deletedAt` | Schema migration — bundle with SCH-P2-1                                                    |
| INV-P1-5               | `batches`/`lots` missing `createdBy`/`updatedBy`                   | Schema migration — bundle with SCH-P2-1                                                    |
| GF-P1-2                | Dual order creation paths (3 ways)                                 | Architectural consolidation — separate design spec needed                                  |
| GF-P1-3                | PO receiving is hollow (status flip only)                          | Feature implementation — not a bug fix, needs product spec                                 |
| SVC-P1-3               | Dual order logic paths (router vs orchestrator)                    | Architectural consolidation — merge with GF-P1-2                                           |
| SVC-P2-1               | In-memory notification queue                                       | Infrastructure change — needs BullMQ migration plan                                        |
| RTR-P2-1               | 655 `throw new Error()` instances                                  | Bulk refactor — high volume, low individual risk. Batch by router.                         |
| INV-P2-1               | Dual COGS calculation modules                                      | Needs product decision on which module is canonical                                        |
| INV-P2-4               | Floating-point arithmetic for quantities                           | Needs Decimal.js or similar lib adoption — cross-cutting                                   |
| FE-P1-2                | 11 components duplicate client list fetch                          | Refactor to shared hook — frontend optimization sprint                                     |
| FE-P2-1 thru FE-P2-5   | Frontend vendor cleanup, monoliths, a11y                           | Frontend improvement sprint — not blocking                                                 |
| TST-P1-1 thru TST-P1-6 | Broad test coverage gaps                                           | Ongoing — each wave should add tests for its changes                                       |
| TST-P2-\*              | E2E depth, boundary tests                                          | Ongoing — testing improvement track                                                        |
| All P3s                | Low-priority cleanup                                               | Address opportunistically when touching related files                                      |

---

## Execution Summary

| Wave         | Theme               | Tasks  | Parallelism | Autonomy | Findings Addressed                |
| ------------ | ------------------- | ------ | ----------- | -------- | --------------------------------- |
| **0**        | Security Lockdown   | 4      | 4 agents    | RED      | 4 (P0+P1 security)                |
| **1**        | Soft-Delete Filters | 5      | 5 agents    | STRICT   | 8 (P0+P1 data leaks)              |
| **2**        | Transaction Safety  | 5      | 5 agents    | RED      | 5 (P0 atomicity + race)           |
| **3**        | Actor Attribution   | 6      | 6 agents    | STRICT   | 12 (P0+P1 forbidden patterns)     |
| **4**        | Vendor Eradication  | 5      | 5 agents    | STRICT   | 8 (P0+P1 deprecated usage)        |
| **5**        | RBAC Hardening      | 5      | 5 agents    | STRICT   | 6 (P1 permission gaps)            |
| **6**        | Business Logic      | 7      | 7 agents    | STRICT   | 10 (P1+P2 logic fixes)            |
| **7**        | Security Hygiene    | 5      | 5 agents    | STRICT   | 6 (P2+P3 hardening)               |
| **8**        | Test Coverage       | 5      | 5 agents    | SAFE     | 5 (P0 test gaps)                  |
| **Deferred** | Backlog             | —      | —           | —        | 59 (schema migrations, arch, P3s) |
|              | **TOTALS**          | **47** | **max 7**   |          | **64 direct + 59 deferred = 123** |

---

## Acceptance Criteria (Per Task)

Every task must:

1. Pass `pnpm check` (zero TypeScript errors)
2. Pass `pnpm lint` (zero ESLint errors)
3. Pass `pnpm build` (client + server)
4. Pass `pnpm test` (no regressions)
5. Include a targeted test for the fix where applicable
6. Have a single atomic commit with `fix(scope): description` format
7. Reference the BUG-W#-# task ID and original finding IDs in the commit body

## Wave Promotion Criteria

A wave is complete when:

- All tasks in the wave pass acceptance criteria
- `pnpm check && pnpm lint && pnpm build` passes on the merged branch
- No new findings introduced (verified by targeted grep for forbidden patterns)
- RED autonomy tasks have Evan's explicit approval

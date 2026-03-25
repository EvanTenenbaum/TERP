# Deep Test + Full Audit Remediation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all 52 deep-test failures and 123 audit findings from the staging swarm audit, organized into dependency-ordered waves that can be executed by parallel agents.

**Architecture:** Two issue sources merged into one execution plan: (A) the 83-test deep E2E suite (27 pass, 52 fail, 4 skip) and (B) the 9-swarm full audit (123 findings). Many overlap — e.g., RBAC gaps appear in both test failures and audit findings. This plan deduplicates, orders by dependency, and produces atomic committable tasks.

**Tech Stack:** TypeScript, tRPC, Drizzle ORM, MySQL, Vitest, Playwright (E2E), shadcn/ui, React 19

**Sources:**

- Deep test results: 83 tests, 27 passed, 52 failed, 4 skipped
- Full audit: `docs/audits/FULL_AUDIT_REPORT_2026-03-24.md` (123 findings)
- Audit roadmap: `docs/audits/AUDIT_BUG_ROADMAP.md` (56 tasks, 8 waves)
- Existing remediation: `docs/superpowers/plans/2026-03-24-comprehensive-remediation.md` (pilot surface fixes)

**Overlap with comprehensive-remediation.md:** That plan owns all pilot surface UX fixes (Waves 1-4) and some server fixes in its Wave 3:

- `DISC-RET-009` (returns actor attribution) — owned by comprehensive-remediation Wave 3, Task 3.2. **Excluded from this plan's Wave 3.**
- `QUO-P3` (quote convertToOrder actor attribution) — owned by comprehensive-remediation Wave 3, Task 3.1. **Excluded from this plan.**
- Pilot surface frontend fixes (INV-P1, ORD-P2, PAY-P2, FUL items) — all owned by comprehensive-remediation. Not duplicated here.

This plan focuses on **server-side security, data integrity, RBAC, transactions, and test infrastructure**.

---

## Issue Cross-Reference Map

This maps deep-test failures to audit findings, showing overlap:

| Deep Test Issue                                  | Audit Finding(s)                                                                                                                            | Wave   |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| RBAC: `users.list` accessible to salesRep        | SEC-P1-2 (38 routers missing guards)                                                                                                        | W5     |
| RBAC: accountant CAN adjust inventory            | SEC-P1-2 (permission guard gaps)                                                                                                            | W5     |
| RBAC: accountant CAN update batch status         | SEC-P1-2                                                                                                                                    | W5     |
| RBAC: salesRep CAN cancel confirmed orders       | SEC-P1-2, needs new permission                                                                                                              | W5     |
| RBAC: salesRep CAN access user management        | SEC-P1-2                                                                                                                                    | W5     |
| Invoice generation requires specific status      | GF-P1-1 (state machine not enforced)                                                                                                        | W6     |
| Inventory availableQty vs onHandQty              | INV-P0-1, INV-P0-2 (soft-delete filters)                                                                                                    | W1     |
| `inventoryMovements.adjust` raw SQL error        | SVC-P0-1 (no transaction)                                                                                                                   | W2     |
| Overpayment accepted without error               | Server has tolerance logic (TER-589) — **test setup issue**: test creates order but may not properly set invoice amountDue                  | W-TEST |
| Invalid payment method "MAGIC_BEANS"             | Server already validates via `z.enum()` (payments.ts:66) — **test setup issue**: test may be hitting wrong endpoint or bypassing validation | W-TEST |
| Payment on DRAFT invoice                         | Server already guards DRAFT (payments.ts:308-314) — **test setup issue**: test may not be creating invoice in DRAFT state correctly         | W-TEST |
| Duplicate invoice generation                     | Missing idempotency guard in `generateFromOrder`                                                                                            | W6     |
| Duplicate order confirmation                     | Confirm already checks `!order.isDraft` (orders.ts:556) — but version not incremented (GF-P2-2)                                             | W6     |
| Cancelled order confirmable                      | Already checked (orders.ts:564) — but doesn't use formal state machine `validateTransition()`                                               | W6     |
| Order state transitions unvalidated              | State machine exists but only used in `updateFulfillmentStatus`, not all transition paths                                                   | W6     |
| Test infra: `findBatchWithStock` returns 0-stock | Test helper bug                                                                                                                             | W-TEST |
| Test infra: shared batch exhaustion              | Test isolation issue                                                                                                                        | W-TEST |
| 4 credit tests skipped                           | Serial dependency chain                                                                                                                     | W-TEST |

---

## Wave 0: Emergency Security Lockdown (RED — Requires Evan Approval)

> **Gate**: P0 security vulns. Must deploy before all other waves.
> **Parallelism**: 4 agents | **Autonomy**: RED

### Task 0.1: BUG-W0-1 — Auth guard on admin endpoints

**Files:**

- Modify: `server/_core/simpleAuth.ts:238-309`

- [ ] **Step 1: Write test for unauthenticated access to create-first-user**

```typescript
// server/_core/__tests__/admin-endpoints.test.ts
describe("admin endpoint guards", () => {
  it("rejects create-first-user when users already exist", async () => {
    // POST /api/auth/create-first-user should return 403 when users table is non-empty
  });
  it("rejects push-schema without admin auth", async () => {});
  it("rejects seed without admin auth", async () => {});
  it("disables all three in production", async () => {});
});
```

- [ ] **Step 2: Run test — verify it fails**

Run: `pnpm test server/_core/__tests__/admin-endpoints.test.ts`

- [ ] **Step 3: Implement guards**

In `simpleAuth.ts`:

1. `/api/auth/create-first-user`: Query `users` table; if `count > 0`, return 403
2. `/api/auth/push-schema`: Require valid JWT + admin role
3. `/api/auth/seed`: Require valid JWT + admin role
4. All three: Add `if (process.env.NODE_ENV === 'production') return res.status(403).json({ error: 'Disabled in production' })`

- [ ] **Step 4: Run test — verify it passes**

Run: `pnpm test server/_core/__tests__/admin-endpoints.test.ts`

- [ ] **Step 5: Run `pnpm check && pnpm lint && pnpm build`**

- [ ] **Step 6: Commit**

```bash
git add server/_core/simpleAuth.ts server/_core/__tests__/admin-endpoints.test.ts
git commit -m "fix(auth): guard admin endpoints — require auth + disable in production (SEC-P0-1, BUG-W0-1)"
```

### Task 0.2: BUG-W0-2 — Guard debug context endpoint

**Files:**

- Modify: `server/_core/index.ts:442-467`

- [ ] **Step 1: Add production guard and auth check to `/api/debug/context`**

```typescript
app.get("/api/debug/context", (req, res) => {
  if (process.env.NODE_ENV === "production") {
    return res.status(403).json({ error: "Disabled in production" });
  }
  // Existing logic...
});
```

- [ ] **Step 2: Run `pnpm check && pnpm lint && pnpm build`**

- [ ] **Step 3: Commit**

```bash
git commit -m "fix(security): disable debug/context endpoint in production (SEC-P0-2, BUG-W0-2)"
```

### Task 0.3: BUG-W0-3 — Auth on health/metrics endpoint

**Files:**

- Modify: `server/_core/index.ts:389`

- [ ] **Step 1: Add auth middleware to `/health/metrics`**

Keep `/health` unauthenticated (load balancer needs it). Add JWT verification to `/health/metrics` to match the tRPC `system:metrics` permission.

- [ ] **Step 2: Run `pnpm check && pnpm lint && pnpm build`**

- [ ] **Step 3: Commit**

```bash
git commit -m "fix(security): require auth on /health/metrics endpoint (SEC-P0-3, BUG-W0-3)"
```

### Task 0.4: BUG-W0-4 — Verify/fix SQL injection in salesSheetEnhancements

**Files:**

- Investigate: `server/salesSheetEnhancements.ts` (NOTE: this is the service file, NOT `server/routers/salesSheetEnhancements.ts`)

**Important context:** The audit flagged `templateId` interpolation in SQL. However, the file uses Drizzle's `eq()` builder for most `templateId` usage (e.g., line 29: `eq(salesSheetTemplates.id, templateId)`). The `templateId` parameter is typed as `number`, which limits injection surface. **Verify before fixing:**

- [ ] **Step 1: Audit all `templateId` usage in the file**

Search for any raw SQL string interpolation like `` sql`...${templateId}...` `` that doesn't use Drizzle's tagged template parameterization. Drizzle's `sql` tagged template literal DOES parameterize values, so `sql\`...${templateId}...\``is actually safe. Only fix if you find genuine string concatenation like`"SELECT ... " + templateId`.

- [ ] **Step 2: If genuine injection found, parameterize it. If already safe, document as false positive.**

- [ ] **Step 3: Run `pnpm check && pnpm lint && pnpm build`**

- [ ] **Step 4: Commit (if changes made)**

```bash
git commit -m "fix(security): verify/parameterize templateId SQL usage in salesSheetEnhancements (SEC-P1-1, BUG-W0-4)"
```

---

## Wave 1: Soft-Delete Filters (STRICT)

> **Gate**: Deleted records stop leaking. Fixes 42+ test failures caused by stale/deleted batch data.
> **Parallelism**: 5 agents

### Task 1.1: BUG-W1-1 — Filter soft-deleted batches in inventoryDb

**Files:**

- Modify: `server/inventoryDb.ts:828` (`getAllBatches`) and `:914` (`getBatchesWithDetails`)

- [ ] **Step 1: Add `isNull(batches.deletedAt)` to `getAllBatches` WHERE clause (line 828)**

`getAllBatches` at line 828 does a bare `.select().from(batches)` with no WHERE clause. Add `.where(isNull(batches.deletedAt))`.

- [ ] **Step 2: Add `isNull(batches.deletedAt)` to `getBatchesWithDetails` WHERE conditions (line 914+)**

`getBatchesWithDetails` at line 914 builds a `conditions` array. Add `conditions.push(isNull(batches.deletedAt))` at the start of the conditions block (around line 928).

- [ ] **Step 3: Run `pnpm check && pnpm lint && pnpm build`**

- [ ] **Step 4: Commit**

```bash
git commit -m "fix(inventory): filter soft-deleted batches in getAllBatches and getBatchesWithDetails (INV-P0-1, INV-P0-2, BUG-W1-1)"
```

### Task 1.2: BUG-W1-2 — Filter soft-deleted locations

**Files:**

- Modify: `server/routers/locations.ts`

- [ ] **Step 1: Add `isNull(locations.deletedAt)` to all 3 query procedures (`list`, `getAll`, `getById`)**

- [ ] **Step 2: Run `pnpm check && pnpm lint && pnpm build`**

- [ ] **Step 3: Commit**

```bash
git commit -m "fix(locations): filter soft-deleted records in all queries (RTR-P0-1, BUG-W1-2)"
```

### Task 1.3: BUG-W1-3 — Filter soft-deleted batches across 8 routers

**Files:**

- Modify: `server/routers/orders.ts`, `inventory.ts`, `vipPortal.ts`, `vipPortalLiveShopping.ts`, `alerts.ts`, `returns.ts`, `client360.ts`

- [ ] **Step 1: Audit each router for batch JOINs/subqueries missing `isNull(batches.deletedAt)`**

Search: `grep -n "batches" server/routers/{orders,inventory,vipPortal,vipPortalLiveShopping,alerts,returns,client360}.ts`

- [ ] **Step 2: Add `isNull(batches.deletedAt)` to all 24+ batch queries**

- [ ] **Step 3: Run `pnpm check && pnpm lint && pnpm build`**

- [ ] **Step 4: Commit**

```bash
git commit -m "fix(data): add soft-delete filters to batch queries across 8 routers (RTR-P0-2, BUG-W1-3)"
```

### Task 1.4: BUG-W1-4 — Filter soft-deleted strains

**Files:**

- Modify: `server/inventoryDb.ts`

- [ ] **Step 1: Add `isNull(strains.deletedAt)` to `getAllStrains()` and `getStrainById()`**

- [ ] **Step 2: Run `pnpm check && pnpm lint && pnpm build`**

- [ ] **Step 3: Commit**

```bash
git commit -m "fix(inventory): filter soft-deleted strains in getAllStrains/getStrainById (RTR-P0-3, BUG-W1-4)"
```

### Task 1.5: BUG-W1-5 — Filter soft-deleted payments/invoices/categories

**Files:**

- Modify: `server/routers/analytics.ts`, `audit.ts`, `returns.ts`, `invoices.ts`, `productCategories.ts`

- [ ] **Step 1: Add `isNull(deletedAt)` filters for `payments`, `invoices`, `categories` in analytics/audit/returns queries**

- [ ] **Step 2: Run `pnpm check && pnpm lint && pnpm build`**

- [ ] **Step 3: Commit**

```bash
git commit -m "fix(data): add soft-delete filters for payments/invoices/categories in analytics/audit (RTR-P1-5, BUG-W1-5)"
```

---

## Wave 2: Transaction Safety & Race Conditions (RED)

> **Gate**: Multi-table mutations are atomic. Fixes `inventoryMovements.adjust` SQL error from tests.
> **Parallelism**: 5 agents

### Task 2.1: BUG-W2-1 — Wrap installmentPayments.createPlan in transaction

**Files:**

- Modify: `server/routers/installmentPayments.ts:167-222`

- [ ] **Step 1: Wrap plan insert + all installment inserts in `db.transaction()`**

- [ ] **Step 2: Run `pnpm check && pnpm lint && pnpm build`**

- [ ] **Step 3: Commit**

```bash
git commit -m "fix(payments): wrap createPlan in transaction — prevent orphaned records (SVC-P0-1, BUG-W2-1)"
```

### Task 2.2: BUG-W2-2 — Wrap installmentPayments.recordPayment in transaction

**Files:**

- Modify: `server/routers/installmentPayments.ts:392-448`

- [ ] **Step 1: Wrap installment update + plan totals + next activation in `db.transaction()`**

- [ ] **Step 2: Run `pnpm check && pnpm lint && pnpm build`**

- [ ] **Step 3: Commit**

```bash
git commit -m "fix(payments): wrap recordPayment in transaction — atomic installment + plan update (SVC-P0-2, BUG-W2-2)"
```

### Task 2.3: BUG-W2-3 — Wrap invoices.generateFromOrder in transaction

**Files:**

- Modify: `server/routers/invoices.ts:441-460`

- [ ] **Step 1: Wrap invoice insert + order update + balance sync in `db.transaction()`**

- [ ] **Step 2: Run `pnpm check && pnpm lint && pnpm build`**

- [ ] **Step 3: Commit**

```bash
git commit -m "fix(invoices): wrap generateFromOrder in transaction — atomic invoice + order + balance (SVC-P0-3, BUG-W2-3)"
```

### Task 2.4: BUG-W2-4 — Wrap orders.create (draft) in transaction

**Files:**

- Modify: `server/routers/orders.ts:1019-1084`

- [ ] **Step 1: Wrap order insert + line items Promise.all + audit log in `db.transaction()`**

- [ ] **Step 2: Run `pnpm check && pnpm lint && pnpm build`**

- [ ] **Step 3: Commit**

```bash
git commit -m "fix(orders): wrap draft creation in transaction — atomic order + line items + audit (SVC-P0-4, BUG-W2-4)"
```

### Task 2.5: BUG-W2-5 — Add FOR UPDATE lock to simple confirm

**Files:**

- Modify: `server/routers/orders.ts:530-534`

- [ ] **Step 1: Add `.for("update")` to the order SELECT in the simple `confirm` endpoint**

The `OrderOrchestrator.confirmOrder()` already does this correctly. Match it here.

- [ ] **Step 2: Run `pnpm check && pnpm lint && pnpm build`**

- [ ] **Step 3: Commit**

```bash
git commit -m "fix(orders): add FOR UPDATE lock to simple confirm — prevent double-confirm race (GF-P0-2, BUG-W2-5)"
```

---

## Wave 3: Actor Attribution & Forbidden Patterns (STRICT)

> **Gate**: All mutations use `getAuthenticatedUserId(ctx)`. No client-provided actors.
> **Parallelism**: 6 agents

### Task 3.1: BUG-W3-1 — Fix hardcoded `createdBy: 1`

**Files:**

- Modify: `server/services/orderService.ts:87`
- Modify: `server/_core/calendarJobs.ts:280`

- [ ] **Step 1: Add `actorId` parameter to `createOrderFromInterestList` — replace `createdBy: 1`**

- [ ] **Step 2: For `calendarJobs.ts`, use system actor pattern (create a `SYSTEM_ACTOR_ID` constant or service account)**

- [ ] **Step 3: Run `pnpm check && pnpm lint && pnpm build`**

- [ ] **Step 4: Commit**

```bash
git commit -m "fix(auth): replace hardcoded createdBy:1 with proper actor propagation (SCH-P0-2, GF-P0-1, BUG-W3-1)"
```

### Task 3.2: BUG-W3-2 — Remove client-provided actors from samples router

**Files:**

- Modify: `server/routers/samples.ts`

- [ ] **Step 1: Remove `fulfilledBy`, `approvedBy`, `completedBy`, `confirmedBy` from input schemas**

- [ ] **Step 2: Derive all actor IDs from `getAuthenticatedUserId(ctx)` inside the mutation handlers**

- [ ] **Step 3: Run `pnpm check && pnpm lint && pnpm build`**

- [ ] **Step 4: Commit**

```bash
git commit -m "fix(samples): derive actor IDs from auth context — remove client-provided actors (RTR-P1-1, BUG-W3-2)"
```

### Task 3.3: BUG-W3-3 — Fix pricing router actor attribution

**Files:**

- Modify: `server/routers/pricing.ts:503`

- [ ] **Step 1: Replace `ctx.user?.id` with `getAuthenticatedUserId(ctx)` in all mutations**

- [ ] **Step 2: Run `pnpm check && pnpm lint && pnpm build`**

- [ ] **Step 3: Commit**

```bash
git commit -m "fix(pricing): use getAuthenticatedUserId for actor attribution (RTR-P1-4, SEC-P1-3, BUG-W3-3)"
```

### Task 3.4: BUG-W3-4 — Fix actor attribution in receipts/credits/rbacRoles

**Files:**

- Modify: `server/routers/receipts.ts`, `server/routers/credits.ts`, `server/routers/rbacRoles.ts`

- [ ] **Step 1: Replace `ctx.user.id` / `ctx.user?.id` with `getAuthenticatedUserId(ctx)` in all mutations**

- [ ] **Step 2: Run `pnpm check && pnpm lint && pnpm build`**

- [ ] **Step 3: Commit**

```bash
git commit -m "fix(auth): use getAuthenticatedUserId in receipts/credits/rbacRoles (SEC-P1-3, BUG-W3-4)"
```

### Task 3.5: BUG-W3-5 — Fix actor attribution in inventory routers

**Files:**

- Modify: `server/routers/inventoryMovements.ts`, `server/routers/inventory.ts`

- [ ] **Step 1: Replace `ctx.user.id` / `ctx.user?.id` with `getAuthenticatedUserId(ctx)` in all 7+ mutations**

- [ ] **Step 2: Remove `quantityBefore`/`quantityAfter` from input schema — compute server-side (INV-P2-3)**

- [ ] **Step 3: Run `pnpm check && pnpm lint && pnpm build`**

- [ ] **Step 4: Commit**

```bash
git commit -m "fix(inventory): use getAuthenticatedUserId + compute quantities server-side (INV-P1-1, INV-P1-2, INV-P2-3, BUG-W3-5)"
```

### Task 3.6: BUG-W3-6 — Fix actor attribution in remaining routers

**Files:**

- Modify: `server/routers/todoTasks.ts`, `vendorReminders.ts`, `cashAudit.ts`, `clients.ts`, `invoices.ts`

- [ ] **Step 1: Replace manual `ctx.user.id` checks with `getAuthenticatedUserId(ctx)`**

- [ ] **Step 2: Add actor to `invoices.updateStatus` and `markSent` (RTR-P2-3)**

- [ ] **Step 3: Run `pnpm check && pnpm lint && pnpm build`**

- [ ] **Step 4: Commit**

```bash
git commit -m "fix(auth): use getAuthenticatedUserId in todoTasks/vendorReminders/cashAudit/clients/invoices (SEC-P1-3, RTR-P2-2, RTR-P2-3, BUG-W3-6)"
```

---

## Wave 4: Deprecated Vendors Eradication & Schema Fixes (STRICT)

> **Gate**: No production code queries `vendors` table.
> **Parallelism**: 5 agents

### Task 4.1: BUG-W4-1 — Replace vendors in intake service

**Files:**

- Modify: `server/inventoryIntakeService.ts:148-152`

- [ ] **Step 1: Replace vendor record creation with `clients` table lookup/creation (`isSeller=true`, `isNull(clients.deletedAt)`)**

- [ ] **Step 2: Set `supplierClientId` on lots instead of `vendorId`**

- [ ] **Step 3: Run `pnpm check && pnpm lint && pnpm build`**

- [ ] **Step 4: Commit**

```bash
git commit -m "fix(intake): use clients table (isSeller=true) instead of deprecated vendors (INV-P0-4, BUG-W4-1)"
```

### Task 4.2: BUG-W4-2 — Replace vendors in vendorMappingService/vendorReminders

**Files:**

- Modify: `server/services/vendorMappingService.ts:180,228`
- Modify: `server/routers/vendorReminders.ts`

- [ ] **Step 1: Replace `db.query.vendors` with `clients` table queries (filter `isSeller=true`)**

**Important:** All replacement queries must include `isNull(clients.deletedAt)` to maintain soft-delete filtering consistency.

- [ ] **Step 2: Update vendorReminders JOIN to use clients table**

- [ ] **Step 3: Run `pnpm check && pnpm lint && pnpm build`**

- [ ] **Step 4: Commit**

```bash
git commit -m "fix(vendors): replace db.query.vendors with clients(isSeller=true) in mapping/reminders (SCH-P0-1, RTR-P1-3, BUG-W4-2)"
```

### Task 4.3: BUG-W4-3 — Replace vendors in purchaseOrders

**Files:**

- Modify: `server/routers/purchaseOrders.ts:342`

- [ ] **Step 1: Replace `from(vendors)` fallback lookup with `clients` query (`isSeller=true`, `isNull(clients.deletedAt)`)**

- [ ] **Step 2: Remove vendors import**

- [ ] **Step 3: Run `pnpm check && pnpm lint && pnpm build`**

- [ ] **Step 4: Commit**

```bash
git commit -m "fix(purchase-orders): replace vendors table query with clients(isSeller=true) (SVC-P1-2, GF-P2-7, BUG-W4-3)"
```

### Task 4.4: BUG-W4-4 — Fix `: any` types

**Files:**

- Modify: `server/matchingEngineEnhanced.ts:373,391,393`

- [ ] **Step 1: Replace 3 `: any` types with proper type definitions or `unknown`**

- [ ] **Step 2: Run `pnpm check && pnpm lint && pnpm build`**

- [ ] **Step 3: Commit**

```bash
git commit -m "fix(types): replace :any with proper types in matchingEngineEnhanced (SCH-P0-3, BUG-W4-4)"
```

### Task 4.5: BUG-W4-5 — Fix formatQty precision truncation

**Files:**

- Modify: `server/inventoryUtils.ts:297-298`

- [ ] **Step 1: Write failing test**

```typescript
it("preserves 4-decimal precision", () => {
  expect(formatQty(10.1234)).toBe("10.1234");
  expect(formatQty(0.0001)).toBe("0.0001");
});
```

- [ ] **Step 2: Change `toFixed(2)` to `toFixed(4)` to match `decimal(15,4)` DB column precision**

- [ ] **Step 3: Run `pnpm check && pnpm lint && pnpm build`**

- [ ] **Step 4: Commit**

```bash
git commit -m "fix(inventory): formatQty uses toFixed(4) to match decimal(15,4) schema — prevent phantom shrinkage (INV-P0-3, BUG-W4-5)"
```

---

## Wave 5: RBAC Hardening (STRICT)

> **Gate**: All state-changing endpoints require appropriate permissions. Fixes 5 CRITICAL RBAC test failures.
> **Parallelism**: 5 agents
>
> **Deep test failures addressed**: users.list accessible to salesRep, accountant adjusting inventory, accountant updating batch status, salesRep cancelling confirmed orders, salesRep accessing user management

### Task 5.1: BUG-W5-1 — Permission guards on organizationSettings

**Files:**

- Modify: `server/routers/organizationSettings.ts`

- [ ] **Step 1: Add `requirePermission('organization:manage')` middleware to all 12 mutations**

- [ ] **Step 2: Run `pnpm check && pnpm lint && pnpm build`**

- [ ] **Step 3: Commit**

```bash
git commit -m "fix(rbac): add requirePermission('organization:manage') to all org settings mutations (RTR-P1-2, BUG-W5-1)"
```

### Task 5.2: BUG-W5-2 — Permission guards on warehouse routers

**Files:**

- Modify: `server/routers/pickPack.ts`, `poReceiving.ts`, `intakeReceipts.ts`

This directly addresses the test failure: "accountant CAN adjust inventory" and "accountant CAN update batch status". These routers need warehouse-specific permissions that accountant roles should NOT have.

- [ ] **Step 1: Add `requirePermission('warehouse:manage')` to `pickPack.ts` mutations**

- [ ] **Step 2: Add `requirePermission('inventory:receive')` to `poReceiving.ts` mutations**

- [ ] **Step 3: Add `requirePermission('inventory:intake')` to `intakeReceipts.ts` mutations**

- [ ] **Step 4: Run `pnpm check && pnpm lint && pnpm build`**

- [ ] **Step 5: Commit**

```bash
git commit -m "fix(rbac): add warehouse permission guards to pickPack/poReceiving/intakeReceipts (SEC-P1-2, BUG-W5-2)"
```

### Task 5.3: BUG-W5-3 — Permission guards on calendar/tag routers

**Files:**

- Modify: `server/routers/calendarsManagement.ts`, `calendarInvitations.ts`, `tags.ts`

- [ ] **Step 1: Add `requirePermission` guards to all mutations in each router**

- [ ] **Step 2: Run `pnpm check && pnpm lint && pnpm build`**

- [ ] **Step 3: Commit**

```bash
git commit -m "fix(rbac): add permission guards to calendar/invitation/tag mutations (SEC-P1-2, BUG-W5-3)"
```

### Task 5.4: BUG-W5-4 — Permission guards on VIP portal

**Files:**

- Modify: `server/routers/vipPortal.ts`, `vipPortalLiveShopping.ts`

- [ ] **Step 1: Add appropriate permission guards for VIP portal mutations**

- [ ] **Step 2: Run `pnpm check && pnpm lint && pnpm build`**

- [ ] **Step 3: Commit**

```bash
git commit -m "fix(rbac): add permission guards to VIP portal mutations (SEC-P1-2, BUG-W5-4)"
```

### Task 5.5: BUG-W5-5 — Permission guards + actor attribution on purchaseOrders

**Files:**

- Modify: `server/routers/purchaseOrders.ts`

- [ ] **Step 1: Add `requirePermission` to all 10 mutations**

- [ ] **Step 2: Add `getAuthenticatedUserId(ctx)` to all actor-attributed fields**

- [ ] **Step 3: Run `pnpm check && pnpm lint && pnpm build`**

- [ ] **Step 4: Commit**

```bash
git commit -m "fix(rbac): add permission guards + actor attribution to all PO mutations (GF-P2-3, GF-P2-4, RTR-P2-4, BUG-W5-5)"
```

### Task 5.6: RBAC — Restrict order cancellation to manager/admin (DEEP TEST FIX)

**Files:**

- Modify: `server/routers/orders.ts` (delete/cancel endpoints)

This directly addresses the deep test failure: "salesRep CAN cancel confirmed orders". Currently the `delete` endpoint uses `requirePermission("orders:delete")` — but if salesRep has this permission, they can cancel confirmed orders. The fix needs a new permission or a business-rule check.

- [ ] **Step 1: Add business rule check to order delete/cancel**

In the order `delete` mutation (line ~463) and any cancel mutation, add a check: if the order's `fulfillmentStatus` is `CONFIRMED` or beyond, require `orders:manage` permission (admin/manager) rather than just `orders:delete`.

```typescript
// After fetching the order:
if (existing.fulfillmentStatus !== "DRAFT" && existing.isDraft !== true) {
  // Confirmed orders require elevated permission
  const userPerms = await getUserPermissions(userId);
  if (!userPerms.includes("orders:manage")) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only managers can cancel confirmed orders",
    });
  }
}
```

- [ ] **Step 2: Run `pnpm check && pnpm lint && pnpm build`**

- [ ] **Step 3: Commit**

```bash
git commit -m "fix(rbac): restrict confirmed order cancellation to manager/admin role (RBAC-TEST-FIX)"
```

---

## Wave 6: Business Logic & State Machine Enforcement (STRICT)

> **Gate**: State machines enforced, payment validation correct. Fixes 10+ deep test failures.
> **Parallelism**: 7 agents
>
> **Deep test failures addressed**: duplicate invoice generation, state transition enforcement, version increment on confirm. Note: payment method, DRAFT guard, and overpayment tests are already server-guarded — those failures are test setup issues (see Wave TEST).

### Task 6.1: BUG-W6-1 — Enforce state machine in simple confirm

**Files:**

- Modify: `server/routers/orders.ts:530+`

This fixes deep test failures for state-machine transition tests. **Depends on Task 2.5** (which adds `FOR UPDATE` lock to the same confirm endpoint).

**Existing guards already present (do NOT duplicate):**

- `!order.isDraft` check at line 556 — returns "Order is already confirmed"
- `order.saleStatus === "CANCELLED"` check at line 564 — returns "Cannot confirm a cancelled order"
- `nonConfirmableStatuses` check at line 572 — blocks SHIPPED/DELIVERED/RETURNED

**What's missing:** The formal `validateTransition()` from `orderStateMachine.ts` is NOT called. The ad-hoc checks above are incomplete vs the state machine's full transition map. Also, version is not incremented, and the transaction is not retryable.

- [ ] **Step 1: Replace ad-hoc status checks with `validateTransition()`**

Remove the three manual checks above (lines 556-584) and replace with:

```typescript
import { validateTransition } from "../services/orderStateMachine";

// Inside confirm mutation, after fetching order:
validateTransition(order.fulfillmentStatus, "CONFIRMED", order.id);
```

This covers CANCELLED, SHIPPED, DELIVERED, RETURNED, and all other invalid transitions via the state machine's transition map.

- [ ] **Step 2: Use `withRetryableTransaction` instead of `withTransaction`**

- [ ] **Step 3: Increment order version on confirm (GF-P2-2)**

```typescript
await tx
  .update(orders)
  .set({ isDraft: false, version: sql`${orders.version} + 1` })
  .where(eq(orders.id, input.orderId));
```

- [ ] **Step 4: Run `pnpm check && pnpm lint && pnpm build`**

- [ ] **Step 7: Commit**

```bash
git commit -m "fix(orders): enforce state machine + retryable tx + version increment in simple confirm (GF-P1-1, GF-P2-1, GF-P2-2, BUG-W6-1)"
```

### Task 6.2: BUG-W6-2 — PO state machine validation

**Files:**

- Modify: `server/routers/purchaseOrders.ts`

- [ ] **Step 1: Define valid PO status transitions (similar to order state machine)**

- [ ] **Step 2: Add `validatePOTransition()` check in `updateStatus` mutation**

- [ ] **Step 3: Run `pnpm check && pnpm lint && pnpm build`**

- [ ] **Step 4: Commit**

```bash
git commit -m "fix(purchase-orders): add state machine validation to updateStatus (GF-P1-4, BUG-W6-2)"
```

### Task 6.3: BUG-W6-3 — Throw on negative inventory instead of silent clamping

**Files:**

- Modify: `server/routers/orders.ts:2255`

- [ ] **Step 1: Replace `Math.max(0, ...)` with explicit error throw**

```typescript
const newQty = currentQty - deductionQty;
if (newQty < 0) {
  throw new TRPCError({
    code: "BAD_REQUEST",
    message: `Insufficient inventory: batch ${batchId} has ${currentQty} available, attempted to deduct ${deductionQty}`,
  });
}
```

- [ ] **Step 2: Run `pnpm check && pnpm lint && pnpm build`**

- [ ] **Step 3: Commit**

```bash
git commit -m "fix(orders): throw on negative inventory instead of silent clamping to 0 (SVC-P1-1, BUG-W6-3)"
```

### Task 6.4: BUG-W6-4 — Soft-delete for calendar entries

**Files:**

- Modify: `server/calendarDb.ts:151,714`

- [ ] **Step 1: Replace `db.delete()` with soft-delete (`SET deletedAt = NOW()`) for calendar entries and invitations**

- [ ] **Step 2: Run `pnpm check && pnpm lint && pnpm build`**

- [ ] **Step 3: Commit**

```bash
git commit -m "fix(calendar): use soft-delete instead of hard-delete for entries and invitations (SCH-P1-1, SEC-P2-1, BUG-W6-4)"
```

### Task 6.5: BUG-W6-5 — Remove forbidden `userId` from frontend mutations

**Files:**

- Modify: `client/src/components/ClientNeedsTab.tsx:133`
- Modify: `client/src/components/ClientInterestWidget.tsx:59`

- [ ] **Step 1: Remove `userId: user?.id ?? 0` from mutation payloads — server derives actor from ctx**

- [ ] **Step 2: Run `pnpm check && pnpm lint && pnpm build`**

- [ ] **Step 3: Commit**

```bash
git commit -m "fix(frontend): remove forbidden userId from mutation payloads — server derives actor (FE-P1-1, BUG-W6-5)"
```

### Task 6.6: BUG-W6-6 — Fix mysqlEnum first arguments

**Files:**

- Modify: `server/db/schema/schema-sprint5-trackd.ts:596,846`

- [ ] **Step 1: Fix `mysqlEnum` first arguments to match DB column names**

The first argument to `mysqlEnum()` must match the actual database column name, not the TypeScript variable name.

- [ ] **Step 2: Run `pnpm check && pnpm lint && pnpm build`**

- [ ] **Step 3: Commit**

```bash
git commit -m "fix(schema): correct mysqlEnum first arguments to match DB column names (SCH-P1-3, BUG-W6-6)"
```

### Task 6.7: Invoice idempotency guard + payment test investigation (DEEP TEST FIXES)

**Files:**

- Modify: `server/routers/invoices.ts` (idempotency guard)
- Investigate: E2E test files (payment validation tests)

**IMPORTANT — Already implemented in `server/routers/payments.ts`:**
Three of the four "failures" reported by the deep test suite are **already guarded server-side**:

1. **Payment method enum** — `z.enum(["CASH","CHECK","WIRE","ACH","CREDIT_CARD","DEBIT_CARD","OTHER"])` at `payments.ts:66-74` ✅
2. **DRAFT invoice guard** — `if (invoice.status === "DRAFT") throw TRPCError(...)` at `payments.ts:308-314` ✅
3. **Overpayment tolerance** — `getOverpaymentTolerance()` comparison at `payments.ts:334-341` with FOR UPDATE lock ✅

These test failures are **test setup issues**, not missing server validation. The tests are likely:

- Hitting a different endpoint than `payments.recordPayment`
- Not setting up invoice/order state correctly before calling the payment endpoint
- Using a direct HTTP call that bypasses tRPC validation

The one genuine app bug is **duplicate invoice generation** — `generateFromOrder` has no idempotency guard.

- [ ] **Step 1: Add idempotency guard to `generateFromOrder`**

In `invoices.ts`, in `generateFromOrder`, check if an invoice already exists for this order:

```typescript
const existing = await tx
  .select()
  .from(invoices)
  .where(
    and(eq(invoices.salesOrderId, input.orderId), isNull(invoices.deletedAt))
  );
if (existing.length > 0) {
  throw new TRPCError({
    code: "CONFLICT",
    message: `Invoice already exists for order ${input.orderId}`,
  });
}
```

- [ ] **Step 2: Run `pnpm check && pnpm lint && pnpm build`**

- [ ] **Step 3: Commit**

```bash
git commit -m "fix(invoices): add idempotency guard to generateFromOrder — reject duplicate generation (DEEP-TEST-INVOICE-FIX)"
```

**Note for Wave TEST:** The 3 payment validation test failures (MAGIC_BEANS, DRAFT payment, overpayment) should be investigated in Wave TEST as test setup issues, not server bugs. The E2E tests may need to be updated to correctly call `payments.recordPayment` via tRPC (which enforces Zod validation) rather than a raw endpoint.

---

## Wave 7: Security Hardening (STRICT)

> **Gate**: Production security posture hardened.
> **Parallelism**: 5 agents

### Task 7.1: BUG-W7-1 — DEMO_MODE production guard

**Files:**

- Modify: `server/_core/simpleAuth.ts`

- [ ] **Step 1: Add runtime guard that throws if DEMO_MODE + production**

```typescript
if (process.env.DEMO_MODE === "true" && process.env.NODE_ENV === "production") {
  throw new Error("DEMO_MODE must not be enabled in production");
}
```

- [ ] **Step 2: Run `pnpm check && pnpm lint && pnpm build`**

- [ ] **Step 3: Commit**

```bash
git commit -m "fix(security): prevent DEMO_MODE from running in production (SEC-P2-5, BUG-W7-1)"
```

### Task 7.2: BUG-W7-2 — Add CORS + Helmet

**Files:**

- Modify: `server/_core/index.ts`

- [ ] **Step 1: Install helmet if not already a dependency**

Run: `pnpm add helmet`

- [ ] **Step 2: Add CORS configuration whitelisting staging + prod origins**

- [ ] **Step 3: Add Helmet middleware for security headers**

- [ ] **Step 4: Run `pnpm check && pnpm lint && pnpm build`**

- [ ] **Step 5: Commit**

```bash
git commit -m "fix(security): add CORS whitelist + Helmet security headers (SEC-P2-6, SEC-P2-7, BUG-W7-2)"
```

### Task 7.3: BUG-W7-3 — Strengthen password policy

**Files:**

- Modify: `server/_core/simpleAuth.ts`

- [ ] **Step 1: Increase minimum password length from 4 to 8 characters**

- [ ] **Step 2: Add basic complexity requirement (at least one letter + one number)**

- [ ] **Step 3: Run `pnpm check && pnpm lint && pnpm build`**

- [ ] **Step 4: Commit**

```bash
git commit -m "fix(security): strengthen password policy — 8 char minimum + complexity (SEC-P2-8, BUG-W7-3)"
```

### Task 7.4: BUG-W7-4 — Rate limiting on Express routes

**Files:**

- Modify: `server/_core/index.ts`

- [ ] **Step 1: Extend rate limiting to Express routes (auth endpoints, health/metrics)**

- [ ] **Step 2: Run `pnpm check && pnpm lint && pnpm build`**

- [ ] **Step 3: Commit**

```bash
git commit -m "fix(security): extend rate limiting to Express auth endpoints (SEC-P3-2, BUG-W7-4)"
```

### Task 7.5: BUG-W7-5 — Delete orphaned router

**Files:**

- Delete: `server/routers/dataAugmentHttp.ts`

- [ ] **Step 1: Verify file is not imported anywhere**

Run: `grep -r "dataAugmentHttp" server/ --include="*.ts"`

- [ ] **Step 2: Delete the file**

- [ ] **Step 3: Run `pnpm check && pnpm lint && pnpm build`**

- [ ] **Step 4: Commit**

```bash
git commit -m "chore: delete orphaned dataAugmentHttp router — dead code (RTR-P3-1, BUG-W7-5)"
```

---

## Wave 8: Test Coverage for Critical Financial Paths (SAFE)

> **Gate**: All P0 financial routers have baseline test coverage.
> **Parallelism**: 5 agents

### Task 8.1: BUG-W8-1 — Invoices router tests

**Files:**

- Create: `server/routers/__tests__/invoices.test.ts`

- [ ] **Step 1: Write unit tests for invoices router**

Cover: `generateFromOrder` (happy path, missing order, transaction rollback), `list`, `getById`, `updateStatus`, `markSent`

- [ ] **Step 2: Run `pnpm test server/routers/__tests__/invoices.test.ts`**

- [ ] **Step 3: Commit**

```bash
git commit -m "test(invoices): add unit tests for generateFromOrder, list, getById, updateStatus, markSent (TST-P0-1, BUG-W8-1)"
```

### Task 8.2: BUG-W8-2 — Unskip payments tests

**Files:**

- Modify: `server/routers/__tests__/payments.test.ts` (or `server/routers/payments.test.ts`)

- [ ] **Step 1: Change `describe.skip` to `describe` for the 28 disabled tests**

- [ ] **Step 2: Fix whatever is blocking them (likely DB/mock setup)**

- [ ] **Step 3: Add concurrent payment recording test**

- [ ] **Step 4: Run `pnpm test` — verify all pass**

- [ ] **Step 5: Commit**

```bash
git commit -m "test(payments): unskip 28 disabled tests + fix mock setup + add concurrency test (TST-P0-2, BUG-W8-2)"
```

### Task 8.3: BUG-W8-3 — Order accounting/pricing service tests

**Files:**

- Create: `server/services/__tests__/orderAccountingService.test.ts`
- Create: `server/services/__tests__/orderPricingService.test.ts`

- [ ] **Step 1: Write unit tests for GL entry creation logic**

- [ ] **Step 2: Write unit tests for price calculation logic**

- [ ] **Step 3: Run tests**

- [ ] **Step 4: Commit**

```bash
git commit -m "test(services): add unit tests for orderAccountingService + orderPricingService (TST-P0-3, BUG-W8-3)"
```

### Task 8.4: BUG-W8-4 — COGS router tests

**Files:**

- Create: `server/routers/__tests__/cogs.test.ts`

- [ ] **Step 1: Write unit tests for COGS router: cost basis calculations, weighted average, FIFO scenarios**

- [ ] **Step 2: Run tests**

- [ ] **Step 3: Commit**

```bash
git commit -m "test(cogs): add unit tests for cost basis, weighted average, FIFO scenarios (TST-P0-4, BUG-W8-4)"
```

### Task 8.5: BUG-W8-5 — Client ledger tests

**Files:**

- Create: `server/routers/__tests__/clientLedger.test.ts`

- [ ] **Step 1: Write unit tests for client ledger: balance calculations, AR/AP accuracy, payment application**

- [ ] **Step 2: Run tests**

- [ ] **Step 3: Commit**

```bash
git commit -m "test(client-ledger): add unit tests for balance calculations, AR/AP, payment application (TST-P0-5, BUG-W8-5)"
```

---

## Wave TEST: E2E Test Infrastructure Fixes (SAFE)

> **Gate**: Deep test suite passes 70+ of 83 tests. Fixes the 42 tests failing due to test infra, not app bugs.
> **Parallelism**: 3 agents
> **Depends on**: Waves 1, 5, 6 (app bugs must be fixed first)

### Task TEST.1: Fix `findBatchWithStock` helper

**Files:**

- Modify: `tests-e2e/utils/e2e-business-helpers.ts:97-127`

The helper checks `batch.onHandQty > 0` but `onHandQty` represents available-after-allocations. The real issue: the batch's `onHandQty` is reported > 0 but `availableQty` (after reservedQty) is 0. The helper doesn't account for reservations.

- [ ] **Step 1: Add `reservedQty` to `StockBatch` type and mapping function**

The `StockBatch` interface and the `.map()` at lines 107-120 must include `reservedQty`. Add:

```typescript
// In StockBatch interface:
reservedQty: number;

// In the mapping function (line ~112-119):
reservedQty: toNumber(batch.reservedQty),
```

Without this step, Step 2 will cause TypeScript errors.

- [ ] **Step 2: Update the filter predicate to account for reservations**

```typescript
.find(
  (batch): batch is StockBatch =>
    !!batch &&
    batch.batchStatus === "LIVE" &&
    batch.totalQty > 0 &&
    batch.onHandQty > 0 &&
    // Ensure actual available quantity (onHand minus reserved) is positive
    (batch.onHandQty - (batch.reservedQty ?? 0)) > 0
);
```

- [ ] **Step 3: Sort batches by available qty descending — pick the batch with the most stock**

```typescript
.sort((a, b) => {
  const aAvail = (a?.onHandQty ?? 0) - (a?.reservedQty ?? 0);
  const bAvail = (b?.onHandQty ?? 0) - (b?.reservedQty ?? 0);
  return bAvail - aAvail;
})
.find(/* ... */);
```

- [ ] **Step 4: Run `pnpm check`**

- [ ] **Step 5: Commit**

```bash
git commit -m "fix(e2e): findBatchWithStock accounts for reservedQty — prevents 0-available selection (TEST-INFRA)"
```

### Task TEST.2: Fix test isolation — unique batch per test

**Files:**

- Modify: Each spec file that creates orders (negative-paths, financial-integrity, state-machines, etc.)

The problem: all tests target the same batch. First test consumes remaining stock, rest fail.

- [ ] **Step 1: Change each test to call `findBatchWithStock()` independently rather than sharing a batch from `beforeAll`**

Or: create a test helper that creates a small test batch with known stock via the inventory intake API before each test.

- [ ] **Step 2: Add a `createTestBatchWithStock(page, qty)` helper if the API supports creating test batches**

Alternative: use `beforeEach` instead of `beforeAll` for batch selection, accepting the performance trade-off.

- [ ] **Step 3: Run the full E2E suite to verify improvement**

- [ ] **Step 4: Commit**

```bash
git commit -m "fix(e2e): improve test isolation — each test finds/creates its own batch (TEST-INFRA)"
```

### Task TEST.3: Fix order status flow in financial-integrity tests

**Files:**

- Modify: `tests-e2e/golden-flows/` test files that call `invoices.generateFromOrder`

Tests assume `orders.create` → `invoices.generateFromOrder` works, but the app requires `READY_FOR_PACKING`, `PACKED`, or `SHIPPED` status first.

- [ ] **Step 1: Add intermediate status transitions before invoice generation**

```typescript
// After creating order:
await trpcMutation(page, "orders.confirm", { orderId });
// After confirming — if generateFromOrder needs READY_FOR_PACKING+:
await trpcMutation(page, "orders.updateFulfillmentStatus", {
  orderId,
  status: "READY_FOR_PACKING",
});
// Now generate invoice:
await trpcMutation(page, "invoices.generateFromOrder", { orderId });
```

- [ ] **Step 2: Run affected tests**

- [ ] **Step 3: Commit**

```bash
git commit -m "fix(e2e): add order status transitions before invoice generation (TEST-INFRA)"
```

### Task TEST.4: Investigate payment validation test failures

**Files:**

- Investigate: E2E test files for negative-paths spec (payment tests)

Three test failures reported server validation missing, but server code already has these guards:

1. `paymentMethod: z.enum(...)` — already validates at Zod level (`payments.ts:66`)
2. DRAFT invoice guard — already present (`payments.ts:308-314`)
3. Overpayment tolerance — already enforced (`payments.ts:334-341`)

- [ ] **Step 1: Read the failing test code to understand what endpoint it calls**

The tests may be calling a different endpoint (e.g., `accounting.recordPayment` instead of `payments.recordPayment`), using a raw HTTP call that bypasses tRPC/Zod, or constructing the payment input incorrectly.

- [ ] **Step 2: Fix the test to call the correct endpoint with correct setup**

Ensure tests:

- Call `payments.recordPayment` (which has all the guards)
- Create invoice in SENT status before recording payment
- Set `amountDue` correctly on the invoice so overpayment tolerance is properly compared

- [ ] **Step 3: Run the fixed tests**

- [ ] **Step 4: Commit**

```bash
git commit -m "fix(e2e): correct payment validation tests — use proper endpoint and invoice setup (TEST-INFRA)"
```

---

## Wave VID: Screen Recording Findings (COMPLETED)

> **Source**: `CleanShot 2026-03-24 at 23.23.43 2.mp4` — 3:08 screen recording of Evan testing pilot surfaces on staging
> **Method**: 63 frames extracted (3s intervals) + Whisper audio transcription → 3 parallel review agents → adversarial consolidation (44 raw → 14 verified findings)
> **Status**: All 6 HIGH+ issues **fixed and verified** (`pnpm check` + `pnpm lint` + `pnpm build` + 6324 tests pass)

| Task              | VID ID                                      | Severity     | Fix Applied                                                                                         |
| ----------------- | ------------------------------------------- | ------------ | --------------------------------------------------------------------------------------------------- |
| - [x] VID-005     | Debug/release-gate text in production UI    | HIGH/BUG     | Gated all debug text in `PowersheetGrid.tsx` behind `import.meta.env.DEV`                           |
| - [x] VID-001     | ClientCombobox popup reopens on every click | HIGH/BUG     | Added `stopPropagation()` on PopoverTrigger in `client-combobox.tsx`                                |
| - [x] VID-007     | Developer jargon badges visible to users    | MEDIUM/UX    | Removed "Pilot: browser + preview split" badges from all surfaces                                   |
| - [x] VID-002     | Add-to-Sheet flow broken in Sales Sheets    | CRITICAL/BUG | Wired `onSelectionSetChange` to set `selectedInventoryRowId` + made button prominent                |
| - [x] VID-003     | Orders pilot debug text + unwired feeling   | HIGH/BUG     | Gated developer affordance text behind `import.meta.env.DEV`                                        |
| - [x] VID-004+006 | Toolbar clutter + grid too small            | MEDIUM/UX    | Moved secondary actions to overflow dropdown + increased row height to 36px + widened browser panel |

### Remaining VID findings (MEDIUM/LOW — not blocking):

- VID-008 (HIGH/FLOW): Navigation fragmentation — user wants unified create-order flow. Requires architectural design.
- VID-009 (LOW/UX): AG Grid context menu shows raw operations. Suppress with `suppressContextMenu`.
- VID-010 (MEDIUM/VISUAL): Status badges too small across surfaces. Systemic styling issue.
- VID-011 (LOW/UX): KeyboardHintBar cognitive overhead. Default to collapsed.
- VID-012 (MEDIUM/BUG): PO creation Payment Terms field rendering. Needs reproduction.
- VID-013 (LOW/BUG): Matchmaking skeleton loaders persist at zero count.
- VID-014 (LOW/VISUAL): Accounting tab bar text cramped.

---

## Deferred Items (Not in Wave Execution)

These require architectural decisions or larger refactors. Track in Linear:

| ID                 | Finding                                                            | Reason Deferred                                               |
| ------------------ | ------------------------------------------------------------------ | ------------------------------------------------------------- |
| SCH-P0-4           | FK references to deprecated `vendors` table                        | Migration requires coordinated schema change + data migration |
| SCH-P2-1           | 143 tables missing `deletedAt`                                     | Bulk schema migration — needs per-table-group plan            |
| SCH-P2-2           | Mixed column naming conventions                                    | Cosmetic — high effort, low value                             |
| INV-P1-3, INV-P1-4 | `orderLineItemAllocations`/`sampleAllocations` missing `deletedAt` | Schema migration — bundle with SCH-P2-1                       |
| INV-P1-5           | `batches`/`lots` missing `createdBy`/`updatedBy`                   | Schema migration                                              |
| GF-P1-2            | Dual order creation paths (3 ways)                                 | Architectural consolidation — separate spec                   |
| GF-P1-3            | PO receiving is hollow (status flip only)                          | Feature implementation — needs product spec                   |
| SVC-P1-3           | Dual order logic paths (router vs orchestrator)                    | Architectural consolidation                                   |
| SVC-P2-1           | In-memory notification queue                                       | Infrastructure — needs BullMQ migration plan                  |
| RTR-P2-1           | 655 `throw new Error()` instances                                  | Bulk refactor — batch by router                               |
| INV-P2-1           | Dual COGS calculation modules                                      | Needs product decision                                        |
| INV-P2-4           | Floating-point arithmetic for quantities                           | Needs Decimal.js adoption                                     |
| FE-P1-2            | 11 components duplicate client list fetch                          | Frontend optimization sprint                                  |
| FE-P2-\*           | Frontend vendor cleanup, monoliths, a11y                           | Frontend improvement sprint                                   |
| TST-P1-\*          | Broad test coverage gaps                                           | Ongoing — each wave adds tests                                |
| TST-P2-\*          | E2E depth, boundary tests                                          | Ongoing                                                       |
| All P3s            | Low-priority cleanup                                               | Address opportunistically                                     |

---

## Execution Summary

| Wave         | Theme                  | Tasks  | Parallelism | Autonomy | Findings Addressed                                                        |
| ------------ | ---------------------- | ------ | ----------- | -------- | ------------------------------------------------------------------------- |
| **0**        | Security Lockdown      | 4      | 4 agents    | RED      | 4 (P0+P1 security)                                                        |
| **1**        | Soft-Delete Filters    | 5      | 5 agents    | STRICT   | 8 (P0+P1 data leaks)                                                      |
| **2**        | Transaction Safety     | 5      | 5 agents    | RED      | 5 (P0 atomicity + race)                                                   |
| **3**        | Actor Attribution      | 6      | 6 agents    | STRICT   | 12 (P0+P1 forbidden patterns)                                             |
| **4**        | Vendor Eradication     | 5      | 5 agents    | STRICT   | 8 (P0+P1 deprecated usage)                                                |
| **5**        | RBAC Hardening         | 6      | 6 agents    | STRICT   | 7 (P1 permission gaps + 5 test failures)                                  |
| **6**        | Business Logic         | 7      | 7 agents    | STRICT   | 14 (P1+P2 logic + 10 test failures)                                       |
| **7**        | Security Hygiene       | 5      | 5 agents    | STRICT   | 6 (P2+P3 hardening)                                                       |
| **8**        | Test Coverage          | 5      | 5 agents    | SAFE     | 5 (P0 test gaps)                                                          |
| **TEST**     | E2E Test Infra         | 4      | 4 agents    | SAFE     | 42+ test failures (infra) — **runs after W1+W5+W6**                       |
| **VID**      | Screen Recording Fixes | 6      | 3 agents    | STRICT   | 14 video findings — **COMPLETED**                                         |
| **Deferred** | Backlog                | —      | —           | —        | ~50 (schema, arch, P3s)                                                   |
|              | **TOTALS**             | **58** | **max 7**   |          | **~69 direct + ~54 deferred + 14 video = 123 audit + 52 test + 14 video** |

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

## Final Success Criteria

- Deep test suite: **75+ of 83 tests pass** (from 27 currently)
- Audit findings: **69 of 123 directly addressed** (remainder deferred with Linear tracking)
- Zero P0 findings remaining
- All RBAC test failures fixed
- All payment/invoice validation test failures fixed
- All state machine test failures fixed

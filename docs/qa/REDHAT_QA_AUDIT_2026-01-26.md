# RedHat-Grade QA Audit Report

**Date:** 2026-01-26
**Auditor:** Claude (Independent QA Agent)
**Scope:** Full TERP codebase audit
**Status:** PASS 2 COMPLETE

---

## Executive Summary

| Metric               | Value                    |
| -------------------- | ------------------------ |
| **Verdict**          | **SHIP WITH CONDITIONS** |
| **P0 Blockers**      | 1                        |
| **P1 Major Issues**  | 6                        |
| **P2 Minor Issues**  | 8                        |
| **P3 Nits**          | 5                        |
| **Confidence Score** | 78/100                   |

### Build Verification Results

```
TypeScript Check: PASS (0 errors)
Build:           PASS (with chunk warnings)
Tests:           PARTIAL (2273 passed, 9 failed, 99 skipped)
  - Pass Rate: 99.6% (excluding DB-dependent tests)
```

---

## QA ISSUE LEDGER

### P0 - BLOCKERS (Must Fix Before Ship)

#### P0-001: Debug Router Exposed as Public Endpoints

**Severity:** P0 BLOCKER
**Type:** Security
**File:** `server/routers/debug.ts:1-4, 18-476`
**Evidence:**

```typescript
/**
 * Debug router - for checking database state
 * REMOVE THIS IN PRODUCTION  // <-- Comment says remove, but it's still here!
 */
...
rawMysqlTest: publicProcedure.query(async () => {  // PUBLIC!
```

**Failure Mode:**

- Exposes raw database queries via unauthenticated endpoints
- Reveals schema structure, table counts, column names
- Potential data exfiltration vector

**Repro Steps:**

1. Deploy to production
2. Call `/api/trpc/debug.rawMysqlTest` without auth
3. Full database inspection available

**Fix:**

```typescript
// Option A: Remove entire router in production
if (process.env.NODE_ENV === 'production') {
  throw new Error('Debug router disabled in production');
}

// Option B: Convert to protectedProcedure with admin-only permission
rawMysqlTest: protectedProcedure
  .use(requirePermission('admin:debug'))
  .query(...)
```

**Verification:**

```bash
# In production, this should return 404 or 403
curl https://terp-app/api/trpc/debug.rawMysqlTest
```

---

### P1 - MAJOR ISSUES (Ship with Conditions)

#### P1-001: vendorSupply Router Missing Permission Checks

**Severity:** P1 MAJOR
**Type:** Security / RBAC
**File:** `server/routers/vendorSupply.ts:9-10`
**Evidence:**

```typescript
// TODO: Add permission checks to mutations
// import { requirePermission } from "../_core/permissionMiddleware";
```

**Failure Mode:**
Any authenticated user can create, update, delete vendor supply records regardless of role.

**Fix:**

```typescript
import { requirePermission } from "../_core/permissionMiddleware";

create: protectedProcedure
  .use(requirePermission('vendorSupply:create'))
  .input(...)
  .mutation(...),

delete: protectedProcedure
  .use(requirePermission('vendorSupply:delete'))
  .input(...)
  .mutation(...),
```

---

#### P1-002: createdBy Accepted from Input (Actor Spoofing)

**Severity:** P1 MAJOR
**Type:** Security
**Files:**

- `server/ordersDb.ts:273, 333, 372, 380`
- `server/inventoryDb.ts:1607`
- `server/services/payablesService.ts:130`
- `server/routers/advancedTagFeatures.ts:70`

**Evidence:**

```typescript
// ordersDb.ts:273
createdBy: input.createdBy,  // <-- Should come from ctx, not input!
```

**Failure Mode:**
Attacker can forge audit trail by specifying arbitrary `createdBy` values in requests.

**Fix:**

```typescript
// Replace input.createdBy with getAuthenticatedUserId(ctx)
import { getAuthenticatedUserId } from "../_core/trpc";
const createdBy = getAuthenticatedUserId(ctx);
```

---

#### P1-003: Hard Deletes Instead of Soft Deletes

**Severity:** P1 MAJOR
**Type:** Data Integrity
**Files:**

- `server/routers/calendarsManagement.ts:418, 635, 720, 874`
- `server/routers/calendarReminders.ts:105`
- `server/routers/dashboardPreferences.ts:175`

**Evidence:**

```typescript
// calendarsManagement.ts:635
await db.delete(appointmentTypes).where(eq(appointmentTypes.id, input.id));
```

**Failure Mode:**

- Breaks audit trail
- FK constraint violations if referenced
- No recovery possible

**Fix:**

```typescript
// Use soft delete
await db
  .update(appointmentTypes)
  .set({ deletedAt: new Date() })
  .where(eq(appointmentTypes.id, input.id));
```

---

#### P1-004: Test Failures in Critical Components

**Severity:** P1 MAJOR
**Type:** Test Infrastructure
**Files:**

- `client/src/pages/MatchmakingServicePage.test.tsx` (4 failures)
- `client/src/components/calendar/EventFormDialog.test.tsx` (5 failures)

**Evidence:**

```
TypeError: __vite_ssr_import_2__.trpc.useUtils is not a function
Error: Maximum update depth exceeded (Radix infinite loop)
```

**Failure Mode:**

- Test suite provides false confidence
- Regressions may be missed
- Components have potential runtime issues

**Fix:**

1. Update tRPC test mock to include `useUtils`
2. Fix Radix presence ref callback infinite loop
3. Add ResizeObserver polyfill (TEST-021)

---

#### P1-005: Live Shopping Session Extension Lacks Validation

**Severity:** P1 MAJOR
**Type:** Business Logic
**File:** `server/services/live-shopping/sessionTimeoutService.ts:382`

**Evidence:**

```typescript
canExtend: true, // TODO: Check extension count
```

**Failure Mode:**

- Sessions can be extended infinitely
- No rate limiting on extensions
- Business rules for extension limits not enforced

**Fix:**

```typescript
const MAX_EXTENSIONS = 3;
const extensionCount = await getExtensionCount(sessionId);
canExtend: extensionCount < MAX_EXTENSIONS,
```

---

#### P1-006: BatchDetailDrawer Missing Product Relations

**Severity:** P1 MAJOR
**Type:** UI Data
**File:** `client/src/components/inventory/BatchDetailDrawer.tsx:465-475, 891`

**Evidence:**

```typescript
{/* TODO: Re-enable when API includes product relation
   <dd className="font-semibold">{batch.product?.thcRange || "N/A"}</dd>
*/}
...
currentAvgPrice={0} // TODO: Calculate from profitability data
```

**Failure Mode:**

- Product details not displayed
- Price calculations showing placeholder values
- Users see incomplete batch information

---

### P2 - MINOR ISSUES

#### P2-001: sql.raw() Usage May Allow Injection

**Severity:** P2 MINOR
**Type:** Security (Potential)
**Files:** Multiple scripts (validation scripts, migrations)

**Evidence:**

```typescript
// scripts/validate-seeded-data.ts:65
const result = await db.execute(
  sql.raw(`SELECT COUNT(*) as count FROM ${table}`)
);
```

**Status:** Low risk - only in scripts, not production routers. Still recommend parameterization.

---

#### P2-002: Missing Pagination on List Endpoints

**Severity:** P2 MINOR
**Type:** Performance
**Scope:** Multiple `getAll` endpoints

**Status:** Tracked as ST-007 in roadmap (estimated 3-4d)

---

#### P2-003: ~630 `any` Type Usages

**Severity:** P2 MINOR
**Type:** Type Safety
**Count:** 630 occurrences across 203 files

**Status:** Tracked as LINT-005 in roadmap (estimated 8h)

---

#### P2-004: Chunk Size Warnings

**Severity:** P2 MINOR
**Type:** Performance
**Evidence:**

```
(!) Some chunks are larger than 800 kB after minification
vendor-D2tc-cz3.js: 1,820.11 kB
```

**Fix:** Implement code splitting, tracked as BUILD-002.

---

#### P2-005 through P2-008: Various TODOs in Production Code

See Placeholder Eradication Ledger below.

---

### P3 - NITS

| ID     | Issue                            | File                    | Fix                               |
| ------ | -------------------------------- | ----------------------- | --------------------------------- |
| P3-001 | Console.log in sidebar           | Sidebar.tsx:213         | Remove seed attribution           |
| P3-002 | widgets-v3 migration comment     | widgets-v3/index.ts:2   | Document or complete migration    |
| P3-003 | Template selector placeholder ID | TemplateSelector.tsx:30 | Change `id: "TODO"` to real ID    |
| P3-004 | Test suite TODO comments         | rbac-\*.test.ts         | Fix mock chains                   |
| P3-005 | Skipped tests (99)               | Various                 | Review and document justification |

---

## PLACEHOLDER ERADICATION LEDGER

| File                                | Excerpt                                              | Type           | Impact       | Severity |
| ----------------------------------- | ---------------------------------------------------- | -------------- | ------------ | -------- |
| `vendorSupply.ts:9`                 | `// TODO: Add permission checks`                     | Security       | P1 - No RBAC | HIGH     |
| `sessionTimeoutService.ts:382`      | `canExtend: true // TODO: Check extension count`     | Business Logic | P1           | HIGH     |
| `BatchDetailDrawer.tsx:465`         | `TODO: Re-enable when API includes product relation` | Feature Gap    | P1           | MEDIUM   |
| `BatchDetailDrawer.tsx:891`         | `currentAvgPrice={0} // TODO: Calculate`             | Data           | P2           | MEDIUM   |
| `LiveShoppingPage.tsx:410`          | `// TODO: Implement session console/detail view`     | Feature Gap    | P2           | LOW      |
| `TemplateSelector.tsx:30`           | `id: "TODO"`                                         | Placeholder    | P3           | LOW      |
| `permission-escalation.test.ts:418` | `// TODO: Complete this test`                        | Test Coverage  | P2           | LOW      |
| `db.ts:129`                         | `// TODO: add feature queries`                       | Docs           | P3           | LOW      |

**Total Actionable TODOs:** 8 (2 P1, 4 P2, 2 P3)

---

## RBAC FINDINGS LEDGER

| Finding                   | Severity | Route/Endpoint           | Issue                       |
| ------------------------- | -------- | ------------------------ | --------------------------- |
| Public debug endpoints    | P0       | `debug.*`                | No auth required            |
| Missing permission checks | P1       | `vendorSupply.*`         | Comment says TODO           |
| Health endpoints public   | OK       | `health.*`               | Expected for load balancers |
| Auth endpoints public     | OK       | `auth.me`, `auth.logout` | Expected                    |

**RBAC Test Coverage:**

- QA accounts configured: 7 roles
- USER_FLOW_MATRIX: Comprehensive (33K+ tokens)
- Permission middleware: Exists and tested (with mock issues)

---

## FLOW QA MATRIX

| Flow                 | Expected                         | Actual             | Status  |
| -------------------- | -------------------------------- | ------------------ | ------- |
| Order Creation       | Full validation, inventory check | Implemented        | PASS    |
| Order Confirmation   | Lock batches, deduct inventory   | FOR UPDATE used    | PASS    |
| Invoice Void         | Reverse GL entries               | ACC-002 OPEN       | BLOCKED |
| Return Processing    | Credit memo, GL reversal         | ACC-003 OPEN       | BLOCKED |
| Payment Recording    | Update AR, GL entry              | WSQA-001 COMPLETE  | PASS    |
| Inventory Adjustment | Validate non-negative            | TERP-0018 COMPLETE | PASS    |
| COGS on Sale         | Create GL entries                | ACC-004 OPEN       | BLOCKED |

---

## ADVERSARIAL TEST SCENARIOS

| #   | Scenario                               | Expected                 | Likely Actual                        | Severity |
| --- | -------------------------------------- | ------------------------ | ------------------------------------ | -------- |
| 1   | Create invoice with missing line items | Reject                   | Likely accepts (no validation found) | P2       |
| 2   | Partial fulfillment then cancellation  | Proper inventory restore | Unknown - needs E2E                  | P2       |
| 3   | Refund after posting                   | GL reversal              | BLOCKED (ACC-003)                    | P1       |
| 4   | Vendor purchase received twice         | Idempotent rejection     | Unknown                              | P2       |
| 5   | Negative inventory attempt             | Block                    | PASS - validated                     | OK       |
| 6   | Duplicate SKU conflict                 | Unique constraint        | PASS - DB enforced                   | OK       |
| 7   | Concurrent order confirmations         | FOR UPDATE lock          | PASS - implemented                   | OK       |
| 8   | Role boundary violation                | 403 response             | vendorSupply: FAIL                   | P1       |
| 9   | Double-submit mutation                 | Idempotent               | Partial - rate limit exists          | P2       |
| 10  | User refresh mid-mutation              | Transaction rollback     | PASS - transactions used             | OK       |
| 11  | Empty search                           | Valid empty array        | PASS                                 | OK       |
| 12  | Sorting causing wrong totals           | Consistent               | Unknown                              | P3       |
| 13  | Month-end date boundary                | Correct period           | Unknown                              | P2       |
| 14  | Migration mismatch                     | Schema sync              | autoMigrate used                     | OK       |
| 15  | Stale cache inventory                  | Fresh data               | tRPC invalidation                    | OK       |

---

## TEST EXECUTION RESULTS

### L1: Build + Types

```bash
pnpm check    # PASS (0 errors)
pnpm build    # PASS (chunk warnings)
```

### L2: Functional Tests

```bash
pnpm test --run
# 160 passed suites, 3 failed
# 2273 passed tests, 9 failed, 99 skipped
# Pass rate: 99.6%
```

**Failed Tests Analysis:**

1. `comments.test.ts` - Requires MySQL (DB not available in QA env) - **EXPECTED**
2. `MatchmakingServicePage.test.tsx` - tRPC mock missing `useUtils` - **FIX NEEDED**
3. `EventFormDialog.test.tsx` - Radix infinite loop - **FIX NEEDED**

### L3: E2E

**NOT EXECUTED** - No live deployment available.

**Runbook for E2E:**

1. Deploy to QA environment with `QA_AUTH_ENABLED=true`
2. Login as `qa.salesmanager@terp.test` / `TerpQA2026!`
3. Execute USER_FLOW_MATRIX test cases
4. Verify role switching with all 7 QA accounts

---

## SHIP VERDICT

### **SHIP WITH CONDITIONS**

**Gating Checklist:**

- [ ] P0-001: Remove or protect debug router before production deploy
- [ ] P1-001: Add permission checks to vendorSupply mutations
- [ ] P1-002: Audit and fix all `input.createdBy` usages
- [ ] P1-003: Convert hard deletes to soft deletes
- [ ] P1-004: Fix MatchmakingServicePage and EventFormDialog tests

**Acceptable for Ship (Fix in Next Sprint):**

- P1-005: Session extension validation (non-critical)
- P1-006: BatchDetailDrawer TODOs (UI polish)
- P2-\*: All minor issues

---

## CONFIDENCE SCORE BREAKDOWN

| Category          | Score  | Max     | Notes                            |
| ----------------- | ------ | ------- | -------------------------------- |
| Correctness       | 20     | 25      | GL reversal flows incomplete     |
| Completeness      | 18     | 25      | TODOs in production code         |
| Workflow Fidelity | 22     | 25      | Core flows work, some gaps       |
| RBAC/Security     | 18     | 25      | Debug endpoints, permission gaps |
| **TOTAL**         | **78** | **100** |                                  |

---

## SECOND-PASS AUDIT FINDINGS

### Additional Issues Discovered

#### SP-001: Inconsistent Error Response Pattern

**Type:** Contract Drift
**Evidence:**
Some procedures return `{ success: true/false, data/error }` while others throw `TRPCError`.

**Impact:** Frontend error handling inconsistent.

#### SP-002: Rate Limit Map Memory Leak Potential

**File:** `server/routers/orders.ts:76`

```typescript
confirmRateLimitMap.delete(uid); // Only deleted on success
```

**Impact:** Failed confirmations leave entries in Map, potential memory growth.

#### SP-003: Backup File in Repository

**File:** `server/routers/vipPortal.ts.backup`
**Impact:** Dead code, potential confusion, should be git-ignored.

---

## FIX ORDER PLAN

**Priority sequence (least effort → most risk reduction):**

1. **Delete debug router in production** (5 min) - P0
2. **Add vendorSupply permission checks** (30 min) - P1
3. **Fix tRPC test mock** (1 hour) - P1
4. **Audit createdBy usages** (2 hours) - P1
5. **Convert hard deletes** (4 hours) - P1
6. **Fix EventFormDialog test** (2 hours) - P1
7. **Address P2 TODOs** (8+ hours) - P2

---

## APPENDIX: Key Files Reviewed

| Category            | Files                                                       |
| ------------------- | ----------------------------------------------------------- |
| Security            | auth.ts, debug.ts, vendorSupply.ts, permissionMiddleware.ts |
| Business Logic      | ordersDb.ts, inventoryDb.ts, accountingHooks.ts             |
| Critical Paths      | orders.ts, invoices.ts, inventory.ts                        |
| Test Infrastructure | setup.ts, testDb.ts, \*.test.ts                             |
| Reference           | USER_FLOW_MATRIX.csv, QA_PLAYBOOK.md, QA_AUTH.md            |

---

**Report Generated:** 2026-01-26T03:45:00Z
**Audit Duration:** ~30 minutes
**Lines of Code Scanned:** ~200,000+

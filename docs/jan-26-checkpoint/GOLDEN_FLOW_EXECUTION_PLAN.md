# Golden Flow Complete Execution Plan

**Date:** January 27, 2026
**Owner:** Evan Tenenbaum (Human Operator)
**Total Estimated Agent Hours:** ~150h
**Recommended Timeline:** 2-3 weeks with parallel agent execution

---

## Executive Summary

The Golden Flow consists of three core business paths that must work flawlessly:

| Flow | Description                        | Current Status              |
| ---- | ---------------------------------- | --------------------------- |
| GF-1 | Direct Intake → Inventory          | ✅ COMPLETE                 |
| GF-2 | Client → Order → Invoice           | ✅ COMPLETE                 |
| GF-3 | Invoice → Payment → Reconciliation | ✅ COMPLETE (WSQA-001 done) |

**However**, the investigation revealed systemic issues affecting all flows:

- Schema drift causing SQL failures (14 vulnerable locations)
- SQL safety issues (127 unsafe `inArray()` calls)
- Security vulnerabilities (4 P0 issues)
- Financial integrity gaps (race conditions, missing GL entries)

This plan addresses **everything** needed for production-ready Golden Flow.

---

## Work Breakdown Structure

### Phase 0: Immediate Hotfixes (DAY 1)

> **Goal:** Stabilize current broken features

| Sprint | Tasks                                   | Agent Hours | Risk | Parallelizable |
| ------ | --------------------------------------- | ----------- | ---- | -------------- |
| 0A     | BUG-110 to BUG-115 (Schema drift fixes) | 8h          | LOW  | Yes (5 agents) |
| 0B     | PERF-001 (Empty catch blocks)           | 15m         | LOW  | Yes            |

**Your Action (Single Prompt):**

```
Execute Sprint 0A and 0B in parallel:

Sprint 0A: Fix BUG-110 through BUG-115 using the try-catch fallback
pattern from commit e31cf61. Each fix should be a separate commit.

Sprint 0B: Fix PERF-001 - empty catch blocks in usePerformanceMonitor.ts
at lines 375, 387, 403. Add proper error logging.

Run pnpm check && pnpm lint && pnpm test after all changes.
```

**Verification:** Test Inventory page, Photography Queue, Sales Order Creator

---

### Phase 1: Security Hardening (DAY 2)

> **Goal:** Close security vulnerabilities before any other work

| Task    | Description                     | Agent Hours | Dependencies |
| ------- | ------------------------------- | ----------- | ------------ |
| SEC-027 | Protect adminSetup endpoints    | 1h          | None         |
| SEC-028 | Remove/restrict debug endpoints | 1h          | None         |
| SEC-029 | Fix default permission grants   | 2h          | None         |
| SEC-030 | Fix VIP portal token validation | 2h          | None         |

**Your Action:**

```
Execute Phase 1 Security Sprint:

Fix SEC-027, SEC-028, SEC-029, SEC-030 as documented in MASTER_ROADMAP.md.
These are security-critical - apply STRICT verification mode.

SEC-027: Change adminSetup endpoints from publicProcedure to protectedProcedure
SEC-028: Remove debug.ts endpoints or require Super Admin auth
SEC-029: Fix permissionService.ts default grants
SEC-030: Add UUID validation to vipPortal.ts token handling

Create separate commits for each. Run full test suite after each.
```

**Verification:** Security audit of changed endpoints

---

### Phase 2: Financial Integrity (DAYS 3-5)

> **Goal:** Ensure all money operations are correct and atomic

#### Sprint 2A: Order/Inventory Integrity (16h)

| Task    | Description                                    | Hours | Status |
| ------- | ---------------------------------------------- | ----- | ------ |
| INV-001 | Inventory deduction on ship/fulfill            | 4h    | ready  |
| INV-002 | Fix race condition in draft order confirmation | 2h    | ready  |
| INV-003 | Add FOR UPDATE lock in batch allocation        | 2h    | ready  |
| ORD-001 | Fix invoice creation timing                    | 4h    | ready  |
| FIN-001 | Fix invoice number race condition              | 2h    | ready  |
| BUG-115 | Empty array crash (if not done in Phase 0)     | 1h    | ready  |

**Your Action:**

```
Execute Sprint 2A - Order/Inventory Integrity:

This is RED MODE work - financial operations require maximum caution.

Fix INV-001, INV-002, INV-003, ORD-001, and FIN-001 as documented in
MASTER_ROADMAP.md section "QA Destructive Testing Findings".

Key patterns:
- Add FOR UPDATE locks where noted
- Wrap multi-step operations in transactions
- Add proper error handling - no silent failures

Verify each fix with targeted test before proceeding to next.
```

#### Sprint 2B: Error Handling (12h)

| Task   | Description                                       | Hours | Dependencies |
| ------ | ------------------------------------------------- | ----- | ------------ |
| ST-050 | Fix silent error handling in RED mode paths       | 4h    | None         |
| ST-051 | Add transaction boundaries to critical operations | 8h    | ST-050       |

**Your Action:**

```
Execute Sprint 2B - Error Handling:

ST-050: Find and fix silent error handling in ordersDb.ts and services/.
Every catch block must either throw, log with severity, or return error.

ST-051: Add transaction boundaries to these operations:
- Order confirmation flow
- Inventory allocation
- Invoice creation
- Payment recording

Apply the withTransaction wrapper pattern from DI-001.
```

---

### Phase 3: SQL Safety Campaign (DAYS 6-8)

> **Goal:** Eliminate systemic crash risk from empty arrays

| Task    | Description                             | Hours | Files     |
| ------- | --------------------------------------- | ----- | --------- |
| BUG-116 | Audit all 127 inArray calls             | 8h    | Multiple  |
| ST-055  | Replace with safeInArray/safeNotInArray | 16h   | 40+ files |

**Batch Execution Strategy:**

| Batch | Files                     | Hours | Risk Level |
| ----- | ------------------------- | ----- | ---------- |
| 3A    | ordersDb.ts, orders.ts    | 4h    | HIGH (RED) |
| 3B    | inventoryDb.ts, arApDb.ts | 4h    | HIGH (RED) |
| 3C    | All router files          | 4h    | MEDIUM     |
| 3D    | All remaining files       | 4h    | LOW        |

**Your Action (One per batch):**

```
Execute Batch 3A - Critical Path inArray Safety:

Replace all inArray() and notInArray() calls in server/ordersDb.ts
and server/routers/orders.ts with safeInArray() and safeNotInArray()
from server/lib/sqlSafety.ts.

Pattern:
- import { safeInArray, safeNotInArray } from '../lib/sqlSafety';
- Replace: inArray(col, arr) → safeInArray(col, arr)
- Replace: notInArray(col, arr) → safeNotInArray(col, arr)

Run pnpm test after each file. Create one commit per file.
```

---

### Phase 4: Type Safety & Test Infrastructure (DAYS 9-12)

> **Goal:** Reduce runtime errors, increase test coverage

#### Sprint 4A: TypeScript Cleanup (20h)

| Task   | Description                           | Hours  | Impact          |
| ------ | ------------------------------------- | ------ | --------------- |
| TS-001 | Fix 117 TypeScript errors             | 16-24h | Build stability |
| ST-053 | Eliminate `any` types (515 instances) | 16h    | Type safety     |
| ST-054 | Fix `any` in core infrastructure      | 4h     | Foundation      |

**Your Action:**

```
Execute Sprint 4A in priority order:

1. ST-054 first (4h) - Fix any types in:
   - featureFlagMiddleware.ts
   - monitoring.ts
   - connectionPool.ts
   - rateLimiter.ts

2. TS-001 next (16h) - Fix 117 TypeScript errors.
   Work file-by-file, commit after each file passes pnpm check.

3. ST-053 (16h) - Prioritize any types in:
   - RED mode paths (orders, inventory, accounting)
   - Then all other files
```

#### Sprint 4B: Test Infrastructure (16h)

| Task          | Description                    | Hours | Unblocks  |
| ------------- | ------------------------------ | ----- | --------- |
| TEST-INFRA-03 | Fix tRPC router initialization | 4h    | ~16 tests |
| TEST-INFRA-04 | Create test fixtures/factories | 8h    | ~30 tests |
| TEST-INFRA-05 | Fix async element detection    | 4h    | ~12 tests |

**Your Action:**

```
Execute Sprint 4B - Test Infrastructure:

TEST-INFRA-03: Fix tRPC mock initialization in test environment.
The mock doesn't properly initialize router context.

TEST-INFRA-04: Create comprehensive test fixtures in __tests__/fixtures/.
Use factory pattern for: clients, orders, invoices, products, batches.

TEST-INFRA-05: Replace getBy* with findBy* for async elements.
Search for getByText/getByRole where element appears after render.
```

---

### Phase 5: Backend API Completion (DAYS 13-15)

> **Goal:** Complete missing backend functionality

| Task      | Description                       | Hours | Impact               |
| --------- | --------------------------------- | ----- | -------------------- |
| BE-QA-006 | Implement AR/AP summary endpoints | 8h    | Accounting dashboard |
| BE-QA-007 | Implement cash expenses endpoints | 8h    | Expense tracking     |
| BE-QA-008 | Implement financial reports       | 16h   | P&L, Balance Sheet   |
| QUAL-008  | Add feature flag checks to routes | 4h    | Feature gating       |

**Your Action:**

```
Execute Phase 5 - Backend Completion:

Implement BE-QA-006, BE-QA-007, BE-QA-008 as full tRPC procedures.
Follow existing patterns in server/routers/accounting.ts.

Each endpoint needs:
- Input validation (zod schema)
- Authentication (protectedProcedure)
- Proper error handling
- Unit tests

QUAL-008: Add feature flag middleware to routes that need gating.
```

---

### Phase 6: Frontend Polish (DAYS 16-18)

> **Goal:** Fix remaining UI issues

| Task      | Description                                  | Hours | Impact            |
| --------- | -------------------------------------------- | ----- | ----------------- |
| TYPE-001  | Fix `as any` casts in Golden Flow components | 4h    | Type safety       |
| NAV-017   | Route CreditsPage in App.tsx                 | 1h    | Navigation        |
| FE-QA-009 | Enable VendorSupplyPage creation             | 8h    | Vendor management |
| FE-QA-010 | Wire MatchmakingServicePage buttons          | 4h    | Matchmaking       |

**Your Action:**

```
Execute Phase 6 - Frontend Polish:

Fix frontend issues in order of impact:
1. NAV-017 (1h) - Simple routing fix
2. TYPE-001 (4h) - Remove as any casts in golden flow components
3. FE-QA-009 (8h) - Enable vendor supply page CRUD
4. FE-QA-010 (4h) - Wire action buttons in matchmaking
```

---

### Phase 7: Prevention & Monitoring (DAYS 19-20)

> **Goal:** Prevent future regressions

| Task         | Description                         | Hours  | Type       |
| ------------ | ----------------------------------- | ------ | ---------- |
| ESLint Rule  | Flag raw inArray() usage            | 2h     | Prevention |
| Schema Check | Startup warning for missing columns | 4h     | Detection  |
| BUG-100      | Fix remaining 122 failing tests     | 24-40h | Coverage   |

**Your Action:**

```
Execute Phase 7 - Prevention:

1. Add ESLint rule to eslint.config.js that flags:
   - Direct import of inArray/notInArray from drizzle-orm
   - Suggests using safeInArray/safeNotInArray instead

2. Add schema drift detection in server startup:
   - Compare Drizzle schema columns to actual DB
   - Log warnings for any missing columns
   - Don't block startup, just warn

3. BUG-100: Work through failing tests systematically.
   Prioritize tests for golden flow components.
```

---

## Consolidated Timeline

```
Week 1:
├── Day 1: Phase 0 (Hotfixes) - 8h
├── Day 2: Phase 1 (Security) - 6h
├── Days 3-5: Phase 2 (Financial Integrity) - 28h

Week 2:
├── Days 6-8: Phase 3 (SQL Safety) - 24h
├── Days 9-12: Phase 4 (Type Safety & Tests) - 36h

Week 3:
├── Days 13-15: Phase 5 (Backend APIs) - 36h
├── Days 16-18: Phase 6 (Frontend) - 17h
├── Days 19-20: Phase 7 (Prevention) - 30h
```

---

## Risk Mitigation

### Rollback Strategy

All changes should be atomic and revertable:

- One commit per fix
- Each commit passes all tests
- Deployment after each phase, not after all phases

### Dependencies

```
Phase 0 ──→ Phase 2A (inventory fixes need schema drift fixes)
Phase 1 ──→ (no blockers - security is independent)
Phase 2A ──→ Phase 2B (transaction boundaries need error handling first)
Phase 3 ──→ (no blockers - can run parallel with Phase 4)
Phase 4 ──→ Phase 5 (backend needs type safety foundation)
Phase 5 ──→ Phase 6 (frontend needs backend endpoints)
```

### Parallel Execution Opportunities

| Phases | Can Run Together | Notes                       |
| ------ | ---------------- | --------------------------- |
| 0A, 0B | Yes              | Different files             |
| 1, 3A  | Yes              | Security vs SQL safety      |
| 4A, 4B | Partially        | TS-001 before TEST-INFRA-03 |
| 5, 6   | No               | Frontend depends on backend |

---

## What You (Evan) Need To Do

### Per Phase

1. **Review the prompt** - Copy/paste to agent session
2. **Review the PR** - ~10-15 min per phase
3. **Spot-check production** - After each phase deploys

### Time Investment

| Activity         | Per Phase  | Total        |
| ---------------- | ---------- | ------------ |
| Prompt writing   | 5 min      | 35 min       |
| PR review        | 15 min     | 105 min      |
| Production check | 10 min     | 70 min       |
| **Total**        | **30 min** | **~4 hours** |

### Go/No-Go Decisions

After each phase, decide:

- ✅ Continue to next phase
- ⏸️ Pause for manual testing
- 🔄 Rollback if issues found

---

## Success Criteria

### Phase 0 Complete When:

- [ ] Inventory page shows inventory
- [ ] Photography Queue loads without SQL error
- [ ] Sales Order Creator can load inventory
- [ ] Global search works

### Phase 1 Complete When:

- [ ] adminSetup endpoints require auth
- [ ] Debug endpoints protected/removed
- [ ] New user permissions are minimal
- [ ] VIP tokens validated properly

### Phase 2 Complete When:

- [ ] Orders can be confirmed without race conditions
- [ ] Inventory deducts on fulfillment
- [ ] Invoice numbers are unique
- [ ] All operations are atomic

### Phase 3 Complete When:

- [ ] No raw inArray() calls in RED mode paths
- [ ] All 127 calls replaced with safe versions
- [ ] Tests pass with empty array edge cases

### All Phases Complete When:

- [ ] All 3 Golden Flows pass E2E testing
- [ ] pnpm check passes (0 TypeScript errors)
- [ ] pnpm test passes (>95% pass rate)
- [ ] Production logs show no errors for 24h

---

## Quick Start

**Ready to begin?** Run Phase 0 first:

```
Fix BUG-110 through BUG-115 using the try-catch fallback pattern
from commit e31cf61 in photography.ts and salesSheetsDb.ts.

Also fix PERF-001 - empty catch blocks in usePerformanceMonitor.ts.

Each bug fix should be a separate commit. Run verification after each.
```

After Phase 0 deploys and verifies, proceed to Phase 1.

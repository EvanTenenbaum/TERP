# PR #366 Integration Tasks - Test/Lint Signal Recovery

**Source:** PR #366 - CTO Triage Report for Lint/Test Sweep (2026-02-02)
**Analysis:** Codex API analysis prioritizing inventory (GF-007) and golden flow unblocking
**Integration Date:** 2026-02-02
**Status:** IN PROGRESS (WAVE-2026-02-02-A)

---

## Executive Summary

PR #366 identified critical test infrastructure and lint issues that must be addressed to ensure reliable CI/CD gates and support golden flow verification. This document defines tasks to integrate these findings into the roadmap.

**Key Findings:**

- **1842 lint errors** and **264 warnings** across the codebase
- **2 test failures** due to infrastructure issues (not code bugs)
- Test infrastructure instability blocks CI trust and golden flow verification

**Integration Strategy:**

- Insert **Test/Lint Signal Recovery** track as Phase 3.5 (between RBAC Verification and E2E Automation)
- P0 tasks restore test signal (prerequisite for Phase 4 E2E work)
- P1 tasks target inventory/product modules to support GF-007
- P2 tasks deferred to Phase 5 (Beta Hardening)

---

## Phase 3.5: Test/Lint Signal Recovery (Days 15-17)

**Objective:** Restore reliable test signal and address critical lint debt affecting golden flows.
**Mode:** STRICT
**Gate Criteria:** `pnpm test` passes without infrastructure failures; inventory-related lint violations eliminated.
**Priority:** CRITICAL - Must complete before Phase 4 (E2E Automation)

### Phase 3.5 Tasks

---

#### INFRA-P0-001: Normalize Test Runner (Vitest)

**Task ID:** INFRA-P0-001
**Source:** PR #366 CTO Triage Report, TEST-INFRA-09
**Status:** [✅] COMPLETE (PR #375)
**Completed:** 2026-02-02
**Priority:** P0 (CRITICAL)
**Estimate:** 4-8h
**Mode:** RED
**Module:** `tests/integration/data-integrity.test.ts`, test configuration
**Blocks:** Phase 4 (E2E Automation), CI gate enforcement

**Problem:**
`tests/integration/data-integrity.test.ts` imports `@jest/globals` which is incompatible with Vitest. This causes test suite failures unrelated to actual code issues, making CI unreliable.

**Agent Checklist:**

- [ ] Identify all files importing `@jest/globals`
- [ ] Migrate to Vitest-compatible APIs (`import { describe, it, expect } from 'vitest'`)
- [ ] Update any Jest-specific matchers to Vitest equivalents
- [ ] Verify no other Jest/Vitest conflicts exist
- [ ] Run `pnpm test` and confirm no import errors
- [ ] Document migration in test README

**Verification:**

```bash
# 1. Search for Jest imports
grep -r "@jest/globals" tests/ --include="*.ts"
grep -r "from 'jest'" tests/ --include="*.ts"

# 2. Run tests
pnpm test

# 3. Verify no Vitest/Jest conflicts
pnpm test 2>&1 | grep -i "jest"
```

**Acceptance Criteria:**

- [ ] No `@jest/globals` imports remain in test files
- [ ] `pnpm test` completes without Vitest/Jest import errors
- [ ] All previously passing tests still pass
- [ ] CI can trust test results

---

#### INFRA-P0-002: Comments Router DB Isolation

**Task ID:** INFRA-P0-002
**Source:** PR #366 CTO Triage Report, TEST-INFRA-09
**Status:** [✅] COMPLETE (PR #375)
**Completed:** 2026-02-02
**Note:** Test failures were due to inventoryDb.test.ts (party model migration) and vipPortal.appointments.test.ts (date-sensitive test), not comments router. Both fixed.
**Priority:** P0 (CRITICAL)
**Estimate:** 8-12h
**Mode:** RED
**Module:** `server/routers/comments.test.ts`, test infrastructure
**Blocks:** Phase 4 (E2E Automation), CI gate enforcement

**Problem:**
`server/routers/comments.test.ts` attempts real database writes and fails with MySQL `ECONNREFUSED` when `DATABASE_URL` is unreachable. Tests should not require external database connections.

**Solution Options:**

1. **Mock Database Layer (RECOMMENDED)**
   - Use Vitest mocks for Drizzle ORM calls
   - Fast, no external dependencies
   - Effort: 4-6h

2. **Containerized Test Database**
   - Use testcontainers or docker-compose for MySQL
   - More realistic but slower
   - Effort: 8-12h

3. **In-Memory SQLite**
   - Swap MySQL for SQLite in test mode
   - May have SQL dialect issues
   - Effort: 6-8h

**Agent Checklist:**

- [ ] Analyze `comments.test.ts` database interactions
- [ ] Implement database mocking for Drizzle ORM
- [ ] Create mock data fixtures for comments
- [ ] Update test setup/teardown to use mocks
- [ ] Verify tests pass without `DATABASE_URL`
- [ ] Document mocking pattern for other tests

**Verification:**

```bash
# 1. Unset DATABASE_URL and run tests
unset DATABASE_URL
pnpm test server/routers/comments.test.ts

# 2. Run full test suite
pnpm test

# 3. Verify no DB connection attempts
pnpm test 2>&1 | grep -i "ECONNREFUSED"
```

**Acceptance Criteria:**

- [ ] Comments router tests pass without real database
- [ ] No `ECONNREFUSED` errors in test output
- [ ] Mocking pattern documented for reuse
- [ ] CI can run tests without database access

---

#### GF-007-LINT-P1-001: Targeted Type-Safety Cleanup (Inventory/Product Modules)

**Task ID:** GF-007-LINT-P1-001
**Source:** PR #366 CTO Triage Report (Type-safety regressions P1)
**Status:** [ ] not started
**Priority:** P1 (HIGH)
**Estimate:** 12-16h
**Mode:** STRICT
**Module:** `server/routers/inventory.ts`, `server/routers/products.ts`, `server/inventoryDb.ts`, `server/productsDb.ts`
**Supports:** GF-007 (Inventory Management)

**Problem:**
Large volume of `@typescript-eslint/no-explicit-any` violations in inventory and product modules. These type-safety gaps can mask runtime errors in the inventory path, which is critical for GF-007.

**Scope (Inventory-Related Files Only):**

- `server/routers/inventory.ts`
- `server/routers/products.ts`
- `server/inventoryDb.ts`
- `server/productsDb.ts`
- `server/services/inventoryService.ts`
- `client/src/components/inventory/*.tsx`

**Agent Checklist:**

- [ ] Run lint and capture `any` violations in inventory modules
- [ ] Categorize violations by severity (data layer vs UI)
- [ ] Define proper TypeScript types for each `any` usage
- [ ] Replace `any` with specific types in data layer first
- [ ] Replace `any` in UI components
- [ ] Verify no new `any` introduced
- [ ] Run `pnpm check` to confirm type safety

**Verification:**

```bash
# 1. Count current violations
pnpm lint 2>&1 | grep "no-explicit-any" | grep -E "(inventory|product)" | wc -l

# 2. After fixes
pnpm lint 2>&1 | grep "no-explicit-any" | grep -E "(inventory|product)"
# Should return 0 results

# 3. Type check
pnpm check

# 4. Manual smoke test
# Login as qa.inventory@terp.test
# Navigate to /inventory
# Verify batches load correctly
```

**Acceptance Criteria:**

- [ ] Zero `@typescript-eslint/no-explicit-any` violations in inventory/product modules
- [ ] `pnpm check` passes
- [ ] No regression in inventory load path
- [ ] GF-007 inventory page functions correctly

---

#### GF-CORE-REACT-P1-001: React Lint Correctness (Shared List Components)

**Task ID:** GF-CORE-REACT-P1-001
**Source:** PR #366 CTO Triage Report (React correctness P1)
**Status:** [ ] not started
**Priority:** P1 (HIGH)
**Estimate:** 8h
**Mode:** STRICT
**Module:** `client/src/components/shared/`, `client/src/components/ui/`
**Supports:** GF-001, GF-002, GF-007, GF-008 (all flows using list/selector components)

**Problem:**

- `react/no-array-index-key` violations in list components cause reconciliation issues
- `React` undefined errors in JSX files due to missing imports or incorrect runtime config
- These affect product selectors and inventory lists used by multiple golden flows

**Scope (Shared Components):**

- `client/src/components/shared/ProductSelector.tsx`
- `client/src/components/shared/BatchSelector.tsx`
- `client/src/components/shared/ClientSelector.tsx`
- `client/src/components/ui/DataTable.tsx`
- Any component rendering lists with `.map()`

**Agent Checklist:**

- [ ] Identify all `react/no-array-index-key` violations in shared components
- [ ] Replace index keys with stable unique identifiers (id, uuid)
- [ ] Fix `React` undefined errors (add imports or fix JSX runtime)
- [ ] Verify JSX runtime configuration in `tsconfig.json`
- [ ] Test selectors and lists in browser
- [ ] Verify no UI flickering or state loss

**Verification:**

```bash
# 1. Count current violations
pnpm lint 2>&1 | grep "react/no-array-index-key" | wc -l
pnpm lint 2>&1 | grep "React.*undefined" | wc -l

# 2. After fixes
pnpm lint 2>&1 | grep -E "(no-array-index-key|React.*undefined)"
# Should return 0 results

# 3. Visual regression test
# Test product selector in PO creation
# Test batch selector in order creation
# Test inventory list pagination
```

**Acceptance Criteria:**

- [ ] Zero `react/no-array-index-key` violations in shared components
- [ ] Zero `React` undefined errors
- [ ] Lists render with stable keys (no flickering)
- [ ] Selectors function correctly across golden flows

---

### Phase 3.5 Gate Verification

```bash
# Run all verifications
pnpm test                    # All tests pass
pnpm lint 2>&1 | grep -c "error"  # Track error count reduction
pnpm check                   # TypeScript passes
pnpm build                   # Build succeeds

# Verify test signal restored
unset DATABASE_URL
pnpm test                    # Should still pass (mocked)

# Verify inventory path
# Manual: Login as qa.inventory@terp.test, navigate to /inventory
```

**Phase 3.5 Exit Criteria:**

- [ ] INFRA-P0-001 complete: No Vitest/Jest conflicts
- [ ] INFRA-P0-002 complete: Tests pass without database
- [ ] GF-007-LINT-P1-001 complete: Zero `any` in inventory modules
- [ ] GF-CORE-REACT-P1-001 complete: React lint clean in shared components
- [ ] `pnpm test` passes reliably
- [ ] CI can be trusted for golden flow verification

---

## Phase 5 Additions: Hygiene Sweep

The following task is added to Phase 5 (Beta Hardening) for deferred lint cleanup:

---

#### LINT-P2-001: Hygiene Sweep (Unused Vars/Console Warnings) - Batch 1

**Task ID:** LINT-P2-001
**Source:** PR #366 CTO Triage Report (Hygiene P2)
**Status:** [ ] not started
**Priority:** P2 (MEDIUM)
**Estimate:** 8-16h
**Mode:** SAFE
**Module:** Codebase-wide
**Phase:** Phase 5 (Beta Hardening)

**Problem:**
Excess unused variables and console usage warnings create noise that hides real issues and drives warning fatigue. Current count: 264 warnings.

**Agent Checklist:**

- [ ] Run lint and capture all warnings
- [ ] Categorize by type (unused-vars, console, other)
- [ ] Batch 1: Address unused-vars in server/ directory
- [ ] Batch 2: Address unused-vars in client/ directory
- [ ] Batch 3: Address console warnings (convert to logger or remove)
- [ ] Track warning count reduction

**Acceptance Criteria:**

- [ ] Lint warnings reduced by ≥50%
- [ ] No new warnings introduced
- [ ] CI lint warning budget enforced (if applicable)

---

## Integration Summary

| Task ID              | Phase | Priority | Est.   | Status      | Blocks             |
| -------------------- | ----- | -------- | ------ | ----------- | ------------------ |
| INFRA-P0-001         | 3.5   | P0       | 4-8h   | ✅ COMPLETE | Phase 4            |
| INFRA-P0-002         | 3.5   | P0       | 8-12h  | ✅ COMPLETE | Phase 4            |
| GF-007-LINT-P1-001   | 3.5   | P1       | 12-16h | not started | GF-007             |
| GF-CORE-REACT-P1-001 | 3.5   | P1       | 8h     | not started | GF-001/002/007/008 |
| LINT-P2-001          | 5     | P2       | 8-16h  | not started | None               |

**Total New Effort:** 40-60 hours (2-3 days for P0/P1, additional 1-2 days for P2)

---

## Next Work Recommendation

**Immediate Priority (Do Now):**

1. **INFRA-P0-001 + INFRA-P0-002** - Restore test signal
   - These are blocking tasks for Phase 4 (E2E Automation)
   - Without reliable tests, CI cannot gate golden flow verification
   - Estimated: 1-2 days combined

**Parallel Work (Can Start Now):**

2. **GF-007-LINT-P1-001** - Type-safety in inventory modules
   - Directly supports GF-007 (Inventory Management)
   - Reduces runtime error risk in critical path
   - Can proceed in parallel with test infra fixes

3. **GF-CORE-REACT-P1-001** - React lint in shared components
   - Stabilizes UI components used by multiple golden flows
   - Can proceed in parallel with test infra fixes

**Defer to Phase 5:**

4. **LINT-P2-001** - Hygiene sweep
   - Not blocking any golden flows
   - Schedule after test signal restored and inventory working

---

## Agent Prompt for Next Task

To begin the test/lint signal recovery work, use this prompt:

```
/terp-pm Execute INFRA-P0-001 and INFRA-P0-002 to restore test signal.
Normalize the Vitest/Jest usage and mock the database in comments router tests.
This is prerequisite for Phase 4 E2E automation and reliable CI gates.
```

---

**Document Version:** 1.0
**Created:** 2026-02-02
**Author:** TERP PM Agent (Codex-assisted analysis)
**Source PR:** #366

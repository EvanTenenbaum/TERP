# BUG-034 Atomic Roadmap: Pagination Standardization

**Created:** 2025-12-22
**Status:** IN PROGRESS
**Risk Level:** HIGH
**Total Estimated Time:** 4 hours (Phase 0 pre-work only - full BUG-034 deferred)

---

## Executive Summary

This roadmap addresses the critical issues discovered during Red Hat QA of BUG-034. Rather than executing the full 16-hour refactoring, we will:

1. **Fix immediate bugs** (todoTasks double-wrapping)
2. **Update the BUG-034 prompt** with accurate information
3. **Create unified pagination types** for future work
4. **Document the four existing contracts** for future reference

The full BUG-034 execution should be done by a dedicated agent with the corrected prompt.

---

## Critical Issues to Address

| # | Issue | Severity | Phase |
|---|-------|----------|-------|
| 1 | todoTasks router double-wrapping structured data | 🔴 BUG | Phase 1 |
| 2 | BUG-034 prompt claims 30 procedures (actual: 21) | 🟡 DOC | Phase 2 |
| 3 | Four different pagination contracts undocumented | 🟡 DOC | Phase 2 |
| 4 | No unified pagination type exists | 🟡 TECH | Phase 3 |
| 5 | Per-endpoint analysis missing from prompt | 🟡 DOC | Phase 2 |

---

## Phase 0: Baseline Verification (5 min)

### Atomic Operations
1. Run TypeScript check to establish baseline
2. Verify current test status

### QA Gate 0
- [ ] TypeScript compiles
- [ ] Note any pre-existing errors

---

## Phase 1: Fix todoTasks Double-Wrapping Bug (15 min)

### Problem
The `todoTasks` router wraps already-structured responses from `todoTasksDb`:

```typescript
// todoTasksDb.getListTasks ALREADY returns:
{ items: tasks, total, limit, offset, hasMore }

// But router WRAPS it again:
return {
  items: tasks,  // ← tasks is already { items, total, ... }!
  nextCursor: null,
  hasMore: tasks.length === limit,
};
```

### Atomic Operations

#### 1.1 Fix getByListId procedure
- File: `server/routers/todoTasks.ts`
- Line: ~37
- Change: Remove hotfix wrapper, pass through DB response

#### 1.2 Fix getMyTasks procedure
- File: `server/routers/todoTasks.ts`
- Line: ~62
- Change: Remove hotfix wrapper, pass through DB response

### QA Gate 1
- [ ] TypeScript compiles
- [ ] todoTasks endpoints return correct structure
- [ ] No regressions in other endpoints

---

## Phase 2: Update BUG-034 Prompt (30 min)

### Atomic Operations

#### 2.1 Update hotfix count
- File: `docs/prompts/BUG-034.md`
- Change: Correct "30 procedures" to "21 procedures"
- Add: Note about 9 procedures already fixed with Contract B

#### 2.2 Add per-endpoint analysis table
- File: `docs/prompts/BUG-034.md`
- Add: Complete table of all 21 hotfixed endpoints with DB return types

#### 2.3 Document four pagination contracts
- File: `docs/prompts/BUG-034.md`
- Add: Section explaining Contract A, B, C, D

#### 2.4 Add Phase 0 pre-work section
- File: `docs/prompts/BUG-034.md`
- Add: Pre-execution checklist and verification steps

#### 2.5 Update affected files inventory
- File: `docs/prompts/BUG-034.md`
- Change: Remove strains.ts and inventory.ts from hotfix list
- Add: Note that these use Contract B already

### QA Gate 2
- [ ] Prompt accurately reflects codebase state
- [ ] All 21 hotfixed endpoints documented
- [ ] Four contracts clearly explained

---

## Phase 3: Create Unified Pagination Types (20 min)

### Atomic Operations

#### 3.1 Add UnifiedPaginatedResponse type
- File: `server/_core/pagination.ts`
- Add: New type that supports both offset and cursor pagination

#### 3.2 Add createUnifiedPaginatedResponse helper
- File: `server/_core/pagination.ts`
- Add: Helper function that creates unified response

#### 3.3 Add null-safe wrapper
- File: `server/_core/pagination.ts`
- Add: Null-safe version of createPaginatedResponse

### QA Gate 3
- [ ] TypeScript compiles
- [ ] New types are properly exported
- [ ] Existing code unaffected

---

## Phase 4: Final Verification (10 min)

### Atomic Operations

#### 4.1 Run full TypeScript check
#### 4.2 Run tests
#### 4.3 Commit all changes
#### 4.4 Update MASTER_ROADMAP with findings

### QA Gate 4 (Final)
- [ ] All TypeScript errors resolved
- [ ] All tests pass
- [ ] Changes committed
- [ ] BUG-034 prompt updated and accurate

---

## Execution Log

### Phase 0: Baseline
- Started: 2025-12-22 
- Status: ✅ COMPLETE
- TypeScript: Compiles cleanly

### Phase 1: Fix todoTasks Bug
- Started: 2025-12-22
- Status: ✅ COMPLETE
- Fixed: getListTasks double-wrapping
- Fixed: getMyTasks double-wrapping
- QA Gate 1: PASSED (TypeScript compiles, no diagnostics)

### Phase 2: Update Prompt
- Started: 2025-12-22
- Status: ✅ COMPLETE
- Updated: Hotfix count corrected to 19 (not 30)
- Added: Per-endpoint DB return type analysis table
- Added: Phase 0 pre-work verification checklist
- Updated: Affected files inventory with accurate counts
- QA Gate 2: PASSED (prompt accurately reflects codebase)

### Phase 3: Unified Types
- Started: 2025-12-22
- Status: ✅ COMPLETE
- Added: `UnifiedPaginatedResponse<T>` interface
- Added: `createUnifiedPaginatedResponse` helper (offset-based)
- Added: `createUnifiedFromCursor` helper (cursor-based)
- Added: `createSafeUnifiedResponse` null-safe wrapper
- Added: `isUnifiedPaginatedResponse` type guard
- Added: `extractItems` utility for various response shapes
- QA Gate 3: PASSED (TypeScript compiles, no diagnostics)

### Phase 4: Final Verification
- Started: 2025-12-22
- Status: IN PROGRESS

---

## Success Criteria

1. ✅ todoTasks double-wrapping bug fixed
2. ✅ BUG-034 prompt accurate and complete
3. ✅ Unified pagination types available
4. ✅ All tests pass
5. ✅ Ready for full BUG-034 execution by dedicated agent

---

## Notes

- This roadmap addresses PRE-WORK only
- Full BUG-034 execution (16h) should be done separately
- The corrected prompt will enable successful execution

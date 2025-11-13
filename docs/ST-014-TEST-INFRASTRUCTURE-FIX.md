# ST-014: Fix Broken Test Infrastructure - Progress Report

## Status: IN PROGRESS

**Started:** 2025-11-13  
**Estimate:** 8-12 hours  
**Priority:** HIGH

## Problem Summary

- **189 failing tests** across 17 test files
- **Root Cause:** Incomplete database mocking - `db is not defined` errors
- **Impact:** Blocking development workflow and pre-commit hooks

## Solution Approach

### Phase 1: Infrastructure ✅ COMPLETE

Created comprehensive test database utility:

1. ✅ **testDb.ts** - Complete Drizzle ORM mock interface
   - `createMockDb()` - Full db object with all methods
   - `setupDbMock()` - Easy setup for test files
   - `mockSelectQuery()` - Helper for SELECT queries
   - `mockInsertQuery()` - Helper for INSERT queries
   - `mockUpdateQuery()` - Helper for UPDATE queries
   - `mockDeleteQuery()` - Helper for DELETE queries

2. ✅ **TEST_DATABASE_MOCKING_GUIDE.md** - Documentation
   - Migration guide for test files
   - Common patterns and examples
   - Before/after comparisons

### Phase 2: Test File Migration (IN PROGRESS)

**Files to Fix (17 total):**

Priority 1 (Most Failures):
- [ ] `server/services/permissionService.test.ts` (189 failures)
- [ ] `server/routers/rbac-users.test.ts`
- [ ] `server/routers/salesSheets.test.ts`

Priority 2 (Moderate Failures):
- [ ] `server/routers/accounting.test.ts`
- [ ] `server/routers/analytics.test.ts`
- [ ] `server/routers/badDebt.test.ts`
- [ ] `server/routers/calendar.test.ts`
- [ ] `server/routers/clients.test.ts`
- [ ] `server/routers/credits.test.ts`
- [ ] `server/routers/dashboard.test.ts`
- [ ] `server/routers/inventory.test.ts`
- [ ] `server/routers/orders.test.ts`
- [ ] `server/routers/pricing.test.ts`
- [ ] `server/routers/rbac-permissions.test.ts`
- [ ] `server/routers/rbac-roles.test.ts`
- [ ] `server/routers/vendors.test.ts`

### Phase 3: Verification

- [ ] Run full test suite
- [ ] Verify 0 failures
- [ ] Update pre-commit hooks
- [ ] Document new testing patterns

## Technical Details

### Old Pattern (Broken)

```typescript
vi.mock("../db", () => ({
  db: {
    select: vi.fn(), // Incomplete!
  },
}));

// This returns undefined, causing errors
(db.select as any).mockReturnValue({
  from: vi.fn().mockReturnValue({
    where: vi.fn().mockResolvedValue([]),
  }),
});
```

### New Pattern (Working)

```typescript
import { setupDbMock, createMockDb, mockSelectQuery } from '../test-utils/testDb';

vi.mock('../db', () => setupDbMock());

// Properly typed and complete
const mockDb = db as unknown as ReturnType<typeof createMockDb>;
mockSelectQuery(mockDb, [{ id: 1, name: 'Test' }]);
```

## Benefits

- ✅ Complete Drizzle ORM interface coverage
- ✅ Type-safe mocking
- ✅ Consistent pattern across all tests
- ✅ Easy to use helper functions
- ✅ No more "db is not defined" errors
- ✅ Unblocks development workflow

## Next Steps

1. Migrate `permissionService.test.ts` (largest file)
2. Use as template for other files
3. Run tests after each file to verify
4. Commit incrementally
5. Final verification and documentation

## Estimated Completion

- **Infrastructure:** ✅ Complete (2 hours)
- **Migration:** In Progress (6-8 hours remaining)
- **Verification:** Pending (1-2 hours)

**Total:** 9-12 hours (aligned with roadmap estimate)

## Notes

- Created reusable utility that will benefit all future tests
- Documentation ensures consistency going forward
- Incremental approach minimizes risk

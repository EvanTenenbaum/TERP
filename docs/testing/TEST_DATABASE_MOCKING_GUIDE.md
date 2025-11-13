# Test Database Mocking Guide

## Problem

Tests were failing with errors like:
- `Cannot read properties of undefined (reading 'select')`
- `db is not defined`
- 189 failing tests across 17 test files

## Root Cause

The database mocking pattern was incomplete. Tests were mocking `db` but only providing partial mock implementations that didn't match the full Drizzle ORM interface.

## Solution

Use the new `testDb` utility that provides a complete mock database interface.

## Usage

### 1. Import the utility

```typescript
import { setupDbMock, createMockDb, mockSelectQuery } from '../test-utils/testDb';
```

### 2. Mock the database module

```typescript
vi.mock('../db', () => setupDbMock());
```

### 3. Use the mock in tests

```typescript
import { db } from '../db';

describe('My Service', () => {
  it('should query the database', async () => {
    // Setup mock response
    const mockDb = db as unknown as ReturnType<typeof createMockDb>;
    mockSelectQuery(mockDb, [{ id: 1, name: 'Test' }]);

    // Run test
    const result = await myService.getAll();

    // Assert
    expect(result).toEqual([{ id: 1, name: 'Test' }]);
  });
});
```

## Migration Checklist

For each failing test file:

1. ☐ Replace old mock pattern with `setupDbMock()`
2. ☐ Remove incomplete mock implementations
3. ☐ Use helper functions (`mockSelectQuery`, `mockInsertQuery`, etc.)
4. ☐ Verify tests pass
5. ☐ Commit changes

## Common Patterns

### Pattern 1: Simple Select Query

**Before:**
```typescript
vi.mock('../db', () => ({
  db: {
    select: vi.fn(),
  },
}));

(db.select as any).mockReturnValue({
  from: vi.fn().mockReturnValue({
    where: vi.fn().mockResolvedValue([]),
  }),
});
```

**After:**
```typescript
import { setupDbMock, createMockDb, mockSelectQuery } from '../test-utils/testDb';

vi.mock('../db', () => setupDbMock());

const mockDb = db as unknown as ReturnType<typeof createMockDb>;
mockSelectQuery(mockDb, []);
```

### Pattern 2: Insert Query

**Before:**
```typescript
(db.insert as any).mockReturnValue({
  values: vi.fn().mockResolvedValue({ insertId: 1 }),
});
```

**After:**
```typescript
import { mockInsertQuery } from '../test-utils/testDb';

mockInsertQuery(mockDb, { id: 1, name: 'New Item' });
```

### Pattern 3: Update Query

**Before:**
```typescript
(db.update as any).mockReturnValue({
  set: vi.fn().mockReturnValue({
    where: vi.fn().mockResolvedValue({ changes: 1 }),
  }),
});
```

**After:**
```typescript
import { mockUpdateQuery } from '../test-utils/testDb';

mockUpdateQuery(mockDb, { id: 1, name: 'Updated Item' });
```

## Benefits

- ✅ Complete Drizzle ORM interface coverage
- ✅ Chainable query builder support
- ✅ Consistent mocking pattern across all tests
- ✅ Easy to use helper functions
- ✅ Type-safe mocking
- ✅ No more "db is not defined" errors

## Files to Fix

Based on test run, these files need updates:

1. `server/services/permissionService.test.ts` (189 failures)
2. `server/routers/rbac-users.test.ts`
3. `server/routers/salesSheets.test.ts`
4. `server/routers/accounting.test.ts`
5. And 13 more test files...

## Verification

After fixing, run:
```bash
pnpm test
```

All tests should pass with 0 failures.

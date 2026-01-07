# Wave 4A: SQL Safety Audit

**Agent Role**: Backend Developer  
**Duration**: 5-6 hours  
**Priority**: P1  
**Dependencies**: Wave 3 complete  
**Can Run Parallel With**: Wave 4B, 4C, 4D (different file domains)

---

## Overview

Audit and fix all SQL queries that could fail with empty arrays. This is a systematic security and stability pass through all server-side database code.

---

## File Domain

**Your files**: `server/**/*.ts` (excluding files touched by 4C)
**Do NOT modify**: `client/src/**/*` (Wave 4B/4D domain)

---

## Task 1: Audit All inArray() Calls (2 hours)

### Find All Instances

```bash
cd /home/ubuntu/TERP
grep -rn "inArray" --include="*.ts" server/
```

### Pattern to Fix

```typescript
// DANGEROUS - crashes if array is empty
const results = await db.query.items.findMany({
  where: inArray(items.id, itemIds),
});

// SAFE - check before query
const results = itemIds.length > 0
  ? await db.query.items.findMany({
      where: inArray(items.id, itemIds),
    })
  : [];
```

### Files to Check

| File | Location | Status |
|------|----------|--------|
| `server/services/permissionService.ts` | Lines 185-210 | Fix |
| `server/routers/tagManagement.ts` | Multiple | Fix |
| `server/services/creditEngine.ts` | Multiple | Fix |
| `server/routers/vipPortal.ts` | Multiple | Verify |
| `server/services/liveCatalogService.ts` | Multiple | Verify |

### Standard Fix Pattern

```typescript
// Create a helper function
export function safeInArray<T>(column: Column<T>, values: T[]): SQL | undefined {
  if (values.length === 0) {
    return sql`false`; // Returns no rows
  }
  return inArray(column, values);
}

// Usage
const results = await db.query.items.findMany({
  where: safeInArray(items.id, itemIds),
});
```

---

## Task 2: Audit All sql.raw() Calls (1.5 hours)

### Find All Instances

```bash
grep -rn "sql\.raw\|sql\`" --include="*.ts" server/
```

### Pattern to Fix

```typescript
// DANGEROUS - SQL injection if array is empty
const query = sql`SELECT * FROM items WHERE id IN (${sql.raw(ids.join(','))})`;

// SAFE - validate before constructing
if (ids.length === 0) {
  return [];
}
const query = sql`SELECT * FROM items WHERE id IN (${sql.raw(ids.join(','))})`;
```

### Files to Check

| File | Risk | Fix |
|------|------|-----|
| `server/pricingEngine.ts` | HIGH | Already fixed in Wave 1A |
| `server/salesSheetsDb.ts` | MEDIUM | Verify |
| `server/inventoryDb.ts` | MEDIUM | Verify |
| `server/transactionsDb.ts` | MEDIUM | Verify |

---

## Task 3: Create SQL Safety Utilities (1 hour)

### Create Helper File

```typescript
// server/lib/sqlSafety.ts

import { sql, SQL, Column } from 'drizzle-orm';
import { inArray as drizzleInArray } from 'drizzle-orm';

/**
 * Safe version of inArray that handles empty arrays
 * Returns sql`false` for empty arrays (matches no rows)
 */
export function safeInArray<T>(column: Column, values: T[]): SQL {
  if (!Array.isArray(values) || values.length === 0) {
    return sql`false`;
  }
  return drizzleInArray(column, values);
}

/**
 * Safe version of notInArray that handles empty arrays
 * Returns sql`true` for empty arrays (matches all rows)
 */
export function safeNotInArray<T>(column: Column, values: T[]): SQL {
  if (!Array.isArray(values) || values.length === 0) {
    return sql`true`;
  }
  return notInArray(column, values);
}

/**
 * Safely join array for raw SQL IN clause
 * Throws error if array is empty (fail-fast)
 */
export function safeJoinForIn(values: (string | number)[]): string {
  if (!Array.isArray(values) || values.length === 0) {
    throw new Error('Cannot create IN clause with empty array');
  }
  return values.map(v => typeof v === 'string' ? `'${v}'` : v).join(',');
}

/**
 * Check if array is safe for SQL operations
 */
export function assertNonEmptyArray<T>(arr: T[], name: string): asserts arr is [T, ...T[]] {
  if (!Array.isArray(arr) || arr.length === 0) {
    throw new Error(`${name} cannot be empty`);
  }
}
```

---

## Task 4: Update All Routers (1.5 hours)

### Import and Use Safety Utilities

```typescript
// In each router file
import { safeInArray, safeNotInArray } from '../lib/sqlSafety';

// Replace all inArray calls
// Before:
where: inArray(items.id, itemIds)

// After:
where: safeInArray(items.id, itemIds)
```

### Files to Update

1. `server/routers/inventory.ts`
2. `server/routers/orders.ts`
3. `server/routers/invoices.ts`
4. `server/routers/clients.ts`
5. `server/routers/batches.ts`
6. `server/services/permissionService.ts`
7. `server/services/creditEngine.ts`

---

## Task 5: Add Unit Tests (1 hour)

```typescript
// server/lib/__tests__/sqlSafety.test.ts

import { describe, it, expect } from 'vitest';
import { safeInArray, safeNotInArray, safeJoinForIn, assertNonEmptyArray } from '../sqlSafety';

describe('sqlSafety', () => {
  describe('safeInArray', () => {
    it('returns sql`false` for empty array', () => {
      const result = safeInArray(mockColumn, []);
      expect(result.toString()).toContain('false');
    });

    it('returns normal inArray for non-empty array', () => {
      const result = safeInArray(mockColumn, [1, 2, 3]);
      expect(result).toBeDefined();
    });

    it('handles undefined gracefully', () => {
      const result = safeInArray(mockColumn, undefined as any);
      expect(result.toString()).toContain('false');
    });
  });

  describe('safeJoinForIn', () => {
    it('throws for empty array', () => {
      expect(() => safeJoinForIn([])).toThrow('Cannot create IN clause with empty array');
    });

    it('joins numbers correctly', () => {
      expect(safeJoinForIn([1, 2, 3])).toBe('1,2,3');
    });

    it('quotes strings correctly', () => {
      expect(safeJoinForIn(['a', 'b'])).toBe("'a','b'");
    });
  });

  describe('assertNonEmptyArray', () => {
    it('throws for empty array', () => {
      expect(() => assertNonEmptyArray([], 'test')).toThrow('test cannot be empty');
    });

    it('passes for non-empty array', () => {
      expect(() => assertNonEmptyArray([1], 'test')).not.toThrow();
    });
  });
});
```

---

## Git Workflow

```bash
git checkout -b fix/wave-4a-sql-safety

# Create safety utilities
git add server/lib/sqlSafety.ts
git commit -m "feat(SQL-1): Add SQL safety utilities for empty array handling"

# Add tests
git add server/lib/__tests__/sqlSafety.test.ts
git commit -m "test(SQL-2): Add unit tests for SQL safety utilities"

# Fix permission service
git add server/services/permissionService.ts
git commit -m "fix(BUG-043): Add empty array check in permission service"

# Fix other files
git add server/routers/*.ts server/services/*.ts
git commit -m "fix(SQL-3): Apply safeInArray across all routers"

# Push and create PR
git push origin fix/wave-4a-sql-safety
gh pr create --title "Wave 4A: SQL Safety Audit" --body "
## Summary
Comprehensive SQL safety audit to prevent empty array crashes.

## Changes
- Added sqlSafety.ts utility library
- Fixed BUG-043 (permission service)
- Applied safeInArray to all routers
- Added unit tests

## Testing
- [ ] All existing tests pass
- [ ] New unit tests pass
- [ ] Manual test: user with no roles doesn't crash
- [ ] Manual test: empty filter queries return empty results

## Parallel Safety
Only touches server/**/*.ts files (backend domain)
"
```

---

## Success Criteria

- [ ] All `inArray()` calls use `safeInArray()`
- [ ] All `sql.raw()` with joins have empty checks
- [ ] `sqlSafety.ts` utility created
- [ ] Unit tests pass
- [ ] No crashes with empty arrays
- [ ] BUG-043 fixed

---

## Handoff

After Wave 4A completion:

1. PR ready for review
2. Document any edge cases found
3. Coordinate merge timing with Wave 4B/4C/4D

**Merge Order**: 4A can merge first (no conflicts with 4B/4C/4D)

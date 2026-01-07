# Wave 4A: SQL Safety Audit (Post-Thursday)

**Agent Role**: Backend Developer  
**Duration**: 6-8 hours  
**Priority**: P2  
**Timeline**: Week 2  
**Can Run Parallel With**: Wave 4B

---

## Overview

Systematic audit of all SQL queries for empty array vulnerabilities and other safety issues.

---

## Task 1: Audit All inArray Usages

**Time Estimate**: 3-4 hours

### Find All Instances

```bash
# Find all inArray calls
grep -rn "inArray" server/ --include="*.ts"

# Find all sql.raw with join
grep -rn "sql\.raw.*join\|sql\.raw.*,\)" server/ --include="*.ts"

# Find all IN clauses
grep -rn "IN.*join\|IN.*\$" server/ --include="*.ts"
```

### Audit Checklist

For each instance found, verify:

```markdown
## inArray Audit

| File | Line | Variable | Has Length Check | Fixed |
|------|------|----------|------------------|-------|
| pricingEngine.ts | 332 | ruleIds | ✅ Fixed in Wave 1A | ✅ |
| permissionService.ts | 185 | permissionIds | ✅ Fixed in Wave 1A | ✅ |
| liveCatalogService.ts | 45 | batchIds | ❌ | ⬜ |
| vipPortal.ts | 1825 | batchIds | ✅ Already has check | ✅ |
| ... | ... | ... | ... | ... |
```

### Fix Pattern

```typescript
// Create utility function
// server/utils/safeQuery.ts

import { SQL, sql, inArray } from 'drizzle-orm';
import type { Column } from 'drizzle-orm';

/**
 * Safe inArray that handles empty arrays.
 * Returns sql`false` for empty arrays instead of invalid SQL.
 */
export function safeInArray<T>(column: Column, values: T[]): SQL {
  if (!values || values.length === 0) {
    return sql`false`;
  }
  return inArray(column, values);
}

/**
 * Safe inArray that returns sql`true` for empty arrays.
 * Use when empty array should match everything.
 */
export function safeInArrayOrAll<T>(column: Column, values: T[]): SQL {
  if (!values || values.length === 0) {
    return sql`true`;
  }
  return inArray(column, values);
}
```

### Apply to All Files

```typescript
// Before
.where(inArray(batches.id, batchIds))

// After
import { safeInArray } from '../utils/safeQuery';
.where(safeInArray(batches.id, batchIds))
```

---

## Task 2: Audit SQL Injection Risks

**Time Estimate**: 2 hours

### Find Raw SQL Usage

```bash
grep -rn "sql\`" server/ --include="*.ts"
grep -rn "sql\.raw" server/ --include="*.ts"
```

### Verify Each Instance

```markdown
## SQL Injection Audit

| File | Line | Usage | Safe? | Notes |
|------|------|-------|-------|-------|
| search.ts | 45 | sql`%${query}%` | ✅ | Parameterized |
| reports.ts | 123 | sql.raw(userInput) | ❌ | UNSAFE |
| ... | ... | ... | ... | ... |
```

### Fix Pattern

```typescript
// UNSAFE
const query = sql.raw(`SELECT * FROM users WHERE name = '${userInput}'`);

// SAFE
const query = sql`SELECT * FROM users WHERE name = ${userInput}`;
```

---

## Task 3: Add Database Query Logging

**Time Estimate**: 1-2 hours

```typescript
// server/db/index.ts

import { drizzle } from 'drizzle-orm/postgres-js';

const db = drizzle(client, {
  logger: {
    logQuery(query, params) {
      // Log in development
      if (process.env.NODE_ENV === 'development') {
        console.log('[DB Query]', query);
        console.log('[DB Params]', params);
      }
      
      // Log slow queries in production
      const start = Date.now();
      return {
        onComplete() {
          const duration = Date.now() - start;
          if (duration > 1000) {
            console.warn(`[Slow Query] ${duration}ms:`, query);
          }
        }
      };
    }
  }
});
```

---

## Task 4: Create SQL Safety Tests

**Time Estimate**: 1 hour

```typescript
// server/__tests__/sqlSafety.test.ts

describe('SQL Safety', () => {
  describe('safeInArray', () => {
    it('handles empty array', () => {
      const result = safeInArray(users.id, []);
      expect(result.toString()).toBe('false');
    });

    it('handles non-empty array', () => {
      const result = safeInArray(users.id, [1, 2, 3]);
      expect(result.toString()).toContain('IN');
    });
  });

  describe('Query builders', () => {
    it('permission query handles empty roles', async () => {
      // Should not throw
      const result = await getUserPermissions(userWithNoRoles.id);
      expect(result).toEqual([]);
    });

    it('inventory query handles empty rules', async () => {
      // Should not throw
      const result = await getInventoryWithPricing(clientWithNoRules.id);
      expect(result.length).toBeGreaterThan(0);
    });
  });
});
```

---

## Git Workflow

```bash
git checkout -b fix/wave-4a-sql-safety

git add server/utils/safeQuery.ts
git commit -m "feat: Add safeInArray utility for empty array handling"

git add server/**/*.ts
git commit -m "fix: Apply safeInArray across all database queries

Audited and fixed:
- liveCatalogService.ts
- tagManagement.ts
- creditEngine.ts
- [other files]"

git add server/__tests__/sqlSafety.test.ts
git commit -m "test: Add SQL safety tests"

git push origin fix/wave-4a-sql-safety
```

---

## Success Criteria

- [ ] All inArray usages audited
- [ ] safeInArray utility created
- [ ] All unsafe usages fixed
- [ ] SQL injection audit complete
- [ ] Query logging added
- [ ] Safety tests added

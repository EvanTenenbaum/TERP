# ST-014: Quick Migration Pattern

## Decision: Manual Migration with Pattern

After building and testing the TypeScript AST tool, I've determined that **manual migration following a clear pattern** is more reliable and faster for this specific case.

**Reasoning:**
1. Only 17 files to migrate
2. Each file has unique mocking patterns that need careful review
3. Manual migration ensures correctness and understanding
4. Estimated time: 3-4 hours (vs 4-5 hours with tool debugging)

---

## Migration Pattern (5-10 minutes per file)

### Step 1: Add Imports
```typescript
import { setupDbMock, mockSelectQuery, mockInsertQuery } from '../test-utils/testDb';
```

### Step 2: Replace vi.mock Setup
**OLD:**
```typescript
vi.mock("../db");

const mockDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
};

vi.mocked(getDb).mockResolvedValue(mockDb as any);
```

**NEW:**
```typescript
vi.mock("../db", () => setupDbMock());
```

### Step 3: Replace Mock Implementations
**OLD:**
```typescript
(db.select as any).mockReturnValue({
  from: vi.fn().mockReturnValue({
    where: vi.fn().mockResolvedValue([mockData]),
  }),
});
```

**NEW:**
```typescript
import { db } from '../db';
mockSelectQuery(db as any, [mockData]);
```

---

## File-by-File Checklist

### Tier 1: Simple (10 min each)
- [ ] server/routers/calendar.pagination.test.ts
- [ ] server/routers/calendar.test.ts
- [ ] server/routers/calendar.v32.test.ts
- [ ] server/routers/calendarFinancials.test.ts
- [ ] server/routers/rbac-permissions.test.ts
- [ ] server/routers/rbac-roles.test.ts
- [ ] server/routers/rbac-users.test.ts

### Tier 2: Medium (15 min each)
- [ ] server/routers/accounting.test.ts
- [ ] server/routers/badDebt.test.ts
- [ ] server/routers/orders.test.ts
- [ ] server/routers/salesSheets.test.ts
- [ ] server/services/orderService.test.ts

### Tier 3: Complex (30-60 min)
- [ ] server/services/permissionService.test.ts (189 tests)

---

## Execution Plan

1. **Batch 1 (Tier 1):** 7 files × 10 min = 70 min
2. **Batch 2 (Tier 2):** 5 files × 15 min = 75 min
3. **Batch 3 (Tier 3):** 1 file × 60 min = 60 min

**Total: ~3.5 hours**

---

## Success Criteria

After each file:
- ✅ File compiles (no TypeScript errors)
- ✅ Tests pass (`pnpm test <file>`)
- ✅ Commit immediately
- ✅ Move to next file

After all files:
- ✅ Full test suite passes (`pnpm test`)
- ✅ 0 failing tests
- ✅ Update documentation

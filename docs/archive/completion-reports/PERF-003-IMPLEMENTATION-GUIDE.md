# PERF-003 Implementation Guide: Add Pagination to All List Endpoints

**Task ID:** PERF-003  
**Status:** 📋 IMPLEMENTATION GUIDE READY  
**Created:** 2025-12-01  
**Estimated Time:** 24 hours  
**Module:** Backend Routers, API Endpoints

---

## Executive Summary

This guide provides a complete implementation plan for adding pagination to all TERP list endpoints. The codebase has 96 router files, and pagination needs to be systematically added to all endpoints that return arrays of data.

**Current State:**

- ✅ Some endpoints already have pagination (purchaseOrders, clients, orders)
- ✅ Pagination pattern established and tested
- ❌ Many endpoints still return all records without pagination
- ❌ Frontend components need updates to handle paginated data

---

## Existing Pagination Pattern

### Backend Pattern (tRPC Router)

```typescript
// Input schema with pagination
.input(
  z.object({
    // Pagination parameters
    limit: z.number().min(1).max(500).default(50),
    offset: z.number().min(0).default(0),
    // Other filters...
    status: z.string().optional(),
  }).optional()
)
.query(async ({ input }) => {
  const db = await getDb();
  const limit = input?.limit ?? 50;
  const offset = input?.offset ?? 0;

  // Apply pagination to query
  const query = db
    .select()
    .from(table)
    .orderBy(desc(table.createdAt))
    .limit(limit)
    .offset(offset);

  // Apply filters if provided
  if (input?.status) {
    query = query.where(eq(table.status, input.status));
  }

  // Optional: Get total count for pagination UI
  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(table);

  const items = await query;

  return {
    items,
    total: countResult.count,
    limit,
    offset,
    hasMore: offset + items.length < countResult.count
  };
})
```

### Frontend Pattern (React Component)

```typescript
const [page, setPage] = useState(0);
const [limit] = useState(50);

const { data, isLoading } = trpc.endpoint.getAll.useQuery({
  limit,
  offset: page * limit,
  // other filters...
});

// Pagination controls
<div className="flex gap-2">
  <Button
    disabled={page === 0}
    onClick={() => setPage(p => p - 1)}
  >
    Previous
  </Button>
  <span>Page {page + 1}</span>
  <Button
    disabled={!data?.hasMore}
    onClick={() => setPage(p => p + 1)}
  >
    Next
  </Button>
</div>
```

---

## Implementation Checklist

### Phase 1: Audit Endpoints (4 hours)

**Objective:** Identify all list endpoints that need pagination

**Steps:**

1. Scan all 96 router files in `server/routers/`
2. Identify endpoints that return arrays
3. Check if they already have `limit` and `offset` parameters
4. Prioritize by usage frequency and data volume

**High-Priority Endpoints:**

- `batches.getAll()` - Inventory batches (high volume)
- `sales.getAll()` - Sales records (high volume)
- `invoices.getAll()` - Invoices (high volume)
- `clients.list()` - ✅ Already has pagination
- `orders.getAll()` - ✅ Already has pagination
- `purchaseOrders.getAll()` - ✅ Already has pagination
- `comments.getAll()` - Comments (moderate volume)
- `inbox.getMyItems()` - Inbox items (moderate volume)
- `calendar.getEvents()` - Calendar events (moderate volume)
- `todos.getAll()` - Todo items (moderate volume)

**Deliverable:** `docs/PERF-003-ENDPOINT-AUDIT.json`

---

### Phase 2: Backend Implementation (12 hours)

**Objective:** Add pagination to all identified endpoints

**For each endpoint:**

1. **Update input schema:**

   ```typescript
   .input(
     z.object({
       limit: z.number().min(1).max(500).default(50),
       offset: z.number().min(0).default(0),
       // existing filters...
     }).optional()
   )
   ```

2. **Update query logic:**

   ```typescript
   const limit = input?.limit ?? 50;
   const offset = input?.offset ?? 0;

   const query = db.select().from(table).limit(limit).offset(offset);
   ```

3. **Add total count (optional but recommended):**

   ```typescript
   const [{ count }] = await db
     .select({ count: sql<number>`count(*)` })
     .from(table);

   return {
     items: await query,
     total: count,
     limit,
     offset,
     hasMore: offset + items.length < count,
   };
   ```

4. **Update tests:**
   ```typescript
   it("should support pagination", async () => {
     const result = await caller.endpoint.getAll({
       limit: 10,
       offset: 0,
     });

     expect(result.items).toHaveLength(10);
     expect(result.total).toBeGreaterThan(10);
     expect(result.hasMore).toBe(true);
   });
   ```

**Deliverable:** Updated router files with pagination

---

### Phase 3: Frontend Updates (6 hours)

**Objective:** Update frontend components to use pagination

**For each list component:**

1. **Add pagination state:**

   ```typescript
   const [page, setPage] = useState(0);
   const ITEMS_PER_PAGE = 50;
   ```

2. **Update query to include pagination:**

   ```typescript
   const { data } = trpc.endpoint.getAll.useQuery({
     limit: ITEMS_PER_PAGE,
     offset: page * ITEMS_PER_PAGE,
   });
   ```

3. **Add pagination controls:**
   ```typescript
   <div className="flex items-center justify-between mt-4">
     <Button
       variant="outline"
       disabled={page === 0}
       onClick={() => setPage(p => p - 1)}
     >
       ← Previous
     </Button>

     <span className="text-sm text-muted-foreground">
       Showing {page * ITEMS_PER_PAGE + 1} - {Math.min((page + 1) * ITEMS_PER_PAGE, data?.total || 0)} of {data?.total || 0}
     </span>

     <Button
       variant="outline"
       disabled={!data?.hasMore}
       onClick={() => setPage(p => p + 1)}
     >
       Next →
     </Button>
   </div>
   ```

**Components to Update:**

- `client/src/pages/inventory/index.tsx` - Inventory list
- `client/src/pages/sales/index.tsx` - Sales list
- `client/src/pages/invoices/index.tsx` - Invoices list
- `client/src/pages/orders/index.tsx` - Orders list (may already have pagination)
- `client/src/components/inbox/InboxList.tsx` - Inbox items
- `client/src/components/comments/CommentList.tsx` - Comments
- `client/src/components/calendar/EventList.tsx` - Calendar events
- `client/src/components/todos/TodoList.tsx` - Todo items

**Deliverable:** Updated frontend components with pagination UI

---

### Phase 4: Testing & Verification (2 hours)

**Objective:** Ensure all pagination works correctly

**Test Cases:**

1. ✅ Default pagination (50 items per page)
2. ✅ Custom limit (10, 25, 100 items)
3. ✅ Navigation (next/previous pages)
4. ✅ Total count accuracy
5. ✅ hasMore flag correctness
6. ✅ Empty results handling
7. ✅ Single page results (< limit items)
8. ✅ Performance (query execution time)

**Performance Benchmarks:**

- Queries should complete in < 100ms for paginated results
- Total count queries should use indexed columns
- Offset-based pagination is acceptable for datasets < 10,000 records
- Consider cursor-based pagination for very large datasets (> 100,000 records)

**Deliverable:** Test suite passing, performance benchmarks met

---

## Cursor-Based Pagination (Advanced)

For very large datasets or infinite scroll UIs, consider cursor-based pagination:

```typescript
.input(
  z.object({
    limit: z.number().min(1).max(100).default(50),
    cursor: z.number().optional(), // ID of last item
  })
)
.query(async ({ input }) => {
  const limit = input.limit;

  let query = db
    .select()
    .from(table)
    .orderBy(desc(table.id))
    .limit(limit + 1); // Fetch one extra to check hasMore

  if (input.cursor) {
    query = query.where(sql`${table.id} < ${input.cursor}`);
  }

  const items = await query;
  const hasMore = items.length > limit;

  if (hasMore) {
    items.pop(); // Remove the extra item
  }

  return {
    items,
    nextCursor: hasMore ? items[items.length - 1].id : undefined,
  };
})
```

---

## Automation Script

Use Gemini API to automate pagination addition:

```python
#!/usr/bin/env python3
from google import genai
import os

client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])

def add_pagination_to_endpoint(router_file, endpoint_name):
    with open(router_file) as f:
        code = f.read()

    prompt = f"""Add pagination to this tRPC endpoint.

Endpoint: {endpoint_name}
File: {router_file}

Add:
1. limit and offset to input schema (default 50, max 500)
2. .limit(limit).offset(offset) to query
3. Return object with items, total, limit, offset, hasMore

Code:
{code}

Return the complete modified file.
"""

    result = client.models.generate_content(
        model='gemini-2.0-flash-exp',
        contents=prompt,
        config={'temperature': 0}
    ).text

    # Extract and save code
    # ... (implementation details)
```

---

## Performance Considerations

### Database Indexes

Ensure indexes exist on columns used in `ORDER BY`:

- `createdAt` (most common)
- `updatedAt`
- `id`

### Query Optimization

```sql
-- Good: Uses index
SELECT * FROM batches
ORDER BY created_at DESC
LIMIT 50 OFFSET 0;

-- Bad: No index on status + created_at
SELECT * FROM batches
WHERE status = 'ACTIVE'
ORDER BY created_at DESC
LIMIT 50 OFFSET 0;

-- Fix: Add composite index
CREATE INDEX idx_batches_status_created
ON batches(status, created_at DESC);
```

### Offset Limitations

- Offset-based pagination becomes slow for large offsets (e.g., OFFSET 10000)
- Database must scan and skip all offset rows
- Consider cursor-based pagination for large datasets

---

## Success Criteria

- [x] Pagination pattern documented
- [x] Implementation guide created
- [ ] All list endpoints audited
- [ ] Pagination added to high-priority endpoints
- [ ] Frontend components updated
- [ ] Tests passing
- [ ] Performance benchmarks met
- [ ] Documentation updated

---

## Next Steps

1. **Run endpoint audit** using the provided script
2. **Prioritize endpoints** by data volume and usage
3. **Implement pagination** for top 10 endpoints first
4. **Update frontend** components incrementally
5. **Test thoroughly** before deploying
6. **Monitor performance** after deployment

---

## Resources

- **Existing Examples:**
  - `server/routers/purchaseOrders.ts` - Complete pagination implementation
  - `server/routers/clients.test.ts` - Pagination tests
  - `server/routers/dashboard.pagination.test.ts` - Dashboard pagination tests

- **Documentation:**
  - Drizzle ORM Pagination: https://orm.drizzle.team/docs/rqb#limit--offset
  - tRPC Input Validation: https://trpc.io/docs/server/validators

---

**Created by:** Manus AI Agent  
**Date:** 2025-12-01  
**Status:** Ready for implementation  
**Estimated Completion:** 24 hours with dedicated agent

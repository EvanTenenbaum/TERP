# PERF-003: Add Pagination to All List Endpoints

<!-- METADATA (for validation) -->
<!-- TASK_ID: PERF-003 -->
<!-- TASK_TITLE: Add Pagination to All List Endpoints -->
<!-- PROMPT_VERSION: 1.0 -->
<!-- LAST_VALIDATED: 2025-11-30 -->

**Repository:** https://github.com/EvanTenenbaum/TERP  
**Task ID:** PERF-003  
**Priority:** P1 (HIGH - PERFORMANCE)  
**Estimated Time:** 24 hours  
**Module:** Backend Routers, API Endpoints

---

## 📋 Table of Contents

1. [Context](#context)
2. [Phase 1: Pre-Flight Check](#phase-1-pre-flight-check)
3. [Phase 2: Session Startup](#phase-2-session-startup)
4. [Phase 3: Implementation](#phase-3-implementation)
5. [Phase 4: Completion](#phase-4-completion)
6. [Quick Reference](#quick-reference)
7. [Troubleshooting](#troubleshooting)

---

## 🎯 Context

**Background:**
Many TERP API endpoints return all records without pagination, causing performance issues when datasets grow large. The dashboard, VIP portal leaderboard, and various list endpoints need pagination to handle hundreds or thousands of records efficiently.

**Goal:**
Systematically add pagination to all list endpoints with configurable limits and implement cursor-based pagination for large datasets.

**Success Criteria:**

- [ ] All list endpoints audited
- [ ] Pagination added to endpoints without it
- [ ] Default limit: 50 items
- [ ] Maximum limit: 500 items
- [ ] Cursor-based pagination for large datasets
- [ ] Frontend updated to handle pagination
- [ ] All tests passing
- [ ] Zero TypeScript errors

---

## 🚨 MANDATORY: Use Gemini API for Code Generation

**ALL code generation and analysis MUST use Google Gemini API:**

```python
from google import genai
import os
client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))
```

**Full instructions:** `docs/GEMINI_API_USAGE.md` | **This is non-negotiable.**

---

## Phase 1: Pre-Flight Check

**Objective:** Verify environment and check for conflicts BEFORE starting work.

### Step 1.1: Register Your Session

1. Create session file: `docs/sessions/active/Session-$(date +%Y%m%d)-PERF-003-$(openssl rand -hex 4).md`
2. Use template: `docs/templates/SESSION_TEMPLATE.md`
3. Fill in your session details.

### Step 1.2: Register Session (Atomic) ⚠️ CRITICAL

**This step prevents race conditions. Follow it exactly.**

1. `git pull origin main` (to get the latest `ACTIVE_SESSIONS.md`)
2. Read `docs/ACTIVE_SESSIONS.md` and check for module conflicts.
3. If clear, add your session to the file.
4. Commit and push **immediately**:
   ```bash
   git add docs/ACTIVE_SESSIONS.md
   git commit -m "Register session for PERF-003"
   git push origin main
   ```
5. **If the push fails due to a conflict, another agent registered first.** STOP, pull again, and re-evaluate.

### Step 1.3: Verify Environment

```bash
node --version
pnpm --version
git status
```

### Step 1.4: Verify Permissions

Test your push access: `git push --dry-run origin main`

---

## Phase 2: Session Startup

**Objective:** Set up your workspace and update the roadmap.

### Step 2.1: Create Feature Branch

```bash
git checkout main
git pull origin main
git checkout -b perf-003-pagination
```

### Step 2.2: Update Roadmap Status

**File:** `docs/roadmaps/MASTER_ROADMAP.md`

Find the PERF-003 task and update status to `⏳ IN PROGRESS`.

### Step 2.3: Update Session File Progress

Update your session file with your progress.

---

## Phase 3: Implementation

**Objective:** Audit endpoints and add pagination systematically.

### Step 3.1: Audit All List Endpoints

**Action:** Scan all tRPC routers for list endpoints without pagination.

**Use Gemini API to analyze routers:**

```python
from google import genai
import os
import glob

client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))

# Get all router files
router_files = glob.glob('server/routers/*.ts')

# Analyze with Gemini
for file_path in router_files:
    with open(file_path, 'r') as f:
        content = f.read()
    
    response = client.models.generate_content(
        model='gemini-2.0-flash-exp',
        contents=f"""Analyze this tRPC router for list endpoints without pagination:

1. Identify all endpoints that return arrays/lists
2. Check if they have limit/offset or cursor pagination
3. Estimate typical result set size
4. Recommend pagination strategy

Router file: {file_path}

{content}

Output format:
- Endpoint: [name]
- Has pagination: Yes/No
- Typical result size: [estimate]
- Recommendation: [add pagination / keep as-is / cursor-based]
"""
    )
    
    print(f"\n{file_path}:")
    print(response.text)
```

**Priority Endpoints** (from roadmap):
- Dashboard endpoints (invoices, recent orders, KPIs)
- VIP portal leaderboard
- Inventory list
- Orders list
- Clients list
- Vendors list

**Document:** Create `docs/PERF-003-ENDPOINT-AUDIT.md` with findings.

### Step 3.2: Define Pagination Schema

**Action:** Create reusable pagination input/output schemas.

**Create** `server/_core/pagination.ts`:

```typescript
import { z } from 'zod';

// Pagination input schema
export const paginationInputSchema = z.object({
  limit: z.number().min(1).max(500).default(50),
  offset: z.number().min(0).default(0),
});

// Cursor pagination input schema
export const cursorPaginationInputSchema = z.object({
  limit: z.number().min(1).max(500).default(50),
  cursor: z.string().optional(),
});

// Pagination output schema
export function createPaginatedResponse<T>(
  items: T[],
  total: number,
  limit: number,
  offset: number
) {
  return {
    items,
    pagination: {
      total,
      limit,
      offset,
      hasMore: offset + items.length < total,
      totalPages: Math.ceil(total / limit),
      currentPage: Math.floor(offset / limit) + 1,
    },
  };
}

// Cursor pagination output schema
export function createCursorPaginatedResponse<T>(
  items: T[],
  nextCursor: string | null
) {
  return {
    items,
    nextCursor,
    hasMore: nextCursor !== null,
  };
}

export type PaginationInput = z.infer<typeof paginationInputSchema>;
export type CursorPaginationInput = z.infer<typeof cursorPaginationInputSchema>;
```

### Step 3.3: Add Pagination to Dashboard Endpoints

**Action:** Update dashboard router to use pagination.

**Example - Dashboard Router:**

```typescript
import { paginationInputSchema, createPaginatedResponse } from '../_core/pagination';
import { count } from 'drizzle-orm';

export const dashboardRouter = router({
  // Before
  getRecentOrders: publicProcedure.query(async () => {
    const orders = await db.select().from(ordersTable).limit(10);
    return orders;
  }),

  // After
  getRecentOrders: publicProcedure
    .input(paginationInputSchema)
    .query(async ({ input }) => {
      const { limit, offset } = input;
      
      // Get total count
      const [{ total }] = await db
        .select({ total: count() })
        .from(ordersTable);
      
      // Get paginated results
      const orders = await db
        .select()
        .from(ordersTable)
        .limit(limit)
        .offset(offset)
        .orderBy(desc(ordersTable.createdAt));
      
      return createPaginatedResponse(orders, total, limit, offset);
    }),
});
```

**Use Gemini API to generate paginated endpoints:**

```python
response = client.models.generate_content(
    model='gemini-2.0-flash-exp',
    contents=f"""Convert this tRPC endpoint to use pagination:

{endpoint_code}

Requirements:
1. Add paginationInputSchema to input
2. Add count query for total
3. Add limit() and offset() to query
4. Return createPaginatedResponse()
5. Maintain all existing filters and sorting

Generate the complete paginated endpoint.
"""
)
```

**Endpoints to update:**
- `dashboard.getRecentOrders`
- `dashboard.getRecentQuotes`
- `dashboard.getInvoices`

### Step 3.4: Add Pagination to VIP Portal Leaderboard

**Action:** Update VIP portal router with pagination.

**Example - VIP Portal Leaderboard:**

```typescript
export const vipPortalRouter = router({
  getLeaderboard: publicProcedure
    .input(paginationInputSchema)
    .query(async ({ input }) => {
      const { limit, offset } = input;
      
      // Get total count
      const [{ total }] = await db
        .select({ total: count() })
        .from(clientsTable);
      
      // Get paginated leaderboard
      const leaderboard = await db
        .select({
          clientId: clientsTable.id,
          name: clientsTable.name,
          totalOrders: count(ordersTable.id),
          totalRevenue: sum(ordersTable.total),
        })
        .from(clientsTable)
        .leftJoin(ordersTable, eq(ordersTable.clientId, clientsTable.id))
        .groupBy(clientsTable.id)
        .orderBy(desc(sum(ordersTable.total)))
        .limit(limit)
        .offset(offset);
      
      return createPaginatedResponse(leaderboard, total, limit, offset);
    }),
});
```

### Step 3.5: Add Pagination to List Endpoints

**Action:** Update all list endpoints (orders, clients, inventory, vendors).

**Example - Orders Router:**

```typescript
export const ordersRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        pagination: paginationInputSchema,
        filters: z.object({
          status: z.string().optional(),
          clientId: z.number().optional(),
        }).optional(),
      })
    )
    .query(async ({ input }) => {
      const { pagination, filters } = input;
      const { limit, offset } = pagination;
      
      // Build query with filters
      let query = db.select().from(ordersTable);
      
      if (filters?.status) {
        query = query.where(eq(ordersTable.status, filters.status));
      }
      if (filters?.clientId) {
        query = query.where(eq(ordersTable.clientId, filters.clientId));
      }
      
      // Get total count with filters
      const [{ total }] = await db
        .select({ total: count() })
        .from(ordersTable)
        .where(/* same filters */);
      
      // Get paginated results
      const orders = await query
        .limit(limit)
        .offset(offset)
        .orderBy(desc(ordersTable.createdAt));
      
      return createPaginatedResponse(orders, total, limit, offset);
    }),
});
```

**Routers to update:**
- `server/routers/orders.ts`
- `server/routers/clients.ts`
- `server/routers/inventory.ts`
- `server/routers/vendors.ts`

### Step 3.6: Implement Cursor-Based Pagination (Optional)

**Action:** For very large datasets, implement cursor-based pagination.

**Example - Inventory with Cursor Pagination:**

```typescript
export const inventoryRouter = router({
  listBatches: protectedProcedure
    .input(cursorPaginationInputSchema)
    .query(async ({ input }) => {
      const { limit, cursor } = input;
      
      // Parse cursor (encoded last item ID)
      const lastId = cursor ? parseInt(cursor) : 0;
      
      // Get items after cursor
      const batches = await db
        .select()
        .from(batchesTable)
        .where(gt(batchesTable.id, lastId))
        .limit(limit + 1) // Fetch one extra to check if more exist
        .orderBy(asc(batchesTable.id));
      
      // Determine next cursor
      const hasMore = batches.length > limit;
      const items = hasMore ? batches.slice(0, limit) : batches;
      const nextCursor = hasMore ? items[items.length - 1].id.toString() : null;
      
      return createCursorPaginatedResponse(items, nextCursor);
    }),
});
```

### Step 3.7: Update Frontend to Handle Pagination

**Action:** Update frontend components to use pagination.

**Example - Orders List Page:**

```typescript
import { useState } from 'react';
import { trpc } from '@/lib/trpc';

export function OrdersListPage() {
  const [page, setPage] = useState(1);
  const limit = 50;
  const offset = (page - 1) * limit;
  
  const { data, isLoading } = trpc.orders.list.useQuery({
    pagination: { limit, offset },
  });
  
  if (isLoading) return <div>Loading...</div>;
  
  const { items, pagination } = data;
  
  return (
    <div>
      {/* Render orders */}
      {items.map(order => <OrderItem key={order.id} order={order} />)}
      
      {/* Pagination controls */}
      <div className="pagination">
        <button 
          disabled={page === 1}
          onClick={() => setPage(p => p - 1)}
        >
          Previous
        </button>
        <span>Page {pagination.currentPage} of {pagination.totalPages}</span>
        <button 
          disabled={!pagination.hasMore}
          onClick={() => setPage(p => p + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}
```

**Pages to update:**
- `client/src/pages/OrdersPage.tsx`
- `client/src/pages/InventoryPage.tsx`
- `client/src/pages/ClientsPage.tsx`
- `client/src/pages/VendorsPage.tsx`
- `client/src/pages/DashboardPage.tsx`

### Step 3.8: Run Tests

**Action:** Verify all tests pass with pagination.

```bash
pnpm test
```

**Update tests to include pagination:**

```typescript
it('should return paginated orders', async () => {
  const result = await caller.orders.list({
    pagination: { limit: 10, offset: 0 },
  });
  
  expect(result.items).toHaveLength(10);
  expect(result.pagination.total).toBeGreaterThan(0);
  expect(result.pagination.hasMore).toBe(true);
});
```

### Step 3.9: Verify TypeScript

```bash
pnpm check
```

**Expected:** Zero TypeScript errors.

---

## Phase 4: Completion

**Objective:** Finalize implementation and create completion report.

### Step 4.1: Create Completion Report

**File:** `docs/PERF-003-COMPLETION-REPORT.md`

**Include:**
- Summary of endpoints updated (count and list)
- Pagination limits configured
- Frontend pages updated
- Any issues encountered
- Recommendations for future optimization

### Step 4.2: Update Roadmap

**File:** `docs/roadmaps/MASTER_ROADMAP.md`

Update PERF-003:
- Change status to `✅ COMPLETE`
- Add completion date: `(Completed: YYYY-MM-DD)`
- Add actual time spent
- Link to completion report

### Step 4.3: Update ACTIVE_SESSIONS.md

Mark your session as complete.

### Step 4.4: Commit and Push

```bash
git add .
git commit -m "Complete PERF-003: Add pagination to all list endpoints

- Added pagination to [X] endpoints
- Default limit: 50, max: 500
- Updated [X] frontend pages
- All tests passing"
git push origin perf-003-pagination:main
```

**Note:** Push directly to main (no PR needed per protocol).

### Step 4.5: Archive Session

Move session file from `docs/sessions/active/` to `docs/sessions/completed/`.

---

## ⚡ Quick Reference

**Key Files:**
- `server/_core/pagination.ts` - Pagination schemas and helpers
- `server/routers/*.ts` - Backend routers
- `client/src/pages/*.tsx` - Frontend pages

**Pagination Pattern:**
```typescript
// Backend
.input(paginationInputSchema)
.query(async ({ input }) => {
  const { limit, offset } = input;
  const total = await db.select({ total: count() }).from(table);
  const items = await db.select().from(table).limit(limit).offset(offset);
  return createPaginatedResponse(items, total, limit, offset);
})

// Frontend
const { data } = trpc.endpoint.useQuery({ pagination: { limit: 50, offset: 0 } });
```

**Key Commands:**
```bash
# Run tests
pnpm test

# Type check
pnpm check

# Run dev server
pnpm dev
```

---

## 🆘 Troubleshooting

**Issue:** Tests fail with pagination
- **Solution:** Update tests to include pagination input parameters

**Issue:** Frontend doesn't show all data
- **Solution:** Verify pagination state is managed correctly; check if initial page is loaded

**Issue:** Performance doesn't improve
- **Solution:** Verify database queries use indexes; check if count() query is optimized

**Issue:** TypeScript errors with pagination types
- **Solution:** Ensure pagination schemas are properly imported and typed

---

## 📊 Expected Deliverables

1. ✅ Endpoint audit document (`docs/PERF-003-ENDPOINT-AUDIT.md`)
2. ✅ Pagination helper module (`server/_core/pagination.ts`)
3. ✅ Updated backend routers (5+ routers)
4. ✅ Updated frontend pages (5+ pages)
5. ✅ Updated tests for pagination
6. ✅ Completion report (`docs/PERF-003-COMPLETION-REPORT.md`)
7. ✅ All tests passing
8. ✅ Zero TypeScript errors
9. ✅ Session archived

---

**Last Updated:** November 30, 2025

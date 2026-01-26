# Team E: Infrastructure Agent Prompt

**Role:** Infrastructure Lead
**Branch:** `claude/team-e-infrastructure`
**Priority:** MEDIUM - Performance & scalability

---

## Mission

Implement infrastructure improvements for performance and observability. These are independent tasks that improve system scalability.

**No dependencies - start immediately.**

---

## Task List

### Task 1: ST-005 - Add Missing Database Indexes

**Estimate:** 4-6h
**Module:** `server/db/schema/`
**Risk Level:** SAFE (additive only)

**Problem:**
Foreign key columns are missing indexes, causing slow queries on joins and lookups.

**Audit process:**

1. **List all FK relationships:**
```sql
SELECT
  TABLE_NAME,
  COLUMN_NAME,
  REFERENCED_TABLE_NAME,
  REFERENCED_COLUMN_NAME
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE REFERENCED_TABLE_NAME IS NOT NULL
  AND TABLE_SCHEMA = 'terp';
```

2. **Check for existing indexes:**
```sql
SHOW INDEX FROM orders;
SHOW INDEX FROM invoices;
-- etc.
```

3. **Add missing indexes via Drizzle migration:**

```typescript
// drizzle/migrations/XXXX_add_missing_indexes.ts
import { sql } from 'drizzle-orm'

export async function up(db) {
  // Orders table
  await db.execute(sql`CREATE INDEX idx_orders_client_id ON orders(client_id)`)
  await db.execute(sql`CREATE INDEX idx_orders_status ON orders(status)`)
  await db.execute(sql`CREATE INDEX idx_orders_created_at ON orders(created_at)`)

  // Invoices table
  await db.execute(sql`CREATE INDEX idx_invoices_client_id ON invoices(client_id)`)
  await db.execute(sql`CREATE INDEX idx_invoices_order_id ON invoices(order_id)`)
  await db.execute(sql`CREATE INDEX idx_invoices_status ON invoices(status)`)

  // Line items
  await db.execute(sql`CREATE INDEX idx_order_line_items_order_id ON order_line_items(order_id)`)
  await db.execute(sql`CREATE INDEX idx_order_line_items_batch_id ON order_line_items(batch_id)`)

  // GL entries
  await db.execute(sql`CREATE INDEX idx_gl_entries_invoice_id ON gl_entries(invoice_id)`)
  await db.execute(sql`CREATE INDEX idx_gl_entries_order_id ON gl_entries(order_id)`)
  await db.execute(sql`CREATE INDEX idx_gl_entries_account_type ON gl_entries(account_type)`)

  // Batches
  await db.execute(sql`CREATE INDEX idx_batches_product_id ON batches(product_id)`)
  await db.execute(sql`CREATE INDEX idx_batches_status ON batches(status)`)

  // Payments
  await db.execute(sql`CREATE INDEX idx_payments_invoice_id ON payments(invoice_id)`)
  await db.execute(sql`CREATE INDEX idx_payments_client_id ON payments(client_id)`)
}

export async function down(db) {
  // Drop all indexes (reversible)
  await db.execute(sql`DROP INDEX idx_orders_client_id ON orders`)
  // ... etc
}
```

**Performance benchmarking:**
```sql
-- Before adding index
EXPLAIN ANALYZE SELECT * FROM orders WHERE client_id = 123;

-- After adding index
EXPLAIN ANALYZE SELECT * FROM orders WHERE client_id = 123;
```

**Deliverables:**
- [ ] FK audit complete (document all relationships)
- [ ] Migration file created
- [ ] Indexes added for all FK columns
- [ ] Performance benchmarks documented
- [ ] Migration tested on staging

---

### Task 2: ST-007 - Implement System-Wide Pagination

**Estimate:** 3-4 days
**Module:** `server/routers/*` (all list endpoints)
**Risk Level:** SAFE

**Problem:**
`getAll` endpoints return unbounded results. With 1000+ records, browsers crash.

**Implementation pattern:**

```typescript
// 1. Create reusable pagination schema
// server/_core/pagination.ts
import { z } from 'zod'

export const paginationSchema = z.object({
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
})

export type PaginationInput = z.infer<typeof paginationSchema>

export interface PaginatedResult<T> {
  data: T[]
  total: number
  limit: number
  offset: number
  hasMore: boolean
}

// 2. Create pagination helper
export async function paginate<T>(
  query: SQL,
  input: PaginationInput,
  db: Database
): Promise<PaginatedResult<T>> {
  // Get total count
  const countResult = await db.execute(sql`
    SELECT COUNT(*) as total FROM (${query}) as subquery
  `)
  const total = countResult[0].total

  // Get paginated data
  const data = await db.execute(sql`
    ${query}
    ORDER BY ${input.sortBy ?? 'created_at'} ${input.sortOrder}
    LIMIT ${input.limit}
    OFFSET ${input.offset}
  `)

  return {
    data: data as T[],
    total,
    limit: input.limit,
    offset: input.offset,
    hasMore: input.offset + data.length < total
  }
}

// 3. Apply to routers
// server/routers/orders.ts
getAll: protectedProcedure
  .input(paginationSchema)
  .query(async ({ ctx, input }) => {
    return paginate<Order>(
      sql`SELECT * FROM orders WHERE deleted_at IS NULL`,
      input,
      ctx.db
    )
  })
```

**Priority endpoints (implement first):**
1. `orders.getAll`
2. `invoices.getAll`
3. `clients.getAll`
4. `batches.getAll`
5. `products.getAll`

**All endpoints (implement after):**
- `payments.getAll`
- `glEntries.getAll`
- `inventoryMovements.getAll`
- All other list endpoints

**Frontend updates:**
```typescript
// client/src/hooks/usePaginatedQuery.ts
export function usePaginatedQuery<T>(
  queryKey: string[],
  queryFn: (input: PaginationInput) => Promise<PaginatedResult<T>>,
  initialLimit = 20
) {
  const [pagination, setPagination] = useState({ limit: initialLimit, offset: 0 })

  const query = trpc[queryKey].useQuery(pagination)

  return {
    ...query,
    pagination,
    nextPage: () => setPagination(p => ({ ...p, offset: p.offset + p.limit })),
    prevPage: () => setPagination(p => ({ ...p, offset: Math.max(0, p.offset - p.limit) })),
    setPageSize: (limit: number) => setPagination(p => ({ ...p, limit, offset: 0 }))
  }
}
```

**Deliverables:**
- [ ] Pagination schema and helpers created
- [ ] Priority endpoints paginated (5)
- [ ] All remaining endpoints paginated
- [ ] Frontend pagination hook created
- [ ] Tables updated to use pagination
- [ ] Tests for pagination edge cases

---

### Task 3: ST-009 - Implement API Monitoring (Datadog)

**Estimate:** 2-3 days
**Module:** `server/_core/`, tRPC middleware
**Risk Level:** SAFE

**Problem:**
No visibility into API performance. Can't identify slow queries or error patterns.

**Implementation:**

1. **Install Datadog:**
```bash
pnpm add dd-trace
```

2. **Initialize tracer:**
```typescript
// server/_core/datadog.ts
import tracer from 'dd-trace'

if (process.env.DD_AGENT_HOST) {
  tracer.init({
    service: 'terp-api',
    env: process.env.NODE_ENV,
    version: process.env.npm_package_version,
    logInjection: true,
    runtimeMetrics: true,
    profiling: true
  })
}

export { tracer }
```

3. **Add tRPC middleware:**
```typescript
// server/_core/trpc.ts
import { tracer } from './datadog'

const timingMiddleware = t.middleware(async ({ path, type, next }) => {
  const span = tracer.startSpan('trpc.procedure', {
    tags: {
      'trpc.path': path,
      'trpc.type': type
    }
  })

  const start = performance.now()

  try {
    const result = await next()
    const duration = performance.now() - start

    span.setTag('trpc.duration_ms', duration)
    span.setTag('trpc.success', true)

    // Log slow queries
    if (duration > 1000) {
      logger.warn('Slow procedure', { path, duration })
    }

    return result
  } catch (error) {
    span.setTag('trpc.success', false)
    span.setTag('error', true)
    throw error
  } finally {
    span.finish()
  }
})
```

4. **Database query tracing:**
```typescript
// server/db/index.ts
import { tracer } from '../_core/datadog'

// Wrap Drizzle queries
export const db = drizzle(connection, {
  logger: {
    logQuery(query, params) {
      const span = tracer.startSpan('db.query', {
        tags: { 'db.statement': query.substring(0, 500) }
      })
      span.finish()
    }
  }
})
```

5. **Custom metrics:**
```typescript
// server/_core/metrics.ts
import { tracer } from './datadog'

export const metrics = {
  orderCreated: () => tracer.dogstatsd.increment('orders.created'),
  paymentReceived: (amount: number) =>
    tracer.dogstatsd.histogram('payments.amount', amount),
  inventoryLow: (batchId: number) =>
    tracer.dogstatsd.increment('inventory.low_stock', { batch_id: batchId })
}
```

6. **Alert configuration** (via Datadog UI or Terraform):
- P95 latency > 1s for any endpoint
- Error rate > 1%
- Database query time > 500ms

**Deliverables:**
- [ ] dd-trace installed and configured
- [ ] tRPC middleware added
- [ ] Database queries traced
- [ ] Custom metrics for key events
- [ ] Alerts configured
- [ ] Dashboard created (optional)

---

## Verification Checklist

```bash
# Core verification
pnpm check
pnpm lint
pnpm test
pnpm build

# Verify indexes
pnpm db:push  # Apply migrations
# Check in MySQL: SHOW INDEX FROM orders;

# Verify pagination
curl "http://localhost:3000/api/orders?limit=10&offset=0"

# Verify Datadog (if DD_AGENT_HOST set)
# Check Datadog APM dashboard
```

---

## PR Template

```markdown
## Team E: Infrastructure

### Tasks Completed
- [x] ST-005: Add Missing Database Indexes
- [x] ST-007: Implement System-Wide Pagination
- [x] ST-009: Implement API Monitoring (Datadog)

### Key Changes
- Added indexes to all FK columns (~20 indexes)
- All list endpoints now paginated (limit/offset/total)
- Datadog APM integration for performance monitoring
- Custom metrics for business events
- Alerts for slow queries and errors

### Performance Impact
- Query performance: 50-80% improvement on indexed columns
- Memory usage: Reduced (no unbounded result sets)
- Observability: Full APM tracing

### Verification
- [ ] `pnpm check` passes
- [ ] `pnpm lint` passes
- [ ] `pnpm test` passes
- [ ] `pnpm build` passes
- [ ] Indexes verified in database
- [ ] Pagination tested with large datasets
```

---

## Communication

**Update session file:** `docs/sessions/active/team-e-infrastructure.md`

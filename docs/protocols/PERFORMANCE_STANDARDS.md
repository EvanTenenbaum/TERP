# Performance Standards Protocol

**Version:** 1.0
**Last Updated:** 2025-12-01
**Status:** Active & Enforced

This protocol defines performance standards for both frontend and backend code.

---

## 1. React Component Performance

### Memoization Requirements

| Component Type | React.memo | useCallback | useMemo |
|----------------|------------|-------------|---------|
| List items | REQUIRED | REQUIRED | As needed |
| Reusable components | REQUIRED | REQUIRED | As needed |
| Page components | Optional | REQUIRED | As needed |
| One-off components | Optional | As needed | As needed |

### When to Use Each

#### React.memo

```typescript
// ✅ REQUIRED for:
// - Components rendered in lists
// - Components receiving stable props
// - Reusable/shared components

export const OrderRow = memo(function OrderRow({
  order,
  onSelect,
}: OrderRowProps) {
  // ...
});

// Usage in list
{orders.map(order => (
  <OrderRow
    key={order.id}
    order={order}
    onSelect={handleSelect}
  />
))}
```

#### useCallback

```typescript
// ✅ REQUIRED when:
// - Passing functions to memoized children
// - Functions are in dependency arrays
// - Functions would cause re-renders

export function OrderList({ orders }: OrderListProps) {
  // ✅ Memoized - won't cause OrderRow re-renders
  const handleSelect = useCallback((orderId: number) => {
    setSelectedId(orderId);
  }, []);

  // ❌ BAD - new function every render
  const handleSelectBad = (orderId: number) => {
    setSelectedId(orderId);
  };

  return orders.map(order => (
    <OrderRow key={order.id} order={order} onSelect={handleSelect} />
  ));
}
```

#### useMemo

```typescript
// ✅ REQUIRED for:
// - Expensive calculations
// - Derived data that would recalculate on every render
// - Objects/arrays passed to children

export function Dashboard({ orders }: DashboardProps) {
  // ✅ Only recalculates when orders change
  const stats = useMemo(() => ({
    total: orders.reduce((sum, o) => sum + o.total, 0),
    count: orders.length,
    avgValue: orders.length ? total / orders.length : 0,
  }), [orders]);

  // ✅ Only recalculates when orders change
  const sortedOrders = useMemo(() =>
    [...orders].sort((a, b) => b.createdAt - a.createdAt),
  [orders]);

  return <StatsWidget stats={stats} />;
}
```

### Anti-Patterns to Avoid

```typescript
// ❌ BAD: Inline object creation
<Component style={{ color: 'red' }} /> // New object every render

// ✅ GOOD: Memoized or constant
const style = useMemo(() => ({ color: 'red' }), []);
<Component style={style} />

// ❌ BAD: Inline function
<Button onClick={() => handleClick(id)} />

// ✅ GOOD: Memoized callback
const handleClick = useCallback(() => onClick(id), [id, onClick]);
<Button onClick={handleClick} />

// ❌ BAD: Inline array filter
{items.filter(i => i.active).map(...)}

// ✅ GOOD: Memoized filter
const activeItems = useMemo(() => items.filter(i => i.active), [items]);
{activeItems.map(...)}
```

---

## 2. Data Fetching Performance

### Query Optimization

```typescript
// ✅ GOOD: Specific data fetching
const { data } = trpc.orders.list.useQuery({
  clientId,
  limit: 20,
  fields: ['id', 'status', 'total'], // Only needed fields
});

// ❌ BAD: Fetching everything
const { data: allOrders } = trpc.orders.list.useQuery({}); // All orders!
const clientOrders = allOrders?.filter(o => o.clientId === clientId);
```

### Cache Invalidation (Not Refetch)

```typescript
// ❌ BAD: Manual refetch
const { refetch } = trpc.orders.list.useQuery({ clientId });

const createOrder = trpc.orders.create.useMutation({
  onSuccess: () => refetch(), // Inefficient
});

// ✅ GOOD: Cache invalidation
const utils = trpc.useContext();

const createOrder = trpc.orders.create.useMutation({
  onSuccess: () => {
    utils.orders.list.invalidate({ clientId }); // Smart invalidation
    utils.orders.stats.invalidate(); // Related queries
  },
});
```

### Pagination Required for Lists

```typescript
// ❌ FORBIDDEN: Unbounded queries
const { data: clients } = trpc.clients.list.useQuery({}); // All clients!

// ✅ REQUIRED: Pagination
const { data: clients } = trpc.clients.list.useQuery({
  limit: 50,
  offset: page * 50,
});

// ✅ BETTER: Cursor pagination for large datasets
const { data } = trpc.clients.list.useInfiniteQuery(
  { limit: 50 },
  { getNextPageParam: (lastPage) => lastPage.nextCursor }
);
```

---

## 3. Backend Query Performance

### Database Query Standards

```typescript
// ❌ FORBIDDEN: SELECT *
const orders = await db.select().from(orders);

// ✅ REQUIRED: Select specific columns
const orders = await db.select({
  id: orders.id,
  status: orders.status,
  total: orders.total,
}).from(orders);
```

### Always Use Indexes

```typescript
// ❌ BAD: Unindexed column in WHERE
const orders = await db.query.orders.findMany({
  where: eq(orders.notes, 'urgent'), // 'notes' not indexed!
});

// ✅ GOOD: Query on indexed columns
const orders = await db.query.orders.findMany({
  where: and(
    eq(orders.clientId, clientId), // Indexed FK
    eq(orders.status, 'PENDING'),   // Indexed status
  ),
});
```

### N+1 Query Prevention

```typescript
// ❌ BAD: N+1 queries
const orders = await db.query.orders.findMany();
for (const order of orders) {
  order.client = await db.query.clients.findFirst({
    where: eq(clients.id, order.clientId),
  });
}

// ✅ GOOD: Single query with join
const orders = await db.query.orders.findMany({
  with: {
    client: true,
    lineItems: true,
  },
});
```

### Limit Results

```typescript
// ❌ FORBIDDEN: Unbounded query
const allOrders = await db.query.orders.findMany();

// ✅ REQUIRED: Always limit
const orders = await db.query.orders.findMany({
  limit: 100,
  orderBy: [desc(orders.createdAt)],
});
```

---

## 4. Transaction Performance

### Keep Transactions Short

```typescript
// ❌ BAD: Long transaction with external calls
await db.transaction(async (tx) => {
  await tx.insert(orders).values(orderData);
  await sendEmailNotification(); // External call in transaction!
  await tx.insert(orderHistory).values(historyData);
});

// ✅ GOOD: Minimal transaction, external calls after
const order = await db.transaction(async (tx) => {
  const [order] = await tx.insert(orders).values(orderData);
  await tx.insert(orderHistory).values({ orderId: order.id, ... });
  return order;
});

// External calls outside transaction
await sendEmailNotification(order);
```

### Use Transactions for Multi-Table Writes

```typescript
// ❌ BAD: Multiple writes without transaction
await db.insert(orders).values(orderData);
await db.insert(orderLineItems).values(lineItemsData); // May fail!
await db.update(inventory).set({ ... }); // Inconsistent if above fails

// ✅ REQUIRED: Transaction for related writes
await db.transaction(async (tx) => {
  const [order] = await tx.insert(orders).values(orderData);
  await tx.insert(orderLineItems).values(
    lineItemsData.map(li => ({ ...li, orderId: order.id }))
  );
  await tx.update(inventory).set({ ... });
});
```

---

## 5. Bundle Size Management

### Dependency Guidelines

| Dependency Size | Requirement |
|-----------------|-------------|
| < 10KB | Add freely |
| 10KB - 50KB | Justify in PR |
| > 50KB | Requires ADR |
| > 100KB | Must be lazy loaded |

### Lazy Loading

```typescript
// ✅ GOOD: Lazy load heavy components
const HeavyChart = lazy(() => import('./HeavyChart'));

function Dashboard() {
  return (
    <Suspense fallback={<ChartSkeleton />}>
      <HeavyChart data={data} />
    </Suspense>
  );
}

// ✅ GOOD: Lazy load routes
const AccountingPage = lazy(() => import('./pages/AccountingPage'));

<Route path="/accounting">
  <Suspense fallback={<PageLoader />}>
    <AccountingPage />
  </Suspense>
</Route>
```

### Import Analysis

```bash
# Check bundle size before adding dependency
npm pack <package-name> --dry-run

# Analyze bundle
pnpm build
npx vite-bundle-visualizer
```

---

## 6. API Response Performance

### Response Time Targets

| Endpoint Type | Target | Maximum |
|---------------|--------|---------|
| Simple read | < 50ms | 200ms |
| List with pagination | < 100ms | 500ms |
| Complex aggregation | < 200ms | 1000ms |
| Write operation | < 100ms | 500ms |

### Slow Query Detection

```typescript
// Add to critical queries
const startTime = performance.now();
const result = await expensiveQuery();
const duration = performance.now() - startTime;

if (duration > 200) {
  logger.warn({
    query: 'expensiveQuery',
    duration,
    params: { ... },
  }, 'Slow query detected');
}
```

---

## 7. Caching Strategy

### Client-Side Caching (React Query)

```typescript
// Configure stale time appropriately
const { data } = trpc.products.list.useQuery(
  { category },
  {
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 30 * 60 * 1000, // 30 minutes
  }
);

// For rarely changing data
const { data: config } = trpc.settings.get.useQuery(undefined, {
  staleTime: Infinity, // Never automatically refetch
});
```

### Server-Side Caching

```typescript
// Cache expensive computations
import { cache } from '../_core/cache';

export async function getClientStats(clientId: number) {
  return cache.getOrSet(
    `client:stats:${clientId}`,
    async () => {
      // Expensive aggregation
      return await calculateStats(clientId);
    },
    { ttl: 300 } // 5 minutes
  );
}

// Invalidate when data changes
export async function createOrder(data: OrderInput) {
  const order = await db.insert(orders).values(data);
  cache.delete(`client:stats:${data.clientId}`);
  return order;
}
```

---

## 8. Performance Monitoring

### Required Metrics

Track and alert on:
- API response times (p50, p95, p99)
- Database query times
- Error rates
- Bundle size changes

### Performance Testing

```typescript
// Add to critical path tests
it('fetches orders within performance target', async () => {
  const start = performance.now();

  await caller.orders.list({ clientId: 1, limit: 50 });

  const duration = performance.now() - start;
  expect(duration).toBeLessThan(500); // 500ms max
});
```

---

## 9. Pre-Commit Performance Checklist

```markdown
## Performance Checklist

### React Components
- [ ] List item components use React.memo
- [ ] Event handlers use useCallback
- [ ] Expensive computations use useMemo
- [ ] No inline objects in JSX
- [ ] No inline functions passed to children

### Data Fetching
- [ ] Queries have appropriate limits
- [ ] Using cache invalidation (not refetch)
- [ ] No unbounded list queries

### Backend
- [ ] Queries select specific columns
- [ ] Queries use indexed columns in WHERE
- [ ] No N+1 query patterns
- [ ] Multi-table writes use transactions
- [ ] Response times within targets

### Bundle
- [ ] No new dependencies > 50KB without justification
- [ ] Heavy components lazy loaded
```

---

**Code that causes measurable performance regressions will be rejected.**

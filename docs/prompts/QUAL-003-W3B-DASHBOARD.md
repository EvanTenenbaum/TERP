# QUAL-003 Wave 3B: Dashboard & Metrics

**Wave:** 3 (Features & Polish)  
**Agent:** 3B (Dashboard)  
**Priority:** 🟡 MEDIUM - Feature completion  
**Estimated Time:** 3 hours  
**Dependencies:** Wave 2 complete

---

## Mission

Complete the dashboard metrics by implementing low stock threshold queries, period-over-period change calculations, and oldest debt tracking.

---

## Files You Own (EXCLUSIVE)

Only you will touch these files. No other agent will modify them.

| File | TODOs |
|------|-------|
| `server/routers/dashboard.ts` | Lines 187, 191, 193, 195, 374 |
| `server/dataCardMetricsDb.ts` | Lines 258, 379 |

---

## Task W3-B1: Low Stock Threshold Query (Line 187)

**Current Code:**
```typescript
// TODO: Query batches with quantity below threshold
lowStockCount: 0,
```

**Implementation:**

```typescript
import { db } from "../_core/db";
import { batches, products } from "../../drizzle/schema";
import { eq, and, lt, isNull, sql } from "drizzle-orm";

// Get low stock count
async function getLowStockCount(threshold: number = 10): Promise<number> {
  const result = await db
    .select({
      count: sql<number>`COUNT(*)`,
    })
    .from(batches)
    .where(
      and(
        lt(batches.quantityAvailable, threshold),
        eq(batches.status, "LIVE"),
        isNull(batches.deletedAt)
      )
    );

  return result[0]?.count ?? 0;
}

// Get low stock items with details
async function getLowStockItems(threshold: number = 10, limit: number = 10) {
  return await db.query.batches.findMany({
    where: and(
      lt(batches.quantityAvailable, threshold),
      eq(batches.status, "LIVE"),
      isNull(batches.deletedAt)
    ),
    with: {
      product: {
        columns: { id: true, name: true },
      },
    },
    orderBy: [asc(batches.quantityAvailable)],
    limit,
  });
}

// In the dashboard summary:
const lowStockCount = await getLowStockCount(LOW_STOCK_THRESHOLD);
const lowStockItems = await getLowStockItems(LOW_STOCK_THRESHOLD, 5);
```

---

## Task W3-B2: Period Change Calculations (Lines 191, 193, 195)

**Current Code (Line 191):**
```typescript
// TODO: Calculate change vs previous period
revenueChange: 0,
```

**Current Code (Line 193):**
```typescript
// TODO: Calculate change vs previous period
ordersChange: 0,
```

**Current Code (Line 195):**
```typescript
// TODO: Calculate change vs previous period
customersChange: 0,
```

**Implementation:**

```typescript
import { subDays, subMonths, startOfDay, endOfDay } from "date-fns";

interface PeriodMetrics {
  revenue: number;
  orderCount: number;
  customerCount: number;
}

// Get metrics for a date range
async function getMetricsForPeriod(
  startDate: Date,
  endDate: Date
): Promise<PeriodMetrics> {
  // Revenue from completed orders
  const revenueData = await db
    .select({
      total: sql<number>`COALESCE(SUM(total), 0)`,
      count: sql<number>`COUNT(*)`,
    })
    .from(orders)
    .where(
      and(
        eq(orders.status, "completed"),
        gte(orders.completedAt, startDate),
        lte(orders.completedAt, endDate)
      )
    );

  // Unique customers
  const customerData = await db
    .select({
      count: sql<number>`COUNT(DISTINCT customer_id)`,
    })
    .from(orders)
    .where(
      and(
        eq(orders.status, "completed"),
        gte(orders.completedAt, startDate),
        lte(orders.completedAt, endDate)
      )
    );

  return {
    revenue: revenueData[0]?.total ?? 0,
    orderCount: revenueData[0]?.count ?? 0,
    customerCount: customerData[0]?.count ?? 0,
  };
}

// Calculate percentage change
function calculateChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

// In the dashboard summary:
async function getDashboardWithChanges(periodDays: number = 30) {
  const now = new Date();
  const currentStart = subDays(now, periodDays);
  const previousStart = subDays(currentStart, periodDays);
  const previousEnd = subDays(now, periodDays);

  const currentMetrics = await getMetricsForPeriod(currentStart, now);
  const previousMetrics = await getMetricsForPeriod(previousStart, previousEnd);

  return {
    revenue: currentMetrics.revenue,
    revenueChange: calculateChange(currentMetrics.revenue, previousMetrics.revenue),
    orderCount: currentMetrics.orderCount,
    ordersChange: calculateChange(currentMetrics.orderCount, previousMetrics.orderCount),
    customerCount: currentMetrics.customerCount,
    customersChange: calculateChange(currentMetrics.customerCount, previousMetrics.customerCount),
  };
}
```

---

## Task W3-B3: Oldest Debt Calculation (Line 374)

**Current Code:**
```typescript
// TODO: Query oldest unpaid invoice
oldestDebtDays: 0,
```

**Implementation:**

```typescript
import { differenceInDays } from "date-fns";

// Get oldest unpaid invoice
async function getOldestUnpaidInvoice() {
  const oldestInvoice = await db.query.invoices.findFirst({
    where: and(
      eq(invoices.status, "open"),
      isNull(invoices.deletedAt)
    ),
    orderBy: [asc(invoices.createdAt)],
    columns: {
      id: true,
      createdAt: true,
      dueDate: true,
      total: true,
      paidAmount: true,
    },
    with: {
      customer: {
        columns: { id: true, name: true },
      },
    },
  });

  if (!oldestInvoice) {
    return {
      oldestDebtDays: 0,
      oldestInvoice: null,
    };
  }

  const daysSinceCreated = differenceInDays(new Date(), oldestInvoice.createdAt);
  const daysOverdue = oldestInvoice.dueDate 
    ? Math.max(0, differenceInDays(new Date(), oldestInvoice.dueDate))
    : 0;

  return {
    oldestDebtDays: daysSinceCreated,
    daysOverdue,
    oldestInvoice: {
      id: oldestInvoice.id,
      customerName: oldestInvoice.customer?.name ?? "Unknown",
      amount: oldestInvoice.total - oldestInvoice.paidAmount,
      createdAt: oldestInvoice.createdAt,
      dueDate: oldestInvoice.dueDate,
    },
  };
}

// In the dashboard:
const debtInfo = await getOldestUnpaidInvoice();
```

---

## Task W3-B4: Fix dataCardMetricsDb.ts Schema Fields (Lines 258, 379)

**Current Code (Line 258):**
```typescript
// TODO: Remove this metric or add schema field
```

**Current Code (Line 379):**
```typescript
// TODO: Remove this metric or add schema field
```

**Implementation:**

First, check what metrics are being referenced:

```typescript
// Option 1: Remove the metric if not needed
// Simply delete the lines referencing non-existent fields

// Option 2: Add computed metrics that don't require schema changes
// Replace hardcoded values with calculated ones

// In dataCardMetricsDb.ts:

// Line 258 - If this is a metric that needs calculation:
async function getComputedMetric258(): Promise<number> {
  // Calculate from existing data
  const result = await db
    .select({
      value: sql<number>`/* appropriate calculation */`,
    })
    .from(/* appropriate table */);
  
  return result[0]?.value ?? 0;
}

// Line 379 - Similar approach:
async function getComputedMetric379(): Promise<number> {
  // Calculate from existing data
  const result = await db
    .select({
      value: sql<number>`/* appropriate calculation */`,
    })
    .from(/* appropriate table */);
  
  return result[0]?.value ?? 0;
}
```

**Investigation Required:**
Before implementing, check what these TODOs reference:
```bash
# Check context around line 258
sed -n '250,270p' server/dataCardMetricsDb.ts

# Check context around line 379
sed -n '370,390p' server/dataCardMetricsDb.ts
```

---

## Complete Dashboard Router Structure

```typescript
import { router, protectedProcedure } from "../_core/trpc";
import { getCurrentUserId } from "../_core/authHelpers";
import { z } from "zod";

export const dashboardRouter = router({
  // Main dashboard summary
  getSummary: protectedProcedure
    .input(z.object({
      periodDays: z.number().default(30),
    }))
    .query(async ({ ctx, input }) => {
      const userId = getCurrentUserId(ctx);
      
      // Get metrics with period changes
      const metrics = await getDashboardWithChanges(input.periodDays);
      
      // Get low stock info
      const lowStockCount = await getLowStockCount(LOW_STOCK_THRESHOLD);
      
      // Get oldest debt info
      const debtInfo = await getOldestUnpaidInvoice();
      
      return {
        ...metrics,
        lowStockCount,
        lowStockThreshold: LOW_STOCK_THRESHOLD,
        ...debtInfo,
      };
    }),

  // Low stock details
  getLowStockItems: protectedProcedure
    .input(z.object({
      threshold: z.number().default(10),
      limit: z.number().default(20),
    }))
    .query(async ({ ctx, input }) => {
      return getLowStockItems(input.threshold, input.limit);
    }),

  // AR aging summary
  getARAgingSummary: protectedProcedure
    .query(async ({ ctx }) => {
      return getARAgingBuckets();
    }),
});

// Constants
const LOW_STOCK_THRESHOLD = 10;

// AR Aging helper
async function getARAgingBuckets() {
  const now = new Date();
  
  const invoices = await db.query.invoices.findMany({
    where: and(
      eq(invoices.status, "open"),
      isNull(invoices.deletedAt)
    ),
  });

  const buckets = {
    current: 0,      // 0-30 days
    days30: 0,       // 31-60 days
    days60: 0,       // 61-90 days
    days90Plus: 0,   // 90+ days
  };

  for (const invoice of invoices) {
    const age = differenceInDays(now, invoice.createdAt);
    const amount = invoice.total - invoice.paidAmount;

    if (age <= 30) buckets.current += amount;
    else if (age <= 60) buckets.days30 += amount;
    else if (age <= 90) buckets.days60 += amount;
    else buckets.days90Plus += amount;
  }

  return buckets;
}
```

---

## Deliverables Checklist

- [ ] `dashboard.ts` - Line 187: Low stock threshold query implemented
- [ ] `dashboard.ts` - Line 191: Revenue change vs previous period
- [ ] `dashboard.ts` - Line 193: Orders change vs previous period
- [ ] `dashboard.ts` - Line 195: Customers change vs previous period
- [ ] `dashboard.ts` - Line 374: Oldest debt calculation implemented
- [ ] `dataCardMetricsDb.ts` - Lines 258, 379: Schema field issues resolved
- [ ] All TODO comments removed from both files

---

## QA Requirements (Before Merge)

```bash
# 1. TypeScript check
pnpm typecheck

# 2. Lint check
pnpm lint

# 3. Verify no TODOs remain
grep -n "TODO" server/routers/dashboard.ts server/dataCardMetricsDb.ts
# Should return nothing (or only unrelated TODOs)

# 4. Run tests
pnpm test dashboard dataCardMetrics

# 5. Integration test
# - Get dashboard summary
# - Verify low stock count matches actual low stock items
# - Verify period changes are calculated correctly
# - Verify oldest debt is accurate
```

---

## Do NOT

- ❌ Touch files not in your ownership list
- ❌ Modify database schema
- ❌ Return fake/hardcoded data
- ❌ Introduce new TODOs
- ❌ Skip null checks on aggregations

---

## Dependencies

Use these Wave 0 utilities:
- `getCurrentUserId(ctx)` from `server/_core/authHelpers.ts`

External dependencies (should already be installed):
- `date-fns` for date calculations

---

## Success Criteria

Your work is complete when:

- [ ] All 7 TODOs resolved (5 in dashboard.ts, 2 in dataCardMetricsDb.ts)
- [ ] Dashboard shows real metrics
- [ ] Period changes are accurate
- [ ] Low stock alerts work
- [ ] Oldest debt tracking works
- [ ] `pnpm typecheck` passes
- [ ] `pnpm test` passes
- [ ] Code merged to main

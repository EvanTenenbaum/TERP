# BE-QA-004: Complete Dashboard Metrics Schema Implementation

<!-- METADATA (for validation) -->
<!-- TASK_ID: BE-QA-004 -->
<!-- TASK_TITLE: Complete Dashboard Metrics Schema Implementation -->
<!-- PROMPT_VERSION: 1.0 -->
<!-- LAST_VALIDATED: 2026-01-14 -->

**Repository:** https://github.com/EvanTenenbaum/TERP
**Task ID:** BE-QA-004
**Estimated Time:** 8h
**Module:** `server/services/dataCardMetricsDb.ts`

## Context

**Background:**
Dashboard metrics at `server/services/dataCardMetricsDb.ts:252-396` return zeros because:
- Required database columns are missing
- Aggregation queries reference non-existent columns
- Schema doesn't match expected data model

**Goal:**
Complete the schema and implement real metrics calculations.

**Success Criteria:**
- All metrics return real data
- Dashboard widgets show accurate numbers
- No hardcoded zeros

## Implementation Guide

### Step 1: Identify Missing Columns

Review the metrics code and find column references:
```typescript
// Example from dataCardMetricsDb.ts
const totalSales = await db.select({
  total: sql`SUM(total_amount)` // Does total_amount column exist?
}).from(orders);
```

### Step 2: Audit Schema Against Metrics

For each metric function:
1. List columns it references
2. Verify columns exist in schema
3. Add missing columns

### Step 3: Add Missing Columns

```sql
-- Example migration for missing columns
ALTER TABLE orders ADD COLUMN total_amount DECIMAL(10, 2);
ALTER TABLE orders ADD COLUMN profit_margin DECIMAL(5, 2);
ALTER TABLE inventory ADD COLUMN avg_cost DECIMAL(10, 2);
```

### Step 4: Backfill Data

For existing records, calculate missing values:
```sql
-- Example backfill
UPDATE orders SET total_amount = (
  SELECT SUM(quantity * unit_price)
  FROM order_items
  WHERE order_items.order_id = orders.id
);
```

### Step 5: Update Metrics Functions

Ensure metrics use correct column names:
```typescript
// server/services/dataCardMetricsDb.ts

export async function getSalesSummary(dateRange: DateRange) {
  const db = await getDb();

  return db.select({
    totalRevenue: sql<number>`COALESCE(SUM(${orders.totalAmount}), 0)`,
    totalOrders: sql<number>`COUNT(*)`,
    avgOrderValue: sql<number>`COALESCE(AVG(${orders.totalAmount}), 0)`,
    profitMargin: sql<number>`COALESCE(AVG(${orders.profitMargin}), 0)`
  })
  .from(orders)
  .where(
    and(
      gte(orders.createdAt, dateRange.start),
      lte(orders.createdAt, dateRange.end)
    )
  );
}
```

### Step 6: Add Index for Performance

```sql
CREATE INDEX idx_orders_created_at ON orders(created_at);
CREATE INDEX idx_orders_status ON orders(status);
```

## Deliverables

- [ ] Audit all metrics functions for column references
- [ ] Document all missing columns
- [ ] Create migration for missing columns
- [ ] Backfill data for existing records
- [ ] Update metrics functions
- [ ] Add performance indexes

## Quick Reference

**File to modify:** `server/services/dataCardMetricsDb.ts:252-396`

**Find column references:**
```bash
grep -rn "sql\`" server/services/dataCardMetricsDb.ts
```

**Test metrics:**
```bash
curl http://localhost:5173/api/trpc/metrics.getSummary
```

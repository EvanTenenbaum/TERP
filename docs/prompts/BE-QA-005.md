# BE-QA-005: Fix Supplier Metrics Null Return Values

<!-- METADATA (for validation) -->
<!-- TASK_ID: BE-QA-005 -->
<!-- TASK_TITLE: Fix Supplier Metrics Null Return Values -->
<!-- PROMPT_VERSION: 1.0 -->
<!-- LAST_VALIDATED: 2026-01-14 -->

**Repository:** https://github.com/EvanTenenbaum/TERP
**Task ID:** BE-QA-005
**Estimated Time:** 4h
**Module:** `server/services/supplierMetrics.ts`

## Context

**Background:**
Supplier metrics at `server/services/supplierMetrics.ts:166-225` return null for:
- Quality score
- Return rate
- On-time delivery rate
- Average lead time

These should be calculated from actual data.

**Goal:**
Implement real supplier metric calculations.

**Success Criteria:**
- All metrics return calculated values
- Null only when no data available
- Accurate calculations

## Implementation Guide

### Step 1: Define Metric Calculations

**Quality Score:**
```typescript
// Based on returns and complaints
qualityScore = 100 - (returnRate * 50) - (complaintRate * 50)
```

**Return Rate:**
```typescript
// Percentage of items returned
returnRate = (returnedQuantity / totalQuantity) * 100
```

**On-Time Delivery:**
```typescript
// Percentage delivered by expected date
onTimeRate = (onTimeDeliveries / totalDeliveries) * 100
```

### Step 2: Update getSupplierQualityScore

```typescript
// server/services/supplierMetrics.ts

export async function getSupplierQualityScore(supplierId: number) {
  const db = await getDb();

  // Get return data
  const [returnData] = await db.select({
    totalItems: sql<number>`COUNT(*)`,
    returnedItems: sql<number>`SUM(CASE WHEN returned = 1 THEN 1 ELSE 0 END)`
  })
  .from(purchaseOrderItems)
  .innerJoin(purchaseOrders, eq(purchaseOrderItems.orderId, purchaseOrders.id))
  .where(eq(purchaseOrders.supplierId, supplierId));

  if (!returnData || returnData.totalItems === 0) {
    return null; // No data available
  }

  const returnRate = (returnData.returnedItems / returnData.totalItems) * 100;
  const qualityScore = Math.max(0, 100 - returnRate);

  return Math.round(qualityScore * 10) / 10; // Round to 1 decimal
}
```

### Step 3: Update getSupplierReturnRate

```typescript
export async function getSupplierReturnRate(supplierId: number) {
  const db = await getDb();

  const [data] = await db.select({
    totalQuantity: sql<number>`SUM(quantity)`,
    returnedQuantity: sql<number>`SUM(returned_quantity)`
  })
  .from(purchaseOrderItems)
  .innerJoin(purchaseOrders, eq(purchaseOrderItems.orderId, purchaseOrders.id))
  .where(eq(purchaseOrders.supplierId, supplierId));

  if (!data || data.totalQuantity === 0) {
    return null;
  }

  return (data.returnedQuantity / data.totalQuantity) * 100;
}
```

### Step 4: Add Missing Columns

If columns don't exist, add them:
```sql
ALTER TABLE purchase_order_items ADD COLUMN returned INTEGER DEFAULT 0;
ALTER TABLE purchase_order_items ADD COLUMN returned_quantity DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE purchase_orders ADD COLUMN expected_delivery_date INTEGER;
ALTER TABLE purchase_orders ADD COLUMN actual_delivery_date INTEGER;
```

### Step 5: Calculate On-Time Delivery

```typescript
export async function getSupplierOnTimeRate(supplierId: number) {
  const db = await getDb();

  const [data] = await db.select({
    totalDeliveries: sql<number>`COUNT(*)`,
    onTimeDeliveries: sql<number>`SUM(
      CASE WHEN actual_delivery_date <= expected_delivery_date THEN 1 ELSE 0 END
    )`
  })
  .from(purchaseOrders)
  .where(
    and(
      eq(purchaseOrders.supplierId, supplierId),
      isNotNull(purchaseOrders.actualDeliveryDate)
    )
  );

  if (!data || data.totalDeliveries === 0) {
    return null;
  }

  return (data.onTimeDeliveries / data.totalDeliveries) * 100;
}
```

## Deliverables

- [ ] Implement getSupplierQualityScore
- [ ] Implement getSupplierReturnRate
- [ ] Implement getSupplierOnTimeRate
- [ ] Implement getSupplierAvgLeadTime
- [ ] Add any missing database columns
- [ ] Add unit tests for calculations

## Quick Reference

**File to modify:** `server/services/supplierMetrics.ts:166-225`

**Related tables:**
- `purchaseOrders`
- `purchaseOrderItems`
- `suppliers`

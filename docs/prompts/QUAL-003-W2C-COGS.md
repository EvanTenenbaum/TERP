# QUAL-003 Wave 2C: COGS Module Implementation

**Wave:** 2 (Core Business Logic)  
**Agent:** 2C (COGS)  
**Priority:** 🟡 HIGH - Financial data integrity  
**Estimated Time:** 3 hours  
**Dependencies:** Wave 1 complete

---

## Mission

Implement the Cost of Goods Sold (COGS) module with proper calculation, tracking, and reporting functionality.

---

## Files You Own (EXCLUSIVE)

Only you will touch these files. No other agent will modify them.

| File | TODOs |
|------|-------|
| `server/routers/cogs.ts` | Lines 14, 27, 35 |

---

## Task W2-C1: Implement getCOGS Procedure (Line 14)

**Current Code:**
```typescript
// TODO: Implement COGS management
getCOGS: protectedProcedure
  .input(z.object({ /* ... */ }))
  .query(async ({ ctx, input }) => {
    // TODO: Implement
  }),
```

**Implementation:**

```typescript
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getCurrentUserId } from "../_core/authHelpers";
import { db } from "../_core/db";
import { orders, orderItems, batches, products } from "../../drizzle/schema";
import { eq, and, gte, lte, sql, desc } from "drizzle-orm";

const getCOGSInput = z.object({
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  productId: z.number().optional(),
  batchId: z.number().optional(),
});

export const cogsRouter = router({
  // Get COGS summary for a period
  getCOGS: protectedProcedure
    .input(getCOGSInput)
    .query(async ({ ctx, input }) => {
      const userId = getCurrentUserId(ctx);
      const { startDate, endDate, productId, batchId } = input;

      // Build date filter
      const dateFilters = [];
      if (startDate) {
        dateFilters.push(gte(orders.createdAt, startDate));
      }
      if (endDate) {
        dateFilters.push(lte(orders.createdAt, endDate));
      }

      // Query COGS data
      const cogsData = await db
        .select({
          totalCOGS: sql<number>`SUM(${orderItems.quantity} * ${orderItems.costPerUnit})`,
          totalRevenue: sql<number>`SUM(${orderItems.quantity} * ${orderItems.unitPrice})`,
          totalQuantity: sql<number>`SUM(${orderItems.quantity})`,
          orderCount: sql<number>`COUNT(DISTINCT ${orders.id})`,
        })
        .from(orderItems)
        .innerJoin(orders, eq(orderItems.orderId, orders.id))
        .where(
          and(
            eq(orders.status, "completed"),
            ...dateFilters,
            productId ? eq(orderItems.productId, productId) : undefined,
            batchId ? eq(orderItems.batchId, batchId) : undefined
          )
        );

      const result = cogsData[0] ?? {
        totalCOGS: 0,
        totalRevenue: 0,
        totalQuantity: 0,
        orderCount: 0,
      };

      return {
        ...result,
        grossProfit: result.totalRevenue - result.totalCOGS,
        grossMargin: result.totalRevenue > 0 
          ? ((result.totalRevenue - result.totalCOGS) / result.totalRevenue) * 100 
          : 0,
      };
    }),
```

---

## Task W2-C2: Implement calculateCOGS Procedure (Line 27)

**Current Code:**
```typescript
// TODO: Implement COGS management
calculateCOGS: protectedProcedure
  .input(z.object({ /* ... */ }))
  .mutation(async ({ ctx, input }) => {
    // TODO: Implement
  }),
```

**Implementation:**

```typescript
const calculateCOGSInput = z.object({
  orderId: z.number(),
});

// Calculate COGS for a specific order
calculateCOGS: protectedProcedure
  .input(calculateCOGSInput)
  .mutation(async ({ ctx, input }) => {
    const userId = getCurrentUserId(ctx);
    const { orderId } = input;

    return await db.transaction(async (tx) => {
      // 1. Get order items with batch cost data
      const items = await tx.query.orderItems.findMany({
        where: eq(orderItems.orderId, orderId),
        with: {
          batch: true,
          product: true,
        },
      });

      // 2. Calculate COGS for each item
      const itemCOGS = items.map((item) => {
        // Use batch cost if available, otherwise product default cost
        const costPerUnit = item.batch?.costPerUnit 
          ?? item.product?.defaultCost 
          ?? 0;
        
        return {
          orderItemId: item.id,
          productId: item.productId,
          batchId: item.batchId,
          quantity: item.quantity,
          costPerUnit,
          totalCost: item.quantity * costPerUnit,
        };
      });

      // 3. Calculate total COGS
      const totalCOGS = itemCOGS.reduce((sum, item) => sum + item.totalCost, 0);

      // 4. Update order with COGS
      await tx
        .update(orders)
        .set({
          cogs: totalCOGS,
          cogsCalculatedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(orders.id, orderId));

      // 5. Update individual item costs
      for (const item of itemCOGS) {
        await tx
          .update(orderItems)
          .set({
            costPerUnit: item.costPerUnit,
            totalCost: item.totalCost,
          })
          .where(eq(orderItems.id, item.orderItemId));
      }

      return {
        orderId,
        totalCOGS,
        itemCount: itemCOGS.length,
        items: itemCOGS,
      };
    });
  }),
```

---

## Task W2-C3: Implement updateCOGS Procedure (Line 35)

**Current Code:**
```typescript
// TODO: Implement COGS management
updateCOGS: protectedProcedure
  .input(z.object({ /* ... */ }))
  .mutation(async ({ ctx, input }) => {
    // TODO: Implement
  }),
```

**Implementation:**

```typescript
const updateCOGSInput = z.object({
  batchId: z.number(),
  newCostPerUnit: z.number().positive(),
  reason: z.string().min(1),
  effectiveDate: z.date().optional(),
});

// Update COGS for a batch (cost adjustment)
updateCOGS: protectedProcedure
  .input(updateCOGSInput)
  .mutation(async ({ ctx, input }) => {
    const userId = getCurrentUserId(ctx);
    const { batchId, newCostPerUnit, reason, effectiveDate } = input;

    return await db.transaction(async (tx) => {
      // 1. Get current batch
      const batch = await tx.query.batches.findFirst({
        where: eq(batches.id, batchId),
      });

      if (!batch) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Batch ${batchId} not found`,
        });
      }

      const oldCostPerUnit = batch.costPerUnit ?? 0;

      // 2. Update batch cost
      await tx
        .update(batches)
        .set({
          costPerUnit: newCostPerUnit,
          updatedAt: new Date(),
        })
        .where(eq(batches.id, batchId));

      // 3. Create cost adjustment record
      await tx.insert(costAdjustments).values({
        batchId,
        oldCost: oldCostPerUnit,
        newCost: newCostPerUnit,
        reason,
        effectiveDate: effectiveDate ?? new Date(),
        adjustedBy: userId,
        createdAt: new Date(),
      });

      // 4. Optionally recalculate COGS for affected orders
      // (only for orders after effective date that haven't been finalized)
      if (effectiveDate) {
        const affectedOrders = await tx.query.orders.findMany({
          where: and(
            eq(orders.status, "pending"),
            gte(orders.createdAt, effectiveDate)
          ),
          with: {
            items: {
              where: eq(orderItems.batchId, batchId),
            },
          },
        });

        for (const order of affectedOrders) {
          if (order.items.length > 0) {
            // Recalculate this order's COGS
            const newOrderCOGS = await recalculateOrderCOGS(order.id, tx);
          }
        }
      }

      return {
        batchId,
        oldCostPerUnit,
        newCostPerUnit,
        adjustment: newCostPerUnit - oldCostPerUnit,
        adjustedBy: userId,
      };
    });
  }),
```

---

## Additional Helper Functions

Add these helper functions to support the COGS module:

```typescript
// Helper: Recalculate COGS for an order
async function recalculateOrderCOGS(
  orderId: number,
  tx: Transaction
): Promise<number> {
  const items = await tx.query.orderItems.findMany({
    where: eq(orderItems.orderId, orderId),
    with: { batch: true },
  });

  let totalCOGS = 0;
  for (const item of items) {
    const costPerUnit = item.batch?.costPerUnit ?? item.costPerUnit ?? 0;
    const itemCOGS = item.quantity * costPerUnit;
    totalCOGS += itemCOGS;

    await tx
      .update(orderItems)
      .set({ costPerUnit, totalCost: itemCOGS })
      .where(eq(orderItems.id, item.id));
  }

  await tx
    .update(orders)
    .set({ cogs: totalCOGS, cogsCalculatedAt: new Date() })
    .where(eq(orders.id, orderId));

  return totalCOGS;
}

// Helper: Get COGS breakdown by product
async function getCOGSByProduct(
  startDate: Date,
  endDate: Date
): Promise<ProductCOGS[]> {
  return await db
    .select({
      productId: orderItems.productId,
      productName: products.name,
      totalQuantity: sql<number>`SUM(${orderItems.quantity})`,
      totalCOGS: sql<number>`SUM(${orderItems.totalCost})`,
      totalRevenue: sql<number>`SUM(${orderItems.quantity} * ${orderItems.unitPrice})`,
    })
    .from(orderItems)
    .innerJoin(orders, eq(orderItems.orderId, orders.id))
    .innerJoin(products, eq(orderItems.productId, products.id))
    .where(
      and(
        eq(orders.status, "completed"),
        gte(orders.createdAt, startDate),
        lte(orders.createdAt, endDate)
      )
    )
    .groupBy(orderItems.productId, products.name)
    .orderBy(desc(sql`SUM(${orderItems.totalCost})`));
}
```

---

## Complete Router Structure

```typescript
import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getCurrentUserId } from "../_core/authHelpers";
import { TRPCError } from "@trpc/server";
import { db } from "../_core/db";
import { orders, orderItems, batches, products, costAdjustments } from "../../drizzle/schema";
import { eq, and, gte, lte, sql, desc } from "drizzle-orm";

export const cogsRouter = router({
  getCOGS: protectedProcedure
    .input(/* ... */)
    .query(/* ... */),

  calculateCOGS: protectedProcedure
    .input(/* ... */)
    .mutation(/* ... */),

  updateCOGS: protectedProcedure
    .input(/* ... */)
    .mutation(/* ... */),

  // Additional endpoints
  getCOGSByProduct: protectedProcedure
    .input(z.object({
      startDate: z.date(),
      endDate: z.date(),
    }))
    .query(async ({ ctx, input }) => {
      return getCOGSByProduct(input.startDate, input.endDate);
    }),

  getCOGSHistory: protectedProcedure
    .input(z.object({
      batchId: z.number(),
    }))
    .query(async ({ ctx, input }) => {
      return await db.query.costAdjustments.findMany({
        where: eq(costAdjustments.batchId, input.batchId),
        orderBy: [desc(costAdjustments.createdAt)],
      });
    }),
});
```

---

## Deliverables Checklist

- [ ] `getCOGS` procedure implemented - returns COGS summary with gross profit/margin
- [ ] `calculateCOGS` procedure implemented - calculates and stores COGS for an order
- [ ] `updateCOGS` procedure implemented - adjusts batch costs with audit trail
- [ ] Helper functions created for COGS calculations
- [ ] All TODO comments removed from `server/routers/cogs.ts`
- [ ] Unit tests for each procedure

---

## QA Requirements (Before Merge)

```bash
# 1. TypeScript check
pnpm typecheck

# 2. Lint check
pnpm lint

# 3. Verify no TODOs remain
grep -n "TODO" server/routers/cogs.ts
# Should return nothing

# 4. Run tests
pnpm test cogs

# 5. Integration test
# - Create an order with items
# - Call calculateCOGS
# - Verify COGS is calculated correctly
# - Update batch cost
# - Verify cost adjustment is recorded
```

---

## Do NOT

- ❌ Touch files not in your ownership list
- ❌ Modify order or batch schemas (use existing fields)
- ❌ Skip transaction wrapping for multi-step operations
- ❌ Introduce new TODOs
- ❌ Use hardcoded values

---

## Dependencies

Use these Wave 0 utilities:
- `getCurrentUserId(ctx)` from `server/_core/authHelpers.ts`
- `getFiscalPeriodId(date)` from `server/_core/fiscalPeriod.ts` (if needed for reporting)

---

## Success Criteria

Your work is complete when:

- [ ] All 3 main procedures implemented
- [ ] COGS calculation is accurate
- [ ] Cost adjustments are tracked with audit trail
- [ ] `pnpm typecheck` passes
- [ ] `pnpm test` passes
- [ ] Code merged to main

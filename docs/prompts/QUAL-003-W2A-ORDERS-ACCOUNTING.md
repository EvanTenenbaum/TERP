# QUAL-003 Wave 2A: Orders → Accounting Integration

**Wave:** 2 (Core Business Logic)  
**Agent:** 2A (Orders)  
**Priority:** 🟡 HIGH - Financial data integrity  
**Estimated Time:** 4 hours  
**Dependencies:** Wave 1 complete

---

## Mission

Complete the accounting integration in the orders module. When orders are created, finalized, or cancelled, the appropriate accounting entries should be generated.

---

## Files You Own (EXCLUSIVE)

Only you will touch this file. No other agent will modify it.

| File | TODOs |
|------|-------|
| `server/ordersDb.ts` | Lines 314-316, 555, 593-594, 744, 761, 772 |

---

## Task W2-A1: Order Finalization Accounting (Lines 314-316, 744)

**Current Code (Lines 314-316):**
```typescript
// TODO: Create invoice (accounting integration)
// TODO: Record cash payment (accounting integration)
// TODO: Update credit exposure (credit intelligence integration)
```

**Current Code (Line 744):**
```typescript
// 8. TODO: Create invoice, record payment, update credit
```

**Implementation:**

```typescript
import { createInvoiceFromOrder } from "../services/invoiceService";
import { recordPayment } from "../services/paymentService";
import { updateClientCreditExposure } from "../services/creditService";

// In the order finalization function:
async function finalizeOrder(orderId: number, ctx: Context) {
  const order = await getOrderById(orderId);
  
  // 1. Create invoice
  const invoice = await createInvoiceFromOrder({
    orderId: order.id,
    customerId: order.customerId,
    items: order.items,
    total: order.total,
    createdBy: getCurrentUserId(ctx),
  });

  // 2. If cash payment, record it
  if (order.paymentMethod === "cash") {
    await recordPayment({
      invoiceId: invoice.id,
      amount: order.total,
      method: "cash",
      createdBy: getCurrentUserId(ctx),
    });
  }

  // 3. Update credit exposure
  await updateClientCreditExposure(order.customerId);

  return { order, invoice };
}
```

---

## Task W2-A2: Order Items Update (Line 555)

**Current Code:**
```typescript
// TODO: Handle items updates (would require recalculating COGS, totals, etc.)
```

**Implementation:**

```typescript
async function updateOrderItems(
  orderId: number,
  items: OrderItem[],
  ctx: Context
) {
  return await db.transaction(async (tx) => {
    // 1. Get current order
    const order = await tx.query.orders.findFirst({
      where: eq(orders.id, orderId),
      with: { items: true },
    });

    // 2. Calculate new totals
    const newSubtotal = items.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0
    );

    // 3. Recalculate COGS
    const newCogs = await calculateOrderCOGS(items);

    // 4. Update items
    await tx.delete(orderItems).where(eq(orderItems.orderId, orderId));
    await tx.insert(orderItems).values(
      items.map((item) => ({ ...item, orderId }))
    );

    // 5. Update order totals
    await tx
      .update(orders)
      .set({
        subtotal: newSubtotal,
        total: newSubtotal + (order?.taxAmount ?? 0),
        cogs: newCogs,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, orderId));

    return { orderId, newSubtotal, newCogs };
  });
}
```

---

## Task W2-A3: Order Cancellation (Lines 593-594)

**Current Code:**
```typescript
// TODO: Restore inventory (reverse the inventory deduction)
// TODO: Reverse accounting entries (if invoice was created)
```

**Implementation:**

```typescript
import { restoreInventoryFromOrder } from "../services/inventoryService";
import { reverseOrderAccountingEntries } from "../services/accountingService";

async function cancelOrder(orderId: number, ctx: Context) {
  const userId = getCurrentUserId(ctx);
  
  return await db.transaction(async (tx) => {
    // 1. Get order with items
    const order = await tx.query.orders.findFirst({
      where: eq(orders.id, orderId),
      with: { items: true, invoice: true },
    });

    if (!order) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });
    }

    // 2. Restore inventory
    for (const item of order.items) {
      await restoreInventoryFromOrder({
        batchId: item.batchId,
        quantity: item.quantity,
        orderId: order.id,
        tx,
      });
    }

    // 3. Reverse accounting entries if invoice exists
    if (order.invoice) {
      await reverseOrderAccountingEntries({
        invoiceId: order.invoice.id,
        orderId: order.id,
        reason: "Order cancelled",
        reversedBy: userId,
        tx,
      });
    }

    // 4. Update order status
    await tx
      .update(orders)
      .set({
        status: "cancelled",
        cancelledAt: new Date(),
        cancelledBy: userId,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, orderId));

    return { orderId, status: "cancelled" };
  });
}
```

---

## Task W2-A4: Duplicate Finalization Logic (Line 744)

**Current Code:**
```typescript
// 8. TODO: Create invoice, record payment, update credit
```

**Note:** This is a duplicate of Task W2-A1 (Lines 314-316). The same logic applies.

**Implementation:**

Refactor to use a shared function:

```typescript
// Create a shared helper function
async function processOrderFinalization(
  order: Order,
  ctx: Context,
  tx: Transaction
) {
  const userId = getCurrentUserId(ctx);

  // 1. Create invoice
  const invoice = await createInvoiceFromOrder({
    orderId: order.id,
    customerId: order.customerId,
    items: order.items,
    total: order.total,
    createdBy: userId,
    tx,
  });

  // 2. If cash payment, record it
  if (order.paymentMethod === "cash") {
    await recordPayment({
      invoiceId: invoice.id,
      amount: order.total,
      method: "cash",
      createdBy: userId,
      tx,
    });
  }

  // 3. Update credit exposure
  await updateClientCreditExposure(order.customerId, tx);

  return invoice;
}

// Use in both locations (314-316 and 744)
const invoice = await processOrderFinalization(order, ctx, tx);
```

---

## Task W2-A5: Export Logic (Lines 761, 772)

**Current Code (Line 761):**
```typescript
// TODO: Implement export logic
```

**Current Code (Line 772):**
```typescript
// TODO: Implement export logic
```

**Implementation:**

```typescript
import { generateCSV, generatePDF } from "../utils/exportUtils";

// Export orders to CSV
async function exportOrdersToCSV(
  filters: OrderFilters,
  ctx: Context
): Promise<string> {
  const userId = getCurrentUserId(ctx);
  
  const orders = await db.query.orders.findMany({
    where: buildOrderFilters(filters),
    with: { items: true, customer: true },
    orderBy: [desc(orders.createdAt)],
  });

  const csvData = orders.map((order) => ({
    "Order ID": order.id,
    "Customer": order.customer?.name ?? "N/A",
    "Date": order.createdAt.toISOString(),
    "Status": order.status,
    "Subtotal": order.subtotal,
    "Tax": order.taxAmount,
    "Total": order.total,
    "Items": order.items.length,
    "Payment Method": order.paymentMethod,
  }));

  return generateCSV(csvData);
}

// Export orders to PDF
async function exportOrdersToPDF(
  filters: OrderFilters,
  ctx: Context
): Promise<Buffer> {
  const userId = getCurrentUserId(ctx);
  
  const orders = await db.query.orders.findMany({
    where: buildOrderFilters(filters),
    with: { items: true, customer: true },
    orderBy: [desc(orders.createdAt)],
  });

  return generatePDF({
    title: "Orders Report",
    generatedBy: userId,
    generatedAt: new Date(),
    data: orders,
    columns: ["id", "customer.name", "createdAt", "status", "total"],
  });
}
```

---

## Deliverables Checklist

- [ ] Task W2-A1: Order finalization creates invoice, records payment, updates credit
- [ ] Task W2-A2: Order items update recalculates COGS and totals
- [ ] Task W2-A3: Order cancellation restores inventory and reverses accounting
- [ ] Task W2-A4: Duplicate finalization logic refactored to shared function
- [ ] Task W2-A5: CSV and PDF export implemented
- [ ] All TODO comments removed from `server/ordersDb.ts`
- [ ] Unit tests for each function

---

## QA Requirements (Before Merge)

```bash
# 1. TypeScript check
pnpm typecheck

# 2. Lint check
pnpm lint

# 3. Verify no TODOs remain in your file
grep -n "TODO" server/ordersDb.ts
# Should return nothing (or only unrelated TODOs)

# 4. Run tests
pnpm test orders

# 5. Test accounting integration
# - Create an order
# - Finalize it
# - Verify invoice was created
# - Cancel the order
# - Verify accounting entries were reversed
```

---

## Do NOT

- ❌ Touch files not in your ownership list
- ❌ Modify other routers or services (create stubs if needed)
- ❌ Skip transaction wrapping for multi-step operations
- ❌ Introduce new TODOs
- ❌ Use hardcoded user IDs

---

## Dependencies

Use these Wave 0 utilities:
- `getCurrentUserId(ctx)` from `server/_core/authHelpers.ts`
- `getFiscalPeriodId(date)` from `server/_core/fiscalPeriod.ts`
- `getAccountIdByName(name)` from `server/_core/accountLookup.ts`

---

## Success Criteria

Your work is complete when:

- [ ] All 5 tasks implemented
- [ ] All TODOs removed from `server/ordersDb.ts`
- [ ] Order finalization creates proper accounting entries
- [ ] Order cancellation properly reverses everything
- [ ] Export functions work
- [ ] `pnpm typecheck` passes
- [ ] `pnpm test` passes
- [ ] Code merged to main

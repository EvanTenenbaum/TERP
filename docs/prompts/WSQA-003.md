# WSQA-003: Add RETURNED Order Status with Restock/Vendor-Return Paths

**Source:** Work Surfaces QA Report (P0-003)
**Priority:** HIGH (P0 Blocker)
**Estimate:** 2d

## Problem Statement

The order status machine only accepts PENDING/PACKED/SHIPPED states. Orders cannot be marked as returned, and there's no workflow for:
1. Restocking returned items to inventory
2. Returning items to vendor for credit

**Product Decision:** Add RETURNED status with two terminal paths:
- **RESTOCKED** - Items returned to inventory (increases batch quantities)
- **RETURNED_TO_VENDOR** - Items sent back to vendor (creates vendor return record)

## Current State

```typescript
// ordersDb.ts:1564-1570 (CURRENT - INCOMPLETE)
const validStatus =
  newStatus === "PENDING" ||
  newStatus === "PACKED" ||
  newStatus === "SHIPPED"
    ? newStatus
    : "PENDING"; // Default to PENDING for unsupported statuses
```

## Implementation Guide

### Phase 1: Schema Updates (2h)

#### Step 1.1: Add New Enum Values

**File:** `server/db/schema.ts`

Update the fulfillment status enum:

```typescript
export const fulfillmentStatusEnum = pgEnum('fulfillment_status', [
  'DRAFT',
  'CONFIRMED',
  'PENDING',
  'PACKED',
  'SHIPPED',
  'DELIVERED',
  'RETURNED',           // NEW
  'RESTOCKED',          // NEW - terminal: items back in inventory
  'RETURNED_TO_VENDOR', // NEW - terminal: items sent to vendor
  'CANCELLED',
]);
```

#### Step 1.2: Create Vendor Returns Table

**File:** `server/db/schema.ts`

Add table to track vendor returns:

```typescript
export const vendorReturns = pgTable('vendor_returns', {
  id: serial('id').primaryKey(),
  orderId: integer('order_id')
    .notNull()
    .references(() => orders.id),
  vendorId: integer('vendor_id')
    .notNull()
    .references(() => clients.id), // Vendors are clients with isSeller=true
  status: varchar('status', { length: 50 })
    .notNull()
    .default('PENDING_VENDOR_CREDIT'),
  returnReason: text('return_reason'),
  totalValue: decimal('total_value', { precision: 10, scale: 2 }),
  creditReceived: decimal('credit_received', { precision: 10, scale: 2 }),
  creditReceivedAt: timestamp('credit_received_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  createdBy: integer('created_by').references(() => users.id),
});

export const vendorReturnItems = pgTable('vendor_return_items', {
  id: serial('id').primaryKey(),
  vendorReturnId: integer('vendor_return_id')
    .notNull()
    .references(() => vendorReturns.id, { onDelete: 'cascade' }),
  batchId: integer('batch_id')
    .notNull()
    .references(() => batches.id),
  quantity: integer('quantity').notNull(),
  unitCost: decimal('unit_cost', { precision: 10, scale: 2 }).notNull(),
});
```

#### Step 1.3: Generate and Run Migration

```bash
pnpm drizzle-kit generate:pg
# Rename: 0XXX_add_return_status_and_vendor_returns.sql
pnpm db:migrate
```

**Migration SQL:**

```sql
-- Add new enum values (PostgreSQL requires specific syntax)
ALTER TYPE fulfillment_status ADD VALUE IF NOT EXISTS 'DRAFT' BEFORE 'PENDING';
ALTER TYPE fulfillment_status ADD VALUE IF NOT EXISTS 'CONFIRMED' AFTER 'DRAFT';
ALTER TYPE fulfillment_status ADD VALUE IF NOT EXISTS 'DELIVERED' AFTER 'SHIPPED';
ALTER TYPE fulfillment_status ADD VALUE IF NOT EXISTS 'RETURNED' AFTER 'DELIVERED';
ALTER TYPE fulfillment_status ADD VALUE IF NOT EXISTS 'RESTOCKED' AFTER 'RETURNED';
ALTER TYPE fulfillment_status ADD VALUE IF NOT EXISTS 'RETURNED_TO_VENDOR' AFTER 'RESTOCKED';
ALTER TYPE fulfillment_status ADD VALUE IF NOT EXISTS 'CANCELLED';

-- Create vendor_returns table
CREATE TABLE vendor_returns (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id),
  vendor_id INTEGER NOT NULL REFERENCES clients(id),
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING_VENDOR_CREDIT',
  return_reason TEXT,
  total_value DECIMAL(10, 2),
  credit_received DECIMAL(10, 2),
  credit_received_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  created_by INTEGER REFERENCES users(id)
);

-- Create vendor_return_items table
CREATE TABLE vendor_return_items (
  id SERIAL PRIMARY KEY,
  vendor_return_id INTEGER NOT NULL REFERENCES vendor_returns(id) ON DELETE CASCADE,
  batch_id INTEGER NOT NULL REFERENCES batches(id),
  quantity INTEGER NOT NULL,
  unit_cost DECIMAL(10, 2) NOT NULL
);

-- Indexes
CREATE INDEX idx_vendor_returns_order ON vendor_returns(order_id);
CREATE INDEX idx_vendor_returns_vendor ON vendor_returns(vendor_id);
CREATE INDEX idx_vendor_return_items_return ON vendor_return_items(vendor_return_id);
```

### Phase 2: State Machine Logic (4h)

#### Step 2.1: Define Valid Transitions

**File:** `server/services/orderStateMachine.ts`

```typescript
export const ORDER_STATUS_TRANSITIONS: Record<string, string[]> = {
  'DRAFT': ['CONFIRMED', 'CANCELLED'],
  'CONFIRMED': ['PENDING', 'CANCELLED'],
  'PENDING': ['PACKED', 'CANCELLED'],
  'PACKED': ['SHIPPED'],
  'SHIPPED': ['DELIVERED', 'RETURNED'],
  'DELIVERED': ['RETURNED'],
  'RETURNED': ['RESTOCKED', 'RETURNED_TO_VENDOR'],
  'RESTOCKED': [],          // Terminal
  'RETURNED_TO_VENDOR': [], // Terminal
  'CANCELLED': [],          // Terminal
};

export function canTransition(from: string, to: string): boolean {
  return ORDER_STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}

export function getNextStatuses(current: string): string[] {
  return ORDER_STATUS_TRANSITIONS[current] ?? [];
}
```

#### Step 2.2: Update Order Status Validation

**File:** `server/ordersDb.ts`

Replace hardcoded validation at lines 1564-1570:

```typescript
import { canTransition, getNextStatuses } from './services/orderStateMachine';

// In updateOrderStatus function
const currentStatus = existingOrder.fulfillmentStatus;
if (!canTransition(currentStatus, newStatus)) {
  const validNext = getNextStatuses(currentStatus);
  throw new TRPCError({
    code: 'BAD_REQUEST',
    message: `Cannot transition from ${currentStatus} to ${newStatus}. Valid transitions: ${validNext.join(', ')}`,
  });
}
```

### Phase 3: Return Processing Logic (4h)

#### Step 3.1: Restock Processing

**File:** `server/services/returnProcessing.ts`

```typescript
export async function processRestock(orderId: number, userId: number): Promise<void> {
  await db.transaction(async (tx) => {
    // Get order with line items and allocations
    const order = await tx.select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .then(rows => rows[0]);

    if (order.fulfillmentStatus !== 'RETURNED') {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Order must be in RETURNED status to restock',
      });
    }

    // Get line items with allocations
    const lineItems = await tx.select()
      .from(orderLineItems)
      .where(eq(orderLineItems.orderId, orderId));

    for (const item of lineItems) {
      const allocations = await tx.select()
        .from(orderLineItemAllocations)
        .where(eq(orderLineItemAllocations.orderLineItemId, item.id));

      for (const alloc of allocations) {
        // Increase batch quantity (with row lock)
        await tx.update(batches)
          .set({
            onHandQty: sql`${batches.onHandQty} + ${alloc.quantityAllocated}`,
            availableQty: sql`${batches.availableQty} + ${alloc.quantityAllocated}`,
          })
          .where(eq(batches.id, alloc.batchId));

        // Record inventory movement
        await tx.insert(inventoryMovements).values({
          batchId: alloc.batchId,
          movementType: 'RESTOCK',
          quantity: alloc.quantityAllocated,
          notes: `Restocked from returned order #${orderId}`,
          createdBy: userId,
        });
      }
    }

    // Update order status to RESTOCKED
    await tx.update(orders)
      .set({
        fulfillmentStatus: 'RESTOCKED',
        updatedAt: new Date(),
      })
      .where(eq(orders.id, orderId));

    // Log status change
    await tx.insert(orderStatusHistory).values({
      orderId,
      status: 'RESTOCKED',
      changedBy: userId,
      notes: 'Items restocked to inventory',
    });
  });
}
```

#### Step 3.2: Vendor Return Processing

**File:** `server/services/returnProcessing.ts`

```typescript
export async function processVendorReturn(
  orderId: number,
  vendorId: number,
  returnReason: string,
  userId: number
): Promise<number> {
  return await db.transaction(async (tx) => {
    // Validate order status
    const order = await tx.select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .then(rows => rows[0]);

    if (order.fulfillmentStatus !== 'RETURNED') {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Order must be in RETURNED status to return to vendor',
      });
    }

    // Get line items and calculate total value
    const lineItems = await tx.select()
      .from(orderLineItems)
      .where(eq(orderLineItems.orderId, orderId));

    let totalValue = 0;
    const itemsToReturn: { batchId: number; quantity: number; unitCost: number }[] = [];

    for (const item of lineItems) {
      const allocations = await tx.select()
        .from(orderLineItemAllocations)
        .where(eq(orderLineItemAllocations.orderLineItemId, item.id));

      for (const alloc of allocations) {
        totalValue += alloc.quantityAllocated * Number(alloc.unitCost);
        itemsToReturn.push({
          batchId: alloc.batchId,
          quantity: alloc.quantityAllocated,
          unitCost: Number(alloc.unitCost),
        });
      }
    }

    // Create vendor return record
    const [vendorReturn] = await tx.insert(vendorReturns).values({
      orderId,
      vendorId,
      status: 'PENDING_VENDOR_CREDIT',
      returnReason,
      totalValue: totalValue.toString(),
      createdBy: userId,
    }).returning();

    // Create return item records
    for (const item of itemsToReturn) {
      await tx.insert(vendorReturnItems).values({
        vendorReturnId: vendorReturn.id,
        batchId: item.batchId,
        quantity: item.quantity,
        unitCost: item.unitCost.toString(),
      });
    }

    // Update order status
    await tx.update(orders)
      .set({
        fulfillmentStatus: 'RETURNED_TO_VENDOR',
        updatedAt: new Date(),
      })
      .where(eq(orders.id, orderId));

    // Log status change
    await tx.insert(orderStatusHistory).values({
      orderId,
      status: 'RETURNED_TO_VENDOR',
      changedBy: userId,
      notes: `Items returned to vendor. Vendor return #${vendorReturn.id}`,
    });

    return vendorReturn.id;
  });
}
```

### Phase 4: API Endpoints (2h)

#### Step 4.1: Add Return Mutations

**File:** `server/routers/orders.ts`

```typescript
markAsReturned: protectedProcedure
  .input(z.object({
    orderId: z.number(),
    returnReason: z.string().min(1),
  }))
  .mutation(async ({ ctx, input }) => {
    // Validate transition
    const order = await db.select().from(orders).where(eq(orders.id, input.orderId)).then(r => r[0]);
    if (!canTransition(order.fulfillmentStatus, 'RETURNED')) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `Cannot mark order as returned from ${order.fulfillmentStatus} status`,
      });
    }

    await db.update(orders)
      .set({ fulfillmentStatus: 'RETURNED', updatedAt: new Date() })
      .where(eq(orders.id, input.orderId));

    await db.insert(orderStatusHistory).values({
      orderId: input.orderId,
      status: 'RETURNED',
      changedBy: ctx.user.id,
      notes: input.returnReason,
    });

    return { success: true };
  }),

processRestock: protectedProcedure
  .input(z.object({ orderId: z.number() }))
  .mutation(async ({ ctx, input }) => {
    await processRestock(input.orderId, ctx.user.id);
    return { success: true };
  }),

processVendorReturn: protectedProcedure
  .input(z.object({
    orderId: z.number(),
    vendorId: z.number(),
    returnReason: z.string(),
  }))
  .mutation(async ({ ctx, input }) => {
    const vendorReturnId = await processVendorReturn(
      input.orderId,
      input.vendorId,
      input.returnReason,
      ctx.user.id
    );
    return { vendorReturnId };
  }),
```

### Phase 5: Frontend UI (4h)

#### Step 5.1: Update Order Status Display

**File:** `client/src/components/work-surface/OrdersWorkSurface.tsx`

Add status colors for new states:

```typescript
const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-800',
  CONFIRMED: 'bg-blue-100 text-blue-800',
  PENDING: 'bg-yellow-100 text-yellow-800',
  PACKED: 'bg-purple-100 text-purple-800',
  SHIPPED: 'bg-indigo-100 text-indigo-800',
  DELIVERED: 'bg-green-100 text-green-800',
  RETURNED: 'bg-orange-100 text-orange-800',
  RESTOCKED: 'bg-emerald-100 text-emerald-800',
  RETURNED_TO_VENDOR: 'bg-amber-100 text-amber-800',
  CANCELLED: 'bg-red-100 text-red-800',
};
```

#### Step 5.2: Add Return Actions to Inspector

Add buttons in order inspector when status allows:

```typescript
{order.fulfillmentStatus === 'DELIVERED' && (
  <Button variant="outline" onClick={() => setShowReturnDialog(true)}>
    Process Return
  </Button>
)}

{order.fulfillmentStatus === 'RETURNED' && (
  <div className="flex gap-2">
    <Button onClick={() => handleRestock(order.id)}>
      Restock to Inventory
    </Button>
    <Button variant="outline" onClick={() => setShowVendorReturnDialog(true)}>
      Return to Vendor
    </Button>
  </div>
)}
```

#### Step 5.3: Create Return Processing Dialogs

Create dialogs for:
- Initial return reason entry
- Restock confirmation
- Vendor return with vendor selection

### Phase 6: Testing (2h)

#### Step 6.1: State Machine Tests

```typescript
describe('Order State Machine', () => {
  it('allows DELIVERED → RETURNED transition', () => {
    expect(canTransition('DELIVERED', 'RETURNED')).toBe(true);
  });

  it('allows RETURNED → RESTOCKED transition', () => {
    expect(canTransition('RETURNED', 'RESTOCKED')).toBe(true);
  });

  it('allows RETURNED → RETURNED_TO_VENDOR transition', () => {
    expect(canTransition('RETURNED', 'RETURNED_TO_VENDOR')).toBe(true);
  });

  it('disallows RESTOCKED → any transition (terminal)', () => {
    expect(getNextStatuses('RESTOCKED')).toEqual([]);
  });
});
```

#### Step 6.2: Integration Tests

- Test restock increases batch quantities
- Test vendor return creates records
- Test inventory movements logged correctly

## Acceptance Criteria

- [ ] New enum values added to fulfillment_status
- [ ] vendor_returns and vendor_return_items tables created
- [ ] State machine validates all transitions
- [ ] Orders can transition: SHIPPED/DELIVERED → RETURNED
- [ ] RETURNED orders can transition to RESTOCKED or RETURNED_TO_VENDOR
- [ ] Restock processing increases batch on_hand_qty and available_qty
- [ ] Restock creates inventory_movements records
- [ ] Vendor return creates vendor_returns and vendor_return_items records
- [ ] UI shows new statuses with appropriate colors
- [ ] UI shows return actions when order status allows
- [ ] Terminal states (RESTOCKED, RETURNED_TO_VENDOR, CANCELLED) show no actions

## Rollback

If issues discovered:
1. New enum values cannot be removed from PostgreSQL (add only)
2. Disable return actions via feature flag
3. Orders in new states will need manual SQL update

## Dependencies

- WSQA-002 (Lot selection) - allocations table needed for restock

## Testing Verification

```bash
pnpm test server/services/orderStateMachine.test.ts
pnpm test server/services/returnProcessing.test.ts
pnpm test:e2e tests-e2e/orders-returns.spec.ts
```

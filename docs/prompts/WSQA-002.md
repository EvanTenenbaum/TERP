# WSQA-002: Implement Flexible Lot Selection

**Source:** Work Surfaces QA Report (P0-002)
**Priority:** HIGH (P0 Blocker)
**Estimate:** 2d

## Problem Statement

Users need to select specific batches/lots when fulfilling orders based on customer requirements (e.g., specific harvest dates, quality grades, expiry dates). Currently, the system only stores a single `unitCogs` per batch and auto-allocates inventory without user choice.

**Product Decision:** Users select specific lots per customer need (not strict FIFO/LIFO).

## Implementation Guide

### Phase 1: Database Schema (4h)

#### Step 1.1: Create Allocation Table

**File:** `server/db/schema.ts`

Add new table to track batch allocations per order line item:

```typescript
export const orderLineItemAllocations = pgTable('order_line_item_allocations', {
  id: serial('id').primaryKey(),
  orderLineItemId: integer('order_line_item_id')
    .notNull()
    .references(() => orderLineItems.id, { onDelete: 'cascade' }),
  batchId: integer('batch_id')
    .notNull()
    .references(() => batches.id),
  quantityAllocated: integer('quantity_allocated').notNull(),
  unitCost: decimal('unit_cost', { precision: 10, scale: 2 }).notNull(),
  allocatedAt: timestamp('allocated_at').defaultNow().notNull(),
  allocatedBy: integer('allocated_by').references(() => users.id),
});

// Index for common queries
export const orderLineItemAllocationsIndexes = {
  byLineItem: index('idx_allocations_line_item').on(orderLineItemAllocations.orderLineItemId),
  byBatch: index('idx_allocations_batch').on(orderLineItemAllocations.batchId),
};
```

#### Step 1.2: Generate Migration

```bash
pnpm drizzle-kit generate:pg
# Rename migration to: 0XXX_add_order_line_item_allocations.sql
```

#### Step 1.3: Run Migration

```bash
pnpm db:migrate
```

### Phase 2: Backend API (4h)

#### Step 2.1: Add Allocation Types

**File:** `server/types/allocation.ts`

```typescript
export interface BatchAllocation {
  batchId: number;
  quantity: number;
  unitCost: number;
}

export interface AllocationResult {
  lineItemId: number;
  allocations: BatchAllocation[];
  totalCogs: number;
  weightedAverageCost: number;
}
```

#### Step 2.2: Add Available Batches Query

**File:** `server/routers/batches.ts`

```typescript
getAvailableForProduct: protectedProcedure
  .input(z.object({
    productId: z.number(),
    warehouseId: z.number().optional(),
    minQuantity: z.number().optional(),
  }))
  .query(async ({ ctx, input }) => {
    const available = await db.select({
      id: batches.id,
      sku: batches.sku,
      onHandQty: batches.onHandQty,
      availableQty: batches.availableQty,
      unitCogs: batches.unitCogs,
      harvestDate: batches.harvestDate,
      expiryDate: batches.expiryDate,
      grade: batches.grade,
      warehouseId: batches.warehouseId,
    })
    .from(batches)
    .where(and(
      eq(batches.productId, input.productId),
      gt(batches.availableQty, input.minQuantity ?? 0),
      input.warehouseId ? eq(batches.warehouseId, input.warehouseId) : undefined,
    ))
    .orderBy(asc(batches.harvestDate)); // Default to oldest first

    return available;
  }),
```

#### Step 2.3: Add Allocation Mutation

**File:** `server/routers/orders.ts`

```typescript
allocateBatchesToLineItem: protectedProcedure
  .input(z.object({
    lineItemId: z.number(),
    allocations: z.array(z.object({
      batchId: z.number(),
      quantity: z.number().positive(),
    })),
  }))
  .mutation(async ({ ctx, input }) => {
    return await db.transaction(async (tx) => {
      // Validate line item exists and order is in editable state
      const lineItem = await tx.select()
        .from(orderLineItems)
        .where(eq(orderLineItems.id, input.lineItemId))
        .then(rows => rows[0]);

      if (!lineItem) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Line item not found' });
      }

      // Clear existing allocations
      await tx.delete(orderLineItemAllocations)
        .where(eq(orderLineItemAllocations.orderLineItemId, input.lineItemId));

      // Validate total quantity matches line item quantity
      const totalAllocated = input.allocations.reduce((sum, a) => sum + a.quantity, 0);
      if (totalAllocated !== lineItem.quantity) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Allocated quantity (${totalAllocated}) must match line item quantity (${lineItem.quantity})`,
        });
      }

      // Create new allocations with row-level locking on batches
      const allocations = [];
      for (const alloc of input.allocations) {
        const batch = await tx.select()
          .from(batches)
          .where(eq(batches.id, alloc.batchId))
          .for('update') // Lock row
          .then(rows => rows[0]);

        if (!batch || batch.availableQty < alloc.quantity) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `Insufficient quantity in batch ${alloc.batchId}`,
          });
        }

        // Insert allocation record
        const [allocation] = await tx.insert(orderLineItemAllocations)
          .values({
            orderLineItemId: input.lineItemId,
            batchId: alloc.batchId,
            quantityAllocated: alloc.quantity,
            unitCost: batch.unitCogs,
            allocatedBy: ctx.user.id,
          })
          .returning();

        allocations.push(allocation);
      }

      // Calculate weighted average COGS
      const totalCost = allocations.reduce(
        (sum, a) => sum + (a.quantityAllocated * Number(a.unitCost)), 0
      );
      const weightedAvgCogs = totalCost / totalAllocated;

      return {
        lineItemId: input.lineItemId,
        allocations,
        totalCogs: totalCost,
        weightedAverageCost: weightedAvgCogs,
      };
    });
  }),
```

### Phase 3: Frontend UI (8h)

#### Step 3.1: Create BatchSelectionDialog Component

**File:** `client/src/components/order/BatchSelectionDialog.tsx`

```typescript
interface BatchSelectionDialogProps {
  open: boolean;
  onClose: () => void;
  productId: number;
  productName: string;
  quantityNeeded: number;
  warehouseId?: number;
  onSelect: (allocations: BatchAllocation[]) => void;
}

export function BatchSelectionDialog({
  open,
  onClose,
  productId,
  productName,
  quantityNeeded,
  warehouseId,
  onSelect,
}: BatchSelectionDialogProps) {
  const [selectedBatches, setSelectedBatches] = useState<Map<number, number>>(new Map());

  const { data: availableBatches, isLoading } = trpc.batches.getAvailableForProduct.useQuery({
    productId,
    warehouseId,
    minQuantity: 1,
  });

  const totalSelected = Array.from(selectedBatches.values()).reduce((sum, qty) => sum + qty, 0);
  const isComplete = totalSelected === quantityNeeded;

  const handleQuantityChange = (batchId: number, quantity: number, maxAvailable: number) => {
    const newMap = new Map(selectedBatches);
    if (quantity <= 0) {
      newMap.delete(batchId);
    } else {
      newMap.set(batchId, Math.min(quantity, maxAvailable));
    }
    setSelectedBatches(newMap);
  };

  const handleConfirm = () => {
    const allocations: BatchAllocation[] = Array.from(selectedBatches.entries())
      .filter(([_, qty]) => qty > 0)
      .map(([batchId, quantity]) => {
        const batch = availableBatches?.find(b => b.id === batchId);
        return {
          batchId,
          quantity,
          unitCost: Number(batch?.unitCogs ?? 0),
        };
      });
    onSelect(allocations);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Select Lots for {productName}</DialogTitle>
          <DialogDescription>
            Select {quantityNeeded} units from available batches
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Progress indicator */}
          <div className="flex items-center justify-between text-sm">
            <span>Selected: {totalSelected} / {quantityNeeded}</span>
            <span className={isComplete ? 'text-green-600' : 'text-amber-600'}>
              {isComplete ? 'Ready' : `Need ${quantityNeeded - totalSelected} more`}
            </span>
          </div>

          {/* Batch table */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Batch/SKU</TableHead>
                <TableHead>Harvest Date</TableHead>
                <TableHead>Grade</TableHead>
                <TableHead>Available</TableHead>
                <TableHead>Unit Cost</TableHead>
                <TableHead>Select Qty</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {availableBatches?.map(batch => (
                <TableRow key={batch.id}>
                  <TableCell>{batch.sku}</TableCell>
                  <TableCell>{formatDate(batch.harvestDate)}</TableCell>
                  <TableCell>{batch.grade}</TableCell>
                  <TableCell>{batch.availableQty}</TableCell>
                  <TableCell>{formatCurrency(batch.unitCogs)}</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={0}
                      max={batch.availableQty}
                      value={selectedBatches.get(batch.id) ?? 0}
                      onChange={(e) => handleQuantityChange(
                        batch.id,
                        parseInt(e.target.value) || 0,
                        batch.availableQty
                      )}
                      className="w-20"
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleConfirm} disabled={!isComplete}>
            Confirm Selection
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

#### Step 3.2: Integrate into OrdersWorkSurface

**File:** `client/src/components/work-surface/OrdersWorkSurface.tsx`

Add batch selection button to line item editor:

```typescript
// In line item row
<Button
  variant="ghost"
  size="sm"
  onClick={() => openBatchSelection(lineItem)}
>
  {lineItem.allocations?.length > 0 ? (
    <span className="text-green-600">Lots Selected ({lineItem.allocations.length})</span>
  ) : (
    <span className="text-amber-600">Select Lots</span>
  )}
</Button>
```

#### Step 3.3: Update COGS Display

Show calculated weighted-average COGS when lots are selected:

```typescript
const calculateCogs = (allocations: BatchAllocation[]) => {
  if (!allocations.length) return null;
  const totalQty = allocations.reduce((sum, a) => sum + a.quantity, 0);
  const totalCost = allocations.reduce((sum, a) => sum + (a.quantity * a.unitCost), 0);
  return totalCost / totalQty;
};
```

### Phase 4: Testing (4h)

#### Step 4.1: Unit Tests

**File:** `client/src/components/order/BatchSelectionDialog.test.tsx`

- Test quantity validation
- Test weighted average calculation
- Test selection state management

#### Step 4.2: Integration Tests

- Test allocation mutation creates records
- Test batch quantity validation
- Test rollback on error

#### Step 4.3: E2E Test

```typescript
test('user can select specific lots for order line item', async ({ page }) => {
  // Navigate to order with line items
  // Click "Select Lots" button
  // Select quantities from multiple batches
  // Verify total matches required quantity
  // Confirm selection
  // Verify COGS updated
});
```

## Acceptance Criteria

- [ ] New `order_line_item_allocations` table created and migrated
- [ ] Backend API returns available batches for product
- [ ] Backend API validates and saves batch allocations
- [ ] UI shows batch selection dialog with available lots
- [ ] UI validates total selected = quantity needed
- [ ] UI displays batch details (harvest date, grade, expiry, cost)
- [ ] Weighted average COGS calculated from selected batches
- [ ] Allocations persist and display on order detail view
- [ ] Concurrent allocation requests handled safely (row locking)

## Rollback

If issues discovered:
1. Feature flag `FLEXIBLE_LOT_SELECTION` to disable UI
2. Keep existing auto-allocation as fallback
3. Migration is additive (no data loss on rollback)

## Dependencies

- None

## Testing Verification

```bash
pnpm test:unit client/src/components/order/
pnpm test:e2e tests-e2e/orders-crud.spec.ts
```

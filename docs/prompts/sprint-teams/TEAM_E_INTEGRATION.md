# Sprint Team E: Integration & Work Surfaces

**Branch:** `claude/sprint-team-e-integration`
**Priority:** Starts after Teams A-D complete P0 tasks
**Estimated Duration:** 5-7 days (starts Day 3-4)

---

## Your Mission

You are **Sprint Team E**, responsible for Work Surfaces QA blockers, Reliability Program implementation, and final integration. Your work is the capstone that enables production deployment.

---

## CRITICAL: Read Before Starting

1. **Read `/CLAUDE.md`** - All agent protocols apply
2. **Wait for Teams A-D P0 completion** - You depend on their work
3. **Check `/docs/ACTIVE_SESSIONS.md`** - Ensure no conflicts
4. **Create session file** in `/docs/sessions/active/`
5. **Work on branch:** `claude/sprint-team-e-integration`

---

## Prerequisites (Must Be Complete)

Before starting, verify:

| Team | Tasks | Status |
|------|-------|--------|
| Team A | TS-001, BUG-100, ACC-001 | Must pass `pnpm check && pnpm test` |
| Team B | NAV-017, App.tsx routes | Routes must work |
| Team C | BE-QA-006..008, API-011..013 | APIs must exist |
| Team D | SEC-023, DATA-012 | Security + feature flags |

**Verification:**
```bash
pnpm check   # 0 errors
pnpm test    # >95% pass
pnpm build   # Success
```

---

## Your Owned Files

You have **exclusive write access** to:

```
client/src/components/work-surface/**
client/src/components/work-surface/golden-flows/**
server/_core/**
server/services/orderStateMachine.ts
server/services/returnProcessing.ts (coordinate with Team A)
client/src/hooks/work-surface/useWorkSurfaceFeatureFlags.ts
scripts/qa/**
scripts/validation/**
```

**DO NOT MODIFY:**
- `server/routers/**` (Team C owns)
- `client/src/pages/*.tsx` (Team B owns)
- `scripts/seed/**` (Team D owns)
- `drizzle/**` (Team D owns)

---

## Task Execution Order

### Phase 1: Work Surfaces QA Blockers (Days 1-2)

These P0 blockers must be fixed before any Work Surface deployment.

#### WSQA-001: Wire Payment Recording Mutation (4 hours)

**File:** `client/src/components/work-surface/InvoicesWorkSurface.tsx`
**Lines:** 717-724

**Problem:** Payment handler is a stub showing fake success.

```typescript
// CURRENT (lines 717-724):
const handlePaymentSubmit = (data: PaymentFormData) => {
  // In a real implementation, this would call an API
  toast.success('Payment recorded successfully');
  setIsPaymentDialogOpen(false);
};

// FIX:
const paymentMutation = trpc.payments.recordPayment.useMutation({
  onSuccess: () => {
    toast.success('Payment recorded successfully');
    setIsPaymentDialogOpen(false);
    // Invalidate invoice query to refresh balance
    utils.invoices.getById.invalidate();
  },
  onError: (error) => {
    toast.error(error.message || 'Failed to record payment');
  },
});

const handlePaymentSubmit = (data: PaymentFormData) => {
  paymentMutation.mutate({
    invoiceId: selectedInvoice.id,
    amount: data.amount,
    method: data.method,
    reference: data.reference,
    date: data.date,
  });
};

// Update dialog to show loading state:
<Button
  type="submit"
  disabled={paymentMutation.isPending}
>
  {paymentMutation.isPending ? 'Recording...' : 'Record Payment'}
</Button>
```

**Deliverables:**
- [ ] Payment mutation connected to backend
- [ ] Loading state during mutation
- [ ] Error handling displays server errors
- [ ] Invoice balance updates after payment
- [ ] Golden Flow GF-004 passes

---

#### WSQA-002: Implement Flexible Lot Selection (2 days)

**Files:**
- `server/db/schema.ts` (coordinate with Team D)
- `client/src/components/order/BatchSelectionDialog.tsx` (new)
- `server/routers/orders.ts`

**Problem:** Users cannot select specific batches for orders.

**Step 1: Schema (request from Team D):**
```typescript
// Create coordination ticket for Team D to add:
export const orderLineItemAllocations = mysqlTable('order_line_item_allocations', {
  id: int('id').primaryKey().autoIncrement(),
  orderLineItemId: int('order_line_item_id').references(() => orderLineItems.id),
  batchId: int('batch_id').references(() => batches.id),
  quantity: decimal('quantity', { precision: 10, scale: 2 }).notNull(),
  unitCogs: decimal('unit_cogs', { precision: 10, scale: 4 }),
  allocatedAt: timestamp('allocated_at').defaultNow(),
  allocatedBy: int('allocated_by').references(() => users.id),
});
```

**Step 2: Backend API:**
```typescript
// In server/routers/orders.ts
getAvailableForProduct: protectedProcedure
  .input(z.object({ productId: z.number() }))
  .query(async ({ input }) => {
    return db.query.batches.findMany({
      where: and(
        eq(batches.productId, input.productId),
        gt(batches.onHandQty, 0),
        eq(batches.status, 'available'),
        isNull(batches.deletedAt),
      ),
      orderBy: [asc(batches.expiryDate), asc(batches.createdAt)], // FIFO default
      with: { supplier: true },
    });
  }),

allocateBatchesToLineItem: protectedProcedure
  .input(z.object({
    orderLineItemId: z.number(),
    allocations: z.array(z.object({
      batchId: z.number(),
      quantity: z.number().positive(),
    })),
  }))
  .mutation(async ({ ctx, input }) => {
    const userId = getAuthenticatedUserId(ctx);

    return db.transaction(async (tx) => {
      // Validate total matches line item quantity
      const lineItem = await tx.query.orderLineItems.findFirst({
        where: eq(orderLineItems.id, input.orderLineItemId),
      });

      const totalAllocated = input.allocations.reduce((sum, a) => sum + a.quantity, 0);
      if (totalAllocated !== lineItem.quantity) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Total allocated (${totalAllocated}) must equal line item quantity (${lineItem.quantity})`,
        });
      }

      // Clear existing allocations
      await tx.delete(orderLineItemAllocations)
        .where(eq(orderLineItemAllocations.orderLineItemId, input.orderLineItemId));

      // Insert new allocations with row-level locking
      for (const alloc of input.allocations) {
        // Lock the batch row
        const batch = await tx.query.batches.findFirst({
          where: eq(batches.id, alloc.batchId),
        });

        if (batch.onHandQty < alloc.quantity) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: `Batch ${alloc.batchId} only has ${batch.onHandQty} available`,
          });
        }

        await tx.insert(orderLineItemAllocations).values({
          orderLineItemId: input.orderLineItemId,
          batchId: alloc.batchId,
          quantity: alloc.quantity,
          unitCogs: batch.unitCogs,
          allocatedBy: userId,
        });
      }

      return { success: true };
    });
  }),
```

**Step 3: Frontend Component:**
```typescript
// client/src/components/order/BatchSelectionDialog.tsx
export function BatchSelectionDialog({
  productId,
  requiredQuantity,
  onAllocate,
  onCancel,
}: BatchSelectionDialogProps) {
  const { data: availableBatches } = trpc.orders.getAvailableForProduct.useQuery({ productId });
  const [allocations, setAllocations] = useState<Map<number, number>>(new Map());

  const totalAllocated = Array.from(allocations.values()).reduce((sum, q) => sum + q, 0);
  const isValid = totalAllocated === requiredQuantity;

  return (
    <Dialog open onOpenChange={() => onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Select Batches</DialogTitle>
          <DialogDescription>
            Allocate {requiredQuantity} units from available batches
          </DialogDescription>
        </DialogHeader>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Batch</TableHead>
              <TableHead>Available</TableHead>
              <TableHead>Expiry</TableHead>
              <TableHead>COGS</TableHead>
              <TableHead>Allocate</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {availableBatches?.map((batch) => (
              <TableRow key={batch.id}>
                <TableCell>{batch.batchNumber}</TableCell>
                <TableCell>{batch.onHandQty}</TableCell>
                <TableCell>{formatDate(batch.expiryDate)}</TableCell>
                <TableCell>${batch.unitCogs}</TableCell>
                <TableCell>
                  <Input
                    type="number"
                    min={0}
                    max={batch.onHandQty}
                    value={allocations.get(batch.id) || 0}
                    onChange={(e) => {
                      const qty = Number(e.target.value);
                      setAllocations((prev) => new Map(prev).set(batch.id, qty));
                    }}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <div className="flex justify-between items-center">
          <span className={isValid ? 'text-green-600' : 'text-red-600'}>
            {totalAllocated} / {requiredQuantity} allocated
          </span>
          <div className="space-x-2">
            <Button variant="outline" onClick={onCancel}>Cancel</Button>
            <Button onClick={() => onAllocate(allocations)} disabled={!isValid}>
              Confirm Allocation
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

---

#### WSQA-003: Add RETURNED Order Status (2 days)

**Files:**
- `server/db/schema.ts` (coordinate with Team D)
- `server/services/orderStateMachine.ts`
- `server/services/returnProcessing.ts`
- `client/src/components/work-surface/OrdersWorkSurface.tsx`

**Step 1: Schema (request from Team D):**
```sql
-- Add new enum values
ALTER TABLE orders MODIFY COLUMN fulfillment_status
  ENUM('PENDING', 'CONFIRMED', 'PICKING', 'PACKED', 'SHIPPED', 'DELIVERED',
       'RETURNED', 'RESTOCKED', 'RETURNED_TO_VENDOR', 'CANCELLED');

-- Add vendor_returns table
CREATE TABLE vendor_returns (
  id INT PRIMARY KEY AUTO_INCREMENT,
  order_id INT REFERENCES orders(id),
  vendor_id INT REFERENCES clients(id),
  status ENUM('pending', 'approved', 'shipped', 'received', 'credited') DEFAULT 'pending',
  reason TEXT,
  total_value DECIMAL(10,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INT REFERENCES users(id)
);

CREATE TABLE vendor_return_items (
  id INT PRIMARY KEY AUTO_INCREMENT,
  vendor_return_id INT REFERENCES vendor_returns(id),
  batch_id INT REFERENCES batches(id),
  quantity DECIMAL(10,2),
  unit_value DECIMAL(10,4)
);
```

**Step 2: State Machine:**
```typescript
// server/services/orderStateMachine.ts
const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PICKING', 'CANCELLED'],
  PICKING: ['PACKED', 'CANCELLED'],
  PACKED: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED', 'RETURNED'],
  DELIVERED: ['RETURNED'],
  RETURNED: ['RESTOCKED', 'RETURNED_TO_VENDOR'], // New transitions
  RESTOCKED: [], // Terminal
  RETURNED_TO_VENDOR: [], // Terminal
  CANCELLED: [], // Terminal
};

export function canTransitionTo(current: OrderStatus, target: OrderStatus): boolean {
  return ORDER_TRANSITIONS[current]?.includes(target) ?? false;
}

export async function transitionOrder(
  orderId: number,
  targetStatus: OrderStatus,
  userId: number,
): Promise<void> {
  const order = await db.query.orders.findFirst({ where: eq(orders.id, orderId) });

  if (!canTransitionTo(order.status, targetStatus)) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: `Cannot transition from ${order.status} to ${targetStatus}`,
    });
  }

  await db.update(orders)
    .set({
      status: targetStatus,
      statusUpdatedAt: new Date(),
      statusUpdatedBy: userId,
    })
    .where(eq(orders.id, orderId));

  // Log status change
  await db.insert(orderStatusHistory).values({
    orderId,
    fromStatus: order.status,
    toStatus: targetStatus,
    changedBy: userId,
  });
}
```

**Step 3: Return Processing:**
```typescript
// server/services/returnProcessing.ts
export async function processRestock(orderId: number, userId: number): Promise<void> {
  return db.transaction(async (tx) => {
    // Get order with line items and allocations
    const order = await tx.query.orders.findFirst({
      where: eq(orders.id, orderId),
      with: {
        lineItems: {
          with: { allocations: true },
        },
      },
    });

    // Return each allocated quantity to its batch
    for (const lineItem of order.lineItems) {
      for (const allocation of lineItem.allocations) {
        // Increase batch quantity
        await tx.update(batches)
          .set({
            onHandQty: sql`on_hand_qty + ${allocation.quantity}`,
          })
          .where(eq(batches.id, allocation.batchId));

        // Log inventory movement
        await tx.insert(inventoryMovements).values({
          batchId: allocation.batchId,
          type: 'RETURN_RESTOCK',
          quantity: allocation.quantity,
          referenceType: 'order',
          referenceId: orderId,
          createdBy: userId,
        });
      }
    }

    // Update order status
    await transitionOrder(orderId, 'RESTOCKED', userId);
  });
}

export async function processVendorReturn(
  orderId: number,
  vendorId: number,
  reason: string,
  userId: number,
): Promise<number> {
  // Validate vendor exists (DI-009 fix)
  const vendor = await db.query.clients.findFirst({
    where: and(eq(clients.id, vendorId), eq(clients.isSeller, true)),
  });

  if (!vendor) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Vendor not found',
    });
  }

  return db.transaction(async (tx) => {
    const order = await tx.query.orders.findFirst({
      where: eq(orders.id, orderId),
      with: {
        lineItems: {
          with: { allocations: { with: { batch: true } } },
        },
      },
    });

    // Calculate total value
    let totalValue = 0;
    const returnItems = [];

    for (const lineItem of order.lineItems) {
      for (const allocation of lineItem.allocations) {
        const value = allocation.quantity * (allocation.unitCogs ?? 0);
        totalValue += value;
        returnItems.push({
          batchId: allocation.batchId,
          quantity: allocation.quantity,
          unitValue: allocation.unitCogs,
        });
      }
    }

    // Create vendor return record
    const [vendorReturn] = await tx.insert(vendorReturns).values({
      orderId,
      vendorId,
      reason,
      totalValue,
      createdBy: userId,
    }).returning();

    // Insert return items
    for (const item of returnItems) {
      await tx.insert(vendorReturnItems).values({
        vendorReturnId: vendorReturn.id,
        ...item,
      });
    }

    // Update order status
    await transitionOrder(orderId, 'RETURNED_TO_VENDOR', userId);

    return vendorReturn.id;
  });
}
```

**Step 4: Frontend UI:**
```typescript
// In OrdersWorkSurface.tsx, add return actions
{order.status === 'RETURNED' && (
  <div className="space-x-2">
    <Button onClick={() => handleRestock(order.id)}>
      Restock to Inventory
    </Button>
    <Button onClick={() => setReturnToVendorDialog(order)}>
      Return to Vendor
    </Button>
  </div>
)}
```

---

### Phase 2: Reliability Program (Days 3-5)

These are Beta milestone tasks but can start after Work Surfaces blockers.

#### REL-001: Define Truth Model + Invariants (8 hours)

**Create:** `docs/architecture/TRUTH_MODEL.md`

Document:
1. Inventory truth source: `batches.onHandQty` + `inventoryMovements`
2. Money truth source: `invoices`, `payments`, `glEntries`
3. AR/AP truth source: `invoices.amountDue - payments.amount`
4. Invariants that must always hold

---

#### REL-004: Critical Mutation Wrapper (16 hours)

**File:** `server/_core/criticalMutation.ts`

```typescript
import { db } from '@/server/db';
import { TRPCError } from '@trpc/server';
import { logger } from '@/server/_core/logger';

interface CriticalMutationOptions {
  maxRetries?: number;
  idempotencyKey?: string;
}

export async function criticalMutation<T>(
  fn: () => Promise<T>,
  options: CriticalMutationOptions = {},
): Promise<T> {
  const { maxRetries = 3, idempotencyKey } = options;

  // Check idempotency
  if (idempotencyKey) {
    const existing = await db.query.idempotencyKeys.findFirst({
      where: eq(idempotencyKeys.key, idempotencyKey),
    });
    if (existing) {
      logger.info({ idempotencyKey }, 'Returning cached result');
      return existing.result as T;
    }
  }

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await db.transaction(async (tx) => {
        return fn();
      });

      // Store idempotency result
      if (idempotencyKey) {
        await db.insert(idempotencyKeys).values({
          key: idempotencyKey,
          result: JSON.stringify(result),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
        });
      }

      return result;
    } catch (error) {
      lastError = error as Error;
      logger.warn({ attempt, error: lastError.message }, 'Critical mutation failed, retrying');

      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, 100 * Math.pow(2, attempt)));
      }
    }
  }

  throw new TRPCError({
    code: 'INTERNAL_SERVER_ERROR',
    message: `Critical mutation failed after ${maxRetries} attempts: ${lastError?.message}`,
  });
}
```

---

#### REL-006: Inventory Concurrency Hardening (2 days)

Implement row-level locking for inventory operations:

```typescript
// server/_core/inventoryLocking.ts
export async function withBatchLock<T>(
  batchId: number,
  fn: (batch: Batch) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    // Lock the batch row for update
    const [batch] = await tx.execute(sql`
      SELECT * FROM batches WHERE id = ${batchId} FOR UPDATE
    `);

    if (!batch) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Batch not found' });
    }

    return fn(batch as Batch);
  });
}
```

---

### Phase 3: Work Surfaces Deployment (Days 5-7)

#### DEPLOY-001: Wire WorkSurfaceGate into Routes (4 hours)

**File:** `client/src/App.tsx`

```typescript
import { WorkSurfaceGate } from '@/hooks/work-surface/useWorkSurfaceFeatureFlags';

// Wrap routes:
<Route
  path="/orders"
  element={
    <WorkSurfaceGate
      featureKey="work-surface-orders"
      WorkSurfaceComponent={OrdersWorkSurface}
      LegacyComponent={OrdersPage}
    />
  }
/>

// Repeat for all 9 Work Surfaces
```

---

#### DEPLOY-003: Seed Missing RBAC Permissions (4 hours)

Review `docs/reference/USER_FLOW_MATRIX.csv` and add missing permissions:

```typescript
// server/services/rbacDefinitions.ts
export const PERMISSIONS = {
  // Existing...

  // Accounting (40+ missing)
  'accounting:ar:read': 'View accounts receivable',
  'accounting:ar:write': 'Manage accounts receivable',
  'accounting:ap:read': 'View accounts payable',
  'accounting:ap:write': 'Manage accounts payable',
  'accounting:gl:read': 'View general ledger',
  'accounting:gl:write': 'Post to general ledger',
  'accounting:reports:generate': 'Generate financial reports',
  // ... add all from matrix
};
```

---

#### DEPLOY-005: Execute Stage 0 (Internal QA) (8 hours)

Checklist:
- [ ] Enable feature flags for internal users
- [ ] Run all gate scripts
- [ ] Execute Golden Flows GF-001 through GF-008
- [ ] Document any issues
- [ ] Fix P0 bugs before proceeding

---

## Verification Protocol

```bash
# Full verification
pnpm check
pnpm lint
pnpm test
pnpm build

# Work Surface specific
pnpm test client/src/components/work-surface/
pnpm test:e2e tests-e2e/work-surface/

# Gate scripts
npm run gate:placeholder
npm run gate:rbac
npm run gate:parity
npm run gate:invariants

# Golden Flow tests
pnpm test:golden-flows
```

---

## Creating Your PR

```bash
gh pr create --base staging/integration-sprint-2026-01 \
  --title "Team E: Integration & Work Surfaces" \
  --body "$(cat <<'EOF'
## Summary
- Fixed WSQA-001: Payment recording mutation
- Fixed WSQA-002: Flexible lot selection
- Fixed WSQA-003: RETURNED order status
- Implemented REL-004: Critical mutation wrapper
- Implemented REL-006: Inventory concurrency hardening
- Completed DEPLOY-001..005: Work Surfaces deployment

## Work Surfaces QA
- [x] Payment recording works end-to-end
- [x] Batch selection dialog functional
- [x] Return flow with restock/vendor options
- [x] All Golden Flows pass

## Reliability
- [x] Truth model documented
- [x] Critical mutations transactional
- [x] Inventory locking implemented

## Deployment
- [x] Feature flags wired
- [x] RBAC permissions seeded
- [x] Stage 0 QA complete
- [x] Ready for production

## Verification
- [x] All gate scripts pass
- [x] All Golden Flow tests pass
- [x] E2E tests pass
EOF
)"
```

---

## Cross-Team Dependencies

**Waiting on:**
- Team A: TypeScript + tests must pass
- Team B: Navigation routes working
- Team C: All APIs implemented
- Team D: Schema + feature flags seeded

**Final Integration:**
After your PR merges, create the final staging → main PR.

---

## Questions?

Create a coordination ticket or ask Evan.

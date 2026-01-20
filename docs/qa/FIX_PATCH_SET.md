# Fix Patch Set - P0/P1 Critical Issues (REVISED)

**Generated**: 2026-01-20
**Revised**: 2026-01-20 (Third-Party Expert Review + Product Decisions)
**Scope**: P0 (Blocker) and P1 (Critical) issues only

---

## Revision Notes

> **IMPORTANT**: This patch set has been revised following a third-party expert review and product decision clarifications.
>
> **Key Corrections**:
> - ~~P0-002 (Inventory race condition)~~ **REMOVED** - False positive. Code already implements `.for("update")` locking
> - ~~P0-004 (Individual feature flags)~~ **REMOVED** - Product decision: deployment-level flags sufficient
> - **P0-002 (NEW)**: Flexible lot selection - users select specific batches per customer needs (not strict FIFO/LIFO)
> - **P0-003**: Updated to add RETURNED status with restocking/vendor-return paths
> - **P1-001**: Confirmed current void logic is correct; add void reason field

---

## P0-001: Payment Recording Stub

**File**: `client/src/components/work-surface/InvoicesWorkSurface.tsx`
**Lines**: 717-724
**Verified**: ✅ Code inspection confirms stub with comment "In a real implementation..."

### Current Code (Broken)
```typescript
const handlePaymentSubmit = (invoiceId: number, amount: number, note: string) => {
  setSaving("Recording payment...");
  // In a real implementation, this would call a recordPayment mutation  ← STUB!
  toasts.success(`Payment of ${formatCurrency(amount)} recorded`);
  setSaved();
  setShowPaymentDialog(false);
  utils.accounting.invoices.list.invalidate();
};
```

### Reference Implementation (PaymentInspector.tsx shows correct pattern)
```typescript
// PaymentInspector.tsx uses the mutation correctly - copy this pattern
const recordPayment = trpc.payments.recordPayment.useMutation({
  onSuccess: () => {
    utils.accounting.invoices.list.invalidate();
    utils.accounting.invoices.getById.invalidate({ id: invoiceId });
    // ...
  },
});
```

### Fixed Code
```typescript
// Add mutation hook near other mutations
const recordPaymentMutation = trpc.payments.recordPayment.useMutation({
  onMutate: () => setSaving("Recording payment..."),
  onSuccess: () => {
    toasts.success("Payment recorded successfully");
    setSaved();
    setShowPaymentDialog(false);
    utils.accounting.invoices.list.invalidate();
    utils.accounting.invoices.getARAging.invalidate();
  },
  onError: (error) => {
    toasts.error(error.message || "Failed to record payment");
    setError(error.message);
  },
});

const handlePaymentSubmit = (invoiceId: number, amount: number, note: string) => {
  recordPaymentMutation.mutate({
    invoiceId,
    amount,
    notes: note,
    paymentMethod: 'CHECK', // or get from form/dialog
    paymentDate: new Date(),
  });
};
```

---

## ~~P0-002: Inventory Oversell Race Condition~~ - REMOVED (FALSE POSITIVE)

> **Resolution**: Third-party code review confirms this was incorrectly reported.
>
> **Evidence**: `ordersDb.ts:290-296` shows proper implementation:
> ```typescript
> const lockedBatch = await tx
>   .select()
>   .from(batches)
>   .where(eq(batches.id, item.batchId))
>   .limit(1)
>   .for("update")  // ✅ Row-level lock IS IMPLEMENTED
>   .then(rows => rows[0]);
> ```
>
> The `confirmDraftOrder` function correctly uses database transactions with row-level locking. No fix needed.

---

## P0-002: Flexible Lot Selection Not Implemented

**File**: `server/inventoryUtils.ts`, `client/src/components/work-surface/InventoryWorkSurface.tsx`
**Product Decision**: Users need to select specific batches/lots per customer needs (not strict FIFO/LIFO)

### Current Behavior
Single `unitCogs` stored per batch. System auto-allocates without user choice.

### Required Changes

**1. Add lot selection UI to order creation:**
```typescript
// OrderLineItemEditor.tsx
const [selectedBatches, setSelectedBatches] = useState<BatchAllocation[]>([]);

// Show available batches with cost, quantity, expiry
<BatchSelectionDialog
  productId={lineItem.productId}
  quantityNeeded={lineItem.quantity}
  onSelect={(batches) => setSelectedBatches(batches)}
/>
```

**2. Update order line item schema:**
```typescript
// schema.ts - add batch allocations
export const orderLineItemAllocations = pgTable('order_line_item_allocations', {
  id: serial('id').primaryKey(),
  orderLineItemId: integer('order_line_item_id').references(() => orderLineItems.id),
  batchId: integer('batch_id').references(() => batches.id),
  quantityAllocated: integer('quantity_allocated').notNull(),
  unitCost: decimal('unit_cost', { precision: 10, scale: 2 }).notNull(),
});
```

**3. Update COGS calculation:**
```typescript
// Calculate weighted average COGS from selected batches
const calculateCogs = (allocations: BatchAllocation[]) => {
  const totalQty = allocations.reduce((sum, a) => sum + a.quantity, 0);
  const totalCost = allocations.reduce((sum, a) => sum + (a.quantity * a.unitCost), 0);
  return totalCost / totalQty;
};
```

---

## P0-003: Order Status Machine - Add RETURNED Status

**File**: `server/db/schema.ts` (or relevant enum definition)
**File**: `server/ordersDb.ts:1564-1570` (validation logic)
**Product Decision**: Add RETURNED status with two paths: (a) restocked to inventory, (b) returned to vendor

### Current Validation Code
```typescript
// ordersDb.ts:1564-1570
const validStatus =
  newStatus === "PENDING" ||
  newStatus === "PACKED" ||
  newStatus === "SHIPPED"
    ? newStatus
    : "PENDING"; // Default to PENDING for unsupported statuses
```

### Fixed Schema
```typescript
export const fulfillmentStatusEnum = pgEnum('fulfillment_status', [
  'DRAFT',
  'CONFIRMED',
  'PENDING',
  'PACKED',
  'SHIPPED',
  'DELIVERED',
  'RETURNED',           // NEW
  'RESTOCKED',          // NEW - returned items back in inventory
  'RETURNED_TO_VENDOR', // NEW - returned items sent back to vendor
]);
```

### Fixed Validation with State Machine
```typescript
const validTransitions: Record<string, string[]> = {
  'DRAFT': ['CONFIRMED', 'CANCELLED'],
  'CONFIRMED': ['PENDING', 'CANCELLED'],
  'PENDING': ['PACKED', 'CANCELLED'],
  'PACKED': ['SHIPPED'],
  'SHIPPED': ['DELIVERED', 'RETURNED'],
  'DELIVERED': ['RETURNED'],
  'RETURNED': ['RESTOCKED', 'RETURNED_TO_VENDOR'],
  'RESTOCKED': [],        // Terminal
  'RETURNED_TO_VENDOR': [], // Terminal
  'CANCELLED': [],        // Terminal
};

const canTransition = (from: string, to: string) =>
  validTransitions[from]?.includes(to) ?? false;
```

### Return Processing Logic
```typescript
// When transitioning to RESTOCKED
const processRestock = async (orderId: number) => {
  // Get returned items and add back to inventory batches
  const order = await getOrderWithItems(orderId);
  for (const item of order.lineItems) {
    await adjustBatchQuantity(item.batchId, item.quantity, 'RESTOCK');
  }
};

// When transitioning to RETURNED_TO_VENDOR
const processVendorReturn = async (orderId: number, vendorId: number) => {
  // Create vendor return record (separate from inventory)
  await createVendorReturnRecord({
    orderId,
    vendorId,
    items: order.lineItems,
    status: 'PENDING_VENDOR_CREDIT',
  });
};
```

**Migration Required**:
```sql
-- Add new enum values (PostgreSQL)
ALTER TYPE fulfillment_status ADD VALUE 'DRAFT' BEFORE 'PENDING';
ALTER TYPE fulfillment_status ADD VALUE 'CONFIRMED' AFTER 'DRAFT';
ALTER TYPE fulfillment_status ADD VALUE 'DELIVERED' AFTER 'SHIPPED';
ALTER TYPE fulfillment_status ADD VALUE 'RETURNED' AFTER 'DELIVERED';
ALTER TYPE fulfillment_status ADD VALUE 'RESTOCKED' AFTER 'RETURNED';
ALTER TYPE fulfillment_status ADD VALUE 'RETURNED_TO_VENDOR' AFTER 'RESTOCKED';
```

---

## ~~P0-004: Individual Feature Flags Not Seeded~~ - CLOSED

> **Product Decision (2026-01-20)**: Deployment-level flags are sufficient. Individual surface flags not needed.
>
> No changes required. Existing deployment flags (`WORK_SURFACE_INTAKE`, `WORK_SURFACE_ORDERS`, etc.) provide adequate control.

---

## P1-001: Add Void Reason Field to Invoice Void

**File**: `server/routers/invoices.ts`
**Lines**: 392-397
**Product Decision**: Current void logic is CORRECT (paid invoices CAN be voided). Add field to capture reason.

### Current Code (Confirmed Correct)
```typescript
if (invoice.status === "PAID" && input.status !== "VOID") {
  throw new TRPCError({
    code: "BAD_REQUEST",
    message: "Paid invoices can only be voided"
  });
}
```

### Required Changes

**1. Update void mutation input schema:**
```typescript
// invoices.ts
void: protectedProcedure
  .input(z.object({
    invoiceId: z.number(),
    voidReason: z.string().min(1, "Void reason is required").max(500),
  }))
  .mutation(async ({ ctx, input }) => {
    // Store reason with void
  }),
```

**2. Add voidReason column to invoices table:**
```sql
ALTER TABLE invoices ADD COLUMN void_reason TEXT;
ALTER TABLE invoices ADD COLUMN voided_at TIMESTAMP;
ALTER TABLE invoices ADD COLUMN voided_by INTEGER REFERENCES users(id);
```

**3. Update void mutation to store reason:**
```typescript
await db.update(invoices)
  .set({
    status: 'VOID',
    voidReason: input.voidReason,
    voidedAt: new Date(),
    voidedBy: ctx.user.id,
  })
  .where(eq(invoices.id, input.invoiceId));
```

**4. Update UI to require reason:**
```typescript
// InvoicesWorkSurface.tsx - void dialog
<Dialog open={showVoidDialog}>
  <DialogContent>
    <DialogHeader>Void Invoice #{invoice.number}</DialogHeader>
    <Textarea
      placeholder="Enter reason for voiding this invoice..."
      value={voidReason}
      onChange={(e) => setVoidReason(e.target.value)}
      required
    />
    <DialogFooter>
      <Button
        onClick={() => voidMutation.mutate({ invoiceId: invoice.id, voidReason })}
        disabled={!voidReason.trim() || voidMutation.isPending}
      >
        Confirm Void
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

---

## P1-002: No Debounce on Rapid State Transitions

**File**: `client/src/components/work-surface/OrdersWorkSurface.tsx`
**Verified**: ✅ No debounce or isPending guard found on confirm button

### Current Pattern (Vulnerable)
```typescript
const handleConfirm = () => {
  confirmMutation.mutate({ orderId: selectedOrder.id });
};

<Button onClick={handleConfirm}>Confirm Order</Button>
```

### Fixed Code
```typescript
import { useDebouncedCallback } from 'use-debounce';

const handleConfirm = useDebouncedCallback(() => {
  if (confirmMutation.isPending) return;
  confirmMutation.mutate({ orderId: selectedOrder.id });
}, 300);

<Button
  onClick={handleConfirm}
  disabled={confirmMutation.isPending}
>
  {confirmMutation.isPending ? "Confirming..." : "Confirm Order"}
</Button>
```

---

## P1-003: Optimistic Locking Optional

**File**: `server/routers/orders.ts`
**Lines**: ~227
**Verified**: ✅ Version check uses conditional `if (input.version && ...)`

### Current Code
```typescript
if (input.version && input.version !== existingOrder.version) {
  throw new TRPCError({
    code: 'CONFLICT',
    message: 'Order has been modified by another user',
  });
}
```

### Fixed Code
```typescript
// Make version check mandatory
if (input.version === undefined || input.version === null) {
  throw new TRPCError({
    code: 'BAD_REQUEST',
    message: 'Version field is required for update operations',
  });
}

if (input.version !== existingOrder.version) {
  throw new TRPCError({
    code: 'CONFLICT',
    message: `Order has been modified. Your version: ${input.version}, Current: ${existingOrder.version}. Please refresh.`,
  });
}
```

---

## P1-006: Query Error States Not Displayed

**Files**: `InvoicesWorkSurface.tsx`, `InventoryWorkSurface.tsx`
**Verified**: ✅ Error variables exist but not rendered

### Current Pattern
```typescript
const { data, isLoading, error } = trpc.accounting.invoices.list.useQuery({...});

// Only renders loading state, not error
{isLoading ? <Loader2 /> : <Table>...</Table>}
```

### Fixed Code
```typescript
import { AlertTriangle, RefreshCw } from 'lucide-react';

const { data, isLoading, error, refetch } = trpc.accounting.invoices.list.useQuery({...});

{isLoading ? (
  <Loader2 className="animate-spin" />
) : error ? (
  <div className="flex flex-col items-center justify-center p-8 text-center">
    <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
    <h3 className="text-lg font-semibold mb-2">Failed to load data</h3>
    <p className="text-muted-foreground mb-4">{error.message}</p>
    <Button variant="outline" onClick={() => refetch()}>
      <RefreshCw className="h-4 w-4 mr-2" />
      Retry
    </Button>
  </div>
) : displayInvoices.length === 0 ? (
  <EmptyState message="No invoices found" />
) : (
  <Table>...</Table>
)}
```

---

## P1-007: Deprecated Vendor Endpoint

**File**: `client/src/components/work-surface/DirectIntakeWorkSurface.tsx`
**Line**: 507
**Verified**: ✅ Uses `trpc.vendors.getAll.useQuery()`

### Current Code
```typescript
const { data: vendorsData, isLoading: vendorsLoading } =
  trpc.vendors.getAll.useQuery();
```

### Fixed Code
```typescript
const { data: vendorsData, isLoading: vendorsLoading } =
  trpc.clients.list.useQuery({
    isSeller: true,
    pageSize: 1000
  });

// Update data access pattern if needed
const vendors = vendorsData?.items ?? [];
```

---

## P1-008: Feature Flags Missing Permission Check

**File**: `server/routers/featureFlags.ts`
**Lines**: ~56
**Verified**: ✅ Uses `protectedProcedure` without additional permission check

### Current Code
```typescript
getEffectiveFlags: protectedProcedure
  .query(async ({ ctx }) => {
    // Returns flags for any authenticated user
  }),
```

### Fixed Code
```typescript
getEffectiveFlags: protectedProcedure
  .use(requireAnyPermission(["system:read", "feature_flags:read"]))
  .query(async ({ ctx }) => {
    // Now requires permission
  }),
```

---

## Application Priority

### Immediate (Before next deployment)
1. **P0-001**: Payment recording - Blocks accounting flow
2. **P1-002**: Debounce mutations - Prevents duplicate operations

### This Sprint
3. **P0-002**: Flexible lot selection - Core business requirement
4. **P0-003**: Order status machine with RETURNED - Requires migration
5. **P1-001**: Add void reason field - Minor schema + UI change
6. **P1-005**: Error displays - UX improvement

### Next Sprint
7. **P1-003**: Optimistic locking - May need client updates
8. **P1-006**: Deprecated endpoint - Technical debt
9. **P1-007**: Permission check - Security hardening

---

## Testing Requirements

| Fix | Test Requirement |
|-----|------------------|
| P0-001 | Full payment flow: record → verify → check ledger |
| P0-002 | Lot selection: user selects batches, verify COGS calculated correctly |
| P0-003 | Status transitions: SHIPPED → RETURNED → RESTOCKED or RETURNED_TO_VENDOR |
| P1-001 | Void with reason: verify reason stored, displayed in audit |
| P1-002 | Rapid click test (10 clicks in 1 second) |
| P1-005 | Network error simulation, verify retry works |

---

## Rollback Plan

All changes should be:
1. Feature flagged where possible (P0-004 enables this)
2. Database migrations reversible
3. Tested in staging before production
4. Deployed during low-traffic windows

# Fix Patch Set - P0/P1 Critical Issues

**Generated**: 2026-01-20
**Scope**: P0 (Blocker) and P1 (Critical) issues only

---

## P0-001: Payment Recording Stub

**File**: `client/src/components/work-surface/InvoicesWorkSurface.tsx`
**Lines**: 717-724

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
    paymentMethod: 'CHECK', // or get from form
    paymentDate: new Date(),
  });
};
```

---

## P0-002: Inventory Oversell Race Condition

**File**: `server/routers/orders.ts`
**Lines**: 1198-1220

### Current Code (Vulnerable)
```typescript
// Inside confirmOrder
for (const item of lineItems) {
  const batch = await ctx.db.query.batches.findFirst({
    where: eq(batches.id, item.batchId),
  });

  const availableQty = batch.onHandQty - batch.reservedQty;
  if (availableQty < item.quantity) {
    throw new TRPCError({ /* insufficient inventory */ });
  }
  // RACE CONDITION: Another transaction could reserve between check and update
}

// Later: update order status
```

### Fixed Code
```typescript
// Inside confirmOrder - use transaction with row locking
await ctx.db.transaction(async (tx) => {
  for (const item of lineItems) {
    // Lock the batch row to prevent concurrent modifications
    const [batch] = await tx
      .select()
      .from(batches)
      .where(eq(batches.id, item.batchId))
      .for('update'); // Row-level lock

    if (!batch) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: `Batch ${item.batchId} not found`,
      });
    }

    const availableQty = batch.onHandQty - batch.reservedQty - batch.quarantineQty;
    if (availableQty < item.quantity) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `Insufficient inventory for ${batch.batchCode}. Available: ${availableQty}, Requested: ${item.quantity}`,
      });
    }

    // Reserve the inventory immediately within lock
    await tx
      .update(batches)
      .set({ reservedQty: sql`${batches.reservedQty} + ${item.quantity}` })
      .where(eq(batches.id, item.batchId));
  }

  // Now safe to update order status
  await tx.update(orders).set({ status: 'CONFIRMED' }).where(eq(orders.id, orderId));
});
```

---

## P0-004: Order Status Machine Incomplete

**File**: `server/db/schema.ts` (or relevant enum definition)

### Current Code
```typescript
export const fulfillmentStatusEnum = pgEnum('fulfillment_status', [
  'PENDING',
  'PACKED',
  'SHIPPED',
]);
```

### Fixed Code
```typescript
export const fulfillmentStatusEnum = pgEnum('fulfillment_status', [
  'DRAFT',
  'CONFIRMED',
  'PENDING',
  'FULFILLED',
  'PACKED',
  'SHIPPED',
  'DELIVERED',
]);
```

**Migration Required**:
```sql
-- Add new enum values
ALTER TYPE fulfillment_status ADD VALUE 'DRAFT' BEFORE 'PENDING';
ALTER TYPE fulfillment_status ADD VALUE 'CONFIRMED' AFTER 'DRAFT';
ALTER TYPE fulfillment_status ADD VALUE 'FULFILLED' AFTER 'CONFIRMED';
ALTER TYPE fulfillment_status ADD VALUE 'DELIVERED' AFTER 'SHIPPED';
```

---

## P0-005: Individual Feature Flags Not Seeded

**File**: `server/services/seedFeatureFlags.ts`

### Add to seed data
```typescript
const workSurfaceFlags = [
  // Deployment flags (existing)
  {
    key: 'WORK_SURFACE_INTAKE',
    name: 'Work Surface: Intake Module',
    description: 'Enable Work Surface UI for intake workflows',
    defaultEnabled: true,
  },
  // ... other deployment flags ...

  // Individual surface flags (NEW)
  {
    key: 'work-surface-direct-intake',
    name: 'Direct Intake Work Surface',
    description: 'Enable Direct Intake Work Surface component',
    defaultEnabled: true,
    dependsOn: ['WORK_SURFACE_INTAKE'],
  },
  {
    key: 'work-surface-purchase-orders',
    name: 'Purchase Orders Work Surface',
    description: 'Enable Purchase Orders Work Surface component',
    defaultEnabled: true,
    dependsOn: ['WORK_SURFACE_INTAKE'],
  },
  {
    key: 'work-surface-orders',
    name: 'Orders Work Surface',
    description: 'Enable Orders Work Surface component',
    defaultEnabled: true,
    dependsOn: ['WORK_SURFACE_ORDERS'],
  },
  {
    key: 'work-surface-clients',
    name: 'Clients Work Surface',
    description: 'Enable Clients Work Surface component',
    defaultEnabled: true,
    dependsOn: ['WORK_SURFACE_ORDERS'],
  },
  {
    key: 'work-surface-inventory',
    name: 'Inventory Work Surface',
    description: 'Enable Inventory Work Surface component',
    defaultEnabled: true,
    dependsOn: ['WORK_SURFACE_INVENTORY'],
  },
  {
    key: 'work-surface-invoices',
    name: 'Invoices Work Surface',
    description: 'Enable Invoices Work Surface component',
    defaultEnabled: true,
    dependsOn: ['WORK_SURFACE_ACCOUNTING'],
  },
];
```

---

## P1-001: Invoice Void Logic Inverted

**File**: `server/routers/invoices.ts`
**Lines**: 392-397

### Current Code (Inverted - Allows voiding paid)
```typescript
if (invoice.status === "PAID" && input.status !== "VOID") {
  throw new TRPCError({
    code: "BAD_REQUEST",
    message: "Paid invoices can only be voided"
  });
}
```

### Fixed Code
```typescript
// Prevent voiding paid invoices
if (invoice.status === "PAID" && input.status === "VOID") {
  throw new TRPCError({
    code: "BAD_REQUEST",
    message: "Cannot void a paid invoice. Record a refund or credit memo instead."
  });
}

// Prevent any changes to paid invoices except through proper channels
if (invoice.status === "PAID") {
  throw new TRPCError({
    code: "BAD_REQUEST",
    message: "Paid invoices cannot be modified. Record adjustments or credits separately."
  });
}
```

---

## P1-002: No Debounce on Rapid State Transitions

**File**: `client/src/components/work-surface/OrdersWorkSurface.tsx`
**Lines**: ~613

### Current Code (Vulnerable)
```typescript
const handleConfirm = () => {
  confirmMutation.mutate({ orderId: selectedOrder.id });
};

// Button without guards
<Button onClick={handleConfirm}>Confirm Order</Button>
```

### Fixed Code
```typescript
import { useDebouncedCallback } from 'use-debounce';

const handleConfirm = useDebouncedCallback(() => {
  if (confirmMutation.isPending) return;
  confirmMutation.mutate({ orderId: selectedOrder.id });
}, 300);

// Button with loading guard
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

### Current Code (Optional - Bypassable)
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
if (!input.version) {
  throw new TRPCError({
    code: 'BAD_REQUEST',
    message: 'Version field is required for update operations',
  });
}

if (input.version !== existingOrder.version) {
  throw new TRPCError({
    code: 'CONFLICT',
    message: `Order has been modified by another user. Your version: ${input.version}, Current version: ${existingOrder.version}. Please refresh and try again.`,
  });
}
```

---

## P1-006: Query Error States Not Displayed

**File**: `client/src/components/work-surface/InvoicesWorkSurface.tsx`

### Current Code (Error Not Displayed)
```typescript
const { data, isLoading, error } = trpc.accounting.invoices.list.useQuery({...});

// Only shows loading, not error
{isLoading ? (
  <Loader2 className="animate-spin" />
) : (
  <Table>...</Table>
)}
```

### Fixed Code
```typescript
const { data, isLoading, error, refetch } = trpc.accounting.invoices.list.useQuery({...});

{isLoading ? (
  <Loader2 className="animate-spin" />
) : error ? (
  <Alert variant="destructive">
    <AlertTriangle className="h-4 w-4" />
    <AlertTitle>Failed to load invoices</AlertTitle>
    <AlertDescription>
      {error.message || "An error occurred while loading invoices."}
    </AlertDescription>
    <Button variant="outline" size="sm" onClick={() => refetch()}>
      <RefreshCw className="h-4 w-4 mr-2" />
      Retry
    </Button>
  </Alert>
) : displayInvoices.length === 0 ? (
  <EmptyState message="No invoices found" />
) : (
  <Table>...</Table>
)}
```

---

## P1-007: Deprecated Vendor Endpoint

**File**: `client/src/components/work-surface/DirectIntakeWorkSurface.tsx`

### Current Code (Deprecated)
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

// Also update any references to vendorsData structure if needed
const vendors = vendorsData?.items ?? [];
```

---

## P1-008: Feature Flags Missing Permission Check

**File**: `server/routers/featureFlags.ts`
**Lines**: ~56

### Current Code (Any Auth User)
```typescript
getEffectiveFlags: protectedProcedure
  .query(async ({ ctx }) => {
    // Returns all flags for any authenticated user
  }),
```

### Fixed Code
```typescript
getEffectiveFlags: protectedProcedure
  .use(requirePermission("system:read"))
  .query(async ({ ctx }) => {
    // Now requires system:read permission
  }),
```

**Alternative** (if system:read is too restrictive):
```typescript
// Create a new permission specifically for feature flags
getEffectiveFlags: protectedProcedure
  .use(requireAnyPermission(["system:read", "feature_flags:read"]))
  .query(async ({ ctx }) => {
    // Requires either permission
  }),
```

---

## Application Instructions

### Priority Order
1. **P0-001**: Payment recording - Critical for accounting flow
2. **P0-002**: Inventory race condition - Data integrity
3. **P1-001**: Invoice void logic - Financial compliance
4. **P1-002**: Debounce - UX and data integrity
5. **P0-004**: Status machine - Requires migration planning
6. **P0-005**: Feature flags - Requires seed script update
7. **P1-003**: Optimistic locking - May need client updates
8. **P1-006**: Error display - UX improvement
9. **P1-007**: Deprecated endpoint - Technical debt
10. **P1-008**: Permission check - Security hardening

### Testing Requirements
- P0-001: Test full payment flow in InvoicesWorkSurface
- P0-002: Test concurrent order confirmations
- P1-001: Test invoice void attempts on paid invoices
- P1-002: Test rapid clicking on confirm button
- All: Run existing E2E golden flow tests

### Rollback Plan
All changes should be:
1. Behind feature flags where possible
2. Have database migrations that can be reverted
3. Tested in staging before production

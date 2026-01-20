# Fix Patch Set - P0/P1 Critical Issues (REVISED)

**Generated**: 2026-01-20
**Revised**: 2026-01-20 (Third-Party Expert Review)
**Scope**: P0 (Blocker) and P1 (Critical) issues only

---

## Revision Notes

> **IMPORTANT**: This patch set has been revised following a third-party expert review.
>
> **Key Corrections**:
> - ~~P0-002 (Inventory race condition)~~ **REMOVED** - False positive. Code already implements `.for("update")` locking at `ordersDb.ts:290-296`
> - P1-001 (Invoice void logic) - Reworded to clarify semantic issue (business rule vs implementation mismatch)
> - Added reference to existing working pattern (PaymentInspector.tsx) for P0-001

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

## P0-003: Order Status Machine Incomplete

**File**: `server/db/schema.ts` (or relevant enum definition)
**File**: `server/ordersDb.ts:1564-1570` (validation logic)
**Verified**: ✅ Code shows only PENDING/PACKED/SHIPPED accepted

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
  'FULFILLED',
  'PACKED',
  'SHIPPED',
  'DELIVERED',
]);
```

### Fixed Validation
```typescript
const validStatuses = ['DRAFT', 'CONFIRMED', 'PENDING', 'FULFILLED', 'PACKED', 'SHIPPED', 'DELIVERED'];
const validStatus = validStatuses.includes(newStatus) ? newStatus : 'PENDING';
```

**Migration Required**:
```sql
-- Add new enum values (PostgreSQL)
ALTER TYPE fulfillment_status ADD VALUE 'DRAFT' BEFORE 'PENDING';
ALTER TYPE fulfillment_status ADD VALUE 'CONFIRMED' AFTER 'DRAFT';
ALTER TYPE fulfillment_status ADD VALUE 'FULFILLED' AFTER 'CONFIRMED';
ALTER TYPE fulfillment_status ADD VALUE 'DELIVERED' AFTER 'SHIPPED';
```

---

## P0-004: Individual Feature Flags Not Seeded

**File**: `server/services/seedFeatureFlags.ts`
**Verified**: ✅ Deployment flags exist, individual surface flags do not

### Add to seed data
```typescript
const workSurfaceFlags = [
  // Deployment flags (existing - keep these)
  {
    key: 'WORK_SURFACE_INTAKE',
    name: 'Work Surface: Intake Module',
    description: 'Enable Work Surface UI for intake workflows',
    defaultEnabled: true,
  },
  // ... other deployment flags ...

  // Individual surface flags (NEW - add these)
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

## P1-001: Invoice Void Logic - Business Rule Clarification Needed

**File**: `server/routers/invoices.ts`
**Lines**: 392-397
**Verified**: ✅ Code exists as reported

### Current Code
```typescript
if (invoice.status === "PAID" && input.status !== "VOID") {
  throw new TRPCError({
    code: "BAD_REQUEST",
    message: "Paid invoices can only be voided"
  });
}
```

### Analysis
The current code says "Paid invoices can **only** be voided" - meaning:
- If invoice is PAID, you CAN change to VOID (allowed)
- If invoice is PAID, you CANNOT change to anything else (blocked)

The original QA report claimed the business rule is "Cannot void paid invoices" which is the OPPOSITE.

**Action Required**: Clarify with product owner which behavior is correct:

**Option A**: If voiding paid invoices SHOULD be prevented:
```typescript
if (invoice.status === "PAID" && input.status === "VOID") {
  throw new TRPCError({
    code: "BAD_REQUEST",
    message: "Cannot void a paid invoice. Record a credit memo instead."
  });
}
```

**Option B**: If current behavior is intentional (void is only option for paid):
- Update business requirements documentation
- Add additional validation for void reason requirement
- Mark this issue as "Working As Designed"

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
3. **P0-003**: Order status machine - Requires migration
4. **P0-004**: Feature flags seeding - Script change only
5. **P1-006**: Error displays - UX improvement
6. **P1-007**: Deprecated endpoint - Technical debt

### Next Sprint
7. **P1-001**: Invoice void logic - Needs product clarification
8. **P1-003**: Optimistic locking - May need client updates
9. **P1-008**: Permission check - Security hardening

---

## Testing Requirements

| Fix | Test Requirement |
|-----|------------------|
| P0-001 | Full payment flow: record → verify → check ledger |
| P0-003 | Status transitions through all states |
| P0-004 | Flag evaluation with and without individual flags |
| P1-002 | Rapid click test (10 clicks in 1 second) |
| P1-006 | Network error simulation, verify retry works |
| P1-007 | Vendor dropdown populates correctly |

---

## Rollback Plan

All changes should be:
1. Feature flagged where possible (P0-004 enables this)
2. Database migrations reversible
3. Tested in staging before production
4. Deployed during low-traffic windows

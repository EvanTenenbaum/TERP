# WSQA-001: Wire Payment Recording Mutation

**Source:** Work Surfaces QA Report (P0-001)
**Priority:** HIGH (P0 Blocker)
**Estimate:** 4h

## Problem Statement

The `InvoicesWorkSurface.tsx` payment handler at lines 717-724 is a stub that shows success without actually recording payments. The code contains a comment "In a real implementation, this would call a recordPayment mutation" but the mutation is never called.

This breaks the entire Invoice → Payment → Reconciliation golden flow.

## Evidence

```typescript
// InvoicesWorkSurface.tsx:717-724 (CURRENT - BROKEN)
const handlePaymentSubmit = (invoiceId: number, amount: number, note: string) => {
  setSaving("Recording payment...");
  // In a real implementation, this would call a recordPayment mutation  ← STUB!
  toasts.success(`Payment of ${formatCurrency(amount)} recorded`);
  setSaved();
  setShowPaymentDialog(false);
  utils.accounting.invoices.list.invalidate();
};
```

## Reference Implementation

`PaymentInspector.tsx` shows the correct pattern for recording payments:

```typescript
const recordPayment = trpc.payments.recordPayment.useMutation({
  onSuccess: () => {
    utils.accounting.invoices.list.invalidate();
    utils.accounting.invoices.getById.invalidate({ id: invoiceId });
  },
});
```

## Implementation Guide

### Step 1: Add Mutation Hook (15 min)

**File:** `client/src/components/work-surface/InvoicesWorkSurface.tsx`

Add near other mutation hooks (around line 50-100):

```typescript
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
```

### Step 2: Wire Handler to Mutation (10 min)

**File:** `client/src/components/work-surface/InvoicesWorkSurface.tsx`

Replace the stub handler at lines 717-724:

```typescript
const handlePaymentSubmit = (invoiceId: number, amount: number, note: string) => {
  recordPaymentMutation.mutate({
    invoiceId,
    amount,
    notes: note,
    paymentMethod: 'CHECK', // Default or get from dialog
    paymentDate: new Date(),
  });
};
```

### Step 3: Add Loading State to Dialog (15 min)

Update the payment dialog to show loading state and disable submit while pending:

```typescript
<Button
  onClick={() => handlePaymentSubmit(selectedInvoice.id, paymentAmount, paymentNote)}
  disabled={recordPaymentMutation.isPending}
>
  {recordPaymentMutation.isPending ? "Recording..." : "Record Payment"}
</Button>
```

### Step 4: Verify Backend Endpoint Exists (30 min)

**File:** `server/routers/payments.ts`

Confirm the `recordPayment` procedure exists and accepts the expected input:

```typescript
recordPayment: protectedProcedure
  .input(z.object({
    invoiceId: z.number(),
    amount: z.number().positive(),
    notes: z.string().optional(),
    paymentMethod: z.enum(['CHECK', 'CASH', 'ACH', 'WIRE', 'CREDIT_CARD']),
    paymentDate: z.date().optional(),
  }))
  .mutation(async ({ ctx, input }) => {
    // Implementation
  }),
```

### Step 5: Test Golden Flow (2h)

1. Create a test invoice or use existing
2. Open InvoicesWorkSurface
3. Select an invoice with amount due > 0
4. Click "Record Payment"
5. Enter payment amount and note
6. Submit
7. Verify:
   - Toast shows success
   - Invoice list refreshes
   - Invoice amount_due decreased
   - Payment appears in payment history
   - Client ledger updated

## Acceptance Criteria

- [ ] Payment recording mutation is called when submitting payment dialog
- [ ] Success toast shows actual server response
- [ ] Invoice list invalidates and refreshes after payment
- [ ] AR Aging report invalidates after payment
- [ ] Payment dialog shows loading state during mutation
- [ ] Submit button disabled while mutation pending
- [ ] Error handling shows server errors in toast
- [ ] Golden Flow GF-004 (Invoice → Payment → Reconciliation) passes

## Rollback

If issues discovered:
1. Revert the mutation hook and handler changes
2. Restore the original stub with TODO comment
3. Create follow-up ticket with specific issues found

## Dependencies

- None (backend endpoint already exists)

## Testing Verification

```bash
# Run after implementation
pnpm test client/src/components/work-surface/InvoicesWorkSurface.test.tsx
pnpm test:e2e tests-e2e/accounting-crud.spec.ts
```

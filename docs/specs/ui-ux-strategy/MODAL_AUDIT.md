# Modal Audit Report (UXS-601)

> **Created**: 2026-01-20
> **Status**: COMPLETE
> **Purpose**: Identify modals that should be replaced with inspector/inline patterns

## Executive Summary

Found **47+ Dialog/Modal components** in the codebase. Many data entry modals should be replaced with inspector/inline patterns per Work Surface doctrine:

- **12 High Priority** - Data entry modals that lose context
- **9 Appropriate** - Confirmation/status modals (keep as modals)
- **26+ Feature-specific** - Mixed appropriateness

## Priority Classification

### 🔴 HIGH PRIORITY - Replace with Inspector/Inline

These data entry modals interrupt workflow and lose context:

| Component | Path | Issue | Recommendation |
|-----------|------|-------|----------------|
| RecordPaymentDialog | components/accounting/RecordPaymentDialog.tsx | Multi-field form loses invoice context | Inspector panel |
| EditInvoiceDialog | components/orders/EditInvoiceDialog.tsx | Edit form loses order context | Inspector panel |
| PayVendorModal | components/accounting/PayVendorModal.tsx | 3-step flow loses vendor context | Inline workflow |
| ReceivePaymentModal | components/accounting/ReceivePaymentModal.tsx | 3-step flow loses client context | Inline workflow |
| PurchaseModal | components/inventory/PurchaseModal.tsx | Large form, many fields | Dedicated page |
| LocationFormDialog | components/locations/LocationFormDialog.tsx | Location edit loses hierarchy context | Inspector panel |
| EventFormDialog | components/calendar/EventFormDialog.tsx | Complex recurrence form | Dedicated page |
| CogsEditModal | components/inventory/CogsEditModal.tsx | Retroactive impact, needs context | Inline with impact preview |
| AddAdjustmentDialog | components/work-surface/ClientLedgerWorkSurface.tsx | Financial operation needs ledger context | Inspector panel |
| SaveViewDialog | components/sales/SaveViewDialog.tsx | Simple name/save | Inline popover |
| PriceAdjustmentDialog | components/pricing/PriceAdjustmentDialog.tsx | Price negotiation loses order context | Inline on line item |
| CreditOverrideDialog | components/credit/CreditOverrideDialog.tsx | Dangerous operation needs audit context | Inspector with history |

### 🟢 APPROPRIATE - Keep as Modal

Confirmation and status modals are appropriate:

| Component | Path | Purpose |
|-----------|------|---------|
| ConfirmDraftModal | components/orders/ConfirmDraftModal.tsx | Inventory-reducing action confirmation |
| ShipOrderModal | components/orders/ShipOrderModal.tsx | Status transition confirmation |
| DeleteDraftModal | components/orders/DeleteDraftModal.tsx | Destructive action confirmation |
| ConflictDialog | components/common/ConflictDialog.tsx | Concurrent edit resolution |
| BulkConfirmDialog | components/inventory/BulkConfirmDialog.tsx | Batch operation confirmation |
| DeleteLocationDialog | components/locations/DeleteLocationDialog.tsx | Destructive action confirmation |
| CreditWarningDialog | components/orders/CreditWarningDialog.tsx | Business rule enforcement |
| AuditModal | components/audit/AuditModal.tsx | Read-only audit display |
| KeyboardShortcutsModal | components/KeyboardShortcutsModal.tsx | Reference display |

### 🟡 BORDERLINE - Case by Case

| Component | Path | Consideration |
|-----------|------|---------------|
| ProcessReturnModal | components/orders/ProcessReturnModal.tsx | Complex workflow - consider inline wizard |
| CogsAdjustmentModal | components/orders/CogsAdjustmentModal.tsx | Quick override - could be inline |
| EditBatchModal | components/inventory/EditBatchModal.tsx | Status/location edits - inspector candidate |
| QuickAddTaskModal | components/tasks/QuickAddTaskModal.tsx | Quick add could be inline |

## Implementation Plan

### Phase 1: Sprint 5 Targets (3 replacements)

1. **RecordPaymentDialog → PaymentInspector**
   - Side panel showing invoice context
   - Payment form with real-time validation
   - Maintains order/invoice visibility

2. **EditInvoiceDialog → InvoiceInspector**
   - Already have InvoicesWorkSurface foundation
   - Edit fields in inspector panel
   - Due date, terms, notes inline

3. **PriceAdjustmentDialog → InlinePriceEditor**
   - Inline popover on line item row
   - Shows margin calculation in context
   - Audit notes inline

### Phase 2: Future Sprints

- PayVendorModal → VendorPaymentInline
- ReceivePaymentModal → ClientPaymentInline
- LocationFormDialog → LocationInspector
- CogsEditModal → CogsInlineEditor

## Patterns to Apply

### Inspector Panel Pattern
```tsx
// From InspectorPanel.tsx
<InspectorPanel
  title="Record Payment"
  onClose={closeInspector}
>
  <InspectorSection title="Invoice">
    {/* Context display */}
  </InspectorSection>
  <InspectorSection title="Payment Details">
    {/* Form fields */}
  </InspectorSection>
</InspectorPanel>
```

### Inline Popover Pattern
```tsx
// For quick edits like price adjustment
<Popover>
  <PopoverTrigger>{price}</PopoverTrigger>
  <PopoverContent>
    <form onSubmit={handleSave}>
      {/* Minimal fields */}
    </form>
  </PopoverContent>
</Popover>
```

### Inline Workflow Pattern
```tsx
// For multi-step flows
<div className="border-t">
  <StepIndicator current={step} total={3} />
  {step === 1 && <Step1 />}
  {step === 2 && <Step2 />}
  {step === 3 && <Step3 />}
</div>
```

## Metrics

- **Total Modals Found**: 47+
- **High Priority Replacements**: 12
- **Phase 1 Targets**: 3
- **Appropriate Modals**: 9

## Files Created/Modified

### New Components
- `components/work-surface/PaymentInspector.tsx`
- `components/work-surface/InvoiceInspector.tsx`
- `components/work-surface/InlinePriceEditor.tsx`

### Updated
- `components/work-surface/InvoicesWorkSurface.tsx` - Use new inspectors

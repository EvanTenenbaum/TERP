# P2 Immediate Fixes — Design

## Fix 1: Overdue Invoice Contact Info

**Current state:** `server/routers/accounting.ts:278-279` queries `customerEmail` and `customerPhone` via clients join. The data is returned in the API response but `InvoicesSurface.tsx` never renders it.

**Design:** Add contact info to the customer name cell in the overdue invoices table. Use a compact layout:

- Customer name as primary text (existing)
- Phone + email as secondary text below, smaller/muted
- Only show when data exists (graceful null handling)

**Files to change:**

- `client/src/components/spreadsheet-native/InvoicesSurface.tsx` — render contact fields in customer cell
- No backend changes needed

**Alternative considered:** Separate contact columns — rejected because the handoff doc explicitly says "inline in the customer cell rather than bloating the table."

## Fix 2: Copy for Chat Data Source

**Current state:** `SalesCatalogueSurface.tsx` `handleCopyForChat` maps over `inventoryRows` (full filtered catalog).

**Design:** Change data source to `selectedItems` (the items the user has added to their curated sheet). Update disabled condition to check `selectedItems.length === 0`.

**Files to change:**

- `client/src/components/spreadsheet-native/SalesCatalogueSurface.tsx` — change `handleCopyForChat` data source
- Update corresponding test assertions

**Edge case:** If `selectedItems` is empty but `inventoryRows` is not, the button should be disabled with a tooltip explaining "Add items to your catalogue first."

## Fix 3: Double-Submit Guard

**Current state:** `RecordPaymentDialog.tsx` uses `recordPaymentMutation.isPending` for disabled state, which has a React state propagation delay.

**Design:** Add a `submittingRef = useRef(false)` guard:

```typescript
const submittingRef = useRef(false);
const handleSubmit = async () => {
  if (submittingRef.current) return;
  submittingRef.current = true;
  try {
    await recordPaymentMutation.mutateAsync(payload);
  } finally {
    submittingRef.current = false;
  }
};
```

**Files to change:**

- `client/src/components/accounting/RecordPaymentDialog.tsx`

## Fix 4: Post-Merge QA

**Design:** Run Playwright proof scripts against staging for:

1. Sales catalogue — Copy for Chat enabled + clipboard interaction
2. Orders document deep-link — document view loads
3. Inventory browser — search + filter + non-sellable exclusion
4. Accounting dashboard — overdue invoices with contact info
5. Purchase orders surface — PO table loads
6. Gallery quantity adjust — gallery → grid transition with batch selected

**Output:** Screenshots + summary.json to `output/playwright/p2-phase1-qa/`

# TER-1324 Agent Session

- **Ticket:** TER-1324
- **Branch:** `fix/ter-1324-invoices-status-raw-html`
- **Status:** Verified — already fixed by PR #723 (TER-1360)
- **Agent:** Factory Droid

## Summary of Investigation

TER-1324 reported that the AccountingWorkspace → Invoices tab Status column
rendered raw `<span>` HTML markup in every row. Investigation found the bug
was already addressed by PR #723 (TER-1360) on the main branch.

### Where invoices render in the accounting workspace

Only `client/src/components/spreadsheet-native/InvoicesSurface.tsx` renders
the invoices grid. `AccountingWorkspacePage.tsx` lazy-loads this single
surface for the `invoices` tab panel; no other invoice grid or Status column
is rendered in the workspace.

### Status column renderer — correct

`statusCellRenderer` at line 325 returns JSX (not an HTML string):

```tsx
function statusCellRenderer(params: { value: string }) {
  const status = params.value ?? "DRAFT";
  const color = getInvoiceStatusClass(status);
  const label = getInvoiceStatusLabel(status);
  return (
    <span className={`inline-flex ... ${color}`}>
      {label}
    </span>
  );
}
```

It is wired to the Status column via `cellRenderer: statusCellRenderer` at
line 446. AG Grid React renders the JSX as a DOM element, so there is no
raw markup leaking into cells.

### Other renderers audited

- `clientName` column renderer — returns JSX (`<div>`/`<span>` React elements)
- `dueDate` column renderer — returns JSX for overdue badge
- `amountDueFormatted` column renderer — returns JSX (TER-1253 fix)
- Client ledger `type` column renderer — returns JSX
- `paymentPct` uses `valueFormatter` (string, no markup) — safe

### Verification

- `pnpm check` — zero TypeScript errors
- `pnpm lint` (scope) — clean for `InvoicesSurface.tsx`, `InvoicesSurface.test.tsx`, `AccountingWorkspacePage.tsx`
- `pnpm exec vitest run client/src/components/spreadsheet-native/InvoicesSurface.test.tsx` — 13/13 passed, including the TER-1360 DOM guardrail that asserts no `<span class=` text leaks

### Conclusion

TER-1324 is complete. The Status column renders a styled badge as intended.
Every `cellRenderer` in `InvoicesSurface.tsx` returns JSX, not HTML strings.
This PR documents the verification and closes the duplicate tracking of the
TER-1360 fix.

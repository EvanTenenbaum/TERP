# Unified Sheet-Native Accounting Surfaces

**Date**: 2026-03-27
**Status**: Design Approved
**Approach**: 4-phase rollout across all 9 non-dashboard accounting tabs + dashboard styling pass

## Problem

The Accounting workspace has 10 tabs with inconsistent surface treatments:
- Invoices and Payments have dual surfaces (classic + sheet-native pilot) behind a SheetModeToggle
- Bills, GL, CoA, Expenses, Bank Accounts, Bank Transactions, and Fiscal Periods are classic HTML table pages
- ClientLedgerPilotSurface (1,392 lines) exists but isn't wired into the workspace
- The directional mockups from the Sales spec prescribe a specific density, layout composition, and component vocabulary that none of the accounting surfaces follow

## Decision

Replace all 9 non-dashboard tabs with unified sheet-native surfaces. Kill SheetModeToggle for Invoices and Payments. Apply a density styling pass to the Dashboard tab. Merge Client Ledger into the Invoices surface as a sub-view rather than adding an 11th tab.

---

## Layout Pattern: Grid + Collapsible Inspector

All surfaces share a common layout skeleton:

1. **Toolbar** (single row, 4px vertical padding) — surface title + inline KPI badges + surface-specific toggles + search + refresh
2. **Action Bar** (single row, 3px vertical padding) — status/type filter tabs + context-sensitive workflow actions
3. **PowersheetGrid + Collapsible Inspector** — grid takes 100% width by default. Selecting a row opens inspector at ~25% right with smooth animation. Close with ✕ button or Esc key.
4. **Support Modules** (below grid, collapsible) — surface-specific: aging panels, Trial Balance, Client Ledger sub-view
5. **Status Bar** (WorkSurfaceStatusBar) — selection count + active filter + context info | KeyboardHintBar

### Density Tokens

- **Padding**: 3-4px vertical on toolbar/action bar, 6px gap between cards
- **Font sizes**: 9-11px for labels/badges/hints, 11-12px for data
- **Grid cards**: `border: 1px solid border`, `border-radius: 6px`, white background
- **Editable cells**: left 2px accent border + subtle accent background (`powersheet-cell--editable`)
- **Locked cells**: muted foreground + muted background (`powersheet-cell--locked`)
- **KPI badges**: compact inline badges in toolbar (not a separate KPI band)
- **Status cards**: AUTO/OK, DIRTY/N badges in toolbar (right-aligned)

### Grid Editability

Surfaces fall into two categories:

| Category | Surfaces | Grid Mode |
|----------|----------|-----------|
| **Read-only registries** | Invoices, Bills, Payments, General Ledger | `selectionMode: "cell-range"`, no fill handle, no edit, no undo. Records created/mutated via dialogs and workflow actions. |
| **Editable registries** | Expenses, Bank Accounts, Bank Transactions, Fiscal Periods, Chart of Accounts | `selectionMode: "cell-range"`, `enableFillHandle: true`, `enableUndoRedo: true`. Inline cell editing with accent borders. New rows added via "+ Add Row" action (appends empty editable row to grid). Auto-save on cell blur with debounce. |

---

## Phase 1: Core AR/AP Registries

### InvoicesSurface.tsx

**Replaces**: InvoicesPilotSurface (1,464 lines) + InvoicesWorkSurface (1,308 lines) + ClientLedgerPilotSurface (1,392 lines — merged as sub-view)

**Also retires**: SheetModeToggle on invoices tab

#### Layout

**1. Toolbar**
- "Invoices" title
- KPI badges: `$AR total` (green), `N overdue` (amber), `N total` (blue)
- AR Aging toggle button (opens/collapses aging panel below grid, state persisted in localStorage)
- Search input
- Refresh button

**2. Action Bar**
- Status filter tabs: All | Draft | Sent | Viewed | Partial | Paid | Overdue | Void
- Right-aligned workflow actions: + Create Invoice, Mark Sent, Record Payment, Void, PDF, Print
- Actions enable/disable based on selected row's status

**3. PowersheetGrid (read-only) + Collapsible Inspector**

Grid columns:
| Column | Min Width | Cell Style | Notes |
|--------|-----------|-----------|-------|
| Invoice # | 85px | locked, mono | |
| Client | 110px | locked, clickable (blue underline) | Clicking opens Client Ledger sub-view below |
| Date | 70px | locked | Invoice date |
| Due | 65px | locked | Red text if overdue |
| Total | 75px | locked, mono, right-aligned | |
| Due Amt | 65px | locked, mono, right-aligned | Red if > 0, bold. $0.00 for PAID/VOID. |
| Status | 55px | locked | Color-coded badge (INVOICE_STATUS_TOKENS) |
| Days | 50px | locked | Aging days badge for overdue invoices |

Inspector sections (when row selected):
- **Overview**: Client (clickable link), Date, Due (with overdue indicator), Terms
- **Amounts**: Total, Paid, Due with payment progress bar (% collected)
- **GL Status**: Posted/Draft badge with GL entry number
- **Payment History**: List of payments against this invoice (or "No payments recorded")
- **Quick Actions**: Record Payment, Mark Sent, PDF (contextual to current status)

**4. AR Aging Panel** (collapsible, toggled from toolbar)
- 5 aging buckets: Current | 1-30 days | 31-60 | 61-90 | 90+
- Each shows dollar amount + invoice count
- Data source: `invoices.getARAging`
- Background: warm amber tone (`#fff8f0`, border `#ffe0b2`)

**5. Client Ledger Sub-View** (collapsible, auto-populates on row selection)
- Header: "Client Ledger: [client name]" + balance badge + action buttons (+ Adjustment, Export CSV, Date range filter)
- Mini PowersheetGrid showing selected client's transactions:
  | Column | Notes |
  |--------|-------|
  | Date | Transaction date |
  | Type | Badge: INVOICE / PAYMENT / ADJUST |
  | Description | Reference number + description |
  | Debit | Right-aligned, mono |
  | Credit | Right-aligned, mono |
  | Balance | Running balance, right-aligned, mono. Red if positive (owes money). |
- Paginated: 50 rows per page, `[` / `]` keyboard shortcuts for paging
- Click a transaction row to navigate to its source (invoice → select in grid, payment → deep-link to Payments tab, PO → procurement workspace)
- Add Adjustment opens two-step dialog (form → confirm) from existing ClientLedgerPilotSurface
- Data source: `clientLedger.getLedger` (server-side aggregation of 5 data sources)
- Background: cool blue tone (`#f8fafe`, border `#bbdefb`)

**6. Status Bar**
- Left: "N selected · [status filter] · N total · [client name] ledger"
- Right: KeyboardHintBar — Click select, Shift+Click range, ⌘C copy, ⌘A all, Esc close inspector

#### Sidecar Dialogs (preserved from existing surfaces)

- **InvoiceToPaymentFlow** (941 lines) — golden flow for recording payments. Triggered by "Record Payment" action.
- **Create Invoice dialog** — uses `accounting.invoices.generateNumber`
- **Void with reason dialog** — calls `invoices.void` with reason + GL reversal

#### Data & State

- **tRPC layer unchanged**: `invoices.list`, `invoices.getSummary`, `invoices.getARAging`, `invoices.void`, `invoices.markSent`, `invoices.checkOverdue`, `accounting.invoices.generateNumber`, `clientLedger.getLedger`, `clientLedger.addAdjustment`
- **Deep-link support**: `?invoiceId=` selects that row and opens inspector on mount (existing `parseInvoiceDeepLink`)
- **Selection state**: single-row selection drives inspector + Client Ledger population

#### Routing Change

```tsx
// AccountingWorkspacePage.tsx — invoices panel
// Before: two surfaces + toggle
surfaceMode === "sheet-native"
  ? <InvoicesPilotSurface onOpenClassic={...} />
  : <InvoicesWorkSurface />

// After: one surface, no toggle
<InvoicesSurface />
```

#### Components Retired

- `InvoicesPilotSurface` (1,464 lines)
- `InvoicesWorkSurface` (1,308 lines)
- `ClientLedgerPilotSurface` (1,392 lines) — merged into InvoicesSurface as sub-view
- `ClientLedgerWorkSurface` (1,225 lines) — no longer needed
- `InvoiceEditInspector` (389 lines) — replaced by inline inspector
- `SheetModeToggle` for invoices tab

---

### BillsSurface.tsx

**Replaces**: Bills.tsx classic page (543 lines)

**New surface** — AP mirror of InvoicesSurface

#### Layout

**1. Toolbar**
- "Bills" title
- KPI badges: `$AP total` (amber), `N overdue` (red), `N total` (blue)
- AP Aging toggle button
- Search + refresh

**2. Action Bar**
- Status filter tabs: All | Draft | Submitted | Approved | Received | Paid | Overdue | Void
- Right-aligned actions: Pay Vendor, Mark Received, Void
- Actions enable/disable based on selected row's status

**3. PowersheetGrid (read-only) + Collapsible Inspector**

Grid columns:
| Column | Min Width | Notes |
|--------|-----------|-------|
| Bill # | 80px | locked, mono |
| Vendor | 110px | locked, clickable |
| Date | 70px | Bill date |
| Due | 65px | Red if overdue |
| Total | 75px | mono, right-aligned |
| Due Amt | 65px | mono, right-aligned, red if > 0 |
| Status | 55px | Color-coded badge |

Inspector sections:
- **This Bill**: Vendor (clickable), Bill Date, Due (with overdue indicator), Total, Paid, Due, Status, GL status
- **Line Items**: Compact list of bill line items (product × qty — amount)
- **Vendor AP Context** (orange card): Total owed to this vendor across all open bills, open bill count, list of other open bills from same vendor (clickable to select that row). Data: filter existing `accounting.bills.list` by vendor ID.
- **Quick Actions**: "Pay This Bill", "Pay All Open" (batch pay all open from this vendor)

**4. AP Aging Panel** (collapsible)
- Same 5-bucket pattern as AR Aging but for bills
- Data source: `accounting.bills.getAPAging`
- Background: warm red tone (`#fef3f0`, border `#ffcdd2`)

**5. Status Bar**
- Left: "N selected · [status filter] · N total · [vendor name]: $X owed"

#### Sidecar Dialogs

- **PayVendorModal** (398 lines) — existing modal for recording vendor payments
- **Void confirmation** — standard confirm dialog

#### Data & State

- **tRPC layer unchanged**: `accounting.bills.list`, `accounting.bills.getById`, `accounting.bills.getAPAging`, `accounting.bills.approve`, `accounting.bills.void`
- **Deep-link support**: `?billId=` selects row on mount (from existing `parseBillRouteContext`)

---

### PaymentsSurface.tsx

**Replaces**: PaymentsPilotSurface (928 lines) + Payments.tsx classic page (337 lines)

**Also retires**: SheetModeToggle on payments tab

#### Layout

**1. Toolbar**
- "Payments" title
- KPI badges: `N total` (blue), `$received` (green), `$sent` (amber)
- Search + refresh

**2. Action Bar**
- Type filter tabs: All | ↓ Received | ↑ Sent
- Right-aligned actions: Record Payment, Void

**3. PowersheetGrid (read-only) + Collapsible Inspector**

Grid columns:
| Column | Min Width | Notes |
|--------|-----------|-------|
| Payment # | 95px | locked, mono |
| Date | 70px | |
| Type | 70px | Badge: RECEIVED (green) / SENT (red) |
| Method | 80px | Wire, Check, Cash, etc. |
| Amount | 80px | mono, right-aligned. Green for received, red for sent. |
| Invoice | 90px | mono, clickable deep-link to Invoices tab |
| Reference | flex | Reference/check number |

Inspector sections:
- **Payment detail**: Type badge, Date, Amount (color-coded), Method, Reference, Invoice (clickable), Notes

**4. Status Bar**
- Left: "N selected · [type filter] · N total"

No aging panel, no support modules — Payments is the simplest registry surface.

#### Sidecar Dialogs

- **InvoiceToPaymentFlow** (941 lines) — same golden flow as Invoices
- **Void confirmation dialog** — existing from pilot

#### Data & State

- **tRPC layer unchanged**: `accounting.payments.list`, `accounting.payments.record`, `accounting.payments.void`
- **Deep-link support**: `?id=`, `?invoiceId=`, `?orderId=` (existing `parsePaymentRouteContext`)

#### Routing Change

```tsx
// AccountingWorkspacePage.tsx — payments panel
// Before:
surfaceMode === "sheet-native"
  ? <PaymentsPilotSurface onOpenClassic={...} />
  : <Payments embedded />

// After:
<PaymentsSurface />
```

#### Components Retired

- `PaymentsPilotSurface` (928 lines)
- Classic `Payments.tsx` page (337 lines) — only standalone route version may remain if needed
- `PaymentInspector` (398 lines) — replaced by inline inspector
- `SheetModeToggle` for payments tab

---

## Phase 2: Ledger & Reports

### GeneralLedgerSurface.tsx

**Replaces**: GeneralLedger.tsx classic page (561 lines)

#### Layout

**1. Toolbar**
- "General Ledger" title
- Scoping selectors (inline): Account selector dropdown, Fiscal Period selector, Date range picker
- Trial Balance toggle button
- Search + refresh

**2. Action Bar**
- Status filter tabs: All | Posted | Draft
- Right-aligned: running account balance display (`Balance: $42,850.00 DR`)
- Actions: + Post Journal Entry, Reverse Entry, Export CSV

**3. PowersheetGrid (read-only) + Collapsible Inspector**

Grid columns:
| Column | Min Width | Notes |
|--------|-----------|-------|
| Entry # | 85px | locked, mono |
| Date | 70px | |
| Account | 65px | Account code, mono |
| Debit | 80px | mono, right-aligned, bold if non-zero |
| Credit | 80px | mono, right-aligned, red if non-zero |
| Description | flex | |
| Status | 55px | POST / DRAFT badge |

Inspector sections:
- **Entry detail**: Date, Account (code + name), Debit, Credit, Period, Status, Description
- **Source Reference**: Clickable navigation cards showing the source document (PAYMENT → payments tab, INVOICE → invoices tab, PO → procurement). Uses `referenceType` + `referenceId` from GL entry.
- **Quick Action**: Reverse (for posted entries only)

**4. Trial Balance** (collapsible support module)
- Mini-grid: Account #, Account Name, Total Debit, Total Credit
- Totals row at bottom
- Balanced indicator: "✓ Balanced — Debits = Credits" (green) or "✗ Out of balance by $X" (red)
- Export button
- Data source: `accounting.reports.trialBalance`
- Background: cool blue tone (`#f0f4ff`, border `#bbdefb`)
- Current account highlighted in the Trial Balance grid

**5. Status Bar**
- Left: "N selected · Account: [code] [name] · [period] · N entries · Balance: $X DR/CR"

#### Sidecar Dialogs

- **JournalEntryForm** (250 lines) — existing component for posting journal entries
- **Reverse confirmation** — confirm dialog for GL reversal

#### Data & State

- **tRPC layer unchanged**: `accounting.generalLedger.list`, `accounting.generalLedger.reverse`, `accounting.reports.trialBalance`, `accounting.journals.create`
- Account/Period/Date scoping drives the grid query parameters

---

### ChartOfAccountsSurface.tsx

**Replaces**: ChartOfAccounts.tsx classic page (714 lines)

#### Layout

**1. Toolbar**
- "Chart of Accounts" title
- KPI badges: `N accounts` (blue), `N active` (green)
- Search + refresh

**2. Action Bar**
- Type filter tabs: All Types | Asset | Liability | Equity | Revenue | Expense
- Right-aligned actions: + Add Row (appends editable row), Edit (selected account)

**3. PowersheetGrid (editable, grouped) + Collapsible Inspector**

Grid mode: `selectionMode: "cell-range"`, `enableFillHandle: true`, `enableUndoRedo: true`

Row grouping by account type (AG Grid `rowGrouping`). Color-coded group headers:
- Asset: green (`#e8f5e9`)
- Liability: amber (`#fff3e0`)
- Equity: purple (`#f3e5f5`)
- Revenue: blue (`#e3f2fd`)
- Expense: red (`#ffebee`)

Grid columns:
| Column | Min Width | Editable | Notes |
|--------|-----------|----------|-------|
| Acct # | 80px | After creation: locked. New row: editable (accent border). | mono |
| Account Name | flex | Yes (accent border) | |
| Type | 90px | After creation: locked. New row: editable. | Badge |
| Normal Balance | 80px | Yes (accent border) | DEBIT / CREDIT |
| Active | 55px | Yes (accent border) | Checkbox toggle |

Inspector sections:
- **Account detail**: All fields + description (editable)
- **Parent Account**: Link to parent if exists

New row workflow: "+ Add Row" appends an empty row at the bottom of the appropriate type group. User fills in Account #, Name, Type, Normal Balance. Auto-saves on blur. Calls `accounting.accounts.create` for new rows, `accounting.accounts.update` for edits.

**4. Status Bar**
- Left: "N selected · [type filter] · N accounts (N active)"

No support modules — flat reference grid.

---

## Phase 3: Banking & Operational

All four surfaces follow the standard editable registry template. Grid has inline editing with accent borders, fill handle, undo/redo. New rows added via "+ Add Row" action.

### ExpensesSurface.tsx

**Replaces**: Expenses.tsx classic page (421 lines)

**Toolbar KPI badges**: `$total` (amber), `N entries` (blue), `N pending reimbursement` (pink)

**Action Bar**: Category dropdown filter + Reimbursable toggle + Export CSV

**Grid columns** (editable):
| Column | Editable | Notes |
|--------|----------|-------|
| Expense # | Locked (auto-generated) | mono |
| Date | Yes | |
| Description | Yes | |
| Category | Yes (dropdown) | Color-coded badge |
| Amount | Yes | mono, right-aligned |
| Reimbursable | Yes (checkbox) | |
| Reimbursed | Yes (checkbox) | |

**Data**: `accounting.expenses.list`, `accounting.expenses.create`, `accounting.expenses.update`, `accounting.expenseCategories.list`, `accounting.expenses.getBreakdownByCategory`, `accounting.expenses.getPendingReimbursements`

---

### BankAccountsSurface.tsx

**Replaces**: BankAccounts.tsx classic page (199 lines)

**Toolbar KPI badges**: `$total cash` (green), `N accounts` (blue), `N active` (green)

**Action Bar**: Type filter (Checking/Savings/Credit Card/Money Market) + Toggle Active

**Grid columns** (editable):
| Column | Editable | Notes |
|--------|----------|-------|
| Account Name | Yes | |
| Account # | Yes | mono |
| Bank Name | Yes | |
| Type | Yes (dropdown) | Badge |
| Balance | Yes | mono, right-aligned |
| Active | Yes (checkbox) | |

**Data**: `accounting.bankAccounts.list`, `accounting.bankAccounts.create`, `accounting.bankAccounts.update`, `accounting.bankAccounts.getTotalCashBalance`

---

### BankTransactionsSurface.tsx

**Replaces**: BankTransactions.tsx classic page (377 lines)

**Toolbar KPI badges**: `$deposits` (green), `$withdrawals` (red), `N unreconciled` (amber)

**Action Bar**: Type filter (Deposit/Withdrawal/Transfer/Fee) + Reconciled/Unreconciled filter + Toggle Reconciled + Export CSV

**Grid columns** (editable):
| Column | Editable | Notes |
|--------|----------|-------|
| Date | Yes | |
| Type | Yes (dropdown) | Badge |
| Description | Yes | |
| Reference # | Yes | mono |
| Amount | Yes | mono, right-aligned. Color: green deposits, red withdrawals |
| Reconciled | Yes (checkbox) | |

**Data**: `accounting.bankTransactions.list`, `accounting.bankTransactions.create`, `accounting.bankTransactions.update`

---

### FiscalPeriodsSurface.tsx

**Replaces**: FiscalPeriods.tsx classic page (678 lines)

**Toolbar KPI badges**: `N periods` (blue), `[current open period]` (green)

**Action Bar**: Status filter (All/Open/Closed/Locked) + Actions: Close Period, Lock Period

Row grouping by fiscal year (AG Grid `rowGrouping`).

**Grid columns** (editable for new/open periods):
| Column | Editable | Notes |
|--------|----------|-------|
| Period Name | Yes (open only) | |
| Fiscal Year | Yes (open only) | |
| Start Date | Yes (open only) | |
| End Date | Yes (open only) | |
| Status | Locked (changed via actions) | Badge: OPEN (green), CLOSED (amber), LOCKED (red) |

Status transitions via action bar buttons (not inline): Open → Closed → Locked. Closed/Locked periods have all cells locked.

**Data**: `accounting.fiscalPeriods.list`, `accounting.fiscalPeriods.create`, `accounting.fiscalPeriods.update`, `accounting.fiscalPeriods.close`, `accounting.fiscalPeriods.lock`

---

## Phase 4: Dashboard Styling Pass

No layout changes. Apply density tokens so the Dashboard doesn't feel jarring alongside the new surfaces.

### Token Changes

| Property | Current | New |
|----------|---------|-----|
| Card border-radius | 12px (rounded-xl) | 6px (rounded-md) |
| Card padding | 16px (p-4) | 10px (p-2.5) |
| Card gap | 16px (gap-4) | 8px (gap-2) |
| Section headers | 14-16px | 12px |
| KPI values | 18-24px | 16px |
| Labels/descriptions | 11-14px | 9-11px |
| Button padding | 8px 16px | 5px 12px |
| Button border-radius | 8px | 4px |

### What Stays

Layout structure, quick action positions ("Start here" card with Receive Payment / Pay Supplier), tab navigation, color scheme, AR/AP totals, overdue tables, recent activity, expense breakdown — all unchanged. Only density properties are adjusted.

---

## AccountingWorkspacePage.tsx Changes

```tsx
// Before: SheetModeToggle + dual surfaces for invoices/payments
// After: No toggle, no mode switching, unified surfaces only

// Remove imports:
// - SheetModeToggle
// - PilotSurfaceBoundary
// - useSpreadsheetPilotAvailability, useSpreadsheetSurfaceMode, buildSurfaceAvailability
// - InvoicesWorkSurface (lazy or direct)
// - InvoicesPilotSurface (lazy)
// - PaymentsPilotSurface (lazy)
// - Payments (classic page)

// Remove: pilotSurfaceSupported, sheetPilotEnabled, availabilityReady,
//         surfaceMode, setSurfaceMode, commandStrip prop

// Add imports for new surfaces (lazy):
// - InvoicesSurface
// - BillsSurface
// - PaymentsSurface
// - GeneralLedgerSurface
// - ChartOfAccountsSurface
// - ExpensesSurface
// - BankAccountsSurface
// - BankTransactionsSurface
// - FiscalPeriodsSurface

// Each panel simplifies to:
<LinearWorkspacePanel value="invoices">
  <InvoicesSurface />
</LinearWorkspacePanel>
<LinearWorkspacePanel value="bills">
  <BillsSurface />
</LinearWorkspacePanel>
// ... same pattern for all 9 tabs
```

---

## Shared Infrastructure (Reuse, Don't Rebuild)

| Component | From | Used By |
|-----------|------|---------|
| `PowersheetGrid` | `spreadsheet-native/PowersheetGrid` | All 9 surfaces |
| `WorkSurfaceStatusBar` | `work-surface/WorkSurfaceStatusBar` | All 9 surfaces |
| `KeyboardHintBar` | `work-surface/KeyboardHintBar` | All 9 surfaces |
| `InspectorPanel` / `InspectorSection` / `InspectorField` | `work-surface/InspectorPanel` | All 9 surfaces |
| `InvoiceToPaymentFlow` | `golden-flows/InvoiceToPaymentFlow` | Invoices, Payments |
| `PayVendorModal` | `accounting/PayVendorModal` | Bills |
| `ReceivePaymentModal` | `accounting/ReceivePaymentModal` | Dashboard (unchanged) |
| `JournalEntryForm` | `accounting/JournalEntryForm` | General Ledger |
| `AccountSelector` | `accounting/AccountSelector` | General Ledger |
| `FiscalPeriodSelector` | `accounting/FiscalPeriodSelector` | General Ledger |
| `ClientCombobox` | `ui/client-combobox` | Invoices (Client Ledger sub-view) |
| `ConfirmDialog` | `ui/confirm-dialog` | Bills (void), Payments (void), GL (reverse) |
| `StatusBadge` | `accounting/StatusBadge` | Invoices, Bills |
| `AgingBadge` | `accounting/AgingBadge` | Invoices, Bills |
| `GLReversalStatus` / `InvoiceGLStatus` | `accounting/GLReversalStatus` | Invoices, GL |

---

## Components Retired

| Component | Lines | Replaced By |
|-----------|-------|-------------|
| `InvoicesPilotSurface` | 1,464 | InvoicesSurface |
| `InvoicesWorkSurface` | 1,308 | InvoicesSurface |
| `ClientLedgerPilotSurface` | 1,392 | InvoicesSurface (sub-view) |
| `ClientLedgerWorkSurface` | 1,225 | InvoicesSurface (sub-view) |
| `PaymentsPilotSurface` | 928 | PaymentsSurface |
| `PaymentInspector` | 398 | PaymentsSurface (inline inspector) |
| `InvoiceEditInspector` | 389 | InvoicesSurface (inline inspector) |
| Classic `Bills.tsx` | 543 | BillsSurface |
| Classic `Payments.tsx` | 337 | PaymentsSurface |
| Classic `GeneralLedger.tsx` | 561 | GeneralLedgerSurface |
| Classic `ChartOfAccounts.tsx` | 714 | ChartOfAccountsSurface |
| Classic `Expenses.tsx` | 421 | ExpensesSurface |
| Classic `BankAccounts.tsx` | 199 | BankAccountsSurface |
| Classic `BankTransactions.tsx` | 377 | BankTransactionsSurface |
| Classic `FiscalPeriods.tsx` | 678 | FiscalPeriodsSurface |
| `SheetModeToggle` usage in AccountingWorkspacePage | — | Removed entirely |

**Total classic/pilot code retired**: ~10,334 lines

---

## What Is NOT Changing

- **tRPC routers**: `accounting.*`, `invoices.*`, `clientLedger.*` — no server changes
- **Database schema**: No migrations
- **Dashboard layout**: Only density token changes, not structural
- **Golden flows**: InvoiceToPaymentFlow and OrderToInvoiceFlow preserved as-is
- **Other workspaces**: Sales, Inventory, Procurement, Calendar — untouched
- **PowersheetGrid / SpreadsheetPilotGrid**: No changes to the grid component itself
- **VIP Portal components**: AccountsReceivable, AccountsPayable — untouched

---

## Risk & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Client Ledger sub-view integration breaks running balance display | High | Preserve CRITICAL CONSTRAINT from ClientLedgerPilotSurface: running balance column must stay visible when inspector open. Flex layout ensures grid never hides. |
| Editable grids (Phase 3) introduce data integrity issues | Medium | Auto-save with debounce (2s). Undo/redo support. Validation on cell blur before mutation. Toast on save failure. |
| Retiring 10K+ lines of classic code loses edge-case handling | High | Audit each retired component's feature set against the new surface before deletion. Phase 1 validates the pattern before Phase 2-3 build on it. |
| Inspector animation feels janky on slower machines | Low | CSS transition on flex-basis. Fallback: instant show/hide if `prefers-reduced-motion`. |
| Fiscal Periods locking has irreversible consequences | Medium | Lock action requires confirmation dialog with explicit warning. Locked periods make all cells read-only. |

---

## Success Criteria

1. All 9 non-dashboard tabs render unified sheet-native surfaces (no SheetModeToggle anywhere)
2. Client Ledger is accessible from Invoices surface — selecting a client shows their ledger below the grid
3. Bills inspector shows vendor-level AP context (total owed, other open bills)
4. General Ledger Trial Balance is a collapsible support module, not a dialog
5. Chart of Accounts uses grouped grid with color-coded type headers
6. Phase 3 surfaces (Expenses, Bank Accounts, Bank Transactions, Fiscal Periods) have inline-editable grids with add-row capability
7. Dashboard density tokens match the new surfaces without layout changes
8. All existing workflows preserved: payment recording, void with reason, journal entry posting, fiscal period close/lock
9. All deep-link patterns preserved: `?invoiceId=`, `?billId=`, `?id=`, `?invoiceId=`, `?orderId=`
10. No regressions in: GL posting, AR/AP aging, overdue detection, payment progress tracking

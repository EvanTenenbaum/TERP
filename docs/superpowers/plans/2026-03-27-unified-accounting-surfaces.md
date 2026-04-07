# Unified Sheet-Native Accounting Surfaces — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all 9 non-dashboard accounting tabs with unified sheet-native surfaces, kill SheetModeToggle, merge Client Ledger into the Invoices surface as a sub-view, and apply density tokens to the Dashboard.

**Architecture:** Each surface follows the Grid + Collapsible Inspector pattern: Toolbar (title + KPI badges) → Action Bar (filters + actions) → PowersheetGrid + InspectorPanel → optional Support Modules → WorkSurfaceStatusBar. Read-only registries (Invoices, Bills, Payments, GL) create/mutate records via dialogs. Editable registries (Expenses, Bank Accounts, Bank Transactions, Fiscal Periods, Chart of Accounts) use inline cell editing with auto-save on blur. All data comes from existing `accounting.*`, `invoices.*`, `clientLedger.*` tRPC queries/mutations — no server changes.

**Tech Stack:** React 19, AG Grid (via PowersheetGrid), tRPC, Tailwind 4, shadcn/ui, Vitest, wouter

**Spec:** `docs/superpowers/specs/2026-03-27-unified-sheet-native-accounting-design.md`

---

## File Structure

### New Files

| File                                                                        | Responsibility                                                                                                                                                 |
| --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `client/src/components/spreadsheet-native/InvoicesSurface.tsx`              | Unified invoices registry + client ledger sub-view. Toolbar, action bar, grid, collapsible inspector, AR aging panel, client ledger sub-grid, sidecar dialogs. |
| `client/src/components/spreadsheet-native/InvoicesSurface.test.tsx`         | Unit tests — rendering, status filtering, inspector toggle, aging panel, client ledger population                                                              |
| `client/src/components/spreadsheet-native/BillsSurface.tsx`                 | AP registry — mirror of Invoices. Vendor AP context in inspector. AP aging panel.                                                                              |
| `client/src/components/spreadsheet-native/BillsSurface.test.tsx`            | Unit tests — rendering, vendor context, action enablement                                                                                                      |
| `client/src/components/spreadsheet-native/PaymentsSurface.tsx`              | Unified payment ledger — type filter (Received/Sent), color-coded amounts, invoice deep-links                                                                  |
| `client/src/components/spreadsheet-native/PaymentsSurface.test.tsx`         | Unit tests — rendering, type filter, amount color-coding                                                                                                       |
| `client/src/components/spreadsheet-native/GeneralLedgerSurface.tsx`         | Account-scoped GL browser with Trial Balance collapsible support module                                                                                        |
| `client/src/components/spreadsheet-native/GeneralLedgerSurface.test.tsx`    | Unit tests — account scoping, trial balance rendering                                                                                                          |
| `client/src/components/spreadsheet-native/ChartOfAccountsSurface.tsx`       | Grouped editable CoA grid with add-row and inline editing                                                                                                      |
| `client/src/components/spreadsheet-native/ChartOfAccountsSurface.test.tsx`  | Unit tests — row grouping, inline edit, add row                                                                                                                |
| `client/src/components/spreadsheet-native/ExpensesSurface.tsx`              | Editable expense registry with category filter                                                                                                                 |
| `client/src/components/spreadsheet-native/ExpensesSurface.test.tsx`         | Unit tests — inline edit, add row, reimbursable toggle                                                                                                         |
| `client/src/components/spreadsheet-native/BankAccountsSurface.tsx`          | Editable bank accounts registry                                                                                                                                |
| `client/src/components/spreadsheet-native/BankAccountsSurface.test.tsx`     | Unit tests — inline edit, active toggle                                                                                                                        |
| `client/src/components/spreadsheet-native/BankTransactionsSurface.tsx`      | Editable bank transactions with reconciliation toggle                                                                                                          |
| `client/src/components/spreadsheet-native/BankTransactionsSurface.test.tsx` | Unit tests — type filter, reconcile toggle, amount colors                                                                                                      |
| `client/src/components/spreadsheet-native/FiscalPeriodsSurface.tsx`         | Editable fiscal periods grouped by year with close/lock workflow                                                                                               |
| `client/src/components/spreadsheet-native/FiscalPeriodsSurface.test.tsx`    | Unit tests — grouped grid, close/lock actions, locked-period cell locking                                                                                      |

### Modified Files

| File                                                  | Change                                                                                                           |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `client/src/pages/AccountingWorkspacePage.tsx`        | Remove SheetModeToggle, pilot availability checks, classic surface imports. Wire all 9 new lazy-loaded surfaces. |
| `client/src/pages/accounting/AccountingDashboard.tsx` | Density token pass — tighter padding, smaller fonts, 6px radius                                                  |

---

## Key Types Reference

These are the real types from the codebase that tasks reference. Copied here so each task is self-contained.

### Invoices tRPC — list return shape

```typescript
// trpc.invoices.list.useQuery({ status?, clientId?, limit?, offset? })
{
  items: Array<{
    id: number;
    invoiceNumber: string | null;
    customerId: number | null;
    invoiceDate: Date | string | null;
    dueDate: Date | string | null;
    totalAmount: string | null;
    amountPaid: string | null;
    amountDue: string | null;
    status: string | null;
    version?: number | null;
    client?: { name?: string | null };
  }>;
  total: number;
  limit: number;
  offset: number;
}
```

### Invoices tRPC — summary return shape

```typescript
// trpc.invoices.getSummary.useQuery()
{
  byStatus: Array<{
    status: string;
    count: number;
    totalAmount: number;
    amountDue: number;
  }>;
  totals: {
    totalInvoices: number;
    totalAmount: number;
    totalOutstanding: number;
    overdueAmount: number;
  }
}
```

### Invoices tRPC — mutations

```typescript
// invoices.markSent — input: { id: number }
// invoices.void — input: { id: number; reason: string }
// invoices.checkOverdue — input: none; returns: { overdueCount: number }
// accounting.invoices.generateNumber — query, returns: { invoiceNumber: string }
// accounting.invoices.getARAging — query, returns: { current, days30, days60, days90, days90Plus: number }
```

### Bills tRPC

```typescript
// accounting.bills.list.useQuery({ vendorId?, status?, limit?, offset?, searchTerm? })
// Returns paginated { items: Bill[], total, limit, offset }
// Bill: { id, billNumber, vendorId, vendorName?, billDate, dueDate, totalAmount, amountPaid, amountDue, status }
// Status: "DRAFT" | "PENDING" | "APPROVED" | "PARTIAL" | "PAID" | "OVERDUE" | "VOID"

// accounting.bills.getById — input: { id: number }
// accounting.bills.updateStatus — input: { id: number; status: BillStatus }
// accounting.bills.getAPAging — query, returns: { current, days30, days60, days90, days90Plus: number }
```

### Payments tRPC

```typescript
// accounting.payments.list.useQuery({ paymentType?, limit?, offset? })
// Returns paginated { items: Payment[], total }
// Payment: { id, paymentNumber, paymentDate, paymentType, paymentMethod, amount, referenceNumber, invoiceId, notes }
// paymentType: "RECEIVED" | "SENT"
```

### Client Ledger tRPC

```typescript
// clientLedger.getLedger.useQuery({ clientId, startDate?, endDate?, transactionTypes?, limit?, offset? })
{
  clientId: number;
  clientName: string;
  currentBalance: number;
  balanceDescription: string;
  transactions: Array<{
    id: string;
    date: Date | string;
    type: string;
    description: string;
    referenceType?: string;
    referenceId?: number;
    debitAmount: number;
    creditAmount: number;
    runningBalance: number;
    createdBy: string;
  }>;
  totalCount: number;
  summary: {
    totalDebits: number;
    totalCredits: number;
    netChange: number;
  }
}

// clientLedger.addLedgerAdjustment — input: { clientId, transactionType: "CREDIT"|"DEBIT", amount, description, effectiveDate? }
// clientLedger.exportLedger — query, returns: { filename, content (CSV), mimeType }
```

### General Ledger tRPC

```typescript
// accounting.ledger.list.useQuery({ accountId?, startDate?, endDate?, fiscalPeriodId?, isPosted?, limit?, offset? })
// GL entry: { id, entryNumber, entryDate, accountId, debit, credit, description, fiscalPeriodId, isPosted, referenceType?, referenceId? }

// accounting.ledger.postJournalEntry — input: { entryDate, debitAccountId, creditAccountId, amount, description, fiscalPeriodId }
// accounting.ledger.getTrialBalance — input: { fiscalPeriodId }
// Returns: { accounts: [{ accountNumber, accountName, debit, credit }], totalDebits, totalCredits, isBalanced }
```

### Chart of Accounts tRPC

```typescript
// accounting.accounts.list.useQuery({ accountType?, isActive? })
// Returns paginated: { items: Account[], total }
// Account: { id, accountNumber, accountName, accountType, normalBalance, parentAccountId?, isActive, description? }
// accountType: "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE"

// accounting.accounts.create — input: { accountNumber, accountName, accountType, normalBalance, description?, parentAccountId?, isActive? }
// accounting.accounts.update — input: { id, accountName?, description?, isActive? }
```

### Expenses tRPC

```typescript
// accounting.expenses.list.useQuery({ categoryId?, limit?, offset? })
// Expense: { id, expenseNumber, expenseDate, description?, amount, isReimbursable, isReimbursed }

// accounting.expenses.create — input: { expenseNumber, expenseDate, categoryId, amount, totalAmount, paymentMethod, description?, isReimbursable? }
// accounting.expenses.update — input: { id, expenseDate?, categoryId?, amount?, description? }
// accounting.expenses.generateNumber — query, returns: { expenseNumber }
// accounting.expenses.getPendingReimbursements — query, returns expense array
// accounting.expenses.getBreakdownByCategory — query, returns: { categories: [{ categoryName, totalAmount }], total }
// accounting.expenseCategories.list — query, returns paginated categories
```

### Bank Accounts tRPC

```typescript
// accounting.bankAccounts.list.useQuery({ accountType?, isActive? })
// BankAccount: { id, accountName, accountNumber, accountType, bankName, currentBalance, isActive }

// accounting.bankAccounts.create — input: { accountName, accountType, accountNumber, bankName, currentBalance?, isActive? }
// accounting.bankAccounts.update — input: { id, accountName?, currentBalance?, isActive? }
// accounting.bankAccounts.getTotalCashBalance — query, returns: { totalBalance }
```

### Bank Transactions tRPC

```typescript
// accounting.bankTransactions.list.useQuery({ transactionType?, isReconciled?, limit?, offset? })
// BankTransaction: { id, transactionDate, transactionType, description?, referenceNumber?, amount, isReconciled }
// transactionType: "DEPOSIT" | "WITHDRAWAL" | "TRANSFER" | "FEE"

// accounting.bankTransactions.create — input: { bankAccountId, transactionDate, transactionType, amount, description?, referenceNumber? }
// accounting.bankTransactions.reconcile — input: { id }
```

### Fiscal Periods tRPC

```typescript
// accounting.fiscalPeriods.list.useQuery({ status?, year? })
// FiscalPeriod: { id, periodName, startDate, endDate, fiscalYear, status, createdAt }
// status: "OPEN" | "CLOSED" | "LOCKED"

// accounting.fiscalPeriods.create — input: { periodName, startDate, endDate, fiscalYear }
// accounting.fiscalPeriods.close — input: { id }
// accounting.fiscalPeriods.lock — input: { id }
// accounting.fiscalPeriods.getCurrent — query, returns current FiscalPeriod
```

### Shared Component Props

```typescript
// PowersheetGrid<Row>
{ surfaceId: string; requirementIds: string[]; affordances: PowersheetAffordance[];
  title: string; description?: string; rows: Row[]; columnDefs: ColDef<Row>[];
  getRowId: (row: Row) => string; selectedRowId?: string | null;
  onSelectedRowChange?: (row: Row | null) => void;
  selectionMode?: "single-row" | "cell-range"; enableFillHandle?: boolean; enableUndoRedo?: boolean;
  onCellValueChanged?: (event: CellValueChangedEvent<Row>) => void;
  stopEditingWhenCellsLoseFocus?: boolean;
  headerActions?: ReactNode; summary?: ReactNode;
  isLoading?: boolean; errorMessage?: string | null;
  emptyTitle: string; emptyDescription: string; minHeight?: number; }

// type PowersheetAffordance = { label: string; available: boolean }

// InspectorPanel
{ isOpen?: boolean; onClose: () => void; title?: string; subtitle?: string;
  children: ReactNode; width?: number | string; closeOnEsc?: boolean;
  headerActions?: ReactNode; footer?: ReactNode; }

// InspectorSection — { title?: string; children: ReactNode; collapsible?: boolean }
// InspectorField — { label: string; children: ReactNode }
// WorkSurfaceStatusBar — { left?: ReactNode; right?: ReactNode }
// KeyboardHintBar — { hints: Array<{ key: string; label: string }> }

// InvoiceToPaymentFlow — { invoiceId: number; open: boolean; onOpenChange: (open: boolean) => void; onPaymentRecorded?: (paymentId: number) => void }
// PayVendorModal — { open: boolean; onOpenChange: (open: boolean) => void; preselectedVendorId?: number; preselectedBillId?: number; onSuccess?: (result) => void }
// AccountSelector — { value?: number; onChange?: (accountId: number) => void; accountType?: AccountType }
// FiscalPeriodSelector — { value?: number; onChange?: (periodId: number) => void; status?: "OPEN"|"CLOSED"|"LOCKED" }
// JournalEntryForm — { onSubmit: (data) => void | Promise<void>; isSubmitting?: boolean }
```

---

## Phase 1: Core AR/AP Registries

### Task 1: InvoicesSurface — Tests

**Files:**

- Create: `client/src/components/spreadsheet-native/InvoicesSurface.test.tsx`

- [ ] **Step 1: Write the test file**

```tsx
// client/src/components/spreadsheet-native/InvoicesSurface.test.tsx
/**
 * @vitest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// ── Mock tRPC ──
const mockInvoicesList = vi.fn().mockReturnValue({
  data: {
    items: [
      {
        id: 1,
        invoiceNumber: "INV-001",
        customerId: 10,
        invoiceDate: "2026-03-15",
        dueDate: "2026-03-15",
        totalAmount: "4200.00",
        amountPaid: "0",
        amountDue: "4200.00",
        status: "OVERDUE",
        client: { name: "Green Leaf Co" },
      },
      {
        id: 2,
        invoiceNumber: "INV-002",
        customerId: 11,
        invoiceDate: "2026-03-18",
        dueDate: "2026-04-02",
        totalAmount: "1850.00",
        amountPaid: "1850.00",
        amountDue: "0",
        status: "PAID",
        client: { name: "Herbal Direct" },
      },
    ],
    total: 2,
    limit: 50,
    offset: 0,
  },
  isLoading: false,
  error: null,
});

vi.mock("@/lib/trpc", () => ({
  trpc: {
    invoices: {
      list: { useQuery: () => mockInvoicesList() },
      getSummary: {
        useQuery: () => ({
          data: {
            byStatus: [
              {
                status: "OVERDUE",
                count: 3,
                totalAmount: 12600,
                amountDue: 12600,
              },
            ],
            totals: {
              totalInvoices: 47,
              totalAmount: 86400,
              totalOutstanding: 24500,
              overdueAmount: 12600,
            },
          },
          isLoading: false,
        }),
      },
      markSent: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      void: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      checkOverdue: {
        useMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
      },
    },
    accounting: {
      invoices: {
        getARAging: {
          useQuery: () => ({
            data: {
              current: 12450,
              days30: 6800,
              days60: 3200,
              days90: 1500,
              days90Plus: 550,
            },
            isLoading: false,
          }),
        },
        generateNumber: {
          useQuery: () => ({ data: { invoiceNumber: "INV-048" } }),
        },
      },
    },
    clientLedger: {
      getLedger: {
        useQuery: () => ({ data: null, isLoading: false, error: null }),
      },
    },
    useUtils: () => ({
      invoices: {
        list: { invalidate: vi.fn() },
        getSummary: { invalidate: vi.fn() },
      },
      accounting: {
        payments: { list: { invalidate: vi.fn() } },
        invoices: { getARAging: { invalidate: vi.fn() } },
      },
      clientLedger: { getLedger: { invalidate: vi.fn() } },
    }),
  },
}));

vi.mock("wouter", () => ({ useSearch: () => "" }));
vi.mock("@/lib/spreadsheet-native", () => ({
  useSpreadsheetSelectionParam: () => ({
    selectedId: null,
    setSelectedId: vi.fn(),
  }),
}));
vi.mock("@/components/work-surface/invoiceDeepLink", () => ({
  parseInvoiceDeepLink: () => ({ statusFilter: null }),
}));
vi.mock("./PowersheetGrid", () => ({
  PowersheetGrid: ({ rows, title }: { rows: unknown[]; title: string }) => (
    <div data-testid={`grid-${title.replace(/\s/g, "-").toLowerCase()}`}>
      {rows.length} rows
    </div>
  ),
}));
vi.mock("@/components/work-surface/InspectorPanel", () => ({
  InspectorPanel: ({
    children,
    title,
  }: {
    children: React.ReactNode;
    title: string;
  }) => (
    <div data-testid="inspector">
      {title}
      {children}
    </div>
  ),
  InspectorSection: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  InspectorField: ({
    children,
    label,
  }: {
    children: React.ReactNode;
    label: string;
  }) => (
    <div>
      {label}: {children}
    </div>
  ),
}));
vi.mock("@/components/work-surface/WorkSurfaceStatusBar", () => ({
  WorkSurfaceStatusBar: ({ left }: { left: React.ReactNode }) => (
    <div data-testid="status-bar">{left}</div>
  ),
}));
vi.mock("@/components/work-surface/KeyboardHintBar", () => ({
  KeyboardHintBar: () => <div />,
}));
vi.mock("@/components/work-surface/golden-flows/InvoiceToPaymentFlow", () => ({
  InvoiceToPaymentFlow: () => null,
}));
vi.mock("@/components/accounting/GLReversalStatus", () => ({
  InvoiceGLStatus: () => <div />,
}));

import InvoicesSurface from "./InvoicesSurface";

describe("InvoicesSurface", () => {
  it("renders toolbar with KPI badges", () => {
    render(<InvoicesSurface />);
    expect(screen.getByText(/\$24,500/)).toBeInTheDocument();
    expect(screen.getByText(/3 overdue/)).toBeInTheDocument();
    expect(screen.getByText(/47 total/)).toBeInTheDocument();
  });

  it("renders all status filter tabs", () => {
    render(<InvoicesSurface />);
    for (const tab of [
      "All",
      "Draft",
      "Sent",
      "Viewed",
      "Partial",
      "Paid",
      "Overdue",
      "Void",
    ]) {
      expect(screen.getByRole("button", { name: tab })).toBeInTheDocument();
    }
  });

  it("renders workflow action buttons", () => {
    render(<InvoicesSurface />);
    expect(screen.getByText(/Create Invoice/)).toBeInTheDocument();
    expect(screen.getByText(/Mark Sent/)).toBeInTheDocument();
    expect(screen.getByText(/Record Payment/)).toBeInTheDocument();
  });

  it("renders invoices grid with data", () => {
    render(<InvoicesSurface />);
    expect(screen.getByTestId("grid-invoices-registry")).toHaveTextContent(
      "2 rows"
    );
  });

  it("renders AR Aging toggle", () => {
    render(<InvoicesSurface />);
    expect(screen.getByText(/AR Aging/)).toBeInTheDocument();
  });

  it("renders status bar", () => {
    render(<InvoicesSurface />);
    expect(screen.getByTestId("status-bar")).toBeInTheDocument();
  });

  it("disables Mark Sent and Record Payment when no row selected", () => {
    render(<InvoicesSurface />);
    expect(screen.getByText(/Mark Sent/).closest("button")).toBeDisabled();
    expect(screen.getByText(/Record Payment/).closest("button")).toBeDisabled();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test -- --run client/src/components/spreadsheet-native/InvoicesSurface.test.tsx`
Expected: FAIL — module `./InvoicesSurface` not found

---

### Task 2: InvoicesSurface — Implementation

**Files:**

- Create: `client/src/components/spreadsheet-native/InvoicesSurface.tsx`

This is the largest surface (~600-800 lines). It combines the invoices registry with an embedded client ledger sub-view. The implementation agent should use the existing `InvoicesPilotSurface.tsx` and `ClientLedgerPilotSurface.tsx` as primary references.

- [ ] **Step 1: Create InvoicesSurface.tsx**

The component must contain these sections in this order:

**1. Imports** — React hooks, AG Grid ColDef, wouter useSearch, sonner toast, date-fns (format, differenceInDays), lucide icons (FileText, Send, CreditCard, XCircle, Download, Printer, Plus, RefreshCw, Search, ChevronDown, ChevronUp), tRPC + inferRouterOutputs, shadcn components (Button, Input, Badge, Progress, Dialog, Textarea, Label), InspectorPanel + InspectorSection + InspectorField, WorkSurfaceStatusBar, KeyboardHintBar, InvoiceToPaymentFlow, InvoiceGLStatus, PowersheetGrid + PowersheetAffordance, PowersheetSelectionSummary, INVOICE_STATUS_TOKENS, cn, parseInvoiceDeepLink, useSpreadsheetSelectionParam

**2. Types** — Extract from tRPC: `InvoiceItem` (from invoices.list), `LedgerTransaction` (from clientLedger.getLedger). Define `StatusTab` union. Define `InvoiceGridRow` interface:

```typescript
interface InvoiceGridRow {
  rowKey: string;
  invoiceId: number;
  invoiceNumber: string;
  clientName: string;
  customerId: number;
  invoiceDate: string;
  dueDate: string;
  dueDateRaw: string;
  totalAmount: string;
  totalAmountFormatted: string;
  amountDue: string;
  amountDueFormatted: string;
  amountPaid: string;
  paymentPct: number;
  status: string;
  daysOverdue: number;
  version: number | null;
}
```

Define `LedgerGridRow` interface:

```typescript
interface LedgerGridRow {
  rowKey: string;
  date: string;
  type: string;
  description: string;
  referenceType: string | null;
  referenceId: number | null;
  debit: string;
  credit: string;
  balance: string;
  balanceNum: number;
}
```

**3. Constants** — `STATUS_TABS` array (ALL through VOID), `registryAffordances` (Select, Multi-select, Copy available; Paste, Fill, Edit disabled), `keyboardHints`, `PAGE_SIZE = 50`

**4. Helpers** — `fmtCurrency` (Intl.NumberFormat USD), `fmtDate` (date-fns format "MMM d, yyyy"), `getDaysOverdue` (differenceInDays), `mapInvoicesToGridRows` (with BUG-053 dedup by Set, BUG-054/055/057 amountDue clamping: PAID/VOID → $0, otherwise clamp to [0, totalAmount]), `mapLedgerToGridRows`

**5. Column defs** — `invoiceColumnDefs: ColDef<InvoiceGridRow>[]`:

- Invoice # (85px, locked mono)
- Client (110px flex, locked, blue underline cellRenderer)
- Date (70px, locked)
- Due (65px, locked, red cellStyle when OVERDUE)
- Total (75px, locked mono right)
- Due Amt (65px, locked mono right, red+bold cellStyle when >0)
- Status (55px, locked, color-coded badge cellRenderer matching INVOICE_STATUS_TOKENS)
- Days (50px, locked, valueFormatter showing "Nd" or "—")

And `ledgerColumnDefs: ColDef<LedgerGridRow>[]`:

- Date (70px, locked)
- Type (70px, locked, color badge cellRenderer)
- Description (flex, locked)
- Debit (75px, locked mono right)
- Credit (75px, locked mono right)
- Balance (80px, locked mono right bold, red cellStyle when >0)

**6. Component function** — `export default function InvoicesSurface()`:

State layers (follow existing pilot pattern):

1. Route parsing: `useSearch()` + `parseInvoiceDeepLink(routeSearch)`
2. Selection: `useSpreadsheetSelectionParam("invoiceId")`
3. Filters: `statusFilter` (StatusTab), `searchTerm`, `page`
4. UI toggles: `inspectorOpen`, `showAgingPanel` (localStorage "invoices-ar-aging"), `showLedger`, `ledgerPage`
5. Dialogs: `showPaymentDialog`, `showVoidDialog` + `voidReason`, `showCreateDialog`
6. Queries: `invoices.list` (with status/limit/offset), `invoices.getSummary`, `accounting.invoices.getARAging` (enabled: showAgingPanel), `accounting.invoices.generateNumber` (enabled: showCreateDialog), `clientLedger.getLedger` (enabled: selectedClientId && showLedger, with clientId/limit/offset)
7. Mutations: `invoices.markSent`, `invoices.void`, `invoices.checkOverdue`
8. Derived: `gridRows` (mapInvoicesToGridRows + searchTerm filter), `selectedRow` (find by invoiceId), KPI from summaryQuery, `ledgerRows`, `ledgerBalance`, `ledgerClientName`
9. Handlers: `handleRowSelect` (sets invoiceId + opens inspector), `handleCloseInspector`, `handleStatusFilterChange` (resets page+search), `handleToggleAging` (persists to localStorage), `handleMarkSent`, `handleVoidConfirm`, `handleRecordPayment`, `handlePaymentRecorded` (invalidates invoices + payments + ledger)
10. Action enablement: `canMarkSent` (status===DRAFT), `canVoid` (not VOID/PAID), `canRecordPayment` (not VOID/PAID)

**7. JSX return** — vertical flex layout:

```
<div className="flex flex-col h-full">
  {/* 1. Toolbar */}
  <div className="flex items-center gap-1.5 px-2 py-1 bg-muted/30 border-b">
    Title "Invoices" + 3 KPI Badges + flex-1 spacer + AR Aging toggle + search Input + refresh Button
  </div>

  {/* 2. Action Bar */}
  <div className="flex items-center gap-1 px-2 py-0.5 bg-muted/10 border-b">
    8 status tab Buttons + flex-1 spacer + Create/MarkSent/RecordPayment/Void/PDF/Print Buttons
  </div>

  {/* 3. Grid + Collapsible Inspector */}
  <div className="flex flex-1 min-h-0">
    <div className={cn("flex-1 min-w-0 transition-all", inspectorOpen && selectedRow && "flex-[3]")}>
      <PowersheetGrid ... />
    </div>
    {inspectorOpen && selectedRow && (
      <InspectorPanel isOpen onClose={handleCloseInspector} title={selectedRow.invoiceNumber} closeOnEsc width={320}>
        <InspectorSection title="Overview"> Client link, Date, Due </InspectorSection>
        <InspectorSection title="Amounts"> Total, Paid, Due, Progress bar </InspectorSection>
        <InspectorSection title="GL Status"> <InvoiceGLStatus /> </InspectorSection>
        <div> Quick action buttons </div>
      </InspectorPanel>
    )}
  </div>

  {/* 4. AR Aging Panel (collapsible) */}
  {showAgingPanel && <div className="mx-2 my-1.5 p-2 bg-amber-50/60 border border-amber-200 rounded-md">
    5-bucket grid: Current / 1-30 / 31-60 / 61-90 / 90+ with fmtCurrency values
  </div>}

  {/* 5. Client Ledger Sub-View (collapsible) */}
  {selectedClientId && showLedger && <div className="mx-2 mb-1.5 p-2 bg-blue-50/40 border border-blue-200 rounded-md">
    Header: ledgerClientName + balance badge + Adjustment/Export buttons + collapse toggle
    <PowersheetGrid surfaceId="invoices-client-ledger" rows={ledgerRows} columnDefs={ledgerColumnDefs} ... />
    Pagination: ledgerPage controls with [ ] shortcuts
  </div>}
  {selectedClientId && !showLedger && <collapsed bar with expand toggle>}

  {/* 6. Status Bar */}
  <WorkSurfaceStatusBar left={selection + filter + total + client context} right={<KeyboardHintBar />} />

  {/* 7. Sidecar Dialogs */}
  <InvoiceToPaymentFlow invoiceId={selectedInvoiceId!} open={showPaymentDialog} ... />
  <Dialog open={showVoidDialog}> Textarea for reason + Void button </Dialog>
  <Dialog open={showCreateDialog}> Client selector + due date + notes </Dialog>
</div>
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `pnpm test -- --run client/src/components/spreadsheet-native/InvoicesSurface.test.tsx`
Expected: PASS — all 7 tests green

- [ ] **Step 3: Type check**

Run: `pnpm check`
Expected: Zero errors

- [ ] **Step 4: Commit**

```bash
git add client/src/components/spreadsheet-native/InvoicesSurface.tsx client/src/components/spreadsheet-native/InvoicesSurface.test.tsx
git commit -m "feat(accounting): add InvoicesSurface — unified invoices + client ledger sub-view

Replaces InvoicesPilotSurface + InvoicesWorkSurface + ClientLedgerPilotSurface.
Layout: Toolbar + Action Bar + Grid + Collapsible Inspector + AR Aging + Client Ledger."
```

---

### Task 3: BillsSurface — Tests + Implementation

**Files:**

- Create: `client/src/components/spreadsheet-native/BillsSurface.test.tsx`
- Create: `client/src/components/spreadsheet-native/BillsSurface.tsx`

- [ ] **Step 1: Write BillsSurface.test.tsx**

```tsx
// client/src/components/spreadsheet-native/BillsSurface.test.tsx
/**
 * @vitest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/trpc", () => ({
  trpc: {
    accounting: {
      bills: {
        list: {
          useQuery: () => ({
            data: {
              items: [
                {
                  id: 1,
                  billNumber: "BILL-018",
                  vendorId: 5,
                  vendorName: "Alpine Growers",
                  billDate: "2026-03-10",
                  dueDate: "2026-03-25",
                  totalAmount: "8400.00",
                  amountPaid: "0",
                  amountDue: "8400.00",
                  status: "APPROVED",
                },
                {
                  id: 2,
                  billNumber: "BILL-019",
                  vendorId: 6,
                  vendorName: "Canopy Supply",
                  billDate: "2026-03-14",
                  dueDate: "2026-03-29",
                  totalAmount: "3200.00",
                  amountPaid: "0",
                  amountDue: "3200.00",
                  status: "DRAFT",
                },
              ],
              total: 31,
              limit: 50,
              offset: 0,
            },
            isLoading: false,
            error: null,
          }),
        },
        getById: { useQuery: () => ({ data: null }) },
        getAPAging: {
          useQuery: () => ({
            data: {
              current: 9800,
              days30: 5200,
              days60: 2400,
              days90: 800,
              days90Plus: 0,
            },
          }),
        },
        updateStatus: {
          useMutation: () => ({ mutate: vi.fn(), isPending: false }),
        },
      },
      arApDashboard: {
        getAPSummary: {
          useQuery: () => ({ data: { totalAP: 18200, billCount: 31 } }),
        },
        getOverdueBills: {
          useQuery: () => ({ data: { items: [], pagination: { total: 2 } } }),
        },
      },
    },
    useUtils: () => ({
      accounting: { bills: { list: { invalidate: vi.fn() } } },
    }),
  },
}));

vi.mock("wouter", () => ({ useSearch: () => "" }));
vi.mock("./PowersheetGrid", () => ({
  PowersheetGrid: ({ rows, title }: { rows: unknown[]; title: string }) => (
    <div data-testid={`grid-${title.replace(/\s/g, "-").toLowerCase()}`}>
      {rows.length} rows
    </div>
  ),
}));
vi.mock("@/components/work-surface/InspectorPanel", () => ({
  InspectorPanel: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="inspector">{children}</div>
  ),
  InspectorSection: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  InspectorField: ({
    children,
    label,
  }: {
    children: React.ReactNode;
    label: string;
  }) => (
    <div>
      {label}: {children}
    </div>
  ),
}));
vi.mock("@/components/work-surface/WorkSurfaceStatusBar", () => ({
  WorkSurfaceStatusBar: ({ left }: { left: React.ReactNode }) => (
    <div data-testid="status-bar">{left}</div>
  ),
}));
vi.mock("@/components/work-surface/KeyboardHintBar", () => ({
  KeyboardHintBar: () => <div />,
}));
vi.mock("@/components/accounting/PayVendorModal", () => ({
  PayVendorModal: () => null,
}));

import BillsSurface from "./BillsSurface";

describe("BillsSurface", () => {
  it("renders AP KPI badges", () => {
    render(<BillsSurface />);
    expect(screen.getByText(/\$18,200/)).toBeInTheDocument();
    expect(screen.getByText(/2 overdue/)).toBeInTheDocument();
    expect(screen.getByText(/31 total/)).toBeInTheDocument();
  });

  it("renders AP-specific status tabs", () => {
    render(<BillsSurface />);
    for (const tab of [
      "All",
      "Draft",
      "Submitted",
      "Approved",
      "Received",
      "Paid",
      "Overdue",
      "Void",
    ]) {
      expect(screen.getByRole("button", { name: tab })).toBeInTheDocument();
    }
  });

  it("renders Pay Vendor and Mark Received actions (no Create/Approve)", () => {
    render(<BillsSurface />);
    expect(screen.getByText(/Pay Vendor/)).toBeInTheDocument();
    expect(screen.getByText(/Mark Received/)).toBeInTheDocument();
    expect(screen.queryByText(/Create Bill/)).not.toBeInTheDocument();
    expect(screen.queryByText(/^Approve$/)).not.toBeInTheDocument();
  });

  it("renders bills grid", () => {
    render(<BillsSurface />);
    expect(screen.getByTestId("grid-bills-registry")).toHaveTextContent(
      "2 rows"
    );
  });

  it("renders AP Aging toggle", () => {
    render(<BillsSurface />);
    expect(screen.getByText(/AP Aging/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test -- --run client/src/components/spreadsheet-native/BillsSurface.test.tsx`
Expected: FAIL — module not found

- [ ] **Step 3: Implement BillsSurface.tsx**

Follows InvoicesSurface pattern. Key differences:

- **Status tabs**: ALL | DRAFT | SUBMITTED | APPROVED | RECEIVED | PAID | OVERDUE | VOID
- **Actions**: Pay Vendor (primary, amber), Mark Received, Void. No Create or Approve.
- **Grid columns**: Bill # (locked mono), Vendor (locked clickable blue), Date, Due (red if overdue), Total (mono right), Due Amt (mono right red+bold if >0), Status (color badge)
- **BillGridRow**: rowKey, billId, billNumber, vendorId, vendorName, billDate, dueDate, totalAmount, totalAmountFormatted, amountDue, amountDueFormatted, status
- **Inspector sections**:
  - "This Bill": Vendor (clickable link), Bill Date, Due (overdue indicator), Total, Paid, Due, Status badge, GL status
  - "Line Items": Compact list from `accounting.bills.getById(selectedBill.billId)`. Show `description × quantity — $lineTotal` per item.
  - "Vendor AP Context" (orange card `bg-amber-50 border-amber-200`): Total owed to vendor = sum of amountDue from all bills with same vendorId. Open bill count. List of other open bills (clickable to select row). Data: filter the same `bills.list` response by vendorId, exclude current bill, exclude PAID/VOID.
  - Quick actions: "Pay This Bill" (opens PayVendorModal with `preselectedBillId`), "Pay All Open" (opens PayVendorModal with `preselectedVendorId`)
- **Support module**: AP Aging (same 5-bucket pattern, red tone `bg-red-50/40 border-red-200`, from `accounting.bills.getAPAging`)
- **KPI**: $AP total from `arApDashboard.getAPSummary.totalAP`, overdue from `arApDashboard.getOverdueBills.pagination.total`, count from `arApDashboard.getAPSummary.billCount`
- **Sidecar**: `PayVendorModal` (import from `@/components/accounting/PayVendorModal`)

- [ ] **Step 4: Run tests**

Run: `pnpm test -- --run client/src/components/spreadsheet-native/BillsSurface.test.tsx`
Expected: PASS

- [ ] **Step 5: Type check**

Run: `pnpm check`

- [ ] **Step 6: Commit**

```bash
git add client/src/components/spreadsheet-native/BillsSurface.tsx client/src/components/spreadsheet-native/BillsSurface.test.tsx
git commit -m "feat(accounting): add BillsSurface — AP twin with vendor context

Vendor AP context in inspector shows total owed and other open bills.
Actions: Pay Vendor, Mark Received, Void. AP Aging panel."
```

---

### Task 4: PaymentsSurface — Tests + Implementation

**Files:**

- Create: `client/src/components/spreadsheet-native/PaymentsSurface.test.tsx`
- Create: `client/src/components/spreadsheet-native/PaymentsSurface.tsx`

- [ ] **Step 1: Write PaymentsSurface.test.tsx**

```tsx
// client/src/components/spreadsheet-native/PaymentsSurface.test.tsx
/**
 * @vitest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/trpc", () => ({
  trpc: {
    accounting: {
      payments: {
        list: {
          useQuery: () => ({
            data: {
              items: [
                {
                  id: 1,
                  paymentNumber: "PMT-RCV-042",
                  paymentDate: "2026-03-20",
                  paymentType: "RECEIVED",
                  paymentMethod: "WIRE",
                  amount: "1850.00",
                  referenceNumber: "WR-88412",
                  invoiceId: 2,
                  notes: "March payment",
                },
                {
                  id: 2,
                  paymentNumber: "PMT-SNT-019",
                  paymentDate: "2026-03-18",
                  paymentType: "SENT",
                  paymentMethod: "CHECK",
                  amount: "5600.00",
                  referenceNumber: "CHK-1042",
                  invoiceId: null,
                  notes: "",
                },
              ],
              total: 142,
              limit: 50,
              offset: 0,
            },
            isLoading: false,
            error: null,
          }),
        },
      },
    },
    useUtils: () => ({
      accounting: { payments: { list: { invalidate: vi.fn() } } },
      invoices: {
        list: { invalidate: vi.fn() },
        getSummary: { invalidate: vi.fn() },
      },
    }),
  },
}));

vi.mock("wouter", () => ({ useSearch: () => "" }));
vi.mock("./PowersheetGrid", () => ({
  PowersheetGrid: ({ rows, title }: { rows: unknown[]; title: string }) => (
    <div data-testid={`grid-${title.replace(/\s/g, "-").toLowerCase()}`}>
      {rows.length} rows
    </div>
  ),
}));
vi.mock("@/components/work-surface/InspectorPanel", () => ({
  InspectorPanel: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  InspectorSection: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  InspectorField: ({
    children,
    label,
  }: {
    children: React.ReactNode;
    label: string;
  }) => (
    <div>
      {label}: {children}
    </div>
  ),
}));
vi.mock("@/components/work-surface/WorkSurfaceStatusBar", () => ({
  WorkSurfaceStatusBar: ({ left }: { left: React.ReactNode }) => (
    <div data-testid="status-bar">{left}</div>
  ),
}));
vi.mock("@/components/work-surface/KeyboardHintBar", () => ({
  KeyboardHintBar: () => <div />,
}));
vi.mock("@/components/work-surface/golden-flows/InvoiceToPaymentFlow", () => ({
  InvoiceToPaymentFlow: () => null,
}));
vi.mock("@/hooks/usePermissions", () => ({ usePermissions: () => ({}) }));

import PaymentsSurface from "./PaymentsSurface";

describe("PaymentsSurface", () => {
  it("renders KPI badges with totals", () => {
    render(<PaymentsSurface />);
    expect(screen.getByText(/142 total/)).toBeInTheDocument();
  });

  it("renders type filter tabs", () => {
    render(<PaymentsSurface />);
    expect(screen.getByRole("button", { name: "All" })).toBeInTheDocument();
    expect(screen.getByText(/Received/)).toBeInTheDocument();
    expect(screen.getByText(/Sent/)).toBeInTheDocument();
  });

  it("renders Record Payment and Void actions", () => {
    render(<PaymentsSurface />);
    expect(screen.getByText(/Record Payment/)).toBeInTheDocument();
    expect(screen.getByText(/Void/)).toBeInTheDocument();
  });

  it("renders payments grid", () => {
    render(<PaymentsSurface />);
    expect(screen.getByTestId("grid-payments-registry")).toHaveTextContent(
      "2 rows"
    );
  });
});
```

- [ ] **Step 2: Run tests to verify failure, then implement PaymentsSurface.tsx**

Simplest Phase 1 surface. Key characteristics:

- **Filter tabs**: ALL | RECEIVED | SENT (3 tabs, not 8)
- **Actions**: Record Payment (opens InvoiceToPaymentFlow), Void
- **Grid columns**: Payment # (mono), Date, Type (RECEIVED green badge / SENT red badge), Method, Amount (mono right, green for received / red for sent via `cellStyle`), Invoice (mono, clickable — navigates to `?tab=invoices&invoiceId=N`), Reference (flex)
- **PaymentGridRow**: rowKey, id, paymentNumber, paymentDate, paymentType, paymentMethod, amount, amountFormatted, referenceNumber, invoiceId, notes
- **KPI**: Aggregated from gridRows: totalCount, totalReceived (sum where type=RECEIVED), totalSent (sum where type=SENT)
- **Inspector**: Type badge, Date, Amount (color-coded), Method, Reference, Invoice clickable link, Notes
- **No aging panel, no sub-view**
- **Deep-link**: manual URL parsing for `?id=`, `?invoiceId=` (same pattern as PaymentsPilotSurface)
- **Sidecar**: InvoiceToPaymentFlow, Void confirmation Dialog

- [ ] **Step 3: Run tests and type check**

Run: `pnpm test -- --run client/src/components/spreadsheet-native/PaymentsSurface.test.tsx && pnpm check`

- [ ] **Step 4: Commit**

```bash
git add client/src/components/spreadsheet-native/PaymentsSurface.tsx client/src/components/spreadsheet-native/PaymentsSurface.test.tsx
git commit -m "feat(accounting): add PaymentsSurface — unified payment ledger

Type filter (Received/Sent), color-coded amounts, invoice deep-links."
```

---

### Task 5: Wire Phase 1 into AccountingWorkspacePage

**Files:**

- Modify: `client/src/pages/AccountingWorkspacePage.tsx`

- [ ] **Step 1: Replace AccountingWorkspacePage**

Remove these imports:

- `SheetModeToggle`
- `useSpreadsheetPilotAvailability`, `useSpreadsheetSurfaceMode`, `buildSurfaceAvailability` from `@/lib/spreadsheet-native`
- `InvoicesWorkSurface` (direct import)
- `InvoicesPilotSurface` (lazy)
- `PaymentsPilotSurface` (lazy)

Remove these state variables:

- `pilotSurfaceSupported`, `sheetPilotEnabled`, `availabilityReady`, `surfaceMode`, `setSurfaceMode`

Remove `commandStrip` prop from `LinearWorkspaceShell`.

Add lazy imports:

```tsx
const InvoicesSurface = lazy(
  () => import("@/components/spreadsheet-native/InvoicesSurface")
);
const BillsSurface = lazy(
  () => import("@/components/spreadsheet-native/BillsSurface")
);
const PaymentsSurface = lazy(
  () => import("@/components/spreadsheet-native/PaymentsSurface")
);
```

Replace panels:

```tsx
<LinearWorkspacePanel value="invoices">
  <PilotSurfaceBoundary fallback={<div className="p-4 text-muted-foreground">Loading invoices...</div>}>
    <InvoicesSurface />
  </PilotSurfaceBoundary>
</LinearWorkspacePanel>
<LinearWorkspacePanel value="bills">
  <PilotSurfaceBoundary fallback={<div className="p-4 text-muted-foreground">Loading bills...</div>}>
    <BillsSurface />
  </PilotSurfaceBoundary>
</LinearWorkspacePanel>
<LinearWorkspacePanel value="payments">
  <PilotSurfaceBoundary fallback={<div className="p-4 text-muted-foreground">Loading payments...</div>}>
    <PaymentsSurface />
  </PilotSurfaceBoundary>
</LinearWorkspacePanel>
```

Keep Phase 2-3 tabs as classic imports for now.

- [ ] **Step 2: Verify**

Run: `pnpm check && pnpm lint && pnpm build`

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/AccountingWorkspacePage.tsx
git commit -m "feat(accounting): wire Phase 1 surfaces, kill SheetModeToggle

Invoices, Bills, Payments use unified surfaces. Removed: SheetModeToggle, surfaceMode, pilot availability."
```

---

## Phase 2: Ledger & Reports

### Task 6: GeneralLedgerSurface — Tests + Implementation

**Files:**

- Create: `client/src/components/spreadsheet-native/GeneralLedgerSurface.test.tsx`
- Create: `client/src/components/spreadsheet-native/GeneralLedgerSurface.tsx`

- [ ] **Step 1: Write tests**

Key assertions: Renders "General Ledger" title, account selector, fiscal period selector, Trial Balance toggle, Posted/Draft tabs, Post Journal Entry action, grid with data.

- [ ] **Step 2: Implement GeneralLedgerSurface**

Key characteristics:

- **Toolbar**: "General Ledger" + inline `AccountSelector` (value/onChange) + `FiscalPeriodSelector` (value/onChange) + date range (two date inputs or Popover calendar) + Trial Balance toggle + search + refresh
- **Action bar**: All/Posted/Draft tabs + right-aligned running balance display (`Balance: ${fmtCurrency(accountBalance)} DR/CR`) + Post Journal Entry / Reverse Entry / Export CSV buttons
- **Grid columns**: Entry # (mono), Date, Account (mono), Debit (mono right bold if non-zero), Credit (mono right red if non-zero), Description (flex), Status (POST/DRAFT badge)
- **GLEntryGridRow**: rowKey, entryId, entryNumber, entryDate, accountCode, debit, debitFormatted, credit, creditFormatted, description, isPosted, referenceType, referenceId
- **Inspector**: Entry detail + "Source Reference" section with clickable navigation cards (referenceType → icon + link). PAYMENT → `?tab=payments&id=N`, INVOICE → `?tab=invoices&invoiceId=N`, PURCHASE_ORDER → `/procurement?tab=purchase-orders&id=N`. Quick action: Reverse (for posted only).
- **Trial Balance support module**: collapsible (localStorage "gl-trial-balance"), blue tone. HTML table (not PowersheetGrid — simpler) with Account #, Name, Total Debit, Total Credit. Totals row. Balanced indicator (`✓ Balanced` green or `✗ Out of balance by $X` red). Export button. Current account row highlighted. Data from `accounting.ledger.getTrialBalance({ fiscalPeriodId })`.
- **Sidecar**: JournalEntryForm wrapped in Dialog, Reverse Entry confirmation Dialog
- **tRPC**: `accounting.ledger.list`, `accounting.ledger.getTrialBalance`, `accounting.ledger.postJournalEntry`

- [ ] **Step 3: Run tests and type check**

Run: `pnpm test -- --run client/src/components/spreadsheet-native/GeneralLedgerSurface.test.tsx && pnpm check`

- [ ] **Step 4: Commit**

```bash
git add client/src/components/spreadsheet-native/GeneralLedgerSurface.tsx client/src/components/spreadsheet-native/GeneralLedgerSurface.test.tsx
git commit -m "feat(accounting): add GeneralLedgerSurface with Trial Balance

Account-scoped entry browser. Reference navigation to source documents."
```

---

### Task 7: ChartOfAccountsSurface — Tests + Implementation

**Files:**

- Create: `client/src/components/spreadsheet-native/ChartOfAccountsSurface.test.tsx`
- Create: `client/src/components/spreadsheet-native/ChartOfAccountsSurface.tsx`

- [ ] **Step 1: Write tests**

Key assertions: Renders type filter tabs (All Types, Asset, Liability, Equity, Revenue, Expense), Add Row button, grid with grouped data.

- [ ] **Step 2: Implement ChartOfAccountsSurface**

First **editable** surface. Key characteristics:

- **Grid props**: `selectionMode: "cell-range"`, `enableFillHandle: true`, `enableUndoRedo: true`, `stopEditingWhenCellsLoseFocus: true`
- **Row grouping**: AG Grid `rowGroup: true` on accountType column. Color-coded group headers via custom CSS classes per type.
- **AccountGridRow**: id (number or string like `new-${Date.now()}`), accountNumber, accountName, accountType, normalBalance, isActive, description, isNew (boolean derived from id prefix)
- **Column defs** with dynamic `editable` callback:
  ```tsx
  {
    field: "accountNumber", headerName: "Acct #", minWidth: 80,
    editable: (params) => String(params.data?.id ?? "").startsWith("new-"),
    cellClass: (params) => String(params.data?.id ?? "").startsWith("new-")
      ? "powersheet-cell--editable font-mono" : "powersheet-cell--locked font-mono",
    singleClickEdit: true,
  }
  ```

  - Acct # — editable only for new rows, locked after creation
  - Account Name — always editable
  - Type — editable only for new rows (dropdown: ASSET/LIABILITY/EQUITY/REVENUE/EXPENSE)
  - Normal Balance — always editable (dropdown: DEBIT/CREDIT)
  - Active — always editable (checkbox)
- **Add Row**: `handleAddRow` creates temp row `{ id: \`new-${Date.now()}\`, accountNumber: "", accountName: "", accountType: "ASSET", normalBalance: "DEBIT", isActive: true, description: "" }`, appends to local rows state, scrolls grid to bottom
- **onCellValueChanged handler**:
  - For existing rows (id is number): call `accounting.accounts.update({ id, [field]: newValue })`, toast on success/error
  - For new rows (id starts with "new-"): check if required fields filled (accountNumber, accountName, accountType). If yes, call `accounting.accounts.create(...)`. On success, replace temp id with server id in local state. Toast.
- **Local rows state**: Initialize from `accounting.accounts.list` query data. Track edits locally, persist via mutations.
- **tRPC**: `accounting.accounts.list`, `accounting.accounts.create`, `accounting.accounts.update`

- [ ] **Step 3: Run tests and type check**

Run: `pnpm test -- --run client/src/components/spreadsheet-native/ChartOfAccountsSurface.test.tsx && pnpm check`

- [ ] **Step 4: Commit**

```bash
git add client/src/components/spreadsheet-native/ChartOfAccountsSurface.tsx client/src/components/spreadsheet-native/ChartOfAccountsSurface.test.tsx
git commit -m "feat(accounting): add ChartOfAccountsSurface — grouped editable grid

Row grouping by account type. Inline editing with auto-save on blur.
Add Row creates temp row, persists via accounts.create."
```

---

### Task 8: Wire Phase 2

**Files:**

- Modify: `client/src/pages/AccountingWorkspacePage.tsx`

- [ ] **Step 1: Add lazy imports for GL and CoA, replace panels, remove old imports**

```tsx
const GeneralLedgerSurface = lazy(
  () => import("@/components/spreadsheet-native/GeneralLedgerSurface")
);
const ChartOfAccountsSurface = lazy(
  () => import("@/components/spreadsheet-native/ChartOfAccountsSurface")
);
```

Remove `GeneralLedger` and `ChartOfAccounts` classic page imports.

- [ ] **Step 2: Verify and commit**

Run: `pnpm check && pnpm build`

```bash
git add client/src/pages/AccountingWorkspacePage.tsx
git commit -m "feat(accounting): wire Phase 2 — GL and CoA surfaces"
```

---

## Phase 3: Banking & Operational

All four surfaces follow the editable registry pattern established in Task 7 (ChartOfAccountsSurface).

### Task 9: ExpensesSurface — Tests + Implementation

**Files:**

- Create: `client/src/components/spreadsheet-native/ExpensesSurface.test.tsx`
- Create: `client/src/components/spreadsheet-native/ExpensesSurface.tsx`

- [ ] **Step 1: Write tests, implement, verify**

Editable registry. Key characteristics:

- **KPI badges**: `$total` (amber, from `expenses.getBreakdownByCategory.total`), `N entries` (blue, from list count), `N pending reimb.` (pink, from `expenses.getPendingReimbursements` length)
- **Action bar**: Category dropdown (from `expenseCategories.list`) + "Reimbursable only" checkbox toggle + Export CSV
- **Grid columns**: Expense # (locked, auto-gen), Date (editable), Description (editable), Category (editable dropdown), Amount (editable mono right), Reimbursable (editable checkbox), Reimbursed (editable checkbox)
- **Add Row**: Generate number via `accounting.expenses.generateNumber`, append row with default date = today
- **onCellValueChanged**: existing → `expenses.update`, new complete → `expenses.create`
- **tRPC**: `expenses.list`, `expenses.create`, `expenses.update`, `expenses.generateNumber`, `expenses.getPendingReimbursements`, `expenses.getBreakdownByCategory`, `expenseCategories.list`

- [ ] **Step 2: Commit**

```bash
git add client/src/components/spreadsheet-native/ExpensesSurface.tsx client/src/components/spreadsheet-native/ExpensesSurface.test.tsx
git commit -m "feat(accounting): add ExpensesSurface — editable expense registry"
```

---

### Task 10: BankAccountsSurface — Tests + Implementation

**Files:**

- Create: `client/src/components/spreadsheet-native/BankAccountsSurface.test.tsx`
- Create: `client/src/components/spreadsheet-native/BankAccountsSurface.tsx`

- [ ] **Step 1: Write tests, implement, verify**

Simplest editable surface.

- **KPI badges**: `$total cash` (green, from `bankAccounts.getTotalCashBalance.totalBalance`), `N accounts` (blue), `N active` (green)
- **Action bar**: Type filter dropdown (Checking/Savings/Credit Card/Money Market)
- **Grid columns**: Account Name (editable), Account # (editable mono), Bank Name (editable), Type (editable dropdown), Balance (editable mono right), Active (editable checkbox)
- **tRPC**: `bankAccounts.list`, `bankAccounts.create`, `bankAccounts.update`, `bankAccounts.getTotalCashBalance`

- [ ] **Step 2: Commit**

```bash
git add client/src/components/spreadsheet-native/BankAccountsSurface.tsx client/src/components/spreadsheet-native/BankAccountsSurface.test.tsx
git commit -m "feat(accounting): add BankAccountsSurface — editable bank accounts"
```

---

### Task 11: BankTransactionsSurface — Tests + Implementation

**Files:**

- Create: `client/src/components/spreadsheet-native/BankTransactionsSurface.test.tsx`
- Create: `client/src/components/spreadsheet-native/BankTransactionsSurface.tsx`

- [ ] **Step 1: Write tests, implement, verify**

Editable registry.

- **KPI badges**: `$deposits` (green), `$withdrawals` (red), `N unreconciled` (amber) — all aggregated from gridRows
- **Action bar**: Type filter tabs (All/Deposit/Withdrawal/Transfer/Fee) + Reconciled/Unreconciled toggle + "Toggle Reconciled" action + Export CSV
- **Grid columns**: Date (editable), Type (editable dropdown with badge rendering), Description (editable), Reference # (editable mono), Amount (editable mono right, green for DEPOSIT, red for WITHDRAWAL via `cellStyle`), Reconciled (editable checkbox)
- **"Toggle Reconciled" action**: Calls `bankTransactions.reconcile({ id })` on selected row
- **tRPC**: `bankTransactions.list`, `bankTransactions.create`, `bankTransactions.reconcile`

- [ ] **Step 2: Commit**

```bash
git add client/src/components/spreadsheet-native/BankTransactionsSurface.tsx client/src/components/spreadsheet-native/BankTransactionsSurface.test.tsx
git commit -m "feat(accounting): add BankTransactionsSurface — editable with reconciliation"
```

---

### Task 12: FiscalPeriodsSurface — Tests + Implementation

**Files:**

- Create: `client/src/components/spreadsheet-native/FiscalPeriodsSurface.test.tsx`
- Create: `client/src/components/spreadsheet-native/FiscalPeriodsSurface.tsx`

- [ ] **Step 1: Write tests, implement, verify**

Editable registry with row grouping and status-dependent cell locking.

- **KPI badges**: `N periods` (blue), current open period name (green, from `fiscalPeriods.getCurrent`)
- **Action bar**: Status filter (All/Open/Closed/Locked) + Close Period + Lock Period
- **Row grouping**: by `fiscalYear` (AG Grid rowGroup)
- **Grid columns**: Period Name (editable for OPEN only), Fiscal Year (editable for OPEN only), Start Date (editable for OPEN only), End Date (editable for OPEN only), Status (always locked, badge: OPEN green / CLOSED amber / LOCKED red)
- **Dynamic editable**: `(params) => params.data?.status === "OPEN"`. Closed/Locked periods → all cells get `powersheet-cell--locked`.
- **Close Period**: Button enabled when selected row status === "OPEN". Opens ConfirmDialog → calls `fiscalPeriods.close({ id })`
- **Lock Period**: Button enabled when selected row status === "CLOSED". Opens ConfirmDialog with warning "Locking a fiscal period cannot be undone" → calls `fiscalPeriods.lock({ id })`
- **tRPC**: `fiscalPeriods.list`, `fiscalPeriods.create`, `fiscalPeriods.close`, `fiscalPeriods.lock`, `fiscalPeriods.getCurrent`

- [ ] **Step 2: Commit**

```bash
git add client/src/components/spreadsheet-native/FiscalPeriodsSurface.tsx client/src/components/spreadsheet-native/FiscalPeriodsSurface.test.tsx
git commit -m "feat(accounting): add FiscalPeriodsSurface — grouped with close/lock workflow"
```

---

### Task 13: Wire Phase 3

**Files:**

- Modify: `client/src/pages/AccountingWorkspacePage.tsx`

- [ ] **Step 1: Add lazy imports for all 4 Phase 3 surfaces, replace panels, remove classic imports**

```tsx
const ExpensesSurface = lazy(
  () => import("@/components/spreadsheet-native/ExpensesSurface")
);
const BankAccountsSurface = lazy(
  () => import("@/components/spreadsheet-native/BankAccountsSurface")
);
const BankTransactionsSurface = lazy(
  () => import("@/components/spreadsheet-native/BankTransactionsSurface")
);
const FiscalPeriodsSurface = lazy(
  () => import("@/components/spreadsheet-native/FiscalPeriodsSurface")
);
```

Remove classic page imports: `Expenses`, `BankAccounts`, `BankTransactions`, `FiscalPeriods`.

Final AccountingWorkspacePage should import only: `AccountingDashboard` (direct), 9 lazy surfaces, `LinearWorkspaceShell/Panel`, `PilotSurfaceBoundary`, workspace config/hooks. No SheetModeToggle. No surfaceMode.

- [ ] **Step 2: Full verification**

Run: `pnpm check && pnpm lint && pnpm test && pnpm build`

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/AccountingWorkspacePage.tsx
git commit -m "feat(accounting): wire Phase 3 — all 9 tabs now unified sheet-native

All classic page imports removed. Every non-dashboard tab uses a unified surface."
```

---

## Phase 4: Dashboard Styling Pass

### Task 14: Dashboard Density Tokens

**Files:**

- Modify: `client/src/pages/accounting/AccountingDashboard.tsx`

- [ ] **Step 1: Apply density token replacements**

No layout changes — only CSS class swaps:

| Find                        | Replace      | Context             |
| --------------------------- | ------------ | ------------------- |
| `rounded-xl`                | `rounded-md` | Card borders        |
| `rounded-lg`                | `rounded`    | Buttons             |
| `p-4`                       | `p-2.5`      | CardContent padding |
| `p-6`                       | `p-3`        | Outer container     |
| `gap-4`                     | `gap-2`      | Grid gaps           |
| `gap-6`                     | `gap-3`      | Section gaps        |
| `text-3xl`                  | `text-xl`    | Page title          |
| `text-2xl`                  | `text-lg`    | KPI values          |
| `text-xl`                   | `text-sm`    | Card titles         |
| `space-y-2`                 | `space-y-1`  | Header spacing      |
| `mt-1` (after descriptions) | `mt-0.5`     | Description margin  |

Do NOT change: layout structure, quick action card positions, color scheme (green "Start here", amber "Pay supplier"), AR/AP totals logic, overdue tables, navigation buttons, modal triggers.

- [ ] **Step 2: Verify**

Run: `pnpm check && pnpm build`

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/accounting/AccountingDashboard.tsx
git commit -m "style(accounting): Dashboard density pass — match unified surfaces

Applied: 6px radius, 10px padding, 16px data, 9-11px labels. No layout changes."
```

---

## Phase 5: Cleanup

### Task 15: Remove Retired Components

- [ ] **Step 1: Verify no remaining references**

```bash
grep -r "InvoicesPilotSurface\|InvoicesWorkSurface\|ClientLedgerPilotSurface\|ClientLedgerWorkSurface\|PaymentsPilotSurface\|InvoiceEditInspector\|PaymentInspector" client/src/ --include="*.tsx" --include="*.ts" -l
```

Expected: Only the files themselves (no external references). If any external references exist, fix them first.

- [ ] **Step 2: Delete retired files**

```bash
git rm client/src/components/spreadsheet-native/InvoicesPilotSurface.tsx
git rm client/src/components/spreadsheet-native/PaymentsPilotSurface.tsx
git rm client/src/components/spreadsheet-native/ClientLedgerPilotSurface.tsx
git rm client/src/components/work-surface/InvoicesWorkSurface.tsx
git rm client/src/components/work-surface/ClientLedgerWorkSurface.tsx
git rm client/src/components/work-surface/InvoiceEditInspector.tsx
git rm client/src/components/work-surface/PaymentInspector.tsx
```

- [ ] **Step 3: Full verification**

Run: `pnpm check && pnpm lint && pnpm test && pnpm build`

- [ ] **Step 4: Commit**

```bash
git commit -m "chore(accounting): retire classic and pilot surfaces — ~10K lines removed

Retired: InvoicesPilotSurface, InvoicesWorkSurface, ClientLedgerPilotSurface,
ClientLedgerWorkSurface, PaymentsPilotSurface, InvoiceEditInspector, PaymentInspector."
```

---

## Final Verification Checklist

- [ ] All 9 non-dashboard tabs render unified sheet-native surfaces
- [ ] No SheetModeToggle anywhere in AccountingWorkspacePage
- [ ] Client Ledger accessible from Invoices surface — selecting a row shows client ledger below
- [ ] Bills inspector shows vendor AP context (total owed, other open bills from same vendor)
- [ ] GL Trial Balance renders as collapsible support module (not a dialog)
- [ ] Chart of Accounts uses grouped grid with color-coded type headers
- [ ] Editable grids (Expenses, Bank Accounts, Bank Txns, Fiscal Periods, CoA) support inline editing + add row
- [ ] Fiscal Periods: Closed/Locked periods have all cells locked
- [ ] Dashboard density matches new surfaces without layout changes
- [ ] Deep-links: `?invoiceId=`, `?id=` on payments, tab switching all work
- [ ] Golden flows: InvoiceToPaymentFlow, PayVendorModal work correctly
- [ ] `pnpm check && pnpm lint && pnpm test && pnpm build` all pass

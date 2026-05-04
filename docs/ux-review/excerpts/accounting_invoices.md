# Baseline excerpt for `AccountingWorkspace.invoices`

**Route:** `/accounting?tab=invoices` — Depth: **full**

## From FUNCTIONAL_BASELINE.md

### Page: `AccountingWorkspacePage`

* **Route:** `/accounting`.
* **Access:** All authenticated users; some sub-features gate on permissions (e.g., creating bills, recording payments, GL journal entries).
* **Shell:** `LinearWorkspaceShell` with 10 tabs.
* **Tabs:**
  * **Dashboard** (`AccountingDashboard` embedded) — overdue AR/AP alerts, `PayVendorModal`, `ReconciliationSummary`, `DataCardSection` KPIs, GL reversal viewer, links to invoices/bills/payments/expenses.
  * **Invoices** (`InvoicesSurface` lazy sheet-native) — list, filter, edit, send, mark paid, record payment, void, client-ledger drill-down, GL reversal.
  * **Bills** (`BillsSurface` lazy) — list, create, bill detail sheet with `BillStatusActions` state machine (Draft → Pending → Paid / Voided), status timeline.
  * **Payments** (`PaymentsSurface` lazy) — list payments, filter by type/date/amount/number.
  * **General Ledger** (`GeneralLedgerSurface` lazy) — browse ledger entries, create journal entries (`JournalEntryForm`), date range, period selector.
  * **Chart of Accounts** (`ChartOfAccountsSurface` lazy) — CRUD accounts, hierarchy, activate/deactivate.
  * **Expenses** (`ExpensesSurface` lazy) — list/create expenses, assign categories, mark reimbursable/reimbursed.
  * **Bank Accounts** (`BankAccountsSurface` lazy) — CRUD bank accounts, total cash balance.
  * **Bank Transactions** (`BankTransactionsSurface` lazy) — list transactions, filter, reconcile flag.
  * **Fiscal Periods** (`FiscalPeriodsSurface` lazy) — open/close periods with date pickers.
* **Auxiliary route:** `/accounting/cash-locations` → `CashLocations` (multi-location cash register, shift audits, transfers, ledger history).

---

## Runtime supplement (if any)

(no runtime supplement match)

# Baseline excerpt for `Payments`

**Route:** `/accounting?tab=payments` — Depth: **lightweight**

## From FUNCTIONAL_BASELINE.md

### Page: `Payments` (accounting)

* **Route:** Embedded in `/accounting?tab=payments`.
* **Features:** Filterable table (`paymentDate`/`amount`/`paymentType`/`paymentNumber`); deep-link via `?paymentId=`, `?invoiceId=`, `?orderId=`; status badges; detail drawer.

---

## Runtime supplement (if any)

- **Dashboard** (default)
- **Invoices**
- **Bills**
- **Payments**
- **General Ledger**
- **Chart of Accounts**
- **Expenses**
- **Bank Accounts**
- **Bank Transactions**
- **Fiscal Periods**

**KPI strip:**
- **Receivables** `$963,103.66` — "371 overdue invoices ready for follow-up"
- **Payables** `$1,088,665.07` — "27 overdue bills need attention"
- **Queue pressure** `15` — "Recent invoices, bills, and payments currently visible in the dashboard."
- **Reconciliation State · Accounting Reconciliation Summary:**
  - Outstanding Invoices `41` · $963,103.66 total receivables
  - Unrecorded Payments `4` · AR: 2 ($83,543.00) · AP: 2 ($5,800.00)
  - Last Reconciled `Never`
  - "4 items need attention · 2 AR payments without matching invoices · 2 AP payments without matching bills"

Header "**Payments · 283 total · $4,973,788 received · $5,800 sent**" · filter chips `All · Received · Sent` · actions `Record Payment · Void`. Section "Payments Registry · Read-only payment transaction ledger. Select a row to see details and take actions. · 283 payments visible".

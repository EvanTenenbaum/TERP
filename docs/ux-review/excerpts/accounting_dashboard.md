# Baseline excerpt for `AccountingDashboard`

**Route:** `/accounting?tab=dashboard` — Depth: **full**

## From FUNCTIONAL_BASELINE.md

### Page: `AccountingDashboard`

* **Route:** Embedded in `/accounting?tab=dashboard`.
* **Content:** KPI data-cards, overdue AR/AP lists (auto-alerts when >25 overdue), `PayVendorModal`, `ReconciliationSummary`, `GLReversalViewer`, permission-gated actions (record payment, reverse GL, pay vendor).
* **tRPC:** `accounting.*`, `payments.*`, `invoices.*`, `bills.*`, `vendorPayables.*`.

---

## Runtime supplement (if any)

(no runtime supplement match)

# Baseline excerpt for `DashboardHomePage`

**Route:** `/` — Depth: **full**

## From FUNCTIONAL_BASELINE.md

### Page: `DashboardHomePage` (Owner Command Center)

* **Route:** `/`, `/dashboard`
* **Access:** All authenticated users.
* **Purpose:** Single-screen daily pulse for the owner — today's KPIs, appointments, cash decisions, debt, vendor payables, inventory health.
* **Layout:** Five vertical rows, each wrapped in `ComponentErrorBoundary`:
  1. Header: OWNER COMMAND CENTER badge, today's date, "Live · Updated HH:MM" freshness badge.
  2. **Operational KPIs** (`OperationalKpisWidget`) — orders today, cash, inventory headline KPIs (TER-1055).
  3. Daily pulse row: `OwnerQuickCardsWidget` · `OwnerAppointmentsWidget` · `OwnerCashDecisionPanel`.
  4. Money row: `OwnerDebtPositionWidget` (AR summary) · `OwnerVendorsNeedPaymentWidget`.
  5. Inventory row: `InventorySnapshotWidget` · `AgingInventoryWidget`.
  6. `OwnerSkuStatusBrowserWidget` (collapsed by default).
* **User actions:** Drill-through links from each widget (click a KPI → filtered workspace, click an invoice → AR tab, etc.). No inline mutations.
* **States:** Every widget individually handles loading/empty/error with its own boundary (so a single failure does not poison the page).

---

## Runtime supplement (if any)

(no runtime supplement match)

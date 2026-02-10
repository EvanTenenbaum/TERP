# MEET Widget Reuse Execution Plan (No Net-New Widget Build)

Date: 2026-02-10
Owner: Product + Engineering
Interview Source: Jan 29, 2026 customer meeting
Scope Constraint: Get as close as possible to customer needs by reusing existing dashboard widgets and existing APIs. Avoid building whole new features unless a hard gap remains.

## Why This Plan

The codebase already has most of the needed building blocks. The main gap is default experience and clarity, not missing widget count.

## Reuse Rules (Non-Negotiable)

1. Do not add a new dashboard widget if an existing widget can be extended.
2. Keep existing endpoints and response shapes unless a field is truly missing.
3. Make owner workflow visible by default; do not hide critical widgets behind customization.
4. Use plain language in titles and descriptions.
5. Every visible card must deep-link to an action page.

## Interview Need -> Current Widget Mapping

## 1) "What is about to go bad?"

- Current widget: `AgingInventoryWidget`
- Current API: `inventory.getAgingSummary`
- Status: Mostly covered
- Required changes:
  - Keep visible by default in operations preset
  - Show oldest-item value inline
  - Keep "View All" drilldown to inventory aging filters

## 2) "What am I low on / what do I have too much of?"

- Current widgets: `InventorySnapshotWidget`, `AgingInventoryWidget`
- Current APIs: `dashboard.getInventorySnapshot`, `inventory.getEnhanced`
- Status: Partially covered
- Required changes:
  - Keep `InventorySnapshotWidget` first in layout
  - Remove misleading expand affordance
  - Use existing inventory drilldown by category

## 3) "Who needs to be paid now?"

- Current widgets: `ClientDebtLeaderboard`, `AvailableCashWidget`, `TotalDebtWidget`
- Current APIs: `dashboard.getVendorsNeedingPayment`, `cashAudit.getCashDashboard`, `dashboard.getTotalDebt`
- Status: Covered in current branch
- Required changes:
  - Aggregate unpaid sold-out payables by vendor
  - Keep cash and debt cards visible by default
  - Keep direct links to bills/payables

## 4) "What am I going to lose money on?"

- Current widgets: `AgingInventoryWidget`, `TotalDebtWidget`
- Current APIs: `inventory.getAgingSummary`, `dashboard.getTotalDebt`
- Status: Covered for first-pass triage
- Required changes:
  - Keep aging inventory visible by default
  - Keep debt position visible by default for AR/AP context

## 5) "What should I look at first right now?"

- Current widget: `TransactionSnapshotWidget` (reused as "Quick Cards")
- Current APIs: `dashboard.getTransactionSnapshot`, `inbox.getMyItems`, `inbox.getStats`
- Status: Covered in current branch
- Required changes:
  - Keep card visible by default in operations preset
  - Keep inbox detail view behind one-click deep link

## Updated MEET Task Definitions (Reuse-First)

## MEET-002 (Refined): Owner dashboard composition using existing cards

- Build mode: Reconfigure existing widgets + minor copy/interaction changes
- No new widget required

## MEET-004 (Refined): Payables visibility through existing financial cards

- Build mode: Extend current payables signals inside existing cash/debt surfaces
- No new widget required unless due/overdue cannot fit clearly

## MEET-006 (Refined): Cash decision clarity in existing cash card

- Build mode: Improve card labeling and formula clarity only

## MEET-008 (Refined): Debt warning via existing debt + client surfaces

- Build mode: First pass uses current debt widgets and client list
- New policy/override workflow is phase 2 only if still needed

## MEET-020 (Refined): Simplify language and defaults before adding controls

- Build mode: copy + metadata + ordering changes first

## MEET-026 (Refined): No dashboard redesign dependency

- Build mode: backend/UI permission task; independent of widget creation

## MEET-029 (Refined): Keep as-is (preference feature)

- Build mode: user preference work; no dashboard widget work required

## MEET-031 (Refined): Reuse inventory filters before new UX

- Build mode: tighten existing inventory filter defaults and presets

## Delivery Order (Fastest Path)

1. Preset and copy pass
2. Vendor payables risk aggregation fix
3. Aging + inventory clarity tweaks
4. Quick cards composition (transactions + inbox)
5. Validate owner workflow before any net-new widget

## Backend Wiring Confirmation (Current Branch)

| Card                         | Endpoint(s)                                                              | Real Data Source                                             | Build Delta                | Confidence |
| ---------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------ | -------------------------- | ---------- |
| Inventory Snapshot           | `dashboard.getInventorySnapshot`                                         | `inventoryDb.getDashboardStats`                              | already wired              | High       |
| Inventory Aging              | `inventory.getAgingSummary`                                              | inventory aging service                                      | already wired              | High       |
| Cash Decision Panel          | `cashAudit.getCashDashboard`                                             | cash locations + payable summary                             | already wired              | High       |
| Debt Position                | `dashboard.getTotalDebt`                                                 | AR/AP outstanding totals                                     | already wired              | High       |
| Vendors Who Need To Get Paid | `dashboard.getVendorsNeedingPayment`                                     | `payablesService.listPayables` with sold-out + unpaid filter | implemented in this branch | High       |
| Quick Cards                  | `dashboard.getTransactionSnapshot`, `inbox.getMyItems`, `inbox.getStats` | invoices/payments + inbox items                              | implemented in this branch | High       |

# TERP Dashboard Refresh - Low Blast Radius Execution Plan

Date: 2026-03-04

Inputs incorporated:

- `/Users/evan/Downloads/files 2/TERP_DASHBOARD_WIDGETS.md`
- `/Users/evan/Downloads/files 2/TERP_DASHBOARD_DESIGN_PATTERNS.md`
- `/Users/evan/Downloads/files 2/TERP_DASHBOARD_IMPLEMENTATION.md`

This plan aligns those docs with existing TERP guardrails:

- maximize impact with minimal change
- preserve existing functionality
- avoid schema/migration work
- avoid broad cross-app regressions
- keep test scope targeted and high-signal

## 1) Hard Constraints (Non-Negotiable)

1. No new tables, no schema changes, no migrations.
2. Reuse existing routers/endpoints first.
3. Prefer copy/text/layout changes over renames/moves.
4. Ship behind existing feature boundary (`owner-command-center-dashboard`) before touching global defaults.
5. Test only changed paths (component + one smoke E2E), not broad suites.

## 2) Current Reality (Code-Grounded)

Existing dashboard split:

- `client/src/pages/DashboardHomePage.tsx` toggles between:
  - `DashboardV3`
  - `OwnerCommandCenterDashboard`

Existing reusable widgets already matching requested outcomes:

- Available cash: `client/src/components/dashboard/widgets-v2/AvailableCashWidget.tsx`
- Aging inventory: `client/src/components/dashboard/widgets-v2/AgingInventoryWidget.tsx`
- Inventory snapshot: `client/src/components/dashboard/widgets-v2/InventorySnapshotWidget.tsx`
- Who owes me data source: `client/src/components/dashboard/widgets-v2/ClientDebtLeaderboard.tsx`
- Who I owe data source: `client/src/components/dashboard/owner/OwnerVendorsNeedPaymentWidget.tsx`

Existing backend endpoints (no schema needed):

- `trpc.cashAudit.getCashDashboard`
- `trpc.inventory.getAgingSummary`
- `trpc.dashboard.getInventorySnapshot`
- `trpc.dashboard.getClientDebt`
- `trpc.dashboard.getVendorsNeedingPayment`
- Existing appointments source: `trpc.scheduling.getTodaysAppointments` (already in use by scheduling UI)

## 3) Incorporation Matrix (Adopt / Adapt / Defer)

## A) TERP_DASHBOARD_WIDGETS.md

Adopt now:

- Plain-language labels/titles for debt/payables widgets.
- Keep Aging Inventory as-is.
- Use existing cash widget as primary.

Adapt for low blast:

- Do not rename component/file symbols (`ClientDebtLeaderboard`, `OwnerVendorsNeedPaymentWidget`, etc.).
- Change display titles and subtitles only.
- Build `AppointmentsWidget` using existing `scheduling.getTodaysAppointments` (no new endpoint in `appointmentRequests` router).
- Build `SKUStatusBrowserWidget` against existing `inventory.getEnhanced` (supports `search` + `status[]`), not `inventory.list`.

Defer:

- Internal component/file renames (unnecessary churn).
- Any new router purely for parity wording.

## B) TERP_DASHBOARD_DESIGN_PATTERNS.md

Adopt now:

- Card/skeleton/empty-state/clickable-row patterns.
- 60s refresh where useful.
- mobile-first spacing and 44x44 touch targets.
- ARIA labels and keyboard access patterns.

Adapt:

- Reuse existing TERP widget style conventions already in `widgets-v2`; do not restyle globally.

Defer:

- Virtualization unless SKU widget proves slow in real data.

## C) TERP_DASHBOARD_IMPLEMENTATION.md

Adopt now:

- Reuse-first strategy.
- Unified action-oriented owner command center composition.
- Plain-language terminology.

Adapt for minimal blast:

- Do not remove `DashboardV3` path yet.
- Upgrade `OwnerCommandCenterDashboard` first under existing feature flag.
- Postpone “single universal dashboard” cutover until owner flow is validated.

Defer:

- New flag taxonomy (e.g., `dashboard.v4`) unless rollout control requires it.

## 4) Recommended Delivery Sequence (Fastest Safe Path)

## Phase 1 (P0, 1-2 days): Owner dashboard content alignment only

Files:

- `client/src/pages/OwnerCommandCenterDashboard.tsx`
- `client/src/components/dashboard/widgets-v2/ClientDebtLeaderboard.tsx`
- `client/src/components/dashboard/owner/OwnerVendorsNeedPaymentWidget.tsx`

Changes:

1. Recompose owner dashboard with existing widgets:

- Row 1: `AvailableCashWidget`, `AgingInventoryWidget`, `InventorySnapshotWidget`
- Row 2: `ClientDebtLeaderboard` (retitled “Who Owes Me”), `OwnerVendorsNeedPaymentWidget` (retitled “Who I Owe”), existing quick-cards or empty slot

2. Plain-language copy updates only:

- “Client Debt” -> “Who Owes Me”
- “Vendors Who Need To Get Paid” -> “Who I Owe”
- Add concise subtitles/tooltips for non-jargon context

Blast radius:

- Very low (owner dashboard path only, no data contract changes)

## Phase 2 (P1, 1-2 days): Add appointments widget with zero backend changes

Files:

- New: `client/src/components/dashboard/widgets/AppointmentsWidget.tsx`
- `client/src/pages/OwnerCommandCenterDashboard.tsx`

Data source:

- `trpc.scheduling.getTodaysAppointments`

Notes:

- Read-only list (top 5-8) + filter (`all` / `mine` if user-scoping is available without new endpoint)
- Click-through to `/scheduling` for full action flow

Blast radius:

- Low (frontend-only, existing endpoint)

## Phase 3 (P2, 2-3 days): Add SKU Status Browser as optional/hidden

Files:

- New: `client/src/components/dashboard/widgets/SKUStatusBrowserWidget.tsx`
- Optional integration point in owner dashboard or V3 customization path

Data source:

- `trpc.inventory.getEnhanced` with:
  - `page=1`, `pageSize=20`
  - `search`
  - `status[]`

Notes:

- Keep hidden by default.
- No backend changes needed.

Blast radius:

- Low-medium (new widget only; no shared core behavior changes)

## Phase 4 (P3, optional): Inventory snapshot price brackets

Only if required after Phase 1-3 validation.

Approach:

- Add optional bracket payload to `dashboard.getInventorySnapshot` (or a sibling query) using existing inventory data sources.
- No schema changes.

Blast radius:

- Medium (dashboard router response shape change), so defer until proven needed.

## 5) What We Explicitly Avoid (to protect stability)

1. No table/schema/migration updates.
2. No broad dashboard architecture rewrite in first pass.
3. No component/file renaming sweep.
4. No mass E2E suite expansion.
5. No global styling overhaul.

## 6) Lean Test Strategy (High Signal, Low Volume)

Run only changed-surface tests:

1. Unit/component tests:

- `client/src/pages/DashboardHomePage.test.tsx` (feature-flag route remains correct)
- Add focused tests for:
  - `AppointmentsWidget` loading/empty/data states
  - Retitled widgets render expected titles/subtitles

2. One smoke E2E:

- New focused spec (owner dashboard path only):
  - dashboard loads
  - key widgets render
  - click-through actions route correctly (`/inventory`, `/accounting/bills`, `/scheduling`)

3. No new backend tests unless we add/modify dashboard router contracts in Phase 4.

## 7) Efficiency Checklist Before Merging

1. Confirm no `drizzle/schema*` changes.
2. Confirm no new migrations created.
3. Confirm only dashboard/owner/widget files changed.
4. Verify feature-flag fallback still returns `DashboardV3` when disabled.
5. Verify mobile layout at 375px for new/updated widgets.

## 8) Implementation Order Recommendation

1. Phase 1 + validation
2. Phase 2 + validation
3. Decide go/no-go for Phase 3 based on user need
4. Phase 4 only if bracket grouping remains a hard requirement

This preserves efficacy (most requested outcomes delivered), completeness (all attached-doc asks are mapped), and efficiency (minimal backend/testing/schema impact).

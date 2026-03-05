# TERP UI/UX Master Plan (Consolidated)

Date: 2026-03-04

Source inputs consolidated:

- Gemini consolidated findings for Inventory Workspace delete flow
- `docs/uiux/2026-03-04-terp-inventory-delete-redesign-spec.md`
- `docs/uiux/2026-03-04-dashboard-refresh-low-blast-radius-plan.md`
- `/Users/evan/Downloads/files 2/TERP_DASHBOARD_WIDGETS.md`
- `/Users/evan/Downloads/files 2/TERP_DASHBOARD_DESIGN_PATTERNS.md`
- `/Users/evan/Downloads/files 2/TERP_DASHBOARD_IMPLEMENTATION.md`

## Outcome Target

- Highest UX impact with lowest engineering disruption.
- Reduce "busy" UI states without removing capabilities.
- Preserve existing architecture and data model.

## Guardrails (Apply To Every Task)

1. No new tables, columns, or migrations.
2. Reuse existing endpoints/components first.
3. Prefer copy/state/layout updates over broad refactors.
4. Keep feature-flag safety where already present.
5. Use targeted tests only (changed component tests + one smoke E2E path when needed).

## Priority Buckets

## High Priority (Ship First)

### H1. Prevent Invalid Batch Deletions Pre-Click (Inventory)

Problem solved:

- Reactive blocked-delete flow wastes operator time.

Scope:

- In `InventoryWorkSurface`, compute selected `eligible` vs `blocked` rows from on-hand qty.
- Disable destructive delete when blocked rows exist.
- Show blocked count and `Select eligible only` recovery action.

Acceptance criteria:

- Mixed selection cannot execute invalid delete.
- Eligible-only quick-select works in one click.
- Existing server safeguard remains unchanged.

### H2. Replace Duplicate Error Surfaces With One Actionable Banner (Inventory)

Problem solved:

- Banner + toast duplication increases cognitive load.

Scope:

- For blocked delete, render one in-surface error banner only.
- Suppress blocked-delete error toast.
- Add recovery CTAs: `Select eligible only`, `Adjust quantity` (single blocked row), `Open Receiving`.

Acceptance criteria:

- Blocked delete shows exactly one primary error surface.
- Banner actions are clickable and route/act correctly.

### H3. Focused Selection Mode To Reduce Busy UI (Inventory)

Problem solved:

- Bulk selection state is visually overloaded.

Scope:

- When rows are selected, prioritize the selection action strip.
- De-emphasize non-essential chrome (summary cards/helper text).
- Keep all existing actions reachable via progressive disclosure (`More actions`).

Acceptance criteria:

- Bulk-task controls become the dominant visual focus.
- No existing functionality is removed.

### H4. Undo + Accessibility Hardening for Destructive Flow (Inventory + Global Header)

Problem solved:

- Undo is too transient; icon controls may lack robust AT labels.

Scope:

- Add persistent `Undo last delete` while undo window is active.
- Add explicit `aria-label` to global icon-only controls lacking deterministic labels.

Acceptance criteria:

- Keyboard-only users can trigger undo without toast timing.
- Icon-only header actions have accessible names.

### H5. Owner Command Center Consolidation + Plain Language (Dashboard)

Problem solved:

- Important owner actions are fragmented and jargon-heavy.

Scope:

- Recompose `OwnerCommandCenterDashboard` using existing widgets:
  - Available Cash
  - Aging Inventory
  - Inventory Snapshot
  - Who Owes Me (retitle from client debt)
  - Who I Owe (retitle from vendors needing payment)
- Copy updates only; no broad file/component renaming.

Acceptance criteria:

- Owner dashboard shows all core action widgets in one view.
- Labels/tooltips use plain language and preserve current logic.

### H6. Appointments Widget With Existing Endpoint Only (Dashboard)

Problem solved:

- Daily appointment visibility missing from owner dashboard.

Scope:

- Add `AppointmentsWidget` using existing `trpc.scheduling.getTodaysAppointments`.
- Show concise list + click-through to scheduling flow.
- Keep read-only in dashboard surface.

Acceptance criteria:

- Widget renders loading/empty/data states.
- Click-through navigation works.
- No new backend route required.

## Secondary (After High Priority Stabilizes)

### S1. SKU Status Browser Widget (Hidden by Default)

Scope:

- Add optional `SKUStatusBrowserWidget` using `trpc.inventory.getEnhanced` (`search`, `status[]`, pagination).
- Keep hidden by default; user can enable if needed.

Acceptance criteria:

- Filter/search works against existing endpoint.
- Default dashboard density remains controlled.

### S2. Inventory Snapshot Price Brackets (If Needed After Validation)

Scope:

- Add optional price-bracket grouping in snapshot output/display.
- Defer unless validated need remains after H1-H6 rollout.

Acceptance criteria:

- Bracket display is readable/collapsible and mobile-safe.
- No schema change.

### S3. Explicit Navigation Hierarchy Cues

Scope:

- Add light labels/visual hierarchy between global module nav and workspace tabs.

Acceptance criteria:

- Orientation improves without major layout rewrite.

### S4. Dashboard Path Rationalization (Post-Validation)

Scope:

- After owner dashboard validation, decide whether to keep dual dashboard paths or converge.
- Keep `DashboardV3` fallback until usage and stability data support cutover.

Acceptance criteria:

- Convergence decision made with evidence.
- No breaking route regression.

## Delivery Order and Dependencies

1. H1 -> H2 -> H3 -> H4 (Inventory delete quality loop)
2. H5 -> H6 (Dashboard consolidation loop)
3. S1 -> S2 -> S3 -> S4 (optional/follow-on)

## Lean Verification Standard

Per task:

1. Component/unit tests only for touched components.
2. One targeted smoke E2E for changed user flow (inventory delete or owner dashboard).
3. No broad suite expansion unless behavior contracts change.
4. Explicitly confirm no schema/migration files changed.

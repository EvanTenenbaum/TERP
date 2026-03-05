# TERP Inventory Workspace Redesign Spec (High-Impact / Low-Change)

Date: 2026-03-04

Scope:

- Inventory Workspace batch deletion flow (`blocked delete` + `delete applied`)
- UX/UI changes optimized for maximum impact with minimal engineering change
- Grounded in Gemini consolidated feedback + current TERP implementation

Source inputs:

- Gemini consolidated findings (provided by user)
- Deterministic ranking: `docs/uiux/2026-03-04-inventory-gemini-priority-ranking.md`
- Current implementation evidence in:
  - `client/src/components/work-surface/InventoryWorkSurface.tsx`
  - `client/src/hooks/work-surface/useSaveState.tsx`
  - `client/src/hooks/work-surface/useUndo.tsx`
  - `server/inventoryDb.ts`
  - `server/_core/errors.ts`
  - `client/src/components/layout/LinearWorkspaceShell.tsx`
  - `client/src/components/layout/AppHeader.tsx`

## 1) Strategic Direction (from Linear patterns, adapted for TERP)

Use the same high-performing patterns observed in Linear, but apply them to this flow only:

1. Proactive guidance over reactive correction

- Prevent invalid destructive actions before click.

2. Structured feedback architecture

- Keep each feedback channel single-purpose:
  - Toast: transient success + undo
  - In-surface banner: actionable contextual errors
  - Save-state indicator: persistence state only

3. Progressive disclosure

- Hide technical IDs by default; expose only when needed for support.

4. Composable control model

- Show selection state as structured summary (`eligible`, `blocked`) with one-click remediation.

5. Focused task mode during bulk actions

- When user enters selection mode, reduce non-essential chrome so the current task is visually dominant.

## 2) Urgency-Prioritized Redesign Specs

## P0-A: Prevent invalid delete before click (highest impact, minimal code)

Problem:

- `Delete Selected` currently allows invalid attempts and relies on server rejection.

Current evidence:

- `client/src/components/work-surface/InventoryWorkSurface.tsx`:
  - `selectedBatchIds` handling around line ~1041
  - delete button currently enabled unless mutation pending around line ~1850
  - bulk delete call around line ~1509
- `server/inventoryDb.ts`:
  - reactive hard-stop when `onHandQty > 0` in `bulkDeleteBatches` around line ~2009

UX behavior contract:

1. Compute selection eligibility in real-time:

- `eligibleCount = selected rows where onHandQty <= 0`
- `blockedCount = selected rows where onHandQty > 0`

2. Delete button states:

- `blockedCount > 0`: destructive delete action disabled
- Tooltip: `Cannot delete: {blockedCount} selected batch(es) still have inventory`
- Button text: `Delete Eligible ({eligibleCount})` when mixed selection

3. Recovery accelerator:

- Show inline action button: `Select eligible only` (replaces current selection with eligible IDs)

Implementation touchpoints:

- `client/src/components/work-surface/InventoryWorkSurface.tsx`
  - Add `selectedRows`, `eligibleBatchIds`, `blockedBatchIds`, `eligibleCount`, `blockedCount`
  - Update selection action bar rendering/disable logic
  - Add `selectEligibleOnly` handler
- No backend change required for P0-A (server safeguard remains)

Acceptance criteria:

- Selecting any row with `onHandQty > 0` disables destructive delete action.
- User can clear blocked rows with one click (`Select eligible only`).
- If all selected rows are eligible, delete flow remains unchanged.

QA checks:

- Unit/UI: mixed selection reflects accurate counts and disabled state.
- E2E: blocked rows cannot be deleted from UI path.

---

## P0-B: Remove duplicate error channels for blocked delete

Problem:

- Blocked delete currently triggers both:
  - `toast.error(...)`
  - `setError(...)` -> SaveStateIndicator error label

Current evidence:

- `client/src/components/work-surface/InventoryWorkSurface.tsx` around line ~1159
- `client/src/hooks/work-surface/useSaveState.tsx` (`error` state shown as inline indicator)

UX behavior contract:

- For blocked-delete/business-rule errors:
  - Show one in-context error banner near selection controls.
  - Include warning icon + explicit text (not color alone).
  - Do not emit error toast.
  - Do not move SaveStateIndicator into error for this case.

- Toast usage after this change:
  - success confirmations
  - undo confirmations

Implementation touchpoints:

- `client/src/components/work-surface/InventoryWorkSurface.tsx`
  - Add local `bulkDeleteUiError` state
  - In `bulkDeleteMutation.onError`, route blocked-delete errors to banner
  - Keep toasts for non-context errors only (fallback)

Acceptance criteria:

- Blocked delete displays exactly one error surface.
- Error banner remains understandable in grayscale/no-color contexts.
- Delete success and undo still use toasts.

QA checks:

- E2E: blocked delete produces banner only, no error toast duplication.

---

## P0-C: Reduce “busy UI” during selection mode (without removing functionality)

Problem:

- During bulk operations, too many simultaneous surfaces compete for attention (filters, status cards, selection toolbar, feedback states), increasing cognitive load.

UX behavior contract:

1. Enter focused selection mode when `selectedBatchIds.size > 0`:

- Keep selection action strip pinned and visually primary.
- De-emphasize non-essential surfaces (stock-status summary cards and non-critical helper text).

2. Preserve all functionality through progressive disclosure:

- No actions removed.
- Secondary actions remain available via compact `More actions` menu in the selection strip.
- Existing controls stay reachable; default visual emphasis is just reduced.

3. Exit focused mode automatically when selection clears.

Implementation touchpoints:

- `client/src/components/work-surface/InventoryWorkSurface.tsx`
  - Add `isSelectionMode` derived state
  - Condition/compact render of summary cards and helper text during selection mode
  - Add `More actions` menu for lower-priority controls while keeping behavior parity
- `client/src/components/work-surface/WorkSurfaceStatusBar.tsx`
  - Keep concise task-state text while selection mode is active

Acceptance criteria:

- Selecting rows makes bulk-task actions visually dominant within one viewport scan.
- No existing action path is removed; all prior capabilities remain reachable.
- Clearing selection restores full default layout.

QA checks:

- Component test validates conditional rendering in and out of selection mode.
- E2E confirms all previously available actions are still accessible while selected.

---

## P1-A: Make blocked errors actionable (no dead ends)

Problem:

- Current error tells users what to do but gives no direct action path.

UX behavior contract:

- Error banner includes contextual CTAs:
  - `Select eligible only`
  - `Adjust quantity` (enabled when single blocked batch selected)
  - `Open Receiving` (navigate to receiving workflow)

Implementation touchpoints:

- `client/src/components/work-surface/InventoryWorkSurface.tsx`
  - Reuse existing `handleAdjustQuantity(batchId)` for quick recovery
  - Add route navigation for receiving (`/purchase-orders?tab=receiving`)

Acceptance criteria:

- Banner presents at least one immediately actionable path in all blocked states.
- Single-blocked-row case can open quantity adjust directly.

QA checks:

- E2E: blocked-delete banner actions are clickable and resolve flow interruption.

---

## P1-B: Hide request IDs from primary user copy (progressive disclosure)

Problem:

- Request IDs are embedded in user-facing error text from server.

Current evidence:

- `server/_core/errors.ts` appends `(Request ID: ...)` in multiple branches.

Minimal-change scope (inventory flow only):

- Keep server behavior for now.
- Strip request ID from primary inventory error message in client, and optionally show support details behind disclosure.

UX behavior contract:

- Primary user message example:
  - `Cannot delete Batch 451 (366.39 units in stock). Move or sell inventory first.`
- Optional details:
  - `Details ▾` -> `Error ID: REQ-...` + `Copy Error ID`

Implementation touchpoints:

- `client/src/components/work-surface/InventoryWorkSurface.tsx`
  - Add small parser utility to split message and request-id metadata
  - Render technical ID only in disclosure block

Acceptance criteria:

- Main error text never displays raw request-id suffix.
- Support can still access/copy error ID from details.

QA checks:

- E2E: `/Request ID:\s*REQ-/` absent from primary visible message in inventory delete flow.

---

## P1-C: Undo accessibility fallback (persistent while undo window is active)

Problem:

- Undo in toast is time-bound and may be missed by keyboard/AT users.

Current evidence:

- `client/src/hooks/work-surface/useUndo.tsx` uses transient toast action with timeout.
- `InventoryWorkSurface` status bar only shows text `Undo available`, no direct persistent control.

UX behavior contract:

- While `undo.state.canUndo` is true, show persistent inline control:
  - `Undo last delete`
- Keep toast undo action as secondary path.

Implementation touchpoints:

- `client/src/components/work-surface/InventoryWorkSurface.tsx`
  - Add action control in `WorkSurfaceStatusBar` center section

Acceptance criteria:

- Users can execute undo without relying on toast timing.
- Undo remains available until existing timeout expires.

QA checks:

- Keyboard-only walkthrough can trigger undo from persistent control.

---

## P1-D: Icon control accessibility labels in global header

Problem:

- Some icon-only controls depend on `title` and are not consistently labeled for AT.

Implementation touchpoints:

- `client/src/components/layout/AppHeader.tsx`
  - Add explicit `aria-label` to icon-only theme/settings buttons
- Confirm `NotificationBell` already has `aria-label`

Acceptance criteria:

- Every icon-only global header action has deterministic accessible name.

---

## P2-A (optional): Partial bulk delete with skip summary

When to use:

- Add only if operations team wants one-click mixed selection deletes without reselecting.

Behavior:

- If mixed selection is present and user confirms delete:
  - delete eligible rows
  - skip blocked rows
  - show summary: `Deleted {eligible} batch(es). Skipped {blocked} with inventory.`

Implementation notes:

- Requires backend response enhancement from `bulkDeleteBatches` to include `{ deleted, skipped, errors[] }` without aborting the full transaction on first blocked row.
- Not required for initial low-change rollout.

---

## P3-A: Clarify navigation hierarchy (global module vs workspace tabs)

Problem:

- Sidebar module navigation and workspace tabs can read as one hierarchy level.

UX behavior contract:

- Add explicit hierarchy cues in workspace shell:
  - Header label: `Global module: Inventory`
  - Tab row label: `Workspace tabs`

Implementation touchpoints:

- `client/src/components/layout/LinearWorkspaceShell.tsx`
- `client/src/index.css`

Acceptance criteria:

- User can visually distinguish global module level vs local workspace tab level.

## 3) Exact Microcopy Specification

Blocked banner (default):

- Title: `Some selected batches can’t be deleted`
- Body: `{blockedCount} selected batch(es) still have inventory. Remove stock first or delete eligible batches only.`

Single blocked batch body variant:

- `Cannot delete Batch {id} ({onHandQty} units in stock). Move or sell inventory first.`

Primary button labels:

- `Delete Selected` (all eligible)
- `Delete Eligible ({eligibleCount})` (mixed selection)
- Tooltip when blocked: `Cannot delete: {blockedCount} selected batch(es) still have inventory`

Success toast:

- `Deleted {n} batch(es)`
- Toast action: `Undo`

Undo fallback control text:

- `Undo last delete`

## 4) Minimal Delivery Plan (max impact / low change)

PR-1 (same day):

- P0-A + P0-B + P0-C
- Frontend only (`InventoryWorkSurface`)

PR-2 (same or next day):

- P1-A + P1-B + P1-C
- Frontend only (`InventoryWorkSurface` + small helper)

PR-3 (next day, small):

- P1-D + P3-A
- `AppHeader`, `LinearWorkspaceShell`, `index.css`

## 5) Test Plan (targeted, runtime-efficient)

Add/extend tests:

1. Unit/component (InventoryWorkSurface)

- Mixed eligibility selection computes counts correctly.
- Delete control disabled when blocked rows selected.
- `Select eligible only` updates selection set.
- Selection mode de-emphasizes non-critical UI and preserves access to all actions.

2. Router/unit (`server/routers/inventory.test.ts`)

- Add `bulk.delete` cases:
  - all eligible -> success
  - blocked row present -> business error

3. E2E (new focused golden flow)

- `tests-e2e/golden-flows/gf-00x-inventory-bulk-delete.spec.ts`
  - blocked deletion prevented pre-click
  - banner-only error architecture
  - actionable recovery buttons work
  - no request-id shown in primary inventory error copy
  - persistent undo fallback usable with keyboard

## 6) Gemini Coverage Audit (self-review)

This section verifies the spec against every Gemini issue.

1. Reactive Error Handling

- Addressed by P0-A (pre-click eligibility gating + select-eligible accelerator)
- Status: Covered

2. Redundant Error Feedback

- Addressed by P0-B (banner for contextual errors, no duplicate toast)
- Status: Covered

3. Error Dead Ends

- Addressed by P1-A (actionable CTAs in banner)
- Status: Covered

4. Technical Info Exposed

- Addressed by P1-B (hide request-id from primary copy, disclose on demand)
- Status: Covered

5. Undo Accessibility Risk

- Addressed by P1-C (persistent undo fallback control)
- Status: Covered

6. Navigation Hierarchy Ambiguity

- Addressed by P3-A (explicit hierarchy labels in workspace shell)
- Status: Covered (deferred priority by impact/effort)

7. Cognitive Load (multi-message + technical noise + nav density)

- Addressed by P0-B + P0-C + P1-B + P3-A
- Status: Covered

8. Interaction Design Shift (reactive -> preventive)

- Addressed by P0-A + P1-A
- Status: Covered

9. Microcopy Improvements

- Addressed by Section 3 microcopy contract
- Status: Covered

10. Accessibility (icon labels, toast timing, non-color cues)

- Addressed by P1-C + P1-D and banner icon/text recommendation
- Status: Covered

11. Overly Busy UI / Need for Simplification

- Addressed by P0-C focused selection mode with progressive disclosure and no feature removal
- Status: Covered

## 7) One deliberate scope choice

Gemini suggested backend-level eligibility APIs and persistent activity-log undo as possible implementations.

For lowest-effort/highest-impact delivery, this spec intentionally starts with frontend-first changes using already available inventory row data and existing undo infrastructure.

If needed later:

- Add explicit eligibility endpoint for server-authoritative preflight on huge selections.
- Add centralized activity-log undo for cross-screen history.

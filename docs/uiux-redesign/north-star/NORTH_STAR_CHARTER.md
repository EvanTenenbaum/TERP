# UI/UX North Star Charter (Agent-Operable)

## Summary
This charter standardizes how redesign decisions are made, reviewed, and approved.
It is mandatory for Sales, Inventory, and Purchase Orders in this pass.
Agents must use this before building, during iteration, and at completion gates.

## North Star Statement
TERP should feel like **Linear meets a power spreadsheet for brokers**: fast, calm, dense, and obvious.
Users should complete critical workflows with minimal clicks, no UI hunting, and no context loss.
The UI must reduce thinking overhead, not add it.

## Product Outcome Pillars
1. Speed: Critical workflows are measurably faster than baseline.
2. Orientation: The next action is always visually obvious.
3. Continuity: Users can edit and correct without leaving flow context.
4. Control: High-density data surfaces with strong bulk and keyboard support.
5. Trust: Actions are auditable, errors are explicit, and state changes are predictable.

## Non-Negotiables
1. Grid-first surfaces for core workflows.
2. Sticky command strip with primary actions always visible.
3. Right-side drawers for secondary context, never layout-fragmenting panel stacks.
4. Column show/hide/reorder/reset on all core grids.
5. Dense/Comfortable/Visual modes with per-user per-surface persistence.
6. No horizontal hunting for critical actions/inputs at target desktop viewport.
7. No functionality loss relative to production behavior.
8. No DB schema changes.
9. No major backend refactor.
10. Terminology lock:
   - Product Intake
   - Review
   - Receive
   - Adjust Quantity
   - Change Location
   - Void Intake
   - Activity Log

## Anti-Patterns (Automatic Fail)
1. Card-heavy segmentation replacing core grid behavior.
2. Wizard-style flow for core broker operations.
3. Hidden primary actions behind multiple clicks or non-obvious menus.
4. Required context switches for edits that should be inline or drawer-local.
5. Engineering language in user-facing controls.
6. Any redesign change that increases clicks/time on core paths without a compensating gain.

## Canonical Interaction Architecture
1. Zone A: Compact context header with status and key summary.
2. Zone B: Sticky command strip with primary and high-frequency secondary actions.
3. Zone C: Dominant grid with inline edit and bulk operations.
4. Zone D: Right-drawer host for Activity Log, attachments, details, and support context.
5. Zone E: Inline validation and gating messages near affected records or totals.

## Module North Star Targets
1. Purchase Orders:
   - PO -> Product Intake -> Review -> Receive -> Corrections runs in one coherent surface rhythm.
   - Subset selection and quantity edits are direct and low-friction.
   - Receive is gated by inline errors only.
2. Inventory:
   - Adjustments, status changes, and bulk operations are executable without hunting.
   - Drawer detail augments grid work, never competes with it.
   - View/density/column controls are stable and persistent.
3. Sales:
   - Orders, quotes, and returns share one interaction language.
   - Users avoid back-and-forth route loops for common edits.
   - Handoffs to invoicing/fulfillment are obvious and minimally disruptive.

## Agent Validation Loop (Required)
1. Read this charter before any scoped change.
2. Declare one hypothesis sentence tied to Speed or Orientation.
3. Run seeded browser flow for affected module and capture evidence.
4. Score work with the North Star Scorecard.
5. If any red-line fails or score is below threshold, amend plan and iterate.
6. Mark complete only when post-build gates pass.

## North Star Scorecard v1
1. Primary action visibility at load.
2. Click efficiency vs baseline.
3. Time-to-complete vs baseline.
4. Reversal loop rate.
5. Dead-end event rate.
6. Context continuity for edits/corrections.
7. Grid dominance and density quality.
8. Drawer usage correctness.
9. Terminology compliance.
10. Functional parity.
11. Mobile-safe behavior.
12. Visual discipline and consistency.

Scoring model:
1. Each criterion is scored 0, 1, or 2.
2. Pass threshold: >= 22/24.
3. Required: no automatic-fail anti-pattern present.

## Integration with Plan Amendment Rule (PAR)
1. PAR-PreBuild must include explicit North Star hypothesis and baseline metrics.
2. In-flight amendments are mandatory if North Star metrics regress.
3. PAR-PostBuild must include scorecard result plus visual and trace evidence.
4. No completion claim without North Star pass and PAR pass.

## Required Artifacts
1. `NORTH_STAR_CHARTER.md`
2. `NORTH_STAR_SCORECARD_TEMPLATE.json`
3. `NORTH_STAR_DECISION_LOG.md`
4. `par/PAR-*.md` entries referencing North Star scores.

## Interface and Type Additions
1. `NorthStarScorecardEntry`
   - `criterion`
   - `score`
   - `evidencePath`
   - `notes`
2. `NorthStarGateResult`
   - `module`
   - `totalScore`
   - `passed`
   - `redLineFailures`
   - `timestamp`
3. `RedesignReviewArtifactIndex`
   - Links to screenshots, traces, videos, and flow metrics.

## Required Test Scenarios
1. Purchase Orders core path from list to receive with correction actions.
2. Inventory bulk and single-item adjustments with drawer-assisted context.
3. Sales order path through key transitions with minimal route hopping.
4. Primary action visibility checks on desktop and mobile-safe viewport.
5. Regression checks for no functionality loss and terminology drift.

## Assumptions and Defaults
1. Desktop-first optimization remains the priority, with mobile-safe enforcement.
2. Seed quality is deterministic and persona-based with critical edge cases.
3. UX evidence is produced via browser flow runs, not code inspection alone.
4. This charter is mandatory for all implementers in scoped redesign modules.

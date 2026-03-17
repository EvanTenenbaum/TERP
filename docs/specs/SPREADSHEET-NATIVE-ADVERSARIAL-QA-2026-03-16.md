# Spreadsheet-Native Adversarial QA - 2026-03-16

## Purpose

This document captures the hostile review pass against:

- the spreadsheet-native final target
- the `Sales -> Orders` pilot
- the `Operations -> Inventory` pilot

The goal is to prevent false confidence, pilot drift, and width/layout regressions before the fork grows.

## Findings That Mattered Most

### Final Target

- Final target, pilot scope, and preserved adjacent behavior were still too blended together.
- The blueprints were inheriting the save/output contracts in principle but not yet translating them into per-action execution truth.
- Width and horizontal-scroll discipline were under-specified.
- Shared views still had too much power to reshape operational sheet topology.

### Orders Pilot

- The pilot was over-testing adjacent handoffs and under-testing the actual sheet-native queue.
- The two-lane layout was hiding width problems instead of solving them.
- The queue was too thin, which pushed routine triage into the inspector.
- The inspector had become a launcher column instead of a secondary depth surface.

### Inventory Pilot

- The pilot spent too much space describing its own limits.
- The default grid was too wide for normal operational widths.
- Hard pagination made the pilot feel database-admin rather than sheet-native.
- The pilot still looked too much like one list plus one side panel instead of a linked-table sheet.

## Remediation Decisions Applied

### Final Target Docs

- Added an explicit artifact-class split in [SPREADSHEET-NATIVE-FOUNDATION-BASELINE-V2.md](./SPREADSHEET-NATIVE-FOUNDATION-BASELINE-V2.md).
- Added width-discipline and column-priority rules in [SPREADSHEET-NATIVE-UX-UI-FRAMEWORK.md](./SPREADSHEET-NATIVE-UX-UI-FRAMEWORK.md).
- Added width-budget enforcement and inspector-secondary rules in [SPREADSHEET-NATIVE-SHEET-ENGINE-CONTRACT.md](./SPREADSHEET-NATIVE-SHEET-ENGINE-CONTRACT.md).
- Reduced shared-view topology power in [SPREADSHEET-NATIVE-VIEW-SHARING-PERMISSIONS-LIFECYCLE-CONTRACT.md](./SPREADSHEET-NATIVE-VIEW-SHARING-PERMISSIONS-LIFECYCLE-CONTRACT.md).
- Added explicit final-target vs pilot vs preserved-adjacent sections and action matrices to:
  - [SPREADSHEET-NATIVE-SALES-ORDERS-BLUEPRINT.md](./SPREADSHEET-NATIVE-SALES-ORDERS-BLUEPRINT.md)
  - [SPREADSHEET-NATIVE-OPERATIONS-INVENTORY-BLUEPRINT.md](./SPREADSHEET-NATIVE-OPERATIONS-INVENTORY-BLUEPRINT.md)

### Orders Pilot

- Replaced the default split-lane queue with one dominant queue.
- Moved primary handoff actions next to selection instead of burying them in the inspector.
- Added a compact summary strip for the selected order.
- Reduced default line-item width by removing non-essential columns from the pilot’s first pass.
- Kept the inspector for deeper context and evidence instead of making it the action center.

### Inventory Pilot

- Reduced the default grid to a smaller `P0` column set.
- Replaced hard page-by-page navigation with a loaded-window `Load More` pattern.
- Added an inline supporting locations table so the pilot now evaluates linked-table behavior directly.
- Moved `Adjust Qty` into the command strip and demoted classic escape hatches.
- Reduced duplicate pilot-warning chrome and kept the inspector for secondary context.

## Deliberate Non-Fixes

- The pilots still do not claim full parity.
- Orders still depends on adjacent composer, conversion, returns, and invoice execution.
- Inventory still depends on adjacent add-inventory, bulk delete/restore, export, gallery, and reversal flows.
- The proof registry still needs continued tightening so adjacent preserved proof is never mistaken for pilot-surface proof.

## Acceptance Standard Going Forward

- No pilot may add width-heavy default columns without explicitly classifying them as `P0`, `P1`, or `P2`.
- No pilot may rely on the inspector for the happy path.
- No blueprint may present preserved adjacent behavior as if it were already absorbed into the pilot.
- No high-frequency sheet may default to side-by-side multi-table layouts that force routine horizontal scrolling.

# Spreadsheet-Native Build Source of Truth

## Blocked Status

No module in this folder is cleared for implementation yet.

Every row in the pack-level ledger is `pack-only / blocked` until the corresponding module-specific detailed ledger exists and is verified.

This folder is the implementation-first handoff for the March spreadsheet-native pack.

Use this folder when the question is "what do we actually have to preserve and build," not "what did the mock look like."

## Start Here

- `spreadsheet-native-build-source-of-truth.md`
- `spreadsheet-native-pack-capability-ledger-summary.md`
- `spreadsheet-native-pack-capability-ledger.csv`
- `spreadsheet-native-pack-discrepancy-log.md`

## Supporting State

- `Prompt.md`
- `Plan.md`
- `Implement.md`
- `Documentation.md`
- `qa-review-context.md`

## Relationship To Existing Artifacts

- Reuses the existing detailed ledgers for Orders, Inventory, Sales Sheets, Direct Intake, and Purchase Orders from `docs/specs/spreadsheet-native-ledgers/`.
- Treats the Figma pack in the parent folder as directional UI reference only.
- Compiles the 2026-03-19 screen-recording feedback into implementation directives rather than literal mock edits.

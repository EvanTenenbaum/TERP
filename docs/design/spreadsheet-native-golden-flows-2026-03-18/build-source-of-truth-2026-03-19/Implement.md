# Active Milestone

Close the first detailed-ledger tranche after wiring Sales Sheets, Direct Intake, and Purchase Orders back into the build-source-of-truth packet and applying the last Claude findings without another review pass.

# Decisions

- Treat this as the moment to pivot from Figma-first iteration to literal capability preservation planning.
- Reuse the existing detailed Orders and Inventory ledgers rather than duplicating them in a looser pack doc.
- Use the pack-level ledger as the queue for the remaining modules plus shared cross-pack seams, and clear it tranche by tranche with module-specific detailed ledgers.

# Changes

- Created the dedicated build-source-of-truth folder for the March spreadsheet-native pack.
- Added durable state files so the work can continue in later turns without losing context.
- Authored the source-of-truth document, capability-ledger summary, discrepancy log, and review context.
- Created a 32-row pack-level capability ledger with pointer rows for Orders, Inventory, Sales Sheets, Direct Intake, and Purchase Orders.
- Added machine-readable `Build Readiness`, `Preservation Entry Status`, and `Prerequisite Ledger` columns to the CSV.
- Added temporary preservation stubs for Payments and shared spreadsheet-native primitives where leaving `none found` would have been unsafe.
- Authored the first new detailed-ledger tranche:
- `docs/specs/spreadsheet-native-ledgers/sales-sheets-capability-ledger.csv`
- `docs/specs/spreadsheet-native-ledgers/direct-intake-capability-ledger.csv`
- `docs/specs/spreadsheet-native-ledgers/purchase-orders-capability-ledger.csv`
- Added matching summary and discrepancy-log files for all three new ledgers.
- Updated the build-source-of-truth packet and parent pack README so those three modules now resolve to real detailed ledgers instead of planned prerequisites.
- Updated the parent pack `README.md` and `module-specs.md` so future work starts from this packet instead of treating the Figma artboards as the literal spec.

# Evidence

- Current repo snapshot: `0e2bb8ba5edfb9c9b1e1b836acb50a8c9348cfae`
- Existing authoritative ledgers confirmed:
- `docs/specs/spreadsheet-native-ledgers/sales-orders-sheet-capability-ledger.csv`
- `docs/specs/spreadsheet-native-ledgers/operations-inventory-sheet-capability-ledger.csv`
- New detailed ledgers created:
- `docs/specs/spreadsheet-native-ledgers/sales-sheets-capability-ledger.csv`
- `docs/specs/spreadsheet-native-ledgers/direct-intake-capability-ledger.csv`
- `docs/specs/spreadsheet-native-ledgers/purchase-orders-capability-ledger.csv`
- Claude QA run 1:
- `~/.codex-runs/claude-qa/20260319T222315Z-users-evan-spec-erp-docker-terp-terp-docs-design-spreadsheet-nat-02d084/report.md`
- Key findings addressed: missing payment preservation backstop, missing shared-foundation preservation backstop, no machine-readable build gate, code-verification claim too strong
- Claude QA run 2:
- `~/.codex-runs/claude-qa/20260319T223248Z-users-evan-spec-erp-docker-terp-terp-docs-design-spreadsheet-nat-aa4cd3/report.md`
- Key findings addressed: blocked banner added, stub visibility improved via explicit column, prerequisite-ledger column added, Orders and Inventory pointer rows added
- Claude QA run 3:
- `~/.codex-runs/claude-qa/20260319T225641Z-users-evan-spec-erp-docker-terp-terp-docs-design-spreadsheet-nat-e5e3a2/report.md`
- Key findings addressed without rerun: already-detailed modules collapsed to pointer rows, planned-ledger rows downgraded from `verified`, shared foundation moved to the front of the remaining execution order, and decomposition docs now state that pack rows are a floor rather than a ceiling
- CSV structure check:
- `32` data rows
- `34` columns
- `bad_rows = []`
- New detailed-ledger CSV checks:
- `sales-sheets-capability-ledger.csv`: `6` data rows, `31` columns, `bad_rows = []`
- `direct-intake-capability-ledger.csv`: `6` data rows, `31` columns, `bad_rows = []`
- `purchase-orders-capability-ledger.csv`: `6` data rows, `31` columns, `bad_rows = []`

# Blockers

- Remaining modules are still blocked on their own detailed ledgers.
- Shared and cross-pack contracts are now the first remaining detailed-ledger tranche because `CROSS-001` is still foundational and blocked.

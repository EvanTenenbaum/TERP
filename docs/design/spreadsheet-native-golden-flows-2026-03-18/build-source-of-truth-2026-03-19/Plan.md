# Milestones

1. Reuse existing source-of-truth artifacts and confirm the ledger format, source precedence, and pack coverage gaps.
2. Create the build-source-of-truth packet, including the discrepancy log and pack-level capability ledger.
3. Run a bounded Claude QA pass against the packet with explicit preservation questions.
4. Improve the packet from Claude's findings and update the parent pack index.

# Dependencies

- `docs/specs/SPREADSHEET-NATIVE-INTERACTION-SOURCE-OF-TRUTH-CONTRACT.md`
- `docs/specs/SPREADSHEET-NATIVE-CAPABILITY-LEDGER-TEMPLATE.md`
- `docs/specs/spreadsheet-native-ledgers/sales-orders-sheet-capability-ledger.csv`
- `docs/specs/spreadsheet-native-ledgers/operations-inventory-sheet-capability-ledger.csv`
- current code anchors in Sales, Accounting, Operations, Returns, and Samples
- `artifacts/video-feedback/2026-03-19-figma-review/`

# Owned Paths

- `docs/design/spreadsheet-native-golden-flows-2026-03-18/build-source-of-truth-2026-03-19/`
- `docs/design/spreadsheet-native-golden-flows-2026-03-18/README.md`
- `docs/design/spreadsheet-native-golden-flows-2026-03-18/module-specs.md`

# Verification Plan

- Read back the new packet files after writing them.
- Run Claude QA on the new packet folder with the adjacent `qa-review-context.md` file.
- Apply Claude findings directly to the packet when they are valid.
- Run the docs-appropriate risk verification pass before closing.

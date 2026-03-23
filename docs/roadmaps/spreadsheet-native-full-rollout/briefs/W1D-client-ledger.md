# W1D: Client Ledger Sheet-Native Implementation Brief

## Module

Client Ledger — small surface (39KB, 11 extracted capabilities). PACK-ONLY ledger, needs architect pass.

## Readiness

- Detailed capability ledger: DOES NOT EXIST (pack-level only: `ACCT-LED-001` to `ACCT-LED-003`)
- Extraction CSV: EXISTS (`docs/specs/spreadsheet-native-ledgers/extracted/client-ledger-capabilities.csv`, 11 rows)
- Cross-check: 1 mutation, 4 queries — small surface
- Figma golden flow: `docs/design/spreadsheet-native-golden-flows-2026-03-18/client-ledger-sheet.svg`
- Pilot surface: EXISTS — ClientLedgerPilotSurface.tsx (client/src/components/spreadsheet-native/ClientLedgerPilotSurface.tsx). QA verdict: SHIP (2 P2, 1 P3). See docs/qa/2026-03-21-pilot-surface-review/consolidated-verdict.md.

## Extracted Capabilities (from CSV)

### Mutations (1)

1. `accounting.ledger.adjust` — Ledger adjustment

### Queries (4)

1. `accounting.ledger.list` — Ledger entries
2. `accounting.ledger.getBalance` — Running balance
3. `accounting.ledger.getHistory` — Entry history
4. `clients.getById` — Client context

### Other

- Keyboard navigation
- Export (2 paths)
- Adjustment confirmation dialog
- Search input
- Filter select

## BLOCKER: Needs Architect Pass

Small enough that the architect pass can be done inline with implementation. The extraction CSV + pack-level rows + Feature Preservation Matrix entry (DF-060) provide sufficient inputs.

## Known Constraints (from Launch Matrix)

- `Adopt`: dominant ledger table plus right-rail review support
- `Adapt`: right rail must fit viewport while preserving running balance visibility
- `Preserve`: standalone route ownership, explicit adjustment permission gate
- `Reject`: remounting as an accounting workbook tab before shell ownership changes

## Key Design Decision

Running balance MUST stay visible when detail is open. This is the #1 preservation constraint.

## Risk

- **LOW**: Small surface, clear patterns, single mutation
- **MEDIUM**: Running balance visibility during detail view is a layout challenge

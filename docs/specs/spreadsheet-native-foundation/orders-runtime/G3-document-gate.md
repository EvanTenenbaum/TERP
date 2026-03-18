# G3 Document Gate

- Linear gate: `TER-789`
- Scope: document adapter mount, logic preservation, conversion parity, and document proof closure.
- Exit criteria:
  - Orders-owned document work stays sheet-native without classic fallback
  - pricing, autosave, undo, validation, seeded-entry, and routing remain reused
  - document rows are not left `partial` or `implemented-not-surfaced`
- Evidence list:
  - `G3-document-gate.md`
  - `02-proof-row-map.csv`
  - Linear issues `TER-797`..`TER-799`
  - scoped validation commands logged in `Implement.md`
- Status: `blocked`
- Next unblock: complete G2 runtime tranche and move document mount work active.

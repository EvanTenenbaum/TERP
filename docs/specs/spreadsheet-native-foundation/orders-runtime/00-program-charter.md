# Orders Spreadsheet Runtime Program Charter

- Date: `2026-03-18`
- Parent tracker: `TER-766`
- Active project: `TERP - Orders Spreadsheet Runtime Rollout`
- Mission: make Orders sheet-native mode trustworthy enough to stop being treated as a special initiative.
- Complete means:
  - product-complete: Orders-owned work stays in sheet-native mode end to end
  - spreadsheet-complete: selection, paste, fill, edit nav, row ops, and failure cases work across document/queue/support
  - reuse-complete: pricing, autosave, undo, validation, seeded-entry, and routing stay shared
  - surfacing-complete: editable vs locked, selection, errors, save state, and workflow targets are legible
  - proof-complete: every required `SALE-ORD` row is `live-proven`, `adjacent-owned`, or `rejected with evidence`
  - tracker-complete: Linear, contract, proof registry, and docs agree
  - retirement-complete: fallback policy, owner acceptance, audit cadence, reopen rules, and long-term owner are explicit
- Gate chain: `G1 -> G2 -> G3 -> G4 -> G5 -> G6 -> G7`
- Stop/go rule: blocked work uses Linear status `Todo` plus label `state:blocked`; blocked lanes do not stay `In Progress`.
- Audit rhythm: update durable files each gate checkpoint before moving downstream work active.

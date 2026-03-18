# Orders Runtime Plan

- Date: `2026-03-18`
- Loop: `plan -> implement -> validate -> repair` for every gate before the next gate can go active.
- Human execution layer: `docs/roadmaps/orders-spreadsheet-runtime/README.md`
- Gate order:
  - `G1 TER-787`: engine verdict, tracker lock, and blocker enforcement.
  - `G2 TER-788`: shared runtime selection, clipboard/fill, edit-nav, row-op tranche.
  - `G3 TER-789`: Orders document mount, logic preservation, and document proof closure.
  - `G4 TER-790`: queue/support/workflow-target parity.
  - `G5 TER-791`: surfacing and affordance closure.
  - `G6 TER-792`: proof reconciliation, adversarial review, and rollout verdict.
  - `G7 TER-793`: retirement policy and long-term ownership handoff.
- Validation contract by gate:
  - docs/tracker gates: artifact diff review plus `rg -n "ORDR-|SALE-ORD-|implemented-not-surfaced" docs/specs/spreadsheet-native-foundation docs/roadmaps`
  - code gates: scoped diff, targeted tests for touched paths, then `pnpm check`, `pnpm lint`, `pnpm test`, `pnpm build`
  - live-proof gates: staging persona/runbook evidence plus adversarial review artifact before promotion
- Current active gate: `G2`
- Current completed gate: `G1`
- Current blocked gates: `G3` through `G7` via Linear label `state:blocked`

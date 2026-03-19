# Orders Runtime Remaining Atomic Completion Roadmap

Date: `2026-03-19`

Status source:

- [Orders runtime README](./README.md)
- [TER-795 state](../../specs/spreadsheet-native-foundation/orders-runtime/ter-795-state.json)
- [Issue manifest](../../specs/spreadsheet-native-foundation/orders-runtime/01-issue-manifest.json)

## Purpose

This document is the shortest dependency-ordered path from the current repo truth to full completion of the Orders spreadsheet-runtime initiative.

It is intentionally module-scoped:

- in scope: `Sales -> Orders` queue, document, and support surfaces, plus the shared runtime behavior they depend on
- out of scope: unrelated workbook migrations, non-Orders spreadsheet-native rollout work, and broad platform cleanup not required for Orders completion

## Current Starting Point

- `G1` is `closed with evidence`
- `G2` is `partial`
- `SALE-ORD-019`, `SALE-ORD-022`, `SALE-ORD-030`, and `SALE-ORD-032` are the current live-proven G2 rows
- remaining `G2` rows are:
  - `SALE-ORD-020`
  - `SALE-ORD-021`
  - `SALE-ORD-029`
  - `SALE-ORD-031`
  - `SALE-ORD-035`
- downstream gates `G3` through `G7` remain blocked by contract until `G2` is `closed with evidence`

## Global Finish Rules

1. Keep work atomic: every writable tranche ends in exactly one of `user-facing product change`, `closure packet`, `limitation packet`, or `blocker packet`.
2. Keep proof row-scoped: use targeted local verification during implementation and at most one isolated live probe per row when needed.
3. Keep `TER-796` sealed unless an isolated rerun proves a real regression.
4. Treat `SALE-ORD-031` and `SALE-ORD-035` as immediate limitation lanes unless the same tranche can close them without reopening bundle-chasing.
5. Park `SALE-ORD-020` and `SALE-ORD-021` until a fresh reachable Orders document route exists, then spend one fresh-build attempt each and classify honestly.
6. Do not promote `G3` through `G7` early, but move into `G3` immediately once `G2` is honestly closeable.

## Remaining Gate Sequence

### Phase 1: Close `G2` Shared Runtime Foundation

Parent gate:

- `TER-788`

Active atomic card:

- `TER-795`

Remaining atomic tranches:

1. `SALE-ORD-031`
   - goal: stop holding `G2` open for a sort/filter path that Orders does not surface today
   - preferred output: limitation packet now
   - success condition: row no longer blocks `G2` on speculative proof work

2. `SALE-ORD-035`
   - goal: stop broad failure-bundle chasing unless one bounded packet can close the row immediately
   - preferred output: limitation packet now, or one bounded negative-case packet that closes the row in the same tranche
   - success condition: row no longer blocks `G2` on open-ended bundle work

3. `SALE-ORD-029`
   - goal: take one narrow shot at clear-style or structured edit rejection, then stop
   - preferred output: one narrow negative-case packet with explicit blocked-action assertions, then limitation if the row is still fuzzy
   - success condition: row moves to `live-proven` or `rejected with evidence`

4. `SALE-ORD-020`
   - goal: close multi-cell edit, pricing preservation, and autosave proof only if a fresh reachable document route exists
   - preferred output: one isolated edit packet with before/after values, save-state evidence, and restore proof
   - success condition: row moves to `live-proven` or `rejected with evidence`, or the tranche ends in a blocker packet instead of another loop

5. `SALE-ORD-021`
   - goal: close approved-field paste proof on staging only if a fresh reachable document route exists
   - preferred output: one isolated paste packet on the live Orders document path, not a mixed G2 bundle
   - success condition: row moves to `live-proven` or `rejected with evidence`, or the tranche ends in a blocker packet instead of another loop

Gate-close condition:

- every required `G2` row is no longer `partial`
- `TER-788` and child row truth agree across state, proof map, gate doc, and Linear
- `G2` is updated to `closed with evidence`
- `G3` starts immediately after honest `G2` closeability is established

### Phase 2: Close `G3` Orders Document Rollout

Parent gate:

- `TER-789`

Atomic cards:

- `TER-797` document adapter mount
- `TER-798` document logic preservation
- `TER-799` document proof closure

Execution order:

1. prove the current document adapter mount is the only active runtime path
2. prove Orders-owned document logic still survives:
   - pricing
   - autosave
   - undo
   - validation
   - seeded entry
   - route hydration
3. close or reject the remaining document-owned proof rows:
   - `SALE-ORD-003`
   - `SALE-ORD-004`
   - `SALE-ORD-005`
   - `SALE-ORD-006`
   - `SALE-ORD-012`
   - `SALE-ORD-015`
   - `SALE-ORD-016`
   - `SALE-ORD-017`
   - `SALE-ORD-018`
   - `SALE-ORD-028`

Gate-close condition:

- no Orders-owned document row is still `implemented-not-surfaced`
- document mode is proved end-to-end on staging for Orders-owned work
- `G3` moves to `closed with evidence`
- no new foundation or meta-system tranche is inserted ahead of document closure work

### Phase 3: Close `G4` Cross-Surface Rollout

Parent gate:

- `TER-790`

Atomic cards:

- `TER-800` queue selection and copy parity
- `TER-801` workflow target clarity
- `TER-802` support-surface consistency

Execution order:

1. prove queue behavior stays on the shared grammar
2. prove support-grid behavior and active-order synchronization stay aligned
3. prove workflow targeting is unambiguous across queue, support, and document surfaces
4. close or reject the cross-surface rows:
   - `SALE-ORD-001`
   - `SALE-ORD-002`
   - `SALE-ORD-007`
   - `SALE-ORD-023`
   - `SALE-ORD-034`

Gate-close condition:

- queue, document, and support behave as one coherent Orders interaction model
- no workflow action ambiguity remains
- `G4` moves to `closed with evidence`

### Phase 4: Close `G5` Surfacing And Affordance Closure

Parent gate:

- `TER-791`

Atomic card:

- `TER-803`

Execution order:

1. selection legibility and selection-summary visibility
2. editable-vs-locked cues and blocked feedback
3. queue/support/document discoverability
4. workflow action visibility after spreadsheet edits
5. close or reject:
   - `SALE-ORD-024`
   - `SALE-ORD-025`
   - `SALE-ORD-026`
   - `SALE-ORD-027`
   - `SALE-ORD-033`

Gate-close condition:

- `implemented_not_surfaced_count` is effectively zero for required Orders rows
- no critical Orders behavior still depends on hidden knowledge
- `G5` moves to `closed with evidence`

### Phase 5: Close `G6` Proof, Verdict Sync, And Tracker Completion

Parent gate:

- `TER-792`

Atomic cards:

- `TER-804`
- `TER-805`

Execution order:

1. reconcile every `SALE-ORD-*` row against code, staging proof, and surfacing truth
2. run the final remaining proof wave only for rows not already retired with evidence
3. run mandatory adversarial review on the final row set
4. write back final verdicts into:
   - gate files
   - proof row map
   - execution metrics
   - issue manifest
   - Linear

Gate-close condition:

- every required row is `live-proven`, `adjacent-owned`, or `rejected with evidence`
- docs, state files, proof map, and Linear all agree
- `G6` moves to `closed with evidence`

### Phase 6: Close `G7` Retirement And Governance Handoff

Parent gate:

- `TER-793`

Atomic card:

- `TER-806`

Execution order:

1. document explicit classic fallback boundaries
2. record adjacent-owner acceptance for retained seams
3. name long-term owner
4. document audit cadence and reopen criteria
5. document the two-release monitoring contract
6. close the remaining governance rows:
   - `SALE-ORD-008`
   - `SALE-ORD-009`
   - `SALE-ORD-010`
   - `SALE-ORD-011`
   - `SALE-ORD-013`
   - `SALE-ORD-014`

Gate-close condition:

- Orders can leave special-initiative mode without relying on tribal knowledge
- governance, fallback, ownership, and reopen rules are durable
- `G7` moves to `closed with evidence`

## Atomic Next-Step Queue

If the goal is to move forward immediately without reopening planning:

1. write the `SALE-ORD-031` limitation packet
2. write the `SALE-ORD-035` limitation packet unless one bounded packet closes it immediately
3. give `SALE-ORD-029` one narrow proof attempt, then limitation if still fuzzy
4. park `SALE-ORD-020` until a fresh reachable document route exists, then spend one fresh-build attempt
5. park `SALE-ORD-021` until a fresh reachable document route exists, then spend one fresh-build attempt
6. promote `G2` as soon as those rows are honestly classified and no longer partial
7. move directly into `G3`, then execute `G4` through `G7` in order without skipping

## Definition Of Full Completion

Full completion is reached only when all of the following are true:

- `G2` through `G7` are `closed with evidence`
- every required Orders row has a final verdict
- Orders queue, document, and support surfaces share one trustworthy interaction model
- Orders-owned work no longer depends on special-initiative fallback handling
- tracker truth, proof truth, and governance truth all agree

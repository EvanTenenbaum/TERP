# Orders Spreadsheet Runtime Atomic Roadmap Set

Date: `2026-03-18`

Most recent deployed proof base: `2bcce192`

## Purpose

This package is the execution contract for getting `Sales -> Orders` to `complete`.

Linear remains the live tracker. This roadmap set is the repo-backed execution layer that agents follow consecutively without skipping gates.

Authority rule:

- use this package plus `docs/specs/spreadsheet-native-foundation/orders-runtime/*` for current execution truth
- treat `docs/roadmaps/2026-03-17-orders-spreadsheet-runtime-rollout.md` as lineage only, not the active contract

Completion means Orders is no longer a special initiative and satisfies:

- product-complete
- spreadsheet-complete
- reuse-complete
- surfacing-complete
- proof-complete
- tracker-complete
- retirement-complete

Primary evidence store:

- [Orders runtime charter](../../specs/spreadsheet-native-foundation/orders-runtime/00-program-charter.md)
- [Execution handoff prompt](../../specs/spreadsheet-native-foundation/orders-runtime/HANDOFF-2026-03-19-CODEX-EXECUTION-PROMPT.md)
- [TER-795 state](../../specs/spreadsheet-native-foundation/orders-runtime/ter-795-state.json)
- [Issue manifest](../../specs/spreadsheet-native-foundation/orders-runtime/01-issue-manifest.json)
- [Proof row map](../../specs/spreadsheet-native-foundation/orders-runtime/02-proof-row-map.csv)
- [Execution metrics](../../specs/spreadsheet-native-foundation/orders-runtime/execution-metrics.json)

## Required Execution Order

Blocked work cannot be `In Progress`. A downstream roadmap stays blocked until the prior roadmap is `closed with evidence`.

| Order | Roadmap                                                      | Gate | Linear Gate | Current Verdict        | Prerequisite |
| ----- | ------------------------------------------------------------ | ---- | ----------- | ---------------------- | ------------ |
| `0`   | [Roadmap 0](./roadmap-0-g1-engine-verdict.md)                | `G1` | `TER-787`   | `closed with evidence` | none         |
| `1`   | [Roadmap 1](./roadmap-1-g2-shared-runtime-foundation.md)     | `G2` | `TER-788`   | `closed with evidence` | Roadmap 0    |
| `2`   | [Roadmap 2](./roadmap-2-g3-orders-document-rollout.md)       | `G3` | `TER-789`   | `closed with evidence` | Roadmap 1    |
| `3`   | [Roadmap 3](./roadmap-3-g4-cross-surface-rollout.md)         | `G4` | `TER-790`   | `closed with evidence` | Roadmap 2    |
| `4`   | [Roadmap 4](./roadmap-4-g5-surfacing-affordance-closure.md)  | `G5` | `TER-791`   | `closed with evidence` | Roadmap 3    |
| `5`   | [Roadmap 5](./roadmap-5-g6-proof-verdict-sync.md)            | `G6` | `TER-792`   | `closed with evidence` | Roadmap 4    |
| `6`   | [Roadmap 6](./roadmap-6-g7-retirement-governance-handoff.md) | `G7` | `TER-793`   | `closed with evidence` | Roadmap 5    |

## Global Execution Rules

- Gate verdicts use only: `open`, `partial`, `closed with evidence`, `rejected with evidence`.
- All seven gates (`G1`–`G7`) are `closed with evidence`. The Orders initiative is **retired** as of 2026-03-20.
- No roadmap is done from ticket prose alone.
- Active-gate operating model is `1 coordinator + up to 2 read-only sidecars + at most 1 narrow writer` until the current gate has a clean checkpointed proof packet.
- Sidecars may explore, adversarially review, or map the next gate, but the coordinator owns source-of-truth updates, merge decisions, and gate promotion.
- Evidence writeback order is fixed:
  1. update `orders-runtime` durable files
  2. update Linear gate and child issues
  3. update the roadmap status block
- Every code-bearing roadmap uses `plan -> implement -> validate -> repair -> adversarial review -> writeback`.
- Every proof-bearing roadmap must include build ID, commit SHA, persona, route, record ID, screenshots, and negative-case evidence.
- For `TER-795`, update `ter-795-state.json` first, then run `pnpm status:orders-runtime:all` so repeated gate or roadmap status blocks and review context stay synchronized.
- `implemented-not-surfaced` is rollout-blocking.
- `G6` is the only roadmap allowed to declare proof-complete or tracker-complete.
- `G7` is required before Orders can leave special-initiative mode.

## Command Contract

Docs-only turns:

- `rg -n "ORDR-|SALE-ORD-|implemented-not-surfaced|closed with evidence|rejected with evidence" docs/specs/spreadsheet-native-foundation/orders-runtime docs/roadmaps/orders-spreadsheet-runtime docs/roadmaps/2026-03-17-orders-spreadsheet-runtime-rollout.md`
- `jq '.' docs/specs/spreadsheet-native-foundation/orders-runtime/01-issue-manifest.json`
- `jq '.' docs/specs/spreadsheet-native-foundation/orders-runtime/execution-metrics.json`

Code-bearing turns:

- write the exact targeted validation commands into the roadmap status block and gate artifact before touching code
- run those targeted commands during the roadmap
- when the gate is still unstable, prefer read-only sidecars and one scoped writer over parallel write-heavy work that would blur proof ownership
- before any merge-ready claim run:
  - `pnpm check`
  - `pnpm lint`
  - `pnpm test`
  - `pnpm build`

## Roadmap-to-Issue Map

- Roadmap 0: `TER-787`, `TER-767`, `TER-768`
- Roadmap 1: `TER-788`, `TER-769`, `TER-770`, `TER-771`, `TER-772`, `TER-794`, `TER-795`, `TER-796`
- Roadmap 2: `TER-789`, `TER-773`, `TER-774`, `TER-797`, `TER-798`, `TER-799`
- Roadmap 3: `TER-790`, `TER-776`, `TER-777`, `TER-800`, `TER-801`, `TER-802`
- Roadmap 4: `TER-791`, `TER-778`, `TER-803`
- Roadmap 5: `TER-792`, `TER-779`, `TER-804`, `TER-805`
- Roadmap 6: `TER-793`, `TER-806`

# Non-Codex Takeover Bundle

Date: `2026-03-19`

This folder is a convenience bundle for handing the spreadsheet-native initiative to another agent without making it chase files across the Orders worktree and the nested `TERP/TERP` source tree.

Use this folder as the first entrypoint, but remember:

- the copied files here are a snapshot bundle for handoff convenience
- the original files in the repo remain authoritative
- this bundle is intended to be GitHub-friendly and usable from a normal repo checkout
- Orders is the active execution lane
- the broader spreadsheet-native packet is context and preservation truth for shared seams and future module rollout, not permission to widen the active Orders lane prematurely

## Remote Agent Note

If you are not on Evan's local machine, do not rely on any absolute filesystem paths from older handoff notes.

Use this bundle folder as your canonical starting point and treat paths as repo-relative from the repository root:

- bundle root: `docs/roadmaps/orders-spreadsheet-runtime/non-codex-takeover-bundle-2026-03-19/`
- broader packet root: `TERP/docs/design/spreadsheet-native-golden-flows-2026-03-18/build-source-of-truth-2026-03-19/`
- detailed ledgers root: `TERP/docs/specs/spreadsheet-native-ledgers/`

## Read Order

1. `00-protocol/AGENTS.md`
2. `00-protocol/CLAUDE.md`
3. `01-orders-execution/non-codex-takeover-prompt-2026-03-19.md`
4. `01-orders-execution/non-codex-takeover-handoff-2026-03-19.md`
5. `01-orders-execution/README.md`
6. `01-orders-execution/remaining-atomic-completion-roadmap-2026-03-19.md`
7. `01-orders-execution/ter-795-state.json`
8. `01-orders-execution/G2-runtime-gate.md`
9. `01-orders-execution/Implement.md`
10. `01-orders-execution/PowersheetGrid-boundary-contract.md`
11. `02-broader-build-source-of-truth/spreadsheet-native-build-source-of-truth.md`
12. `02-broader-build-source-of-truth/spreadsheet-native-pack-capability-ledger.csv`
13. `02-broader-build-source-of-truth/spreadsheet-native-pack-capability-ledger-summary.md`
14. `03-detailed-ledgers/*`
15. `04-design-review-context/*`

## Current Orders Execution Truth

- Active workspace branch: `codex/ter-795-sale-ord-019-20260319`
- Commit anchor: `bdcb1e39c2736bc1a1cc30bdac391c381c5e9623`
- `G1`: `closed with evidence`
- `G2`: `partial`
- `G3` through `G7`: blocked
- live-proven `G2` rows: `SALE-ORD-019`, `SALE-ORD-022`, `SALE-ORD-030`, `SALE-ORD-032`
- next active proof lane: `SALE-ORD-029`
- limitation lanes: `SALE-ORD-031`, `SALE-ORD-035`
- parked until fresh reachable build: `SALE-ORD-020`, `SALE-ORD-021`

Important nuance:

- the generated `ACTIVE_GATE_STATUS.md` snapshot may still show `SALE-ORD-020` as next
- later coordinator truth moved the next active lane to `SALE-ORD-029` because `SALE-ORD-020` is blocked on route reachability
- if new evidence changes that, update the truth honestly

## Bundle Layout

- `00-protocol`
  - local protocol files that govern this worktree
- `01-orders-execution`
  - the active Orders roadmap, handoff, gate truth, and prompt
- `02-broader-build-source-of-truth`
  - the implementation source-of-truth packet for the broader spreadsheet-native initiative
- `03-detailed-ledgers`
  - module detailed ledgers already created and reused by the broader packet
- `04-design-review-context`
  - design-review intent artifacts for context only, not implementation truth

## Working Rule

Finish Orders product-first, but preserve the broader spreadsheet-native contracts whenever shared runtime behavior, foundation seams, or future module rollout implications are in play.

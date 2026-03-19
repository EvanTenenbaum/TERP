# Orders Runtime Non-Codex Takeover Handoff

Date: `2026-03-19`
Initiative: `Orders spreadsheet-runtime rollout`
Scope: `Sales -> Orders` only
Canonical worktree: `/Users/evan/spec-erp-docker/TERP/worktrees/orders-runtime-ter-795-20260318`

## Purpose

This file is the single takeover entrypoint for a non-Codex agent that needs to drive the Orders spreadsheet-runtime roadmap to completion.

Do not restart discovery from scratch. Use this file as the canonical starting point, then retrieve only the additional artifacts needed for the current decision.

## Executive Status

- `G1` is `closed with evidence`
- `G2` is `partial`
- `G3` through `G7` are blocked by contract
- `TER-795` is the active atomic card
- `TER-796` is sealed and must stay sealed unless an isolated rerun proves a real regression

Current live-proven `G2` rows:

- `SALE-ORD-019`
- `SALE-ORD-022`
- `SALE-ORD-030`
- `SALE-ORD-032`

Current unresolved `G2` rows:

- `SALE-ORD-020`
- `SALE-ORD-021`
- `SALE-ORD-029`
- `SALE-ORD-031`
- `SALE-ORD-035`

Current row disposition:

- `SALE-ORD-020`: blocked on live Orders document-grid reachability on staging; do not keep rerunning this row on the same unreachable surface
- `SALE-ORD-021`: queued behind a fresh reachable build; use the existing paste harness in isolated `paste-only` mode
- `SALE-ORD-029`: next proof lane
- `SALE-ORD-031`: limitation lane
- `SALE-ORD-035`: limitation lane

## Locked Decisions

These are settled unless new isolated evidence disproves them:

1. Orders is the only initiative in scope. Do not widen into broad spreadsheet-native platform work.
2. `G3` through `G7` remain blocked until `G2` is `closed with evidence`.
3. `TER-796` remains sealed.
4. No more broad `G2` reruns.
5. Use one narrow live probe per row when needed, then classify honestly.
6. If a row cannot be directly proved on the current surface, package a blocker or limitation packet instead of looping.
7. The current Orders package is strong enough to share its process model, but not strong enough to authorize unrestricted cross-module technical adapter work.

## Read This First

Read in this order:

1. [AGENTS.md](/Users/evan/spec-erp-docker/TERP/worktrees/orders-runtime-ter-795-20260318/AGENTS.md)
2. [CLAUDE.md](/Users/evan/spec-erp-docker/TERP/worktrees/orders-runtime-ter-795-20260318/CLAUDE.md)
3. [Orders roadmap README](/Users/evan/spec-erp-docker/TERP/worktrees/orders-runtime-ter-795-20260318/docs/roadmaps/orders-spreadsheet-runtime/README.md)
4. [Remaining atomic completion roadmap](/Users/evan/spec-erp-docker/TERP/worktrees/orders-runtime-ter-795-20260318/docs/roadmaps/orders-spreadsheet-runtime/remaining-atomic-completion-roadmap-2026-03-19.md)
5. [TER-795 state](/Users/evan/spec-erp-docker/TERP/worktrees/orders-runtime-ter-795-20260318/docs/specs/spreadsheet-native-foundation/orders-runtime/ter-795-state.json)
6. [G2 runtime gate](/Users/evan/spec-erp-docker/TERP/worktrees/orders-runtime-ter-795-20260318/docs/specs/spreadsheet-native-foundation/orders-runtime/G2-runtime-gate.md)
7. [Implement log](/Users/evan/spec-erp-docker/TERP/worktrees/orders-runtime-ter-795-20260318/docs/specs/spreadsheet-native-foundation/orders-runtime/Implement.md)
8. [Issue manifest](/Users/evan/spec-erp-docker/TERP/worktrees/orders-runtime-ter-795-20260318/docs/specs/spreadsheet-native-foundation/orders-runtime/01-issue-manifest.json)
9. [PowersheetGrid boundary contract](/Users/evan/spec-erp-docker/TERP/worktrees/orders-runtime-ter-795-20260318/docs/specs/spreadsheet-native-foundation/orders-runtime/PowersheetGrid-boundary-contract.md)
10. [Parallel module readiness review](/Users/evan/spec-erp-docker/TERP/worktrees/orders-runtime-ter-795-20260318/docs/roadmaps/orders-spreadsheet-runtime/parallel-module-readiness-review-2026-03-19.md)

## Retrieval Contract

Do not read the whole repo unless necessary.

For current gate truth:

- [ter-795-state.json](/Users/evan/spec-erp-docker/TERP/worktrees/orders-runtime-ter-795-20260318/docs/specs/spreadsheet-native-foundation/orders-runtime/ter-795-state.json)
- [ACTIVE_GATE_STATUS.md](/Users/evan/spec-erp-docker/TERP/worktrees/orders-runtime-ter-795-20260318/docs/specs/spreadsheet-native-foundation/orders-runtime/ACTIVE_GATE_STATUS.md)
- [PROOF_BUDGET.md](/Users/evan/spec-erp-docker/TERP/worktrees/orders-runtime-ter-795-20260318/docs/specs/spreadsheet-native-foundation/orders-runtime/PROOF_BUDGET.md)

For row-specific proof work:

- [scripts/spreadsheet-native/README.md](/Users/evan/spec-erp-docker/TERP/worktrees/orders-runtime-ter-795-20260318/scripts/spreadsheet-native/README.md)
- [probe-orders-runtime-selection.ts](/Users/evan/spec-erp-docker/TERP/worktrees/orders-runtime-ter-795-20260318/scripts/spreadsheet-native/probe-orders-runtime-selection.ts)
- [probe-orders-runtime-fill-handle.ts](/Users/evan/spec-erp-docker/TERP/worktrees/orders-runtime-ter-795-20260318/scripts/spreadsheet-native/probe-orders-runtime-fill-handle.ts)
- [probe-orders-runtime-sale-ord-020.ts](/Users/evan/spec-erp-docker/TERP/worktrees/orders-runtime-ter-795-20260318/scripts/spreadsheet-native/probe-orders-runtime-sale-ord-020.ts)
- [prove-orders-runtime-g2.ts](/Users/evan/spec-erp-docker/TERP/worktrees/orders-runtime-ter-795-20260318/scripts/spreadsheet-native/prove-orders-runtime-g2.ts)

For existing evidence:

- [orders-runtime-selection-closure-packet.json](/Users/evan/spec-erp-docker/TERP/worktrees/orders-runtime-ter-795-20260318/output/playwright/orders-runtime-g2/2026-03-19/orders-runtime-selection-closure-packet.json)
- [orders-runtime-fill-handle-closure-packet.json](/Users/evan/spec-erp-docker/TERP/worktrees/orders-runtime-ter-795-20260318/output/playwright/orders-runtime-g2/2026-03-19/orders-runtime-fill-handle-closure-packet.json)
- [Claude review report](/Users/evan/.codex-runs/claude-qa/20260319T224014Z-users-evan-codex-runs-claude-qa-input-module-parallelization-rea-c8ee47/report.md)

## Product-First Execution Rules

1. Do not create more process or architecture work unless it directly unlocks a current roadmap row.
2. Every writable tranche must end in exactly one of:
   - user-facing product change
   - closure packet
   - limitation packet
   - blocker packet
3. Use targeted tests during implementation.
4. Use full repo gates only at real commit or ship points.
5. Use browser probes only when they change a roadmap outcome.
6. If a row stays blocked after one informative live attempt on the correct surface, stop and reclassify it.

## Immediate Next-Step Queue

Current recommended order:

1. `SALE-ORD-029`
2. `SALE-ORD-031`
3. `SALE-ORD-035`
4. revisit `SALE-ORD-020` only after a confirmed reachable Orders document route exists on a fresh build
5. revisit `SALE-ORD-021` only after a fresh reachable build exists

## Command Contract

Before any commit:

- `pnpm check`
- `pnpm lint`
- `pnpm test`
- `pnpm build`

Useful current commands:

- `pnpm status:orders-runtime:all`
- `pnpm proof:staging:orders-selection`
- `pnpm proof:staging:orders-fill-handle`
- `PLAYWRIGHT_BASE_URL=<fresh-build-url> tsx scripts/spreadsheet-native/prove-orders-runtime-g2.ts --mode=paste-only`

## Git And Deployment Contract

- Branch from the current Orders runtime worktree unless explicitly told otherwise.
- Push frequently after meaningful product or packet progress.
- Staging auto-deploys from `main`.
- For docs-only commits that should not deploy, add `[skip-staging-sync]` to the commit message.
- For code-bearing changes that need staging proof, follow:
  - branch
  - commit
  - PR or merge path
  - `main`
  - staging auto-deploy
  - verify build freshness
  - run one narrow live probe

## Desired Outcome

Drive the Orders roadmap to completion quickly and honestly:

- close `G2` with the smallest honest row outcomes
- then move through `G3` to `G7` in dependency order
- keep evidence, state files, roadmap docs, and tracker truth aligned
- prioritize product progress over meta-systems work

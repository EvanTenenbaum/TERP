# TERP Agent Current Truth

> Generated file. Manual edits will be overwritten by `scripts/agent-context/generate-agent-context.mjs`.

## Snapshot

- Generated: `2026-04-17T20:58:10.890Z`
- Freshness status: `partial`
- Refresh command: `pnpm context:refresh`
- Drift check: `pnpm context:check`
- Git anchor: `328edd7` on branch `claude/terp-status-review-Av2Wq`
- Working tree dirty: `true`
- Linear mode: `last-known`

## Start Here

1. Read `AGENTS.md`.
2. Read `CLAUDE.md`.
3. Read this file, then use `docs/agent-context/state.json` if you need machine-readable truth.
4. If your work is in Orders runtime, jump to `docs/specs/spreadsheet-native-foundation/orders-runtime/ter-795-state.json` next.
5. Do not start by scanning `MASTER_ROADMAP.md`, `ACTIVE_SESSIONS.md`, or old prompt-pack docs for current direction.

## Current Direction

Current TERP direction centers on inventory, intake, and purchase operations and orders and order workflow; recent git activity is anchored at 328edd7 and is dominated by `feat(420-fork): Waves 1-5 + P2 Tranche 1 — UI overhaul, enum humanization, product identity, portable cuts, consignment payout (#579)`, `feat(ui): advance april 9 ticket train remediation (#578)`, `fix(notifications): improve inline triage and empty states (#577)`, `feat: payment follow-up + pick list + dashboard ops (#576)`; Linear currently emphasizes `Spreadsheet-Native Full Rollout`, `TERP - Orders Spreadsheet Runtime Rollout`, `March 10 Recording Backlog Closure`.

- inventory, intake, and purchase operations
- orders and order workflow
- operator workflow polish
- spreadsheet-native rollout

## Freshness Notes

- Linear could not be refreshed live, so the tracker section fell back to the last known snapshot (2026-04-08T03:11:06.962Z).
- Working tree contains local edits. This bundle captures committed truth at HEAD and reports that local diffs exist.

## Active Projects

- `Spreadsheet-Native Full Rollout` [started] updated 2026-03-20 - https://linear.app/terpcorp/project/spreadsheet-native-full-rollout-fbd82fc3571e
- `TERP - Orders Spreadsheet Runtime Rollout` [backlog] updated 2026-03-17 - https://linear.app/terpcorp/project/terp-orders-spreadsheet-runtime-rollout-0f792b7787cc
- `March 10 Recording Backlog Closure` [planned] updated 2026-03-11 - https://linear.app/terpcorp/project/march-10-recording-backlog-closure-e375ae6ec54a
- `TERP - Sprint 2026-03-09 Open Bugs + Mobile UX Hardening` [backlog] updated 2026-03-09 - https://linear.app/terpcorp/project/terp-sprint-2026-03-09-open-bugs-mobile-ux-hardening-0a5bca1df82d
- `TERP - Sales Sheet UX + Artifact Quality (User Testing Ready)` [backlog] updated 2026-02-24 - https://linear.app/terpcorp/project/terp-sales-sheet-ux-artifact-quality-user-testing-ready-ffbf645b28e0
- `TERP - Immediate Phase: Broken Buttons & Interaction Reliability` [backlog] updated 2026-02-11 - https://linear.app/terpcorp/project/terp-immediate-phase-broken-buttons-and-interaction-reliability-ba50b992584c

## Recent High-Signal Issues

- `TER-1065` (normal, 2026-04-08) - [P2-19] Contact activity/communication log for payments follow-up tracking
- `TER-1063` (normal, 2026-04-08) - [P2-17] Shipping/fulfillment: generate pick list from confirmed orders with batch locations
- `TER-1056` (normal, 2026-04-08) - [P2-10] Dashboard: activity feed showing recent orders, payments, intake since last session
- `TER-1055` (normal, 2026-04-08) - [P2-09] Dashboard: add operational KPIs - expected deliveries, pending fulfillment, appointments today
- `TER-1066` (high, 2026-04-08) - [P2-20] Remaining initiative: spec-driven seam execution framework | Spreadsheet-Native Full Rollout
- `TER-1048` (high, 2026-04-08) - [P2-02] Inventory: default filter to LIVE status, human-readable status labels across all grids
- `TER-1053` (normal, 2026-04-06) - [P2-07] Inventory row action: Add to Order button to start order from inventory context
- `TER-1052` (high, 2026-04-06) - [P2-06] Order creator: show client credit, balance, and recent order history before adding items
- `TER-1051` (normal, 2026-04-06) - [P2-05] Product name display: show strain/product name prominently, supplier as secondary text
- `TER-1050` (high, 2026-04-06) - [P2-04] Sales Catalogue: fast access + shareable link generation for chat-based client communication
- `TER-1049` (high, 2026-04-06) - [P2-03] Cmd+K search: include products and inventory batches in global search
- `TER-1047` (high, 2026-04-06) - [P2-01] Inventory grid: add Price, COGS, Margin columns to default view

## Program-Specific Machine State

- Orders runtime: `G2` / `closed with evidence` (updated 2026-03-20) - TER-795 is closed with evidence. Keep G2 sealed and follow the reopened G6 rollout verdict for the remaining retirement remediation work.

## Recent Commits

- 2026-04-15 `328edd7` feat(420-fork): Waves 1-5 + P2 Tranche 1 — UI overhaul, enum humanization, product identity, portable cuts, consignment payout (#579)
- 2026-04-10 `d970ebe` feat(ui): advance april 9 ticket train remediation (#578)
- 2026-04-09 `46d9738` fix(notifications): improve inline triage and empty states (#577)
- 2026-04-08 `f1a1abb` feat: payment follow-up + pick list + dashboard ops (#576)
- 2026-04-08 `8e73fc6` docs(context): refresh startup truth after P2 closeout (#575)
- 2026-04-08 `e760614` docs(p2): close TER-1071 deferred pass (#574)
- 2026-04-08 `1b7e493` feat(po): close TER-1070 tranche 3 continuity (#573)
- 2026-04-08 `db28993` feat(sales): close TER-1069 retrieval continuity (#572)
- 2026-04-08 `8e019eb` feat(ux): close TER-1068 tranche 1 (#571)
- 2026-04-08 `7586564` fix(ux): land TER-1067 recovery and canonical P2 packet (#570)

## What Not To Trust As Current Startup Truth

- `docs/ACTIVE_SESSIONS.md` - stale session registry that still looks live | declared last updated 2026-02-04
- `docs/PROJECT_CONTEXT.md` - historical orientation snapshot, not current runtime truth | declared last updated October 27, 2025
- `docs/TERP_AGENT_INSTRUCTIONS.md` - older prompt-pack instructions that still point at legacy roadmap flow | declared last updated 2026-02-01
- `docs/ROADMAP_AGENT_GUIDE.md` - older roadmap guide that still says MASTER_ROADMAP is current
- `product-management/START_HERE.md` - separate PM system entrypoint, not the live TERP repo startup contract

## Drill Deeper Next

- `docs/specs/spreadsheet-native-foundation/orders-runtime/ter-795-state.json` - machine-readable Orders runtime verdicts and next move
- `docs/roadmaps/orders-spreadsheet-runtime/README.md` - Orders runtime gate roadmap and tranche layout
- `docs/design/spreadsheet-native-golden-flows-2026-03-18/build-source-of-truth-2026-03-19/spreadsheet-native-build-source-of-truth.md` - broader spreadsheet-native preservation packet and source precedence rules
- `docs/TESTING.md` - canonical verification commands and E2E guidance

## Keep This Fresh

- Run `pnpm context:refresh` after meaningful tracker checkpoints, before remote-agent handoff, and after merges to `main`.
- Run `pnpm context:check` when you want to know if this bundle has fallen behind git or Linear.
- If Linear cannot be refreshed, this file should say so explicitly instead of pretending the tracker snapshot is current.


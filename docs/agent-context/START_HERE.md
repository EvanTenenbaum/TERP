# TERP Agent Current Truth

> Generated file. Manual edits will be overwritten by `scripts/agent-context/generate-agent-context.mjs`.

## Snapshot

- Generated: `2026-04-06T21:36:20.025Z`
- Freshness status: `fresh`
- Refresh command: `pnpm context:refresh`
- Drift check: `pnpm context:check`
- Git anchor: `2d340c13` on branch `codex/push-po-surfaces-to-95`
- Working tree dirty: `true`
- Linear mode: `live`

## Start Here

1. Read `AGENTS.md`.
2. Read `CLAUDE.md`.
3. Read this file, then use `docs/agent-context/state.json` if you need machine-readable truth.
4. If your work is in Orders runtime, jump to `docs/specs/spreadsheet-native-foundation/orders-runtime/ter-795-state.json` next.
5. Do not start by scanning `MASTER_ROADMAP.md`, `ACTIVE_SESSIONS.md`, or old prompt-pack docs for current direction.

## Current Direction

Current TERP direction centers on accounting, payments, and ledger work and unified operational surfaces; recent git activity is anchored at 2d340c13 and is dominated by `fix(po): restore default payment terms on create`, `fix(po): persist edit-mode line items and harden PO QA`, `test(surfaces): deepen behavioral coverage and polish inventory/po UX`, `feat(accounting): unified sheet-native surfaces for all 9 tabs`; Linear currently emphasizes `Spreadsheet-Native Full Rollout`, `TERP - Orders Spreadsheet Runtime Rollout`, `March 10 Recording Backlog Closure`.

- accounting, payments, and ledger work
- unified operational surfaces
- inventory, intake, and purchase operations
- spreadsheet-native rollout

## Freshness Notes

- Tracker data was refreshed live from Linear.
- Working tree contains local edits. This bundle captures committed truth at HEAD and reports that local diffs exist.

## Active Projects

- `Spreadsheet-Native Full Rollout` [started] updated 2026-03-20 - https://linear.app/terpcorp/project/spreadsheet-native-full-rollout-fbd82fc3571e
- `TERP - Orders Spreadsheet Runtime Rollout` [backlog] updated 2026-03-17 - https://linear.app/terpcorp/project/terp-orders-spreadsheet-runtime-rollout-0f792b7787cc
- `March 10 Recording Backlog Closure` [planned] updated 2026-03-11 - https://linear.app/terpcorp/project/march-10-recording-backlog-closure-e375ae6ec54a
- `TERP - Sprint 2026-03-09 Open Bugs + Mobile UX Hardening` [backlog] updated 2026-03-09 - https://linear.app/terpcorp/project/terp-sprint-2026-03-09-open-bugs-mobile-ux-hardening-0a5bca1df82d
- `TERP - Sales Sheet UX + Artifact Quality (User Testing Ready)` [backlog] updated 2026-02-24 - https://linear.app/terpcorp/project/terp-sales-sheet-ux-artifact-quality-user-testing-ready-ffbf645b28e0
- `TERP - Immediate Phase: Broken Buttons & Interaction Reliability` [backlog] updated 2026-02-11 - https://linear.app/terpcorp/project/terp-immediate-phase-broken-buttons-and-interaction-reliability-ba50b992584c

## Recent High-Signal Issues

- `TER-1065` (normal, 2026-04-06) - [P2-19] Contact activity/communication log for payments follow-up tracking
- `TER-1064` (normal, 2026-04-06) - [P2-18] Human-readable status labels across all grids - replace AWAITING_INTAKE, LIVE, CONSIGNMENT with plain English
- `TER-1063` (normal, 2026-04-06) - [P2-17] Shipping/fulfillment: generate pick list from confirmed orders with batch locations
- `TER-1062` (normal, 2026-04-06) - [P2-16] Order status: searchable by client name from Cmd+K and orders queue
- `TER-1061` (high, 2026-04-06) - [P2-15] Unified contact view: show buyer history + seller history + AR + AP for dual-role contacts
- `TER-1060` (normal, 2026-04-06) - [P2-14] Intake: expected deliveries today view for warehouse shift start
- `TER-1059` (high, 2026-04-06) - [P2-13] Intake: add PO reference column linking intake rows to originating purchase order
- `TER-1058` (normal, 2026-04-06) - [P2-12] Accounting: show balance update confirmation after recording a payment
- `TER-1057` (high, 2026-04-06) - [P2-11] Accounting: add client phone/email columns to overdue invoices table
- `TER-1056` (normal, 2026-04-06) - [P2-10] Dashboard: activity feed showing recent orders, payments, intake since last session
- `TER-1055` (normal, 2026-04-06) - [P2-09] Dashboard: add operational KPIs - expected deliveries, pending fulfillment, appointments today
- `TER-1054` (normal, 2026-04-06) - [P2-08] Quick copy: clipboard-friendly formatted inventory list for pasting into chat apps

## Program-Specific Machine State

- Orders runtime: `G2` / `closed with evidence` (updated 2026-03-20) - TER-795 is closed with evidence. Keep G2 sealed and follow the reopened G6 rollout verdict for the remaining retirement remediation work.

## Recent Commits

- 2026-03-28 `2d340c13` fix(po): restore default payment terms on create
- 2026-03-27 `20f92f37` fix(po): persist edit-mode line items and harden PO QA
- 2026-03-27 `23043bab` test(surfaces): deepen behavioral coverage and polish inventory/po UX
- 2026-03-27 `eb49635a` feat(accounting): unified sheet-native surfaces for all 9 tabs
- 2026-03-27 `39843216` feat: unified sheet-native surfaces for Inventory + Purchase Orders (#531)
- 2026-03-27 `666157b4` chore(accounting): retire classic and pilot surfaces — ~10K lines removed
- 2026-03-27 `3b032245` style(accounting): Dashboard density pass — match unified surfaces
- 2026-03-27 `5481d18d` fix(surfaces): address QA review — edit button, undo, submit flow, dead code
- 2026-03-27 `035bba43` feat(accounting): wire Phase 3 — all 9 tabs now unified sheet-native
- 2026-03-27 `4a6a92f6` feat(bank-transactions): add BankTransactionsSurface editable grid with reconciliation

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

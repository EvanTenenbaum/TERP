# TERP Persistent PM

> Generated file. Manual edits will be overwritten by `scripts/agent-context/generate-agent-context.mjs`.

## Snapshot

- Generated: `2026-04-20T21:35:58.176Z`
- Freshness status: `partial`
- Manifest: `docs/agent-context/manifest.json`
- Refresh command: `pnpm context:refresh`
- Drift check: `pnpm context:check`
- PM launch readiness: `pnpm pm:launch:check`
- Git anchor: `ddfee7c` on branch `claude/onboard-terp-agent-pgtSc`
- Working tree dirty: `false`
- Linear mode: `last-known`
- Decision log count: `0`

## Canonical PM Bundle

- `docs/agent-context/START_HERE.md` - human-readable PM bootstrap
- `docs/agent-context/manifest.json` - freshness, TTLs, and artifact hashes
- `docs/agent-context/state.json` - machine-readable PM state and trust ladder
- `docs/agent-context/work.json` - remaining work queue and readiness ordering
- `docs/agent-context/evidence.json` - proof pointers backing current claims
- `docs/agent-context/decisions.ndjson` - append-only PM decision log
- `docs/agent-context/clients.json` - client registry and trust levels
- `docs/agent-context/bootstrap/` - per-surface startup instructions and paste-in prompts

## Shared Live Bundle For All TERP Worktrees

- Shared bundle root: `/home/user/TERP/.git/persistent-pm/current`
- Shared entrypoint: `/home/user/TERP/.git/persistent-pm/current/START_HERE.md`
- Shared manifest: `/home/user/TERP/.git/persistent-pm/current/manifest.json`
- Shared machine state: `/home/user/TERP/.git/persistent-pm/current/state.json`
- Shared work map: `/home/user/TERP/.git/persistent-pm/current/work.json`
- Locator command: `git rev-parse --git-common-dir`

## Start Here

1. Read `AGENTS.md`.
2. Read `CLAUDE.md`.
3. If you are in any TERP worktree, prefer the shared live bundle under `/home/user/TERP/.git/persistent-pm/current`.
4. Read this file or the shared entrypoint.
5. Confirm freshness and hashes in the shared or repo-local `manifest.json`.
6. Use the shared or repo-local `state.json` and `work.json` for machine-readable truth.
7. If you are resuming from a hosted, cloud, or newly onboarded surface, load the matching file under `docs/agent-context/bootstrap/`.
8. Never treat `product-management/START_HERE.md`, `docs/ACTIVE_SESSIONS.md`, or old prompt-pack docs as authoritative PM state.

## Current Direction

Current TERP direction centers on inventory, intake, and purchase operations and QA, proof, and rollout hardening; recent git activity is anchored at ddfee7c and led by `chore(policy): require adversarial QA + self-healing before ticket completion`, `chore(infra): remove local TSC from pre-commit hook`, `chore(infra): remove local TSC from DONE.sh, add CI-wait poll loop`, `fix(client): Wave 0 client bugs - TER-640/1150/1151/1152/1153/1154/1155 (#590)`; Linear currently emphasizes `Spreadsheet-Native Full Rollout`, `TERP - Orders Spreadsheet Runtime Rollout`, `March 10 Recording Backlog Closure`.

- inventory, intake, and purchase operations
- QA, proof, and rollout hardening
- orders and order workflow
- accounting, payments, and ledger work

## Trust Ladder

- First-class writers: Hermes, Codex Mac app, Codex CLI (local), Claude Code CLI (local)
- Conditional first-class writers: Claude Mac app (drop to mediated-writer until local refresh/check support is validated).
- Mediated writers: Codex cloud, Codex CLI (cloud), Claude Code cloud, Claude Code CLI (cloud)
- Read-only by default: claude.ai, Future new model/service

## Attention Required

- [medium] Linear snapshot fell back to last-known state and should be refreshed before authoritative writes.

## Freshness Notes

- Linear could not be refreshed live, so tracker sections fell back to the last known snapshot (2026-04-08T03:11:06.962Z).
- Attention-required conflicts are active. Read the Attention Required section before claiming startup truth is settled.

## Top Ready Work

- `TER-1065` (normal, ready) - [P2-19] Contact activity/communication log for payments follow-up tracking
- `TER-1063` (normal, ready) - [P2-17] Shipping/fulfillment: generate pick list from confirmed orders with batch locations
- `TER-1056` (normal, ready) - [P2-10] Dashboard: activity feed showing recent orders, payments, intake since last session
- `TER-1055` (normal, ready) - [P2-09] Dashboard: add operational KPIs - expected deliveries, pending fulfillment, appointments today
- `TER-1066` (high, ready) - [P2-20] Remaining initiative: spec-driven seam execution framework | Spreadsheet-Native Full Rollout
- `TER-1048` (high, ready) - [P2-02] Inventory: default filter to LIVE status, human-readable status labels across all grids

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

## Recent PM Bootstraps

- `docs/agent-context/bootstrap/claude-code-cli-local.md` - Claude Code CLI (local) [first-class-writer]
- `docs/agent-context/bootstrap/codex-cli-local.md` - Codex CLI (local) [first-class-writer]
- `docs/agent-context/bootstrap/codex-mac-app.md` - Codex Mac app [first-class-writer]
- `docs/agent-context/bootstrap/hermes.md` - Hermes [first-class-writer]
- `docs/agent-context/bootstrap/claude-mac-app.md` - Claude Mac app [conditional-first-class-writer]
- `docs/agent-context/bootstrap/claude-code-cli-cloud.md` - Claude Code CLI (cloud) [mediated-writer]
- `docs/agent-context/bootstrap/claude-code-cloud.md` - Claude Code cloud [mediated-writer]
- `docs/agent-context/bootstrap/codex-cli-cloud.md` - Codex CLI (cloud) [mediated-writer]
- `docs/agent-context/bootstrap/codex-cloud.md` - Codex cloud [mediated-writer]
- `docs/agent-context/bootstrap/claude-ai.md` - claude.ai [read-only]
- `docs/agent-context/bootstrap/any-llm.md` - Future new model/service [read-only]

## What Not To Trust As Current Startup Truth

- `docs/ACTIVE_SESSIONS.md` - legacy session registry snapshot; redirects correctly | declared last updated 2026-02-04
- `docs/PROJECT_CONTEXT.md` - historical orientation packet; redirects correctly | declared last updated October 27, 2025
- `docs/TERP_AGENT_INSTRUCTIONS.md` - legacy onboarding prompt-pack file; redirects correctly | declared last updated 2026-02-01
- `docs/ROADMAP_AGENT_GUIDE.md` - legacy roadmap guide; redirects correctly
- `product-management/START_HERE.md` - legacy PM entrypoint; redirects correctly
- `agent-prompts/README.md` - legacy prompt-pack entrypoint; redirects correctly

## Keep This Fresh

- Run `pnpm context:refresh` after meaningful checkpoints, before remote-agent handoff, and after merges to `main`.
- Run `pnpm context:check` before claiming the PM bundle is fresh enough for authoritative work.
- Run `pnpm pm:launch:check` to decide whether the persistent PM system itself is safe to launch or keep using.
- If a committed PM snapshot trails `git HEAD`, rerun `pnpm pm:launch:check` or `pnpm context:refresh` before treating that lag as a PM outage.
- Every refresh/checkpoint also updates the shared live bundle in `/home/user/TERP/.git/persistent-pm/current` so other TERP worktrees can see the same PM state.
- Never hand-edit `state.json`, `work.json`, `evidence.json`, or `manifest.json`.
- First-class writers should mutate PM state only through the mediator (`pm.appendDecision` / `pm.checkpoint`) or an intentional PR append to `decisions.ndjson`.

## PM Launch Contract

- `pnpm pm:launch:check` is the scoped gate for PM availability and PM runtime launch.
- Unrelated TERP product or UI failures in `pnpm test`, `pnpm build`, or other broad repo checks do not by themselves disable the PM system.
- Full repo verification still matters when shipping TERP application changes, but it is not a prerequisite for using the PM system to coordinate or repair that work.
- A committed PM bundle snapshot may temporarily lag one commit behind `HEAD`; live PM readiness comes from a fresh run of `pnpm pm:launch:check`, not from assuming the tracked snapshot is self-updating.

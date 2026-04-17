# TERP Persistent PM

> Generated file. Manual edits will be overwritten by `scripts/agent-context/generate-agent-context.mjs`.

## Snapshot

- Generated: `2026-04-17T21:55:08.224Z`
- Freshness status: `fresh`
- Manifest: `docs/agent-context/manifest.json`
- Refresh command: `pnpm context:refresh`
- Drift check: `pnpm context:check`
- PM launch readiness: `pnpm pm:launch:check`
- Git anchor: `250eba1c` on branch `codex/persistent-pm-hardening-20260417`
- Working tree dirty: `true`
- Linear mode: `live`
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

- Shared bundle root: `/Users/evan/spec-erp-docker/TERP/TERP/.git/persistent-pm/current`
- Shared entrypoint: `/Users/evan/spec-erp-docker/TERP/TERP/.git/persistent-pm/current/START_HERE.md`
- Shared manifest: `/Users/evan/spec-erp-docker/TERP/TERP/.git/persistent-pm/current/manifest.json`
- Shared machine state: `/Users/evan/spec-erp-docker/TERP/TERP/.git/persistent-pm/current/state.json`
- Shared work map: `/Users/evan/spec-erp-docker/TERP/TERP/.git/persistent-pm/current/work.json`
- Locator command: `git rev-parse --git-common-dir`

## Start Here

1. Read `AGENTS.md`.
2. Read `CLAUDE.md`.
3. If you are in any TERP worktree, prefer the shared live bundle under `/Users/evan/spec-erp-docker/TERP/TERP/.git/persistent-pm/current`.
4. Read this file or the shared entrypoint.
5. Confirm freshness and hashes in the shared or repo-local `manifest.json`.
6. Use the shared or repo-local `state.json` and `work.json` for machine-readable truth.
7. If you are resuming from a hosted, cloud, or newly onboarded surface, load the matching file under `docs/agent-context/bootstrap/`.
8. Never treat `product-management/START_HERE.md`, `docs/ACTIVE_SESSIONS.md`, or old prompt-pack docs as authoritative PM state.

## Current Direction

Current TERP direction centers on persistent PM and handoff durability and QA, proof, and rollout hardening; recent git activity is anchored at 250eba1c and led by `fix(pm): fall back to user launchctl domain`, `feat(pm): add scoped launch readiness gate`, `test(pm): align fixtures with Claude protocol`, `fix(pm): normalize Claude protocol casing`; Linear currently emphasizes `Spreadsheet-Native Full Rollout`, `TERP - Orders Spreadsheet Runtime Rollout`, `March 10 Recording Backlog Closure`.

- persistent PM and handoff durability
- QA, proof, and rollout hardening
- spreadsheet-native rollout
- orders and order workflow

## Trust Ladder

- First-class writers: Hermes, Codex Mac app, Codex CLI (local), Claude Code CLI (local)
- Conditional first-class writers: Claude Mac app (drop to mediated-writer until local refresh/check support is validated).
- Mediated writers: Codex cloud, Codex CLI (cloud), Claude Code cloud, Claude Code CLI (cloud)
- Read-only by default: claude.ai, Future new model/service

## Attention Required

- No open PM conflicts are currently recorded.

## Freshness Notes

- Tracker data was refreshed live from Linear.
- Working tree contains local edits. This bundle reports committed truth at HEAD and notes that local diffs exist.

## Top Ready Work

- `TER-1073` (high, ready) - [P2-22B] Portable cuts and saved-cut continuity across selling surfaces | Spreadsheet-Native Full Rollout
- `TER-1052` (high, ready) - [P2-06] Order creator: show client credit, balance, and recent order history before adding items

## Active Projects

- `Spreadsheet-Native Full Rollout` [started] updated 2026-03-20 - https://linear.app/terpcorp/project/spreadsheet-native-full-rollout-fbd82fc3571e
- `TERP - Orders Spreadsheet Runtime Rollout` [backlog] updated 2026-03-17 - https://linear.app/terpcorp/project/terp-orders-spreadsheet-runtime-rollout-0f792b7787cc
- `March 10 Recording Backlog Closure` [planned] updated 2026-03-11 - https://linear.app/terpcorp/project/march-10-recording-backlog-closure-e375ae6ec54a
- `TERP - Sprint 2026-03-09 Open Bugs + Mobile UX Hardening` [backlog] updated 2026-03-09 - https://linear.app/terpcorp/project/terp-sprint-2026-03-09-open-bugs-mobile-ux-hardening-0a5bca1df82d
- `TERP - Sales Sheet UX + Artifact Quality (User Testing Ready)` [backlog] updated 2026-02-24 - https://linear.app/terpcorp/project/terp-sales-sheet-ux-artifact-quality-user-testing-ready-ffbf645b28e0
- `TERP - Immediate Phase: Broken Buttons & Interaction Reliability` [backlog] updated 2026-02-11 - https://linear.app/terpcorp/project/terp-immediate-phase-broken-buttons-and-interaction-reliability-ba50b992584c
- `TERP - Golden Flows Beta` [backlog] updated 2026-02-03 - https://linear.app/terpcorp/project/terp-golden-flows-beta-1fd329c5978d

## Recent High-Signal Issues

- `TER-1073` (high, 2026-04-15) - [P2-22B] Portable cuts and saved-cut continuity across selling surfaces | Spreadsheet-Native Full Rollout
- `TER-1052` (high, 2026-04-15) - [P2-06] Order creator: show client credit, balance, and recent order history before adding items
- `TER-1139` (normal, 2026-04-09) - [UI-XA6] Verify workflow confirmations exist for destructive/creation actions
- `TER-1138` (low, 2026-04-09) - [UI-XA5] Verify key workflows reachable in ≤3 clicks
- `TER-1137` (normal, 2026-04-09) - [UI-XA4] Verify cross-module contextual links exist
- `TER-1136` (normal, 2026-04-09) - [UI-XA3] Verify primary action columns visible at 1280px on all tables
- `TER-1135` (low, 2026-04-09) - [UI-XA2] Verify page title is visually dominant on all workspace pages
- `TER-1134` (low, 2026-04-09) - [UI-XA1] Audit column header / row prefix duplication
- `TER-1133` (low, 2026-04-09) - [UI-NT5] Add contextual empty states per notification category
- `TER-1132` (normal, 2026-04-09) - [UI-NT4] Add inline "mark read" button per notification row
- `TER-1131` (normal, 2026-04-09) - [UI-NT3] Differentiate urgent/exception notifications visually
- `TER-1130` (normal, 2026-04-09) - [UI-NT2] Strengthen unread notification row visual distinction
- `TER-1129` (normal, 2026-04-09) - [UI-NT1] Split notifications into FYI vs needs-action categories
- `TER-1128` (low, 2026-04-09) - [UI-AC3] Verify summary dashboard cards reflect active filters
- `TER-1127` (normal, 2026-04-09) - [UI-AC2] Replace plain-text loading states with table-shaped skeletons
- `TER-1126` (normal, 2026-04-09) - [UI-AC1] Add financial period to workspace header meta
- `TER-1125` (normal, 2026-04-09) - [UI-RP4] Verify scroll/filter preservation on table→profile navigation
- `TER-1124` (normal, 2026-04-09) - [UI-RP3] Add "status" column to client table
- `TER-1123` (normal, 2026-04-09) - [UI-RP2] Add "last activity" column to client table
- `TER-1122` (high, 2026-04-09) - [UI-RP1] Fix ClientProfilePage role badges to use semantic colors

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
- Every refresh/checkpoint also updates the shared live bundle in `/Users/evan/spec-erp-docker/TERP/TERP/.git/persistent-pm/current` so other TERP worktrees can see the same PM state.
- Never hand-edit `state.json`, `work.json`, `evidence.json`, or `manifest.json`.
- First-class writers should mutate PM state only through the mediator (`pm.appendDecision` / `pm.checkpoint`) or an intentional PR append to `decisions.ndjson`.

## PM Launch Contract

- `pnpm pm:launch:check` is the scoped gate for PM availability and PM runtime launch.
- Unrelated TERP product or UI failures in `pnpm test`, `pnpm build`, or other broad repo checks do not by themselves disable the PM system.
- Full repo verification still matters when shipping TERP application changes, but it is not a prerequisite for using the PM system to coordinate or repair that work.

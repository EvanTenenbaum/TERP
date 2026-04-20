# TERP Persistent PM

> Sanitized public mirror. Generated from the repo-backed PM bundle.

## Snapshot

- Generated: `2026-04-20T21:35:58.176Z`
- Freshness status: `partial`
- Git anchor: `ddfee7c`
- Linear mode: `last-known`

## Public Read Order

1. Read `manifest.json` and confirm the PM bundle is fresh enough for your task.
2. Read this file.
3. Use `state.json` for machine-readable PM state and `work.json` for remaining work order.
4. If you are a hosted or newly onboarded surface, use the matching bootstrap file from the private repo or ask for the paste-in bootstrap packet.
5. If you need to change PM state from a hosted or read-only surface, emit a structured proposal instead of editing generated files directly.

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

## Top Ready Work

- `TER-1065` (normal, ready) - [P2-19] Contact activity/communication log for payments follow-up tracking
- `TER-1063` (normal, ready) - [P2-17] Shipping/fulfillment: generate pick list from confirmed orders with batch locations
- `TER-1056` (normal, ready) - [P2-10] Dashboard: activity feed showing recent orders, payments, intake since last session
- `TER-1055` (normal, ready) - [P2-09] Dashboard: add operational KPIs - expected deliveries, pending fulfillment, appointments today
- `TER-1066` (high, ready) - [P2-20] Remaining initiative: spec-driven seam execution framework | Spreadsheet-Native Full Rollout
- `TER-1048` (high, ready) - [P2-02] Inventory: default filter to LIVE status, human-readable status labels across all grids

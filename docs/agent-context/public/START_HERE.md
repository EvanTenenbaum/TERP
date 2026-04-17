# TERP Persistent PM

> Sanitized public mirror. Generated from the repo-backed PM bundle.

## Snapshot

- Generated: `2026-04-17T21:50:54.570Z`
- Freshness status: `fresh`
- Git anchor: `65e34559`
- Linear mode: `live`

## Public Read Order

1. Read `manifest.json` and confirm the PM bundle is fresh enough for your task.
2. Read this file.
3. Use `state.json` for machine-readable PM state and `work.json` for remaining work order.
4. If you are a hosted or newly onboarded surface, use the matching bootstrap file from the private repo or ask for the paste-in bootstrap packet.
5. If you need to change PM state from a hosted or read-only surface, emit a structured proposal instead of editing generated files directly.

## Current Direction

Current TERP direction centers on persistent PM and handoff durability and QA, proof, and rollout hardening; recent git activity is anchored at 65e34559 and led by `feat(pm): add scoped launch readiness gate`, `test(pm): align fixtures with Claude protocol`, `fix(pm): normalize Claude protocol casing`, `fix(pm): declare MCP sdk and stabilize CI`; Linear currently emphasizes `Spreadsheet-Native Full Rollout`, `TERP - Orders Spreadsheet Runtime Rollout`, `March 10 Recording Backlog Closure`.

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

- No open PM conflicts are currently surfaced.

## Top Ready Work

- `TER-1073` (high, ready) - [P2-22B] Portable cuts and saved-cut continuity across selling surfaces | Spreadsheet-Native Full Rollout
- `TER-1052` (high, ready) - [P2-06] Order creator: show client credit, balance, and recent order history before adding items

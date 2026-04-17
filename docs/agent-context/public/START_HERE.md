# TERP Persistent PM

> Sanitized public mirror. Generated from the repo-backed PM bundle.

## Snapshot

- Generated: `2026-04-17T20:53:00.961Z`
- Freshness status: `fresh`
- Git anchor: `328edd74`
- Linear mode: `live`

## Public Read Order

1. Read `manifest.json` and confirm the PM bundle is fresh enough for your task.
2. Read this file.
3. Use `state.json` for machine-readable PM state and `work.json` for remaining work order.
4. If you are a hosted or newly onboarded surface, use the matching bootstrap file from the private repo or ask for the paste-in bootstrap packet.
5. If you need to change PM state from a hosted or read-only surface, emit a structured proposal instead of editing generated files directly.

## Current Direction

Current TERP direction centers on orders and order workflow and spreadsheet-native rollout; recent git activity is anchored at 328edd74 and led by `feat(420-fork): Waves 1-5 + P2 Tranche 1 — UI overhaul, enum humanization, product identity, portable cuts, consignment payout (#579)`, `feat(ui): advance april 9 ticket train remediation (#578)`, `fix(notifications): improve inline triage and empty states (#577)`, `feat: payment follow-up + pick list + dashboard ops (#576)`; Linear currently emphasizes `Spreadsheet-Native Full Rollout`, `TERP - Orders Spreadsheet Runtime Rollout`, `March 10 Recording Backlog Closure`.

- orders and order workflow
- spreadsheet-native rollout
- QA, proof, and rollout hardening
- persistent PM and handoff durability

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

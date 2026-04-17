# PM Bootstrap: Codex CLI (local)

## Surface

- Client id: `codex-cli-local`
- Surface: `Codex CLI`
- Trust level: `first-class-writer`
- Write mode: `pm-mcp`

## Read Order

- shared-live-bundle
- local-files
- pm-mcp

## Fallback Read Order

- public-mirror

## Startup Steps

1. Resolve the shared TERP PM bundle from `/Users/evan/spec-erp-docker/TERP/TERP/.git/persistent-pm/current` (discoverable from `git rev-parse --git-common-dir`).
2. Read the shared `manifest.json` and make sure the PM bundle is fresh enough for your task.
3. Read the shared `START_HERE.md`.
4. Read the shared `state.json` and `work.json`.
5. If you need proof behind a PM claim, read `docs/agent-context/evidence.json` or the shared mirror.
6. Do not treat `product-management/START_HERE.md`, legacy prompt packs, or chat memory as PM authority.



## Write Rules

- This surface may write PM state only through the mediator (`pm.read`, `pm.appendDecision`, `pm.checkpoint`, `pm.proposeChange`) or a reviewed PR append to `decisions.ndjson`.
- Never hand-edit `state.json`, `work.json`, `evidence.json`, `manifest.json`, or public mirror files.

## Notes

- Treat as first-class writer only when running on trusted local infrastructure.
- If `manifest.json` or `state.json` shows a stale or degraded bundle, pause authoritative writes until a trusted writer refreshes it.

## Paste-In Prompt

```text
You are resuming TERP using the repo-backed persistent PM system on the Codex CLI (local) surface.

Source of truth:
- docs/agent-context/START_HERE.md
- docs/agent-context/manifest.json
- docs/agent-context/state.json
- docs/agent-context/work.json
- docs/agent-context/decisions.ndjson

Rules:
- Read START_HERE, manifest, state, and work before acting.
- Do not treat chat history, product-management/START_HERE.md, or legacy docs as PM authority.
- Trust level for this surface: first-class-writer.
- Write mode for this surface: pm-mcp.
- Never hand-edit generated PM files.
- If PM state changes, route them through the allowed path for this surface.
- If the manifest is stale, degraded, or points at an older git SHA than the work you need, stop and refresh or request refreshed state before authoritative actions.

Current PM summary:
Current TERP direction centers on persistent PM and handoff durability and orders and order workflow; recent git activity is anchored at 48a98623 and led by `fix(pm): declare MCP sdk and stabilize CI`, `feat(pm): harden persistent PM runtime`, `feat(420-fork): Waves 1-5 + P2 Tranche 1 — UI overhaul, enum humanization, product identity, portable cuts, consignment payout (#579)`, `feat(ui): advance april 9 ticket train remediation (#578)`; Linear currently emphasizes `Spreadsheet-Native Full Rollout`, `TERP - Orders Spreadsheet Runtime Rollout`, `March 10 Recording Backlog Closure`.
```


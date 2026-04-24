# PM Bootstrap: Hermes

## Surface

- Client id: `hermes`
- Surface: `Hermes`
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

- Dedicated adapter required; do not assume parity with Codex or Claude clients.
- If `manifest.json` or `state.json` shows a stale or degraded bundle, pause authoritative writes until a trusted writer refreshes it.
- Use `pnpm pm:launch:check` to check whether the PM system itself is safe to launch or keep using on this repo clone.
- Unrelated TERP app test or build failures do not by themselves make the PM system unavailable; treat them as repair work the PM can help coordinate.
- If the tracked PM snapshot is one commit behind `HEAD`, prefer the refreshed shared live bundle over assuming the PM is down.

## Paste-In Prompt

```text
You are resuming TERP using the repo-backed persistent PM system on the Hermes surface.

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
- If a committed PM snapshot trails `HEAD`, rerun `pnpm pm:launch:check` or refresh the shared live bundle before treating that lag as downtime.

Current PM summary:
Current TERP direction centers on persistent PM and handoff durability and QA, proof, and rollout hardening; recent git activity is anchored at f9fdb0cd and led by `docs(context): refresh PM bundle after launch activation`, `fix(pm): fall back to user launchctl domain`, `feat(pm): add scoped launch readiness gate`, `test(pm): align fixtures with Claude protocol`; Linear currently emphasizes `Spreadsheet-Native Full Rollout`, `TERP - Orders Spreadsheet Runtime Rollout`, `March 10 Recording Backlog Closure`.
```


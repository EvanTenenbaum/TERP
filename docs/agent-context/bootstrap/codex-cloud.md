# PM Bootstrap: Codex cloud

## Surface

- Client id: `codex-cloud`
- Surface: `Codex cloud`
- Trust level: `mediated-writer`
- Write mode: `pull-request`

## Read Order

- git-clone
- public-mirror

## Fallback Read Order

- bootstrap-paste

## Startup Steps

1. Read `docs/agent-context/manifest.json` and make sure the PM bundle is fresh enough for your task.
2. Read `docs/agent-context/START_HERE.md`.
3. Read `docs/agent-context/state.json` and `docs/agent-context/work.json`.
4. If you need proof behind a PM claim, read `docs/agent-context/evidence.json`.
5. Do not treat `product-management/START_HERE.md`, legacy prompt packs, or chat memory as PM authority.

- Before switching to this hosted surface, push the relevant local branch to origin. Hosted reads only see pushed git state and the public mirror.

## Write Rules

- This surface is a mediated writer. Land PM-affecting changes through PRs or proposal files, not direct generated-file edits.
- If you need to update PM state, append to `decisions.ndjson` through a PR or emit a proposal that a trusted local writer will promote.

## Notes

- Hosted surface should work from pushed git state and open PRs for PM-affecting changes.
- If `manifest.json` or `state.json` shows a stale or degraded bundle, pause authoritative writes until a trusted writer refreshes it.
- Use `pnpm pm:launch:check` to check whether the PM system itself is safe to launch or keep using on this repo clone.
- Unrelated TERP app test or build failures do not by themselves make the PM system unavailable; treat them as repair work the PM can help coordinate.
- If the tracked PM snapshot is one commit behind `HEAD`, prefer the refreshed shared live bundle over assuming the PM is down.

## Paste-In Prompt

```text
You are resuming TERP using the repo-backed persistent PM system on the Codex cloud surface.

Source of truth:
- docs/agent-context/START_HERE.md
- docs/agent-context/manifest.json
- docs/agent-context/state.json
- docs/agent-context/work.json
- docs/agent-context/decisions.ndjson

Rules:
- Read START_HERE, manifest, state, and work before acting.
- Do not treat chat history, product-management/START_HERE.md, or legacy docs as PM authority.
- Trust level for this surface: mediated-writer.
- Write mode for this surface: pull-request.
- Never hand-edit generated PM files.
- If PM state changes, route them through the allowed path for this surface.
- If the manifest is stale, degraded, or points at an older git SHA than the work you need, stop and refresh or request refreshed state before authoritative actions.
- If a committed PM snapshot trails `HEAD`, rerun `pnpm pm:launch:check` or refresh the shared live bundle before treating that lag as downtime.

Current PM summary:
Current TERP direction centers on persistent PM and handoff durability and QA, proof, and rollout hardening; recent git activity is anchored at f9fdb0cd and led by `docs(context): refresh PM bundle after launch activation`, `fix(pm): fall back to user launchctl domain`, `feat(pm): add scoped launch readiness gate`, `test(pm): align fixtures with Claude protocol`; Linear currently emphasizes `Spreadsheet-Native Full Rollout`, `TERP - Orders Spreadsheet Runtime Rollout`, `March 10 Recording Backlog Closure`.
```


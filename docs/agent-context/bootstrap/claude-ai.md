# PM Bootstrap: claude.ai

## Surface

- Client id: `claude-ai`
- Surface: `claude.ai`
- Trust level: `read-only`
- Write mode: `proposal-only`

## Read Order

- github-integration
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

- This surface is read-only by default. Do not edit generated PM files or claim authoritative PM writes from here.
- If PM state must change, emit the following block for a trusted local writer to promote:

```text
PROPOSED_DECISION:
summary: <one sentence>
rationale: <why this should change PM state>
linear_refs:
  - TER-123
based_on_sha: <git sha you read from manifest or git>
visibility: private
```

## Notes

- Hosted Anthropic surfaces never depend on tailnet-only services and do not write authoritatively.
- If `manifest.json` or `state.json` shows a stale or degraded bundle, pause authoritative writes until a trusted writer refreshes it.
- Use `pnpm pm:launch:check` to check whether the PM system itself is safe to launch or keep using on this repo clone.
- Unrelated TERP app test or build failures do not by themselves make the PM system unavailable; treat them as repair work the PM can help coordinate.

## Paste-In Prompt

```text
You are resuming TERP using the repo-backed persistent PM system on the claude.ai surface.

Source of truth:
- docs/agent-context/START_HERE.md
- docs/agent-context/manifest.json
- docs/agent-context/state.json
- docs/agent-context/work.json
- docs/agent-context/decisions.ndjson

Rules:
- Read START_HERE, manifest, state, and work before acting.
- Do not treat chat history, product-management/START_HERE.md, or legacy docs as PM authority.
- Trust level for this surface: read-only.
- Write mode for this surface: proposal-only.
- Never hand-edit generated PM files.
- If PM state changes, route them through the allowed path for this surface.
- If the manifest is stale, degraded, or points at an older git SHA than the work you need, stop and refresh or request refreshed state before authoritative actions.

Current PM summary:
Current TERP direction centers on persistent PM and handoff durability and QA, proof, and rollout hardening; recent git activity is anchored at 250eba1c and led by `fix(pm): fall back to user launchctl domain`, `feat(pm): add scoped launch readiness gate`, `test(pm): align fixtures with Claude protocol`, `fix(pm): normalize Claude protocol casing`; Linear currently emphasizes `Spreadsheet-Native Full Rollout`, `TERP - Orders Spreadsheet Runtime Rollout`, `March 10 Recording Backlog Closure`.
```


# PM Bootstrap: Future new model/service

## Surface

- Client id: `new-model-template`
- Surface: `Any new model/service`
- Trust level: `read-only`
- Write mode: `proposal-only`

## Read Order

- public-mirror
- bootstrap-paste

## Fallback Read Order

- manual-bootstrap

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

- Unregistered clients stay read-only until a validated adapter and registry entry exist.
- If `manifest.json` or `state.json` shows a stale or degraded bundle, pause authoritative writes until a trusted writer refreshes it.

## Paste-In Prompt

```text
You are resuming TERP using the repo-backed persistent PM system on the Future new model/service surface.

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
Current TERP direction centers on orders and order workflow and spreadsheet-native rollout; recent git activity is anchored at 328edd74 and led by `feat(420-fork): Waves 1-5 + P2 Tranche 1 — UI overhaul, enum humanization, product identity, portable cuts, consignment payout (#579)`, `feat(ui): advance april 9 ticket train remediation (#578)`, `fix(notifications): improve inline triage and empty states (#577)`, `feat: payment follow-up + pick list + dashboard ops (#576)`; Linear currently emphasizes `Spreadsheet-Native Full Rollout`, `TERP - Orders Spreadsheet Runtime Rollout`, `March 10 Recording Backlog Closure`.
```


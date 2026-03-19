# Orders Runtime Execution Handoff Prompt

- Date: `2026-03-19`
- Initiative: `Orders spreadsheet-runtime rollout`
- Canonical worktree: `/Users/evan/spec-erp-docker/TERP/worktrees/orders-runtime-ter-795-20260318`
- Branch: `codex/ter-795-20260318-980e3a3c`
- HEAD: `0e2bb8ba5edfb9c9b1e1b836acb50a8c9348cfae`
- Current gate: `G2`
- Active atomic card: `TER-795`
- Current verdict: `partial`

## Copy/Paste Prompt

Use this exact working contract.

You are taking over the TERP Orders spreadsheet-runtime initiative in progress.

Start in `/Users/evan/spec-erp-docker/TERP/worktrees/orders-runtime-ter-795-20260318`.

Read order, and do not broaden it unless needed:

1. `/Users/evan/spec-erp-docker/TERP/TERP/AGENTS.md`
2. `/Users/evan/spec-erp-docker/TERP/TERP/CLAUDE.md`
3. `/Users/evan/spec-erp-docker/TERP/worktrees/orders-runtime-ter-795-20260318/docs/specs/spreadsheet-native-foundation/orders-runtime/HANDOFF-2026-03-19-CODEX-EXECUTION-PROMPT.md`
4. `/Users/evan/spec-erp-docker/TERP/worktrees/orders-runtime-ter-795-20260318/docs/specs/spreadsheet-native-foundation/orders-runtime/G2-runtime-gate.md`
5. `/Users/evan/spec-erp-docker/TERP/worktrees/orders-runtime-ter-795-20260318/docs/specs/spreadsheet-native-foundation/orders-runtime/01-issue-manifest.json`
6. `/Users/evan/spec-erp-docker/TERP/worktrees/orders-runtime-ter-795-20260318/docs/roadmaps/orders-spreadsheet-runtime/roadmap-1-g2-shared-runtime-foundation.md`
7. `/Users/evan/spec-erp-docker/TERP/worktrees/orders-runtime-ter-795-20260318/output/playwright/orders-runtime-g2/2026-03-19/orders-runtime-fill-handle-report.json`

Do not restart discovery from scratch. Preserve the current truth:

- `G1` is `closed with evidence`.
- `G2` is the only active gate and remains `partial`.
- `G3` through `G7` stay blocked by contract.
- `TER-795` is the only active atomic card.
- `TER-796` is sealed and must not be reopened unless an isolated rerun proves a real regression.
- `SALE-ORD-019`, `SALE-ORD-022`, `SALE-ORD-030`, and `SALE-ORD-032` are the only G2 rows safe to treat as live-proven right now.
- The AG Grid license blocker is gone.
- Add Item focus is live on staging.
- The remaining blocker is not “general proofability confusion.” It is now a row-classification problem that should be cleared with the smallest honest row outcomes so execution can move into Orders document closure.

Operate with these mandatory efficiency rules:

- No more architecture or process work unless it directly unlocks the current product gate.
- No more broad proof loops.
- No more new docs or skills unless they remove same-day execution drag on a live row.
- Every writable tranche must end in exactly one of:
  - user-facing product change
  - closure packet
  - limitation packet
  - blocker packet
- Use targeted local verification during implementation.
- Use one narrow live probe per row when needed.
- Use Claude only for merge-ready work or disputed limitation packets.
- Run full `check`, `lint`, `test`, and `build` only at real ship points.
- Confidence decision rules:
  - if local proof passes and the deployed build does not yet contain the fix, classify as `deploy-lag`
  - if local proof passes and a fresh deployed build that should contain the fix still fails in the same isolated way, classify as `product or environment blocker`, not a solved deploy problem
  - if both local and live fail, classify as `product bug` unless Claude supplies a stronger alternative theory with new evidence
  - if the only failure is in the automation layer and Claude proposes a stronger non-browser proof path, use that path or package an explicit limitation instead of repeating the same browser loop

Current implementation truth:

- Local code already contains a deterministic vertical fill fix for the Orders document surface.
- Local browser proof on the real sheet-native Orders document route shows the repaired fill series propagating from `["3","4","1","1"]` to `["3","4","5","6"]`.
- The repo now includes the narrow deployed-build probe:
  - `PLAYWRIGHT_BASE_URL=<fresh-build-url> pnpm proof:staging:orders-fill-handle`
- The first isolated run of that narrow command against live build `build-mmwp9o9e` still reproduces the old failure:
  - `selectionSummaryBeforeDrag: "2 selected cells · 2 rows in scope"`
  - `fillHandleVisible: true`
  - `bodyClassDuringDrag: "ag-dragging-fill-handle"`
  - `quantityValuesAfterDrag: ["3","4","1","1"]`
- Therefore `TER-795` remains `partial` and blocked on deployed-build confirmation plus the remaining unresolved proof rows. This is not a reason to reopen `TER-796`.

Your job is to complete the initiative with guardrails that help speed and reliability rather than slow them down.

Execution order:

1. Verify current branch, diff, and current deployed build before touching anything.
2. Verify whether a fresh deployed build is even possible:
   - if the local fill fix is still only in the worktree and you have not been explicitly asked to commit or push, do not spend the staging probe budget yet; mark deployed verification as blocked on shipping the fix
   - if you are explicitly authorized to ship the fix, use the TERP deployment path `branch -> PR -> main -> staging auto-deploy`, then confirm the new staging build is newer than `build-mmwp9o9e` before probing
3. If a fresh deployed build exists and post-dates the shipped fill fix, run exactly one narrow fill-handle probe first.
4. If that probe passes, write evidence first, then Linear, then move to the next unresolved `TER-795` row.
5. If that probe fails on the fresh build, freeze `SALE-ORD-022` as an explicit limitation packet and move immediately to the next independent row instead of replaying the same proof.
6. Keep row-op proof isolated from clipboard or fill work.
7. Before any gate-promotion claim, run bounded Claude adversarial QA using `claude-opus-4-6` with `high` effort.

Definition of done for this continuation:

- finish `TER-795` honestly, either by closing rows with direct evidence or by packaging explicit limitations or blockers with enough evidence to stop churn
- keep `TER-796` sealed unless isolated evidence says otherwise
- keep tracker, gate artifacts, and roadmap status perfectly aligned
- move into `G3` immediately once `G2` is honestly closeable

## Compressed Execution State

Goal:
- Finish the Orders spreadsheet-runtime initiative without reopening settled G2 work, without wasting cycles on broad browser loops, and without promoting any downstream gate early.

Constraints:
- Linear is live tracker.
- Blocked work cannot be `In Progress`.
- Evidence writeback order is fixed:
  1. gate artifacts
  2. Linear
  3. roadmap status blocks
- Use only explicit verdicts: `open`, `partial`, `closed with evidence`, `rejected with evidence`.
- Do not commit unless explicitly asked.
- Do not overwrite unrelated local changes.

Changes completed:
- deterministic vertical fill callback implemented locally for Orders document fill
- targeted tests added and full repo gate already passed on local state
- narrow fill-handle probe added so live validation does not require another broad G2 proof run
- gate docs and manifest updated to reflect the new scoped contract

Files touched:
- `client/src/components/spreadsheet-native/SpreadsheetPilotGrid.tsx`
- `client/src/components/spreadsheet-native/SpreadsheetPilotGrid.test.tsx`
- `client/src/components/orders/OrdersDocumentLineItemsGrid.tsx`
- `client/src/components/orders/OrdersDocumentLineItemsGrid.test.tsx`
- `scripts/spreadsheet-native/probe-orders-runtime-fill-handle.ts`
- `scripts/spreadsheet-native/README.md`
- `package.json`
- `docs/specs/spreadsheet-native-foundation/orders-runtime/G2-runtime-gate.md`
- `docs/specs/spreadsheet-native-foundation/orders-runtime/Implement.md`
- `docs/specs/spreadsheet-native-foundation/orders-runtime/01-issue-manifest.json`
- `docs/specs/spreadsheet-native-foundation/orders-runtime/execution-metrics.json`
- `docs/roadmaps/orders-spreadsheet-runtime/roadmap-1-g2-shared-runtime-foundation.md`

Verification evidence:
- full local gate already passed on this tranche:
  - `pnpm check`
  - `pnpm lint`
  - `pnpm test`
  - `pnpm build`
- isolated live fill report on current staging build:
  - `output/playwright/orders-runtime-g2/2026-03-19/orders-runtime-fill-handle-report.json`

Unresolved blockers:
- unresolved G2 rows still include:
  - `SALE-ORD-020`
  - `SALE-ORD-021`
  - `SALE-ORD-029`
  - `SALE-ORD-031`
  - `SALE-ORD-035`
- `SALE-ORD-031` should now be handled as a limitation packet, not more theorizing
- `SALE-ORD-035` should now be handled as a limitation packet unless one bounded negative-case packet closes it immediately
- `SALE-ORD-020` and `SALE-ORD-021` should stay parked until a fresh reachable Orders document route exists

Immediate next command class:
- limitation packet writeback for `SALE-ORD-031`

## Retrieval Contract

Read only what the current decision needs.

Cold start:
- this handoff file
- `G2-runtime-gate.md`
- `01-issue-manifest.json`

If you are validating live fill only:
- `output/playwright/orders-runtime-g2/2026-03-19/orders-runtime-fill-handle-report.json`
- `scripts/spreadsheet-native/probe-orders-runtime-fill-handle.ts`

If you are changing the local fill implementation:
- `client/src/components/orders/OrdersDocumentLineItemsGrid.tsx`
- `client/src/components/spreadsheet-native/SpreadsheetPilotGrid.tsx`
- matching tests only

If you are updating roadmap truth:
- `G2-runtime-gate.md`
- `Implement.md`
- `01-issue-manifest.json`
- `execution-metrics.json`
- `roadmap-1-g2-shared-runtime-foundation.md`
- before editing them, verify:
  - `jq '.' docs/specs/spreadsheet-native-foundation/orders-runtime/01-issue-manifest.json`
  - `jq '.' docs/specs/spreadsheet-native-foundation/orders-runtime/execution-metrics.json`

Do not read the March 17 rollout roadmap unless you need lineage only.

## Atomic Roadmap Forward

### Tranche 1: Immediate G2 Close Path

Objective:
- clear the remaining `G2` rows with the smallest honest row outcomes so execution can move into Orders document closure

- `SALE-ORD-031` -> limitation packet now
- `SALE-ORD-035` -> limitation packet now unless one bounded negative-case packet closes it immediately
- `SALE-ORD-029` -> one narrow proof attempt, then limitation if still fuzzy
- `SALE-ORD-020` -> park until a fresh reachable document route exists, then one fresh-build attempt
- `SALE-ORD-021` -> park until a fresh reachable document route exists, then one fresh-build attempt

### Tranche 2: Remaining TER-795 Rows

Objective:
- resolve the remaining independent rows without replaying already-settled work or turning the shared runtime into a research program

Row-by-row proof map:

| Row | Behavior | What closes it | Preferred proof method |
| --- | --- | --- | --- |
| `SALE-ORD-020` | multi-cell edit pricing autosave proof | isolated proof that approved multi-cell edits preserve pricing and autosave behavior | targeted edit probe plus save-state evidence |
| `SALE-ORD-021` | approved-field paste proof on staging | isolated staging proof that approved-field paste lands correctly on the document grid | existing G2 paste harness, but only in isolated paste mode |
| `SALE-ORD-029` | clear-style actions and structured edit rejection proof | one narrow packet that either closes the row or justifies limitation | one bounded negative-case probe only |
| `SALE-ORD-031` | sort/filter-safe targeting proof | explicit limitation packet because the Orders surface does not expose sort or filter | no new broad proof work |
| `SALE-ORD-035` | failure-mode bundle proof beyond immediate invalid-edit rejection | explicit limitation packet unless one bounded packet closes the row immediately | limitation packaging first |

Execution order:
1. `SALE-ORD-031`
2. `SALE-ORD-035`
3. `SALE-ORD-029`
4. `SALE-ORD-020`
5. `SALE-ORD-021`

Rules:
- each row gets an isolated packet
- no mixed-sequence proof
- if a row cannot be directly proved, package it as an explicit limitation or blocker instead of holding the whole gate hostage

### Tranche 3: G2 Closure Packet

Objective:
- close `TER-795` honestly and move directly into `G3`

Required bundle:
- refreshed gate files
- isolated artifacts for each remaining row
- Linear updates
- Claude adversarial review report

## Claude Adversarial QA Contract

Run Claude before any `G2` closure claim and whenever you hit a verification stall that risks another loop.

Preferred command pattern:

```bash
python3 /Users/evan/.codex/skills/claude-qa-review/scripts/run_review.py \
  --target "/Users/evan/spec-erp-docker/TERP/worktrees/orders-runtime-ter-795-20260318/docs/specs/spreadsheet-native-foundation/orders-runtime/HANDOFF-2026-03-19-CODEX-EXECUTION-PROMPT.md" \
  --cwd "/Users/evan/spec-erp-docker/TERP/worktrees/orders-runtime-ter-795-20260318" \
  --model opus \
  --effort high
```

Use Claude for:
- adversarial review of closure packets
- alternate proof design when direct verification is blocked
- confidence-weighted judgment about whether a blocker is likely harness-only, deploy-lag, or product behavior

Do not use Claude as an excuse to keep gathering the same evidence. Ask for a new path or a confidence judgment, then act on it.

## Self-Healing Rules

- If a command fails for environment reasons, do one bounded self-heal attempt.
- If the second attempt fails with the same classification, stop and record the blocker.
- If local boot fails, prefer the already-proven degraded boot path before inventing a new one:
  - `AUTO_MIGRATE_MODE=off SKIP_SEEDING=true PORT=3001 pnpm start`
- If the live browser budget is exhausted, pivot to:
  - local diagnosis
  - explicit limitation packaging
  - the next independent tranche

## Guardrails That Must Help, Not Hurt

- Guardrails are for eliminating waste, not creating ceremony.
- Use the lightest proof that can change the classification.
- Prefer isolated probes over broad reruns.
- Prefer one canonical handoff file over many partial notes.
- Prefer alternate proof or limitation packaging over endless harness tuning.
- Never let “perfect verification” block product completion when the honest outcome is “high-confidence limitation, not live-proven.”

## Immutable Decisions

- `TER-796` stays sealed unless a fresh isolated staging row-op probe on a build that should contain the current fixes shows duplicate, quick-add, or delete regression on two consecutive runs.
- `SALE-ORD-030` and `SALE-ORD-032` remain the only G2 rows safe to treat as live-proven right now.
- The narrow fill command is the next live move, not another broad G2 packet.
- Browser loops are capped. If the state does not change, pivot.
- Downstream gates do not advance while `G2` is still `partial`.

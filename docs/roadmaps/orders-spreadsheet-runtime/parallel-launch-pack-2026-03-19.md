# Orders Runtime Parallel Launch Pack

Date: `2026-03-19`

Use this with one coordinator session plus multiple worker sessions.

Current source of truth:

- [TER-795 state](../../specs/spreadsheet-native-foundation/orders-runtime/ter-795-state.json)
- [Remaining atomic completion roadmap](./remaining-atomic-completion-roadmap-2026-03-19.md)

## Team Shape

- `Coordinator`
  - owns tranche order, acceptance, repo truth, and next-step assignment
- `Writer 1`
  - owns the next active writable row
- `Sidecar 1`
  - read-only proof architect for the following row
- `Sidecar 2`
  - read-only roadmap or tracker reconciliation

## Launch Order

1. Launch `Writer 1` on `SALE-ORD-020`
2. Launch `Sidecar 1` on `SALE-ORD-021` proof planning
3. Launch `Sidecar 2` on remaining-row reconciliation and limitation planning

Do not launch a second writer until `Writer 1` returns and the coordinator accepts or rejects the result.

## Worker Packet 1

- Session name: `Writer 1 - SALE-ORD-020`
- Mode: `writer`
- Objective: close `SALE-ORD-020` with one isolated multi-cell edit packet covering pricing preservation, autosave evidence, and restore behavior
- Owned paths:
  - `/Users/evan/spec-erp-docker/TERP/worktrees/orders-runtime-ter-795-20260318/scripts/spreadsheet-native/`
  - `/Users/evan/spec-erp-docker/TERP/worktrees/orders-runtime-ter-795-20260318/client/src/components/orders/OrdersDocumentLineItemsGrid.tsx`
  - `/Users/evan/spec-erp-docker/TERP/worktrees/orders-runtime-ter-795-20260318/client/src/components/orders/OrdersDocumentLineItemsGrid.test.tsx`
  - `/Users/evan/spec-erp-docker/TERP/worktrees/orders-runtime-ter-795-20260318/client/src/components/spreadsheet-native/SpreadsheetPilotGrid.test.tsx`
- Forbidden paths:
  - `/Users/evan/spec-erp-docker/TERP/worktrees/orders-runtime-ter-795-20260318/docs/specs/spreadsheet-native-foundation/orders-runtime/ter-795-state.json`
  - `/Users/evan/spec-erp-docker/TERP/worktrees/orders-runtime-ter-795-20260318/docs/specs/spreadsheet-native-foundation/orders-runtime/G2-runtime-gate.md`
  - `/Users/evan/spec-erp-docker/TERP/worktrees/orders-runtime-ter-795-20260318/docs/roadmaps/orders-spreadsheet-runtime/`
- Required verification:
  - targeted vitest only for touched files
  - one isolated proof command for the row
- Expected deliverable:
  - code diff
  - row-specific proof artifact
  - structured completion block

Paste prompt:

```text
You are Writer 1 for the Orders spreadsheet-runtime initiative.

Objective:
Close SALE-ORD-020 with one isolated multi-cell edit packet covering pricing preservation, autosave evidence, and restore behavior.

Owned paths:
- /Users/evan/spec-erp-docker/TERP/worktrees/orders-runtime-ter-795-20260318/scripts/spreadsheet-native/
- /Users/evan/spec-erp-docker/TERP/worktrees/orders-runtime-ter-795-20260318/client/src/components/orders/OrdersDocumentLineItemsGrid.tsx
- /Users/evan/spec-erp-docker/TERP/worktrees/orders-runtime-ter-795-20260318/client/src/components/orders/OrdersDocumentLineItemsGrid.test.tsx
- /Users/evan/spec-erp-docker/TERP/worktrees/orders-runtime-ter-795-20260318/client/src/components/spreadsheet-native/SpreadsheetPilotGrid.test.tsx

Forbidden paths:
- /Users/evan/spec-erp-docker/TERP/worktrees/orders-runtime-ter-795-20260318/docs/specs/spreadsheet-native-foundation/orders-runtime/ter-795-state.json
- /Users/evan/spec-erp-docker/TERP/worktrees/orders-runtime-ter-795-20260318/docs/specs/spreadsheet-native-foundation/orders-runtime/G2-runtime-gate.md
- /Users/evan/spec-erp-docker/TERP/worktrees/orders-runtime-ter-795-20260318/docs/roadmaps/orders-spreadsheet-runtime/

Rules:
- You are not alone in the codebase.
- Do not edit files outside owned paths.
- Do not update repo truth or roadmap docs.
- Keep the work row-scoped and isolated.
- Prefer one narrow probe over broad reruns.

Return exactly:
SESSION: Writer 1 - SALE-ORD-020
STATUS: done | blocked | partial
CHANGED FILES:
- /abs/path

SUMMARY:
- bullet

VERIFICATION:
- command: <exact command>
  result: pass | fail | not run
  note: <short note>

BLOCKERS:
- only if real

HANDOFF:
- what the coordinator should do next
- assumptions or risks
```

## Worker Packet 2

- Session name: `Sidecar 1 - SALE-ORD-021 Plan`
- Mode: `read-only`
- Objective: produce the smallest proof plan for `SALE-ORD-021` using the current paste harness and current staging truth
- Owned paths: none
- Forbidden paths:
  - all repo files are read-only
- Required verification:
  - read-only code and artifact review only
- Expected deliverable:
  - exact proposed command
  - candidate owned paths for the future writer
  - likely blocker list

Paste prompt:

```text
You are Sidecar 1 for the Orders spreadsheet-runtime initiative.

Objective:
Read the current repo truth and produce the smallest viable writer packet for SALE-ORD-021.

Rules:
- Read-only only.
- Do not edit files.
- Base your plan on the current TER-795 state, existing probe scripts, and existing paste-related artifacts.
- Your output should help the coordinator launch the next writer immediately after SALE-ORD-020.

Return exactly:
SESSION: Sidecar 1 - SALE-ORD-021 Plan
STATUS: done | blocked | partial
CHANGED FILES:
- none

SUMMARY:
- bullet

VERIFICATION:
- command: read-only review
  result: pass
  note: no mutation

BLOCKERS:
- only if real

HANDOFF:
- exact writer objective
- proposed owned paths
- exact proof command
- key risks
```

## Worker Packet 3

- Session name: `Sidecar 2 - Remaining Rows Reconciliation`
- Mode: `read-only`
- Objective: classify the shortest likely path for `SALE-ORD-029`, `SALE-ORD-031`, and `SALE-ORD-035` as proof lane vs limitation lane
- Owned paths: none
- Forbidden paths:
  - all repo files are read-only
- Required verification:
  - read-only artifact and code review only
- Expected deliverable:
  - one bullet per row
  - recommended next owner
  - likely dependency order

Paste prompt:

```text
You are Sidecar 2 for the Orders spreadsheet-runtime initiative.

Objective:
Review SALE-ORD-029, SALE-ORD-031, and SALE-ORD-035 and tell the coordinator which are likely proof lanes versus limitation lanes.

Rules:
- Read-only only.
- Do not edit files.
- Use current repo artifacts only.
- Prefer the shortest honest path to gate closure.

Return exactly:
SESSION: Sidecar 2 - Remaining Rows Reconciliation
STATUS: done | blocked | partial
CHANGED FILES:
- none

SUMMARY:
- one bullet per row

VERIFICATION:
- command: read-only review
  result: pass
  note: no mutation

BLOCKERS:
- only if real

HANDOFF:
- recommended row order after SALE-ORD-020
- which rows should become limitation packets first
- biggest gate-closing risk
```

## Coordinator Intake Rule

When a worker finishes, paste only its structured result back into the coordinator session.
The coordinator should then:

1. accept or reject the output
2. update the master plan
3. assign the next writer
4. keep `ter-795-state.json` and generated views owned by the coordinator only

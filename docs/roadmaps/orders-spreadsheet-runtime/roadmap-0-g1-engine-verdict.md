# Roadmap 0 — G1 Engine Verdict, Tracker Lock, Stop-Go Enforcement

## Status Block

- Gate: `G1`
- Linear gate: `TER-787`
- Current verdict: `closed with evidence`
- Execution state: `complete`
- Prerequisites: none
- Gate file: [G1-engine-verdict.md](../../specs/spreadsheet-native-foundation/orders-runtime/G1-engine-verdict.md)

## Objective

Freeze the execution contract before more implementation starts. This roadmap closes `G1` by making tracker truth, blocker policy, and the AG Grid engine verdict durable and auditable.

## Allowed Inputs

- Linear issues: `TER-787`, `TER-767`, `TER-768`, `TER-766`
- Durable files:
  - `orders-runtime/Prompt.md`
  - `orders-runtime/Plan.md`
  - `orders-runtime/01-issue-manifest.json`
  - `orders-runtime/G1-engine-verdict.md`
- Proof rows: none may be promoted here

## Implementation Tranches

1. Lock the roadmap package, issue manifest, and proof-row ownership map as the execution source of truth.
2. Confirm `TER-768` evaluation requirements: selection, clipboard, fill, undo/redo, blocked-state surfacing, and Orders-shaped performance.
3. Record the actual engine verdict in the gate file as pass/fail plus exact scoped diff and exact validation commands.
4. Enforce blocker truth: any downstream blocked lane stays `Todo + state:blocked` in Linear.
5. Write parent-level execution note on `TER-766` pointing to this roadmap package and the consecutive order.

## Validation Commands And Proof Artifacts

Docs-only:

- `rg -n "TER-787|TER-768|state:blocked|Roadmap 0|G1" docs/specs/spreadsheet-native-foundation/orders-runtime docs/roadmaps/orders-spreadsheet-runtime`
- `jq '.' docs/specs/spreadsheet-native-foundation/orders-runtime/01-issue-manifest.json`

Required artifacts:

- updated `G1-engine-verdict.md`
- updated `01-issue-manifest.json`
- Linear comment/writeback on `TER-766`
- validation evidence from:
  - `pnpm vitest run client/src/components/spreadsheet-native/PowersheetGrid.test.tsx client/src/components/orders/OrdersDocumentLineItemsGrid.test.tsx client/src/components/spreadsheet-native/OrdersSheetPilotSurface.test.tsx client/src/lib/spreadsheet-native/pilotContracts.test.ts`
  - `pnpm check`

## Adversarial Review Requirement

- Challenge any claim that the engine is “selected” without bounded pass/fail evidence.
- Reject the roadmap if the verdict lacks explicit failure conditions or if downstream blocked lanes are active.

## Stop-Go Conditions

- Stop if the engine verdict is still narrative-only.
- Stop if any `G2` through `G7` issue is active without `G1` closure evidence.
- Go only when the engine verdict and blocker policy are both written back.

## Completion Writeback

1. Update `G1-engine-verdict.md`.
2. Update `01-issue-manifest.json` if gate state changed.
3. Update `TER-787`, `TER-767`, `TER-768`, and `TER-766`.
4. Change this roadmap verdict to `closed with evidence` or `rejected with evidence`.

## Reopen Triggers

- engine spike assumptions change
- blocker policy drifts in Linear
- issue manifest and gate files stop matching

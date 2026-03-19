# Roadmap 2 — G3 Orders Document Rollout

## Status Block

- Gate: `G3`
- Linear gate: `TER-789`
- Current verdict: `open`
- Execution state: `blocked pending Roadmap 1`
- Prerequisites: Roadmap 1 `closed with evidence`
- Gate file: [G3-document-gate.md](../../specs/spreadsheet-native-foundation/orders-runtime/G3-document-gate.md)

## Objective

Move Orders document mode onto the shared runtime while preserving all existing Orders-owned business logic and route behavior.

Current truth:

- document-mode runtime mounting is already present in the current repo
- this roadmap stays blocked until `G2` closes because the shared runtime tranche is not yet fully closed with evidence
- once `G2` is honestly closeable, this roadmap becomes the immediate next execution lane; do not insert more foundation or meta-system cleanup ahead of document closure

## Allowed Inputs

- Linear issues: `TER-789`, `TER-773`, `TER-774`, `TER-797`, `TER-798`, `TER-799`
- Durable files:
  - `orders-runtime/G3-document-gate.md`
  - `orders-runtime/02-proof-row-map.csv`
  - `orders-runtime/Implement.md`
- Proof rows:
  - `SALE-ORD-003`
  - `SALE-ORD-004`
  - `SALE-ORD-005`
  - `SALE-ORD-006`
  - `SALE-ORD-012`
  - `SALE-ORD-015`
  - `SALE-ORD-016`
  - `SALE-ORD-017`
  - `SALE-ORD-018`
  - `SALE-ORD-028`

## Implementation Tranches

1. Mount the sanctioned runtime into document mode without changing Orders workflow ownership.
2. Preserve pricing, autosave, undo, validation, seeded-entry, conversion, and route hydration.
3. Close document-mode proof gaps or explicitly reject rows with evidence.
4. Remove any remaining Orders-owned classic fallback dependency for document-owned steps.

## Validation Commands And Proof Artifacts

Before code edits:

- write exact targeted tests and proof cases into `G3-document-gate.md`

Required full gate:

- `pnpm check`
- `pnpm lint`
- `pnpm test`
- `pnpm build`

Required staging artifacts before closure:

- build ID
- commit SHA
- persona
- route
- record or seeded context ID
- screenshots for new draft, draft edit, finalize state, seeded-entry, and conversion paths

## Adversarial Review Requirement

- Try invalid edits, autosave-loss paths, conversion ambiguity, and mixed seeded-entry flows.
- Any document row that stays built-but-hidden remains open, not complete.

## Stop-Go Conditions

- Stop if document rollout adds a parallel mutation path, save-state path, undo system, seeded-entry path, or route grammar.
- Stop if any Orders-owned document row remains `implemented-not-surfaced`.
- Go immediately once `G2` is honestly closed and document mode is trustworthy enough to unblock queue/support rollout.

## Completion Writeback

1. Update `G3-document-gate.md`, `02-proof-row-map.csv`, and `Implement.md`.
2. Update `TER-789` and owned child issues.
3. Unblock `G4` only after document proof rows are closed or rejected with evidence.

## Reopen Triggers

- document proof fails on staging
- classic fallback is still required for an Orders-owned document step
- route or seeded-entry behavior diverges from current Orders contracts

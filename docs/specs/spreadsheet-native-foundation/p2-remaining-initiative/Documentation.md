# Documentation

## User-Facing Notes

- This initiative is a continuity finish pass, not a redesign.
- The package assumes TERP already has most of the necessary building blocks.
- The work should make the product feel more natural and operator-native, not more feature-dense.

## QA And Runbook Notes

- Treat Domscribe and local browser proof as standard tools for UI tranches.
- Treat Claude adversarial review as required before closing a tranche.
- If proof is ambiguous, do not close the tranche; issue a limitation or blocker packet instead.
- Treat local test-DB mutations used only for proof bootstrap as harness actions, not product changes; record them explicitly in the evidence index.

## Evidence Inventory

This folder should accumulate:

- tranche screenshots
- live findings notes
- Claude review reports or links to them
- any limitation packets created during execution
- canonical reconciliation packets that explain what is on `main`, what is only on a recovery branch, and what still needs landing

For TER-1067 specifically, the authoritative evidence index is:

- `evidence/ter-1067/README.md`
- `output/playwright/ter-1067-recovery-2026-04-07/summary.md`

## Known Limitations

- Current tracker state still reflects the original P2 tickets rather than the new execution-task layer.
- Some already-landed local seams need tracker reconciliation before the remaining initiative can be considered normalized.
- PR 569's `docs/initiatives/...` files are not on `main`; keeping them and this packet side by side as co-equal systems would create drift, so the canonical repo home stays here unless explicitly changed later.

## Follow-Ups

- If this package grows into a longer-running rollout, add a machine-readable issue manifest and gate files.
- If a future tranche proves a seam cannot be solved inside the current structure, open a separate architectural decision packet instead of stretching this one.

## Reopen Criteria

Reopen the initiative only if:

- a previously closed seam regresses
- deferred items are promoted back into the active lane
- a hidden structural blocker invalidates the seam-first plan

# TER-1067 Reconciliation Report

## Scope

This report re-establishes the last trustworthy checkpoint for the P2 remaining initiative by reconciling:

- merged repo truth on `main`
- open PR truth on `p2-phase1-immediate-fixes` / PR 569
- recovery-branch truth on `claude/TER-1067-20260407-9edeecb6`
- proof bundle truth
- Linear issue truth

The restart point for the initiative is TER-1067, not TER-1068.

## Authoritative Starting Point

The authoritative repo packet on `main` is:

- `docs/specs/spreadsheet-native-foundation/p2-remaining-initiative/...`

That packet explicitly says the already-landed seams must be reconciled first, and that tranche closeout requires tests, browser proof, adversarial review, and Linear writeback.

The authoritative code/proof starting point is:

- `origin/main` already had client-name order search and remaining-balance payment confirmation
- PR 569 contained the real copy-for-chat and overdue-contact fixes plus a submit-guard hardening change
- the only durable proof bundle on `main` was too thin to justify later "Phase 2 complete" claims

## PR 569 Disposition

PR 569 was not merged as-is.

- Commit `88092a77` was ported onto a clean TER-1067 recovery branch because it contains the real user-facing fixes.
- Commit `676ae62e` was not promoted wholesale because it would create a competing `docs/initiatives/...` authority that does not exist on `main`.
- The missing durable artifacts from that doc proposal were re-homed into this canonical `docs/specs/.../p2-remaining-initiative` packet instead.

## Merged Truth

Verified on `origin/main`:

- `client/src/components/work-surface/OrdersWorkSurface.tsx` already searches live orders by client name.
- `client/src/components/CommandPalette.search.test.tsx` already covers client-name order hits in Cmd+K search.
- `client/src/components/accounting/RecordPaymentDialog.tsx` already shows remaining-balance confirmation after successful payment recording.
- `server/routers/accounting.ts` already selected `customerEmail` and `customerPhone`, but `InvoicesSurface.tsx` did not render them.
- `SalesCatalogueSurface.tsx` still copied `inventoryRows` instead of curated `selectedItems`.

## Recovery-Branch Truth

Recovered on `claude/TER-1067-20260407-9edeecb6`:

- `InvoicesSurface.tsx` now renders compact overdue-contact info in the client column for overdue rows.
- `SalesCatalogueSurface.tsx` now copies from curated selected items and disables the action based on selected items, not raw inventory rows.
- `RecordPaymentDialog.tsx` now uses `mutateAsync` plus a submit re-entry guard.
- focused tests were added for all 3 recovery seams plus the already-landed Cmd+K search path.

## Tracker Truth At Recovery Start

Recovered Linear state before writeback:

- `TER-1067` was still `Backlog`
- `TER-1054`, `TER-1057`, and `TER-1058` were `In Review` because PR 569 existed
- `TER-1062` was still `Todo` even though the implementation was already on `main`
- `TER-1064` was still `Todo` even though it overlaps directly with `TER-1048`

## Missing Artifacts At Recovery Start

These claimed artifacts were not found durably and had to be recreated:

- adversarial review report
- scope-alignment review report
- combined recovery scorecard
- tranche seam-analysis docs
- dependency graph

They now live under this packet's `reviews/`, `analysis/`, and `reconciliation/` folders.

## Seam-By-Seam Reconciliation

| Issue | What is on `main` | What was only on PR 569 / recovery branch | Proof now | What still needs implementation | What still needs proof | Normalized tracker interpretation |
| --- | --- | --- | --- | --- | --- | --- |
| `TER-1054` Copy for Chat | Broken on `main`; copied filtered inventory rows instead of selected catalogue rows | Fixed on recovery branch via ported `88092a77` | Focused Vitest, live browser copy proof, screenshot bundle | Land recovery branch change | Staging/main confirmation after merge | Open with evidence; implementation exists on recovery branch, not yet on `main` |
| `TER-1057` Overdue invoice contact visibility | Router already queried contact info, UI did not render it | Fixed on recovery branch via ported `88092a77` | Focused Vitest, overdue-focus runtime proof, screenshot bundle | Land recovery branch change | Staging/main confirmation after merge | Open with evidence; implementation exists on recovery branch, not yet on `main` |
| `TER-1058` Balance update confirmation | Acceptance criteria already on `main`; success toast shows remaining balance | Recovery branch adds submit re-entry guard around the same workflow | Focused Vitest for toast text, focused Vitest for double-submit guard, live runtime partial-payment helper and success toast | None for the original acceptance criteria; guard still needs landing if retained | None for the original seam | Close with evidence for the P2 seam; note the guard hardening separately in TER-1067 |
| `TER-1062` Order search by client name | Already on `main` in Cmd+K search and orders queue search | No extra recovery implementation needed | Existing focused test, live Cmd+K proof, live orders queue proof | None | None | Close with evidence |
| `TER-1064` Plain-language status labels | Plain-language labels already exist in some surfaces, but LIVE-first defaulting still lives under `TER-1048` work | No distinct recovery implementation | Code inspection only | Keep implementation scoped to `TER-1048` | Proof after `TER-1048` lands | Merge / duplicate into `TER-1048`, do not run it as a separate seam |

## Next Authoritative Starting Point

After TER-1067 normalization, the next authoritative execution start is:

- `TER-1068` only after the tracker reflects the reconciled truth above
- using this packet, not the unmerged `docs/initiatives/...` proposal, as the repo-side source of truth

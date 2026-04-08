# Implement

## Active Milestone

Initiative closeout and TER-1071 deferred-pass normalization.

## Current Decisions

- Keep the initiative seam-first and proof-first.
- Keep requirements, design, and tasks split into separate artifacts.
- Use Linear for execution-task writeback, while keeping the repo packet as the durable implementation source.
- Require Claude adversarial review before tranche closeout.
- Keep `docs/specs/spreadsheet-native-foundation/p2-remaining-initiative/` as the canonical initiative home.
- Keep sellable-only inventory as the default order-side posture; unavailable inventory must remain an explicit broadened filter.
- Persist `includeUnavailable` through the shared sales filter model instead of surface-local UI state.
- When local proof data is missing a tranche seam entirely, use the smallest reversible local fixture that proves the seam and record it as a harness action instead of pretending seeded coverage exists.

## Evidence To Collect Per Tranche

- touched-file test output
- touched-file eslint output
- `pnpm check`
- browser screenshots or equivalent runtime proof
- Claude review report
- Linear writeback summary

## User-Verifiable Deliverables

Each tranche should end with 3 to 7 concrete things Evan can now do or observe in the product without reconstructing the implementation details.

## Blockers

- No tranche-specific product blocker remains.
- The repo-wide `pnpm test` lane is blocked by the reset/seed harness and is recorded as a limitation packet instead of a false pass.

## Checkpoint Log

- 2026-04-07: spec package created and aligned to the remaining initiative
- 2026-04-07: recovered PR 569 onto a clean TER-1067 branch by porting the UX fix commit and deliberately not promoting the competing `docs/initiatives/...` tree to canonical status
- 2026-04-07: refreshed browser proof for copy-for-chat, overdue invoice contacts, command palette client-name search, orders queue client-name search, and record-payment remaining-balance confirmation
- 2026-04-07: rebuilt the missing reconciliation, review, analysis, and evidence artifacts under this canonical packet
- 2026-04-07: wrote back normalized tracker truth - `TER-1067` done, `TER-1058` done, `TER-1062` done, `TER-1054` and `TER-1057` active on the recovery branch, `TER-1064` duplicated into `TER-1048`
- 2026-04-08: reran merge-gate verification, confirmed `agent:prepare`, `check`, `lint`, touched-surface tests, and `build` on the recovery branch, and reproduced the unrelated repo-wide red failures on a clean `origin/main` worktree before proceeding with the replacement PR path
- 2026-04-08: implemented TER-1068 tranche 1 by promoting `includeUnavailable` into the shared sales filter model, wiring it through saved views and portable cuts, and harmonizing plain-language unavailable-status rendering on the sheet-native order surface
- 2026-04-08: captured browser proof for sellable-first defaults, explicit unavailable reveal, portable-cut carryover, and saved-view reload continuity under `output/playwright/ter-1068-tranche1-2026-04-08/`
- 2026-04-08: recorded the repo-wide `pnpm test` reset/seed failure as a limitation packet because the failure occurred in untouched harness files outside the TER-1068 diff
- 2026-04-08: accepted the in-scope Claude review findings for the dead catalogue Filters entry point, catalogue plain-language unavailable copy, and imported-cut badge drift; deferred commit/finalize guard concerns into TER-1069
- 2026-04-08: rebuilt the local proof database with `pnpm test:db:fresh` after the broken `pnpm test` reset/seed lane left `terp-test` without the `users` table, then refreshed the browser artifacts for the post-review tranche candidate
- 2026-04-08: tightened TER-1069 so unresolved batch lookups cannot silently bypass the blocked-draft finalize guard, unified the blocked-draft operator copy, and added targeted tests for the unresolved path, outbound vendor identity, and credit-warning next-step routing
- 2026-04-08: captured the missing blocked-draft runtime proof under `output/playwright/ter-1069-retrieval-continuity-2026-04-08/blocked-draft-confirm-disabled.png` using a real local draft backed by an `AWAITING_INTAKE` batch
- 2026-04-08: recorded the final TER-1069 hostile pass in `reviews/2026-04-08-ter-1069-adversarial-review.md`, fixing the screenshot and shared-page grammar defects before accepting the remaining follow-ups as non-blocking
- 2026-04-08: implemented TER-1070 tranche 3 by preserving PO expected-delivery context in local receiving drafts, adding a visible `PO Reference` column to the receiving draft grid, and restoring a direct `Show Purchase Order` return action from the receiving draft back to the queue
- 2026-04-08: verified TER-1070 with targeted Vitest, targeted eslint, `pnpm check`, `pnpm build`, and a five-check local browser bundle under `output/playwright/ter-1070-ops-continuity-2026-04-08/`
- 2026-04-08: created a minimal local proof fixture for TER-1070 after confirming the seeded proof DB contained zero `purchaseOrders` and zero `vendor_payables`; recorded it as a harness action instead of claiming seeded runtime coverage
- 2026-04-08: accepted the final TER-1070 hostile pass after fixing UTC-stable expected-delivery date handling, strengthening the queue-filter and invalid-date tests, and guarding `Show Purchase Order` for legacy drafts with invalid `poId`
- 2026-04-08: merged TER-1070 via PR `#573` to `main` and normalized the tranche-3 child + scope-anchor tickets with evidence-specific Linear writeback
- 2026-04-08: completed TER-1071 by parking `TER-1055`, `TER-1056`, `TER-1063`, and `TER-1065` with explicit reasons instead of leaving them as ambiguous initiative leftovers
- 2026-04-08: updated the canonical packet to mark the remaining initiative complete on `main`

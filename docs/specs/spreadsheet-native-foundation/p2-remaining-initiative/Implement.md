# Implement

## Active Milestone

TER-1068 tranche 1 closeout, merge prep, and tracker writeback.

## Current Decisions

- Keep the initiative seam-first and proof-first.
- Keep requirements, design, and tasks split into separate artifacts.
- Use Linear for execution-task writeback, while keeping the repo packet as the durable implementation source.
- Require Claude adversarial review before tranche closeout.
- Keep `docs/specs/spreadsheet-native-foundation/p2-remaining-initiative/` as the canonical initiative home.
- Keep sellable-only inventory as the default order-side posture; unavailable inventory must remain an explicit broadened filter.
- Persist `includeUnavailable` through the shared sales filter model instead of surface-local UI state.

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

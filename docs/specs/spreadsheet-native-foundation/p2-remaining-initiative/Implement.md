# Implement

## Active Milestone

TER-1067 reconciliation, proof refresh, and tracker normalization closeout.

## Current Decisions

- Keep the initiative seam-first and proof-first.
- Keep requirements, design, and tasks split into separate artifacts.
- Use Linear for execution-task writeback, while keeping the repo packet as the durable implementation source.
- Require Claude adversarial review before tranche closeout.

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

None at plan time.

## Checkpoint Log

- 2026-04-07: spec package created and aligned to the remaining initiative
- 2026-04-07: recovered PR 569 onto a clean TER-1067 branch by porting the UX fix commit and deliberately not promoting the competing `docs/initiatives/...` tree to canonical status
- 2026-04-07: refreshed browser proof for copy-for-chat, overdue invoice contacts, command palette client-name search, orders queue client-name search, and record-payment remaining-balance confirmation
- 2026-04-07: rebuilt the missing reconciliation, review, analysis, and evidence artifacts under this canonical packet
- 2026-04-07: wrote back normalized tracker truth - `TER-1067` done, `TER-1058` done, `TER-1062` done, `TER-1054` and `TER-1057` active on the recovery branch, `TER-1064` duplicated into `TER-1048`
- 2026-04-08: reran merge-gate verification, confirmed `agent:prepare`, `check`, `lint`, touched-surface tests, and `build` on the recovery branch, and reproduced the unrelated repo-wide red failures on a clean `origin/main` worktree before proceeding with the replacement PR path

# Implement

## Active Milestone

Planning and tracker normalization.

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

# 2026-03-02 Feedback Video QA Gates

## Gate matrix

- QG-0 Intake Integrity (planning gate)
- QG-1 Requirements Coverage
- QG-2 Functional Validation
- QG-3 Blast Radius Verification
- QG-4 Adversarial Review
- QG-5 Release/Readiness Verdict

## QG-0 Intake Integrity

- Confirm all source artifacts loaded and referenced.
- Confirm resolved decisions are fixed inputs:
  - `non-shipping sales mode`
  - left controls (`number of units to add`, `+`)
  - `return_to_origin`
- Confirm `63/63` traceability coverage from QA logs.

## QG-1 Requirements Coverage

For every atomic ticket:

- Map each acceptance criterion to one or more proofs (test output, screenshot, command output).
- Mark unmet criteria as BLOCKED with explicit blocker owner.
- Store mapping in Linear child ticket and parent summary comment.

## QG-2 Functional Validation

Required checks (minimum):

- `pnpm check`
- `pnpm lint`
- `pnpm test`
- `pnpm build`
- Targeted module tests for touched surfaces.
- Browser/manual flow proof for user-visible behavior.

## QG-3 Blast Radius Verification

Review impacted domains per ticket:

- UI layout and accessibility focus order.
- Frontend state persistence (filters, drawers, post-save behavior).
- Backend transition/action semantics (for RED tasks).
- Pricing and accounting handoff correctness.
- Regression checks on neighboring surfaces in the same wave.

## QG-4 Adversarial Review

Required adversarial checks:

- Invalid numeric inputs (0, negative, decimal, non-numeric).
- Status change under active filters and race refresh.
- Drawer save failure and unsaved-edit preservation.
- Role-based action visibility under non-shipping default mode.

## QG-5 Release/Readiness Verdict

Wave close requires:

- No unresolved blockers.
- All child tickets have evidence packet.
- Parent comment updated with dependency closure + QA summary.
- Rollback path documented for each RED-risk task.

## Risk class policy

- SAFE: standard verification + targeted regression.
- STRICT: full QG-1..QG-4 before merge.
- RED: full QG-1..QG-5 + explicit rollback rehearsal notes.

## Evidence packet template (attach to each child)

- Atomic ID / Wave / Parent ticket.
- Acceptance criteria checklist with proof links.
- Command outputs (`check/lint/test/build`).
- Blast radius summary and targeted regressions.
- Adversarial findings and mitigations.
- Rollback steps and trigger conditions.

## Balanced Ladder (95/20) execution policy

- Per-ticket validation (delta checks):
  - `pnpm check`
  - targeted tests from atomic contract
  - `pnpm qa:test:smoke`
  - domain runtime suite(s) as routed by impact map
- Per-checkpoint baseline (once):
  - `pnpm check`
  - `pnpm lint`
  - `pnpm test`
  - `pnpm build`
  - aggregated domain suite(s) + staging runtime validation
- Ticket `Done` gate:
  - ticket evidence packet must include baseline-link fields:
    - `baseline_checkpoint_sha`
    - `baseline_full_quartet_ref`
    - `ticket_delta_checks_ref`
    - `blast_radius_ref`
    - `rollback_ref` (RED only)

## Automation entrypoints

- Impact map contract verifier:
  - `scripts/ci/verify-release-train-impact-map.sh`
- Ticket fast loop:
  - `scripts/qa/release-train/ticket-fast-loop.sh`
- Checkpoint baseline gate:
  - `scripts/qa/release-train/checkpoint-gate.sh`
- Final release gate:
  - `scripts/qa/release-train/final-gate.sh <staging-url>`

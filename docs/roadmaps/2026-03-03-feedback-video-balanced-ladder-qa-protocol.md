# 2026-03-03 Feedback Video Balanced Ladder QA Protocol

## Objective

Preserve V4 quality gates while removing duplicate heavy validation runs.

## Policy

1. Per-ticket uses targeted validation (delta checks).
2. Per-checkpoint uses one full quartet baseline.
3. Staging runtime validation is mandatory after each checkpoint merge.
4. RED tickets still require QG-5 rollback readiness evidence.

## Execution Sequence

1. `scripts/ci/verify-release-train-impact-map.sh`
2. Per ticket:
   - `scripts/qa/release-train/ticket-fast-loop.sh ...`
3. Per checkpoint:
   - `scripts/qa/release-train/checkpoint-gate.sh ...`
4. Final close:
   - `scripts/qa/release-train/final-gate.sh <staging-url>`

## Evidence Contract

Ticket evidence packets must include:

- `baseline_checkpoint_sha`
- `baseline_full_quartet_ref`
- `ticket_delta_checks_ref`
- `blast_radius_ref`
- `rollback_ref` (RED required)

Template:

- `docs/roadmaps/2026-03-02-feedback-video-evidence-packet-v2-template.md`

## Notes

- A ticket may move to `QA-READY` after targeted PASS.
- A ticket may move to `Done` only after checkpoint baseline + staging runtime evidence is linked.
- If impact mapping is uncertain, escalate to broader domain suites.

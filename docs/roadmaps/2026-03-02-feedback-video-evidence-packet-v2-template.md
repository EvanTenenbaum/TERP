# Feedback Video Ticket Evidence Packet v2 (Balanced Ladder)

Use this template for TER-479..TER-522 child tickets.

## Metadata

- ticket:
- atomic_id:
- wave:
- risk_class: `SAFE|STRICT|RED`
- assignee:
- generated_at_utc:

## Baseline-Link Fields

- baseline_checkpoint_sha:
- baseline_full_quartet_ref: (`pnpm check`, `pnpm lint`, `pnpm test`, `pnpm build` checkpoint bundle)
- ticket_delta_checks_ref: (targeted tests, domain/runtime QA logs, adversarial logs)
- blast_radius_ref:
- rollback_ref: (required for RED)

## QG-1 Requirements Coverage

- [ ] AC-1 + proof
- [ ] AC-2 + proof
- [ ] AC-3 + proof

## QG-2 Functional Validation

- [ ] `pnpm check`
- [ ] targeted tests from atomic roadmap
- [ ] `pnpm qa:test:smoke`
- [ ] `pnpm qa:test:<domain>` (as required)

## QG-3 Blast Radius Verification

- impacted domains:
- regressions executed:
- result:

## QG-4 Adversarial Verification

- invalid numeric (`0`, negative, decimal, non-numeric):
- filter/status race behavior:
- failed save + unsaved edit retention:
- RBAC visibility boundary:

## QG-5 Release/Readiness (RED required)

- rollback trigger:
- rollback steps:
- rollback rehearsal evidence:

## Verdict

- QA Verdict: `PASS|BLOCKED`
- blockers (if any):
- next action:

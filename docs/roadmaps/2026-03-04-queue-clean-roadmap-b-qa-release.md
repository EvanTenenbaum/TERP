# 2026-03-04 Queue-Clean Roadmap B (Tests + Release Gates)

## Objective

Finish all remaining test, QA, and release-gate work after Roadmap A so the queue can be fully closed with high-confidence release evidence.

Primary references:

- [TER-190](https://linear.app/terpcorp/issue/TER-190/eliminate-soft-assertions-and-conditional-skips-in-critical)
- [TER-195](https://linear.app/terpcorp/issue/TER-195/test-auth-fixtures-remove-silent-admin-fallback-for-role-specific)
- [TER-349](https://linear.app/terpcorp/issue/TER-349/ssx-501-build-automated-contract-and-renderer-test-suite)
- [TER-350](https://linear.app/terpcorp/issue/TER-350/ssx-502-add-end-to-end-coverage-for-composeshareexportconvert)
- [TER-353](https://linear.app/terpcorp/issue/TER-353/ssx-505-execute-release-gating-monitoring-and-rollback-rehearsal)
- [TER-311](https://linear.app/terpcorp/issue/TER-311/ssx-000-sales-sheet-atomic-roadmap-orchestration-and-readiness-gates)

Operational gate prerequisites (non-Linear but required for truthful release gate):

- Health endpoint contract alignment (`/health` vs `/api/health`) in docs/scripts.
- Runtime log verification path ready (required credentials/config available).

## Release Train Topology

- Pattern: supervisor + specialized QA lanes + independent adversarial lane.
- Integration branch: `release/queue-clean-qa-20260304`.
- Merge rule: no ticket merge without V4 QA PASS packet and reproducible test artifacts.
- Gate rule: no release verdict without live staging verification + rollback rehearsal evidence.

## Atomic Task Index

| Atomic ID | Ticket/Ref                                                                                                                | Title                                              | Risk   | Owner Lane                     | Depends On          | Parallel Group |
| --------- | ------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- | ------ | ------------------------------ | ------------------- | -------------- |
| QA-00     | Program control                                                                                                           | Supervisor scaffold, evidence matrix, lane kickoff | strict | Supervisor                     | none                | G0             |
| QA-01     | [TER-190](https://linear.app/terpcorp/issue/TER-190/eliminate-soft-assertions-and-conditional-skips-in-critical)          | Remove soft assertions/skips in critical tests     | red    | Test integrity lane            | QA-00               | G1             |
| QA-02     | [TER-195](https://linear.app/terpcorp/issue/TER-195/test-auth-fixtures-remove-silent-admin-fallback-for-role-specific)    | Remove admin fallback from role-critical fixtures  | red    | Auth fixture lane              | QA-00               | G1             |
| QA-03     | [TER-349](https://linear.app/terpcorp/issue/TER-349/ssx-501-build-automated-contract-and-renderer-test-suite)             | Build contract + renderer automated suite          | red    | Contract test lane             | QA-00               | G1             |
| QA-04     | [TER-350](https://linear.app/terpcorp/issue/TER-350/ssx-502-add-end-to-end-coverage-for-composeshareexportconvert)        | Full Sales Sheet E2E coverage                      | red    | E2E lane                       | QA-01, QA-02, QA-03 | G2             |
| QA-05     | Ops prerequisite                                                                                                          | Align health-check contract in code/docs/scripts   | strict | Release readiness lane         | QA-00               | G1             |
| QA-06     | Ops prerequisite                                                                                                          | Restore runtime log-verification readiness         | strict | Observability lane             | QA-00               | G1             |
| QA-07     | [TER-353](https://linear.app/terpcorp/issue/TER-353/ssx-505-execute-release-gating-monitoring-and-rollback-rehearsal)     | Execute release gating + rollback rehearsal        | red    | Release gate lane              | QA-04, QA-05, QA-06 | G3             |
| QA-08     | [TER-311](https://linear.app/terpcorp/issue/TER-311/ssx-000-sales-sheet-atomic-roadmap-orchestration-and-readiness-gates) | Parent closeout with full evidence packet          | red    | Supervisor + Linear clerk lane | QA-07               | G4             |

## Detailed Task Cards

### QA-00

- Create execution ledger at `docs/roadmaps/checkpoint-bundles/2026-03-04-queue-clean-qa-ledger.md`.
- Create requirements-to-evidence matrix for all QA tasks.

### QA-01 (TER-190)

- Remove `expect(true).toBeTruthy()` anti-patterns and tautological assertions.
- Replace conditional skips with explicit preconditions and failure-visible outcomes.
- Ensure failures are actionable and deterministic.

### QA-02 (TER-195)

- Remove fallback behavior from role-critical tests.
- Ensure role tests fail when role fixture/login is unavailable.
- Add explicit diagnostics so failures are informative, not silent.

### QA-03 (TER-349)

- Add contract tests for canonical Sales Sheet model semantics.
- Add renderer parity tests across shared HTML, PDF, and text outputs.
- Add CI gate checks for contract and parity regressions.

### QA-04 (TER-350)

- Add E2E coverage for compose, save draft, share, export, convert-to-order, and convert-to-live-session.
- Cover active/expired/revoked share-link states and failure recovery paths.
- Remove existing skipped tests by replacing missing preconditions with deterministic setup.

### QA-05 (Ops prerequisite)

- Normalize health-check contract across docs and scripts.
- Ensure gate scripts and protocol text reference the actual endpoint behavior.

### QA-06 (Ops prerequisite)

- Ensure runtime log verification can be executed in the release gate environment.
- Document exact command and expected output contract for log checks.

### QA-07 (TER-353)

- Execute full release gate: regression, staging runtime verification, monitoring checks, rollback rehearsal.
- Produce PASS/BLOCKED verdict with explicit stop/go rationale.

### QA-08 (TER-311)

- Close parent only after all child acceptance criteria are evidenced.
- Publish final readiness packet with links to artifacts, commits, PRs, logs, and screenshots.

## Parallelization Strategy

- G0: QA-00.
- G1 (parallel): QA-01, QA-02, QA-03, QA-05, QA-06.
- G2: QA-04.
- G3: QA-07.
- G4: QA-08.

## Mandatory Verification Gate (Per Atomic Task)

- `pnpm check`
- `pnpm lint`
- `pnpm test`
- `pnpm build`
- Task-specific suites (contract tests, E2E suites, route checks, rollback drill)
- Live staging verification where applicable
- Blast-radius and adversarial review notes

## Claude Supervisor Prompt (Copy/Paste)

```text
You are the supervisor for Roadmap B: tests and release gates.

Activate and follow these operating patterns:
- gated-agent-release-train
- codex-multi-agent-patterns
- strict V4 QA gate per atomic task

Execution objective:
Eliminate false confidence in tests, complete Sales Sheet QA gates, run release rehearsal, and close parent readiness ticket with full evidence.

Scope:
QA-00..QA-08 from docs/roadmaps/2026-03-04-queue-clean-roadmap-b-qa-release.md

Branch/worktree strategy:
- Integration branch: release/queue-clean-qa-20260304
- One child branch per atomic task
- No main merges without final release PASS

Parallel team lanes:
1) Test integrity lane: QA-01
2) Auth fixture lane: QA-02
3) Contract test lane: QA-03
4) E2E lane: QA-04
5) Release readiness lane: QA-05
6) Observability lane: QA-06
7) Release gate lane: QA-07
8) Linear clerk lane: QA-08 status/writebacks only
9) Adversarial QA lane: independent failure injection and edge-case attempts

Handoff packet contract (required for every lane handoff):
{
  "objective": "Atomic task objective",
  "inputs": ["ticket links", "file paths", "prior commits"],
  "constraints": ["risk mode", "dependency lock", "no hidden skips", "no silent fallback"],
  "output_schema": "changed files, tests run, artifacts, gate verdict, rollback note",
  "verification": ["pnpm check", "pnpm lint", "pnpm test", "pnpm build", "task-specific suites", "staging checks"]
}

Quality bar:
- V4 QA PASS mandatory for each task
- No skipped critical tests unless explicitly approved and tracked with expiry
- No role fallback in role-critical coverage
- Release verdict must include rollback drill evidence and runtime logs

Merge arbitration:
- Evidence wins over narrative
- Failed or missing artifacts => BLOCKED
- Supervisor publishes final PASS/BLOCKED for each atomic task

Closeout requirements:
- QA-07 release gate PASS
- QA-08 parent ticket closure packet complete
- Final report includes: commit SHAs, PRs, command outputs, screenshots, logs, rollback drill timing/results, residual risks
```

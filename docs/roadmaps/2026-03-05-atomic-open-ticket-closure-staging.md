# Atomic Open-Ticket Closure Roadmap (Staging-Validated)

**Date**: 2026-03-05  
**Branch**: `claude/execute-parallel-plan-bZelt`  
**Objective**: Close all currently-open LEX/STX child tickets with code-backed completion and live staging validation evidence.

## Scope

In scope:

- LEX: `TER-547`, `TER-553`, `TER-560`
- STX: `TER-536`, `TER-537`, `TER-538`, `TER-539`, `TER-540`, `TER-543`, `TER-544`

Out of scope:

- Unrelated roadmap items
- Production deploy/promotion

## Work Units

| Unit | Tickets           | Deliverables                                                                                            | Acceptance Gate                                                                    |
| ---- | ----------------- | ------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| U1   | TER-547           | Citation-backed authority conflict matrix + machine-referenceable precedence artifact                   | Source precedence explicit, citations included, ambiguity categorized by family    |
| U2   | TER-553           | `audit:terminology*` scripts + docs/audits JSON+MD pipeline                                             | Commands exist and generate audit artifacts in `docs/audits/`                      |
| U3   | TER-560           | Extended tests for strict mode, alias pass/fail, report generation, severity mapping                    | Terminology unit tests pass with new coverage                                      |
| U4   | TER-536           | Canonical runbook at `docs/testing/STRESS_TESTING_RUNBOOK.md`                                           | Runbook defines `qa:stress` command contract and lane order/stop rules             |
| U5   | TER-537 + TER-540 | New orchestrator `scripts/stress/run-stress-testing.sh` + profile config `scripts/stress/profiles.json` | Orchestrator executes preflight -> browser -> load -> invariants -> bundle/verdict |
| U6   | TER-538           | New strict preflight `scripts/stress/preflight.sh` with blocker reporting                               | Fails fast with explicit blockers, no auto-repair                                  |
| U7   | TER-539           | New mixed traffic k6 script `scripts/stress/staging-mixed-traffic.k6.js`                                | Weighted traffic + threshold abort + deterministic k6 summary export               |
| U8   | TER-543           | Artifact contract at `qa-results/stress/<timestamp>/` + machine verdict                                 | Complete parseable evidence bundle with PASS/BLOCKED verdict and reasons           |
| U9   | TER-544           | `qa:stress*` package commands + AGENTS/CLAUDE phrase mapping                                            | Phrase `run stress testing` maps to canonical command path                         |

## Verification Gates

### Local deterministic gates

```bash
pnpm check
pnpm lint
pnpm test tests/unit/terminology/term-map.test.ts
```

### Stress command contract gates

```bash
pnpm qa:stress:preflight --env=staging
pnpm qa:stress --env=staging --profile=smoke
```

### Live staging validation outputs

Required evidence directory:

- `qa-results/stress/<timestamp>/`

Required files:

- `preflight.log`
- `browser-lane.log`
- `k6-summary.json`
- `invariants.log`
- `verdict.json`
- `VERDICT.md`
- `BLOCKERS.md` (only when blocked)

## Execution Evidence (2026-03-05)

### Local gates

- `pnpm check` -> pass
- `pnpm lint` -> pass
- `pnpm test` -> pass (`223` files, `5860` passed, `19` skipped)
- `pnpm build` -> pass
- `pnpm audit:terminology` -> pass (artifacts generated under `docs/audits/`)

### Staging stress runs

- Preflight (initial): `qa-results/stress/preflight-20260305-093546` -> blocked due missing runtime env vars in shell.
- Preflight (with runtime env): `qa-results/stress/preflight-20260305-093722` -> pass.
- Smoke run: `qa-results/stress/20260305-093944-smoke` -> **PASS**.
- Peak run: `qa-results/stress/20260305-094247-peak` -> **PASS**.

### Key smoke metrics (`20260305-093944-smoke`)

- `http_req_duration p95`: `338.16ms`
- `http_req_failed`: `0.00%` (`0/288`)
- `http_reqs`: `288` (`5.65 req/s`)
- Invariants strict: `8/8` pass

### Key peak metrics (`20260305-094247-peak`)

- `http_req_duration p95`: `200.66ms`
- `http_req_failed`: `0.00%` (`0/4293`)
- `http_reqs`: `4293` (`26.74 req/s`)
- Invariants strict: `8/8` pass

### Defects found and resolved during execution

- `pnpm qa:stress:* --env=staging` argument parsing mismatch (pnpm-escaped `--env\\=staging`) -> fixed parser support for `--flag value`, `--flag=value`, and `--flag\\=value` in:
  - `scripts/stress/preflight.sh`
  - `scripts/stress/run-stress-testing.sh`
- Docker k6 summary export path wrote to unmapped host path -> fixed container summary path mapping in `scripts/stress/run-stress-testing.sh`.
- k6 expected 401/404 probe responses were being counted as request failures -> fixed with explicit response callback in `scripts/stress/staging-mixed-traffic.k6.js`.

## Linear Closeout Plan

After all gates pass:

1. Update ticket status to `Done` for all nine open tickets.
2. Attach evidence summary to parent issues (`TER-546`, `TER-528`) using available Linear tooling.
3. Record any blocked residual work as explicit follow-up issues.

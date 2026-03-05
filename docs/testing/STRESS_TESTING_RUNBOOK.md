# STRESS TESTING RUNBOOK (Canonical Command Contract)

**Status**: Canonical
**Scope**: STX-001..STX-010 staging stress workflow
**Target**: `https://terp-staging-yicld.ondigitalocean.app`

## Canonical Commands

```bash
pnpm qa:stress --env=staging --profile=smoke
pnpm qa:stress --env=staging --profile=peak
pnpm qa:stress --env=staging --profile=soak
pnpm qa:stress:preflight --env=staging
```

## Required Execution Order

Every `qa:stress` run must execute this fixed lane order:

1. Preflight gate (`scripts/stress/preflight.sh`)
2. Browser critical lane (`pnpm test:staging-critical`)
3. API load lane (`scripts/stress/staging-mixed-traffic.k6.js`)
4. Invariants strict gate (`pnpm gate:invariants:strict`)
5. Evidence bundle + verdict generation

## Stop Conditions (Hard Block)

Stop immediately and mark `BLOCKED` when any of these occur:

- Preflight fails
- Browser lane fails
- k6 critical threshold aborts
- Invariant gate fails
- Artifact/verdict generation fails

No hidden retries are allowed.

## NO_REPAIR Policy

Stress execution is observational only. It must never auto-fix environment problems during a run.

- `NO_REPAIR=1` is enforced by the orchestrator
- Any missing dependency or environment issue must generate blocker evidence and stop

## Artifact Contract

Each run must write to:

- `qa-results/stress/<timestamp>/`

Required files:

- `preflight.log`
- `browser-lane.log`
- `k6-summary.json`
- `invariants.log`
- `verdict.json`
- `VERDICT.md`
- `BLOCKERS.md` (only when blocked)

## Out Of Scope (Explicit)

During stress execution, these are out of scope:

- Infrastructure repair
- Package installation
- Playwright/k6 config rewrites
- Test-suite redesign

File follow-up issues for repair work. Do not mutate the run path.

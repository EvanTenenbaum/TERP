# Test Infrastructure Improvement Roadmap

**Created**: 2026-03-07
**Source**: Staging load test analysis (chain runner: 38 pass / 16 fail across 57 chains)
**Status**: PROPOSED

---

## Executive Summary

TERP's test infrastructure has three parallel systems (chains, oracles, stress) that are individually well-architected but suffer from fragmentation, code duplication (40KB), lack of CI integration, and no unified observability. This roadmap addresses the highest-impact gaps in 4 atomic waves.

**Current State**: 83 chains, 40 oracle YAMLs, 3 stress profiles, 40+ unit test files
**Key Finding**: 30 of 46 test failures were test infrastructure issues, not app bugs — selector staleness, missing preconditions, and no retry logic mask real bugs.

---

## Wave 1: Stabilize & Classify (Priority: Urgent)

Goal: Stop misclassifying test infra failures as app bugs. Get chains into CI.

### STI-001: Add chain tests to CI pre-merge pipeline

- **What**: Add `chain-runner.spec.ts` to `.github/workflows/pre-merge.yml` with `@staging-critical` tag
- **Why**: Chains only run manually; regressions discovered too late
- **Files**: `.github/workflows/pre-merge.yml`, `playwright.config.ts`
- **Estimate**: 2 hours
- **Risk**: Low (additive change)

### STI-002: Implement screenshot retention policy

- **What**: Add cleanup script that retains only last 7 days of screenshots in `test-results/chain-screenshots/`
- **Why**: 20K+ screenshots growing unbounded; disk bloat and difficult forensics
- **Files**: New `scripts/cleanup-test-screenshots.sh`, add to CI post-step
- **Estimate**: 1 hour
- **Risk**: Low

### STI-003: Create known flakes registry

- **What**: Create `tests-e2e/chains/KNOWN_FLAKES.md` documenting known selector instabilities and expected intermittent failures
- **Why**: 30 test_infra failures currently mixed with 16 real app bugs
- **Files**: New `tests-e2e/chains/KNOWN_FLAKES.md`
- **Estimate**: 2 hours
- **Risk**: Low

### STI-004: Add per-action retry with backoff

- **What**: Add configurable retry logic (max 2 retries, 500ms/1000ms backoff) to `chain-executor.ts` `executeAction()`
- **Why**: Transient click/selector failures cause false negatives; currently zero retries
- **Files**: `tests-e2e/chains/chain-executor.ts`
- **Estimate**: 3 hours
- **Risk**: Low (retries are bounded)

### STI-005: Fix network idle timeout for staging

- **What**: Increase `NETWORK_IDLE_TIMEOUT_MS` default from 5000ms to 10000ms for staging; make configurable via env var
- **Why**: Staging cold-starts often exceed 5s; causes false timeout failures
- **Files**: `tests-e2e/chains/chain-executor.ts`
- **Estimate**: 30 minutes
- **Risk**: Low

---

## Wave 2: Unify & Deduplicate (Priority: High)

Goal: Eliminate code duplication between chain and oracle executors. Build a shared action engine.

### STI-006: Merge oracle executor into chain executor

- **What**: Extract shared action execution logic from both `chain-executor.ts` (1337 lines) and `oracles/executor.ts` (~98KB) into a shared `tests-e2e/shared/action-engine.ts`
- **Why**: 40KB+ of duplicated click/type/select/assert logic; changes must be made in two places
- **Files**: New `tests-e2e/shared/action-engine.ts`, refactor both executors
- **Estimate**: 8 hours
- **Risk**: Medium (must not break either system)
- **Gate**: Both chain-runner and oracle-runner must pass after merge

### STI-007: Add YAML schema validation for oracle tests

- **What**: Add JSON Schema validation for `.oracle.yaml` files; validate on load in `loader.ts`
- **Why**: Typos in YAML files silently ignored; hard to debug
- **Files**: New `tests-e2e/oracles/oracle-schema.json`, `tests-e2e/oracles/loader.ts`
- **Estimate**: 3 hours
- **Risk**: Low

### STI-008: Implement test data factory

- **What**: Create `tests-e2e/shared/test-data-factory.ts` with `ensureClient()`, `ensureBatch()`, `ensureLocation()` etc. that create entities via tRPC API when preconditions are missing
- **Why**: Chain preconditions only check existence; fail if seed data missing rather than creating it
- **Files**: New `tests-e2e/shared/test-data-factory.ts`, update `chain-executor.ts` `setupPreconditions()`
- **Estimate**: 6 hours
- **Risk**: Medium (creates real data on staging; needs cleanup)

---

## Wave 3: Observability & Trending (Priority: High)

Goal: Build unified test health visibility. Track trends over time.

### STI-009: Build test results aggregation dashboard

- **What**: Create a lightweight HTML report aggregating results from `test-results.json` + chain screenshots + stress results. Show pass/fail rates, flakiness trends, p95 latency over time.
- **Why**: No way to see overall test health; regressions discovered late
- **Files**: New `scripts/generate-test-report.ts`, output to `qa-results/dashboard/index.html`
- **Estimate**: 8 hours
- **Risk**: Low (read-only reporting)

### STI-010: Add structured chain result logging

- **What**: Output chain results as structured JSON to `qa-results/chain-runs/<date>.json` with chain_id, duration_ms, failure_type, phase details
- **Why**: Current results scattered across screenshots and console output; no queryable format
- **Files**: `tests-e2e/chains/chain-runner.spec.ts`
- **Estimate**: 3 hours
- **Risk**: Low

### STI-011: Implement stress result trending

- **What**: After each stress run, append results to `qa-results/stress-history.json` with timestamp, profile, p95, error_rate, VU count
- **Why**: Can't detect latency regressions over time; each run is isolated
- **Files**: `scripts/stress/run-stress-testing.sh`, new `scripts/stress/append-results.sh`
- **Estimate**: 3 hours
- **Risk**: Low

### STI-012: Add chain selector health monitoring

- **What**: Log all selector resolution attempts and failures to a structured file; identify selectors that fail >10% of the time as "stale candidates"
- **Why**: Selector staleness is the #1 cause of false negatives (30 of 46 failures)
- **Files**: `tests-e2e/chains/chain-executor.ts`, new `tests-e2e/shared/selector-health.ts`
- **Estimate**: 4 hours
- **Risk**: Low

---

## Wave 4: Automate & Scale (Priority: Medium)

Goal: Automate stress testing in CI. Enable parallel execution.

### STI-013: Rewrite stress orchestrator in TypeScript

- **What**: Replace `scripts/stress/run-stress-testing.sh` (224 lines of shell) with a TypeScript orchestrator that handles lane execution, result aggregation, and partial failure recovery
- **Why**: Shell script is hard to test, version, extend; can't do conditional logic well
- **Files**: New `scripts/stress/orchestrator.ts`, deprecate `run-stress-testing.sh`
- **Estimate**: 8 hours
- **Risk**: Medium (must maintain parity with shell script)

### STI-014: Add automated stress gate to CI

- **What**: Add stress smoke profile as required CI check before production promotion. Runs `pnpm qa:stress --env=staging --profile=smoke` automatically on PR to main.
- **Why**: Stress tests are manual-only; latency regressions escape to production
- **Files**: New `.github/workflows/stress-gate.yml`
- **Estimate**: 4 hours
- **Risk**: Medium (CI time increase; needs fast smoke profile)
- **Dependency**: STI-013 (TypeScript orchestrator)

### STI-015: Enable parallel chain execution (2-4 workers)

- **What**: Configure Playwright to use 2-4 workers for chain tests; ensure chains don't share mutable state
- **Why**: 83 chains take ~30 min sequentially; could be ~8 min with 4 workers
- **Files**: `playwright.config.ts`, audit all chain definitions for shared state
- **Estimate**: 4 hours
- **Risk**: Medium (potential data contention; need chain isolation)

### STI-016: Add BullMQ queue coverage to stress tests

- **What**: Add k6 scenarios that test queue endpoints (job submission, status polling, result retrieval)
- **Why**: BullMQ queue is a critical infrastructure component with zero stress coverage
- **Files**: New `tests/stress/queue-stress.k6.js`, update profiles.json
- **Estimate**: 6 hours
- **Risk**: Medium (queue load can affect staging workers)

---

## Dependency Graph

```
Wave 1 (no dependencies - all can run in parallel)
  STI-001 ──┐
  STI-002 ──┤
  STI-003 ──┤── All independent
  STI-004 ──┤
  STI-005 ──┘

Wave 2 (depends on Wave 1 stability)
  STI-006 ──┐
  STI-007 ──┤── Independent within wave
  STI-008 ──┘

Wave 3 (depends on Wave 1 + 2)
  STI-009 ──── depends on STI-010 (needs structured data to aggregate)
  STI-010 ──┐
  STI-011 ──┤── Independent within wave
  STI-012 ──┘

Wave 4 (depends on all prior waves)
  STI-013 ──── standalone
  STI-014 ──── depends on STI-013
  STI-015 ──── depends on STI-008 (needs data factory for isolation)
  STI-016 ──── standalone
```

## Success Criteria

| Metric                 | Current                         | Target                |
| ---------------------- | ------------------------------- | --------------------- |
| False negative rate    | ~65% (30/46 failures are infra) | <10%                  |
| Chain execution time   | ~30 min                         | <10 min               |
| Code duplication       | 40KB+                           | <5KB                  |
| Stress automation      | Manual only                     | CI-gated smoke        |
| Test health visibility | None                            | Dashboard with trends |
| Screenshot disk usage  | Unbounded                       | 7-day retention       |

## Total Effort Estimate

| Wave      | Tasks        | Hours         | Calendar Time  |
| --------- | ------------ | ------------- | -------------- |
| Wave 1    | 5 tasks      | ~9 hours      | 1-2 days       |
| Wave 2    | 3 tasks      | ~17 hours     | 3-4 days       |
| Wave 3    | 4 tasks      | ~18 hours     | 3-4 days       |
| Wave 4    | 4 tasks      | ~22 hours     | 4-5 days       |
| **Total** | **16 tasks** | **~66 hours** | **~2-3 weeks** |

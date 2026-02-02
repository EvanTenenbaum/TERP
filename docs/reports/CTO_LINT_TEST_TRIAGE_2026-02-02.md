# CTO Triage: Lint/Test Findings (2026-02-02)

## Executive Summary

- The repo-wide lint sweep reports **1842 errors** and **264 warnings**, dominated by type-safety violations (`any`), React lint issues, and key/unused-variable violations.
- The test run fails in two suites: a DB-dependent comments router test (MySQL connection refused) and an integration test that imports Jest globals inside Vitest.
- These are systemic quality blockers; remediation should be staged by blast radius, with test infrastructure fixes first, then lint debt reduction in focused batches.

## Top Risks (Severity Ordered)

1. **Test infrastructure instability (P0)**
   - `server/routers/comments.test.ts` attempts real DB writes and fails when `DATABASE_URL` is unreachable.
   - `tests/integration/data-integrity.test.ts` imports `@jest/globals`, which is incompatible with Vitest.
   - Impact: CI cannot be trusted to gate regressions; local dev runs are inconsistent.

2. **Type-safety regressions (P1)**
   - Large volume of `@typescript-eslint/no-explicit-any` violations and non-null assertions.
   - Impact: makes runtime error detection harder and violates project non-negotiables.

3. **React correctness & maintainability (P1)**
   - `react/no-array-index-key` usage and `React` undefined (no-undef) in several JSX files.
   - Impact: destabilizes UI behavior, hurts reconciliation correctness, and breaks lint gate.

4. **Hygiene & operational noise (P2)**
   - Excess unused variables and console usage warnings.
   - Impact: hides real issues and drives warning fatigue.

## Triage Plan

### Phase 0: Restore test signal (Immediate)

- **Normalize test runners**: migrate `tests/integration/data-integrity.test.ts` from Jest globals to Vitest APIs or move it to a Jest-only runner if required.
- **Stabilize DB tests**: adopt a test database strategy (containerized MySQL or a deterministic mock layer) for `server/routers/comments.test.ts` and any other DB-dependent suites.
- **Outcome**: `pnpm test` should reliably pass or fail for real regressions.

### Phase 1: Reduce blocking lint debt (Short term)

- **Bulk eliminate `any`** by prioritizing core/shared modules and top-level hooks/services first.
- **Fix React undefined** by standardizing the JSX runtime configuration and importing React where required.
- **Replace index keys** where stateful lists exist; tolerate in static/immutable lists only with explicit justification.

### Phase 2: Tighten hygiene (Mid term)

- Sweep unused vars and console warnings in large batches, likely per folder/module.
- Enforce linting in CI with a clear error budget to prevent future drift.

## Recommended Owners / Streams

- **Test Infra Stream**: Backend + QA (fix Jest/Vitest mismatch, DB strategy).
- **Type Debt Stream**: Core platform engineers (eradicate `any` + non-null assertions).
- **UI Lint Stream**: Frontend engineers (React lint violations, key usage).

## Success Criteria

- `pnpm test` completes without infra-related failures in clean environments.
- Lint errors reduced by >80% in the first two sprints, with explicit tracking for remaining hotspots.
- CI gates enforced on lint/test so drift cannot re-accumulate.

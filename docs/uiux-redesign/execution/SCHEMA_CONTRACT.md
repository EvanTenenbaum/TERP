# Schema Contract

## Contract
- Redesign execution must not introduce schema mutations.
- Unknown-column checks and skipped checks are failures in strict mode.
- Seed path must validate schema preconditions and fail fast instead of creating/alering tables.

## Required Strict Commands
- `pnpm validate:schema`
- `pnpm audit:schema-drift:strict`
- `pnpm audit:schema-fingerprint:strict`
- `pnpm test:schema`
- `pnpm exec tsx scripts/qa/invariant-checks.ts --strict`

## Current Enforcement Notes
- `scripts/qa/invariant-checks.ts` supports `--strict` and fails skipped checks.
- `scripts/seed/seed-redesign-v2.ts` no longer applies compatibility DDL (`CREATE TABLE IF NOT EXISTS` / `ALTER TABLE`).
- Redesign seed now asserts required table/column preconditions and exits with actionable failure if schema is not ready.
- Current strict invariant failures are data integrity defects (`AR-002`, `ORD-001`), not schema/column mismatches.
- Phase 5 strict schema lane passed in two consecutive full runs:
  - `.qa/runs/2026-02-21/phase-5/P5-full-gates-passA-16/verification.md`
  - `.qa/runs/2026-02-21/phase-5/P5-full-gates-passB-17/verification.md`
- Phase 6 adversarial/fix rounds completed without schema drift:
  - `.qa/runs/2026-02-21/phase-6/P6-adversarial-fix2-21/verification.md`
- Final strict schema lane rerun with explicit local DB env passed:
  - `.qa/runs/2026-02-21/phase-6/P6-schema-strict-rerun-23/verification.md`

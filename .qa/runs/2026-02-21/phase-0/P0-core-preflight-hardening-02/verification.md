# Verification

Verdict: VERIFIED
Task ID: P0-core-preflight-hardening-02
Phase: phase-0
Run Date: 2026-02-21

Evidence:
- commands.log
- notes.md

Summary:
- `scripts/qa/feature-parity.sh` now uses parser-safe CSV manifest evaluation via `scripts/uiux/execution/parity-manifest-report.mjs`.
- `scripts/qa/invariant-checks.ts` now supports `--strict` and treats skipped/unknown-column checks as failures.
- Invariant SQL was updated to actual schema column names; strict mode now surfaces real data defects, not parser/schema-mismatch skips.
- `scripts/seed/seed-redesign-v2.ts` compatibility DDL was removed and replaced by schema precondition assertions.
- `scripts/uiux/north-star-evidence.mjs` now requires explicit runtime URL (`BASE_URL`, `PLAYWRIGHT_BASE_URL`, or `--base-url`).

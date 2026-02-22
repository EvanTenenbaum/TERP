VERIFIED

Task ID: P6-direct-intake-remediation-37
Date: 2026-02-21
Scope: Direct Intake remediation for stale top-controls submit behavior + full evidence artifact completion.

## Code Changes Verified
- `/Users/evan/spec-erp-docker/TERP/TERP-codex-calm-power/client/src/components/work-surface/DirectIntakeWorkSurface.tsx`
  - Added `updateRows(...)` and `updateRowMediaFilesById(...)` ref-synchronized state update helpers.
  - Replaced operational row/media state writes to remove stale render/ref windows during fast edit -> submit interactions.
- `/Users/evan/spec-erp-docker/TERP/TERP-codex-calm-power/tests-e2e/golden-flows/gf-001-direct-intake.spec.ts`
  - Added regression test for `+5 Rows` + top-control edits + immediate submit selected row without stale Brand/Farmer validation errors.

## Required Evidence Files
- `commands.log`
- `console.log`
- `network.log`
- `notes.md`
- `screens/direct-intake-desktop-remediation-final.png`
- `screens/direct-intake-mobile-remediation-final.png`

## Verification Commands and Outcomes
- `pnpm exec eslint --config eslint.config.strict.js client/src/components/work-surface/DirectIntakeWorkSurface.tsx` -> PASS (warnings only)
- `pnpm exec eslint tests-e2e/golden-flows/gf-001-direct-intake.spec.ts` -> PASS
- `PLAYWRIGHT_BASE_URL=http://localhost:5173 pnpm exec playwright test tests-e2e/golden-flows/gf-001-direct-intake.spec.ts tests-e2e/golden-flows/gf-002-procure-to-pay.spec.ts tests-e2e/golden-flows/work-surface-keyboard.spec.ts --project=chromium --workers=1` -> PASS (`38 passed`, `5 skipped`, `0 failed`)
- `pnpm validate:schema` -> PASS (`0 issues`)
- `pnpm audit:schema-drift:strict` -> PASS
- `SCHEMA_FINGERPRINT_OPTIONAL_CHECKS='cron_leader_lock.table' pnpm audit:schema-fingerprint:strict` -> PASS (`6/6 required checks complete`)
- `pnpm exec tsx scripts/qa/invariant-checks.ts --strict` -> PASS (`8/8`)
- `pnpm test:schema` -> PASS (`2695 passed`, `5 skipped`)
- Manual browser stress check (12 rapid Add Row -> top control edit -> Submit Selected cycles) -> PASS (`0` Brand/Farmer errors, `0` Request-ID errors, `0` unexpected error toasts)

## Functional Outcome
- Could not reproduce the reported stale Direct Intake failure after remediation.
- Selected-row top controls reliably persisted values before submit in repeated stress runs.
- Strict schema/column/invariant checks remained green after code changes.

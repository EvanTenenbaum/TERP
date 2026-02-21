# Notes

## Root Cause Focus
The failure pattern was consistent with stale selected-row state during very fast top-control edits followed by submit. The remediation enforces synchronous ref/state alignment at write time, not after-render (`useEffect`), so submit handlers read current row values.

## Pragmatic Rule Variance (with evidence)
- Variance: strict eslint config was not used on the touched Playwright spec file.
- Why: `eslint.config.strict.js` uses a TS project scope that excludes `tests-e2e/**`, causing parser failure unrelated to actual lint quality.
- Evidence: parser error captured in `commands.log` for `tests-e2e/golden-flows/gf-001-direct-intake.spec.ts`.
- Mitigation: strict lint kept for touched app source file; standard project eslint run used for touched e2e spec; full e2e + strict schema lane rerun completed green.

## Additional Observations
- Browser console continues to show AG Grid warnings unrelated to this remediation.
- No explicit `any`, `@ts-ignore`, or `eslint-disable @typescript-eslint/no-explicit-any` were introduced in touched files.

## Scope Integrity
- No DB schema changes were made.
- No backend API contract refactor was introduced.
- Terminology lock and in-scope behavior were preserved for this remediation packet.

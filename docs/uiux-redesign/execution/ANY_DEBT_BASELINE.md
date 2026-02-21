# Any Debt Baseline

Generated: 2026-02-21

## Scope Rules
- Existing legacy debt outside touched files may exist.
- New debt in touched files is not allowed.
- Prefer debt reduction when practical.

## Global Baseline
- Explicit `any`: `1006` (regex scan: `\\bany\\b` across `client`, `server`, `scripts`, `shared`, `tests` excluding markdown/json/csv).
- `@ts-ignore`: `5`.
- `eslint-disable @typescript-eslint/no-explicit-any`: `158`.

## Tracking Method
- Use `pnpm uiux:execution:no-any-regression <touched-files>` for packet checks.
- Record global deltas after Phase 5 full quality sweep.

## Post-Execution Delta (2026-02-21)
- Explicit `any`: no increase in touched files.
- `@ts-ignore`: no increase in touched files.
- `eslint-disable @typescript-eslint/no-explicit-any`: no increase in touched files.
- Net result for redesign execution packets: **0 new debt introduced**.

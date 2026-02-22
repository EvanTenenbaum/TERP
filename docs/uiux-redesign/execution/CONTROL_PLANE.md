# UIUX Redesign Control Plane

Generated: 2026-02-21
Repository: `/Users/evan/spec-erp-docker/TERP/TERP-codex-calm-power`
Execution branch: `codex/uiux-master-plan-v4-20260221`

## Mission Lock
- Execute full in-scope TERP frontend redesign with phase-gated closure.
- No DB schema changes.
- No major backend refactor.
- No in-scope functional loss.
- Enforced terminology: Product Intake, Review, Receive, Adjust Quantity, Change Location, Void Intake, Activity Log.
- Mandatory doctrine: Calm Power + grid-first interaction.

## Excluded Redesign Scope (smoke-only)
- `/vip-portal/*`
- `/live-shopping`
- `DF-005`, `DF-016`, `DF-072`, `DF-073`, `DF-074`

## Task Packet Standard
- ID format: `P<phase>-<module>-<slug>-<nn>`
- Required fields per packet:
- `scope`
- `files touched`
- `commands`
- `expected artifacts`
- `pass criteria`
- `rollback plan`
- Artifact path: `.qa/runs/<YYYY-MM-DD>/<phase>/<task-id>/`

## Quality Lanes (always-on)
- Schema lane:
- `pnpm validate:schema`
- `pnpm audit:schema-drift:strict`
- `pnpm audit:schema-fingerprint:strict`
- `pnpm test:schema`
- `pnpm exec tsx scripts/qa/invariant-checks.ts --strict`
- Lint/typing/any lane:
- `pnpm check`
- `pnpm lint`
- `pnpm eslint --config eslint.config.strict.js <touched-files>`
- `pnpm uiux:execution:no-any-regression <touched-files>`
- UX/parity lane:
- `pnpm gate:all`
- `pnpm gate:invariants`
- `pnpm uiux:north-star:evidence` (with explicit `BASE_URL`)
- `pnpm exec node scripts/uiux/v4-route-audit.mjs`

## Current Execution State
- Phase 0: complete (truth lock + control docs + baseline captured)
- Phase 1: complete (repeatable seed + detect-only runtime verified)
- Phase 2: complete (shared foundation and schema lane gates verified)
- Phase 3: complete (Sales/Inventory/Procurement deep pass verified by North Star scorecards)
- Phase 4: complete (all 97 in-scope abilities marked `VERIFIED` in ledger)
- Phase 5: complete (two consecutive full-gate green runs)
- Phase 6: complete (two adversarial rounds + fix rounds + excluded-route smoke)
- Baseline lint blockers: resolved
- Baseline targeted test blockers: resolved
- Preflight script hardening: complete

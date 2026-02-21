# Defect Log

| ID | Severity | Area | Issue | Status | Evidence |
| --- | --- | --- | --- | --- | --- |
| DEF-P0-001 | P1 | Lint | Missing hook dependency in `client/src/components/uiux-slice/ProductIntakeSlicePage.tsx` | VERIFIED | `pnpm lint` clean run on 2026-02-21 |
| DEF-P0-002 | P1 | Lint | Missing hook dependency in `client/src/components/uiux-slice/PurchaseOrdersSlicePage.tsx` | VERIFIED | `pnpm lint` clean run on 2026-02-21 |
| DEF-P0-003 | P1 | Test | `client/src/components/layout/AppSidebar.test.tsx` link mock failure | VERIFIED | targeted vitest pass on 2026-02-21 |
| DEF-P0-004 | P1 | Test | `client/src/components/work-surface/__tests__/InventoryWorkSurface.test.tsx` missing trpc mock coverage | VERIFIED | targeted vitest pass on 2026-02-21 |
| DEF-P0-005 | P1 | Gate reliability | `scripts/qa/feature-parity.sh` brittle CSV counting | VERIFIED | parser-safe manifest utility wired and gate passed |
| DEF-P0-006 | P1 | Gate reliability | `scripts/qa/invariant-checks.ts` skipped checks pass in strict expectations | VERIFIED | `--strict` mode implemented and validated by failing skip scenarios |
| DEF-P0-007 | P1 | Seed policy | `scripts/seed/seed-redesign-v2.ts` compatibility DDL path violated no-schema-change policy | VERIFIED | DDL removed and replaced with schema precondition assertions |
| DEF-P0-008 | P1 | QA runtime | `scripts/uiux/north-star-evidence.mjs` default base URL mismatch risk | VERIFIED | explicit `BASE_URL`/`--base-url` requirement enforced |
| DEF-P5-001 | P1 | Orders oracle | Shipping flow oracle flaked due stale list state after ship mutation | VERIFIED | cache update fix in `OrdersWorkSurface.tsx`; `qa:test:orders` green in Phase 5 pass A/B |
| DEF-P5-002 | P1 | Test infrastructure | transient `PROTOCOL_CONNECTION_LOST` during DB reset seeded flaky domain-oracle runs | VERIFIED | retry/backoff added in `testing/db-util.ts`; phase 5 and phase 6 domain checks green |
| DEF-P6-001 | P2 | Adversarial reliability | North Star round 1 failed (`purchase-orders` 21/24) from drifted runtime dataset | VERIFIED | seed warm-up amendment (`P6-adversarial-fix1-19`) restored score to 24/24 |
| DEF-P6-002 | P1 | Direct Intake reliability | Top-control rapid edit -> submit could read stale selected-row state and intermittently raise false validation/request-id failures | VERIFIED | ref-synchronized state writes in `DirectIntakeWorkSurface.tsx`; regression + stress evidence in `.qa/runs/2026-02-21/phase-6/P6-direct-intake-remediation-37/verification.md` |

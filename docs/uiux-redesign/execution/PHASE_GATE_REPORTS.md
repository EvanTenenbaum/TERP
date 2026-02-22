# Phase Gate Reports

## Status Legend
- `VERIFIED`
- `FAILED`
- `INCOMPLETE`

| Phase | Gate | Status | Evidence |
| --- | --- | --- | --- |
| Phase 0 | Control + truth lock (`pnpm uiux:p0:all`, ledgers, baseline snapshot) | VERIFIED | `.qa/runs/2026-02-21/phase-0/P0-core-control-plane-03/verification.md` |
| Phase 1 | Seed + runtime stability | VERIFIED | `.qa/runs/2026-02-21/phase-1/P1-seed-runtime-stability-01/verification.md` |
| Phase 2 | Shared UX foundation gate | VERIFIED | `.qa/runs/2026-02-21/phase-2/P2-foundation-gates-and-schema-01/verification.md` |
| Phase 3 | Deep pass module gates (Sales, Inventory, Procurement) | VERIFIED | `.qa/runs/2026-02-21/phase-3/P3-priority-deep-pass-gate-01/verification.md` |
| Phase 4 | Full in-scope ability closure | VERIFIED | `.qa/runs/2026-02-21/phase-4/P4-ability-ledger-closure-01/verification.md` |
| Phase 5 | QA v4 full enforcement (pass 1 + pass 2) | VERIFIED | `.qa/runs/2026-02-21/phase-5/P5-full-gates-passA-16/verification.md`, `.qa/runs/2026-02-21/phase-5/P5-full-gates-passB-17/verification.md` |
| Phase 6 | Adversarial rounds + dossier | VERIFIED | `.qa/runs/2026-02-21/phase-6/P6-adversarial-fix2-21/verification.md`, `.qa/runs/2026-02-21/phase-6/P6-excluded-smoke-22/verification.md`, `.qa/runs/2026-02-21/phase-6/P6-schema-strict-rerun-23/verification.md` |

## Baseline Notes (2026-02-21)
- Known lint blockers at `client/src/components/uiux-slice/ProductIntakeSlicePage.tsx` and `client/src/components/uiux-slice/PurchaseOrdersSlicePage.tsx` were fixed.
- Known failing tests at `client/src/components/layout/AppSidebar.test.tsx` and `client/src/components/work-surface/__tests__/InventoryWorkSurface.test.tsx` were fixed.
- Preflight hardening changes for parity parsing, strict invariants, seed no-DDL path, and explicit North Star runtime URL are complete.
- Strict invariant runs now fail only on real data defects (AR-002, ORD-001), not unknown-column skips.
- Phase 5 completed with two consecutive full green runs (`P5-full-gates-passA-16`, `P5-full-gates-passB-17`).
- Phase 6 adversarial round 1 initially failed (`purchase-orders` 21/24) and was resolved by deterministic seed warm-up before evidence capture (`P6-adversarial-fix1-19`).
- Excluded-module non-regression smoke checks for `/vip-portal/*` and `/live-shopping` are verified in desktop and mobile (`P6-excluded-smoke-22`).
- Final strict schema lane rerun with explicit local DB env is verified (`P6-schema-strict-rerun-23`).
- Direct Intake remediation for stale selected-row submit behavior is verified with browser stress + strict schema lane reruns (`P6-direct-intake-remediation-37`).

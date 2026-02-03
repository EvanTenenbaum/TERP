# GF-PHASE4-003 Execution Plan

**Task:** GF-PHASE4-003 - E2E Tests for Remaining Golden Flows
**Estimate:** 24h
**Created:** 2026-02-03

## Implementation Steps

### Phase 1: Test scaffolding

| Step | File                                   | Change                            | Est |
| ---- | -------------------------------------- | --------------------------------- | --- |
| 1.1  | tests-e2e/golden-flows/index.ts        | Add Phase 4 flow entries          | 10m |
| 1.2  | tests-e2e/utils/golden-flow-helpers.ts | Shared helpers for grid + cleanup | 20m |

### Phase 2: Flow coverage

| Step | File                                                       | Change                      | Est |
| ---- | ---------------------------------------------------------- | --------------------------- | --- |
| 2.1  | tests-e2e/golden-flows/gf-002-procure-to-pay.spec.ts       | Procure-to-Pay checks       | 30m |
| 2.2  | tests-e2e/golden-flows/gf-004-invoice-payment.spec.ts      | Invoice & payment checks    | 20m |
| 2.3  | tests-e2e/golden-flows/gf-005-pick-pack.spec.ts            | Pick & pack checks          | 20m |
| 2.4  | tests-e2e/golden-flows/gf-006-client-ledger-review.spec.ts | Client ledger review checks | 20m |
| 2.5  | tests-e2e/golden-flows/gf-007-inventory-management.spec.ts | Inventory management checks | 20m |
| 2.6  | tests-e2e/golden-flows/gf-008-sample-request.spec.ts       | Sample request checks       | 20m |

### Phase 3: Verification

| Step | Command        | Purpose                | Est |
| ---- | -------------- | ---------------------- | --- |
| 3.1  | pnpm typecheck | Type safety validation | 10m |
| 3.2  | pnpm lint      | Lint validation        | 10m |
| 3.3  | pnpm test      | Unit/integration tests | 20m |
| 3.4  | pnpm test:e2e  | Golden flow validation | 30m |

## Verification Checklist

- [ ] pnpm typecheck passes
- [ ] pnpm lint passes
- [ ] pnpm test passes
- [ ] pnpm test:e2e passes

## Rollback Plan

- Revert commits that add new GF-002..GF-008 specs and index updates.
- Remove helper references if they impact other E2E suites.
- Re-run baseline tests to confirm rollback success.

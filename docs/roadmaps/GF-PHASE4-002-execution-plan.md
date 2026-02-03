# GF-PHASE4-002 Execution Plan

**Task:** GF-PHASE4-002 - E2E Test for GF-003 Order-to-Cash
**Estimate:** 16h
**Created:** 2026-02-03

## Implementation Steps

### Phase 1: Test scaffolding

| Step | File                                   | Change                                    | Est |
| ---- | -------------------------------------- | ----------------------------------------- | --- |
| 1.1  | tests-e2e/fixtures/auth.ts             | Add Sales Rep + Fulfillment login helpers | 10m |
| 1.2  | tests-e2e/utils/golden-flow-helpers.ts | Add shared E2E helpers                    | 20m |

### Phase 2: Multi-role flow coverage

| Step | File                                                | Change                            | Est |
| ---- | --------------------------------------------------- | --------------------------------- | --- |
| 2.1  | tests-e2e/golden-flows/gf-003-order-to-cash.spec.ts | Sales Rep order creation checks   | 30m |
| 2.2  | tests-e2e/golden-flows/gf-003-order-to-cash.spec.ts | Accounting invoice/payment checks | 30m |
| 2.3  | tests-e2e/golden-flows/gf-003-order-to-cash.spec.ts | Fulfillment pick/pack/ship checks | 30m |

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

- Revert commits that add the GF-003 test and helper updates.
- Remove new helper exports if they cause test regressions.
- Re-run baseline tests to confirm rollback success.

# Linear Roadmap Sync + Active QA Handoff

## Active Handoff (2026-02-12)

This section is the source of truth for the currently paused non-lint QA remediation stream on:

- Branch: `claude/complete-tasks-qa-verification-yGgh3`
- Branch URL: https://github.com/EvanTenenbaum/TERP/tree/claude/complete-tasks-qa-verification-yGgh3
- Workspace path: `/Users/evan/spec-erp-docker/TERP/TERP-qa-yGgh3`
- Baseline referenced by plan: head `0497f0d4ff1723889888b3f8146450ee43ab339e` (2026-02-11)

### What was completed in this wave

- Auth fixture hardening in `tests-e2e/oracles/auth-fixtures.ts`:
  - Admin fallback now opt-in via explicit env (`E2E_ALLOW_ADMIN_FALLBACK`)
  - Role-mismatch tolerance now opt-in (`E2E_ALLOW_ROLE_MISMATCH`)
  - Added credential canary checks and v2 role email candidate support
- Oracle executor hardening in `tests-e2e/oracles/executor.ts`:
  - Bounded navigation retry logic
  - Deterministic precondition materialization coverage expanded (`client`, `batch`, `invoice`, plus improved `order`)
  - Precondition elevation fallback path (default `SuperAdmin`)
  - Added broader row extraction and snake/camel alias support for template paths
- Selector and flow fixes across CRM/Inventory/Orders/Accounting oracle YAMLs.
- New guard tests added:
  - `tests/contracts/oracle-metadata-contract.test.ts`
  - `tests/unit/server/oracles/auth-fixtures.test.ts`

### Latest verification snapshot (non-lint)

- `pnpm -s check`: pass
- `pnpm -s test tests/unit/server/oracles/auth-fixtures.test.ts`: pass
- Targeted flow reruns:
  - `CRM.Clients.Communications.Add`: pass
  - `Accounting.COGS.UpdateBatchCogs`: pass
- Last full `ORACLE_RUN_MODE=all` snapshot: `17 passed / 21 failed` (38 total)

### Current blocker profile

- Order-domain backend instability on live env (multiple 500s on order list/create flows) is still a major blocker for order-derived oracle paths.
- Remaining failures are concentrated in:
  - Accounting invoice flows (`MarkSent`, `UpdateStatus`, `Void`, `CheckOverdue`)
  - CRM mutation flows (`Delete`, `Tags.Add`, `Transactions.Create`, `Transactions.RecordPayment`)
  - Inventory mutation flows (`AdjustInventory`, `CreateBatch`, `RecordMovement`, `UpdateBatch`, `UpdateStatus`, `DeleteBatch`, `ReverseMovement`, `CreateStrain`)
  - Orders flows (`Create`, `CreateDraftEnhanced`, `ConfirmDraftOrder`, `FulfillOrder`, `ListOrders`)

## Linear Task Map (for next agent)

- Umbrella execution tracker: [TER-173](https://linear.app/terpcorp/issue/TER-173/execution-deploy-latest-v4-qa-hardening-to-production-and-validate)
- Precondition materialization stream: [TER-182](https://linear.app/terpcorp/issue/TER-182/continuation-unblock-oracle-shipped-order-seed-complete-v4-qa-before)
- Selector drift stream: [TER-178](https://linear.app/terpcorp/issue/TER-178/stabilize-v4-oracle-selectors-against-live-ui-drift)
- RBAC role-contract stream: [TER-126](https://linear.app/terpcorp/issue/TER-126/systemic-reconcile-rbac-test-contracts-with-live-role-assignments)
- Credential source-of-truth stream: [TER-176](https://linear.app/terpcorp/issue/TER-176/unify-qa-credential-source-of-truth-with-production-test-users)
- Precondition framework stream: [TER-121](https://linear.app/terpcorp/issue/TER-121/systemic-add-deterministic-precondition-guards-for-live-production)
- Selector guardrails stream: [TER-122](https://linear.app/terpcorp/issue/TER-122/systemic-standardize-resilient-selector-strategy-across-e2e-specs)
- New policy ticket created for this gap: [TER-231](https://linear.app/terpcorp/issue/TER-231/reinstate-oracle-criticality-policy-tier1-expected-db-mutation)

## Required next steps to close this stream

1. Finish invoice/order/inventory remediations and re-run all previously failing flows individually.
2. Reach strict non-lint gates:
   - `ORACLE_RUN_MODE=tier1`: 16/16 pass, 0 blocked
   - `ORACLE_RUN_MODE=all`: 38/38 pass, 0 blocked
   - `pnpm check`, `pnpm test`, `pnpm build`, `pnpm test:e2e:prod-regression`
3. Keep lint debt out of scope for this cycle.
4. Post final evidence back to `TER-173` and close child streams only after gates are green.

---

## Ongoing Sync Protocol

Linear remains source-of-truth. Keep this file aligned with active handoff state and ensure `docs/roadmaps/GOLDEN_FLOWS_BETA_ROADMAP.md` is regenerated when roadmap status changes materially.

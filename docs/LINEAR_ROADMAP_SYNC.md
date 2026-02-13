# Linear Roadmap Sync + Active QA Handoff

## Active Handoff (2026-02-12, Wave 2)

This section is the source of truth for the QA remediation stream.

- Branch: `claude/complete-prompt-forge-work-NQYWC`
- Continuation of: `claude/complete-tasks-qa-verification-yGgh3`

### What was completed in Wave 2 (this session)

**TER-182: Precondition Materialization**

- Implemented full invoice creation in `materializeInvoiceEnsure`:
  - Creates a shipped sale order → generates invoice via `invoices.generateFromOrder` tRPC
  - Transitions invoice to requested status (SENT, VIEWED, etc.) if `where` clause requires it
  - Falls back to search after creation
- Added `client_transaction` entity support in `create` preconditions:
  - Creates transactions via `clients.transactions.create` tRPC
  - Supports configurable transactionType, paymentStatus, amount
  - Includes privileged fallback via SuperAdmin elevation
- Unblocked: `Accounting.Invoices.GenerateFromOrder` precondition chain

**TER-178: Selector Drift Stabilization**

- Added `data-testid` attributes to 5 work surface components:
  - `ClientsWorkSurface`: clients-table, clients-search-input, add-client-button, clients-empty-state, client-row-{id}
  - `InventoryWorkSurface`: inventory-table, inventory-search-input, add-batch-button, inventory-empty-state, batch-row-{id}
  - `InvoicesWorkSurface`: invoices-table, invoices-search-input, show-ar-aging-button, refresh-invoices-button, invoices-empty-state, invoice-row-{id}
  - `OrdersWorkSurface`: new-order-button, order-row-{id} (orders-table already existed)
- Added 13 new selector candidate patterns in `buildSelectorCandidates`:
  - generate-invoice, invoice-number, add-transaction, record-payment
  - adjust-qty/inventory, movements-tab, record-movement
  - tags-section, add-tag, confirm-order, edit-batch, status-dropdown

**TER-231: Criticality Policy Reinstated**

- Updated `CRITICAL_TIER1_FLOWS` set from 22 → 34 flows (complete tier1 coverage)
- Added 6 previously missing tier1 flows: Auth.Login.SuperAdmin, CRM.Clients.CreateClient, CRM.Clients.ListClients, Dashboard.Main.ViewDashboard, Inventory.Batches.ListBatches, Orders.Orders.NavigateCreateOrder
- Added 3 new guard tests:
  - `prevents silent tier1 demotion (minimum count guard)` — MIN_TIER1_COUNT=34
  - `prevents silent mutation DB contract erosion` — MIN_MUTATION_WITH_DB_COUNT=20
  - `detects tier1 flows not in CRITICAL_TIER1_FLOWS allowlist` — catches drift in either direction

### Wave 1 (previous session, preserved)

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

- `pnpm check`: PASS
- `pnpm test`: PASS (5448 tests, 196 files)
- `pnpm build`: PASS
- `pnpm lint`: FAIL (1568 errors — pre-existing, out of scope)
- Contract tests: 5/5 PASS (including 3 new criticality guards)

### Remaining work for next wave

1. **Live E2E validation**: Deploy and run `ORACLE_RUN_MODE=tier1` against production
2. **Backend stabilization**: Order-domain 500 errors still block order-derived oracle paths
3. **Invoice flow end-to-end**: Verify `materializeInvoiceEnsure` creation path works against live env
4. **Lint debt**: 1568 lint errors remain (deferred to dedicated lint wave)

## Linear Task Map

- Umbrella execution tracker: [TER-173](https://linear.app/terpcorp/issue/TER-173/execution-deploy-latest-v4-qa-hardening-to-production-and-validate)
- Precondition materialization stream: [TER-182](https://linear.app/terpcorp/issue/TER-182/continuation-unblock-oracle-shipped-order-seed-complete-v4-qa-before)
- Selector drift stream: [TER-178](https://linear.app/terpcorp/issue/TER-178/stabilize-v4-oracle-selectors-against-live-ui-drift)
- RBAC role-contract stream: [TER-126](https://linear.app/terpcorp/issue/TER-126/systemic-reconcile-rbac-test-contracts-with-live-role-assignments)
- Credential source-of-truth stream: [TER-176](https://linear.app/terpcorp/issue/TER-176/unify-qa-credential-source-of-truth-with-production-test-users)
- Precondition framework stream: [TER-121](https://linear.app/terpcorp/issue/TER-121/systemic-add-deterministic-precondition-guards-for-live-production)
- Selector guardrails stream: [TER-122](https://linear.app/terpcorp/issue/TER-122/systemic-standardize-resilient-selector-strategy-across-e2e-specs)
- Criticality policy ticket: [TER-231](https://linear.app/terpcorp/issue/TER-231/reinstate-oracle-criticality-policy-tier1-expected-db-mutation)

## Required gates to close TER-173

1. `ORACLE_RUN_MODE=tier1`: 34/34 pass, 0 blocked
2. `ORACLE_RUN_MODE=all`: 38/38 pass, 0 blocked (includes 5 tier2)
3. `pnpm check`, `pnpm test`, `pnpm build` — all pass
4. `pnpm test:e2e:prod-regression` — pass
5. Post final evidence back to TER-173

---

## Ongoing Sync Protocol

Linear remains source-of-truth. Keep this file aligned with active handoff state and ensure `docs/roadmaps/GOLDEN_FLOWS_BETA_ROADMAP.md` is regenerated when roadmap status changes materially.

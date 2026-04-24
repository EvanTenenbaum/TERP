# TER-1196 Agent Session

- **Ticket:** TER-1196
- **Branch:** `fix/ter-1196-async-map-audit`
- **Status:** Audit Complete — No Unguarded Async Maps Found
- **Started:** 2026-04-22T23:48:17Z
- **Completed:** 2026-04-22T23:53:19Z
- **Agent:** Factory Droid (wave launcher)

## Audit Scope

Goal: locate every `.map(async …)` callsite in the TERP codebase and confirm
each one is wrapped in `Promise.all(…)` so the resulting array of promises is
actually awaited (not silently discarded when the outer `await` resolves the
array reference itself).

## Method

- ripgrep across `server/`, `client/`, `shared/`, and `scripts/` for
  `\.map\(async` (single-line) and the multi-line variant
  `\.map\(\s*\n?\s*async` via grep tool with `multiline: true`.
- For each hit, inspected the three preceding lines to verify the map is the
  argument to `Promise.all(` (or equivalent — e.g. assigned to an
  `uploadPromises` local that is then awaited via `Promise.all`).
- Also checked the sibling pattern `await [\w.]+\.map\(async` (direct-await-on-map
  — always a bug) — zero hits.
- Also checked `.flatMap(async`, `.forEach(async`, `.filter(async`,
  `.some(async`, `.every(async` in `server/` — zero hits.

## Findings

### `server/` — 12 callsites, all guarded

| File | Line | Guard |
| --- | --- | --- |
| `autoMigrate.ts` | 209 | `await Promise.all(FINGERPRINT_CANARIES.map(async canary => …))` |
| `vendorDisplay.ts` | 32 | `await Promise.all(uniqueVendorIds.map(async vendorId => …))` |
| `dashboardHelpers.ts` | 19 | `await Promise.all(customerIds.map(async (customerId) => …))` |
| `services/priceAlertsService.ts` | 157 | `await Promise.all(alerts.map(async (alert) => …))` |
| `clientNeedsDbEnhanced.ts` | 404 | `await Promise.all(needs.map(async need => …))` |
| `routers/orders.ts` | 1197 | `await Promise.all(input.lineItems.map(async item => …))` |
| `routers/orders.ts` | 1451 | `await Promise.all(input.lineItems.map(async item => …))` |
| `routers/poReceiving.ts` | 401 | `await Promise.all(pendingPOs.map(async po => …))` |
| `routers/purchaseOrders.ts` | 429 | `await Promise.all(items.map(async item => …))` |
| `routers/returns.ts` | 637 | `await Promise.all(orderInvoices.map(async invoice => …))` |
| `routers/returns.ts` | 1206 | `await Promise.all(orderInvoices.map(async invoice => …))` |
| `transactionsDb.ts` | 416 | `await Promise.all(clientTransactions.map(async transaction => …))` |

### `client/` — 3 callsites, all guarded

| File | Line | Guard |
| --- | --- | --- |
| `components/inventory/PurchaseModal.tsx` | 235 | assigned to `uploadPromises`, then `await Promise.all(uploadPromises)` |
| `components/uiux-slice/InventoryBrowseSlicePage.tsx` | 253 | `await Promise.all(missingBatchIds.map(async batchId => …))` |
| `components/work-surface/InventoryWorkSurface.tsx` | 1226 | `await Promise.all(missingBatchIds.map(async batchId => …))` |

### `shared/`, `scripts/`

- Zero `.map(async` callsites.

## Verification

- `pnpm check` — PASS (zero TypeScript errors).
- `pnpm lint` — 11 pre-existing errors on `main` (unused-vars / non-null
  assertion / unreachable), all unrelated to this audit; delta vs. `main` is
  zero.
- `pnpm test` — unavailable in this sandbox (Docker CLI not installed, which is
  required by `testing/run-with-test-db.ts`). There are no code changes in
  this branch, so runtime behaviour is identical to `main`.

## Outcome

No code changes are required for TER-1196. Every `.map(async …)` in `server/`
(and incidentally in `client/`) is already wrapped in `Promise.all`. This
session file is committed as the audit deliverable / evidence for the ticket.

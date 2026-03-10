# Operations + PO Recovery Release Train

Date: 2026-03-10
Branch: `codex/fix-po-cogs-accounting-20260310`
Project: `TERP - Sprint 2026-03-09 Open Bugs + Mobile UX Hardening`

## Objective

Recover the broken accounting/runtime findings, redesign the purchase-order workflow into a spreadsheet-style operational surface, restore range COGS through the active PO path, and reorganize navigation so Receiving and Shipping live together under Operations with tests that still report accurate system health.

## Constraints

- Treat accounting + webhook fixes as production bugs.
- Treat purchase-order COGS persistence as a full-stack change.
- If schema or table changes are required, validate them against the live database before closing the ticket.
- Update unit, integration, E2E, and stress-facing checks when behavior or route names change.

## Lanes

- Lane A: Runtime regressions
- Lane B: Operations information architecture
- Lane C: Purchase-order composer UX
- Lane D: PO COGS data model and receiving persistence
- Lane E: Test and observability accuracy

## Atomic Tickets

### A1. Accounting routing regression

- Linear: `TER-672`
- Goal: fix the accounting workspace tab mismatch so invoice/bill/payment routes open the intended work surfaces.
- Risk: `strict`
- Dependencies: none
- Verification:
  - `pnpm check`
  - `pnpm test -- accounting`
  - browser proof for `/accounting?tab=invoices`

### A2. GitHub webhook runtime hardening

- Linear: `TER-673`
- Goal: stop `/api/webhooks/github` from throwing a 500 when webhook secrets are not configured; degrade gracefully with explicit structured logging.
- Risk: `strict`
- Dependencies: none
- Verification:
  - targeted router/unit test
  - runtime log proof

### B1. Operations workspace reframe

- Linear: `TER-674`
- Goal: move Receiving and Shipping together into Operations, rename Intake -> Receiving and Pick & Pack -> Shipping, remove stale Sales ownership, and clean aliases/breadcrumbs/command palette/sidebar wording.
- Risk: `strict`
- Dependencies: none
- Verification:
  - route redirects
  - sidebar/navigation tests
  - browser proof for Operations workspace

### C1. Purchase-order spreadsheet UX

- Linear: `TER-675`
- Goal: make PO entry feel like Product Intake: row-first, keyboard-friendly, low-friction line editing with cleaner hierarchy and fewer modal decisions.
- Risk: `strict`
- Dependencies: B1
- Verification:
  - work-surface unit tests
  - browser proof for row add/edit/remove and bulk actions

### C2. Supplier history + quick-add loop

- Linear: `TER-676`
- Goal: show prior supplier PO history and let users re-add prior products quickly into the current PO draft.
- Risk: `strict`
- Dependencies: C1
- Verification:
  - router tests for supplier-history payload
  - browser proof for quick-add from previous PO

### C3. Product auto-resolve and auto-create

- Linear: `TER-676`
- Goal: replace forced product selection with type-to-search that resolves existing products automatically and creates missing products inline with supplier-aware defaults.
- Risk: `strict`
- Dependencies: C1
- Verification:
  - router tests for search/resolve/create path
  - browser proof for existing and new product entry

### D1. Restore range COGS in purchase orders

- Linear: `TER-677`
- Goal: preserve `FIXED` and `RANGE` COGS through purchase-order items, PO editing, and totals display instead of flattening everything to a single unit cost.
- Risk: `red`
- Dependencies: C1
- Verification:
  - schema validation against live DB if tables/columns change
  - router/service tests for create/update/get flows
  - browser proof for fixed/range row editing

### D2. Preserve PO COGS/payment semantics during receiving

- Linear: `TER-678`
- Goal: ensure receiving/intake batch creation inherits PO COGS mode/range and defaults PO payment terms to `CONSIGNMENT`.
- Risk: `red`
- Dependencies: D1
- Verification:
  - live DB validation if schema changes
  - router/service tests for receiving path
  - browser/runtime proof for PO -> Receiving handoff

### E1. Test and health-signal accuracy pass

- Linear: `TER-679`
- Goal: update stale tests, route assertions, E2E selectors, and stress/readiness coverage so full suites reflect the new operations model and catch real regressions.
- Risk: `strict`
- Dependencies: A1, A2, B1, C1, C2, C3, D1, D2
- Verification:
  - `pnpm check`
  - `pnpm lint`
  - `pnpm test`
  - `pnpm build`
  - targeted Playwright/browser evidence
  - stress/preflight updates as required by changed contracts

## Dependency Order

1. A1, A2, B1
2. C1
3. C2, C3, D1
4. D2
5. E1

## Evidence Contract

- Every ticket must capture changed files, command outputs, and browser/runtime proof.
- Tickets touching routes or naming must update command palette, breadcrumb, sidebar, and regression tests together.
- Tickets touching schema must include live DB validation evidence before merge permission.

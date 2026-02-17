# Golden Flow MVP Blocker Waves

**Created:** 2026-02-17
**Context:** All 8 golden flows have at least one blocking bug preventing full operational status
**Source:** Linear project analysis + code investigation

---

## Situation Assessment

**PR #404** (8 regression fixes, TER-96 through TER-103) was **never merged**. The branch was deleted from remote. TER-100 through TER-103 show Done in Linear (likely fixed in other PRs), but **TER-96, TER-97, TER-98 fixes are NOT on main**.

Additionally, **14 new QA bugs** (TER-251 through TER-264) were discovered by automated fuzzing and user journey testing. These are server-side validation, data integrity, and transaction bugs.

### Golden Flow Blocker Matrix

| Flow   | Name              | Blocking Tickets                            | Status                                   |
| ------ | ----------------- | ------------------------------------------- | ---------------------------------------- |
| GF-001 | Direct Intake     | TER-96 (location schema mismatch)           | **500 on submit**                        |
| GF-002 | Procure-to-Pay    | TER-97 (vendor mapping failure)             | **500 on PO create**                     |
| GF-003 | Order-to-Cash     | TER-257, TER-258, TER-259                   | **Ship/Cancel broken, no inv deduction** |
| GF-004 | Invoice & Payment | TER-256 (payment tx rollback)               | **Payment recording fails**              |
| GF-005 | Pick & Pack       | TER-257 (SHIPPED fails)                     | **Cannot complete fulfillment**          |
| GF-006 | Client Ledger     | TER-99 (navigation gap)                     | Functional but hard to reach             |
| GF-007 | Inventory Mgmt    | TER-254, TER-260 (race condition, totalQty) | **Adjustments unreliable**               |
| GF-008 | Sample Request    | TER-98 (insert 500)                         | **500 on create**                        |

**Result: 7 of 8 golden flows have server-side failures. Only GF-006 (Client Ledger) functions end-to-end.**

---

## Wave 6: Critical Server 500s & Transaction Fixes

**Priority:** P0 - URGENT
**Mode:** RED (financial calculations, multi-table transactions)
**Estimate:** 16h
**Unblocks:** GF-001, GF-002, GF-003, GF-004, GF-005, GF-007, GF-008 (7/8 flows)

| Task | Linear  | Title                                                              | Complexity | Golden Flow    |
| ---- | ------- | ------------------------------------------------------------------ | ---------- | -------------- |
| 6A   | TER-256 | payments.recordPayment transaction rollback on valid SENT invoices | Simple     | GF-004         |
| 6B   | TER-257 | orders.updateOrderStatus SHIPPED — "Batch undefined not found"     | Simple     | GF-003, GF-005 |
| 6C   | TER-258 | orders.updateOrderStatus CANCELLED — raw SQL UPDATE error          | Simple     | GF-003         |
| 6D   | TER-259 | Inventory deduction not triggered on order create                  | Medium     | GF-003, GF-007 |
| 6E   | TER-260 | inventory.adjustQty does not update totalQty                       | Simple-Med | GF-007         |

### Root Causes (from code investigation)

- **TER-256**: `payments.ts:263-275` — SENT status not explicitly validated; downstream operations fail in transaction
- **TER-257**: `ordersDb.ts:1761-1766` — `item.batchId` can be undefined; no defensive check before batch lookup
- **TER-258**: `ordersDb.ts:1844-1855` — Status mapping doesn't include "CANCELLED"; falls through to invalid default
- **TER-259**: `ordersDb.ts:116-315` — `createOrder` validates inventory but never deducts; only `confirmOrder` reserves
- **TER-260**: `inventory.ts:1126-1233` — `totalQty` is not a DB field; `adjustQty` updates component fields but no recalculation

---

## Wave 7: PR #404 Regression Fixes (Re-implement)

**Priority:** P0 - URGENT
**Mode:** STRICT
**Estimate:** 8h
**Unblocks:** GF-001, GF-002, GF-008

| Task | Linear | Title                                                | Complexity | Golden Flow |
| ---- | ------ | ---------------------------------------------------- | ---------- | ----------- |
| 7A   | TER-96 | GF-001: Fix intake location site schema mismatch     | Medium     | GF-001      |
| 7B   | TER-97 | GF-002: Fix purchaseOrders.create vendor mapping 500 | Medium     | GF-002      |
| 7C   | TER-98 | GF-008: Fix samples.createRequest 500 on insert      | Medium     | GF-008      |
| 7D   | TER-99 | GF-006: Restore Client Ledger navigation             | Simple     | GF-006      |

### Root Causes

- **TER-96**: UI submits location labels ("Cold Storage") but API validates `site` against `/^[A-Z0-9_-]+$/`
- **TER-97**: PO create requires `vendorId` (deprecated table) via `resolveOrCreateLegacyVendorId()` which can fail
- **TER-98**: `sampleRequests` insert fails — likely schema/enum mismatch or missing column defaults
- **TER-99**: Clients list doesn't expose ledger navigation; needs row action or detail view link

---

## Wave 8: Input Validation & Data Guard Rails

**Priority:** P1 - HIGH
**Mode:** STRICT
**Estimate:** 8h
**Protects:** Data integrity across all flows

| Task | Linear  | Title                                                          | Complexity |
| ---- | ------- | -------------------------------------------------------------- | ---------- |
| 8A   | TER-251 | orders.create rejects empty items array                        | Simple     |
| 8B   | TER-252 | orders.delete returns NOT_FOUND for non-existent IDs           | Simple     |
| 8C   | TER-253 | orders.create rejects archived clients                         | Simple     |
| 8D   | TER-254 | inventory.adjustQty uses row-level locking (SELECT FOR UPDATE) | Medium     |
| 8E   | TER-255 | clients.delete returns NOT_FOUND for already-deleted entities  | Simple     |

---

## Wave 9: E2E Test Stabilization

**Priority:** P2 - HIGH
**Mode:** STRICT
**Estimate:** 8h
**Unblocks:** CI green for all golden flow E2E tests

| Task | Linear  | Title                                                      | Complexity |
| ---- | ------- | ---------------------------------------------------------- | ---------- |
| 9A   | TER-238 | GF-001 Direct Intake e2e — fix brittle row-count assertion | Simple     |
| 9B   | TER-240 | GF-005 Pick & Pack e2e — fix invalid locator syntax        | Simple     |
| 9C   | TER-241 | GF-006 Client Ledger e2e — fix header/testid not found     | Simple     |
| 9D   | TER-242 | GF-007 Inventory e2e — fix duplicate h1 strict mode        | Simple     |
| 9E   | TER-243 | Pick & Pack fulfillment — fix Cmd+K focus                  | Simple     |

---

## Wave 10: Infrastructure & Edge Cases

**Priority:** P3 - MEDIUM
**Mode:** SAFE
**Estimate:** 8h

| Task | Linear  | Title                                          | Complexity |
| ---- | ------- | ---------------------------------------------- | ---------- |
| 10A  | TER-93  | Production migration drift / deploy parity     | Medium     |
| 10B  | TER-262 | vendorPayables.create SELECT query error       | Simple     |
| 10C  | TER-263 | storage.createZone INSERT failure (missing FK) | Simple     |
| 10D  | TER-264 | tags.create duplicate-check SELECT error       | Simple     |
| 10E  | TER-261 | Data cleanup: 5 LIVE batches with bad qty      | Simple     |

---

## Execution Order

```
Wave 6 (Server 500s)  ─┐
                        ├──▶ Merge & verify ──▶ Wave 8 (Validation) ──▶ Wave 9 (E2E)
Wave 7 (PR #404 redo) ─┘                                                    │
                                                                              ▼
                                                                      Wave 10 (Infra)
```

Waves 6 and 7 can be parallelized (different files/routers). Wave 8 depends on Wave 6 (same files, needs clean base). Wave 9 is independent but lower priority. Wave 10 is cleanup.

---

## Deferred (Not MVP-blocking)

| Linear  | Title                                 | Reason                                 |
| ------- | ------------------------------------- | -------------------------------------- |
| TER-166 | Media edge-case gaps                  | Media not in golden flow critical path |
| TER-117 | Production seed source                | Seed data, not runtime                 |
| TER-237 | Wire LOT_ALLOCATION_POLICY            | Enhancement, not bug                   |
| TER-236 | productCatalogue.create TOCTOU        | Race condition, low frequency          |
| TER-234 | DirectIntakeWorkSurface test coverage | Test coverage, not blocking            |

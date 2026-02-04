# Top Deltas - Priority Action List

**Purpose:** Executive summary of highest-impact gaps requiring immediate attention
**Created:** 2026-01-29
**Severity:** P0 = Release Blocker, P1 = Major Gap, P2 = Medium, P3 = Low

---

## P0 Critical Blockers (Fix Immediately)

### DELTA-001: GF-001 Form Fields Not Rendering
**Type:** IntendedMissing
**Flow:** GF-001 Direct Intake
**Impact:** Users cannot add inventory via direct intake; flow completely blocked
**Root Cause:** BUG-112 - Form component rendering issue
**Intent Source:** `docs/golden-flows/specs/GF-001-DIRECT-INTAKE.md:Known Issues`
**Remediation:** Investigate PurchaseModal.tsx form rendering, fix component state management
**Effort:** 4-8h
**Owner:** TBD

### DELTA-002: GF-003 SQL Error on Inventory Load
**Type:** IntendedMissing
**Flow:** GF-003 Order-to-Cash
**Impact:** Users cannot create orders with inventory; also blocks GF-005 Pick & Pack
**Root Cause:** SQL query error when loading available batches
**Intent Source:** `docs/roadmaps/GOLDEN_FLOWS_BETA_ROADMAP.md:Current State`
**Remediation:** Debug inventory query, check JOIN conditions and NULL handling
**Effort:** 4-8h
**Owner:** TBD

### DELTA-003: GF-007 Shows 0 Batches
**Type:** IntendedMissing
**Flow:** GF-007 Inventory Management
**Impact:** Inventory page displays no data despite batches existing
**Root Cause:** Data loading/filtering issue
**Intent Source:** `docs/roadmaps/GOLDEN_FLOWS_BETA_ROADMAP.md:Current State`
**Remediation:** Debug inventory list query, check filters and pagination
**Effort:** 4-8h
**Owner:** TBD

---

## P1 Major Gaps (Next Sprint)

### DELTA-004: PO Receiving UI Missing
**Type:** IntendedMissing
**Flow:** GF-002 Procure-to-Pay
**Impact:** Users cannot receive goods against PO via UI (API-only)
**Intent Source:** `docs/golden-flows/specs/GF-002-PROCURE-TO-PAY.md:Implementation Status`
**Remediation:** Build receiving screen component, wire to `purchaseOrders.receive` API
**Effort:** 16-24h
**Owner:** TBD

### DELTA-005: Sample Fulfill UI Missing
**Type:** IntendedMissing
**Flow:** GF-008 Sample Request
**Impact:** Users cannot fulfill sample requests via UI
**Intent Source:** `docs/golden-flows/specs/GF-008-SAMPLE-REQUEST.md:Note`
**Remediation:** Add "Fulfill" button to SampleList, wire to `samples.fulfillRequest`
**Effort:** 8h
**Owner:** TBD

### DELTA-006: Intake Verification (FEAT-008) Incomplete
**Type:** IntendedMissing
**Flow:** GF-001 Direct Intake
**Impact:** No two-step verification workflow for intake accuracy
**Intent Source:** `docs/golden-flows/specs/GF-001-DIRECT-INTAKE.md:FEAT-008`
**Remediation:** Complete FEAT-008 implementation per spec
**Effort:** 24-40h
**Owner:** TBD

---

## P2 Medium Issues (This Quarter)

### DELTA-007: PDF Generation Timeout
**Type:** Divergent
**Flow:** GF-004 Invoice & Payment
**Impact:** Large invoices occasionally fail to generate PDF
**Intent Source:** `docs/roadmaps/GOLDEN_FLOWS_BETA_ROADMAP.md:Current State`
**Remediation:** Optimize jsPDF generation, consider server-side rendering
**Effort:** 8h
**Owner:** TBD

### DELTA-008: Client Balance Inconsistencies
**Type:** Divergent
**Flow:** GF-006 Client Ledger
**Impact:** Some client totalOwed values don't match sum of invoices
**Intent Source:** INV-005 invariant
**Remediation:** Run `syncClientBalance` for affected clients, add scheduled job
**Effort:** 4h
**Owner:** TBD

### DELTA-009: Order Cancel After Invoice
**Type:** Divergent
**Flow:** GF-003 Order-to-Cash
**Impact:** Orders can be cancelled after invoicing (spec says before ship only)
**Intent Source:** `01_STATE_MODEL_INTENDED.md:Order Transitions`
**Remediation:** Add guard to cancel mutation checking fulfillment status
**Effort:** 2h
**Owner:** TBD

---

## Summary Metrics

| Severity | Count | Combined Effort |
|----------|-------|-----------------|
| P0 | 3 | 12-24h |
| P1 | 3 | 48-72h |
| P2 | 3 | 14h |
| **Total** | **9** | **74-110h** |

---

## Recommended Resolution Order

1. **Week 1:** Fix P0 blockers (DELTA-001, 002, 003)
   - Unblock all 8 Golden Flows
   - Enable QA testing

2. **Week 2-3:** Fix P1 gaps (DELTA-004, 005, 006)
   - Complete missing UI features
   - Full flow coverage

3. **Week 4:** Fix P2 issues (DELTA-007, 008, 009)
   - Polish and reliability
   - Data integrity

---

## Verification Checklist

After remediation, verify:
- [ ] All 8 Golden Flows execute end-to-end
- [ ] No INV-XXX invariant violations
- [ ] RBAC permissions enforced correctly
- [ ] Audit trail complete (INV-007)
- [ ] No P0/P1 bugs remain

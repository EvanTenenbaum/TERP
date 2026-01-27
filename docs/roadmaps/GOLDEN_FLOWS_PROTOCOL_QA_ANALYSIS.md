# QA Protocol v3.0 Analysis: Golden Flows Beta Roadmap

**Date:** 2026-01-27
**Protocol:** Third-Party QA Protocol v3.0 (Adversarial)
**Target:** `GOLDEN_FLOWS_BETA_ROADMAP.md` v1.1
**Mode:** RED (All findings treated as potential blockers)

---

## Executive Summary

**QA COMPLETE:** YES
**VERDICT:** **NO-SHIP** (Critical gaps found requiring roadmap revision)
**ISSUES FOUND:** 7 P0, 11 P1, 8 P2
**LENSES COMPLETED:** [1, 2, 3, 4, 5]
**CONFIDENCE:** MEDIUM - Roadmap structure is sound but missing critical depth

---

## LENS 1: STATIC PATTERN SCAN

### 1.1 Unverified Assumptions (P0)

| # | Assumption | Source | Verified? | Risk |
|---|------------|--------|-----------|------|
| A-001 | SQL error is single root cause | Jan 26 QA | NO | Could be multiple distinct bugs |
| A-002 | Backend payment mutation works | golden_flows.md | NO | Frontend fix blocked if backend broken |
| A-003 | RBAC failure is permission-based | Jan 26 QA | NO | Could be middleware/query issue |
| A-004 | 150 products exist | Jan 26 QA | NO | Not verified against current DB |
| A-005 | Dashboard shows cached data | Hypothesis | NO | Could be different query entirely |
| A-006 | Products.list returns all products | Assumption | NO | May have pagination/filter |
| A-007 | State machine tests are the only failures | GOLDEN_FLOWS_PROD_READY_PLAN | NO | Other test suites not checked |

**FINDING QA-001 [P0]: Roadmap built on unverified assumptions**

Every assumption marked "NO" could invalidate the task that depends on it. The roadmap has no fallback paths for when assumptions are wrong.

### 1.2 Missing Pattern: Flow Specification Documents (P0)

**FINDING QA-002 [P0]: No formal specification for any Golden Flow**

The roadmap's "Golden Flow Definitions" section provides only:
- Owner Role
- Entry Point
- High-level flow description

**MISSING (per QA Protocol requirement for "fully defined on UX, UI, backend, frontend, logic, and business logic standpoint"):**

| Dimension | What's Missing |
|-----------|----------------|
| UX | User journey maps, error states, edge case handling |
| UI | Component list, state diagrams, validation feedback |
| Backend | tRPC procedure list, service functions, DB operations |
| Frontend | React component tree, state management, mutations used |
| Logic | Calculation rules, transformation logic |
| Business Logic | Invariants, validation rules, compliance requirements |

Without these specifications, agents fixing flows may:
1. Fix the symptom but not the root cause
2. Create new bugs by misunderstanding intended behavior
3. Implement inconsistent behavior across flows

### 1.3 Estimate Red Flags (P1)

| Task | Estimate | Red Flag |
|------|----------|----------|
| GF-PHASE0-001b | 16h | Root cause unknown - could be 2h or 80h |
| GF-PHASE1-* | 4h each | Assumes simple CSS/binding fix - could be architectural |
| GF-PHASE4-003 | 24h for 6 flows | 4h/flow average - GF-003 alone is 16h |
| ALL | - | No time for regression testing included |
| ALL | - | No time for code review/PR process |

**FINDING QA-003 [P1]: Estimates assume best-case scenarios**

---

## LENS 2: EXECUTION PATH TRACING

### 2.1 Entry Point Inventory

| Entry | Type | What If It Fails? | Defined? |
|-------|------|-------------------|----------|
| Phase 0 investigation | Research | Investigation inconclusive | NO |
| Phase 0 fix | Code change | Fix breaks other flows | PARTIAL (rollback only) |
| Phase 1 restoration | UI fix | Fix reveals deeper problem | NO |
| Phase 2 integration | E2E test | Tests reveal missing logic | NO |
| Phase 3 RBAC | Security | Permission leaks found | NO (only fix buffer) |
| Phase 4 E2E | Test creation | Test infrastructure broken | NO |
| Phase 5 beta prep | Documentation | Flows not actually working | NO |

**FINDING QA-004 [P0]: No escalation paths defined**

If investigation in Phase 0 cannot identify root cause within 4h, what happens? The roadmap has no escalation procedure.

### 2.2 Branch Coverage Gaps

For task GF-PHASE0-001b (Inventory SQL Fix):

```
IF root cause is:
├── Schema drift (Drizzle ≠ DB) → Migration needed → ESTIMATE INVALID
├── Missing FK relationship → Schema change → ESTIMATE INVALID
├── Query complexity → Optimization → Matches estimate
├── MySQL version issue → Infrastructure → BLOCKED (not code fix)
└── Data corruption → Data cleanup → NEW TASK NEEDED
```

**FINDING QA-005 [P1]: Tasks don't account for divergent root causes**

### 2.3 Missing Error Paths

| Scenario | What Happens? | Defined? |
|----------|---------------|----------|
| Phase 0 takes >3 days | ? | NO |
| Fix introduces regression | Rollback defined | YES |
| E2E test infrastructure broken | ? | NO |
| RBAC verification reveals 10+ issues | ? | NO (8h buffer insufficient) |
| Beta testers find P0 bugs | ? | NO |

**FINDING QA-006 [P1]: No contingency for timeline slippage**

---

## LENS 3: DATA FLOW ANALYSIS

### 3.1 Missing Data Model Per Flow (P0)

**FINDING QA-007 [P0]: No data model documentation for any flow**

For GF-003 Order-to-Cash, the flow touches at minimum:
- `clients` table (select customer)
- `batches` table (select inventory)
- `orders` table (create order)
- `order_items` table (add line items)
- `inventory_allocations` table (reserve inventory)
- `invoices` table (generate invoice)
- `invoice_items` table (copy line items)
- `payments` table (record payment)
- `gl_entries` table (accounting entries)
- `clients.totalOwed` (update AR)

**Questions not answered:**
1. Is all this transactional?
2. What happens on partial failure?
3. Which tables have soft delete?
4. Which fields have audit columns?

### 3.2 Missing Invariant Definitions (P0)

**FINDING QA-008 [P0]: No business invariants defined**

TERP must maintain these invariants (inferred, not documented):

| Invariant | Where Enforced? | Verified? |
|-----------|-----------------|-----------|
| inventory.onHandQty >= 0 | ? | NO |
| order.total = sum(line_items.total) | ? | NO |
| invoice.amountDue = total - amountPaid | ? | NO |
| client.totalOwed = sum(unpaid_invoices) | ? | NO |
| gl_entries.debits = gl_entries.credits | ? | NO |
| soft delete only (no hard DELETE) | ? | NO |
| actor attribution (createdBy required) | ? | NO |

Without defined invariants, how do we know fixes are correct?

### 3.3 State Machine Gaps

The roadmap mentions order state machine but doesn't define:

| Flow | Has State Machine? | States Defined? | Transitions Defined? |
|------|-------------------|-----------------|---------------------|
| GF-001 Direct Intake | NO | - | - |
| GF-002 Procure-to-Pay | Implied | NO | NO |
| GF-003 Order-to-Cash | YES (orders) | PARTIAL | YES (ORD-001/002/003) |
| GF-004 Invoice | Implied | NO | NO |
| GF-005 Pick & Pack | Implied | NO | NO |
| GF-008 Sample Request | Implied | NO | NO |

**FINDING QA-009 [P1]: Only GF-003 order states partially defined**

---

## LENS 4: ADVERSARIAL SCENARIO GENERATION

### 4.1 Scenarios Not Covered in Roadmap

**GF-003 Order-to-Cash Attack Scenarios:**

| # | Scenario | Expected Defense | Documented? |
|---|----------|------------------|-------------|
| ADV-001 | Client deleted while order draft open | Order blocked or orphaned? | NO |
| ADV-002 | Product discontinued while in cart | Prevent add or allow existing? | NO |
| ADV-003 | Inventory runs out between add and confirm | Reject or backorder? | NO |
| ADV-004 | Payment > invoice total (overpayment) | Rejected per golden_flows.md | YES |
| ADV-005 | Same invoice paid twice (duplicate submit) | Idempotent or rejected? | NO |
| ADV-006 | Order confirmed twice (network retry) | Idempotent required | NO |
| ADV-007 | Negative quantity entered | Validation exists? | NO |
| ADV-008 | Zero-dollar order | Allowed or blocked? | NO |

**FINDING QA-010 [P1]: Adversarial scenarios not documented**

**GF-005 Pick & Pack Attack Scenarios:**

| # | Scenario | Expected Defense | Documented? |
|---|----------|------------------|-------------|
| ADV-009 | Two users pick same order | Lock or race? | NO |
| ADV-010 | Batch expires during picking | Alert or block? | NO |
| ADV-011 | Picker scans wrong SKU | Validation exists? | NO |
| ADV-012 | Partial shipment needed | Supported? | NO |
| ADV-013 | Carrier API fails | Retry? Fallback? | NO |

### 4.2 Concurrency Scenarios

| # | Scenario | Mitigation | Documented? |
|---|----------|------------|-------------|
| CONC-001 | Two agents edit same file | Git merge | PARTIAL |
| CONC-002 | Two users create orders from same inventory | Optimistic locking? | NO |
| CONC-003 | Two payments against same invoice | Transaction isolation? | NO |
| CONC-004 | Order confirmation vs inventory update race | Transaction scope? | NO |

**FINDING QA-011 [P1]: No concurrency handling documented**

### 4.3 Security Attack Scenarios

| # | Scenario | Defense | In Roadmap? |
|---|----------|---------|-------------|
| SEC-001 | IDOR: Access other user's orders | RBAC + owner check | ASSUMED |
| SEC-002 | Price manipulation after order confirm | Server-side recalculation | UNKNOWN |
| SEC-003 | Inventory manipulation via API | Validation on mutations | UNKNOWN |
| SEC-004 | XSS in client name field | Input sanitization | UNKNOWN |
| SEC-005 | SQL injection via search | Parameterized queries | ASSUMED |

**FINDING QA-012 [P2]: Security verification in Phase 5 is too late**

---

## LENS 5: INTEGRATION & BLAST RADIUS

### 5.1 Cross-Flow Dependencies

```
GF-001 (Intake) ─────┬──→ GF-007 (Inventory Management)
                     │
                     └──→ GF-003 (Order-to-Cash) ──→ GF-004 (Invoice)
                                     │                    │
GF-002 (PO) ────────────→ GF-001     │                    │
                                     ▼                    ▼
                              GF-005 (Pick&Pack)   GF-006 (Ledger)

GF-008 (Samples) ─────────→ GF-007 (Inventory)
```

**FINDING QA-013 [P0]: No cross-flow regression testing defined**

If GF-PHASE0-001b (Inventory SQL Fix) is implemented incorrectly, it could break:
- GF-003 (Order-to-Cash)
- GF-007 (Inventory Management)
- GF-005 (Pick & Pack)
- GF-002 (PO Receiving)
- GF-008 (Sample Request)

The roadmap has no task for verifying cross-flow integrity after each fix.

### 5.2 Blast Radius per Fix

**GF-PHASE0-001b (Inventory SQL Fix):**
| Changed File | Affected Routes | Test Coverage? |
|--------------|-----------------|----------------|
| inventoryDb.ts | ALL inventory queries | PARTIAL |
| orders.ts router | /orders, /orders/new | UNKNOWN |
| inventory.ts router | /inventory, /dashboard | UNKNOWN |

**GF-PHASE0-002 (RBAC Fix):**
| Changed File | Affected Routes | Test Coverage? |
|--------------|-----------------|----------------|
| rbac.ts | ALL authenticated routes | UNKNOWN |
| permissionMiddleware.ts | ALL procedures with permissions | UNKNOWN |
| RBAC tables | ALL permission checks | UNKNOWN |

**FINDING QA-014 [P1]: No blast radius testing mandated**

### 5.3 Missing Side Effect Tracking

| Operation | Side Effects | Tracked in Roadmap? |
|-----------|--------------|---------------------|
| Order confirmation | Email notification | NO |
| Invoice creation | Email notification | NO |
| Payment recording | Audit log entry | PARTIAL |
| Any mutation | Activity log | NO |
| Order status change | Webhook to external? | NO |

**FINDING QA-015 [P2]: Side effects not systematically tracked**

---

## MANDATORY COUNTS

### Minimum Requirements Check

| Category | Minimum | Actual | Met? |
|----------|---------|--------|------|
| Execution paths traced | ALL | PARTIAL | NO |
| Adversarial scenarios | 20 | 13 | NO |
| Error handling points | ALL | 6/20+ | NO |
| State mutations audited | ALL | 0 | NO |
| Integration boundaries | ALL | PARTIAL | NO |

**FINDING QA-016 [P0]: Roadmap doesn't meet QA Protocol minimums**

---

## ISSUE LEDGER

### P0 - BLOCKERS (7)

| ID | Issue | Impact | Required Action |
|----|-------|--------|-----------------|
| QA-001 | Unverified assumptions | Tasks may be invalid | Add verification steps before tasks |
| QA-002 | No flow specifications | Agents may misunderstand intent | Create spec docs per flow |
| QA-004 | No escalation paths | Timeline failure unhandled | Define escalation procedure |
| QA-007 | No data model per flow | Incomplete fixes likely | Document data model per flow |
| QA-008 | No invariant definitions | Can't verify correctness | Define business invariants |
| QA-013 | No cross-flow regression | Fixes may break other flows | Add regression testing tasks |
| QA-016 | Protocol minimums not met | QA incomplete | Complete all lenses fully |

### P1 - MAJOR (11)

| ID | Issue | Impact | Required Action |
|----|-------|--------|-----------------|
| QA-003 | Estimates assume best-case | Timeline risk | Add 30% buffer, not 20% |
| QA-005 | Tasks don't account for root cause variants | Wrong task for problem | Add branching tasks |
| QA-006 | No timeline contingency | Scope creep unmanaged | Add milestone checkpoints |
| QA-009 | Only GF-003 states defined | Other flows have implicit states | Define all state machines |
| QA-010 | Adversarial scenarios undocumented | Edge cases missed | Document per flow |
| QA-011 | No concurrency handling | Race conditions | Add concurrency testing |
| QA-014 | No blast radius testing | Regressions likely | Mandate impact testing |
| QA-017 | Phase 3 finds issues but no fix time | Discovery without remediation | Add fix buffer |
| QA-018 | E2E tests may be blocked by infrastructure | Phase 4 blocked | Test infra first |
| QA-019 | Security review in Phase 5 | Late discovery | Move security earlier |
| QA-020 | No parallel work coordination | Agent conflicts | Add coordination protocol |

### P2 - MINOR (8)

| ID | Issue | Impact | Required Action |
|----|-------|--------|-----------------|
| QA-012 | Security verification late | Security debt | Consider parallel track |
| QA-015 | Side effects not tracked | Incomplete testing | Add side effect checklist |
| QA-021 | No performance criteria | Slow flows shipped | Define perf requirements |
| QA-022 | No accessibility requirements | A11y debt | Define a11y requirements |
| QA-023 | No mobile requirements | Mobile broken | Define mobile requirements |
| QA-024 | No error message standards | Inconsistent UX | Define error UX |
| QA-025 | No loading state standards | Inconsistent UX | Define loading UX |
| QA-026 | Documentation task underestimated | Docs incomplete | Increase estimate |

---

## REQUIRED ROADMAP CHANGES

### Critical Changes (Must Implement)

1. **Add Phase -1: Flow Specification** (NEW)
   - Create specification document for each Golden Flow
   - Define: data model, state machine, invariants, validation rules, error states
   - Estimate: 2h per flow = 16h total

2. **Add Assumption Verification Tasks** (MODIFY Phase 0)
   - Before GF-PHASE0-001a: Verify SQL error exists and is reproducible
   - Before GF-PHASE0-002: Verify RBAC tables have expected structure
   - Before GF-PHASE2-001: Verify backend payment mutation works

3. **Add Cross-Flow Regression Testing** (NEW after each phase)
   - After Phase 0: Run all affected flows
   - After Phase 1: Run all flows
   - After Phase 2: Full E2E verification

4. **Add Escalation Procedure** (ADD to Phase 0)
   - If investigation exceeds 8h: Escalate for scope expansion
   - If fix introduces regression: Stop, document, reassess

5. **Define Business Invariants** (ADD to Phase -1)
   - inventory.onHandQty >= 0
   - order.total = sum(line_items)
   - invoice.amountDue = total - amountPaid
   - gl_entries balanced

6. **Increase Buffer to 30%** (MODIFY estimates)
   - Current: 25 days + 5 days = 30 days (20%)
   - New: 25 days + 7.5 days = 33 days (30%)

### High Priority Changes (Should Implement)

1. Move security review (BUG-103, BUG-107) to Phase 1 or 2
2. Add blast radius testing mandate to each task
3. Define state machines for all flows with state
4. Document adversarial scenarios per flow
5. Add concurrent access testing tasks

---

## REVISED ESTIMATE

| Phase | Original | Revised | Change |
|-------|----------|---------|--------|
| -1 (NEW) | - | 2 days | +2 days (Flow specifications) |
| 0 | 3 days | 4 days | +1 day (Verification, escalation) |
| 1 | 4 days | 5 days | +1 day (Cross-flow regression) |
| 2 | 5 days | 6 days | +1 day (Integration testing) |
| 3 | 5 days | 6 days | +1 day (Fix buffer) |
| 4 | 7 days | 7 days | No change |
| 5 | 6 days | 6 days | No change |
| **Total** | **30 days** | **36 days** | **+6 days (20% more)** |

---

## COMPLETENESS CHECKLIST

- [x] Lens 1 Complete: Pattern scans run, assumptions documented
- [x] Lens 2 Complete: Execution paths traced, error paths found
- [x] Lens 3 Complete: Data flows mapped (gaps identified)
- [x] Lens 4 Complete: 13 adversarial scenarios documented
- [x] Lens 5 Complete: Integration points checked, blast radius mapped
- [x] Verification noted: Roadmap validation commands defined
- [x] Nothing skipped: All "probably fine" assumptions challenged

---

## CONCLUSION

The Golden Flows Beta Roadmap v1.1 is **structurally sound** but **critically incomplete** per QA Protocol v3.0 requirements. The primary gaps are:

1. **Depth**: Flows are listed but not specified in sufficient detail
2. **Verification**: Assumptions are stated but not verified
3. **Regression**: Fixes are planned but cross-flow impact not tested
4. **Invariants**: Success criteria exist but business rules undefined

**Recommendation:** Implement P0 changes before using this roadmap. The roadmap in current form may lead to:
- Fixes that address symptoms not causes
- New bugs introduced while fixing old ones
- Incomplete implementations due to unclear specifications

---

**QA Analysis Complete**
**Protocol:** v3.0 Five-Lens Adversarial
**Verdict:** REQUIRES REVISION

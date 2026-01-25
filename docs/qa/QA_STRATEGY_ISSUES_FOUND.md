# QA Strategy Skeptical Review - Issues Found

**Review Date:** 2026-01-25
**Reviewed By:** Claude (Self-Review)
**Document Version:** 1.1 → 1.2

---

## Critical Issues (Must Fix Before Executing QA)

### ISSUE-001: Order State Machine Diagram Incorrect

**Location:** TERP_FULL_QA_STRATEGY.md, Section 2.3

**Problem:** The order fulfillment status diagram shows incorrect transitions.

**What I Documented:**
```
DRAFT → CONFIRMED → PENDING → PACKED → SHIPPED → DELIVERED
  ↓        ↓          ↓         ↓         ↓          ↓
CANCELLED CANCELLED CANCELLED  PENDING  RETURNED  RETURNED
```

**Actual Code (orderStateMachine.ts:22-33):**
```typescript
DRAFT: ["CONFIRMED", "CANCELLED"],
CONFIRMED: ["PENDING", "CANCELLED"],
PENDING: ["PACKED", "CANCELLED"],
PACKED: ["SHIPPED", "PENDING"],    // Can ONLY go to SHIPPED or back to PENDING
SHIPPED: ["DELIVERED", "RETURNED"], // Cannot be CANCELLED!
DELIVERED: ["RETURNED"],            // Can ONLY go to RETURNED!
```

**Errors:**
1. PACKED cannot be CANCELLED (only SHIPPED or back to PENDING)
2. SHIPPED cannot be CANCELLED (only DELIVERED or RETURNED)
3. DELIVERED cannot be CANCELLED (only RETURNED)
4. PACKED → PENDING is a REVERSE transition (unpacking), not shown in my diagram

**Impact:** QA tests may expect invalid state transitions to work.

---

### ISSUE-002: Stock Status Thresholds Are Configurable, Not Fixed

**Location:** TERP_FULL_QA_STRATEGY.md, Section 2.3

**Problem:** I documented fixed thresholds but they're actually configurable.

**What I Documented:**
```
OUT_OF_STOCK: Available ≤ 0
CRITICAL: Available ≤ 10
LOW: Available ≤ 50
OPTIMAL: Available > 50
```

**Actual Code (inventory.ts:30-41):**
```typescript
function calculateStockStatus(
  onHand: number,
  reserved: number,
  lowThreshold = 50,      // DEFAULT, not fixed
  criticalThreshold = 10  // DEFAULT, not fixed
)
```

**Impact:** Tests assuming fixed thresholds (10, 50) will fail if system is configured differently.

**Correction:** Tests should verify the LOGIC (`available <= threshold`) not specific numbers, OR read the configured thresholds first.

---

### ISSUE-003: Return Flow Status Transitions NOT Enforced

**Location:** TERP_FULL_QA_STRATEGY.md, E2E Flow 7

**Problem:** The return status enum exists but transitions are NOT enforced in code.

**Status Enum (returns.ts:67-74):**
```
PENDING, APPROVED, REJECTED, RECEIVED, PROCESSED, CANCELLED
```

**Actual Behavior (verified):**
- `approve` procedure exists but receive does NOT check if status is APPROVED
- A return can be received without approval (no state machine validation)
- Status changes are recorded in notes but not enforced

**QA Should Verify:**
- Can a PENDING return be received without approval?
- Is there business logic elsewhere enforcing the flow?
- Should this be flagged as a potential bug?

**Missing Tests:**
- REJECTED path (what happens to inventory?)
- QUARANTINE condition for damaged returns
- Concurrent approval attempts

---

### ISSUE-004: Sample Flow Missing Statuses

**Location:** TERP_FULL_QA_STRATEGY.md, E2E Flow 6

**Problem:** Sample status flow is incomplete.

**Actual Statuses (samples.ts:41):**
```
PENDING → FULFILLED → RETURN_REQUESTED → RETURNED
    ↓
CANCELLED
```

**Missing from my flow:**
- RETURN_REQUESTED step (client must request return before it's processed)
- What happens to inventory when sample is fulfilled vs returned?
- Sample location tracking (WAREHOUSE, WITH_CLIENT, WITH_SALES_REP, LOST)

---

## Medium Issues (Should Fix)

### ISSUE-005: AR Aging Bucket Naming Inconsistency

**Location:** TERP_FULL_QA_STRATEGY.md, Section 2.3

**Problem:** I used different names than the code returns.

**What I Documented:**
- "1-30 days: 0-30 days past due date"

**What Code Returns (arApDb.ts:304):**
```typescript
return { current, days30, days60, days90, days90Plus };
```

**Clarification:**
- `days30` bucket includes 0-30 days past due (inclusive of day 0)
- So it's "0-30 days past due", not "1-30 days past due"

---

### ISSUE-006: Missing Edge Case Tests

**Problem:** E2E flows only test happy paths.

**Missing Scenarios:**

| Flow | Missing Edge Case |
|------|-------------------|
| Order Cycle | Insufficient inventory for order |
| Order Cycle | Client has no credit / over limit |
| Order Cycle | Order already cancelled mid-flow |
| Return Processing | Return rejected |
| Return Processing | Damaged/quarantine items |
| Credit Management | Credit already expired |
| Credit Management | Credit exceeds order total |
| Quote Conversion | Quote already expired |
| Quote Conversion | Inventory sold out since quote |
| Time Tracking | Clock in without clock out |
| Time Tracking | Overlapping shifts |

---

### ISSUE-007: Missing Error State UI Tests

**Problem:** Frontend tests don't cover error states.

**Missing UI Tests:**
- API returns 500 error - what does user see?
- Network timeout - loading states?
- Empty data states - "No results" messages?
- Permission denied - error message shown?
- Session expired mid-action - redirect to login?

---

### ISSUE-008: Concurrent Modification Tests Missing

**Problem:** No tests for race conditions.

**Scenarios Not Covered:**
- Two users create orders for same inventory simultaneously
- Two users approve same return simultaneously
- Two users apply same credit simultaneously
- Session timeout during multi-step flow

---

## Low Issues (Nice to Have)

### ISSUE-009: Test Data Requirements Vague

**Location:** Appendix B

**Problem:** "10+ orders in various statuses" - which statuses exactly?

**Should Specify:**
- At least 1 order in each status: DRAFT, CONFIRMED, PENDING, PACKED, SHIPPED, DELIVERED, CANCELLED, RETURNED
- At least 1 invoice in each status: DRAFT, SENT, VIEWED, PARTIAL, PAID, OVERDUE, VOID
- At least 1 batch in each aging bracket

---

### ISSUE-010: VIP Portal Flow Needs Login Context

**Location:** E2E Flow 3

**Problem:** VIP customers use separate authentication (vipPortal.ts), not regular login.

**Current Flow:**
```
1. Login as VIP customer
```

**Should Be:**
```
1. Navigate to /vip-portal/login (NOT /login)
2. Authenticate with VIP credentials
3. Verify VIP session token different from regular auth
```

---

### ISSUE-011: Pick/Pack Status Not Documented

**Problem:** Orders have a separate pickPackStatus I didn't document.

**From schema (spreadsheet.ts:76):**
```typescript
pickPackStatus: "PENDING" | "PICKING" | "PACKED" | "READY"
```

**Missing from strategy:**
- How does pickPackStatus relate to fulfillmentStatus?
- Can they be out of sync?
- What triggers transitions?

---

## Assumptions That Need Verification

| Assumption | Risk | How to Verify |
|------------|------|---------------|
| All pages use consistent error handling | May have inconsistent UX | Review ErrorBoundary usage |
| Soft deletes are enforced everywhere | Data may be hard-deleted | Search for `.delete(` calls |
| All financial calcs use safe decimal math | May have rounding errors | Review all money calculations |
| Permission checks on all protected routes | Security gap | Audit all routers for `requirePermission` |
| All forms have validation | May accept invalid data | Test empty/malformed inputs |
| Pagination works consistently | May skip or duplicate items | Test boundary conditions |

---

## Recommended Strategy Updates

### Update 1: Fix State Machine Diagram

Replace incorrect diagram with:

```
Order Fulfillment Status (VERIFIED from orderStateMachine.ts)
══════════════════════════════════════════════════════════════
                    CANCELLED ←───────────────────┐
                        ↑                         │
DRAFT → CONFIRMED → PENDING → PACKED ⇄ PENDING    │
                                ↓                 │
                            SHIPPED ─────────────┬┘
                                ↓                │
                            DELIVERED            │
                                ↓                │
                            RETURNED ────────────┘
                           ↙        ↘
                    RESTOCKED    RETURNED_TO_VENDOR
                    (terminal)        (terminal)

Note: PACKED ⇄ PENDING is bidirectional (can unpack)
Note: CANCELLED is terminal (no transitions out)
```

### Update 2: Add Edge Case Flows

Add these to E2E flows:
- Flow 7b: Return Rejected Path
- Flow 8b: Credit Expired/Insufficient
- Flow 11: Error Recovery Flow

### Update 3: Add Concurrency Tests

Add section for concurrent access tests:
- Inventory reservation conflicts
- Credit application race conditions
- Session management under load

---

## Summary

| Severity | Count | Action |
|----------|-------|--------|
| Critical | 4 | Fix before executing QA |
| Medium | 4 | Fix for comprehensive coverage |
| Low | 3 | Nice to have |

**Total Issues Found:** 11

**Recommendation:** Fix critical issues (ISSUE-001 through ISSUE-004) before starting QA execution. The state machine and status flow errors could cause significant wasted effort if Manus tests against incorrect expected behaviors.

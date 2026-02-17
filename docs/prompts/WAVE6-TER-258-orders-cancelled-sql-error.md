# TER-258: Fix orders.updateOrderStatus CANCELLED — Raw SQL UPDATE Error

**Classification**: Medium | **Mode**: RED | **Estimate**: 4h
**Linear**: TER-258 | **Wave**: 6
**Golden Flow**: GF-003 (Order-to-Cash)

---

## MANDATORY RULES — VIOLATION = TASK FAILURE

1. **NO PHANTOM VERIFICATION.** Never write "I verified X" or "I confirmed Y" without showing the ACTUAL COMMAND and its ACTUAL OUTPUT. If you say something works, prove it with terminal output.
2. **NO PREMATURE COMPLETION.** Do not say "Done" or "Complete" until EVERY item in the completion checklist has a checkmark with evidence.
3. **NO SILENT ERROR HANDLING.** If any command fails, if any test doesn't pass, if anything unexpected happens: STOP. Report the exact error. Do not work around it silently.
4. **NO QA SKIPPING.** The QA protocol below is not optional. You MUST run every lens applicable to this task.
5. **PROOF OF WORK.** At every verification gate marked with GATE, you must paste the actual terminal output.
6. **ACTUALLY READ FILES BEFORE EDITING.** Before modifying any file, read it first.
7. **ONE THING AT A TIME.** Complete and verify each task before starting the next.
8. **NO HAPPY-PATH-ONLY TESTING.** You must test failure cases, edge cases, and adversarial inputs.

---

## Mission Brief

When transitioning an order to CANCELLED via `ordersDb.updateOrderStatus()`, a raw SQL error occurs. The root cause is at `server/ordersDb.ts` lines 1844-1849: the status mapping for `orderStatusHistory` insertion does not include "CANCELLED" as a valid value. When `newStatus === "CANCELLED"`, the mapping defaults to `"PENDING"`, causing either:

1. A schema constraint violation (if the enum column rejects the mismatched value), OR
2. A silent data integrity bug (wrong status recorded in history)

Additionally, when cancelling an order that has been PACKED (the state machine allows PACKED → CANCELLED at line 1594), there is **no inventory restoration** — reserved inventory stays locked forever.

**The goal**: Fix the status mapping, add inventory restoration on cancellation, and add regression tests.

---

## Pre-Flight: Rollback Plan

```bash
git checkout -- server/ordersDb.ts
git checkout -- server/ordersDb.stateMachine.test.ts
```

**Risk level**: HIGH. Cancellation affects inventory quantities. Must verify inventory math is correct.

---

## Implementation Tasks

### Task 1: Fix Status History Mapping

**What**: Add "CANCELLED" to the valid status mapping in `updateOrderStatus`.
**Files**: `server/ordersDb.ts`

**Location**: Lines 1844-1849

```typescript
// BEFORE:
const validStatus =
  newStatus === "PENDING" || newStatus === "PACKED" || newStatus === "SHIPPED"
    ? newStatus
    : "PENDING"; // ← CANCELLED silently becomes PENDING

// AFTER:
const validStatus =
  newStatus === "PENDING" ||
  newStatus === "PACKED" ||
  newStatus === "SHIPPED" ||
  newStatus === "CANCELLED"
    ? newStatus
    : "PENDING";
```

**But first**: Read the `fulfillmentStatusEnum` in `drizzle/schema.ts` (lines 2710-2721) to see ALL valid values. Consider whether the mapping should use a Set derived from the enum rather than a hardcoded list.

**Acceptance Criteria**:

- [ ] "CANCELLED" is a valid status for `orderStatusHistory` insertion
- [ ] All values in `fulfillmentStatusEnum` are accepted (not just 4 hardcoded ones)
- [ ] Status history correctly records "CANCELLED"

**Verification Command**:

```bash
pnpm check
```

**GATE**: Paste output.

### Task 2: Add Inventory Restoration on Cancellation

**What**: When cancelling an order, restore any reserved inventory.
**Files**: `server/ordersDb.ts`

**Context**: The state machine (line 1592) allows:

- `PENDING → CANCELLED` (no inventory reserved yet — nothing to restore)
- `PACKED → CANCELLED` (inventory was reserved at confirm time — MUST restore)

**Steps**:

1. Read the `confirmOrder` / `confirm` endpoint to understand how inventory is reserved (which field: `reservedQty` or `onHandQty`)
2. Add a CANCELLED handling block (similar to the SHIPPED block but in reverse):
   - If the order had items with reserved inventory, restore it
   - Parse `order.items` safely (same pattern as TER-257 fix)
   - For each item: decrement `reservedQty` by item quantity (or increment `onHandQty` if that's what was decremented)
3. Place this block BEFORE the status update, inside the same transaction

**Acceptance Criteria**:

- [ ] Cancelling a PENDING order (no reservation) works without inventory changes
- [ ] Cancelling a PACKED order restores reserved inventory to the correct field
- [ ] Inventory quantities are correct after cancellation (verify with a query)
- [ ] The restoration is inside the same transaction as the status update (atomicity)

**Verification Command**:

```bash
pnpm check && pnpm test -- --reporter=verbose server/ordersDb
```

**GATE**: Paste output.

### Task 3: Add Regression Tests

**What**: Add tests for the CANCELLED status transition.
**Files**: `server/ordersDb.stateMachine.test.ts` (or new test file)

**Test Scenarios Required**:

| #   | Scenario                                       | Expected                                                        |
| --- | ---------------------------------------------- | --------------------------------------------------------------- |
| 1   | PENDING → CANCELLED                            | Success, no inventory changes, history records CANCELLED        |
| 2   | PACKED → CANCELLED                             | Success, reserved inventory restored, history records CANCELLED |
| 3   | SHIPPED → CANCELLED                            | Rejected (state machine doesn't allow)                          |
| 4   | CANCELLED → anything                           | Rejected (terminal state)                                       |
| 5   | Status history shows "CANCELLED" not "PENDING" | Correct status recorded                                         |

**Acceptance Criteria**:

- [ ] All 5 test scenarios pass

**Verification Command**:

```bash
pnpm test -- --reporter=verbose server/ordersDb
```

**GATE**: Paste test output.

---

## QA Protocol (5-Lens)

### Lens 1: Static Pattern Scan

```bash
git diff --cached -- server/ordersDb.ts | grep -E "(any|\.id \|\| 1|console\.log|\.delete\()"
```

### Lens 2: Execution Path Tracing

Trace CANCELLED path:

- PENDING → CANCELLED: validate transition → update status → insert history (no inventory work)
- PACKED → CANCELLED: validate transition → parse items → restore inventory → update status → insert history
- Inventory restoration failure → transaction rollback → descriptive error

### Lens 3: Data Flow Analysis

- INPUT: `{ orderId, newStatus: "CANCELLED", userId }`
- TRANSFORMS: items parsed → reservedQty decremented per item → status updated
- SIDE EFFECTS: batch reservedQty restored, order status changed, history inserted

### Lens 4: Adversarial Scenarios

1. Cancel order with 0 items
2. Cancel order where batch was already deleted
3. Cancel order with items that have no batchId
4. Cancel order where reservedQty is already 0 (would go negative)
5. Double-cancel (should be rejected by state machine)

### Lens 5: Blast Radius

- Inventory restoration changes `reservedQty` on batches — same field touched by `confirmOrder`
- `syncClientBalance()` may need to be called after cancellation if invoice was generated
- Check if cancelling an order also needs to void associated invoices

---

## Completion Checklist

- [ ] Status mapping fixed to include CANCELLED
- [ ] Inventory restoration on PACKED → CANCELLED implemented
- [ ] Restoration inside transaction for atomicity
- [ ] 5 regression test scenarios pass
- [ ] `pnpm check` passes
- [ ] `pnpm lint` passes
- [ ] `pnpm test` passes (full suite)
- [ ] `pnpm build` passes
- [ ] No `any` types introduced
- [ ] No `console.log` left in production code

---

## MANDATORY RULES REMINDER

1. NO PHANTOM VERIFICATION — show actual output
2. NO PREMATURE COMPLETION — check every box above
3. NO SILENT ERROR HANDLING — report failures immediately
4. PROOF OF WORK at every GATE

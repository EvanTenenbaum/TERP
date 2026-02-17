# TER-259: Fix Inventory Deduction Not Triggered on Order Create

**Classification**: Complex | **Mode**: RED | **Estimate**: 8h
**Linear**: TER-259 | **Wave**: 6
**Golden Flows**: GF-003 (Order-to-Cash), GF-007 (Inventory Management)

---

## MANDATORY RULES — VIOLATION = TASK FAILURE

1. **NO PHANTOM VERIFICATION.** Never write "I verified X" or "I confirmed Y" without showing the ACTUAL COMMAND and its ACTUAL OUTPUT. If you say something works, prove it with terminal output.
2. **NO PREMATURE COMPLETION.** Do not say "Done" or "Complete" until EVERY item in the completion checklist has a checkmark with evidence.
3. **NO SILENT ERROR HANDLING.** If any command fails, if any test doesn't pass, if anything unexpected happens: STOP. Report the exact error. Do not work around it silently.
4. **NO QA SKIPPING.** The QA protocol below is not optional. You MUST run every lens applicable to this task.
5. **PROOF OF WORK.** At every verification gate marked with GATE, you must paste the actual terminal output.
6. **ACTUALLY READ FILES BEFORE EDITING.** Before modifying any file, read it first. Do not assume you know what's in a file from context or memory.
7. **ONE THING AT A TIME.** Complete and verify each task before starting the next.
8. **NO HAPPY-PATH-ONLY TESTING.** You must test failure cases, edge cases, and adversarial inputs.

---

## Mission Brief

Creating orders against inventory batches does not trigger any inventory deduction or reservation. The QA test creates 5 orders of 10 units each against a 100-unit batch and finds 0 deduction from totalQty.

### Current Behavior (from code investigation):

There are **two conflicting inventory patterns** in the codebase:

| Function                     | File        | Lines     | Behavior                           |
| ---------------------------- | ----------- | --------- | ---------------------------------- |
| `createOrder(isDraft=false)` | ordersDb.ts | 323-392   | DEDUCTS `onHandQty` immediately    |
| `createOrder(isDraft=true)`  | ordersDb.ts | 325       | SKIPS deduction entirely           |
| `confirm` endpoint           | orders.ts   | 565-585   | RESERVES (`reservedQty` increment) |
| `confirmOrder` endpoint      | orders.ts   | 1710-1728 | RESERVES (`reservedQty` increment) |
| `confirmDraftOrder`          | ordersDb.ts | 1268-1299 | DEDUCTS `onHandQty`                |

**The problem**: The order creation flow is inconsistent. Draft orders skip deduction, confirmation endpoints only reserve, and the actual deduction happens in different places depending on the code path. The QA test likely creates orders through a path that skips deduction.

**The goal**: Establish a single, consistent inventory lifecycle:

1. **Order created** (draft or confirmed) → `reservedQty` incremented (soft lock)
2. **Order shipped** → `reservedQty` decremented AND `onHandQty` decremented (actual deduction)
3. **Order cancelled** → `reservedQty` decremented (release lock)

This is the standard ERP pattern: reserve on confirm, deduct on ship.

---

## Pre-Flight: Rollback Plan

```bash
git checkout -- server/ordersDb.ts
git checkout -- server/routers/orders.ts
```

**Risk level**: HIGH. This changes inventory math across order lifecycle. Must verify end-to-end.

---

## Pre-Work: Map the Full Inventory Lifecycle

### Task 0: Audit ALL Inventory Touchpoints in Order Flow

**What**: Find every place in the codebase where order operations modify batch quantities.
**Files**: `server/ordersDb.ts`, `server/routers/orders.ts`

**Steps**:

1. Grep for all `reservedQty` modifications:
   ```bash
   grep -n "reservedQty" server/ordersDb.ts server/routers/orders.ts
   ```
2. Grep for all `onHandQty` modifications:
   ```bash
   grep -n "onHandQty" server/ordersDb.ts server/routers/orders.ts
   ```
3. Grep for all `sampleQty` modifications:
   ```bash
   grep -n "sampleQty" server/ordersDb.ts server/routers/orders.ts
   ```
4. Document every touchpoint in a table:

| Function | File:Line | Field Modified | Direction | When |
| -------- | --------- | -------------- | --------- | ---- |
| ...      | ...       | ...            | ...       | ...  |

**Acceptance Criteria**:

- [ ] Complete inventory touchpoint map created
- [ ] All code paths that modify batch quantities identified
- [ ] Inconsistencies documented

**GATE**: Paste your complete touchpoint map before making any changes.

---

## Implementation Tasks

### Task 1: Ensure Non-Draft Order Creation Reserves Inventory

**What**: When `createOrder` is called with `isDraft=false`, it should increment `reservedQty` (not directly deduct `onHandQty`).
**Files**: `server/ordersDb.ts`

**Current behavior** (lines 323-392): Non-draft orders DEDUCT `onHandQty` immediately.
**Target behavior**: Non-draft orders RESERVE by incrementing `reservedQty`.

**CAUTION**: Before changing `createOrder`, verify that `updateOrderStatus` to SHIPPED handles the actual deduction (decrement both `reservedQty` and `onHandQty`). If SHIPPED only decrements `onHandQty`, then switching to reservation will cause a `reservedQty` leak.

**Steps**:

1. Read lines 357-364 (current deduction logic)
2. Change to increment `reservedQty` instead of decrementing `onHandQty`
3. Verify that the SHIPPED path (lines 1747-1835) decrements BOTH `reservedQty` and `onHandQty`
4. If SHIPPED only does one, fix it to do both

**Acceptance Criteria**:

- [ ] Non-draft `createOrder` increments `reservedQty`
- [ ] `onHandQty` is NOT modified on order creation (only on shipment)
- [ ] Available inventory = `onHandQty - reservedQty` is correctly reduced

**Verification Command**:

```bash
pnpm check
```

**GATE**: Paste output.

### Task 2: Ensure Draft → Confirm Also Reserves

**What**: Verify that all confirm paths (there are 3!) use the same reservation pattern.
**Files**: `server/ordersDb.ts`, `server/routers/orders.ts`

The three confirm paths:

1. `confirmDraftOrder()` in ordersDb.ts (lines 1268-1299) — currently DEDUCTS
2. `confirm` endpoint in orders.ts (lines 565-585) — currently RESERVES
3. `confirmOrder` endpoint in orders.ts (lines 1710-1728) — currently RESERVES

**ALL three must use the same pattern**: increment `reservedQty`.

**Acceptance Criteria**:

- [ ] `confirmDraftOrder()` changed from deducting `onHandQty` to reserving `reservedQty`
- [ ] All 3 confirm paths use identical reservation logic
- [ ] No code path directly deducts `onHandQty` except SHIPPED transition

### Task 3: Ensure SHIPPED Deducts Correctly

**What**: Verify/fix the SHIPPED transition to decrement both `reservedQty` and `onHandQty`.
**Files**: `server/ordersDb.ts`

When an order ships:

1. Decrement `reservedQty` (release the reservation)
2. Decrement `onHandQty` (actual physical deduction)

**Acceptance Criteria**:

- [ ] SHIPPED transition decrements `reservedQty` per item
- [ ] SHIPPED transition decrements `onHandQty` per item
- [ ] Both decrements happen in the same transaction

### Task 4: Add Regression Tests

**What**: Test the full inventory lifecycle: create → reserve → ship → deduct.
**Files**: New test file or extend existing

**Test Scenarios Required**:

| #   | Scenario                                              | Expected Inventory State              |
| --- | ----------------------------------------------------- | ------------------------------------- |
| 1   | Create non-draft order (10 units from 100-unit batch) | onHand=100, reserved=10, available=90 |
| 2   | Create draft order                                    | No inventory change                   |
| 3   | Confirm draft order                                   | onHand=100, reserved=10               |
| 4   | Ship confirmed order                                  | onHand=90, reserved=0                 |
| 5   | Cancel confirmed order (before ship)                  | onHand=100, reserved=0 (restored)     |
| 6   | Create 5 orders x 10 units                            | reserved=50, available=50             |
| 7   | Create order exceeding available (>100 units)         | Rejected — insufficient inventory     |
| 8   | Sample item order                                     | sampleQty decremented, not onHandQty  |

**Acceptance Criteria**:

- [ ] All 8 test scenarios pass
- [ ] Inventory math is consistent across the full lifecycle

**Verification Command**:

```bash
pnpm test -- --reporter=verbose server/ordersDb
```

**GATE**: Paste test output showing all scenarios pass.

---

## QA Protocol (5-Lens)

### Lens 1: Static Pattern Scan

```bash
git diff --cached -- server/ordersDb.ts server/routers/orders.ts | grep -E "(any|\.id \|\| 1|console\.log)"
```

### Lens 2: Execution Path Tracing

Full order lifecycle paths:

- Create (non-draft) → reserve → ship → deduct
- Create (draft) → confirm → reserve → ship → deduct
- Create → reserve → cancel → restore
- Create with samples → sampleQty path

### Lens 3: Data Flow Analysis

- Reservation: `reservedQty += item.quantity` per batch
- Shipment: `reservedQty -= item.quantity` AND `onHandQty -= item.quantity` per batch
- Cancellation: `reservedQty -= item.quantity` per batch
- Available = `onHandQty - reservedQty - quarantineQty - holdQty`

### Lens 4: Adversarial Scenarios

1. Create order, cancel, create another order for same batch (reservation restored?)
2. Ship order where batch was adjusted to 0 between creation and shipment
3. Concurrent order creation on same batch (race condition on reservation)
4. Order with mix of regular and sample items
5. Order referencing a batch that was soft-deleted

### Lens 5: Blast Radius

- `createOrder` is called from `orders.create` router endpoint
- `confirmOrder` / `confirm` called from multiple places
- `updateOrderStatus` SHIPPED called from fulfillment flow
- Pick & Pack flow (GF-005) also touches inventory — verify compatibility
- `calculateAvailableQty()` must be updated if available formula changes

---

## Completion Checklist

- [ ] Full inventory touchpoint map documented
- [ ] `createOrder` (non-draft) uses reservation pattern
- [ ] All 3 confirm paths use consistent reservation pattern
- [ ] SHIPPED transition decrements both `reservedQty` and `onHandQty`
- [ ] CANCELLED transition restores `reservedQty` (from TER-258)
- [ ] 8 regression test scenarios pass
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

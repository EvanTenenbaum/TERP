# TER-257: Fix orders.updateOrderStatus SHIPPED — "Batch undefined not found"

**Classification**: Medium | **Mode**: RED | **Estimate**: 4h
**Linear**: TER-257 | **Wave**: 6
**Golden Flows**: GF-003 (Order-to-Cash), GF-005 (Pick & Pack)

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

When transitioning an order from PACKED → SHIPPED via `ordersDb.updateOrderStatus()`, the error `"Batch undefined not found"` occurs. The root cause is at `server/ordersDb.ts` lines 1753-1776: `order.items` is a JSON string stored in the DB, but the code casts it directly to an array without parsing. This causes `item.batchId` to be `undefined`.

**The goal**: Fix the items deserialization, add defensive validation for batchId, and add regression tests covering all status transitions that touch inventory.

---

## Pre-Flight: Rollback Plan

```bash
# Revert ordersDb changes
git checkout -- server/ordersDb.ts

# Revert test changes
git checkout -- server/ordersDb.stateMachine.test.ts
```

**Risk level**: MEDIUM. This modifies order fulfillment logic which affects inventory quantities.

---

## Pre-Work: Confirm the Root Cause

### Task 0: Verify the items parsing issue

**What**: Read the SHIPPED path and confirm `order.items` needs JSON.parse
**Files**: `server/ordersDb.ts`

**Steps**:

1. Read `server/ordersDb.ts` lines 1747-1835 (the SHIPPED handling block)
2. Check line 1753: `const orderItems = order.items as Array<{...}>` — confirm this is a direct cast without JSON.parse
3. Check lines 1779-1781 to see if there's a DIFFERENT items parsing pattern used elsewhere in the same function (the exploration found that this area does correctly parse)
4. Check the `orders` table schema — is `items` a `json()` column? If so, Drizzle may auto-parse it, OR it may return a string depending on the driver
5. Grep for other places where `order.items` is accessed to see how they handle parsing

**Acceptance Criteria**:

- [ ] Confirmed whether `order.items` is a string or already parsed when returned by Drizzle
- [ ] Identified the exact line where the fix is needed

```bash
grep -n "order\.items\|order\.items as\|JSON\.parse.*items" server/ordersDb.ts | head -20
```

**GATE**: Paste your findings before implementing the fix.

---

## Implementation Tasks

### Task 1: Fix Items Deserialization in SHIPPED Path

**What**: Ensure `order.items` is properly parsed before accessing `item.batchId`.
**Files**: `server/ordersDb.ts`

**Fix approach**:

```typescript
// BEFORE (line ~1753):
const orderItems = order.items as Array<{
  batchId: number;
  quantity: number;
  isSample?: boolean;
}>;

// AFTER:
const rawItems =
  typeof order.items === "string" ? JSON.parse(order.items) : order.items;
const orderItems = (rawItems || []) as Array<{
  batchId: number;
  quantity: number;
  isSample?: boolean;
}>;
```

**Also add defensive validation** before the batch lookup loop:

```typescript
for (const item of orderItems) {
  if (!item.batchId) {
    throw new Error(
      `Order ${orderId} has item without batchId — cannot process shipment`
    );
  }
  // ... existing batch lookup
}
```

**Acceptance Criteria**:

- [ ] `order.items` is safely parsed from JSON string if needed
- [ ] Null/undefined items array handled (defaults to empty)
- [ ] Missing `batchId` on individual items throws a descriptive error (not "Batch undefined")
- [ ] Existing batch lookup logic unchanged (only the input parsing is fixed)

**Verification Command**:

```bash
pnpm check
```

**GATE**: Paste `pnpm check` output.

### Task 2: Audit ALL Other `order.items` Access Points

**What**: Find every place in `ordersDb.ts` that accesses `order.items` and ensure consistent parsing.
**Files**: `server/ordersDb.ts`

```bash
grep -n "order\.items\|\.items as\|items:" server/ordersDb.ts
```

For each access point, verify it handles both string and parsed object forms. Fix any that don't.

**Acceptance Criteria**:

- [ ] All `order.items` access points use safe parsing
- [ ] No other "Batch undefined" errors possible from other code paths

**GATE**: Paste the grep results and your fix summary.

### Task 3: Add Regression Tests

**What**: Add tests for the SHIPPED status transition, specifically testing items parsing.
**Files**: `server/ordersDb.stateMachine.test.ts` (or new file if needed)

**Test Scenarios Required**:

| #   | Scenario                                            | Expected                       |
| --- | --------------------------------------------------- | ------------------------------ |
| 1   | PACKED → SHIPPED with valid items (batchId present) | Success, inventory decremented |
| 2   | PACKED → SHIPPED with items as JSON string          | Success (parsing works)        |
| 3   | PACKED → SHIPPED with items as parsed object        | Success (no double-parse)      |
| 4   | PACKED → SHIPPED with item missing batchId          | Descriptive error thrown       |
| 5   | PACKED → SHIPPED with empty items array             | Graceful handling              |
| 6   | PACKED → SHIPPED with null items                    | Descriptive error thrown       |

**Acceptance Criteria**:

- [ ] All 6 test scenarios pass
- [ ] Tests exercise the actual items parsing logic

**Verification Command**:

```bash
pnpm test -- --reporter=verbose server/ordersDb
```

**GATE**: Paste test output.

---

## QA Protocol (5-Lens)

### Lens 1: Static Pattern Scan

```bash
git diff --cached -- server/ordersDb.ts | grep -E "(any|\.id \|\| 1|console\.log)"
```

### Lens 2: Execution Path Tracing

Trace the SHIPPED path:

- Items is string → JSON.parse → iterate → batch lookup → decrement inventory
- Items is object → iterate → batch lookup → decrement inventory
- Items is null → error before loop
- Item has no batchId → descriptive error
- Batch not found → existing error (preserved)
- Inventory decrement succeeds → status update → history insert

### Lens 3: Data Flow Analysis

- INPUT: `{ orderId, newStatus: "SHIPPED", userId }`
- TRANSFORMS: items parsed → batches looked up → onHandQty decremented
- OUTPUT: `{ success: true, ... }`
- SIDE EFFECTS: batch quantities updated, order status changed, history inserted

### Lens 4: Adversarial Scenarios

1. Items JSON with extra/unexpected fields
2. Items with batchId = 0 (falsy but valid?)
3. Items with negative quantity
4. Order with 100+ items (performance)
5. Concurrent SHIPPED transitions on same order

### Lens 5: Blast Radius

- `updateOrderStatus` is called from `orders.ts` router line ~1418
- Also potentially called from pick-pack flow
- Inventory decrements are NOT inside a transaction with the status update — verify atomicity

---

## Completion Checklist

- [ ] Root cause confirmed (items parsing)
- [ ] SHIPPED path items parsing fixed
- [ ] All `order.items` access points audited and fixed
- [ ] 6 regression test scenarios pass
- [ ] `pnpm check` passes
- [ ] `pnpm lint` passes (on modified files)
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

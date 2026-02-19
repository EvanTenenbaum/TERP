# FORGED PROMPT: BUG-002 — Purchase Order Line Items INSERT Fix

## MANDATORY RULES — VIOLATION = TASK FAILURE

1. **NO PHANTOM VERIFICATION.** Never write "I verified X" without showing ACTUAL COMMAND and ACTUAL OUTPUT.
2. **NO PREMATURE COMPLETION.** Do not say "Done" until EVERY checklist item has evidence.
3. **NO SILENT ERROR HANDLING.** If anything fails: STOP. Report the exact error.
4. **PROOF OF WORK.** At every 🔒 gate, paste actual terminal output.
5. **ACTUALLY READ FILES BEFORE EDITING.** Read every file before modifying it.
6. **ONE THING AT A TIME.** Complete and verify each task before the next.

---

## MISSION BRIEF

**Bug:** `purchaseOrders.create` INSERT for `purchaseOrderItems` fails with SQL parameter mismatch.
**Impact:** 3 test failures (UJ-004, UJ-005, UJ-006), blocks entire Procure-to-Pay workflow.
**Risk Level:** CRITICAL (STRICT mode — database transactions)

### Error Evidence (from QA report)

```sql
Failed query: insert into `purchaseOrderItems`
(`id`, `purchaseOrderId`, `productId`, `quantityOrdered`, `quantityReceived`,
 `unitCost`, `totalCost`, `notes`, `supplier_client_id`, `deletedAt`,
 `createdAt`, `updatedAt`)
values
(default, ?, ?, ?, default, ?, ?, default, default, default, default, default),
(default, ?, ?, ?, default, ?, ?, default, default, default, default, default)

params: 10,1394,50,4.5,225,10,1393,25,8,200
```

**Root Cause:** 12 columns in INSERT, only 10 parameters for 2 rows (5 per row). Columns `quantityReceived`, `notes`, `supplierClientId`, `deletedAt`, `createdAt`, `updatedAt` have `default` but Drizzle may not handle this correctly for all of them.

---

## TASK LIST

### Task 1: Read and Understand the Current Code

**What**: Read the PO creation code and the schema definition to understand the exact mismatch.
**Files to READ (do NOT edit yet)**:
- `server/routers/purchaseOrders.ts` — lines 260-285 (the create mutation INSERT)
- `server/routers/purchaseOrders.ts` — lines 520-560 (the working `addItem` mutation for comparison)
- `drizzle/schema.ts` — find `purchaseOrderItems` table definition

**Acceptance Criteria**:
- [ ] You've identified which columns are missing from the `.values()` call
- [ ] You've compared with the working `addItem` mutation pattern
- [ ] You've checked schema for which columns have `.default()` vs nullable

🔒 **GATE 1**: List the columns that need values and which are missing.

---

### Task 2: Fix the INSERT

**What**: Add explicit values for all columns that Drizzle can't auto-default.
**Files**: `server/routers/purchaseOrders.ts` — lines 273-281

**Current (broken)**:
```typescript
await db.insert(purchaseOrderItems).values(
  items.map(item => ({
    purchaseOrderId: poId,
    productId: item.productId,
    quantityOrdered: item.quantityOrdered.toString(),
    unitCost: item.unitCost.toString(),
    totalCost: (item.quantityOrdered * item.unitCost).toString(),
  }))
);
```

**Fix Pattern** (adapt based on Task 1 findings):
```typescript
await db.insert(purchaseOrderItems).values(
  items.map(item => ({
    purchaseOrderId: poId,
    productId: item.productId,
    quantityOrdered: item.quantityOrdered.toString(),
    quantityReceived: "0",
    unitCost: item.unitCost.toString(),
    totalCost: (item.quantityOrdered * item.unitCost).toString(),
    notes: item.notes ?? null,
    // supplierClientId inherited from PO, or null
  }))
);
```

**Acceptance Criteria**:
- [ ] All columns in the schema have explicit values or proper defaults
- [ ] Pattern matches the working `addItem` mutation
- [ ] No `any` types introduced
- [ ] `quantityReceived` explicitly set to "0" (not omitted)

**Verification Command**:
```bash
pnpm check 2>&1 | tail -5
```

🔒 **GATE 2**: Paste `pnpm check` output.

---

### Task 3: Full Verification Suite

**Verification Commands**:
```bash
pnpm check 2>&1 | tail -5
pnpm lint 2>&1 | tail -5
pnpm test 2>&1 | tail -20
pnpm build 2>&1 | tail -10
```

🔒 **GATE 3**: Paste ALL FOUR outputs.

---

## QA PROTOCOL (5-LENS)

### Lens 1: Static Pattern Scan
- [ ] No `any` types
- [ ] No fallback user IDs
- [ ] Proper types on all new properties

### Lens 2: Execution Path Tracing
- Trace: `purchaseOrders.create` → validate input → INSERT PO → INSERT items → return
- What happens if items array is empty? (should be handled by line 272: `if (items.length > 0)`)
- What happens if productId doesn't exist? (FK constraint should catch)

### Lens 3: Data Flow
- Input types: `item.quantityOrdered` (number) → `.toString()` → stored as string
- Verify all numeric-to-string conversions are consistent

### Lens 4: Adversarial Scenarios
1. PO with 0 items — should create PO only
2. PO with 1 item — single row INSERT
3. PO with 5 items — multi-row INSERT
4. Item with notes vs without notes
5. Item with very large quantity

### Lens 5: Blast Radius
- Does this change affect `addItem` mutation? (NO — separate code path)
- Does this change affect `getAll` or `getById`? (NO — read operations)
- Any other code that inserts into `purchaseOrderItems`?

---

## ✅ COMPLETION CHECKLIST

- [ ] Schema analyzed, missing columns identified
- [ ] INSERT fixed with explicit values for all columns
- [ ] Pattern matches working `addItem` mutation
- [ ] `pnpm check` passes
- [ ] `pnpm lint` passes
- [ ] `pnpm test` passes
- [ ] `pnpm build` passes
- [ ] QA 5-lens completed
- [ ] No new `any`, console.log, or TODO/FIXME

---

## MANDATORY RULES REPEATED

1. NO PHANTOM VERIFICATION — show actual output
2. NO PREMATURE COMPLETION — every checkbox needs evidence
3. READ files before editing
4. PROOF OF WORK at every 🔒 gate

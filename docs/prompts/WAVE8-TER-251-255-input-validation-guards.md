# Wave 8: Input Validation & Guard Rails

**Classification**: Medium (multiple routers, one row-locking change)
**Mode**: STRICT
**Estimate**: 8h total (actual ~50min AI execution + verification)
**Dependencies**: Wave 6 complete (same files, clean base needed)

---

## MANDATORY RULES — VIOLATION = TASK FAILURE

1. **NO PHANTOM VERIFICATION.** Never write "I verified X" without showing ACTUAL COMMAND OUTPUT.
2. **NO PREMATURE COMPLETION.** Do not say "Done" until EVERY completion checklist item has evidence.
3. **NO SILENT ERROR HANDLING.** If any command fails, STOP and report the exact error.
4. **NO QA SKIPPING.** The QA protocol below is not optional.
5. **NO HAPPY-PATH-ONLY TESTING.** You must test failure cases and edge cases.
6. **PROOF OF WORK.** At every 🔒 gate, paste actual terminal output.
7. **ACTUALLY READ FILES BEFORE EDITING.**
8. **ONE THING AT A TIME.** Complete and verify each task before starting the next.

---

## MISSION BRIEF

Add 5 server-side validation guards that prevent invalid data from reaching the database. These are all defensive checks that should have existed from the start. Four are simple (1-12 lines each), one is medium (row-level locking).

**Implementation order**: TER-251 → TER-252 → TER-253 → TER-255 → TER-254 (save locking for last)

---

## Task 1: TER-251 — Reject Empty Items Array on Order Create (SIMPLE)

**What**: `orders.create` accepts an empty `items: []` array, creating an order with $0 totals. Add Zod min-length validation.

**Files**: `server/routers/orders.ts` (~line 150)

**Acceptance Criteria**:
- [ ] The `items` array in the create input schema has `.min(1, "At least one item is required")`
- [ ] No other changes to the schema

**Implementation**:

Read `server/routers/orders.ts` and find the `items: z.array(...)` in the create mutation input (around line 150). Add `.min(1)`:

```typescript
items: z.array(
  z.object({
    batchId: z.number(),
    // ... existing fields
  })
).min(1, "At least one item is required"),
```

**Verification**:
```bash
pnpm check 2>&1 | tail -5
```

🔒 **GATE 1**: Paste output.

---

## Task 2: TER-252 — Return NOT_FOUND on Order Delete (SIMPLE)

**What**: `orders.delete` silently succeeds even for non-existent IDs. Add existence check before soft delete.

**Files**: `server/routers/orders.ts` (~lines 254-260)

**Acceptance Criteria**:
- [ ] Before calling `softDelete`, fetch the order by ID
- [ ] If order doesn't exist, throw `TRPCError` with code `NOT_FOUND`
- [ ] If order is already deleted (`deletedAt` is not null), throw `NOT_FOUND`
- [ ] Error message includes the order ID

**Implementation**:

Find the `delete` mutation (around line 254). Add a pre-check:

```typescript
delete: protectedProcedure
  .use(requirePermission("orders:delete"))
  .input(z.object({ id: z.number() }))
  .mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // TER-252: Verify order exists before deleting
    const existing = await db
      .select({ id: orders.id, deletedAt: orders.deletedAt })
      .from(orders)
      .where(eq(orders.id, input.id))
      .limit(1)
      .then(rows => rows[0]);

    if (!existing || existing.deletedAt !== null) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: `Order with ID ${input.id} not found`,
      });
    }

    const rowsAffected = await softDelete(orders, input.id);
    return { success: rowsAffected > 0 };
  }),
```

Check what imports are already available (`TRPCError`, `eq`, `orders`, `getDb`). Use existing patterns.

**Verification**:
```bash
pnpm check 2>&1 | tail -5
```

🔒 **GATE 2**: Paste output.

---

## Task 3: TER-253 — Reject Orders for Archived Clients (SIMPLE)

**What**: `orders.create` allows orders for soft-deleted clients. Add a check for `client.deletedAt`.

**Files**: `server/ordersDb.ts` (~lines 154-163)

**Acceptance Criteria**:
- [ ] After fetching the client in `createOrder()`, check if `client.deletedAt !== null`
- [ ] If archived, throw an error: `"Cannot create order for archived client {clientId}"`
- [ ] The existing "client not found" check stays

**Implementation**:

Read `server/ordersDb.ts` and find the client lookup in `createOrder()` (around line 154-163). Add the archived check AFTER the existing null check:

```typescript
const client = await tx
  .select()
  .from(clients)
  .where(eq(clients.id, input.clientId))
  .limit(1)
  .then(rows => rows[0]);

if (!client) {
  throw new Error(`Client ${input.clientId} not found`);
}

// TER-253: Reject orders for archived (soft-deleted) clients
if (client.deletedAt !== null) {
  throw new Error(`Cannot create order for archived client ${input.clientId}`);
}
```

**Verification**:
```bash
pnpm check 2>&1 | tail -5
```

🔒 **GATE 3**: Paste output.

---

## Task 4: TER-255 — Return NOT_FOUND on Client Delete (SIMPLE)

**What**: `clients.delete` silently succeeds for non-existent or already-deleted clients. Add existence check.

**Files**: `server/clientsDb.ts` (~lines 529-545)

**Acceptance Criteria**:
- [ ] Before soft-deleting, fetch the client by ID
- [ ] If client doesn't exist, throw error with NOT_FOUND semantics
- [ ] If client is already deleted (`deletedAt !== null`), throw error
- [ ] Error messages include the client ID

**Implementation**:

Read `server/clientsDb.ts` and find `deleteClient()` (around line 529). Add pre-checks:

```typescript
export async function deleteClient(clientId: number, userId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // TER-255: Verify client exists and is not already deleted
  const existing = await db
    .select({ id: clients.id, deletedAt: clients.deletedAt })
    .from(clients)
    .where(eq(clients.id, clientId))
    .limit(1)
    .then(rows => rows[0]);

  if (!existing) {
    throw new Error(`Client with ID ${clientId} not found`);
  }

  if (existing.deletedAt !== null) {
    throw new Error(`Client with ID ${clientId} is already archived`);
  }

  // Soft delete by setting deletedAt timestamp
  await db
    .update(clients)
    .set({ deletedAt: new Date() })
    .where(eq(clients.id, clientId));

  if (userId) {
    await logActivity(clientId, userId, "UPDATED", { action: "archived" });
  }

  return true;
}
```

**Note**: The router at `server/routers/clients.ts` should catch this error and convert to `TRPCError` with `NOT_FOUND` code. Check if that's already handled or if you need to add it.

**Verification**:
```bash
pnpm check 2>&1 | tail -5
```

🔒 **GATE 4**: Paste output.

---

## Task 5: TER-254 — Row-Level Locking for inventory.adjustQty (MEDIUM)

**What**: `adjustQty` reads a batch quantity, calculates new value, then writes — without a lock. Concurrent requests can overwrite each other. Add `SELECT ... FOR UPDATE` within a transaction.

**Files**:
- `server/routers/inventory.ts` (~lines 1139-1256) — the adjustQty mutation
- `server/inventoryDb.ts` (~lines 745-796) — the updateBatchQty function

**Acceptance Criteria**:
- [ ] The adjustQty mutation wraps the read-calculate-write in a `db.transaction()`
- [ ] The batch fetch uses `.for("update")` to acquire row-level lock
- [ ] The update happens within the same transaction
- [ ] Negative quantity check still works
- [ ] Audit logging (inventoryMovements) happens within the same transaction
- [ ] `computeTotalQty` still returns correctly

**Implementation**:

Read both files. The key change is in `server/routers/inventory.ts`. The mutation currently does:
1. `getBatchById(input.id)` — unlocked read
2. Calculate `newQty = currentQty + adjustment`
3. `updateBatchQty(id, field, newQty)` — separate write

Refactor to:
```typescript
.mutation(async ({ input, ctx }) => {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.transaction(async (tx) => {
    // TER-254: Lock batch row before reading to prevent race conditions
    const [batch] = await tx
      .select()
      .from(batches)
      .where(eq(batches.id, input.id))
      .for("update")
      .limit(1);

    if (!batch) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: `Batch ${input.id} not found`,
      });
    }

    const currentQty = parseFloat(batch[input.field] || "0");
    const newQty = currentQty + input.adjustment;

    if (newQty < 0) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Adjustment would result in negative ${input.field}. Current: ${currentQty}, adjustment: ${input.adjustment}`,
      });
    }

    const newQtyStr = newQty.toFixed(4);

    // Update within the locked transaction
    await tx
      .update(batches)
      .set({
        [input.field]: newQtyStr,
        version: sql`version + 1`,
      })
      .where(eq(batches.id, input.id));

    // Log inventory movement within same transaction
    await tx.insert(inventoryMovements).values({
      batchId: input.id,
      inventoryMovementType: "ADJUSTMENT",
      quantityChange: String(input.adjustment),
      quantityBefore: String(currentQty),
      quantityAfter: newQtyStr,
      field: input.field,
      reason: input.reason || "Manual adjustment",
      performedBy: getAuthenticatedUserId(ctx),
    });

    // Re-fetch for response (still within lock)
    const [updated] = await tx
      .select()
      .from(batches)
      .where(eq(batches.id, input.id));

    return {
      ...updated,
      totalQty: computeTotalQty(updated),
    };
  });
})
```

**Important**: Check what `batches`, `inventoryMovements`, `sql`, `computeTotalQty` imports exist. Follow the existing import patterns. Also check if `inventoryMovements` has a `field` column — if not, use `notes` or `reason` for the field name.

**Verification**:
```bash
pnpm check 2>&1 | tail -5
pnpm test -- --grep "adjustQty\|inventory" 2>&1 | tail -20
```

🔒 **GATE 5**: Paste both outputs.

---

## VERIFICATION GATES (Final)

After ALL 5 tasks are complete:

```bash
# Gate 6: Full verification suite
pnpm check 2>&1 | tail -5
pnpm lint 2>&1 | tail -10
pnpm test 2>&1 | tail -15
pnpm build 2>&1 | tail -5
```

🔒 **GATE 6**: Paste ALL four command outputs.

---

## QA PROTOCOL (5-Lens — Required)

### Lens 1: Static Pattern Scan
```bash
git diff HEAD~1..HEAD | grep -E "(ctx\.user\?\.(id|name)\s*\|\|)|(\.delete\()|(: any[^_])|(input\.userId)|(input\.createdBy)"
```

### Lens 2: Execution Path Tracing
Trace these through all branches:
- `orders.create` — empty items, valid items, archived client, missing client
- `orders.delete` — valid ID, non-existent ID, already-deleted ID
- `clients.delete` — valid ID, non-existent ID, already-deleted ID
- `inventory.adjustQty` — positive adjustment, negative adjustment (valid), negative adjustment (goes below 0), non-existent batch

### Lens 3: Data Flow Analysis
- `adjustQty` lock lifecycle: acquire lock → read → calculate → write → release
- Verify no path bypasses the transaction

### Lens 4: Adversarial Scenarios (minimum 10)
1. `orders.create` with `items: []`
2. `orders.create` with items for archived client
3. `orders.create` with non-existent clientId
4. `orders.delete` with ID = 999999
5. `orders.delete` with already-deleted order
6. `clients.delete` with ID = 999999
7. `clients.delete` with already-archived client
8. `adjustQty` with adjustment that would go negative
9. `adjustQty` with non-existent batchId
10. `adjustQty` concurrent calls (verify locking prevents overwrite)

### Lens 5: Integration & Blast Radius
- Check what calls `deleteClient()` — verify all callers handle the new error
- Check what calls `softDelete(orders, ...)` — verify the pre-check doesn't break other callers
- Check what calls `updateBatchQty()` — verify the function signature hasn't broken callers

---

## Fix Cycle

For each issue found by QA:
1. Fix the issue
2. Re-run the specific verification that failed
3. Paste the new output

**Maximum 3 fix cycles.** If issues persist, STOP and report.

---

## Completion Checklist

- [ ] Task 1 (TER-251): Empty items array rejected with validation error
- [ ] Task 2 (TER-252): Order delete returns NOT_FOUND for missing orders
- [ ] Task 3 (TER-253): Order create rejects archived clients
- [ ] Task 4 (TER-255): Client delete returns NOT_FOUND for missing/archived clients
- [ ] Task 5 (TER-254): adjustQty uses SELECT FOR UPDATE within transaction
- [ ] Gate 6 passed: TypeScript, Lint, Tests, Build all pass
- [ ] QA 5-lens protocol completed
- [ ] All QA findings addressed or documented
- [ ] No `console.log` in production code
- [ ] No `any` types introduced
- [ ] Git committed with conventional format

---

## MANDATORY RULES (REPEATED)

1. NO PHANTOM VERIFICATION — show actual command output
2. NO PREMATURE COMPLETION — check every box with evidence
3. NO SILENT ERROR HANDLING — STOP and report failures
4. NO QA SKIPPING — all 5 lenses required
5. NO HAPPY-PATH-ONLY TESTING — adversarial scenarios mandatory
6. PROOF OF WORK at every 🔒 gate
7. READ FILES BEFORE EDITING
8. ONE THING AT A TIME

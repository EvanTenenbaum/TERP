# Team C: Inventory & Orders Agent Prompt

**Role:** Inventory Lead
**Branch:** `claude/team-c-inventory`
**Priority:** HIGH - Data integrity

---

## Mission

Fix critical inventory management bugs that cause data inconsistencies. These are isolated fixes that can run in parallel with other teams.

**No dependencies - start immediately.**

---

## Task List

### Task 1: INV-001 - Add Inventory Deduction on Ship/Fulfill

**Estimate:** 4h
**Module:** `server/routers/orders.ts:1355-1428, 1434-1494`
**Risk Level:** RED MODE

**Problem:**
When orders are shipped or fulfilled, inventory is not deducted from batches. The `onHandQuantity` remains unchanged.

**Current flow:**
```
Order Shipped → status = 'shipped'
                ❌ batch.onHandQuantity unchanged
```

**Required flow:**
```
Order Shipped → status = 'shipped'
             → batch.onHandQuantity -= allocated quantity
             → inventory_movements record created
```

**Implementation:**

```typescript
// server/services/inventoryService.ts

export async function deductInventoryForShipment(
  tx: Transaction,
  orderId: number,
  lineItems: OrderLineItem[],
  actorId: number
): Promise<void> {
  for (const item of lineItems) {
    // 1. Lock batch row
    const batch = await tx.query.batches.findFirst({
      where: eq(batches.id, item.batchId),
      // FOR UPDATE implicit in transaction
    })

    if (!batch) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: `Batch ${item.batchId} not found`
      })
    }

    // 2. Validate sufficient quantity
    if (batch.onHandQuantity < item.quantity) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `Insufficient inventory: batch ${batch.batchNumber} has ${batch.onHandQuantity}, need ${item.quantity}`
      })
    }

    // 3. Deduct inventory
    await tx.update(batches)
      .set({
        onHandQuantity: batch.onHandQuantity - item.quantity,
        updatedAt: new Date()
      })
      .where(eq(batches.id, item.batchId))

    // 4. Create movement record
    await tx.insert(inventoryMovements).values({
      batchId: item.batchId,
      orderId,
      movementType: 'SHIPMENT',
      quantity: -item.quantity,
      previousQuantity: batch.onHandQuantity,
      newQuantity: batch.onHandQuantity - item.quantity,
      createdBy: actorId,
      notes: `Shipped for order ${orderId}`
    })
  }
}
```

**Integration:**
Call from order shipment handler:

```typescript
// In orders router shipOrder procedure
await deductInventoryForShipment(tx, orderId, order.lineItems, ctx.user.id)
```

**Deliverables:**
- [ ] deductInventoryForShipment function created
- [ ] Called during order shipment
- [ ] Called during order fulfillment
- [ ] inventory_movements records created
- [ ] Throws on insufficient inventory
- [ ] Tests verify quantity changes

---

### Task 2: INV-002 - Fix Race Condition in Draft Order Confirmation

**Estimate:** 2h
**Module:** `server/ordersDb.ts:1137-1161`
**Risk Level:** RED MODE

**Problem:**
Two concurrent confirmations of draft orders with same batches can over-allocate inventory.

```
Thread A: Check batch.onHandQuantity = 100, need 80 ✓
Thread B: Check batch.onHandQuantity = 100, need 80 ✓
Thread A: Confirm order (allocate 80)
Thread B: Confirm order (allocate 80)
Result: 160 allocated from 100 available! ❌
```

**Solution:** Use `SELECT ... FOR UPDATE` to lock batch rows during confirmation.

**Implementation:**

```typescript
// server/services/orderService.ts

export async function confirmDraftOrder(
  tx: Transaction,
  orderId: number
): Promise<void> {
  const order = await tx.query.orders.findFirst({
    where: eq(orders.id, orderId),
    with: { lineItems: true }
  })

  // Lock batches in consistent order to prevent deadlocks
  const batchIds = order.lineItems.map(li => li.batchId).sort()

  for (const batchId of batchIds) {
    // SELECT FOR UPDATE - blocks other transactions
    const [batch] = await tx.execute(sql`
      SELECT * FROM batches
      WHERE id = ${batchId}
      FOR UPDATE
    `)

    const needed = order.lineItems
      .filter(li => li.batchId === batchId)
      .reduce((sum, li) => sum + li.quantity, 0)

    if (batch.on_hand_quantity < needed) {
      throw new TRPCError({
        code: 'CONFLICT',
        message: `Batch ${batch.batch_number} no longer has sufficient inventory (${batch.on_hand_quantity} available, ${needed} needed)`
      })
    }
  }

  // Now safe to proceed with confirmation
  // Inventory will be deducted on shipment (INV-001)
}
```

**Key points:**
1. Sort batch IDs to prevent deadlocks
2. Use `FOR UPDATE` to lock rows
3. Validate availability while holding lock
4. Clear error message on conflict

**Deliverables:**
- [ ] FOR UPDATE locking added
- [ ] Batch IDs sorted before locking
- [ ] Conflict error message is user-friendly
- [ ] Integration test: concurrent confirmations
- [ ] One confirmation succeeds, one fails gracefully

---

## Verification Checklist

```bash
# Core verification
pnpm check
pnpm lint
pnpm test server/ordersDb.test.ts
pnpm test server/services/inventoryService.test.ts
pnpm build

# Verify implementations
grep -r "deductInventoryForShipment" server/
grep -r "FOR UPDATE" server/ordersDb.ts
grep -r "inventoryMovements" server/services/
```

---

## Testing Concurrent Operations

Create integration test for INV-002:

```typescript
// server/ordersDb.integration.test.ts

describe('concurrent order confirmation', () => {
  it('prevents double-allocation via locking', async () => {
    // Setup: batch with 100 units, two draft orders for 80 each
    const batch = await createTestBatch({ onHandQuantity: 100 })
    const order1 = await createDraftOrder({ batchId: batch.id, quantity: 80 })
    const order2 = await createDraftOrder({ batchId: batch.id, quantity: 80 })

    // Confirm both concurrently
    const results = await Promise.allSettled([
      confirmOrder(order1.id),
      confirmOrder(order2.id)
    ])

    // One succeeds, one fails
    const successes = results.filter(r => r.status === 'fulfilled')
    const failures = results.filter(r => r.status === 'rejected')

    expect(successes).toHaveLength(1)
    expect(failures).toHaveLength(1)
    expect(failures[0].reason.message).toContain('insufficient inventory')
  })
})
```

---

## PR Template

```markdown
## Team C: Inventory & Orders

### Tasks Completed
- [x] INV-001: Add Inventory Deduction on Ship/Fulfill
- [x] INV-002: Fix Race Condition in Draft Order Confirmation

### Key Changes
- Inventory deducted atomically on shipment
- inventory_movements audit trail created
- FOR UPDATE locking prevents over-allocation
- Clear error messages on inventory conflicts

### Data Integrity
- No negative inventory possible
- No over-allocation possible
- Full audit trail via movements table

### Verification
- [ ] `pnpm check` passes
- [ ] `pnpm lint` passes
- [ ] `pnpm test` passes
- [ ] `pnpm build` passes
- [ ] Concurrent confirmation test passes
```

---

## Communication

**Update session file:** `docs/sessions/active/team-c-inventory.md`

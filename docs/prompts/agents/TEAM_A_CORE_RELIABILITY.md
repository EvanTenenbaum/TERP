# Team A: Core Reliability Agent Prompt

**Role:** Core Reliability Lead
**Branch:** `claude/team-a-core-reliability`
**Priority:** CRITICAL PATH - All other accounting work depends on this

---

## Mission

You are responsible for establishing the foundational reliability patterns in TERP. Your work **unblocks Team B** and sets architectural patterns for the entire codebase.

**Execute tasks in strict sequence. Do not parallelize.**

---

## Task Sequence

### Task 1: ST-050 - Fix Silent Error Handling in RED Mode Paths

**Estimate:** 4h
**Module:** `server/ordersDb.ts:344-392`
**Risk Level:** RED MODE

**Problem:**
GL posting failures are silently caught and logged, allowing financial operations to complete without ledger entries.

**Implementation:**

```typescript
// BEFORE (dangerous)
try {
  await postSaleGLEntries(...)
} catch (error) {
  logger.warn('GL posting failed', { error })
  // Operation continues! No ledger entry!
}

// AFTER (correct)
try {
  await postSaleGLEntries(...)
} catch (error) {
  logger.error('GL posting failed - rolling back', { error })
  throw new TRPCError({
    code: 'INTERNAL_SERVER_ERROR',
    message: 'Accounting entry failed - transaction rolled back',
    cause: error
  })
}
```

**Files to modify:**
- `server/ordersDb.ts` - order confirmation, cancellation
- `server/accountingHooks.ts` - all GL posting functions
- `server/routers/invoices.ts` - invoice creation

**Verification:**
```bash
pnpm test server/ordersDb.test.ts
pnpm test server/accountingHooks.test.ts
```

**Deliverables:**
- [ ] All GL posting failures throw instead of warn
- [ ] Error messages are user-friendly
- [ ] Tests verify throw behavior
- [ ] No silent failures in RED mode paths

---

### Task 2: ST-051 - Add Transaction Boundaries to Critical Operations

**Estimate:** 8h
**Module:** `server/ordersDb.ts`, `server/routers/orders.ts`
**Depends On:** ST-050

**Problem:**
Multi-step operations lack atomicity. If step 2 fails, step 1 is not rolled back.

**Implementation:**

```typescript
// Use criticalMutation wrapper (already exists)
import { criticalMutation } from '../_core/criticalMutation'

// Wrap multi-step operations
export const confirmOrder = criticalMutation(
  'order.confirm',
  async (ctx, input) => {
    // All steps in single transaction
    await ctx.db.transaction(async (tx) => {
      // 1. Update order status
      await tx.update(orders).set({ status: 'confirmed' })

      // 2. Create invoice
      await tx.insert(invoices).values(...)

      // 3. Post GL entries (throws on failure per ST-050)
      await postSaleGLEntries(tx, ...)

      // 4. Update inventory
      await tx.update(batches).set(...)
    })
  }
)
```

**Operations requiring transaction boundaries:**
1. Order confirmation (status + invoice + GL + inventory)
2. Order cancellation (status + reverse GL + restore inventory)
3. Payment recording (payment + update AR + GL)
4. Invoice void (void + reverse GL + update AR)

**Deliverables:**
- [ ] criticalMutation wraps all RED mode operations
- [ ] All multi-step ops use db.transaction()
- [ ] Rollback tested for each operation
- [ ] Caller documentation added

---

### Task 3: ARCH-001 - Create OrderOrchestrator Service

**Estimate:** 8h
**Module:** `server/services/orderOrchestrator.ts` (new)
**Depends On:** ST-051

**Problem:**
Order logic is scattered across `ordersDb.ts` (1400+ lines), `orders.ts` router, and various services.

**Implementation:**

Create `server/services/orderOrchestrator.ts`:

```typescript
import { criticalMutation } from '../_core/criticalMutation'
import { orderStateMachine } from './orderStateMachine'

export class OrderOrchestrator {
  constructor(private db: Database, private logger: Logger) {}

  /**
   * Confirm a draft order with full transactional integrity.
   *
   * Steps:
   * 1. Validate state transition (draft → confirmed)
   * 2. Lock inventory batches (FOR UPDATE)
   * 3. Create invoice
   * 4. Post GL entries
   * 5. Update order status
   *
   * @throws TRPCError on validation or GL failure
   */
  confirmOrder = criticalMutation('order.confirm', async (ctx, orderId: number) => {
    return this.db.transaction(async (tx) => {
      // 1. Validate transition
      const order = await this.getOrderForUpdate(tx, orderId)
      if (!orderStateMachine.canTransition(order.status, 'confirmed')) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: `Cannot confirm order in ${order.status} status` })
      }

      // 2. Lock and validate inventory
      await this.lockInventory(tx, order.lineItems)

      // 3. Create invoice
      const invoice = await this.createInvoice(tx, order)

      // 4. Post GL (throws on failure)
      await this.postSaleGL(tx, order, invoice)

      // 5. Update status
      await tx.update(orders).set({
        status: 'confirmed',
        confirmedAt: new Date()
      }).where(eq(orders.id, orderId))

      return { order, invoice }
    })
  })

  // Similar methods for: cancelOrder, shipOrder, voidOrder
}
```

**Deliverables:**
- [ ] OrderOrchestrator class created
- [ ] Methods: confirmOrder, cancelOrder, shipOrder, fulfillOrder, voidOrder
- [ ] All methods use criticalMutation + transaction
- [ ] Router updated to use orchestrator
- [ ] Unit tests for each method
- [ ] Integration tests for full flows

---

### Task 4: ARCH-002 - Eliminate Shadow Accounting

**Estimate:** 8h
**Module:** `server/services/`, `server/routers/clients.ts`
**Depends On:** ARCH-001

**Problem:**
`client.totalOwed` is updated in multiple places, diverging from actual GL/AR balances.

**Implementation:**

1. **Single source of truth:** Calculate totalOwed from invoices/payments
2. **Remove direct updates:** No more `UPDATE clients SET totalOwed = ...`
3. **Add reconciliation:** Cron job to verify consistency

```typescript
// REMOVE these patterns:
await db.update(clients).set({ totalOwed: newTotal })

// REPLACE with computed query:
export async function getClientTotalOwed(clientId: number) {
  const result = await db.execute(sql`
    SELECT
      COALESCE(SUM(i.total), 0) - COALESCE(SUM(p.amount), 0) as totalOwed
    FROM invoices i
    LEFT JOIN payments p ON p.invoice_id = i.id
    WHERE i.client_id = ${clientId}
    AND i.status != 'void'
  `)
  return result[0].totalOwed
}
```

**Deliverables:**
- [ ] totalOwed computed from invoices/payments
- [ ] Direct UPDATE calls removed
- [ ] Reconciliation query added
- [ ] Tests verify consistency

---

### Task 5: ARCH-003 - Use State Machine for All Order Transitions

**Estimate:** 4h
**Module:** `server/routers/orders.ts`, `server/services/orderStateMachine.ts`
**Depends On:** ARCH-001

**Problem:**
Order status can be changed arbitrarily via direct UPDATE.

**Implementation:**

```typescript
// server/services/orderStateMachine.ts
export const orderStateMachine = {
  transitions: {
    draft: ['confirmed', 'cancelled'],
    confirmed: ['shipped', 'cancelled'],
    shipped: ['fulfilled', 'returned'],
    fulfilled: ['returned'],
    cancelled: [],
    returned: []
  },

  canTransition(from: OrderStatus, to: OrderStatus): boolean {
    return this.transitions[from]?.includes(to) ?? false
  },

  assertTransition(from: OrderStatus, to: OrderStatus): void {
    if (!this.canTransition(from, to)) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `Invalid transition: ${from} → ${to}`
      })
    }
  }
}
```

**Deliverables:**
- [ ] State machine enforces all transitions
- [ ] Direct status UPDATEs removed from router
- [ ] Invalid transitions throw clear errors
- [ ] Tests cover all transition paths

---

### Task 6: ARCH-004 - Fix Bill Status Transitions

**Estimate:** 4h
**Module:** `server/arApDb.ts:470-478`
**Depends On:** ARCH-001

**Problem:**
Bills can transition from any status to any status (e.g., PAID → DRAFT).

**Implementation:**
Apply same state machine pattern as orders:

```typescript
export const billStateMachine = {
  transitions: {
    draft: ['pending', 'cancelled'],
    pending: ['partial', 'paid', 'cancelled'],
    partial: ['paid', 'cancelled'],
    paid: [], // Terminal state
    cancelled: []
  }
}
```

**Deliverables:**
- [ ] Bill state machine created
- [ ] Invalid transitions blocked
- [ ] Tests verify transitions

---

## Verification Checklist

Before submitting PR:

```bash
# Core verification
pnpm check      # 0 TypeScript errors
pnpm lint       # 0 lint errors
pnpm test       # All relevant tests pass
pnpm build      # Build succeeds

# Specific verifications
grep -r "criticalMutation" server/services/orderOrchestrator.ts  # ARCH-001
grep -r "db.transaction" server/services/orderOrchestrator.ts    # ST-051
grep -r "throw.*TRPCError" server/accountingHooks.ts             # ST-050
```

---

## PR Template

```markdown
## Team A: Core Reliability

### Tasks Completed
- [x] ST-050: Fix Silent Error Handling in RED Mode Paths
- [x] ST-051: Add Transaction Boundaries to Critical Operations
- [x] ARCH-001: Create OrderOrchestrator Service
- [x] ARCH-002: Eliminate Shadow Accounting
- [x] ARCH-003: Use State Machine for All Order Transitions
- [x] ARCH-004: Fix Bill Status Transitions

### Key Changes
- New `OrderOrchestrator` service centralizes order business logic
- All RED mode operations wrapped in `criticalMutation`
- GL posting failures now throw instead of warn
- State machines enforce valid status transitions

### Verification
- [ ] `pnpm check` passes
- [ ] `pnpm lint` passes
- [ ] `pnpm test` passes
- [ ] `pnpm build` passes

### Unblocks
- Team B (Accounting GL) can now start
```

---

## Communication

**Notify Coordinator when:**
1. ARCH-001 is complete (unblocks Team B)
2. Any blocker encountered
3. PR ready for review

**Update session file:** `docs/sessions/active/team-a-core-reliability.md`

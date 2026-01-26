# Team B: Accounting GL Agent Prompt

**Role:** Accounting & GL Lead
**Branch:** `claude/team-b-accounting-gl`
**Priority:** HIGH - Financial integrity

---

## BLOCKED STATUS

**You are BLOCKED until Team A completes ARCH-001.**

Check for unlock:
```bash
grep -A 3 "ARCH-001" docs/roadmaps/MASTER_ROADMAP.md | grep "Status:"
# Must show: **Status:** complete
```

**Why blocked:** ACC-002 and ACC-003 need the OrderOrchestrator patterns from ARCH-001 to properly integrate GL reversals into the transaction flow.

**ACC-004 can start immediately** as it's additive (creating new entries, not modifying existing flows).

---

## Mission

Implement complete GL (General Ledger) accounting entries for all financial operations. Currently, many operations modify AR/AP without creating corresponding GL entries.

---

## Task Sequence

### Task 1: ACC-004 - Create COGS GL Entries on Sale (START IMMEDIATELY)

**Estimate:** 4h
**Module:** `server/services/orderAccountingService.ts:119-138`
**Depends On:** None
**Risk Level:** RED MODE

**Problem:**
Sales record revenue but not Cost of Goods Sold. Income statement is incomplete.

**Current flow:**
```
Order Confirmed → Invoice Created → Revenue GL Posted
                                    ❌ NO COGS ENTRY
```

**Required flow:**
```
Order Confirmed → Invoice Created → Revenue GL Posted
                                 → COGS GL Posted (NEW)
```

**Implementation:**

```typescript
// server/services/orderAccountingService.ts

export async function postCOGSEntries(
  tx: Transaction,
  orderId: number,
  lineItems: OrderLineItem[]
): Promise<void> {
  const entries: GLEntry[] = []

  for (const item of lineItems) {
    // Get batch COGS
    const batch = await tx.query.batches.findFirst({
      where: eq(batches.id, item.batchId)
    })

    if (!batch?.unitCogs) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Batch ${item.batchId} missing unitCogs - cannot calculate COGS`
      })
    }

    const cogsCost = batch.unitCogs * item.quantity

    // Debit: Cost of Goods Sold (expense)
    entries.push({
      accountType: 'COGS',
      debit: cogsCost,
      credit: 0,
      orderId,
      batchId: item.batchId,
      description: `COGS for ${item.quantity} units from batch ${batch.batchNumber}`
    })

    // Credit: Inventory (asset)
    entries.push({
      accountType: 'INVENTORY',
      debit: 0,
      credit: cogsCost,
      orderId,
      batchId: item.batchId,
      description: `Inventory reduction for sale`
    })
  }

  // Insert all entries atomically
  await tx.insert(glEntries).values(entries)
}
```

**Integration point:**
Call `postCOGSEntries` from OrderOrchestrator.confirmOrder after invoice creation.

**Deliverables:**
- [ ] postCOGSEntries function created
- [ ] Called during order confirmation
- [ ] Throws on missing batch COGS
- [ ] Tests verify COGS entries created
- [ ] Tests verify rollback on failure

---

### Task 2: ACC-002 - GL Reversals for Invoice Void (AFTER ARCH-001)

**Estimate:** 4h
**Module:** `server/routers/invoices.ts:449-497`
**Depends On:** ARCH-001
**Risk Level:** RED MODE

**Problem:**
Voiding an invoice marks it void but doesn't reverse the GL entries.

**Current flow:**
```
Invoice Void → status = 'void'
               ❌ GL entries remain (overstated revenue)
```

**Required flow:**
```
Invoice Void → status = 'void'
            → Reverse all GL entries (NEW)
            → Update client AR balance
```

**Implementation:**

```typescript
// server/services/invoiceAccountingService.ts

export async function reverseInvoiceGLEntries(
  tx: Transaction,
  invoiceId: number,
  voidedBy: number
): Promise<void> {
  // 1. Get original GL entries
  const originalEntries = await tx.query.glEntries.findMany({
    where: eq(glEntries.invoiceId, invoiceId)
  })

  if (originalEntries.length === 0) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: `No GL entries found for invoice ${invoiceId}`
    })
  }

  // 2. Create reversing entries (swap debit/credit)
  const reversingEntries = originalEntries.map(entry => ({
    accountType: entry.accountType,
    debit: entry.credit,    // Swap
    credit: entry.debit,    // Swap
    invoiceId: entry.invoiceId,
    description: `REVERSAL: ${entry.description}`,
    createdBy: voidedBy,
    reversesEntryId: entry.id  // Link to original
  }))

  // 3. Insert reversing entries
  await tx.insert(glEntries).values(reversingEntries)

  // 4. Mark original entries as reversed
  await tx.update(glEntries)
    .set({ reversedAt: new Date(), reversedBy: voidedBy })
    .where(eq(glEntries.invoiceId, invoiceId))
}
```

**Deliverables:**
- [ ] reverseInvoiceGLEntries function created
- [ ] Called during invoice void
- [ ] Original entries marked as reversed
- [ ] Reversing entries linked to originals
- [ ] Tests verify zero-sum after reversal

---

### Task 3: ACC-003 - GL Reversals for Returns/Credit Memos (AFTER ACC-002)

**Estimate:** 4h
**Module:** `server/routers/returns.ts:231-328`
**Depends On:** ACC-002 (pattern established)
**Risk Level:** RED MODE

**Problem:**
Returns restock inventory but don't:
- Create credit memos
- Reverse invoice entries
- Update client totalOwed
- Create reversing GL entries

**Implementation:**

```typescript
// server/services/returnAccountingService.ts

export async function processReturnAccounting(
  tx: Transaction,
  returnId: number,
  originalOrderId: number,
  returnedItems: ReturnItem[]
): Promise<void> {
  // 1. Create credit memo
  const creditMemo = await tx.insert(creditMemos).values({
    returnId,
    originalOrderId,
    amount: calculateReturnTotal(returnedItems),
    status: 'applied',
    createdAt: new Date()
  }).returning()

  // 2. Reverse revenue GL entries (proportional to returned items)
  await reverseRevenueForReturn(tx, originalOrderId, returnedItems)

  // 3. Reverse COGS entries (inventory coming back)
  await reverseCOGSForReturn(tx, originalOrderId, returnedItems)

  // 4. Update client AR (reduce amount owed)
  // Note: After ARCH-002, this is computed not updated
}

async function reverseRevenueForReturn(
  tx: Transaction,
  orderId: number,
  items: ReturnItem[]
): Promise<void> {
  for (const item of items) {
    // Calculate proportional revenue to reverse
    const revenueToReverse = item.unitPrice * item.returnedQuantity

    await tx.insert(glEntries).values([
      {
        accountType: 'REVENUE',
        debit: revenueToReverse,  // Reverse: debit revenue
        credit: 0,
        description: `Return reversal: ${item.returnedQuantity} units`
      },
      {
        accountType: 'AR',
        debit: 0,
        credit: revenueToReverse,  // Reverse: credit AR
        description: `AR reduction for return`
      }
    ])
  }
}
```

**Deliverables:**
- [ ] Credit memo created on return
- [ ] Revenue GL entries reversed proportionally
- [ ] COGS GL entries reversed (inventory back)
- [ ] AR balance updated
- [ ] Tests verify full return accounting

---

## Verification Checklist

```bash
# Core verification
pnpm check
pnpm lint
pnpm test server/services/*Accounting*.test.ts
pnpm test server/routers/invoices.test.ts
pnpm test server/routers/returns.test.ts
pnpm build

# Verify GL entries exist
grep -r "postCOGSEntries" server/services/
grep -r "reverseInvoiceGLEntries" server/routers/invoices.ts
grep -r "processReturnAccounting" server/routers/returns.ts
```

---

## PR Template

```markdown
## Team B: Accounting GL

### Tasks Completed
- [x] ACC-004: Create COGS GL Entries on Sale
- [x] ACC-002: GL Reversals for Invoice Void
- [x] ACC-003: GL Reversals for Returns/Credit Memos

### Key Changes
- COGS entries created on order confirmation
- Invoice void creates reversing GL entries
- Returns create credit memos and reverse GL
- All operations use transaction boundaries (per Team A patterns)

### Financial Integrity
- GL entries sum to zero after reversals
- No orphaned entries possible
- Full audit trail with entry links

### Verification
- [ ] `pnpm check` passes
- [ ] `pnpm lint` passes
- [ ] `pnpm test` passes (accounting tests)
- [ ] `pnpm build` passes
```

---

## Communication

**Wait for unlock signal from Coordinator before starting ACC-002/ACC-003.**

**Update session file:** `docs/sessions/active/team-b-accounting-gl.md`

# TODO Completion Guide

**Priority:** 🟡 MEDIUM
**Effort:** 2-4 weeks (staggered)
**Impact:** Feature completeness

---

## Overview

**40+ TODO comments** across the codebase indicating incomplete features or deferred work.

### Categories

1. **Accounting Integration** (11 TODOs) - 🔴 High Priority
2. **Dashboard Calculations** (5 TODOs) - 🟡 Medium Priority
3. **COGS Management** (3 TODOs) - 🟡 Medium Priority
4. **Bad Debt Accounting** (6 TODOs) - 🟢 Low Priority
5. **Misc Features** (15+ TODOs) - 🟢 Low Priority

---

## Category 1: Accounting Integration (CRITICAL)

### TODOs in ordersDb.ts

**Location:** `server/ordersDb.ts` lines 269-271, 601

```typescript
// TODO: Create invoice (accounting integration)
// TODO: Record cash payment (accounting integration)
// TODO: Update credit exposure (credit intelligence integration)
```

**Context:** When order is converted from draft to sale:
- Should create invoice automatically
- Should record payment if cash sale
- Should update client credit exposure

---

#### Implementation Plan

**Phase 1: Invoice Creation (1 day)**

**Add to** `server/ordersDb.ts`:

```typescript
import { createInvoice } from './accountingDb';
import { recordPayment } from './accountingDb';
import { updateCreditExposure } from './creditsDb';

async function convertOrderToSale(orderId: number, userId: number) {
  const db = await getDb();
  const tx = await db.transaction();

  try {
    // 1. Update order status
    const order = await updateOrderStatus(orderId, 'COMPLETED');

    // 2. Create invoice
    const invoice = await createInvoice({
      orderId,
      clientId: order.clientId,
      amount: order.subtotal,
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      status: 'SENT',
      createdBy: userId,
    }, tx);

    // 3. If cash sale, record payment immediately
    if (order.paymentMethod === 'CASH') {
      await recordPayment({
        invoiceId: invoice.id,
        amount: order.subtotal,
        paymentDate: new Date(),
        paymentMethod: 'CASH',
        createdBy: userId,
      }, tx);
    }

    // 4. Update credit exposure
    await updateCreditExposure({
      clientId: order.clientId,
      amount: order.subtotal,
      type: 'INCREASE', // or 'NONE' if paid
    }, tx);

    await tx.commit();
    return order;
  } catch (error) {
    await tx.rollback();
    throw error;
  }
}
```

---

**Phase 2: Accounting Hooks (2 days)**

**Add to** `server/accountingHooks.ts` (already exists):

```typescript
export async function onOrderComplete(order: Order, tx?: any) {
  // Create invoice
  const invoice = await createInvoiceFromOrder(order, tx);

  // Record cash payment if applicable
  if (order.paymentMethod === 'CASH') {
    await recordCashPayment(invoice, order, tx);
  }

  // Update credit exposure
  await adjustClientCredit(order.clientId, order.subtotal, tx);

  return invoice;
}
```

---

**Phase 3: Integration (1 day)**

Update order conversion flow:

```typescript
// In server/routers/orders.ts
convertToSale: protectedProcedure
  .input(z.object({ orderId: z.number() }))
  .mutation(async ({ input, ctx }) => {
    const order = await ordersDb.convertOrderToSale(
      input.orderId,
      ctx.user.id
    );

    // ✅ Invoice, payment, credit all handled automatically
    return { success: true, data: order };
  }),
```

---

### Bad Debt Accounting TODOs

**Location:** `server/badDebtDb.ts` lines 160, 167, 174, 181, 299, 306, 313, 320

```typescript
// TODO: Should reference actual Bad Debt Expense account
// TODO: Calculate actual fiscal period
```

---

#### Implementation Plan

**Phase 1: Account Configuration (1 day)**

**Add to** `server/configurationManager.ts`:

```typescript
// System account configuration
export async function getSystemAccounts() {
  return {
    badDebtExpense: await getAccountByCode('7200'), // Bad Debt Expense
    accountsReceivable: await getAccountByCode('1200'), // AR
    allowanceForDoubtfulAccounts: await getAccountByCode('1210'), // AFDA
  };
}
```

---

**Phase 2: Fiscal Period Calculation (1 day)**

**Add to** `server/accountingDb.ts`:

```typescript
export async function getCurrentFiscalPeriod(): Promise<FiscalPeriod> {
  const db = await getDb();
  const today = new Date();

  const [period] = await db
    .select()
    .from(fiscalPeriods)
    .where(
      and(
        lte(fiscalPeriods.startDate, today),
        gte(fiscalPeriods.endDate, today),
        eq(fiscalPeriods.status, 'OPEN')
      )
    )
    .limit(1);

  if (!period) {
    throw new Error('No open fiscal period found');
  }

  return period;
}
```

---

**Phase 3: Update Bad Debt Functions (1 day)**

**Update** `server/badDebtDb.ts`:

```typescript
export async function writeBadDebt(clientId: number, amount: string) {
  const accounts = await getSystemAccounts();
  const fiscalPeriod = await getCurrentFiscalPeriod();

  // Create journal entry
  await createJournalEntry({
    date: new Date(),
    description: `Write-off bad debt for client ${clientId}`,
    entries: [
      {
        accountId: accounts.badDebtExpense.id, // ✅ No longer hardcoded
        debit: amount,
        credit: '0',
        fiscalPeriodId: fiscalPeriod.id, // ✅ Calculated
      },
      {
        accountId: accounts.accountsReceivable.id, // ✅ No longer hardcoded
        debit: '0',
        credit: amount,
        fiscalPeriodId: fiscalPeriod.id, // ✅ Calculated
      },
    ],
  });
}
```

---

## Category 2: Dashboard Calculations

### TODOs in dashboard.ts

**Location:** `server/routers/dashboard.ts` lines 30, 34, 36, 38, 146, 198

```typescript
// TODO: Add low stock threshold logic
// TODO: Calculate from previous period
// TODO: Calculate oldest invoice age from invoice dates
```

---

#### Implementation Plan

**Phase 1: Period-over-Period Changes (2 days)**

**Add to** `server/dashboardAnalytics.ts`:

```typescript
interface PeriodComparison {
  current: number;
  previous: number;
  change: number; // Percentage change
}

export async function getRevenueComparison(
  currentStart: Date,
  currentEnd: Date
): Promise<PeriodComparison> {
  // Calculate period length
  const periodLength = currentEnd.getTime() - currentStart.getTime();

  // Previous period dates
  const previousEnd = new Date(currentStart);
  const previousStart = new Date(currentStart.getTime() - periodLength);

  // Get revenue for both periods
  const currentRevenue = await getRevenueForPeriod(currentStart, currentEnd);
  const previousRevenue = await getRevenueForPeriod(previousStart, previousEnd);

  const change = previousRevenue > 0
    ? ((currentRevenue - previousRevenue) / previousRevenue) * 100
    : 0;

  return {
    current: currentRevenue,
    previous: previousRevenue,
    change,
  };
}
```

---

**Phase 2: Low Stock Alerts (1 day)**

**Add to** `server/inventoryDb.ts`:

```typescript
export async function getLowStockCount(): Promise<number> {
  const db = await getDb();

  // Get batches below threshold
  const lowStockBatches = await db
    .select({ id: batches.id })
    .from(batches)
    .where(
      and(
        eq(batches.status, 'LIVE'),
        sql`CAST(${batches.onHandQty} AS DECIMAL) < 10` // Threshold: 10 units
      )
    );

  return lowStockBatches.length;
}

// Make threshold configurable
export async function getLowStockCountWithThreshold(
  threshold: number
): Promise<number> {
  const db = await getDb();

  const lowStockBatches = await db
    .select({ id: batches.id })
    .from(batches)
    .where(
      and(
        eq(batches.status, 'LIVE'),
        sql`CAST(${batches.onHandQty} AS DECIMAL) < ${threshold}`
      )
    );

  return lowStockBatches.length;
}
```

---

**Phase 3: Aging Calculations (1 day)**

**Add to** `server/accountingDb.ts`:

```typescript
export async function getOldestDebtAge(): Promise<number> {
  const db = await getDb();

  const [oldest] = await db
    .select({
      dueDate: invoices.dueDate,
    })
    .from(invoices)
    .where(
      and(
        gt(invoices.amountDue, '0'),
        notInArray(invoices.status, ['PAID', 'VOID'])
      )
    )
    .orderBy(asc(invoices.dueDate))
    .limit(1);

  if (!oldest) return 0;

  // Calculate days overdue
  const now = new Date();
  const dueDate = new Date(oldest.dueDate);
  const daysOverdue = Math.floor(
    (now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  return daysOverdue;
}
```

---

**Phase 4: Update Dashboard Router (1 day)**

**Update** `server/routers/dashboard.ts`:

```typescript
import { getRevenueComparison, getOrderComparison } from '../dashboardAnalytics';
import { getLowStockCount, getOldestDebtAge } from '../accountingDb';

getKPIs: publicProcedure
  .query(async () => {
    const revenueComp = await getRevenueComparison(
      startOfMonth(new Date()),
      new Date()
    );

    const ordersComp = await getOrderComparison(
      startOfMonth(new Date()),
      new Date()
    );

    const lowStockCount = await getLowStockCount(); // ✅ No longer hardcoded
    const oldestDebt = await getOldestDebtAge(); // ✅ Calculated

    return {
      revenue: {
        value: revenueComp.current,
        change: revenueComp.change, // ✅ Calculated
      },
      orders: {
        value: ordersComp.current,
        change: ordersComp.change, // ✅ Calculated
      },
      inventory: {
        value: /* inventory value */,
        lowStockCount, // ✅ No longer 0
      },
      accounts: {
        receivable: /* AR balance */,
        oldestDebt, // ✅ Calculated
      },
    };
  }),
```

---

## Category 3: COGS Management Module

### TODOs in cogs.ts

**Location:** `server/routers/cogs.ts` lines 13, 26, 34

```typescript
// TODO: Implement COGS management module
```

**Context:** Placeholder router for COGS rule management.

---

#### Implementation Plan

**Phase 1: Design (1 day)**

**Define COGS Rule Schema:**

```typescript
interface CogsRule {
  id: number;
  name: string;
  category?: string;
  subcategory?: string;
  strain?: string;
  vendor?: string;
  mode: 'FIXED' | 'RANGE';
  fixedValue?: string;
  rangeMin?: string;
  rangeMax?: string;
  priority: number; // Higher = more specific
  isActive: boolean;
}
```

---

**Phase 2: Implement Router (2 days)**

**Update** `server/routers/cogs.ts`:

```typescript
import { z } from 'zod';
import { router, publicProcedure } from '../_core/trpc';
import * as cogsDb from '../cogsDb';

export const cogsRouter = router({
  // Get all COGS rules
  getAll: publicProcedure
    .query(async () => {
      const rules = await cogsDb.getAllCogsRules();
      return { success: true, data: rules };
    }),

  // Create COGS rule
  create: publicProcedure
    .input(z.object({
      name: z.string(),
      category: z.string().optional(),
      subcategory: z.string().optional(),
      strain: z.string().optional(),
      vendorId: z.number().optional(),
      mode: z.enum(['FIXED', 'RANGE']),
      fixedValue: z.string().optional(),
      rangeMin: z.string().optional(),
      rangeMax: z.string().optional(),
      priority: z.number(),
    }))
    .mutation(async ({ input }) => {
      const rule = await cogsDb.createCogsRule(input);
      return { success: true, data: rule };
    }),

  // Update COGS rule
  update: publicProcedure
    .input(z.object({
      id: z.number(),
      // ... fields to update
    }))
    .mutation(async ({ input }) => {
      const rule = await cogsDb.updateCogsRule(input.id, input);
      return { success: true, data: rule };
    }),

  // Delete COGS rule
  delete: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await cogsDb.deleteCogsRule(input.id);
      return { success: true };
    }),

  // Apply COGS rules to batch
  applyToBatch: publicProcedure
    .input(z.object({ batchId: z.number() }))
    .mutation(async ({ input }) => {
      const cogs = await cogsDb.calculateCOGSForBatch(input.batchId);
      return { success: true, data: cogs };
    }),
});
```

---

**Phase 3: Database Functions (2 days)**

**Create** `server/cogsDb.ts` (expand existing):

```typescript
export async function calculateCOGSForBatch(batchId: number) {
  // 1. Get batch details
  const batch = await getBatchWithProduct(batchId);

  // 2. Find matching COGS rules (by priority)
  const rules = await findMatchingCogsRules({
    category: batch.product.category,
    subcategory: batch.product.subcategory,
    strain: batch.product.strain,
    vendorId: batch.lot.vendorId,
  });

  // 3. Apply highest priority rule
  const topRule = rules[0];

  // 4. Update batch COGS
  if (topRule.mode === 'FIXED') {
    await updateBatch(batchId, {
      cogsMode: 'FIXED',
      unitCogs: topRule.fixedValue,
    });
  } else {
    await updateBatch(batchId, {
      cogsMode: 'RANGE',
      unitCogsMin: topRule.rangeMin,
      unitCogsMax: topRule.rangeMax,
    });
  }

  return { success: true };
}
```

---

## Category 4: Miscellaneous TODOs

### Quick Fixes (Individual TODOs)

#### 1. Batch Sequence Number

**Location:** `server/routers/inventory.ts` line 149

```typescript
// TODO: Get actual sequence from DB
const batchSequence = 1;

// ✅ FIX:
const batchSequence = await getNextBatchSequence(lotId);

// Add function:
async function getNextBatchSequence(lotId: number): Promise<number> {
  const db = await getDb();
  const [result] = await db
    .select({ maxSeq: sql<number>`MAX(CAST(SUBSTRING(code, -3) AS UNSIGNED))` })
    .from(batches)
    .where(eq(batches.lotId, lotId));

  return (result?.maxSeq || 0) + 1;
}
```

---

#### 2. Customer Name Join

**Location:** `server/routers/dashboard.ts` line 146

```typescript
// TODO: Join with customers table
customerName: `Customer ${customerId}`,

// ✅ FIX:
const [customer] = await db
  .select({ name: clients.name })
  .from(clients)
  .where(eq(clients.id, customerId))
  .limit(1);

customerName: customer?.name || `Customer ${customerId}`,
```

---

#### 3. Export Functionality

**Location:** `server/ordersDb.ts` line 629

```typescript
// TODO: Implement export logic
```

**Implementation:**

```typescript
import { stringify } from 'csv-stringify/sync';

export async function exportOrders(filters: any): Promise<string> {
  const orders = await getOrders(filters);

  const csvData = orders.map(order => ({
    'Order ID': order.id,
    'Client': order.client?.name,
    'Date': order.date.toISOString().split('T')[0],
    'Total': order.subtotal,
    'Status': order.status,
  }));

  return stringify(csvData, { header: true });
}
```

---

## Priority Matrix

| TODO Item | Priority | Effort | Impact |
|-----------|----------|--------|--------|
| Invoice creation on order complete | 🔴 High | 2 days | High |
| COGS rule management | 🟡 Medium | 5 days | Medium |
| Dashboard calculations | 🟡 Medium | 4 days | Medium |
| Bad debt account config | 🟢 Low | 3 days | Low |
| Export functionality | 🟢 Low | 1 day | Low |
| Misc quick fixes | 🟢 Low | 1 day | Low |

---

## Implementation Schedule

### Week 1: Critical Accounting
- Days 1-2: Invoice creation on order complete
- Days 3-4: Test and verify accounting integration
- Day 5: Bad debt account configuration

### Week 2: Dashboard & Analytics
- Days 1-2: Period-over-period calculations
- Days 3-4: Low stock alerts, aging calculations
- Day 5: Dashboard updates and testing

### Week 3: COGS Management
- Day 1: Design COGS rule system
- Days 2-3: Implement COGS router and DB functions
- Days 4-5: Build COGS management UI

### Week 4: Cleanup & Polish
- Days 1-2: Quick fixes (batch sequence, etc.)
- Days 3-4: Export functionality
- Day 5: Testing, documentation

**Total: 3-4 weeks**

---

## Testing Checklist

### Accounting Integration
- [ ] Order conversion creates invoice
- [ ] Cash sale records payment immediately
- [ ] Credit exposure updates correctly
- [ ] Journal entries balanced
- [ ] Fiscal period calculated correctly

### Dashboard
- [ ] Period comparisons accurate
- [ ] Low stock count correct
- [ ] Oldest debt age calculated
- [ ] All KPIs display properly

### COGS Management
- [ ] Rules created successfully
- [ ] Rules applied by priority
- [ ] Batch COGS updated correctly
- [ ] UI shows current COGS rules

---

## Success Criteria

✅ All critical TODOs completed
✅ Accounting integration working end-to-end
✅ Dashboard shows real calculations
✅ COGS management functional
✅ All tests passing
✅ No blocking TODOs remaining

---

## Notes for AI Developer

### Flexibility
- Can tackle categories in any order
- Can split into multiple PRs
- Can adjust priorities based on business needs
- Some TODOs may no longer be relevant (verify with owner)

### Recommendations
- Start with accounting integration (highest value)
- Test each category thoroughly before moving on
- Create UI for COGS management as separate task
- Some TODOs may be obsolete - verify before implementing

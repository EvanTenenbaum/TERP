# Wave 5C: Accounting Workflow Completion

**Agent Role**: Full Stack Developer  
**Duration**: 6-8 hours  
**Priority**: P1  
**Dependencies**: Wave 4 complete  
**Can Run Parallel With**: Wave 5A, 5B (different domains)

---

## Overview

Complete the AR/AP management, credit management, and returns processing workflows. These are critical for financial accuracy.

---

## File Domain

**Your files**: 
- `server/routers/accounting.ts`
- `server/routers/credits.ts`
- `server/routers/returns.ts`
- `server/services/creditEngine.ts`
- `client/src/pages/Accounting*.tsx`
- `client/src/pages/Credits*.tsx`
- `client/src/components/returns/*.tsx`

**Do NOT modify**: 
- Sales files (Wave 5A domain)
- Inventory files (Wave 5B domain)

---

## Task 1: AR/AP Dashboard (2 hours)

### Backend: Accounting Router

```typescript
// server/routers/accounting.ts

import { z } from 'zod';
import { router, protectedProcedure } from '../_core/trpc';
import { invoices, payments, clients, vendors, purchaseOrders } from '../db/schema';
import { eq, and, gt, lt, gte, lte, sql, desc, sum } from 'drizzle-orm';
import { logger } from '../lib/logger';

export const accountingRouter = router({
  getARSummary: protectedProcedure
    .query(async () => {
      // Total AR
      const totalAR = await db.select({
        total: sum(invoices.amountDue),
      })
        .from(invoices)
        .where(and(
          gt(invoices.amountDue, 0),
          eq(invoices.status, 'pending'),
        ));

      // Aging buckets
      const today = new Date();
      const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      const sixtyDaysAgo = new Date(today.getTime() - 60 * 24 * 60 * 60 * 1000);
      const ninetyDaysAgo = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000);

      const aging = await db.select({
        bucket: sql<string>`
          CASE 
            WHEN due_date >= ${today} THEN 'current'
            WHEN due_date >= ${thirtyDaysAgo} THEN '1-30'
            WHEN due_date >= ${sixtyDaysAgo} THEN '31-60'
            WHEN due_date >= ${ninetyDaysAgo} THEN '61-90'
            ELSE '90+'
          END
        `,
        amount: sum(invoices.amountDue),
        count: sql<number>`count(*)`,
      })
        .from(invoices)
        .where(gt(invoices.amountDue, 0))
        .groupBy(sql`
          CASE 
            WHEN due_date >= ${today} THEN 'current'
            WHEN due_date >= ${thirtyDaysAgo} THEN '1-30'
            WHEN due_date >= ${sixtyDaysAgo} THEN '31-60'
            WHEN due_date >= ${ninetyDaysAgo} THEN '61-90'
            ELSE '90+'
          END
        `);

      // Top debtors
      const topDebtors = await db.select({
        clientId: clients.id,
        clientName: clients.name,
        totalOwed: sum(invoices.amountDue),
        invoiceCount: sql<number>`count(*)`,
      })
        .from(invoices)
        .innerJoin(clients, eq(invoices.clientId, clients.id))
        .where(gt(invoices.amountDue, 0))
        .groupBy(clients.id, clients.name)
        .orderBy(desc(sum(invoices.amountDue)))
        .limit(10);

      return {
        totalAR: totalAR[0]?.total || 0,
        aging,
        topDebtors,
      };
    }),

  getAPSummary: protectedProcedure
    .query(async () => {
      // Total AP (unpaid purchase orders)
      const totalAP = await db.select({
        total: sum(purchaseOrders.total),
      })
        .from(purchaseOrders)
        .where(and(
          eq(purchaseOrders.status, 'received'),
          eq(purchaseOrders.isPaid, false),
        ));

      // By vendor
      const byVendor = await db.select({
        vendorId: vendors.id,
        vendorName: vendors.name,
        totalOwed: sum(purchaseOrders.total),
        poCount: sql<number>`count(*)`,
      })
        .from(purchaseOrders)
        .innerJoin(vendors, eq(purchaseOrders.vendorId, vendors.id))
        .where(and(
          eq(purchaseOrders.status, 'received'),
          eq(purchaseOrders.isPaid, false),
        ))
        .groupBy(vendors.id, vendors.name)
        .orderBy(desc(sum(purchaseOrders.total)));

      return {
        totalAP: totalAP[0]?.total || 0,
        byVendor,
      };
    }),

  getOverdueInvoices: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(50),
    }))
    .query(async ({ input }) => {
      return db.query.invoices.findMany({
        where: and(
          gt(invoices.amountDue, 0),
          lt(invoices.dueDate, new Date()),
        ),
        with: {
          client: true,
          order: true,
        },
        orderBy: invoices.dueDate,
        limit: input.limit,
      });
    }),

  getClientStatement: protectedProcedure
    .input(z.object({
      clientId: z.number(),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
    }))
    .query(async ({ input }) => {
      const conditions = [eq(invoices.clientId, input.clientId)];
      if (input.startDate) conditions.push(gte(invoices.createdAt, input.startDate));
      if (input.endDate) conditions.push(lte(invoices.createdAt, input.endDate));

      const clientInvoices = await db.query.invoices.findMany({
        where: and(...conditions),
        with: { order: true },
        orderBy: desc(invoices.createdAt),
      });

      const clientPayments = await db.query.payments.findMany({
        where: eq(payments.clientId, input.clientId),
        orderBy: desc(payments.createdAt),
      });

      const client = await db.query.clients.findFirst({
        where: eq(clients.id, input.clientId),
      });

      return {
        client,
        invoices: clientInvoices,
        payments: clientPayments,
        currentBalance: client?.balance || 0,
      };
    }),
});
```

---

## Task 2: Credit Management (2 hours)

### Backend: Credits Router

```typescript
// server/routers/credits.ts

import { z } from 'zod';
import { router, protectedProcedure } from '../_core/trpc';
import { credits, creditApplications, clients, invoices } from '../db/schema';
import { eq, and, desc, sum, sql } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { logger } from '../lib/logger';

export const creditsRouter = router({
  getClientCredits: protectedProcedure
    .input(z.object({ clientId: z.number() }))
    .query(async ({ input }) => {
      const clientCredits = await db.query.credits.findMany({
        where: and(
          eq(credits.clientId, input.clientId),
          eq(credits.status, 'active'),
        ),
        orderBy: desc(credits.createdAt),
      });

      const totalAvailable = clientCredits.reduce((sum, c) => sum + c.remainingAmount, 0);

      return {
        credits: clientCredits,
        totalAvailable,
      };
    }),

  issueCredit: protectedProcedure
    .input(z.object({
      clientId: z.number(),
      amount: z.number().positive(),
      reason: z.enum(['return', 'price_adjustment', 'goodwill', 'promotional', 'other']),
      description: z.string().optional(),
      expiresAt: z.date().optional(),
      relatedInvoiceId: z.number().optional(),
      relatedReturnId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      logger.info('[Credits] Issuing credit', { clientId: input.clientId, amount: input.amount });

      // Validate client exists
      const client = await db.query.clients.findFirst({
        where: eq(clients.id, input.clientId),
      });
      if (!client) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Client not found' });
      }

      // Generate credit number
      const creditNumber = await generateCreditNumber();

      const [credit] = await db.insert(credits).values({
        creditNumber,
        clientId: input.clientId,
        originalAmount: input.amount,
        remainingAmount: input.amount,
        reason: input.reason,
        description: input.description,
        status: 'active',
        expiresAt: input.expiresAt,
        relatedInvoiceId: input.relatedInvoiceId,
        relatedReturnId: input.relatedReturnId,
        issuedById: ctx.user.id,
        createdAt: new Date(),
      }).returning();

      logger.info('[Credits] Credit issued', { creditId: credit.id, creditNumber });

      return credit;
    }),

  applyCredit: protectedProcedure
    .input(z.object({
      creditId: z.number(),
      invoiceId: z.number(),
      amount: z.number().positive(),
    }))
    .mutation(async ({ ctx, input }) => {
      logger.info('[Credits] Applying credit', input);

      const credit = await db.query.credits.findFirst({
        where: eq(credits.id, input.creditId),
      });
      if (!credit) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Credit not found' });
      }
      if (credit.status !== 'active') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Credit is not active' });
      }
      if (input.amount > credit.remainingAmount) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Amount exceeds available credit' });
      }

      const invoice = await db.query.invoices.findFirst({
        where: eq(invoices.id, input.invoiceId),
      });
      if (!invoice) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Invoice not found' });
      }
      if (invoice.clientId !== credit.clientId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Credit and invoice must belong to same client' });
      }
      if (input.amount > invoice.amountDue) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Amount exceeds invoice balance' });
      }

      // Create application record
      const [application] = await db.insert(creditApplications).values({
        creditId: input.creditId,
        invoiceId: input.invoiceId,
        amount: input.amount,
        appliedById: ctx.user.id,
        createdAt: new Date(),
      }).returning();

      // Update credit remaining amount
      const newRemaining = credit.remainingAmount - input.amount;
      await db.update(credits)
        .set({
          remainingAmount: newRemaining,
          status: newRemaining <= 0 ? 'exhausted' : 'active',
          updatedAt: new Date(),
        })
        .where(eq(credits.id, input.creditId));

      // Update invoice
      const newAmountPaid = invoice.amountPaid + input.amount;
      const newAmountDue = invoice.total - newAmountPaid;
      await db.update(invoices)
        .set({
          amountPaid: newAmountPaid,
          amountDue: newAmountDue,
          status: newAmountDue <= 0 ? 'paid' : 'partial',
          updatedAt: new Date(),
        })
        .where(eq(invoices.id, input.invoiceId));

      logger.info('[Credits] Credit applied', { 
        creditId: input.creditId, 
        invoiceId: input.invoiceId, 
        amount: input.amount 
      });

      return application;
    }),

  voidCredit: protectedProcedure
    .input(z.object({
      creditId: z.number(),
      reason: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const credit = await db.query.credits.findFirst({
        where: eq(credits.id, input.creditId),
        with: { applications: true },
      });

      if (!credit) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Credit not found' });
      }

      if (credit.applications.length > 0) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cannot void credit that has been applied' });
      }

      const [updated] = await db.update(credits)
        .set({
          status: 'voided',
          voidedAt: new Date(),
          voidedById: ctx.user.id,
          voidReason: input.reason,
          updatedAt: new Date(),
        })
        .where(eq(credits.id, input.creditId))
        .returning();

      logger.info('[Credits] Credit voided', { creditId: input.creditId });

      return updated;
    }),
});

async function generateCreditNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await db.select({ count: sql<number>`count(*)` })
    .from(credits)
    .where(sql`EXTRACT(YEAR FROM created_at) = ${year}`);
  const num = (count[0]?.count || 0) + 1;
  return `CR-${year}-${String(num).padStart(5, '0')}`;
}
```

---

## Task 3: Returns Processing (2 hours)

### Backend: Returns Router

```typescript
// server/routers/returns.ts

import { z } from 'zod';
import { router, protectedProcedure } from '../_core/trpc';
import { returns, returnItems, orderItems, batches, credits } from '../db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { logger } from '../lib/logger';

const returnItemSchema = z.object({
  orderItemId: z.number(),
  quantity: z.number().min(1),
  reason: z.enum(['damaged', 'wrong_item', 'quality', 'overstock', 'other']),
  condition: z.enum(['sellable', 'damaged', 'destroyed']),
  notes: z.string().optional(),
});

export const returnsRouter = router({
  list: protectedProcedure
    .input(z.object({
      status: z.enum(['pending', 'approved', 'received', 'processed', 'rejected']).optional(),
      clientId: z.number().optional(),
      limit: z.number().min(1).max(100).default(50),
    }))
    .query(async ({ input }) => {
      const conditions = [];
      if (input.status) conditions.push(eq(returns.status, input.status));
      if (input.clientId) conditions.push(eq(returns.clientId, input.clientId));

      return db.query.returns.findMany({
        where: conditions.length > 0 ? and(...conditions) : undefined,
        with: {
          client: true,
          order: true,
          items: { with: { orderItem: { with: { batch: true } } } },
          processedBy: { columns: { id: true, name: true } },
        },
        orderBy: desc(returns.createdAt),
        limit: input.limit,
      });
    }),

  create: protectedProcedure
    .input(z.object({
      orderId: z.number(),
      items: z.array(returnItemSchema).min(1),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      logger.info('[Returns] Creating return', { orderId: input.orderId, itemCount: input.items.length });

      const order = await db.query.orders.findFirst({
        where: eq(orders.id, input.orderId),
        with: { items: true, client: true },
      });

      if (!order) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Order not found' });
      }

      // Validate return quantities
      for (const item of input.items) {
        const orderItem = order.items.find(oi => oi.id === item.orderItemId);
        if (!orderItem) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: `Order item ${item.orderItemId} not found` });
        }
        if (item.quantity > orderItem.quantity) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Return quantity exceeds order quantity' });
        }
      }

      // Calculate return total
      const returnTotal = input.items.reduce((sum, item) => {
        const orderItem = order.items.find(oi => oi.id === item.orderItemId)!;
        return sum + (item.quantity * orderItem.unitPrice);
      }, 0);

      // Generate return number
      const returnNumber = await generateReturnNumber();

      // Create return
      const [returnRecord] = await db.insert(returns).values({
        returnNumber,
        orderId: input.orderId,
        clientId: order.clientId,
        status: 'pending',
        subtotal: returnTotal,
        total: returnTotal,
        notes: input.notes,
        createdById: ctx.user.id,
        createdAt: new Date(),
      }).returning();

      // Create return items
      await db.insert(returnItems).values(
        input.items.map(item => ({
          returnId: returnRecord.id,
          orderItemId: item.orderItemId,
          quantity: item.quantity,
          reason: item.reason,
          condition: item.condition,
          notes: item.notes,
        }))
      );

      logger.info('[Returns] Return created', { returnId: returnRecord.id, returnNumber });

      return returnRecord;
    }),

  approve: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const [updated] = await db.update(returns)
        .set({
          status: 'approved',
          approvedAt: new Date(),
          approvedById: ctx.user.id,
          updatedAt: new Date(),
        })
        .where(eq(returns.id, input.id))
        .returning();

      logger.info('[Returns] Return approved', { returnId: input.id });

      return updated;
    }),

  receive: protectedProcedure
    .input(z.object({
      id: z.number(),
      items: z.array(z.object({
        returnItemId: z.number(),
        receivedQuantity: z.number(),
        actualCondition: z.enum(['sellable', 'damaged', 'destroyed']),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      logger.info('[Returns] Receiving return', { returnId: input.id });

      const returnRecord = await db.query.returns.findFirst({
        where: eq(returns.id, input.id),
        with: { items: { with: { orderItem: true } } },
      });

      if (!returnRecord) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Return not found' });
      }

      // Update return items and restore inventory
      for (const item of input.items) {
        const returnItem = returnRecord.items.find(ri => ri.id === item.returnItemId);
        if (!returnItem) continue;

        await db.update(returnItems)
          .set({
            receivedQuantity: item.receivedQuantity,
            actualCondition: item.actualCondition,
            receivedAt: new Date(),
          })
          .where(eq(returnItems.id, item.returnItemId));

        // Restore to inventory if sellable
        if (item.actualCondition === 'sellable' && item.receivedQuantity > 0) {
          await db.update(batches)
            .set({
              quantity: sql`quantity + ${item.receivedQuantity}`,
              updatedAt: new Date(),
            })
            .where(eq(batches.id, returnItem.orderItem.batchId));

          logger.info('[Returns] Inventory restored', { 
            batchId: returnItem.orderItem.batchId, 
            quantity: item.receivedQuantity 
          });
        }
      }

      const [updated] = await db.update(returns)
        .set({
          status: 'received',
          receivedAt: new Date(),
          receivedById: ctx.user.id,
          updatedAt: new Date(),
        })
        .where(eq(returns.id, input.id))
        .returning();

      return updated;
    }),

  process: protectedProcedure
    .input(z.object({
      id: z.number(),
      issueCredit: z.boolean().default(true),
      creditAmount: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      logger.info('[Returns] Processing return', { returnId: input.id });

      const returnRecord = await db.query.returns.findFirst({
        where: eq(returns.id, input.id),
      });

      if (!returnRecord) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Return not found' });
      }

      if (returnRecord.status !== 'received') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Return must be received first' });
      }

      let creditId: number | null = null;

      // Issue credit if requested
      if (input.issueCredit) {
        const creditAmount = input.creditAmount || returnRecord.total;
        const creditNumber = await generateCreditNumber();

        const [credit] = await db.insert(credits).values({
          creditNumber,
          clientId: returnRecord.clientId,
          originalAmount: creditAmount,
          remainingAmount: creditAmount,
          reason: 'return',
          description: `Credit for return ${returnRecord.returnNumber}`,
          status: 'active',
          relatedReturnId: returnRecord.id,
          issuedById: ctx.user.id,
          createdAt: new Date(),
        }).returning();

        creditId = credit.id;

        logger.info('[Returns] Credit issued for return', { returnId: input.id, creditId });
      }

      const [updated] = await db.update(returns)
        .set({
          status: 'processed',
          processedAt: new Date(),
          processedById: ctx.user.id,
          creditId,
          updatedAt: new Date(),
        })
        .where(eq(returns.id, input.id))
        .returning();

      logger.info('[Returns] Return processed', { returnId: input.id });

      return updated;
    }),
});

async function generateReturnNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await db.select({ count: sql<number>`count(*)` })
    .from(returns)
    .where(sql`EXTRACT(YEAR FROM created_at) = ${year}`);
  const num = (count[0]?.count || 0) + 1;
  return `RET-${year}-${String(num).padStart(5, '0')}`;
}
```

---

## Git Workflow

```bash
git checkout -b feat/wave-5c-accounting-workflow

# AR/AP Dashboard
git add server/routers/accounting.ts client/src/pages/Accounting*.tsx
git commit -m "feat(ACC-1): Implement AR/AP dashboard with aging analysis"

# Credit management
git add server/routers/credits.ts server/services/creditEngine.ts client/src/pages/Credits*.tsx
git commit -m "feat(ACC-2): Implement credit management system"

# Returns processing
git add server/routers/returns.ts client/src/components/returns/*.tsx
git commit -m "feat(ACC-3): Implement returns processing workflow"

git push origin feat/wave-5c-accounting-workflow
gh pr create --title "Wave 5C: Accounting Workflow Completion" --body "
## Summary
Complete AR/AP management, credit management, and returns processing.

## Changes
- AR/AP dashboard with aging analysis
- Credit issuance and application
- Returns processing with inventory restoration

## Testing
- [ ] AR/AP dashboard shows correct totals
- [ ] Can issue and apply credits
- [ ] Can process returns
- [ ] Inventory restores correctly for sellable returns
- [ ] Credits auto-generate from returns

## Parallel Safety
Only touches accounting-related files
"
```

---

## Success Criteria

- [ ] AR/AP dashboard works
- [ ] Aging analysis is accurate
- [ ] Credit issuance works
- [ ] Credit application to invoices works
- [ ] Returns creation works
- [ ] Returns receiving restores inventory
- [ ] Returns processing issues credits
- [ ] All workflows tested end-to-end

---

## Handoff

After Wave 5C completion:

1. PR ready for review
2. Document the complete workflow
3. Coordinate merge with Wave 5A/5B

**Merge Order**: 5C can merge independently

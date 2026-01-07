# Wave 5A: Sales Workflow Completion

**Agent Role**: Full Stack Developer  
**Duration**: 8-10 hours  
**Priority**: P1  
**Dependencies**: Wave 4 complete  
**Can Run Parallel With**: Wave 5B, 5C (different domains)

---

## Overview

Complete the end-to-end sales workflow: Quote → Order → Invoice → Payment. This is a critical business flow that must work reliably.

---

## File Domain

**Your files**: 
- `server/routers/quotes.ts`
- `server/routers/orders.ts` (order conversion, fulfillment)
- `server/routers/invoices.ts` (generation from orders)
- `server/routers/payments.ts`
- `client/src/pages/Quotes*.tsx`
- `client/src/components/orders/OrderFulfillment.tsx`

**Do NOT modify**: 
- Inventory files (Wave 5B domain)
- Accounting files (Wave 5C domain)

---

## Task 1: Quote Creation (2 hours)

### Backend: Quote Router

```typescript
// server/routers/quotes.ts

import { z } from 'zod';
import { router, protectedProcedure } from '../_core/trpc';
import { quotes, quoteItems, clients, batches } from '../db/schema';
import { eq, desc, and } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { logger } from '../lib/logger';

const quoteItemSchema = z.object({
  batchId: z.number(),
  quantity: z.number().min(1),
  unitPrice: z.number().min(0),
  notes: z.string().optional(),
});

const createQuoteSchema = z.object({
  clientId: z.number(),
  items: z.array(quoteItemSchema).min(1),
  notes: z.string().optional(),
  validUntil: z.date().optional(),
  terms: z.string().optional(),
});

export const quotesRouter = router({
  list: protectedProcedure
    .input(z.object({
      status: z.enum(['draft', 'sent', 'accepted', 'rejected', 'expired', 'converted']).optional(),
      clientId: z.number().optional(),
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ input }) => {
      const conditions = [];
      if (input.status) conditions.push(eq(quotes.status, input.status));
      if (input.clientId) conditions.push(eq(quotes.clientId, input.clientId));

      const results = await db.query.quotes.findMany({
        where: conditions.length > 0 ? and(...conditions) : undefined,
        with: {
          client: true,
          items: { with: { batch: { with: { product: true } } } },
          createdBy: { columns: { id: true, name: true } },
        },
        orderBy: desc(quotes.createdAt),
        limit: input.limit,
        offset: input.offset,
      });

      return results;
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const quote = await db.query.quotes.findFirst({
        where: eq(quotes.id, input.id),
        with: {
          client: true,
          items: { with: { batch: { with: { product: true } } } },
          createdBy: { columns: { id: true, name: true } },
        },
      });

      if (!quote) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Quote not found' });
      }

      return quote;
    }),

  create: protectedProcedure
    .input(createQuoteSchema)
    .mutation(async ({ ctx, input }) => {
      logger.info('[Quotes] Creating quote', { clientId: input.clientId, itemCount: input.items.length });

      // Validate client exists
      const client = await db.query.clients.findFirst({
        where: eq(clients.id, input.clientId),
      });
      if (!client) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Client not found' });
      }

      // Calculate totals
      let subtotal = 0;
      for (const item of input.items) {
        subtotal += item.quantity * item.unitPrice;
      }

      // Generate quote number
      const quoteNumber = await generateQuoteNumber();

      // Create quote
      const [quote] = await db.insert(quotes).values({
        quoteNumber,
        clientId: input.clientId,
        status: 'draft',
        subtotal,
        total: subtotal, // Add tax calculation if needed
        notes: input.notes,
        terms: input.terms,
        validUntil: input.validUntil || addDays(new Date(), 30),
        createdById: ctx.user.id,
        createdAt: new Date(),
      }).returning();

      // Create quote items
      await db.insert(quoteItems).values(
        input.items.map(item => ({
          quoteId: quote.id,
          batchId: item.batchId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.quantity * item.unitPrice,
          notes: item.notes,
        }))
      );

      logger.info('[Quotes] Quote created', { quoteId: quote.id, quoteNumber });

      return quote;
    }),

  send: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const [quote] = await db.update(quotes)
        .set({ 
          status: 'sent', 
          sentAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(quotes.id, input.id))
        .returning();

      logger.info('[Quotes] Quote sent', { quoteId: input.id });

      // TODO: Send email notification to client (future wave)

      return quote;
    }),

  convertToOrder: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      logger.info('[Quotes] Converting quote to order', { quoteId: input.id });

      const quote = await db.query.quotes.findFirst({
        where: eq(quotes.id, input.id),
        with: { items: true, client: true },
      });

      if (!quote) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Quote not found' });
      }

      if (quote.status === 'converted') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Quote already converted' });
      }

      // Verify inventory availability
      for (const item of quote.items) {
        const batch = await db.query.batches.findFirst({
          where: eq(batches.id, item.batchId),
        });
        const available = (batch?.quantity || 0) - (batch?.reservedQuantity || 0);
        if (item.quantity > available) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `Insufficient inventory for batch ${batch?.code}. Available: ${available}`,
          });
        }
      }

      // Create order from quote
      const orderNumber = await generateOrderNumber();
      const [order] = await db.insert(orders).values({
        orderNumber,
        clientId: quote.clientId,
        quoteId: quote.id,
        status: 'pending',
        subtotal: quote.subtotal,
        total: quote.total,
        notes: quote.notes,
        createdById: ctx.user.id,
        createdAt: new Date(),
      }).returning();

      // Create order items
      await db.insert(orderItems).values(
        quote.items.map(item => ({
          orderId: order.id,
          batchId: item.batchId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.total,
        }))
      );

      // Reserve inventory
      for (const item of quote.items) {
        await db.update(batches)
          .set({ reservedQuantity: sql`reserved_quantity + ${item.quantity}` })
          .where(eq(batches.id, item.batchId));
      }

      // Update quote status
      await db.update(quotes)
        .set({ 
          status: 'converted', 
          convertedToOrderId: order.id,
          updatedAt: new Date(),
        })
        .where(eq(quotes.id, input.id));

      logger.info('[Quotes] Quote converted to order', { quoteId: input.id, orderId: order.id });

      return order;
    }),
});

async function generateQuoteNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await db.select({ count: sql<number>`count(*)` })
    .from(quotes)
    .where(sql`EXTRACT(YEAR FROM created_at) = ${year}`);
  const num = (count[0]?.count || 0) + 1;
  return `Q-${year}-${String(num).padStart(5, '0')}`;
}
```

### Frontend: Quote Creation Page

```typescript
// client/src/pages/QuoteCreatePage.tsx

export function QuoteCreatePage() {
  const navigate = useNavigate();
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [items, setItems] = useState<QuoteItem[]>([]);

  const createQuote = trpc.quotes.create.useMutation({
    onSuccess: (quote) => {
      toast.success('Quote created successfully');
      navigate(`/quotes/${quote.id}`);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleAddItem = (batch: Batch, quantity: number, price: number) => {
    setItems(prev => [...prev, {
      batchId: batch.id,
      batch,
      quantity,
      unitPrice: price,
      total: quantity * price,
    }]);
  };

  const handleSubmit = () => {
    if (!selectedClient) {
      toast.error('Please select a client');
      return;
    }
    if (items.length === 0) {
      toast.error('Please add at least one item');
      return;
    }

    createQuote.mutate({
      clientId: selectedClient.id,
      items: items.map(i => ({
        batchId: i.batchId,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
      })),
    });
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Create Quote</h1>
      
      {/* Client Selection */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Customer</CardTitle>
        </CardHeader>
        <CardContent>
          <ClientSelector
            value={selectedClient}
            onChange={setSelectedClient}
          />
        </CardContent>
      </Card>

      {/* Item Selection */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Items</CardTitle>
        </CardHeader>
        <CardContent>
          <QuoteItemsTable
            items={items}
            onRemove={(index) => setItems(prev => prev.filter((_, i) => i !== index))}
            onUpdateQuantity={(index, qty) => {
              setItems(prev => prev.map((item, i) => 
                i === index ? { ...item, quantity: qty, total: qty * item.unitPrice } : item
              ));
            }}
          />
          <AddItemDialog onAdd={handleAddItem} clientId={selectedClient?.id} />
        </CardContent>
      </Card>

      {/* Summary */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex justify-between text-lg font-semibold">
            <span>Total</span>
            <span>{formatCurrency(items.reduce((sum, i) => sum + i.total, 0))}</span>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => navigate('/quotes')}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={createQuote.isPending}>
          {createQuote.isPending ? <ButtonLoading>Creating...</ButtonLoading> : 'Create Quote'}
        </Button>
      </div>
    </div>
  );
}
```

---

## Task 2: Order Fulfillment (2 hours)

### Backend: Order Fulfillment

```typescript
// server/routers/orders.ts - add fulfillment endpoints

  confirmOrder: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const order = await db.query.orders.findFirst({
        where: eq(orders.id, input.id),
        with: { items: true },
      });

      if (!order) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Order not found' });
      }

      if (order.status !== 'pending') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Order cannot be confirmed' });
      }

      // Verify inventory still available
      for (const item of order.items) {
        const batch = await db.query.batches.findFirst({
          where: eq(batches.id, item.batchId),
        });
        const available = (batch?.quantity || 0) - (batch?.reservedQuantity || 0) + item.quantity; // Include already reserved
        if (item.quantity > available) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `Insufficient inventory for batch ${batch?.code}`,
          });
        }
      }

      const [updated] = await db.update(orders)
        .set({ 
          status: 'confirmed',
          confirmedAt: new Date(),
          confirmedById: ctx.user.id,
          updatedAt: new Date(),
        })
        .where(eq(orders.id, input.id))
        .returning();

      logger.info('[Orders] Order confirmed', { orderId: input.id });

      return updated;
    }),

  fulfillOrder: protectedProcedure
    .input(z.object({
      id: z.number(),
      items: z.array(z.object({
        orderItemId: z.number(),
        pickedQuantity: z.number(),
        locationId: z.number().optional(),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      const order = await db.query.orders.findFirst({
        where: eq(orders.id, input.id),
        with: { items: true },
      });

      if (!order) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Order not found' });
      }

      if (!['confirmed', 'processing'].includes(order.status)) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Order cannot be fulfilled' });
      }

      // Update order items with picked quantities
      for (const item of input.items) {
        await db.update(orderItems)
          .set({ 
            pickedQuantity: item.pickedQuantity,
            pickedAt: new Date(),
            pickedById: ctx.user.id,
          })
          .where(eq(orderItems.id, item.orderItemId));
      }

      // Deduct from inventory
      for (const orderItem of order.items) {
        const picked = input.items.find(i => i.orderItemId === orderItem.id);
        if (picked) {
          await db.update(batches)
            .set({
              quantity: sql`quantity - ${picked.pickedQuantity}`,
              reservedQuantity: sql`reserved_quantity - ${orderItem.quantity}`,
            })
            .where(eq(batches.id, orderItem.batchId));
        }
      }

      // Check if fully fulfilled
      const allPicked = input.items.every(i => {
        const orderItem = order.items.find(oi => oi.id === i.orderItemId);
        return orderItem && i.pickedQuantity >= orderItem.quantity;
      });

      const [updated] = await db.update(orders)
        .set({
          status: allPicked ? 'ready' : 'processing',
          updatedAt: new Date(),
        })
        .where(eq(orders.id, input.id))
        .returning();

      logger.info('[Orders] Order fulfilled', { orderId: input.id, status: updated.status });

      return updated;
    }),

  shipOrder: protectedProcedure
    .input(z.object({
      id: z.number(),
      trackingNumber: z.string().optional(),
      carrier: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const [updated] = await db.update(orders)
        .set({
          status: 'shipped',
          shippedAt: new Date(),
          shippedById: ctx.user.id,
          trackingNumber: input.trackingNumber,
          carrier: input.carrier,
          shippingNotes: input.notes,
          updatedAt: new Date(),
        })
        .where(eq(orders.id, input.id))
        .returning();

      logger.info('[Orders] Order shipped', { orderId: input.id });

      return updated;
    }),

  deliverOrder: protectedProcedure
    .input(z.object({
      id: z.number(),
      signature: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const [updated] = await db.update(orders)
        .set({
          status: 'delivered',
          deliveredAt: new Date(),
          deliverySignature: input.signature,
          deliveryNotes: input.notes,
          updatedAt: new Date(),
        })
        .where(eq(orders.id, input.id))
        .returning();

      logger.info('[Orders] Order delivered', { orderId: input.id });

      return updated;
    }),
```

---

## Task 3: Invoice Generation (2 hours)

### Backend: Invoice from Order

```typescript
// server/routers/invoices.ts - add generation endpoint

  generateFromOrder: protectedProcedure
    .input(z.object({ orderId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      logger.info('[Invoices] Generating invoice from order', { orderId: input.orderId });

      const order = await db.query.orders.findFirst({
        where: eq(orders.id, input.orderId),
        with: { items: true, client: true },
      });

      if (!order) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Order not found' });
      }

      if (!['delivered', 'shipped', 'ready'].includes(order.status)) {
        throw new TRPCError({ 
          code: 'BAD_REQUEST', 
          message: 'Order must be shipped or delivered to generate invoice' 
        });
      }

      // Check if invoice already exists
      const existing = await db.query.invoices.findFirst({
        where: eq(invoices.orderId, input.orderId),
      });
      if (existing) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invoice already exists for this order' });
      }

      // Generate invoice number
      const invoiceNumber = await generateInvoiceNumber();

      // Calculate due date based on client terms
      const dueDate = addDays(new Date(), order.client.paymentTerms || 30);

      // Create invoice
      const [invoice] = await db.insert(invoices).values({
        invoiceNumber,
        orderId: order.id,
        clientId: order.clientId,
        status: 'pending',
        subtotal: order.subtotal,
        tax: order.tax || 0,
        total: order.total,
        amountPaid: 0,
        amountDue: order.total,
        dueDate,
        createdById: ctx.user.id,
        createdAt: new Date(),
      }).returning();

      // Create invoice items
      await db.insert(invoiceItems).values(
        order.items.map(item => ({
          invoiceId: invoice.id,
          description: item.description || `${item.batch?.product?.name} - ${item.batch?.code}`,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.total,
        }))
      );

      // Update order with invoice reference
      await db.update(orders)
        .set({ invoiceId: invoice.id, updatedAt: new Date() })
        .where(eq(orders.id, input.orderId));

      logger.info('[Invoices] Invoice generated', { invoiceId: invoice.id, orderId: input.orderId });

      return invoice;
    }),
```

---

## Task 4: Payment Recording (2 hours)

### Backend: Payment Router

```typescript
// server/routers/payments.ts

export const paymentsRouter = router({
  recordPayment: protectedProcedure
    .input(z.object({
      invoiceId: z.number(),
      amount: z.number().positive(),
      method: z.enum(['cash', 'check', 'wire', 'ach', 'credit_card', 'other']),
      reference: z.string().optional(),
      notes: z.string().optional(),
      receivedDate: z.date().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      logger.info('[Payments] Recording payment', { invoiceId: input.invoiceId, amount: input.amount });

      const invoice = await db.query.invoices.findFirst({
        where: eq(invoices.id, input.invoiceId),
      });

      if (!invoice) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Invoice not found' });
      }

      if (invoice.status === 'paid') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invoice already paid in full' });
      }

      if (input.amount > invoice.amountDue) {
        throw new TRPCError({ 
          code: 'BAD_REQUEST', 
          message: `Payment amount exceeds amount due (${formatCurrency(invoice.amountDue)})` 
        });
      }

      // Create payment record
      const [payment] = await db.insert(payments).values({
        invoiceId: input.invoiceId,
        clientId: invoice.clientId,
        amount: input.amount,
        method: input.method,
        reference: input.reference,
        notes: input.notes,
        receivedDate: input.receivedDate || new Date(),
        recordedById: ctx.user.id,
        createdAt: new Date(),
      }).returning();

      // Update invoice
      const newAmountPaid = invoice.amountPaid + input.amount;
      const newAmountDue = invoice.total - newAmountPaid;
      const newStatus = newAmountDue <= 0 ? 'paid' : 'partial';

      await db.update(invoices)
        .set({
          amountPaid: newAmountPaid,
          amountDue: newAmountDue,
          status: newStatus,
          paidAt: newStatus === 'paid' ? new Date() : null,
          updatedAt: new Date(),
        })
        .where(eq(invoices.id, input.invoiceId));

      // Update client balance
      await db.update(clients)
        .set({
          balance: sql`balance - ${input.amount}`,
          updatedAt: new Date(),
        })
        .where(eq(clients.id, invoice.clientId));

      logger.info('[Payments] Payment recorded', { 
        paymentId: payment.id, 
        invoiceId: input.invoiceId,
        newStatus,
      });

      return payment;
    }),

  list: protectedProcedure
    .input(z.object({
      invoiceId: z.number().optional(),
      clientId: z.number().optional(),
      limit: z.number().min(1).max(100).default(50),
    }))
    .query(async ({ input }) => {
      const conditions = [];
      if (input.invoiceId) conditions.push(eq(payments.invoiceId, input.invoiceId));
      if (input.clientId) conditions.push(eq(payments.clientId, input.clientId));

      return db.query.payments.findMany({
        where: conditions.length > 0 ? and(...conditions) : undefined,
        with: {
          invoice: true,
          client: true,
          recordedBy: { columns: { id: true, name: true } },
        },
        orderBy: desc(payments.createdAt),
        limit: input.limit,
      });
    }),
});
```

---

## Git Workflow

```bash
git checkout -b feat/wave-5a-sales-workflow

# Quote creation
git add server/routers/quotes.ts client/src/pages/Quote*.tsx
git commit -m "feat(SALES-1): Implement quote creation and management"

# Quote to order conversion
git add server/routers/quotes.ts
git commit -m "feat(SALES-2): Add quote to order conversion"

# Order fulfillment
git add server/routers/orders.ts client/src/components/orders/OrderFulfillment.tsx
git commit -m "feat(SALES-3): Implement order fulfillment workflow"

# Invoice generation
git add server/routers/invoices.ts
git commit -m "feat(SALES-4): Add invoice generation from orders"

# Payment recording
git add server/routers/payments.ts client/src/components/payments/*.tsx
git commit -m "feat(SALES-5): Implement payment recording and application"

git push origin feat/wave-5a-sales-workflow
gh pr create --title "Wave 5A: Sales Workflow Completion" --body "
## Summary
Complete end-to-end sales workflow: Quote → Order → Invoice → Payment

## Changes
- Quote creation and management
- Quote to order conversion with inventory reservation
- Order confirmation and fulfillment
- Invoice generation from orders
- Payment recording and application

## Testing
- [ ] Can create quote with items
- [ ] Can convert quote to order
- [ ] Can confirm and fulfill order
- [ ] Can generate invoice from order
- [ ] Can record payment against invoice
- [ ] Inventory updates correctly throughout

## Parallel Safety
Only touches sales-related files (quotes, orders, invoices, payments)
"
```

---

## Success Criteria

- [ ] Quote creation works
- [ ] Quote to order conversion works
- [ ] Order confirmation reserves inventory
- [ ] Order fulfillment deducts inventory
- [ ] Invoice generation from order works
- [ ] Payment recording updates invoice status
- [ ] Client balance updates correctly
- [ ] Full workflow tested end-to-end

---

## Handoff

After Wave 5A completion:

1. PR ready for review
2. Document the complete workflow
3. Coordinate merge with Wave 5B/5C

**Merge Order**: 5A can merge independently (no conflicts with 5B/5C)

# Wave 5A: Sales Workflow Completion

**Agent Role**: Full Stack Developer  
**Duration**: 8-10 hours  
**Priority**: P1  
**Timeline**: Week 2-3  
**Can Run Parallel With**: Wave 5B, 5C

---

## Overview

Complete the end-to-end sales workflow from quote creation through payment recording. This is a critical business workflow that must work flawlessly for user training.

---

## Workflow Diagram

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Create    │───▶│   Create    │───▶│   Convert   │
│   Client    │    │    Quote    │    │  to Order   │
└─────────────┘    └─────────────┘    └─────────────┘
                                            │
                                            ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Record    │◀───│   Generate  │◀───│   Fulfill   │
│   Payment   │    │   Invoice   │    │    Order    │
└─────────────┘    └─────────────┘    └─────────────┘
```

---

## Task 1: Quote Creation Flow (2 hours)

### Verify Current State

```bash
# Check if quote routes exist
grep -rn "quote" server/routers/ --include="*.ts"
grep -rn "Quote" client/src/pages/ --include="*.tsx"
```

### Required Functionality

```typescript
// server/routers/quotes.ts

export const quotesRouter = router({
  // Create new quote
  create: protectedProcedure
    .input(createQuoteSchema)
    .mutation(async ({ ctx, input }) => {
      // Validate client exists
      const client = await getClient(input.clientId);
      if (!client) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Client not found',
        });
      }

      // Create quote with line items
      const quote = await db.transaction(async (tx) => {
        const [quote] = await tx.insert(quotes).values({
          clientId: input.clientId,
          status: 'draft',
          validUntil: input.validUntil,
          notes: input.notes,
          createdBy: ctx.user.id,
        }).returning();

        // Insert line items
        if (input.items?.length > 0) {
          await tx.insert(quoteItems).values(
            input.items.map(item => ({
              quoteId: quote.id,
              productId: item.productId,
              batchId: item.batchId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
            }))
          );
        }

        return quote;
      });

      // Log audit
      await logAudit({
        action: 'CREATE',
        entityType: 'quote',
        entityId: quote.id,
        userId: ctx.user.id,
        details: { clientId: input.clientId },
      });

      return quote;
    }),

  // List quotes with filters
  list: protectedProcedure
    .input(listQuotesSchema)
    .query(async ({ input }) => {
      return db.query.quotes.findMany({
        where: buildQuoteFilters(input),
        with: {
          client: true,
          items: { with: { product: true } },
          createdByUser: true,
        },
        orderBy: desc(quotes.createdAt),
        limit: input.limit ?? 50,
        offset: input.offset ?? 0,
      });
    }),

  // Get single quote with all details
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const quote = await db.query.quotes.findFirst({
        where: eq(quotes.id, input.id),
        with: {
          client: true,
          items: { 
            with: { 
              product: true,
              batch: true,
            } 
          },
          createdByUser: true,
        },
      });

      if (!quote) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Quote not found',
        });
      }

      return quote;
    }),

  // Send quote to client
  send: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const quote = await getQuote(input.id);
      
      // Update status
      await db.update(quotes)
        .set({ status: 'sent', sentAt: new Date() })
        .where(eq(quotes.id, input.id));

      // Send email notification (if email service configured)
      if (quote.client.email) {
        await sendQuoteEmail(quote);
      }

      return { success: true };
    }),
});
```

### Frontend: Quote Creator Page

```typescript
// client/src/pages/QuoteCreatorPage.tsx

export function QuoteCreatorPage() {
  const [clientId, setClientId] = useState<number | null>(null);
  const [items, setItems] = useState<QuoteItem[]>([]);
  const [validUntil, setValidUntil] = useState<Date>(addDays(new Date(), 30));

  const createQuote = trpc.quotes.create.useMutation({
    onSuccess: (quote) => {
      toast.success('Quote created successfully');
      navigate(`/quotes/${quote.id}`);
    },
    onError: (error) => {
      toast.error(`Failed to create quote: ${error.message}`);
    },
  });

  const handleSubmit = () => {
    if (!clientId) {
      toast.error('Please select a client');
      return;
    }
    if (items.length === 0) {
      toast.error('Please add at least one item');
      return;
    }

    createQuote.mutate({
      clientId,
      items,
      validUntil,
    });
  };

  return (
    <div className="space-y-6">
      <h1>Create Quote</h1>
      
      <ClientSelector value={clientId} onChange={setClientId} />
      
      <QuoteItemsTable items={items} onItemsChange={setItems} />
      
      <QuoteSummary items={items} />
      
      <div className="flex gap-2">
        <Button onClick={handleSubmit} disabled={createQuote.isLoading}>
          Create Quote
        </Button>
        <Button variant="outline" onClick={() => navigate('/quotes')}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
```

---

## Task 2: Quote to Order Conversion (2 hours)

### Backend: Convert Endpoint

```typescript
// server/routers/quotes.ts

convertToOrder: protectedProcedure
  .input(z.object({ 
    quoteId: z.number(),
    adjustments: z.array(z.object({
      itemId: z.number(),
      quantity: z.number().optional(),
      unitPrice: z.number().optional(),
    })).optional(),
  }))
  .mutation(async ({ ctx, input }) => {
    const quote = await getQuoteWithItems(input.quoteId);
    
    if (!quote) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Quote not found' });
    }
    
    if (quote.status === 'converted') {
      throw new TRPCError({ 
        code: 'BAD_REQUEST', 
        message: 'Quote has already been converted to an order' 
      });
    }

    // Create order from quote
    const order = await db.transaction(async (tx) => {
      // Create order
      const [order] = await tx.insert(orders).values({
        clientId: quote.clientId,
        quoteId: quote.id,
        status: 'pending',
        createdBy: ctx.user.id,
      }).returning();

      // Copy items with any adjustments
      const orderItems = quote.items.map(item => {
        const adjustment = input.adjustments?.find(a => a.itemId === item.id);
        return {
          orderId: order.id,
          productId: item.productId,
          batchId: item.batchId,
          quantity: adjustment?.quantity ?? item.quantity,
          unitPrice: adjustment?.unitPrice ?? item.unitPrice,
        };
      });

      await tx.insert(orderItems).values(orderItems);

      // Update quote status
      await tx.update(quotes)
        .set({ status: 'converted', convertedAt: new Date() })
        .where(eq(quotes.id, quote.id));

      return order;
    });

    // Reserve inventory
    await reserveInventoryForOrder(order.id);

    // Log audit
    await logAudit({
      action: 'CONVERT',
      entityType: 'quote',
      entityId: quote.id,
      userId: ctx.user.id,
      details: { orderId: order.id },
    });

    return order;
  }),
```

### Frontend: Convert Button

```typescript
// client/src/components/quotes/QuoteActions.tsx

export function ConvertToOrderButton({ quoteId }: { quoteId: number }) {
  const [showConfirm, setShowConfirm] = useState(false);
  
  const convert = trpc.quotes.convertToOrder.useMutation({
    onSuccess: (order) => {
      toast.success('Quote converted to order');
      navigate(`/orders/${order.id}`);
    },
    onError: (error) => {
      toast.error(`Conversion failed: ${error.message}`);
    },
  });

  return (
    <>
      <Button onClick={() => setShowConfirm(true)}>
        Convert to Order
      </Button>
      
      <ConfirmDialog
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={() => convert.mutate({ quoteId })}
        title="Convert Quote to Order"
        description="This will create a new order and reserve inventory. Continue?"
      />
    </>
  );
}
```

---

## Task 3: Order Fulfillment (Pick & Pack) (2 hours)

### Backend: Fulfillment Endpoints

```typescript
// server/routers/orders.ts

// Start fulfillment
startFulfillment: protectedProcedure
  .input(z.object({ orderId: z.number() }))
  .mutation(async ({ ctx, input }) => {
    const order = await getOrder(input.orderId);
    
    if (order.status !== 'pending') {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `Cannot start fulfillment for order in ${order.status} status`,
      });
    }

    await db.update(orders)
      .set({ 
        status: 'picking',
        fulfillmentStartedAt: new Date(),
        fulfillmentStartedBy: ctx.user.id,
      })
      .where(eq(orders.id, input.orderId));

    return { success: true };
  }),

// Mark item as picked
pickItem: protectedProcedure
  .input(z.object({
    orderId: z.number(),
    itemId: z.number(),
    pickedQuantity: z.number(),
    locationId: z.number().optional(),
  }))
  .mutation(async ({ ctx, input }) => {
    await db.update(orderItems)
      .set({
        pickedQuantity: input.pickedQuantity,
        pickedAt: new Date(),
        pickedBy: ctx.user.id,
        pickedFromLocationId: input.locationId,
      })
      .where(eq(orderItems.id, input.itemId));

    // Check if all items picked
    const allPicked = await checkAllItemsPicked(input.orderId);
    if (allPicked) {
      await db.update(orders)
        .set({ status: 'packing' })
        .where(eq(orders.id, input.orderId));
    }

    return { success: true, allPicked };
  }),

// Complete fulfillment
completeFulfillment: protectedProcedure
  .input(z.object({
    orderId: z.number(),
    trackingNumber: z.string().optional(),
    shippingMethod: z.string().optional(),
  }))
  .mutation(async ({ ctx, input }) => {
    const order = await getOrder(input.orderId);
    
    // Verify all items picked
    const allPicked = await checkAllItemsPicked(input.orderId);
    if (!allPicked) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Not all items have been picked',
      });
    }

    await db.transaction(async (tx) => {
      // Update order status
      await tx.update(orders)
        .set({
          status: 'fulfilled',
          fulfilledAt: new Date(),
          fulfilledBy: ctx.user.id,
          trackingNumber: input.trackingNumber,
          shippingMethod: input.shippingMethod,
        })
        .where(eq(orders.id, input.orderId));

      // Deduct inventory
      await deductInventoryForOrder(tx, input.orderId);
    });

    return { success: true };
  }),
```

### Frontend: Pick & Pack Interface

```typescript
// client/src/pages/PickPackPage.tsx

export function PickPackPage() {
  const { orderId } = useParams();
  const { data: order, isLoading } = trpc.orders.getById.useQuery({ id: Number(orderId) });
  
  const pickItem = trpc.orders.pickItem.useMutation({
    onSuccess: () => {
      toast.success('Item picked');
      refetch();
    },
  });

  if (isLoading) return <LoadingState />;
  if (!order) return <NotFound />;

  return (
    <div className="space-y-6">
      <OrderHeader order={order} />
      
      <Card>
        <CardHeader>
          <CardTitle>Pick List</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Qty Ordered</TableHead>
                <TableHead>Qty Picked</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {order.items.map(item => (
                <PickListRow 
                  key={item.id}
                  item={item}
                  onPick={(qty) => pickItem.mutate({
                    orderId: order.id,
                    itemId: item.id,
                    pickedQuantity: qty,
                  })}
                />
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <FulfillmentActions order={order} />
    </div>
  );
}
```

---

## Task 4: Invoice Generation (2 hours)

### Backend: Generate Invoice from Order

```typescript
// server/routers/invoices.ts

generateFromOrder: protectedProcedure
  .input(z.object({ orderId: z.number() }))
  .mutation(async ({ ctx, input }) => {
    const order = await getOrderWithItems(input.orderId);
    
    if (!order) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Order not found' });
    }
    
    if (order.invoiceId) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Invoice already exists for this order',
      });
    }

    const invoice = await db.transaction(async (tx) => {
      // Calculate totals
      const subtotal = order.items.reduce(
        (sum, item) => sum + (item.quantity * item.unitPrice),
        0
      );
      const tax = calculateTax(subtotal, order.client.taxRate);
      const total = subtotal + tax;

      // Create invoice
      const [invoice] = await tx.insert(invoices).values({
        clientId: order.clientId,
        orderId: order.id,
        invoiceNumber: await generateInvoiceNumber(tx),
        status: 'pending',
        subtotal,
        tax,
        total,
        dueDate: addDays(new Date(), order.client.paymentTerms ?? 30),
        createdBy: ctx.user.id,
      }).returning();

      // Copy line items
      await tx.insert(invoiceItems).values(
        order.items.map(item => ({
          invoiceId: invoice.id,
          description: item.product.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.quantity * item.unitPrice,
        }))
      );

      // Link order to invoice
      await tx.update(orders)
        .set({ invoiceId: invoice.id })
        .where(eq(orders.id, order.id));

      return invoice;
    });

    // Send invoice email if configured
    if (order.client.email) {
      await sendInvoiceEmail(invoice, order.client);
    }

    return invoice;
  }),
```

---

## Task 5: Payment Recording (2 hours)

### Backend: Record Payment

```typescript
// server/routers/payments.ts

recordPayment: protectedProcedure
  .input(recordPaymentSchema)
  .mutation(async ({ ctx, input }) => {
    const invoice = await getInvoice(input.invoiceId);
    
    if (!invoice) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Invoice not found' });
    }

    const payment = await db.transaction(async (tx) => {
      // Create payment record
      const [payment] = await tx.insert(payments).values({
        invoiceId: input.invoiceId,
        clientId: invoice.clientId,
        amount: input.amount,
        method: input.method,
        reference: input.reference,
        notes: input.notes,
        receivedAt: input.receivedAt ?? new Date(),
        recordedBy: ctx.user.id,
      }).returning();

      // Update invoice paid amount
      const totalPaid = await calculateTotalPaid(tx, input.invoiceId);
      const newStatus = totalPaid >= invoice.total ? 'paid' : 'partial';
      
      await tx.update(invoices)
        .set({ 
          paidAmount: totalPaid,
          status: newStatus,
          paidAt: newStatus === 'paid' ? new Date() : null,
        })
        .where(eq(invoices.id, input.invoiceId));

      // Update client AR balance
      await updateClientARBalance(tx, invoice.clientId);

      return payment;
    });

    // Send receipt email
    if (invoice.client.email && input.sendReceipt) {
      await sendPaymentReceiptEmail(payment, invoice);
    }

    return payment;
  }),
```

### Frontend: Payment Modal

```typescript
// client/src/components/invoices/RecordPaymentModal.tsx

export function RecordPaymentModal({ 
  invoice, 
  open, 
  onClose 
}: RecordPaymentModalProps) {
  const form = useForm<PaymentFormData>({
    defaultValues: {
      amount: invoice.total - invoice.paidAmount,
      method: 'check',
      sendReceipt: true,
    },
  });

  const recordPayment = trpc.payments.recordPayment.useMutation({
    onSuccess: () => {
      toast.success('Payment recorded');
      onClose();
    },
    onError: (error) => {
      toast.error(`Failed to record payment: ${error.message}`);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
          <DialogDescription>
            Invoice #{invoice.invoiceNumber} - Balance: ${(invoice.total - invoice.paidAmount).toFixed(2)}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(data => 
            recordPayment.mutate({ invoiceId: invoice.id, ...data })
          )}>
            <FormField
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              name="method"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Method</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="check">Check</SelectItem>
                      <SelectItem value="wire">Wire Transfer</SelectItem>
                      <SelectItem value="ach">ACH</SelectItem>
                      <SelectItem value="credit_card">Credit Card</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

            <FormField
              name="reference"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reference # (optional)</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Check number, transaction ID, etc." />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              name="sendReceipt"
              render={({ field }) => (
                <FormItem className="flex items-center gap-2">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormLabel>Send receipt to client</FormLabel>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={recordPayment.isLoading}>
                Record Payment
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
```

---

## QA Task: QA-058 Quote Creation Fixes

Review and fix any issues with the quote creation flow identified in QA testing.

---

## Testing Requirements

### End-to-End Test

```typescript
// tests/e2e/salesWorkflow.spec.ts

test.describe('Sales Workflow', () => {
  test('complete sales cycle', async ({ page }) => {
    // 1. Create client
    await page.goto('/clients/new');
    await page.fill('[name="name"]', 'Test Client');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/clients\/\d+/);

    // 2. Create quote
    await page.goto('/quotes/new');
    await page.click('[data-testid="client-selector"]');
    await page.click('text=Test Client');
    await page.click('[data-testid="add-item"]');
    // ... add items
    await page.click('text=Create Quote');
    await expect(page).toHaveURL(/\/quotes\/\d+/);

    // 3. Convert to order
    await page.click('text=Convert to Order');
    await page.click('text=Confirm');
    await expect(page).toHaveURL(/\/orders\/\d+/);

    // 4. Fulfill order
    await page.click('text=Start Fulfillment');
    // ... pick items
    await page.click('text=Complete Fulfillment');

    // 5. Generate invoice
    await page.click('text=Generate Invoice');
    await expect(page).toHaveURL(/\/invoices\/\d+/);

    // 6. Record payment
    await page.click('text=Record Payment');
    await page.fill('[name="amount"]', '100.00');
    await page.click('text=Record Payment');
    await expect(page.locator('text=Payment recorded')).toBeVisible();
  });
});
```

---

## Git Workflow

```bash
git checkout -b feat/wave-5a-sales-workflow

# Quote creation
git add server/routers/quotes.ts client/src/pages/QuoteCreatorPage.tsx
git commit -m "feat(SALES-1): Implement quote creation flow"

# Quote to order
git add server/routers/quotes.ts client/src/components/quotes/
git commit -m "feat(SALES-2): Implement quote to order conversion"

# Fulfillment
git add server/routers/orders.ts client/src/pages/PickPackPage.tsx
git commit -m "feat(SALES-3): Implement order fulfillment (pick & pack)"

# Invoice generation
git add server/routers/invoices.ts
git commit -m "feat(SALES-4): Implement invoice generation from order"

# Payment recording
git add server/routers/payments.ts client/src/components/invoices/
git commit -m "feat(SALES-5): Implement payment recording"

# Tests
git add tests/e2e/salesWorkflow.spec.ts
git commit -m "test: Add sales workflow E2E tests"

git push origin feat/wave-5a-sales-workflow
gh pr create --title "feat(Wave-5A): Complete sales workflow" --body "..."
```

---

## Success Criteria

- [ ] Can create client
- [ ] Can create quote for client
- [ ] Can convert quote to order
- [ ] Can fulfill order (pick & pack)
- [ ] Can generate invoice from order
- [ ] Can record payment against invoice
- [ ] E2E test passes
- [ ] All unit tests pass

---

## Handoff

After Wave 5A completion:

1. Demo workflow to team
2. Document any edge cases found
3. Update user training materials
4. Coordinate with Wave 5B/5C for integration points

**Next**: Wave 6A (VIP Portal) depends on this workflow being complete

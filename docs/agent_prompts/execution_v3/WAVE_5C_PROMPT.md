# Wave 5C: Accounting Workflow Completion

**Agent Role**: Full Stack Developer  
**Duration**: 6-8 hours  
**Priority**: P1  
**Timeline**: Week 2-3  
**Can Run Parallel With**: Wave 5A, 5B

---

## Overview

Complete the accounting workflows including AR/AP management, credit tracking, and financial reporting.

---

## Task 1: AR/AP Dashboard Completion (2 hours)

### QA-059: Missing Accounting Pages

Verify and complete all accounting pages:

```bash
# Check existing accounting routes
grep -rn "accounting\|ar\|ap" client/src/App.tsx
grep -rn "accounting" server/routers/ --include="*.ts"
```

### Backend: Accounting Summary

```typescript
// server/routers/accounting.ts

getSummary: protectedProcedure
  .query(async ({ ctx }) => {
    const [arSummary, apSummary, recentTransactions] = await Promise.all([
      // Accounts Receivable
      db.select({
        totalOutstanding: sql<number>`COALESCE(SUM(${invoices.total} - ${invoices.paidAmount}), 0)`,
        overdueAmount: sql<number>`COALESCE(SUM(CASE WHEN ${invoices.dueDate} < NOW() THEN ${invoices.total} - ${invoices.paidAmount} ELSE 0 END), 0)`,
        invoiceCount: sql<number>`COUNT(*)`,
        overdueCount: sql<number>`SUM(CASE WHEN ${invoices.dueDate} < NOW() THEN 1 ELSE 0 END)`,
      })
      .from(invoices)
      .where(eq(invoices.status, 'pending')),

      // Accounts Payable
      db.select({
        totalOutstanding: sql<number>`COALESCE(SUM(${vendorInvoices.total} - ${vendorInvoices.paidAmount}), 0)`,
        overdueAmount: sql<number>`COALESCE(SUM(CASE WHEN ${vendorInvoices.dueDate} < NOW() THEN ${vendorInvoices.total} - ${vendorInvoices.paidAmount} ELSE 0 END), 0)`,
        invoiceCount: sql<number>`COUNT(*)`,
      })
      .from(vendorInvoices)
      .where(eq(vendorInvoices.status, 'pending')),

      // Recent transactions
      db.query.transactions.findMany({
        orderBy: desc(transactions.createdAt),
        limit: 10,
        with: {
          client: true,
          invoice: true,
        },
      }),
    ]);

    return {
      ar: arSummary[0],
      ap: apSummary[0],
      recentTransactions,
    };
  }),

getAgingReport: protectedProcedure
  .input(z.object({
    type: z.enum(['ar', 'ap']),
  }))
  .query(async ({ input }) => {
    const table = input.type === 'ar' ? invoices : vendorInvoices;
    const entityTable = input.type === 'ar' ? clients : vendors;
    const entityIdField = input.type === 'ar' ? invoices.clientId : vendorInvoices.vendorId;

    const aging = await db.select({
      entityId: entityIdField,
      entityName: entityTable.name,
      current: sql<number>`SUM(CASE WHEN ${table.dueDate} >= NOW() THEN ${table.total} - ${table.paidAmount} ELSE 0 END)`,
      days1to30: sql<number>`SUM(CASE WHEN ${table.dueDate} < NOW() AND ${table.dueDate} >= NOW() - INTERVAL '30 days' THEN ${table.total} - ${table.paidAmount} ELSE 0 END)`,
      days31to60: sql<number>`SUM(CASE WHEN ${table.dueDate} < NOW() - INTERVAL '30 days' AND ${table.dueDate} >= NOW() - INTERVAL '60 days' THEN ${table.total} - ${table.paidAmount} ELSE 0 END)`,
      days61to90: sql<number>`SUM(CASE WHEN ${table.dueDate} < NOW() - INTERVAL '60 days' AND ${table.dueDate} >= NOW() - INTERVAL '90 days' THEN ${table.total} - ${table.paidAmount} ELSE 0 END)`,
      over90: sql<number>`SUM(CASE WHEN ${table.dueDate} < NOW() - INTERVAL '90 days' THEN ${table.total} - ${table.paidAmount} ELSE 0 END)`,
      total: sql<number>`SUM(${table.total} - ${table.paidAmount})`,
    })
    .from(table)
    .leftJoin(entityTable, eq(entityIdField, entityTable.id))
    .where(ne(table.status, 'paid'))
    .groupBy(entityIdField, entityTable.name)
    .orderBy(desc(sql`SUM(${table.total} - ${table.paidAmount})`));

    return aging;
  }),
```

### Frontend: Accounting Dashboard

```typescript
// client/src/pages/AccountingDashboardPage.tsx

export function AccountingDashboardPage() {
  const { data: summary, isLoading } = trpc.accounting.getSummary.useQuery();
  const { data: arAging } = trpc.accounting.getAgingReport.useQuery({ type: 'ar' });
  const { data: apAging } = trpc.accounting.getAgingReport.useQuery({ type: 'ap' });

  if (isLoading) return <LoadingState />;

  return (
    <div className="space-y-6">
      <h1>Accounting Dashboard</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <SummaryCard
          title="Accounts Receivable"
          value={formatCurrency(summary?.ar.totalOutstanding ?? 0)}
          subtitle={`${summary?.ar.invoiceCount ?? 0} invoices`}
          trend={summary?.ar.overdueAmount > 0 ? 'negative' : 'neutral'}
        />
        <SummaryCard
          title="AR Overdue"
          value={formatCurrency(summary?.ar.overdueAmount ?? 0)}
          subtitle={`${summary?.ar.overdueCount ?? 0} overdue`}
          variant="warning"
        />
        <SummaryCard
          title="Accounts Payable"
          value={formatCurrency(summary?.ap.totalOutstanding ?? 0)}
          subtitle={`${summary?.ap.invoiceCount ?? 0} bills`}
        />
        <SummaryCard
          title="AP Overdue"
          value={formatCurrency(summary?.ap.overdueAmount ?? 0)}
          variant="warning"
        />
      </div>

      {/* Aging Reports */}
      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>AR Aging</CardTitle>
          </CardHeader>
          <CardContent>
            <AgingTable data={arAging ?? []} type="ar" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>AP Aging</CardTitle>
          </CardHeader>
          <CardContent>
            <AgingTable data={apAging ?? []} type="ap" />
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <TransactionsList transactions={summary?.recentTransactions ?? []} />
        </CardContent>
      </Card>
    </div>
  );
}
```

---

## Task 2: Credit Management (2 hours)

### Backend: Credit System

```typescript
// server/routers/credits.ts

export const creditsRouter = router({
  // Get client credit status
  getClientCredit: protectedProcedure
    .input(z.object({ clientId: z.number() }))
    .query(async ({ input }) => {
      const client = await db.query.clients.findFirst({
        where: eq(clients.id, input.clientId),
        with: {
          creditHistory: {
            orderBy: desc(creditHistory.createdAt),
            limit: 20,
          },
        },
      });

      if (!client) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Client not found' });
      }

      // Calculate available credit
      const arBalance = await calculateARBalance(input.clientId);
      const creditLimit = client.creditLimit ?? 0;
      const availableCredit = Math.max(0, creditLimit - arBalance);

      return {
        creditLimit,
        arBalance,
        availableCredit,
        creditHold: client.creditHold,
        creditHistory: client.creditHistory,
      };
    }),

  // Update credit limit
  updateCreditLimit: protectedProcedure
    .input(z.object({
      clientId: z.number(),
      creditLimit: z.number().min(0),
      reason: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const client = await getClient(input.clientId);
      const oldLimit = client.creditLimit;

      await db.update(clients)
        .set({ creditLimit: input.creditLimit })
        .where(eq(clients.id, input.clientId));

      // Log credit history
      await db.insert(creditHistory).values({
        clientId: input.clientId,
        action: 'LIMIT_CHANGE',
        oldValue: oldLimit,
        newValue: input.creditLimit,
        reason: input.reason,
        changedBy: ctx.user.id,
      });

      return { success: true };
    }),

  // Place/remove credit hold
  setCreditHold: protectedProcedure
    .input(z.object({
      clientId: z.number(),
      hold: z.boolean(),
      reason: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      await db.update(clients)
        .set({ 
          creditHold: input.hold,
          creditHoldReason: input.hold ? input.reason : null,
          creditHoldBy: input.hold ? ctx.user.id : null,
          creditHoldAt: input.hold ? new Date() : null,
        })
        .where(eq(clients.id, input.clientId));

      await db.insert(creditHistory).values({
        clientId: input.clientId,
        action: input.hold ? 'HOLD_PLACED' : 'HOLD_REMOVED',
        reason: input.reason,
        changedBy: ctx.user.id,
      });

      return { success: true };
    }),

  // Check if order can proceed (credit check)
  checkOrderCredit: protectedProcedure
    .input(z.object({
      clientId: z.number(),
      orderTotal: z.number(),
    }))
    .query(async ({ input }) => {
      const credit = await getClientCredit(input.clientId);
      
      return {
        canProceed: !credit.creditHold && credit.availableCredit >= input.orderTotal,
        availableCredit: credit.availableCredit,
        creditHold: credit.creditHold,
        creditHoldReason: credit.creditHoldReason,
        shortfall: Math.max(0, input.orderTotal - credit.availableCredit),
      };
    }),
});
```

### Frontend: Credit Management UI

```typescript
// client/src/components/clients/CreditManagement.tsx

export function CreditManagement({ clientId }: { clientId: number }) {
  const { data: credit, refetch } = trpc.credits.getClientCredit.useQuery({ clientId });
  const [showLimitDialog, setShowLimitDialog] = useState(false);
  const [showHoldDialog, setShowHoldDialog] = useState(false);

  const updateLimit = trpc.credits.updateCreditLimit.useMutation({
    onSuccess: () => {
      toast.success('Credit limit updated');
      refetch();
      setShowLimitDialog(false);
    },
  });

  const setHold = trpc.credits.setCreditHold.useMutation({
    onSuccess: () => {
      toast.success(credit?.creditHold ? 'Credit hold removed' : 'Credit hold placed');
      refetch();
      setShowHoldDialog(false);
    },
  });

  if (!credit) return <LoadingState />;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Credit Status</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {credit.creditHold && (
          <Alert variant="destructive">
            <AlertTitle>Credit Hold Active</AlertTitle>
            <AlertDescription>{credit.creditHoldReason}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label>Credit Limit</Label>
            <p className="text-2xl font-bold">{formatCurrency(credit.creditLimit)}</p>
          </div>
          <div>
            <Label>AR Balance</Label>
            <p className="text-2xl font-bold">{formatCurrency(credit.arBalance)}</p>
          </div>
          <div>
            <Label>Available Credit</Label>
            <p className={cn(
              "text-2xl font-bold",
              credit.availableCredit <= 0 && "text-destructive"
            )}>
              {formatCurrency(credit.availableCredit)}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowLimitDialog(true)}>
            Adjust Limit
          </Button>
          <Button 
            variant={credit.creditHold ? "default" : "destructive"}
            onClick={() => setShowHoldDialog(true)}
          >
            {credit.creditHold ? 'Remove Hold' : 'Place Hold'}
          </Button>
        </div>

        {/* Credit History */}
        <div>
          <h4 className="font-medium mb-2">Credit History</h4>
          <Table>
            <TableBody>
              {credit.creditHistory.map(entry => (
                <TableRow key={entry.id}>
                  <TableCell>{format(entry.createdAt, 'MMM d, yyyy')}</TableCell>
                  <TableCell>{entry.action}</TableCell>
                  <TableCell>{entry.reason}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {/* Dialogs */}
      <CreditLimitDialog
        open={showLimitDialog}
        onClose={() => setShowLimitDialog(false)}
        currentLimit={credit.creditLimit}
        onSubmit={(limit, reason) => updateLimit.mutate({ clientId, creditLimit: limit, reason })}
      />

      <CreditHoldDialog
        open={showHoldDialog}
        onClose={() => setShowHoldDialog(false)}
        isHold={!credit.creditHold}
        onSubmit={(reason) => setHold.mutate({ clientId, hold: !credit.creditHold, reason })}
      />
    </Card>
  );
}
```

---

## Task 3: Returns Processing (2 hours)

### QA-061: Returns Processing Modal

```typescript
// server/routers/returns.ts

export const returnsRouter = router({
  create: protectedProcedure
    .input(createReturnSchema)
    .mutation(async ({ ctx, input }) => {
      const order = await getOrder(input.orderId);
      if (!order) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Order not found' });
      }

      const returnRecord = await db.transaction(async (tx) => {
        // Create return
        const [ret] = await tx.insert(returns).values({
          orderId: input.orderId,
          clientId: order.clientId,
          reason: input.reason,
          status: 'pending',
          createdBy: ctx.user.id,
        }).returning();

        // Create return items
        await tx.insert(returnItems).values(
          input.items.map(item => ({
            returnId: ret.id,
            orderItemId: item.orderItemId,
            quantity: item.quantity,
            reason: item.reason,
            condition: item.condition,
          }))
        );

        return ret;
      });

      return returnRecord;
    }),

  process: protectedProcedure
    .input(z.object({
      returnId: z.number(),
      action: z.enum(['approve', 'reject']),
      creditAmount: z.number().optional(),
      restockItems: z.array(z.object({
        returnItemId: z.number(),
        restock: z.boolean(),
        batchId: z.number().optional(),
      })).optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const ret = await getReturnWithItems(input.returnId);
      
      if (ret.status !== 'pending') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Return has already been processed',
        });
      }

      await db.transaction(async (tx) => {
        if (input.action === 'approve') {
          // Update return status
          await tx.update(returns)
            .set({
              status: 'approved',
              processedAt: new Date(),
              processedBy: ctx.user.id,
              creditAmount: input.creditAmount,
              notes: input.notes,
            })
            .where(eq(returns.id, input.returnId));

          // Restock items if specified
          for (const item of input.restockItems ?? []) {
            if (item.restock && item.batchId) {
              const returnItem = ret.items.find(i => i.id === item.returnItemId);
              if (returnItem) {
                await tx.update(batches)
                  .set({
                    quantity: sql`${batches.quantity} + ${returnItem.quantity}`,
                  })
                  .where(eq(batches.id, item.batchId));
              }
            }
          }

          // Create credit memo if credit amount specified
          if (input.creditAmount && input.creditAmount > 0) {
            await tx.insert(creditMemos).values({
              clientId: ret.clientId,
              returnId: ret.id,
              amount: input.creditAmount,
              status: 'pending',
              createdBy: ctx.user.id,
            });
          }
        } else {
          // Reject
          await tx.update(returns)
            .set({
              status: 'rejected',
              processedAt: new Date(),
              processedBy: ctx.user.id,
              notes: input.notes,
            })
            .where(eq(returns.id, input.returnId));
        }
      });

      return { success: true };
    }),
});
```

### Frontend: Returns Modal

```typescript
// client/src/components/returns/ProcessReturnModal.tsx

export function ProcessReturnModal({ returnRecord, open, onClose }: Props) {
  const [action, setAction] = useState<'approve' | 'reject'>('approve');
  const [creditAmount, setCreditAmount] = useState(returnRecord.suggestedCredit);
  const [restockItems, setRestockItems] = useState<RestockItem[]>([]);
  const [notes, setNotes] = useState('');

  const processReturn = trpc.returns.process.useMutation({
    onSuccess: () => {
      toast.success(`Return ${action === 'approve' ? 'approved' : 'rejected'}`);
      onClose();
    },
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Process Return</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Return Items */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Condition</TableHead>
                <TableHead>Restock?</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {returnRecord.items.map(item => (
                <TableRow key={item.id}>
                  <TableCell>{item.product.name}</TableCell>
                  <TableCell>{item.quantity}</TableCell>
                  <TableCell>{item.reason}</TableCell>
                  <TableCell>
                    <Badge variant={item.condition === 'good' ? 'default' : 'secondary'}>
                      {item.condition}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Checkbox
                      checked={restockItems.find(r => r.returnItemId === item.id)?.restock}
                      onCheckedChange={(checked) => {
                        setRestockItems(prev => {
                          const filtered = prev.filter(r => r.returnItemId !== item.id);
                          return checked 
                            ? [...filtered, { returnItemId: item.id, restock: true }]
                            : filtered;
                        });
                      }}
                      disabled={item.condition !== 'good'}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Action Selection */}
          <RadioGroup value={action} onValueChange={(v) => setAction(v as any)}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="approve" id="approve" />
              <Label htmlFor="approve">Approve Return</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="reject" id="reject" />
              <Label htmlFor="reject">Reject Return</Label>
            </div>
          </RadioGroup>

          {action === 'approve' && (
            <div>
              <Label>Credit Amount</Label>
              <Input
                type="number"
                step="0.01"
                value={creditAmount}
                onChange={(e) => setCreditAmount(Number(e.target.value))}
              />
            </div>
          )}

          <div>
            <Label>Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes about this decision..."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            variant={action === 'approve' ? 'default' : 'destructive'}
            onClick={() => processReturn.mutate({
              returnId: returnRecord.id,
              action,
              creditAmount: action === 'approve' ? creditAmount : undefined,
              restockItems: action === 'approve' ? restockItems : undefined,
              notes,
            })}
          >
            {action === 'approve' ? 'Approve' : 'Reject'} Return
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

---

## Task 4: Financial Reports (2 hours)

### Backend: Report Endpoints

```typescript
// server/routers/reports.ts

getProfitAndLoss: protectedProcedure
  .input(z.object({
    startDate: z.date(),
    endDate: z.date(),
  }))
  .query(async ({ input }) => {
    const [revenue, cogs, expenses] = await Promise.all([
      // Revenue from invoices
      db.select({
        total: sql<number>`COALESCE(SUM(${invoices.total}), 0)`,
      })
      .from(invoices)
      .where(and(
        eq(invoices.status, 'paid'),
        gte(invoices.paidAt, input.startDate),
        lte(invoices.paidAt, input.endDate)
      )),

      // Cost of goods sold
      db.select({
        total: sql<number>`COALESCE(SUM(${orderItems.quantity} * ${batches.unitCost}), 0)`,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .innerJoin(batches, eq(orderItems.batchId, batches.id))
      .where(and(
        eq(orders.status, 'fulfilled'),
        gte(orders.fulfilledAt, input.startDate),
        lte(orders.fulfilledAt, input.endDate)
      )),

      // Other expenses (if tracked)
      db.select({
        total: sql<number>`COALESCE(SUM(${expenses.amount}), 0)`,
      })
      .from(expenses)
      .where(and(
        gte(expenses.date, input.startDate),
        lte(expenses.date, input.endDate)
      )),
    ]);

    const grossProfit = revenue[0].total - cogs[0].total;
    const netProfit = grossProfit - expenses[0].total;

    return {
      revenue: revenue[0].total,
      cogs: cogs[0].total,
      grossProfit,
      grossMargin: revenue[0].total > 0 ? (grossProfit / revenue[0].total) * 100 : 0,
      expenses: expenses[0].total,
      netProfit,
      netMargin: revenue[0].total > 0 ? (netProfit / revenue[0].total) * 100 : 0,
    };
  }),

getSalesByProduct: protectedProcedure
  .input(z.object({
    startDate: z.date(),
    endDate: z.date(),
    limit: z.number().default(20),
  }))
  .query(async ({ input }) => {
    return db.select({
      productId: products.id,
      productName: products.name,
      category: products.category,
      quantitySold: sql<number>`SUM(${orderItems.quantity})`,
      revenue: sql<number>`SUM(${orderItems.quantity} * ${orderItems.unitPrice})`,
      cogs: sql<number>`SUM(${orderItems.quantity} * ${batches.unitCost})`,
      profit: sql<number>`SUM(${orderItems.quantity} * (${orderItems.unitPrice} - ${batches.unitCost}))`,
    })
    .from(orderItems)
    .innerJoin(orders, eq(orderItems.orderId, orders.id))
    .innerJoin(products, eq(orderItems.productId, products.id))
    .leftJoin(batches, eq(orderItems.batchId, batches.id))
    .where(and(
      eq(orders.status, 'fulfilled'),
      gte(orders.fulfilledAt, input.startDate),
      lte(orders.fulfilledAt, input.endDate)
    ))
    .groupBy(products.id, products.name, products.category)
    .orderBy(desc(sql`SUM(${orderItems.quantity} * ${orderItems.unitPrice})`))
    .limit(input.limit);
  }),
```

---

## Git Workflow

```bash
git checkout -b feat/wave-5c-accounting-workflow

git add server/routers/accounting.ts client/src/pages/AccountingDashboardPage.tsx
git commit -m "feat(ACCT-1): Complete AR/AP dashboard"

git add server/routers/credits.ts client/src/components/clients/CreditManagement.tsx
git commit -m "feat(ACCT-2): Implement credit management system"

git add server/routers/returns.ts client/src/components/returns/
git commit -m "feat(ACCT-3): Implement returns processing"

git add server/routers/reports.ts client/src/pages/ReportsPage.tsx
git commit -m "feat(ACCT-4): Add financial reports"

git push origin feat/wave-5c-accounting-workflow
```

---

## Success Criteria

- [ ] AR/AP dashboard complete
- [ ] Aging reports working
- [ ] Credit management functional
- [ ] Returns processing complete
- [ ] P&L report working
- [ ] Sales by product report working
- [ ] QA-059 complete
- [ ] QA-061 complete

---

## Handoff

After Wave 5C completion:

1. Verify all accounting flows work end-to-end
2. Test credit checks in order creation (Wave 5A integration)
3. Update accounting training materials

**Next**: Wave 6 (VIP Portal, Integrations)

# Wave 6A: VIP Portal Completion

**Agent Role**: Full Stack Developer  
**Duration**: 8-10 hours  
**Priority**: P1  
**Timeline**: Week 3-4  
**Dependencies**: Wave 5A, 5B complete  
**Can Run Parallel With**: Wave 6B

---

## Overview

Complete the VIP Portal - a client-facing portal where clients can browse the live catalog, view their AR/AP balances, and place orders.

---

## Workflow Diagram

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Client    │───▶│   Browse    │───▶│    Add to   │
│    Login    │    │   Catalog   │    │     Cart    │
└─────────────┘    └─────────────┘    └─────────────┘
                                            │
                                            ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│    Order    │◀───│   Submit    │◀───│   Review    │
│ Confirmation│    │    Order    │    │     Cart    │
└─────────────┘    └─────────────┘    └─────────────┘
```

---

## Task 1: VIP Portal Authentication (2 hours)

### Backend: Client Authentication

```typescript
// server/routers/vipAuth.ts

export const vipAuthRouter = router({
  // Client login
  login: publicProcedure
    .input(z.object({
      email: z.string().email(),
      password: z.string(),
    }))
    .mutation(async ({ input }) => {
      const client = await db.query.clients.findFirst({
        where: eq(clients.email, input.email),
      });

      if (!client || !client.portalEnabled) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Invalid credentials or portal access not enabled',
        });
      }

      const validPassword = await verifyPassword(input.password, client.portalPasswordHash);
      if (!validPassword) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Invalid credentials',
        });
      }

      // Create session
      const session = await createClientSession(client.id);

      return {
        token: session.token,
        client: {
          id: client.id,
          name: client.name,
          email: client.email,
        },
      };
    }),

  // Get current client
  me: vipProtectedProcedure
    .query(async ({ ctx }) => {
      return {
        id: ctx.client.id,
        name: ctx.client.name,
        email: ctx.client.email,
        creditLimit: ctx.client.creditLimit,
        arBalance: await calculateARBalance(ctx.client.id),
      };
    }),

  // Request password reset
  requestPasswordReset: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ input }) => {
      const client = await db.query.clients.findFirst({
        where: eq(clients.email, input.email),
      });

      if (client?.portalEnabled) {
        const token = await createPasswordResetToken(client.id);
        await sendPasswordResetEmail(client.email, token);
      }

      // Always return success to prevent email enumeration
      return { success: true };
    }),
});
```

### VIP Protected Procedure

```typescript
// server/_core/vipTrpc.ts

export const vipProtectedProcedure = publicProcedure.use(async ({ ctx, next }) => {
  const token = ctx.req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Please log in to access the VIP portal',
    });
  }

  const session = await db.query.clientSessions.findFirst({
    where: and(
      eq(clientSessions.token, token),
      gt(clientSessions.expiresAt, new Date())
    ),
    with: { client: true },
  });

  if (!session) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Session expired. Please log in again.',
    });
  }

  return next({
    ctx: {
      ...ctx,
      client: session.client,
      clientSession: session,
    },
  });
});
```

### Frontend: VIP Login Page

```typescript
// client/src/pages/vip/VIPLoginPage.tsx

export function VIPLoginPage() {
  const navigate = useNavigate();
  const form = useForm<LoginFormData>({
    defaultValues: { email: '', password: '' },
  });

  const login = trpc.vipAuth.login.useMutation({
    onSuccess: (data) => {
      localStorage.setItem('vip_token', data.token);
      navigate('/vip/catalog');
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-green-100">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <img src="/logo.png" alt="TERP" className="h-12 mx-auto mb-4" />
          <CardTitle>VIP Portal</CardTitle>
          <CardDescription>Sign in to access your account</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(data => login.mutate(data))} className="space-y-4">
              <FormField
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={login.isLoading}>
                Sign In
              </Button>
            </form>
          </Form>
          <div className="mt-4 text-center">
            <Link to="/vip/forgot-password" className="text-sm text-muted-foreground hover:underline">
              Forgot password?
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

---

## Task 2: Live Catalog Browsing (2 hours)

### Backend: Catalog Endpoints

```typescript
// server/routers/vipCatalog.ts

export const vipCatalogRouter = router({
  // Get catalog items with client-specific pricing
  getCatalog: vipProtectedProcedure
    .input(z.object({
      category: z.string().optional(),
      search: z.string().optional(),
      page: z.number().default(1),
      limit: z.number().default(20),
    }))
    .query(async ({ ctx, input }) => {
      const clientPricing = await getClientPricingRules(ctx.client.id);

      const items = await db.query.catalogItems.findMany({
        where: and(
          eq(catalogItems.isActive, true),
          input.category ? eq(products.category, input.category) : undefined,
          input.search ? or(
            ilike(products.name, `%${input.search}%`),
            ilike(products.strain, `%${input.search}%`)
          ) : undefined
        ),
        with: {
          batch: {
            with: {
              photos: { where: eq(batchPhotos.isPrimary, true), limit: 1 },
            },
          },
          product: true,
        },
        limit: input.limit,
        offset: (input.page - 1) * input.limit,
      });

      // Apply client-specific pricing
      return items.map(item => ({
        ...item,
        price: calculateClientPrice(item.batch, clientPricing),
        availableQuantity: item.batch.quantity - item.batch.reservedQuantity,
      }));
    }),

  // Get single item details
  getItem: vipProtectedProcedure
    .input(z.object({ batchId: z.number() }))
    .query(async ({ ctx, input }) => {
      const item = await db.query.catalogItems.findFirst({
        where: and(
          eq(catalogItems.batchId, input.batchId),
          eq(catalogItems.isActive, true)
        ),
        with: {
          batch: {
            with: {
              photos: true,
              product: true,
              vendor: true,
              labResults: true,
            },
          },
        },
      });

      if (!item) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Item not found' });
      }

      const clientPricing = await getClientPricingRules(ctx.client.id);

      return {
        ...item,
        price: calculateClientPrice(item.batch, clientPricing),
        tierPricing: calculateTierPricing(item.batch, clientPricing),
        availableQuantity: item.batch.quantity - item.batch.reservedQuantity,
      };
    }),

  // Get categories
  getCategories: vipProtectedProcedure
    .query(async () => {
      const categories = await db.selectDistinct({ category: products.category })
        .from(products)
        .innerJoin(batches, eq(products.id, batches.productId))
        .innerJoin(catalogItems, eq(batches.id, catalogItems.batchId))
        .where(eq(catalogItems.isActive, true));

      return categories.map(c => c.category).filter(Boolean);
    }),
});
```

### Frontend: Catalog Page

```typescript
// client/src/pages/vip/VIPCatalogPage.tsx

export function VIPCatalogPage() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>();
  const [page, setPage] = useState(1);

  const { data: categories } = trpc.vipCatalog.getCategories.useQuery();
  const { data: catalog, isLoading } = trpc.vipCatalog.getCatalog.useQuery({
    search: search || undefined,
    category,
    page,
  });

  return (
    <VIPLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Product Catalog</h1>
          <div className="flex gap-4">
            <Input
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-64"
            />
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Categories</SelectItem>
                {categories?.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading ? (
          <LoadingGrid />
        ) : (
          <div className="grid grid-cols-4 gap-6">
            {catalog?.map(item => (
              <CatalogItemCard key={item.id} item={item} />
            ))}
          </div>
        )}

        <Pagination page={page} onPageChange={setPage} />
      </div>
    </VIPLayout>
  );
}

function CatalogItemCard({ item }: { item: CatalogItem }) {
  const { addToCart } = useCart();

  return (
    <Card className="overflow-hidden">
      <div className="aspect-square relative">
        <img
          src={item.batch.photos[0]?.url ?? '/placeholder.jpg'}
          alt={item.product.name}
          className="object-cover w-full h-full"
        />
        {item.availableQuantity <= 10 && (
          <Badge className="absolute top-2 right-2" variant="destructive">
            Low Stock
          </Badge>
        )}
      </div>
      <CardContent className="p-4">
        <h3 className="font-medium">{item.product.name}</h3>
        <p className="text-sm text-muted-foreground">{item.product.strain}</p>
        <div className="mt-2 flex justify-between items-center">
          <span className="text-lg font-bold">${item.price.toFixed(2)}</span>
          <span className="text-sm text-muted-foreground">
            {item.availableQuantity} available
          </span>
        </div>
        <Button 
          className="w-full mt-4" 
          onClick={() => addToCart(item)}
          disabled={item.availableQuantity === 0}
        >
          Add to Cart
        </Button>
      </CardContent>
    </Card>
  );
}
```

---

## Task 3: Shopping Cart & Order Submission (2 hours)

### Backend: Cart & Orders

```typescript
// server/routers/vipOrders.ts

export const vipOrdersRouter = router({
  // Get cart
  getCart: vipProtectedProcedure
    .query(async ({ ctx }) => {
      const cart = await db.query.vipCarts.findFirst({
        where: eq(vipCarts.clientId, ctx.client.id),
        with: {
          items: {
            with: {
              batch: {
                with: { product: true, photos: { limit: 1 } },
              },
            },
          },
        },
      });

      if (!cart) return { items: [], total: 0 };

      const clientPricing = await getClientPricingRules(ctx.client.id);
      const itemsWithPricing = cart.items.map(item => ({
        ...item,
        unitPrice: calculateClientPrice(item.batch, clientPricing, item.quantity),
        lineTotal: calculateClientPrice(item.batch, clientPricing, item.quantity) * item.quantity,
      }));

      return {
        items: itemsWithPricing,
        total: itemsWithPricing.reduce((sum, item) => sum + item.lineTotal, 0),
      };
    }),

  // Add to cart
  addToCart: vipProtectedProcedure
    .input(z.object({
      batchId: z.number(),
      quantity: z.number().positive(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify availability
      const batch = await getBatch(input.batchId);
      const available = batch.quantity - batch.reservedQuantity;
      
      if (input.quantity > available) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Only ${available} units available`,
        });
      }

      // Get or create cart
      let cart = await db.query.vipCarts.findFirst({
        where: eq(vipCarts.clientId, ctx.client.id),
      });

      if (!cart) {
        [cart] = await db.insert(vipCarts)
          .values({ clientId: ctx.client.id })
          .returning();
      }

      // Check if item already in cart
      const existingItem = await db.query.vipCartItems.findFirst({
        where: and(
          eq(vipCartItems.cartId, cart.id),
          eq(vipCartItems.batchId, input.batchId)
        ),
      });

      if (existingItem) {
        await db.update(vipCartItems)
          .set({ quantity: existingItem.quantity + input.quantity })
          .where(eq(vipCartItems.id, existingItem.id));
      } else {
        await db.insert(vipCartItems).values({
          cartId: cart.id,
          batchId: input.batchId,
          quantity: input.quantity,
        });
      }

      return { success: true };
    }),

  // Submit order
  submitOrder: vipProtectedProcedure
    .input(z.object({
      notes: z.string().optional(),
      requestedDeliveryDate: z.date().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const cart = await getCartWithItems(ctx.client.id);
      
      if (!cart?.items.length) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Cart is empty',
        });
      }

      // Credit check
      const clientPricing = await getClientPricingRules(ctx.client.id);
      const orderTotal = cart.items.reduce((sum, item) => {
        const price = calculateClientPrice(item.batch, clientPricing, item.quantity);
        return sum + (price * item.quantity);
      }, 0);

      const creditCheck = await checkClientCredit(ctx.client.id, orderTotal);
      if (!creditCheck.canProceed) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: creditCheck.creditHold 
            ? 'Your account is on credit hold. Please contact us.'
            : `Order exceeds available credit by ${formatCurrency(creditCheck.shortfall)}`,
        });
      }

      // Create order
      const order = await db.transaction(async (tx) => {
        const [order] = await tx.insert(orders).values({
          clientId: ctx.client.id,
          status: 'pending',
          source: 'vip_portal',
          notes: input.notes,
          requestedDeliveryDate: input.requestedDeliveryDate,
        }).returning();

        // Create order items and reserve inventory
        for (const item of cart.items) {
          const price = calculateClientPrice(item.batch, clientPricing, item.quantity);
          
          await tx.insert(orderItems).values({
            orderId: order.id,
            batchId: item.batchId,
            productId: item.batch.productId,
            quantity: item.quantity,
            unitPrice: price,
          });

          // Reserve inventory
          await tx.update(batches)
            .set({ reservedQuantity: sql`${batches.reservedQuantity} + ${item.quantity}` })
            .where(eq(batches.id, item.batchId));
        }

        // Clear cart
        await tx.delete(vipCartItems).where(eq(vipCartItems.cartId, cart.id));

        return order;
      });

      // Send confirmation email
      await sendOrderConfirmationEmail(ctx.client, order);

      // Notify sales team
      await notifySalesTeam('new_vip_order', { order, client: ctx.client });

      return { orderId: order.id };
    }),

  // Get order history
  getOrders: vipProtectedProcedure
    .input(z.object({
      page: z.number().default(1),
      limit: z.number().default(20),
    }))
    .query(async ({ ctx, input }) => {
      return db.query.orders.findMany({
        where: eq(orders.clientId, ctx.client.id),
        with: {
          items: { with: { product: true } },
          invoice: true,
        },
        orderBy: desc(orders.createdAt),
        limit: input.limit,
        offset: (input.page - 1) * input.limit,
      });
    }),
});
```

### Frontend: Cart & Checkout

```typescript
// client/src/pages/vip/VIPCartPage.tsx

export function VIPCartPage() {
  const { data: cart, refetch } = trpc.vipOrders.getCart.useQuery();
  const [notes, setNotes] = useState('');
  const [deliveryDate, setDeliveryDate] = useState<Date>();

  const updateQuantity = trpc.vipOrders.updateCartItem.useMutation({
    onSuccess: () => refetch(),
  });

  const removeItem = trpc.vipOrders.removeFromCart.useMutation({
    onSuccess: () => refetch(),
  });

  const submitOrder = trpc.vipOrders.submitOrder.useMutation({
    onSuccess: ({ orderId }) => {
      toast.success('Order submitted successfully!');
      navigate(`/vip/orders/${orderId}`);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  if (!cart?.items.length) {
    return (
      <VIPLayout>
        <EmptyState
          title="Your cart is empty"
          description="Browse our catalog to add products"
          action={<Button onClick={() => navigate('/vip/catalog')}>Browse Catalog</Button>}
        />
      </VIPLayout>
    );
  }

  return (
    <VIPLayout>
      <div className="grid grid-cols-3 gap-8">
        <div className="col-span-2 space-y-4">
          <h1 className="text-2xl font-bold">Shopping Cart</h1>
          
          {cart.items.map(item => (
            <Card key={item.id}>
              <CardContent className="flex gap-4 p-4">
                <img
                  src={item.batch.photos[0]?.url ?? '/placeholder.jpg'}
                  alt=""
                  className="w-24 h-24 object-cover rounded"
                />
                <div className="flex-1">
                  <h3 className="font-medium">{item.batch.product.name}</h3>
                  <p className="text-sm text-muted-foreground">{item.batch.code}</p>
                  <p className="text-lg font-bold mt-2">
                    ${item.unitPrice.toFixed(2)} × {item.quantity} = ${item.lineTotal.toFixed(2)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => updateQuantity.mutate({
                      itemId: item.id,
                      quantity: Number(e.target.value),
                    })}
                    className="w-20"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeItem.mutate({ itemId: item.id })}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div>
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span>${cart.total.toFixed(2)}</span>
              </div>

              <div>
                <Label>Order Notes</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Special instructions..."
                />
              </div>

              <div>
                <Label>Requested Delivery Date</Label>
                <DatePicker
                  value={deliveryDate}
                  onChange={setDeliveryDate}
                  minDate={addDays(new Date(), 1)}
                />
              </div>

              <Button
                className="w-full"
                size="lg"
                onClick={() => submitOrder.mutate({ notes, requestedDeliveryDate: deliveryDate })}
                disabled={submitOrder.isLoading}
              >
                Submit Order
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </VIPLayout>
  );
}
```

---

## Task 4: AR/AP Balance View (2 hours)

### Backend: Client Account

```typescript
// server/routers/vipAccount.ts

export const vipAccountRouter = router({
  getAccountSummary: vipProtectedProcedure
    .query(async ({ ctx }) => {
      const [arBalance, creditInfo, recentInvoices, recentPayments] = await Promise.all([
        calculateARBalance(ctx.client.id),
        getClientCredit(ctx.client.id),
        db.query.invoices.findMany({
          where: eq(invoices.clientId, ctx.client.id),
          orderBy: desc(invoices.createdAt),
          limit: 5,
        }),
        db.query.payments.findMany({
          where: eq(payments.clientId, ctx.client.id),
          orderBy: desc(payments.receivedAt),
          limit: 5,
        }),
      ]);

      return {
        arBalance,
        creditLimit: creditInfo.creditLimit,
        availableCredit: creditInfo.availableCredit,
        creditHold: creditInfo.creditHold,
        recentInvoices,
        recentPayments,
      };
    }),

  getInvoices: vipProtectedProcedure
    .input(z.object({
      status: z.enum(['all', 'pending', 'paid', 'overdue']).default('all'),
      page: z.number().default(1),
    }))
    .query(async ({ ctx, input }) => {
      const where = [eq(invoices.clientId, ctx.client.id)];
      
      if (input.status === 'pending') {
        where.push(eq(invoices.status, 'pending'));
      } else if (input.status === 'paid') {
        where.push(eq(invoices.status, 'paid'));
      } else if (input.status === 'overdue') {
        where.push(
          eq(invoices.status, 'pending'),
          lt(invoices.dueDate, new Date())
        );
      }

      return db.query.invoices.findMany({
        where: and(...where),
        with: { order: true },
        orderBy: desc(invoices.createdAt),
        limit: 20,
        offset: (input.page - 1) * 20,
      });
    }),

  getStatements: vipProtectedProcedure
    .input(z.object({
      startDate: z.date(),
      endDate: z.date(),
    }))
    .query(async ({ ctx, input }) => {
      // Get all transactions in date range
      const transactions = await db.select({
        date: sql<Date>`COALESCE(${invoices.createdAt}, ${payments.receivedAt})`,
        type: sql<string>`CASE WHEN ${invoices.id} IS NOT NULL THEN 'invoice' ELSE 'payment' END`,
        reference: sql<string>`COALESCE(${invoices.invoiceNumber}, ${payments.reference})`,
        debit: sql<number>`COALESCE(${invoices.total}, 0)`,
        credit: sql<number>`COALESCE(${payments.amount}, 0)`,
      })
      .from(invoices)
      .fullJoin(payments, sql`false`) // Union-like behavior
      .where(and(
        eq(invoices.clientId, ctx.client.id),
        gte(sql`COALESCE(${invoices.createdAt}, ${payments.receivedAt})`, input.startDate),
        lte(sql`COALESCE(${invoices.createdAt}, ${payments.receivedAt})`, input.endDate)
      ))
      .orderBy(sql`COALESCE(${invoices.createdAt}, ${payments.receivedAt})`);

      // Calculate running balance
      let balance = await calculateARBalanceAsOf(ctx.client.id, input.startDate);
      const statement = transactions.map(t => {
        balance = balance + t.debit - t.credit;
        return { ...t, balance };
      });

      return statement;
    }),
});
```

### Frontend: Account Page

```typescript
// client/src/pages/vip/VIPAccountPage.tsx

export function VIPAccountPage() {
  const { data: account } = trpc.vipAccount.getAccountSummary.useQuery();
  const [invoiceFilter, setInvoiceFilter] = useState<'all' | 'pending' | 'paid' | 'overdue'>('all');
  const { data: invoices } = trpc.vipAccount.getInvoices.useQuery({ status: invoiceFilter });

  return (
    <VIPLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">My Account</h1>

        {/* Account Summary */}
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground">Account Balance</div>
              <div className="text-2xl font-bold">
                {formatCurrency(account?.arBalance ?? 0)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground">Credit Limit</div>
              <div className="text-2xl font-bold">
                {formatCurrency(account?.creditLimit ?? 0)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground">Available Credit</div>
              <div className={cn(
                "text-2xl font-bold",
                (account?.availableCredit ?? 0) <= 0 && "text-destructive"
              )}>
                {formatCurrency(account?.availableCredit ?? 0)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground">Status</div>
              <div className="text-2xl font-bold">
                {account?.creditHold ? (
                  <Badge variant="destructive">On Hold</Badge>
                ) : (
                  <Badge variant="default">Active</Badge>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Invoices */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Invoices</CardTitle>
              <Select value={invoiceFilter} onValueChange={(v: any) => setInvoiceFilter(v)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Paid</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices?.map(invoice => (
                  <TableRow key={invoice.id}>
                    <TableCell>{invoice.invoiceNumber}</TableCell>
                    <TableCell>{format(invoice.createdAt, 'MMM d, yyyy')}</TableCell>
                    <TableCell>{format(invoice.dueDate, 'MMM d, yyyy')}</TableCell>
                    <TableCell>{formatCurrency(invoice.total)}</TableCell>
                    <TableCell>{formatCurrency(invoice.paidAmount)}</TableCell>
                    <TableCell>{formatCurrency(invoice.total - invoice.paidAmount)}</TableCell>
                    <TableCell>
                      <InvoiceStatusBadge invoice={invoice} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </VIPLayout>
  );
}
```

---

## Git Workflow

```bash
git checkout -b feat/wave-6a-vip-portal

git add server/routers/vipAuth.ts server/_core/vipTrpc.ts client/src/pages/vip/VIPLoginPage.tsx
git commit -m "feat(VIP-1): Implement VIP portal authentication"

git add server/routers/vipCatalog.ts client/src/pages/vip/VIPCatalogPage.tsx
git commit -m "feat(VIP-2): Implement live catalog browsing"

git add server/routers/vipOrders.ts client/src/pages/vip/VIPCartPage.tsx
git commit -m "feat(VIP-3): Implement shopping cart and order submission"

git add server/routers/vipAccount.ts client/src/pages/vip/VIPAccountPage.tsx
git commit -m "feat(VIP-4): Implement AR/AP balance view"

git push origin feat/wave-6a-vip-portal
```

---

## Success Criteria

- [ ] Client can log into VIP portal
- [ ] Client can browse live catalog
- [ ] Client can view product details
- [ ] Client can add items to cart
- [ ] Client can submit order
- [ ] Credit check works on order submission
- [ ] Client can view AR/AP balances
- [ ] Client can view invoice history
- [ ] Order confirmation email sent
- [ ] Sales team notified of new orders

---

## Handoff

After Wave 6A completion:

1. Test full VIP portal flow end-to-end
2. Verify integration with Wave 5A (orders appear in admin)
3. Create VIP portal user documentation
4. Set up demo client account for training

**Next**: Wave 6B (Integrations), Wave 7 (Notifications)

# Sprint Team C: Backend & API

**Branch:** `claude/sprint-team-c-backend`
**Priority:** Can start in parallel with Team A
**Estimated Duration:** 3-4 days

---

## Your Mission

You are **Sprint Team C**, responsible for backend API implementations, service layer improvements, and router fixes. Your work completes the API surface for frontend teams.

---

## CRITICAL: Read Before Starting

1. **Read `/CLAUDE.md`** - All agent protocols apply
2. **Check `/docs/ACTIVE_SESSIONS.md`** - Ensure no conflicts
3. **Create session file** in `/docs/sessions/active/`
4. **Work on branch:** `claude/sprint-team-c-backend`

---

## Your Owned Files

You have **exclusive write access** to:

```
server/routers/*.ts
server/services/*.ts (EXCLUDING accountingHooks.ts - Team A owns)
server/*Db.ts
server/services/live-shopping/**
server/services/liveCatalogService.ts
server/services/emailService.ts
```

**DO NOT MODIFY:**
- `client/src/**` (Team B owns)
- `server/accountingHooks.ts` (Team A owns - ACC-001)
- `drizzle/**` (Team D owns)
- `scripts/seed/**` (Team D owns)
- `server/db/schema.ts` (Team D owns - request changes via ticket)
- `server/_core/**` (Team E owns)

---

## Task Execution Order

### Phase 1: P1 High Priority (Days 1-2)

#### SSE-001: Fix Live Shopping SSE Event Naming (2 hours)

**Files:**
- `server/services/live-shopping/sessionTimeoutService.ts`
- `client/src/hooks/useLiveSessionSSE.ts:135-147`

**Problem:** Backend emits `SESSION_TIMEOUT_WARNING` but frontend listens for `TIMEOUT_WARNING`.

**Fix (prefer backend naming):**
```typescript
// In useLiveSessionSSE.ts, update event listeners:
// BEFORE:
eventSource.addEventListener('TIMEOUT_WARNING', handler);

// AFTER:
eventSource.addEventListener('SESSION_TIMEOUT_WARNING', handler);
```

**Note:** Coordinate with Team B if frontend file changes are needed.

---

#### API-016: Implement Quote Email Sending (4 hours)

**File:** `server/routers/quotes.ts:294`

**Problem:** `sendQuote` mutation has TODO comment but doesn't send emails.

**Implementation:**
```typescript
// In sendQuote mutation:
import { emailService } from '@/services/emailService';

// After marking quote as sent:
await emailService.sendQuoteEmail({
  to: quote.client.email,
  quotePdf: await generateQuotePdf(quote),
  viewUrl: `${process.env.APP_URL}/quotes/${quote.id}/view`,
});

// Track delivery status:
await db.update(quotes)
  .set({
    emailSentAt: new Date(),
    emailStatus: 'sent',
  })
  .where(eq(quotes.id, input.quoteId));
```

---

#### BE-QA-006: Implement AR/AP Summary Endpoints (8 hours)

**File:** `server/routers/accounting.ts`
**Tests:** `server/routers/accounting.test.ts:248-272`

**Problem:** Endpoints return NOT_IMPLEMENTED.

**Implementation:**
```typescript
// getArSummary - Accounts Receivable Summary
getArSummary: protectedProcedure
  .input(z.object({ periodStart: z.date().optional(), periodEnd: z.date().optional() }))
  .query(async ({ ctx, input }) => {
    const summary = await db.select({
      totalOutstanding: sql<number>`SUM(amount_due - amount_paid)`,
      overdue: sql<number>`SUM(CASE WHEN due_date < NOW() THEN amount_due - amount_paid ELSE 0 END)`,
      current: sql<number>`SUM(CASE WHEN due_date >= NOW() THEN amount_due - amount_paid ELSE 0 END)`,
    })
    .from(invoices)
    .where(and(
      isNull(invoices.deletedAt),
      eq(invoices.status, 'unpaid'),
    ));

    return summary[0];
  }),

// getApSummary - Accounts Payable Summary
getApSummary: protectedProcedure
  .input(z.object({ periodStart: z.date().optional(), periodEnd: z.date().optional() }))
  .query(async ({ ctx, input }) => {
    const summary = await db.select({
      totalOwed: sql<number>`SUM(amount_due - amount_paid)`,
      overdue: sql<number>`SUM(CASE WHEN due_date < NOW() THEN amount_due - amount_paid ELSE 0 END)`,
      current: sql<number>`SUM(CASE WHEN due_date >= NOW() THEN amount_due - amount_paid ELSE 0 END)`,
    })
    .from(purchaseOrders)
    .where(and(
      isNull(purchaseOrders.deletedAt),
      eq(purchaseOrders.status, 'unpaid'),
    ));

    return summary[0];
  }),
```

**Unskip tests after implementation.**

---

#### BE-QA-007: Implement Cash Expenses Endpoints (8 hours)

**File:** `server/routers/accounting.ts`
**Tests:** `server/routers/accounting.test.ts:298-340`

**Implementation:**
```typescript
// listExpenses
listExpenses: protectedProcedure
  .input(z.object({
    categoryId: z.number().optional(),
    startDate: z.date().optional(),
    endDate: z.date().optional(),
    limit: z.number().default(50),
    offset: z.number().default(0),
  }))
  .query(async ({ ctx, input }) => {
    return db.query.cashExpenses.findMany({
      where: and(
        input.categoryId ? eq(cashExpenses.categoryId, input.categoryId) : undefined,
        input.startDate ? gte(cashExpenses.date, input.startDate) : undefined,
        input.endDate ? lte(cashExpenses.date, input.endDate) : undefined,
      ),
      limit: input.limit,
      offset: input.offset,
      orderBy: [desc(cashExpenses.date)],
      with: { category: true },
    });
  }),

// createExpense
createExpense: protectedProcedure
  .input(z.object({
    amount: z.number().positive(),
    description: z.string().min(1),
    categoryId: z.number(),
    date: z.date(),
    paymentMethod: z.enum(['cash', 'check', 'card', 'transfer']),
    reference: z.string().optional(),
  }))
  .mutation(async ({ ctx, input }) => {
    const userId = getAuthenticatedUserId(ctx);

    const [expense] = await db.insert(cashExpenses)
      .values({
        ...input,
        createdBy: userId,
      })
      .returning();

    // Post GL entry
    await postExpenseGLEntry(expense);

    return expense;
  }),
```

---

#### BE-QA-008: Implement Financial Reports (16 hours)

**File:** `server/routers/accounting.ts`
**Tests:** `server/routers/accounting.test.ts:350-375`

**Implementation:**

```typescript
// generateBalanceSheet
generateBalanceSheet: protectedProcedure
  .input(z.object({
    asOfDate: z.date(),
    format: z.enum(['json', 'pdf', 'csv']).default('json'),
  }))
  .query(async ({ ctx, input }) => {
    // Query assets from GL
    const assets = await db.select({
      accountName: glAccounts.name,
      balance: sql<number>`SUM(CASE WHEN type = 'debit' THEN amount ELSE -amount END)`,
    })
    .from(glEntries)
    .innerJoin(glAccounts, eq(glEntries.accountId, glAccounts.id))
    .where(and(
      eq(glAccounts.category, 'asset'),
      lte(glEntries.date, input.asOfDate),
    ))
    .groupBy(glAccounts.id);

    // Query liabilities
    const liabilities = await db.select({
      accountName: glAccounts.name,
      balance: sql<number>`SUM(CASE WHEN type = 'credit' THEN amount ELSE -amount END)`,
    })
    .from(glEntries)
    .innerJoin(glAccounts, eq(glEntries.accountId, glAccounts.id))
    .where(and(
      eq(glAccounts.category, 'liability'),
      lte(glEntries.date, input.asOfDate),
    ))
    .groupBy(glAccounts.id);

    // Query equity
    const equity = await db.select({
      accountName: glAccounts.name,
      balance: sql<number>`SUM(CASE WHEN type = 'credit' THEN amount ELSE -amount END)`,
    })
    .from(glEntries)
    .innerJoin(glAccounts, eq(glEntries.accountId, glAccounts.id))
    .where(and(
      eq(glAccounts.category, 'equity'),
      lte(glEntries.date, input.asOfDate),
    ))
    .groupBy(glAccounts.id);

    const report = {
      asOfDate: input.asOfDate,
      assets,
      liabilities,
      equity,
      totalAssets: assets.reduce((sum, a) => sum + a.balance, 0),
      totalLiabilities: liabilities.reduce((sum, l) => sum + l.balance, 0),
      totalEquity: equity.reduce((sum, e) => sum + e.balance, 0),
    };

    if (input.format === 'json') return report;
    if (input.format === 'csv') return generateCsv(report);
    if (input.format === 'pdf') return generatePdf(report);
  }),

// generateIncomeStatement - similar pattern
```

---

#### TERP-0001: Dashboard Backend Data Accuracy (8-16 hours)

**Files:**
- `server/routers/dashboard.ts`
- `server/dashboardHelpers.ts`
- `server/routers/analytics.ts`

**Problems:**
1. Hardcoded profit margins (25%)
2. Inconsistent time-period filters
3. N+1 client name lookups

**Fixes:**
```typescript
// 1. Replace hardcoded profit margin:
// BEFORE:
const profitMargin = 0.25;

// AFTER:
const profitMargin = await calculateActualProfitMargin(invoiceId);

async function calculateActualProfitMargin(invoiceId: number) {
  const lineItems = await db.query.invoiceLineItems.findMany({
    where: eq(invoiceLineItems.invoiceId, invoiceId),
    with: { batch: true },
  });

  const revenue = lineItems.reduce((sum, li) => sum + li.price * li.quantity, 0);
  const cogs = lineItems.reduce((sum, li) => sum + (li.batch?.unitCogs ?? 0) * li.quantity, 0);

  return revenue > 0 ? (revenue - cogs) / revenue : 0;
}

// 2. Use bulk query for client names:
// BEFORE:
for (const clientId of clientIds) {
  const client = await db.query.clients.findFirst({ where: eq(clients.id, clientId) });
  clientNames[clientId] = client?.name;
}

// AFTER:
const clientsList = await db.query.clients.findMany({
  where: inArray(clients.id, clientIds),
  columns: { id: true, name: true },
});
const clientNames = Object.fromEntries(clientsList.map(c => [c.id, c.name]));

// 3. Add time-period filter consistently:
function applyTimePeriodFilter(query, period: 'LIFETIME' | 'YEAR' | 'QUARTER' | 'MONTH') {
  const now = new Date();
  switch (period) {
    case 'MONTH': return and(query, gte(invoices.createdAt, subMonths(now, 1)));
    case 'QUARTER': return and(query, gte(invoices.createdAt, subMonths(now, 3)));
    case 'YEAR': return and(query, gte(invoices.createdAt, subYears(now, 1)));
    default: return query;
  }
}
```

---

#### TERP-0004: Add Notifications Table to autoMigrate (2-4 hours)

**File:** `server/autoMigrate.ts`

**Problem:** Production can miss `notifications` table.

**Fix:**
```typescript
// Add to autoMigrate:
async function ensureNotificationsTable() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS notifications (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      type VARCHAR(50) NOT NULL,
      title VARCHAR(255) NOT NULL,
      message TEXT,
      is_read BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      read_at TIMESTAMP NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_notifications_user_unread (user_id, is_read)
    )
  `);
  logger.info('Ensured notifications table exists');
}

// Call in migration sequence
```

---

### Phase 2: P2 API Implementations (Days 2-3)

#### API-011: Implement inventory.batch Endpoint (4 hours)

**File:** `server/routers/inventory.ts`
**Used In:** `InventoryWorkSurface.tsx:397`

```typescript
batch: protectedProcedure
  .input(z.object({ batchId: z.number() }))
  .query(async ({ input }) => {
    return db.query.batches.findFirst({
      where: eq(batches.id, input.batchId),
      with: {
        product: true,
        warehouse: true,
        supplier: true,
      },
    });
  }),
```

---

#### API-012: Implement inventory.batches Endpoint (4 hours)

**File:** `server/routers/inventory.ts`
**Used In:** `OrderCreationFlow.tsx:581`

```typescript
batches: protectedProcedure
  .input(z.object({
    productId: z.number().optional(),
    warehouseId: z.number().optional(),
    status: z.enum(['available', 'reserved', 'sold']).optional(),
    limit: z.number().default(50),
  }))
  .query(async ({ input }) => {
    return db.query.batches.findMany({
      where: and(
        input.productId ? eq(batches.productId, input.productId) : undefined,
        input.warehouseId ? eq(batches.warehouseId, input.warehouseId) : undefined,
        input.status ? eq(batches.status, input.status) : undefined,
        isNull(batches.deletedAt),
      ),
      limit: input.limit,
      with: { product: true },
    });
  }),
```

---

#### API-013: Implement orders.confirm Endpoint (4 hours)

**File:** `server/routers/orders.ts`
**Used In:** `OrdersWorkSurface.tsx:390`

```typescript
confirm: protectedProcedure
  .input(z.object({ orderId: z.number() }))
  .mutation(async ({ ctx, input }) => {
    const userId = getAuthenticatedUserId(ctx);

    // Validate order can be confirmed
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, input.orderId),
    });

    if (!order) throw new TRPCError({ code: 'NOT_FOUND' });
    if (order.status !== 'draft') {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Only draft orders can be confirmed',
      });
    }

    // Update status
    await db.update(orders)
      .set({
        status: 'confirmed',
        confirmedAt: new Date(),
        confirmedBy: userId,
      })
      .where(eq(orders.id, input.orderId));

    // Create audit entry
    await createAuditEntry('order.confirmed', { orderId: input.orderId }, userId);

    return { success: true };
  }),
```

---

#### API-014 & API-015: Live Shopping Timeout Endpoints (4 hours total)

**File:** `server/routers/liveShopping.ts`

```typescript
setSessionTimeout: protectedProcedure
  .input(z.object({
    sessionId: z.string(),
    timeoutMinutes: z.number().min(1).max(60),
  }))
  .mutation(async ({ input }) => {
    await sessionTimeoutService.setSessionTimeout(
      input.sessionId,
      input.timeoutMinutes * 60 * 1000,
    );
    return { success: true };
  }),

disableTimeout: protectedProcedure
  .input(z.object({ sessionId: z.string() }))
  .mutation(async ({ input }) => {
    await sessionTimeoutService.disableTimeout(input.sessionId);
    return { success: true };
  }),
```

---

#### API-017: Stock Threshold Configuration (4 hours)

**File:** `server/routers/alerts.ts:379-398`

**Problem:** `setThresholds` throws "not yet available".

**Fix:**
1. Create migration for `minStockLevel` and `targetStockLevel` columns
2. Request via coordination ticket to Team D
3. Implement endpoint after schema update

```typescript
// After schema update:
setThresholds: protectedProcedure
  .input(z.object({
    productId: z.number(),
    minStockLevel: z.number().min(0),
    targetStockLevel: z.number().min(0),
  }))
  .mutation(async ({ ctx, input }) => {
    await db.update(products)
      .set({
        minStockLevel: input.minStockLevel,
        targetStockLevel: input.targetStockLevel,
      })
      .where(eq(products.id, input.productId));

    return { success: true };
  }),
```

---

#### STUB-001 & STUB-002: Live Catalog Stubs (4 hours total)

**File:** `server/services/liveCatalogService.ts`

```typescript
// STUB-001: Brand extraction (line 357)
function extractBrands(inventory: InventoryItem[]): string[] {
  const brands = new Set<string>();
  inventory.forEach(item => {
    if (item.brand) brands.add(item.brand);
  });
  return Array.from(brands).sort();
}

// STUB-002: Price range (line 367)
function calculatePriceRange(inventory: InventoryItem[]): { min: number; max: number } {
  if (inventory.length === 0) return { min: 0, max: 0 };

  const prices = inventory.map(i => i.price).filter(p => p > 0);
  return {
    min: Math.min(...prices),
    max: Math.max(...prices),
  };
}
```

---

### Phase 3: Cleanup (Day 4)

#### DEPR-001: Migrate Deprecated Vendor Router (8 hours)

**File:** `server/routers/vendors.ts`

All calls to `vendors` router should use `clients` with `isSeller=true`.

**Pattern:**
```typescript
// BEFORE:
const vendors = await db.query.vendors.findMany();

// AFTER:
const suppliers = await db.query.clients.findMany({
  where: eq(clients.isSeller, true),
  with: { supplierProfile: true },
});
```

---

#### DEPR-002: Remove Deprecated PO Procedures (2 hours)

**File:** `server/routers/purchaseOrders.ts`

Identify and remove deprecated procedures.

---

#### QUAL-009: Replace console.error with Logger (8 hours)

Search for `console.error` and replace with structured logger.

```bash
grep -r "console.error" server/
```

---

## Verification Protocol

```bash
pnpm check        # 0 TypeScript errors
pnpm lint         # 0 linting errors
pnpm test         # Tests pass
pnpm build        # Build succeeds
```

---

## Creating Your PR

```bash
gh pr create --base staging/integration-sprint-2026-01 \
  --title "Team C: Backend & API Implementations" \
  --body "$(cat <<'EOF'
## Summary
- Implemented SSE-001: Live Shopping event naming
- Implemented API-016: Quote email sending
- Implemented BE-QA-006..008: AR/AP, expenses, financial reports
- Implemented API-011..017: Missing API endpoints
- Fixed TERP-0001: Dashboard data accuracy
- Fixed TERP-0004: Notifications autoMigrate

## New Endpoints
- `accounting.getArSummary`
- `accounting.getApSummary`
- `accounting.cashExpenses.list/create`
- `accounting.reports.generateBalanceSheet/IncomeStatement`
- `inventory.batch`, `inventory.batches`
- `orders.confirm`
- `liveShopping.setSessionTimeout/disableTimeout`

## Verification
- [x] pnpm check passes
- [x] pnpm test passes
- [x] All new endpoints tested
EOF
)"
```

---

## Cross-Team Dependencies

**Blocking you:**
- Team D: For schema changes (API-017 needs stock threshold columns)

**You block:**
- Team B: Frontend needs these APIs
- Team E: Work Surfaces need complete API surface

**Coordination needed:**
- Team A: For `accountingHooks.ts` changes
- Team D: For schema additions

---

## Questions?

Create a coordination ticket or ask Evan.

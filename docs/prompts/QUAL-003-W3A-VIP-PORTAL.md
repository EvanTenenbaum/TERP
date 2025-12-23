# QUAL-003 Wave 3A: VIP Portal Features

**Wave:** 3 (Features & Polish)  
**Agent:** 3A (VIP Portal)  
**Priority:** 🟡 MEDIUM - Feature completion  
**Estimated Time:** 4 hours  
**Dependencies:** Wave 2 complete

---

## Mission

Complete the VIP Portal features including password reset email, credit/supply counts, supply CRUD operations, and order integration.

---

## Files You Own (EXCLUSIVE)

Only you will touch these files. No other agent will modify them.

| File | TODOs |
|------|-------|
| `server/routers/vipPortal.ts` | Lines 176, 315, 317, 656, 677, 691, 804, 814 |
| `server/routers/vipPortalAdmin.ts` | Lines 236, 247 |

---

## Task W3-A1: Send Password Reset Email (Line 176)

**Current Code:**
```typescript
// TODO: Send password reset email
```

**Implementation:**

```typescript
import { sendNotification } from "../services/notificationService";

// In the password reset procedure:
async function requestPasswordReset(email: string) {
  // 1. Find VIP user by email
  const vipUser = await db.query.vipPortalAuth.findFirst({
    where: eq(vipPortalAuth.email, email),
  });

  if (!vipUser) {
    // Don't reveal if email exists
    return { success: true, message: "If the email exists, a reset link will be sent" };
  }

  // 2. Generate reset token
  const resetToken = crypto.randomBytes(32).toString("hex");
  const resetExpiry = new Date(Date.now() + 3600000); // 1 hour

  // 3. Store reset token
  await db
    .update(vipPortalAuth)
    .set({
      resetToken,
      resetTokenExpiry: resetExpiry,
      updatedAt: new Date(),
    })
    .where(eq(vipPortalAuth.id, vipUser.id));

  // 4. Send reset email
  await sendNotification({
    userId: vipUser.clientId, // Use client ID for notification
    title: "Password Reset Request",
    message: `Click here to reset your password: ${process.env.APP_URL}/vip-portal/reset-password?token=${resetToken}`,
    method: "email",
    metadata: {
      type: "password_reset",
      token: resetToken,
      expiresAt: resetExpiry.toISOString(),
    },
  });

  return { success: true, message: "If the email exists, a reset link will be sent" };
}
```

---

## Task W3-A2: Calculate Credit/Supply Counts (Lines 315, 317)

**Current Code (Line 315):**
```typescript
// TODO: Calculate actual credit count
creditCount: 0,
```

**Current Code (Line 317):**
```typescript
// TODO: Calculate actual supply count
supplyCount: 0,
```

**Implementation:**

```typescript
// In the VIP dashboard/summary procedure:
async function getVIPDashboardSummary(clientId: number) {
  // 1. Get credit count (open invoices)
  const creditData = await db
    .select({
      count: sql<number>`COUNT(*)`,
      totalAmount: sql<number>`COALESCE(SUM(total - paid_amount), 0)`,
    })
    .from(invoices)
    .where(
      and(
        eq(invoices.customerId, clientId),
        eq(invoices.status, "open")
      )
    );

  // 2. Get supply count (available batches/inventory)
  const supplyData = await db
    .select({
      count: sql<number>`COUNT(*)`,
      totalQuantity: sql<number>`COALESCE(SUM(quantity_available), 0)`,
    })
    .from(vipSupplies)
    .where(
      and(
        eq(vipSupplies.clientId, clientId),
        eq(vipSupplies.status, "available")
      )
    );

  return {
    creditCount: creditData[0]?.count ?? 0,
    creditAmount: creditData[0]?.totalAmount ?? 0,
    supplyCount: supplyData[0]?.count ?? 0,
    supplyQuantity: supplyData[0]?.totalQuantity ?? 0,
  };
}
```

---

## Task W3-A3: Implement Supply CRUD (Lines 656, 677, 691)

**Current Code (Line 656):**
```typescript
// TODO: Implement supply creation
```

**Current Code (Line 677):**
```typescript
// TODO: Implement supply update
```

**Current Code (Line 691):**
```typescript
// TODO: Implement supply deletion
```

**Implementation:**

```typescript
// Supply CRUD operations
const supplyRouter = {
  // Create supply listing
  createSupply: vipPortalProcedure
    .input(z.object({
      productId: z.number(),
      quantity: z.number().positive(),
      pricePerUnit: z.number().positive(),
      description: z.string().optional(),
      availableFrom: z.date().optional(),
      availableUntil: z.date().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const clientId = ctx.vipSession.clientId;

      const supply = await db.insert(vipSupplies).values({
        clientId,
        productId: input.productId,
        quantity: input.quantity,
        quantityAvailable: input.quantity,
        pricePerUnit: input.pricePerUnit,
        description: input.description,
        availableFrom: input.availableFrom ?? new Date(),
        availableUntil: input.availableUntil,
        status: "available",
        createdAt: new Date(),
      });

      return { supplyId: supply.insertId };
    }),

  // Update supply listing
  updateSupply: vipPortalProcedure
    .input(z.object({
      supplyId: z.number(),
      quantity: z.number().positive().optional(),
      pricePerUnit: z.number().positive().optional(),
      description: z.string().optional(),
      availableUntil: z.date().optional(),
      status: z.enum(["available", "reserved", "sold", "withdrawn"]).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const clientId = ctx.vipSession.clientId;
      const { supplyId, ...updates } = input;

      // Verify ownership
      const supply = await db.query.vipSupplies.findFirst({
        where: and(
          eq(vipSupplies.id, supplyId),
          eq(vipSupplies.clientId, clientId)
        ),
      });

      if (!supply) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Supply not found or not owned by you",
        });
      }

      // Update supply
      await db
        .update(vipSupplies)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(eq(vipSupplies.id, supplyId));

      return { supplyId, updated: true };
    }),

  // Delete (withdraw) supply listing
  deleteSupply: vipPortalProcedure
    .input(z.object({
      supplyId: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      const clientId = ctx.vipSession.clientId;

      // Verify ownership
      const supply = await db.query.vipSupplies.findFirst({
        where: and(
          eq(vipSupplies.id, input.supplyId),
          eq(vipSupplies.clientId, clientId)
        ),
      });

      if (!supply) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Supply not found or not owned by you",
        });
      }

      // Soft delete (withdraw)
      await db
        .update(vipSupplies)
        .set({
          status: "withdrawn",
          deletedAt: new Date(),
        })
        .where(eq(vipSupplies.id, input.supplyId));

      return { supplyId: input.supplyId, deleted: true };
    }),
};
```

---

## Task W3-A4: Add creditLimit and dueDate (Lines 804, 814)

**Current Code (Line 804):**
```typescript
// TODO: Add creditLimit from client
```

**Current Code (Line 814):**
```typescript
// TODO: Add dueDate calculation
```

**Implementation:**

```typescript
// In the client info/invoice procedure:
async function getClientInvoiceInfo(clientId: number) {
  // Get client with credit limit
  const client = await db.query.clients.findFirst({
    where: eq(clients.id, clientId),
    columns: {
      id: true,
      name: true,
      creditLimit: true,
      paymentTerms: true,
    },
  });

  // Get open invoices with due dates
  const openInvoices = await db.query.invoices.findMany({
    where: and(
      eq(invoices.customerId, clientId),
      eq(invoices.status, "open")
    ),
  });

  // Calculate due dates based on payment terms
  const invoicesWithDueDates = openInvoices.map((invoice) => {
    const paymentTermsDays = parsePaymentTerms(client?.paymentTerms ?? "NET30");
    const dueDate = invoice.dueDate ?? addDays(invoice.createdAt, paymentTermsDays);
    const isOverdue = dueDate < new Date();
    const daysUntilDue = differenceInDays(dueDate, new Date());

    return {
      ...invoice,
      dueDate,
      isOverdue,
      daysUntilDue,
    };
  });

  return {
    client: {
      ...client,
      creditLimit: client?.creditLimit ?? 0,
    },
    invoices: invoicesWithDueDates,
    totalOutstanding: openInvoices.reduce((sum, inv) => sum + (inv.total - inv.paidAmount), 0),
    creditAvailable: (client?.creditLimit ?? 0) - openInvoices.reduce((sum, inv) => sum + (inv.total - inv.paidAmount), 0),
  };
}

// Helper to parse payment terms
function parsePaymentTerms(terms: string): number {
  const match = terms.match(/NET(\d+)/i);
  return match ? parseInt(match[1], 10) : 30;
}
```

---

## Task W3-A5: Order Integration in vipPortalAdmin.ts (Lines 236, 247)

**Current Code (Line 236):**
```typescript
// TODO: Integrate with orders service
```

**Current Code (Line 247):**
```typescript
// TODO: Integrate with orders service
```

**Implementation:**

```typescript
// In vipPortalAdmin.ts
import { createOrder, getOrdersByClient } from "../services/orderService";

// Create order from VIP portal
createVIPOrder: adminProcedure
  .input(z.object({
    clientId: z.number(),
    items: z.array(z.object({
      productId: z.number(),
      batchId: z.number().optional(),
      quantity: z.number().positive(),
      unitPrice: z.number().positive(),
    })),
    notes: z.string().optional(),
  }))
  .mutation(async ({ ctx, input }) => {
    const userId = getCurrentUserId(ctx);

    // Create order through orders service
    const order = await createOrder({
      customerId: input.clientId,
      items: input.items,
      notes: input.notes,
      source: "vip_portal",
      createdBy: userId,
    });

    return { orderId: order.id };
  }),

// Get client orders for admin view
getClientOrders: adminProcedure
  .input(z.object({
    clientId: z.number(),
    status: z.enum(["all", "pending", "completed", "cancelled"]).optional(),
    limit: z.number().default(50),
  }))
  .query(async ({ ctx, input }) => {
    const orders = await getOrdersByClient({
      clientId: input.clientId,
      status: input.status === "all" ? undefined : input.status,
      limit: input.limit,
    });

    return orders;
  }),
```

---

## Deliverables Checklist

- [ ] `vipPortal.ts` - Line 176: Password reset email sends via notification service
- [ ] `vipPortal.ts` - Lines 315, 317: Credit and supply counts calculated from actual data
- [ ] `vipPortal.ts` - Lines 656, 677, 691: Supply CRUD operations implemented
- [ ] `vipPortal.ts` - Lines 804, 814: Credit limit and due date added to responses
- [ ] `vipPortalAdmin.ts` - Lines 236, 247: Order integration complete
- [ ] All TODO comments removed from both files

---

## QA Requirements (Before Merge)

```bash
# 1. TypeScript check
pnpm typecheck

# 2. Lint check
pnpm lint

# 3. Verify no TODOs remain
grep -n "TODO" server/routers/vipPortal.ts server/routers/vipPortalAdmin.ts
# Should return nothing (or only unrelated TODOs)

# 4. Run tests
pnpm test vipPortal

# 5. Integration test
# - Request password reset
# - Verify email notification sent
# - Create supply listing
# - Update supply
# - Delete supply
# - Verify credit/supply counts are accurate
```

---

## Do NOT

- ❌ Touch files not in your ownership list
- ❌ Modify authentication flow (only add features)
- ❌ Skip ownership verification for supply operations
- ❌ Introduce new TODOs
- ❌ Expose sensitive data in responses

---

## Dependencies

Use these Wave 0 utilities:
- `getCurrentUserId(ctx)` from `server/_core/authHelpers.ts`
- `sendNotification()` from `server/services/notificationService.ts`

---

## Success Criteria

Your work is complete when:

- [ ] All 10 TODOs resolved (8 in vipPortal.ts, 2 in vipPortalAdmin.ts)
- [ ] Password reset flow works end-to-end
- [ ] Supply CRUD operations work correctly
- [ ] Credit/supply counts are accurate
- [ ] Order integration works
- [ ] `pnpm typecheck` passes
- [ ] `pnpm test` passes
- [ ] Code merged to main

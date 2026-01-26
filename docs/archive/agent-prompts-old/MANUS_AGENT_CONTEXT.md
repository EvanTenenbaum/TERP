# Context for Manus AI Agents

## Quick Reference Guide

**READ THIS FIRST before working on TERP!**

---

## Current State

- React 19 + tRPC + MySQL ERP system
- Basic Clerk authentication
- Direct database access via Drizzle ORM
- Deployed to DigitalOcean

## Future Vision (8 weeks away)

- Secure home office deployment
- Air-gapped core server
- VPN-only access (WireGuard)
- Multi-factor authentication (VPN + device cert + biometric)
- Offline-first PWA
- Redis caching
- Comprehensive monitoring

## Your Mission

**Build features that work NOW but are compatible with the FUTURE architecture.**

---

## Critical Rules

### 1. Use Abstractions

**Auth:**

```typescript
// ✅ GOOD - Uses abstraction
import { authProvider } from "../_core/authProvider";
const user = await authProvider.requireAuth(req);

// ❌ BAD - Direct Clerk call
import { getAuth } from "@clerk/express";
const { userId } = getAuth(req);
```

**Data:**

```typescript
// ✅ GOOD - Uses abstraction
import { dataProvider } from "../_core/dataProvider";
const orders = await dataProvider.query(db => db.select().from(orders));

// ❌ BAD - Direct database call
import { getDb } from "../db";
const db = await getDb();
const orders = await db.select().from(orders);
```

---

### 2. Design for Offline

**Return Full Objects:**

```typescript
// ✅ GOOD - Returns full object
.mutation(async ({ input }) => {
  const order = await ordersDb.createOrder(input);
  return {
    order,  // Full object for optimistic update
    affectedRecords: { orders: [order.id] },  // For cache invalidation
    timestamp: new Date(),  // For conflict resolution
  };
});

// ❌ BAD - Just returns ID
.mutation(async ({ input }) => {
  const orderId = await ordersDb.createOrder(input);
  return { orderId };  // Client needs another query!
});
```

---

### 3. Keep Code Organized

**Routers: THIN (< 50 lines per procedure)**

```typescript
// ✅ GOOD - Thin router
export const ordersRouter = router({
  create: protectedProcedure
    .input(createOrderSchema)
    .mutation(async ({ input, ctx }) => {
      return await ordersDb.createOrder(input, ctx.user.organizationId);
    }),
});

// ❌ BAD - Fat router with business logic
export const ordersRouter = router({
  create: protectedProcedure
    .input(createOrderSchema)
    .mutation(async ({ input, ctx }) => {
      // 100+ lines of business logic here - BAD!
    }),
});
```

**Business Logic: In `*Db.ts` files**

```typescript
// ✅ GOOD - Business logic in ordersDb.ts
export async function createOrder(input: CreateOrderInput, orgId: number) {
  return await dataProvider.transaction(async tx => {
    // All business logic here
  });
}
```

---

### 4. Schema Evolution

**Only Additive Changes:**

```typescript
// ✅ GOOD - Adds new field
export const users = mysqlTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }),
  // NEW: Nullable for backward compatibility
  mfaEnabled: boolean("mfa_enabled").default(false),
});

// ❌ BAD - Renames field (BREAKS CODE!)
export const users = mysqlTable("users", {
  id: serial("id").primaryKey(),
  emailAddress: varchar("email_address", { length: 255 }), // RENAMED!
});
```

---

### 5. Before Pushing - Checklist

- [ ] Uses `authProvider` interface (not Clerk directly)
- [ ] Uses `dataProvider` interface (not `getDb()` directly)
- [ ] Returns full objects (not just IDs)
- [ ] Schema changes are additive only
- [ ] Business logic in `*Db.ts` files
- [ ] Router procedures < 50 lines

---

## File Organization

```
server/
├── _core/                    # Core infrastructure
│   ├── authProvider.ts       # Use this for auth
│   ├── dataProvider.ts       # Use this for data access
│   ├── errors.ts
│   ├── logger.ts
│   └── monitoring.ts
├── auth/                     # Future: MFA goes here
├── routers/                  # THIN - just validation & delegation
│   ├── orders.ts
│   └── ...
├── *Db.ts                    # THICK - all business logic here
│   ├── ordersDb.ts
│   └── ...
└── utils/                    # Shared utilities
```

---

## Common Patterns

### Creating a New Router

```typescript
import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import * as myFeatureDb from "../myFeatureDb";

export const myFeatureRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return await myFeatureDb.listItems(ctx.user.organizationId);
  }),

  create: protectedProcedure
    .input(z.object({ name: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const item = await myFeatureDb.createItem(input, ctx.user.organizationId);
      return {
        item, // Full object
        affectedRecords: { myFeature: [item.id] },
        timestamp: new Date(),
      };
    }),
});
```

### Creating Business Logic

```typescript
import { dataProvider } from "./_core/dataProvider";
import { myFeatureTable } from "./db/schema";

export async function listItems(orgId: number) {
  return await dataProvider.query(async db => {
    return await db
      .select()
      .from(myFeatureTable)
      .where(eq(myFeatureTable.organizationId, orgId));
  });
}

export async function createItem(input: CreateInput, orgId: number) {
  return await dataProvider.transaction(async tx => {
    const [item] = await tx
      .insert(myFeatureTable)
      .values({ ...input, organizationId: orgId })
      .returning();
    return item;
  });
}
```

---

## Questions?

Read the full strategy: `docs/PRODUCT_DEVELOPMENT_STRATEGY.md`

---

**Remember:** Every line of code you write today MUST work in the future architecture. Follow these rules and you'll never waste effort! 🎯

# Creating tRPC Routers

**Last Updated:** 2025-12-31

---

## Overview

This guide explains how to create new tRPC routers for the TERP API. Routers define the API endpoints that the frontend can call.

---

## Router Structure

### Basic Router Template

```typescript
// server/routers/example.ts
import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "../_core/trpc";
import { requirePermission } from "../_core/permissionMiddleware";
import { getDb } from "../db";
import { TRPCError } from "@trpc/server";

export const exampleRouter = router({
  // Query - Read data
  list: protectedProcedure
    .use(requirePermission("example:read"))
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
        search: z.string().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      // Implementation
      return { items: [], total: 0 };
    }),

  // Query - Single item
  getById: protectedProcedure
    .use(requirePermission("example:read"))
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      // Implementation
      return null;
    }),

  // Mutation - Create
  create: protectedProcedure
    .use(requirePermission("example:create"))
    .input(
      z.object({
        name: z.string().min(1).max(255),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      // Implementation
      return { id: 1 };
    }),

  // Mutation - Update
  update: protectedProcedure
    .use(requirePermission("example:update"))
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).max(255).optional(),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      // Implementation
      return { success: true };
    }),

  // Mutation - Delete
  delete: protectedProcedure
    .use(requirePermission("example:delete"))
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      // Implementation
      return { success: true };
    }),
});
```

---

## Procedure Types

### Public Procedure

No authentication required:

```typescript
import { publicProcedure } from "../_core/trpc";

export const healthRouter = router({
  check: publicProcedure.query(() => {
    return { status: "healthy" };
  }),
});
```

### Protected Procedure

Requires authenticated user:

```typescript
import { protectedProcedure } from "../_core/trpc";

export const profileRouter = router({
  me: protectedProcedure.query(({ ctx }) => {
    return ctx.user; // User is guaranteed to exist
  }),
});
```

### Admin Procedure

Requires admin role:

```typescript
import { adminProcedure } from "../_core/trpc";

export const adminRouter = router({
  listUsers: adminProcedure.query(async () => {
    // Only admins can access
  }),
});
```

---

## Permission Middleware

Use `requirePermission` for granular access control:

```typescript
import { requirePermission } from "../_core/permissionMiddleware";

export const ordersRouter = router({
  // Requires orders:read permission
  list: protectedProcedure
    .use(requirePermission("orders:read"))
    .query(async () => {
      /* ... */
    }),

  // Requires orders:create permission
  create: protectedProcedure
    .use(requirePermission("orders:create"))
    .mutation(async () => {
      /* ... */
    }),

  // Requires orders:delete permission
  delete: protectedProcedure
    .use(requirePermission("orders:delete"))
    .mutation(async () => {
      /* ... */
    }),
});
```

### Permission Format

Permissions follow the pattern: `{resource}:{action}`

- `orders:read` - View orders
- `orders:create` - Create orders
- `orders:update` - Modify orders
- `orders:delete` - Delete orders
- `orders:*` - All order actions
- `*:*` - Full admin access

---

## Input Validation

Use Zod for type-safe input validation:

### Basic Types

```typescript
z.string()           // String
z.number()           // Number
z.boolean()          // Boolean
z.date()             // Date
z.enum(["A", "B"])   // Enum
z.array(z.string())  // Array
z.object({ ... })    // Object
```

### Modifiers

```typescript
z.string().min(1); // Minimum length
z.string().max(255); // Maximum length
z.number().positive(); // Must be positive
z.number().int(); // Must be integer
z.string().email(); // Must be email
z.string().optional(); // Optional field
z.string().default("value"); // Default value
z.string().nullable(); // Can be null
```

### Complex Validation

```typescript
const createOrderSchema = z.object({
  clientId: z.number().positive(),
  items: z
    .array(
      z.object({
        batchId: z.number(),
        quantity: z.number().positive(),
        unitPrice: z.number().min(0),
      })
    )
    .min(1, "At least one item required"),
  notes: z.string().max(1000).optional(),
  priority: z.enum(["LOW", "NORMAL", "HIGH"]).default("NORMAL"),
});
```

### Transform and Refine

```typescript
// Transform input
const searchSchema = z.object({
  query: z.string().transform(s => s.trim().toLowerCase()),
});

// Custom validation
const dateRangeSchema = z
  .object({
    startDate: z.date(),
    endDate: z.date(),
  })
  .refine(data => data.endDate >= data.startDate, {
    message: "End date must be after start date",
  });
```

---

## Error Handling

Use TRPCError for consistent error responses:

```typescript
import { TRPCError } from "@trpc/server";

export const ordersRouter = router({
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const order = await db.query.orders.findFirst({
        where: eq(orders.id, input.id),
      });

      if (!order) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Order ${input.id} not found`,
        });
      }

      return order;
    }),
});
```

### Error Codes

| Code                    | HTTP Status | Use Case           |
| ----------------------- | ----------- | ------------------ |
| `BAD_REQUEST`           | 400         | Invalid input      |
| `UNAUTHORIZED`          | 401         | Not logged in      |
| `FORBIDDEN`             | 403         | No permission      |
| `NOT_FOUND`             | 404         | Resource not found |
| `CONFLICT`              | 409         | Duplicate/conflict |
| `INTERNAL_SERVER_ERROR` | 500         | Server error       |

---

## Pagination

Use the pagination utilities for consistent responses:

```typescript
import {
  paginationInputSchema,
  createPaginatedResponse,
  getPaginationParams,
} from "../_core/pagination";

export const clientsRouter = router({
  list: protectedProcedure
    .input(
      paginationInputSchema.extend({
        search: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const { limit, offset } = getPaginationParams(input);

      const [items, total] = await Promise.all([
        db.query.clients.findMany({
          limit,
          offset,
          where: input.search
            ? like(clients.name, `%${input.search}%`)
            : undefined,
        }),
        db.select({ count: sql`count(*)` }).from(clients),
      ]);

      return createPaginatedResponse(items, total[0].count, limit, offset);
    }),
});
```

### Pagination Response Format

```typescript
{
  items: T[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}
```

---

## Nested Routers

Group related procedures:

```typescript
export const accountingRouter = router({
  // Top-level procedures
  getSummary: protectedProcedure.query(async () => {
    /* ... */
  }),

  // Nested router for accounts
  accounts: router({
    list: protectedProcedure.query(async () => {
      /* ... */
    }),
    create: protectedProcedure.mutation(async () => {
      /* ... */
    }),
  }),

  // Nested router for invoices
  invoices: router({
    list: protectedProcedure.query(async () => {
      /* ... */
    }),
    create: protectedProcedure.mutation(async () => {
      /* ... */
    }),
  }),
});
```

Access nested procedures:

```typescript
// Client-side
trpc.accounting.accounts.list.useQuery();
trpc.accounting.invoices.create.useMutation();
```

---

## Registering Routers

Add new routers to the main router:

```typescript
// server/routers.ts
import { router } from "./_core/trpc";
import { exampleRouter } from "./routers/example";
// ... other imports

export const appRouter = router({
  example: exampleRouter,
  // ... other routers
});

export type AppRouter = typeof appRouter;
```

---

## Testing Routers

### Unit Test Example

```typescript
// server/routers/__tests__/example.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { createTestContext } from "../../test-utils";
import { exampleRouter } from "../example";

describe("Example Router", () => {
  let ctx: ReturnType<typeof createTestContext>;

  beforeEach(() => {
    ctx = createTestContext({ userId: 1 });
  });

  describe("list", () => {
    it("should return paginated results", async () => {
      const caller = exampleRouter.createCaller(ctx);

      const result = await caller.list({ limit: 10 });

      expect(result).toHaveProperty("items");
      expect(result).toHaveProperty("total");
      expect(result.items).toBeInstanceOf(Array);
    });
  });

  describe("create", () => {
    it("should create a new item", async () => {
      const caller = exampleRouter.createCaller(ctx);

      const result = await caller.create({
        name: "Test Item",
        description: "Test description",
      });

      expect(result).toHaveProperty("id");
      expect(result.id).toBeGreaterThan(0);
    });
  });
});
```

---

## Best Practices

1. **Always validate input** with Zod schemas
2. **Use appropriate procedure types** (public, protected, admin)
3. **Apply permission middleware** for granular access control
4. **Handle errors** with TRPCError and appropriate codes
5. **Use pagination** for list endpoints
6. **Keep routers focused** - one domain per router
7. **Document complex logic** with comments
8. **Write tests** for all procedures

---

## Checklist for New Routers

- [ ] Created router file in `server/routers/`
- [ ] Defined input schemas with Zod
- [ ] Applied appropriate procedure types
- [ ] Added permission middleware
- [ ] Implemented error handling
- [ ] Added pagination for list endpoints
- [ ] Registered in `server/routers.ts`
- [ ] Added API documentation
- [ ] Written unit tests

---

_For questions, see the [API Documentation](../api/README.md) or ask in the team channel._

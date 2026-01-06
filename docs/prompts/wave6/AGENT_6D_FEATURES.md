# Agent 6D: Feature Enhancements

**Estimated Time**: 16-24 hours  
**Priority**: MEDIUM - New functionality  
**Dependencies**: None (can start immediately)

---

## Mission

Implement high-value feature enhancements from the roadmap.

---

## Context

Key features needed:
- FEATURE-011: Unified Product Catalogue - Foundation for sales workflow
- QA-041: Inbox/Todo Unification - Streamline task management

**IMPORTANT**: 
- Schema is in `drizzle/schema.ts` (NOT shared/schema/)
- Database is MySQL (NOT PostgreSQL)
- Router registration is in `server/routers.ts` (NOT server/routers/index.ts)
- There's already a ProductsPage.tsx at /products - check if it can be enhanced

---

## Prompt

```
You are working on the TERP cannabis ERP project.

## Setup
gh repo clone EvanTenenbaum/TERP
cd TERP
pnpm install

## Your Mission: Feature Enhancements

### Task 1: Unified Product Catalogue (FEATURE-011) - 12-16h

#### 1.1 Check Existing Implementation
FIRST, check what already exists:
ls -la client/src/pages/ProductsPage.tsx
cat client/src/pages/ProductsPage.tsx | head -50
grep -rn "products\|Products" server/routers/ | head -10

There's already a ProductsPage.tsx - review it to understand current state.

#### 1.2 Check Existing Schema
Schema is in drizzle/schema.ts (single file, NOT a directory):
grep -n "products\|Products\|catalogue\|catalog" drizzle/schema.ts | head -20

#### 1.3 Add Schema if Needed
If product catalogue schema doesn't exist, add to drizzle/schema.ts:

**NOTE**: TERP uses MySQL, not PostgreSQL. Use mysql-core imports:

```typescript
// Add to drizzle/schema.ts (MySQL syntax)
import {
  int,
  mysqlTable,
  text,
  timestamp,
  varchar,
  decimal,
  boolean,
  json,
} from "drizzle-orm/mysql-core";

export const productCatalogue = mysqlTable("product_catalogue", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  sku: varchar("sku", { length: 100 }).unique(),
  
  // Categorization
  categoryId: int("categoryId").references(() => categories.id),
  strainId: int("strainId").references(() => strains.id),
  
  // Pricing
  basePrice: decimal("basePrice", { precision: 10, scale: 2 }),
  unit: varchar("unit", { length: 50 }).default("unit"),
  
  // Status
  isActive: boolean("isActive").default(true),
  deletedAt: timestamp("deleted_at"), // Soft delete support
  
  // Metadata
  metadata: json("metadata"),
  
  // Timestamps
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ProductCatalogue = typeof productCatalogue.$inferSelect;
export type NewProductCatalogue = typeof productCatalogue.$inferInsert;
```

#### 1.4 Create Server Router
Create server/routers/productCatalogue.ts:

```typescript
import { z } from 'zod';
import { router, protectedProcedure } from '../_core/trpc';
import { productCatalogue } from '../../drizzle/schema';
import { db } from '../db';
import { eq, like, and, desc, isNull } from 'drizzle-orm';

const productSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  sku: z.string().max(100).optional(),
  categoryId: z.number().optional(),
  strainId: z.number().optional(),
  basePrice: z.string().optional(),
  unit: z.string().default('unit'),
  isActive: z.boolean().default(true),
  metadata: z.record(z.unknown()).optional(),
});

export const productCatalogueRouter = router({
  list: protectedProcedure
    .input(z.object({
      search: z.string().optional(),
      categoryId: z.number().optional(),
      isActive: z.boolean().optional(),
      limit: z.number().default(50),
      offset: z.number().default(0),
    }))
    .query(async ({ input }) => {
      const conditions = [isNull(productCatalogue.deletedAt)];
      
      if (input.search) {
        conditions.push(like(productCatalogue.name, `%${input.search}%`));
      }
      if (input.categoryId) {
        conditions.push(eq(productCatalogue.categoryId, input.categoryId));
      }
      if (input.isActive !== undefined) {
        conditions.push(eq(productCatalogue.isActive, input.isActive));
      }

      const products = await db
        .select()
        .from(productCatalogue)
        .where(and(...conditions))
        .orderBy(desc(productCatalogue.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      return products;
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const [product] = await db
        .select()
        .from(productCatalogue)
        .where(and(
          eq(productCatalogue.id, input.id),
          isNull(productCatalogue.deletedAt)
        ));
      return product;
    }),

  create: protectedProcedure
    .input(productSchema)
    .mutation(async ({ input }) => {
      const result = await db
        .insert(productCatalogue)
        .values(input);
      return { id: result.insertId };
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      data: productSchema.partial(),
    }))
    .mutation(async ({ input }) => {
      await db
        .update(productCatalogue)
        .set(input.data)
        .where(eq(productCatalogue.id, input.id));
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      // Soft delete
      await db
        .update(productCatalogue)
        .set({ deletedAt: new Date() })
        .where(eq(productCatalogue.id, input.id));
      return { success: true };
    }),
});
```

#### 1.5 Register Router
In server/routers.ts (NOT server/routers/index.ts):

Add import at top:
```typescript
import { productCatalogueRouter } from './routers/productCatalogue';
```

Add to appRouter object (around line 115):
```typescript
productCatalogue: productCatalogueRouter,
```

#### 1.6 Update or Create Page Component
Check if ProductsPage.tsx needs enhancement or create ProductCataloguePage.tsx.

Use existing patterns from similar pages (e.g., ClientsListPage.tsx, VendorsPage.tsx):
- DataTable with search/filter
- Create/Edit dialog using shadcn/ui
- Delete confirmation
- Follow existing code style

#### 1.7 Add Route (if needed)
Check client/src/App.tsx - /products route may already exist.
If not, add it.

### Task 2: Inbox/Todo Unification Analysis (QA-041) - 4-8h

#### 2.1 Analyze Current State
Review these files:
- client/src/pages/TodoListsPage.tsx
- client/src/pages/TodoListDetailPage.tsx
- client/src/pages/InboxPage.tsx (429 bytes - very small)
- server/routers/todoLists.ts
- server/routers/todoTasks.ts
- server/routers/inbox.ts

#### 2.2 Document Findings
Create a brief analysis:
- What does Inbox do?
- What does Todo do?
- Are they similar enough to merge?
- What would merging require?

#### 2.3 If Simple to Merge (< 8h additional work):
- Create unified TasksPage.tsx
- Support filtering by "inbox" vs "todo" type
- Migrate UI to single interface

#### 2.4 If Complex (> 8h):
- Document why in PR description
- Create GitHub issue with detailed plan
- Leave current implementation intact

### Task 3: Verify Everything Works

1. pnpm check (must pass)
2. Generate migration if schema changed: pnpm drizzle-kit generate
3. pnpm build (must complete)
4. Test the product catalogue page manually

### Task 4: Create PR

git checkout -b feat/product-catalogue
git add -A
git commit -m "feat: add unified product catalogue (FEATURE-011)

- Add productCatalogue schema with category/strain relations
- Add CRUD API endpoints with soft delete
- Enhance ProductCataloguePage with search/filter
- Add navigation link

QA-041 Analysis:
- [Document your findings about inbox/todo unification]"

git push origin feat/product-catalogue
gh pr create --title "feat: add product catalogue and inbox/todo analysis" --body "..."
```

---

## Success Criteria

- [ ] Product catalogue schema created (in drizzle/schema.ts)
- [ ] CRUD API endpoints work
- [ ] ProductCataloguePage renders and functions
- [ ] Route and navigation added
- [ ] Inbox/Todo analysis documented
- [ ] pnpm check passes
- [ ] pnpm build passes

---

## Files Created/Modified

| File | Change |
|------|--------|
| drizzle/schema.ts | Add productCatalogue table |
| server/routers/productCatalogue.ts | NEW - API endpoints |
| server/routers.ts | Register new router |
| client/src/pages/ProductCataloguePage.tsx | NEW or enhance existing |
| client/src/App.tsx | Add route (if needed) |
| client/src/components/DashboardLayout.tsx | Add navigation link |
| drizzle/migrations/XXXX_*.sql | NEW - Migration (auto-generated) |

---

## Merge Priority

**Merge LAST** - New features are most likely to need rebasing after other changes.

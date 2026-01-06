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

#### 1.1 Check Existing Schema
Look for existing product-related schemas:
ls -la shared/schema/
grep -rn "product\|Product\|catalogue\|catalog" shared/schema/

#### 1.2 Create/Update Schema
If not exists, create shared/schema/productCatalogue.ts:

```typescript
import { pgTable, serial, varchar, text, decimal, integer, boolean, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { strains } from './strains';
import { categories } from './categories';

export const productCatalogue = pgTable('product_catalogue', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  sku: varchar('sku', { length: 100 }).unique(),
  
  // Categorization
  categoryId: integer('category_id').references(() => categories.id),
  strainId: integer('strain_id').references(() => strains.id),
  
  // Pricing
  basePrice: decimal('base_price', { precision: 10, scale: 2 }),
  unit: varchar('unit', { length: 50 }).default('unit'), // unit, gram, oz, etc.
  
  // Status
  isActive: boolean('is_active').default(true),
  
  // Metadata
  metadata: jsonb('metadata'),
  
  // Timestamps
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const productCatalogueRelations = relations(productCatalogue, ({ one }) => ({
  category: one(categories, {
    fields: [productCatalogue.categoryId],
    references: [categories.id],
  }),
  strain: one(strains, {
    fields: [productCatalogue.strainId],
    references: [strains.id],
  }),
}));

export type ProductCatalogue = typeof productCatalogue.$inferSelect;
export type NewProductCatalogue = typeof productCatalogue.$inferInsert;
```

#### 1.3 Create Server Router
Create server/routers/productCatalogue.ts:

```typescript
import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { productCatalogue } from '../../shared/schema/productCatalogue';
import { db } from '../db';
import { eq, ilike, and, desc } from 'drizzle-orm';

const productSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  sku: z.string().max(100).optional(),
  categoryId: z.number().optional(),
  strainId: z.number().optional(),
  basePrice: z.string().optional(), // Decimal as string
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
      const conditions = [];
      
      if (input.search) {
        conditions.push(ilike(productCatalogue.name, `%${input.search}%`));
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
        .where(conditions.length > 0 ? and(...conditions) : undefined)
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
        .where(eq(productCatalogue.id, input.id));
      return product;
    }),

  create: protectedProcedure
    .input(productSchema)
    .mutation(async ({ input }) => {
      const [product] = await db
        .insert(productCatalogue)
        .values(input)
        .returning();
      return product;
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      data: productSchema.partial(),
    }))
    .mutation(async ({ input }) => {
      const [product] = await db
        .update(productCatalogue)
        .set({ ...input.data, updatedAt: new Date() })
        .where(eq(productCatalogue.id, input.id))
        .returning();
      return product;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db
        .delete(productCatalogue)
        .where(eq(productCatalogue.id, input.id));
      return { success: true };
    }),
});
```

#### 1.4 Register Router
In server/routers/index.ts:
```typescript
import { productCatalogueRouter } from './productCatalogue';
// Add to appRouter:
productCatalogue: productCatalogueRouter,
```

#### 1.5 Create Page Component
Create client/src/pages/ProductCataloguePage.tsx:

Use existing patterns from similar pages (e.g., ClientsPage, InventoryPage):
- DataTable with search/filter
- Create/Edit dialog
- Delete confirmation
- Use shadcn/ui components

#### 1.6 Add Route
In client/src/App.tsx:
```typescript
import { ProductCataloguePage } from './pages/ProductCataloguePage';
// Add route:
<Route path="/products" element={<ProductCataloguePage />} />
```

#### 1.7 Add Navigation
In the sidebar component, add link to /products

### Task 2: Inbox/Todo Unification Analysis (QA-041) - 4-8h

#### 2.1 Analyze Current State
Review these files:
- client/src/pages/TodoListsPage.tsx
- client/src/pages/TodoListDetailPage.tsx
- client/src/pages/InboxPage.tsx (if exists)
- server/routers/todoLists.ts
- server/routers/todoTasks.ts

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
2. Create migration if needed: pnpm drizzle-kit generate
3. pnpm build (must complete)
4. Test the new product catalogue page manually

### Task 4: Create PR

git checkout -b feat/product-catalogue
git add -A
git commit -m "feat: add unified product catalogue (FEATURE-011)

- Add productCatalogue schema with category/strain relations
- Add CRUD API endpoints
- Add ProductCataloguePage with search/filter
- Add navigation link

QA-041 Analysis:
- [Document your findings about inbox/todo unification]"

git push origin feat/product-catalogue
gh pr create --title "feat: add product catalogue and inbox/todo analysis" --body "..."
```

---

## Success Criteria

- [ ] Product catalogue schema created
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
| shared/schema/productCatalogue.ts | NEW - Schema definition |
| server/routers/productCatalogue.ts | NEW - API endpoints |
| server/routers/index.ts | Register new router |
| client/src/pages/ProductCataloguePage.tsx | NEW - UI component |
| client/src/App.tsx | Add route |
| Sidebar component | Add navigation link |
| drizzle/migrations/XXXX_product_catalogue.sql | NEW - Migration |

---

## Merge Priority

**Merge LAST** - New features are most likely to need rebasing after other changes.

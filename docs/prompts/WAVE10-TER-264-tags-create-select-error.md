# TER-264: tags.create Duplicate-Check SELECT Error

**Wave:** 10 — Infrastructure & Edge Cases
**Priority:** HIGH | **Mode:** STRICT
**Estimate:** 4h

---

## Context

The `tags.create` mutation fails with a SELECT query error during the duplicate-name check. The `tags` table schema has column naming inconsistencies (camelCase DB column names mixed with snake_case).

## Root Cause Analysis

The `tags` table schema (`drizzle/schema.ts` line 521):

```typescript
export const tags = mysqlTable("tags", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  deletedAt: timestamp("deleted_at"),                           // ✅ snake_case
  standardizedName: varchar("standardizedName", { length: 100 }),  // ❌ camelCase DB name!
  category: mysqlEnum("category", [...]).default("CUSTOM"),     // ✅ correct
  color: varchar("color", { length: 7 }).default("#6B7280"),    // ✅ correct
  description: text("description"),                             // ✅ correct
  createdAt: timestamp("createdAt").defaultNow().notNull(),     // ❌ camelCase DB name!
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow(), // ❌ camelCase DB name!
});
```

**Three columns use camelCase for their DB column name** instead of snake_case:

1. `standardizedName` → DB column `standardizedName` (should be `standardized_name`)
2. `createdAt` → DB column `createdAt` (should be `created_at`)
3. `updatedAt` → DB column `updatedAt` (should be `updated_at`)

**The duplicate-check SELECT at line 106 in `tags.ts`:**

```typescript
const [existing] = await db
  .select()
  .from(tags)
  .where(eq(tags.name, input.name))
  .limit(1);
```

A bare `SELECT *` will try to read ALL columns, including `standardizedName`, `createdAt`, and `updatedAt`. If the production DB has these as `standardized_name`, `created_at`, and `updated_at` (snake_case), the query fails with "Unknown column."

**Similarly, the INSERT at line 116 writes `standardizedName` which would fail if the DB column is `standardized_name`.**

## Investigation Steps

1. Read `drizzle/schema.ts` lines 521-539 — the full `tags` table definition
2. Read `server/routers/tags.ts` — the full `create` mutation (line 91-131)
3. Check migration files for the `tags` table creation — what column names were used?
4. Check the `productTags` and `clientTags` junction tables for similar issues
5. Search for other tables with camelCase DB column names: `grep -n '"createdAt"' drizzle/schema.ts`

## Required Fix

### Fix 1: Correct the column naming to snake_case

```typescript
// BEFORE
standardizedName: varchar("standardizedName", { length: 100 }).notNull(),
createdAt: timestamp("createdAt").defaultNow().notNull(),
updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),

// AFTER
standardizedName: varchar("standardized_name", { length: 100 }).notNull(),
createdAt: timestamp("created_at").defaultNow().notNull(),
updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
```

**IMPORTANT:** Before changing these, verify what the production DB actually has. If the migration ran with camelCase names, the DB columns ARE camelCase and the schema is "correct" (matching the DB). In that case, a data migration would be needed to rename the columns. If the migration hasn't been run yet, just fix the schema.

### Fix 2: Check junction tables

The `productTags` table (line 548) also uses camelCase:

```typescript
export const productTags = mysqlTable("productTags", {
  productId: int("productId").notNull(),
  tagId: int("tagId").notNull(),
});
```

This table name and columns are ALL camelCase. Verify if these match production.

### Fix 3: Error handling

The `create` mutation throws plain `Error` instead of `TRPCError`:

```typescript
// Line 103 — should be TRPCError
if (!db) throw new Error("Database not available");

// Line 113 — should be TRPCError with BAD_REQUEST
throw new Error("A tag with this name already exists");
```

Convert to proper TRPCError codes.

### Fix 4: Missing `requirePermission` middleware

The `create` mutation uses `protectedProcedure` but doesn't add `requirePermission(...)`. Add appropriate permission check.

## Key Files

| File                         | Purpose                         |
| ---------------------------- | ------------------------------- |
| `drizzle/schema.ts:521`      | `tags` table definition         |
| `drizzle/schema.ts:548`      | `productTags` junction table    |
| `server/routers/tags.ts:91`  | `create` mutation               |
| `server/routers/tags.ts:136` | `update` mutation (same issues) |
| `drizzle/migrations/`        | Check actual column names used  |

## Verification Checklist

- [ ] All DB column names in tags schema match production (snake_case)
- [ ] Junction tables (productTags, clientTags) column names verified
- [ ] Error types converted to TRPCError
- [ ] `pnpm check` passes
- [ ] `pnpm lint` — no new errors
- [ ] `pnpm test` passes
- [ ] `pnpm build` passes
- [ ] If schema changes: `pnpm test:schema` passes (requires DB)

## Acceptance Criteria

1. `tags.create` successfully creates a tag without query errors
2. Duplicate name check works correctly
3. Column names match production DB exactly
4. No regressions in tag list/update/delete operations

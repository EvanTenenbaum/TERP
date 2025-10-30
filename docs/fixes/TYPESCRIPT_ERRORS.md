# TypeScript Compilation Errors - Fix Guide

**Priority:** 🔴 CRITICAL
**Effort:** 2-3 days
**Impact:** Blocks production builds

---

## Overview

There are **52 TypeScript compilation errors** preventing the codebase from building. This guide provides detailed analysis and fix approaches for each category of error.

**Current Status:**
```bash
pnpm run check
# Returns: 52 errors across multiple files
```

---

## Error Categories

### Category 1: Type Mismatches in API Calls (8 errors)

#### Error: DataCardGrid.tsx:29
```typescript
// ERROR: Type 'string' is not assignable to type union
client/src/components/data-cards/DataCardGrid.tsx(29,7): error TS2769
```

**Root Cause:** The `moduleId` prop is typed as `string` but the API expects a specific union type.

**Analysis:**
- File: `client/src/components/data-cards/DataCardGrid.tsx` line 29
- Issue: `moduleId` is coming from props as string, but tRPC expects: `"clients" | "orders" | "vendor_supply" | "inventory" | "accounting" | "quotes"`
- The component receives `moduleId` as a string prop but doesn't validate it matches the union

**Fix Approach:**
1. **Option A (Recommended):** Add type assertion with validation
   ```typescript
   const validModuleIds = ["clients", "orders", "vendor_supply", "inventory", "accounting", "quotes"] as const;
   type ModuleId = typeof validModuleIds[number];

   // Validate at runtime
   if (!validModuleIds.includes(moduleId as any)) {
     throw new Error(`Invalid moduleId: ${moduleId}`);
   }

   // Then cast safely
   const typedModuleId = moduleId as ModuleId;
   ```

2. **Option B:** Change component prop type to union
   ```typescript
   interface DataCardGridProps {
     moduleId: "clients" | "orders" | "vendor_supply" | "inventory" | "accounting" | "quotes";
     // ... other props
   }
   ```

**Files to Check:**
- `client/src/components/data-cards/DataCardGrid.tsx` - Main component
- Any parent components passing `moduleId` prop
- API schema in server routers

---

#### Error: StrainInput.tsx:52
```typescript
// ERROR: 'threshold' does not exist in type
client/src/components/inventory/StrainInput.tsx(52,7): error TS2769
```

**Root Cause:** API schema changed but component still sends old field name.

**Analysis:**
- Component is sending `threshold` parameter
- API schema doesn't define this field
- Likely renamed or removed in API update

**Fix Approach:**
1. Check the actual API schema definition:
   ```typescript
   // Find the router definition for strain search
   // Likely in server/routers/strains.ts
   ```

2. Either:
   - Remove `threshold` from the API call if no longer needed
   - Update to new field name if renamed
   - Add `threshold` to API schema if still needed

**Investigation Needed:**
- Check `server/routers/strains.ts` for search endpoint schema
- Check git history for recent changes to strain API
- Verify what threshold was meant to control

---

### Category 2: Missing Properties on Types (5 errors)

#### Error: BatchDetailDrawer.tsx:277
```typescript
// ERROR: Property 'product' does not exist on type Batch
client/src/components/inventory/BatchDetailDrawer.tsx(277,22): error TS2551
```

**Root Cause:** Component expects joined data but TypeScript type doesn't reflect the join.

**Analysis:**
- Component expects `batch.product` to exist
- The `Batch` type from schema doesn't include joined relations
- Multiple locations in same file: lines 277, 280, 286, 290

**Fix Approach:**
1. **Create Extended Type:**
   ```typescript
   // In types file or component
   import type { Batch, Product } from '@/drizzle/schema';

   interface BatchWithProduct extends Batch {
     product: Product | null;
   }
   ```

2. **Update API Return Type:**
   ```typescript
   // In server router
   getById: publicProcedure
     .input(z.object({ id: z.number() }))
     .query(async ({ input }) => {
       const result = await db
         .select({
           batch: batches,
           product: products,
         })
         .from(batches)
         .leftJoin(products, eq(batches.productId, products.id))
         .where(eq(batches.id, input.id));

       return {
         ...result[0].batch,
         product: result[0].product,
       } as BatchWithProduct;
     }),
   ```

3. **Update Component:**
   ```typescript
   const { data: batch } = trpc.inventory.getById.useQuery<BatchWithProduct>({ id });

   // Now batch.product is properly typed
   ```

**Pattern to Apply:**
- Define extended types for all joined queries
- Update router return types to match
- Use TypeScript generics in useQuery hooks

**Files Affected:**
- `client/src/components/inventory/BatchDetailDrawer.tsx`
- Type definitions (create if needed)
- `server/routers/inventory.ts` (verify return type)

---

### Category 3: Async/Await Mistakes (2 errors)

#### Error: StrainInput.tsx:61
```typescript
// ERROR: Property 'then' does not exist on type UseTRPCQueryResult
client/src/components/inventory/StrainInput.tsx(61,52): error TS2339
```

**Root Cause:** Treating tRPC query hook result as a Promise.

**Analysis:**
- Code tries to use `.then()` on a React Query result
- tRPC hooks return query results, not Promises
- Data is accessed via `result.data`, not `await result`

**Fix Approach:**
```typescript
// ❌ WRONG: Treating as Promise
const result = trpc.strains.getById.useQuery({ id });
result.then((data) => { /* ... */ });

// ✅ CORRECT: Use React Query pattern
const { data, isLoading, error } = trpc.strains.getById.useQuery({ id });

useEffect(() => {
  if (data) {
    // Use data here
  }
}, [data]);
```

**Pattern:**
- Never use `.then()` on tRPC query hooks
- Access data via destructuring
- Use `useEffect` to react to data changes
- Check `isLoading` before accessing data

---

#### Error: StrainInput.tsx:83
```typescript
// ERROR: Property 'mutate' does not exist
client/src/components/inventory/StrainInput.tsx(83,51): error TS2339
```

**Root Cause:** Incorrect mutation hook usage.

**Analysis:**
- Trying to call `.mutate()` directly on hook definition
- Should call it on the result of the hook

**Fix Approach:**
```typescript
// ❌ WRONG
trpc.strains.create.mutate({ name: 'Foo' });

// ✅ CORRECT
const createStrain = trpc.strains.create.useMutation();

// Then call it
createStrain.mutate({ name: 'Foo' });
```

---

### Category 4: Database Type Mismatches (4 errors)

#### Error: dataCardMetricsDb.ts:493
```typescript
// ERROR: Argument of type '"OUTSTANDING"' not assignable
server/dataCardMetricsDb.ts(493,11): error TS2769
```

**Root Cause:** Using status value that doesn't exist in enum.

**Analysis:**
- Code uses `"OUTSTANDING"` status
- Invoice status enum doesn't include this value
- Current enum: `"DRAFT" | "SENT" | "VIEWED" | "PARTIAL" | "PAID" | "OVERDUE" | "VOID"`

**Fix Approach:**
1. **Check Schema:**
   ```typescript
   // drizzle/schema.ts - look for invoiceStatusEnum
   export const invoiceStatusEnum = mysqlEnum("invoiceStatus", [
     "DRAFT", "SENT", "VIEWED", "PARTIAL", "PAID", "OVERDUE", "VOID"
   ]);
   ```

2. **Fix Query:**
   ```typescript
   // ❌ WRONG
   .where(eq(invoices.status, "OUTSTANDING"))

   // ✅ CORRECT - use appropriate status(es)
   .where(
     or(
       eq(invoices.status, "SENT"),
       eq(invoices.status, "VIEWED"),
       eq(invoices.status, "PARTIAL"),
       eq(invoices.status, "OVERDUE")
     )
   )

   // OR check for unpaid amount
   .where(gt(invoices.amountDue, 0))
   ```

**Same Issue for Bills:**
- Line 523: Same pattern with bills status
- Bill status enum: `"DRAFT" | "PENDING" | "PARTIAL" | "PAID" | "OVERDUE" | "VOID" | "APPROVED"`
- Use same fix approach

**Files to Fix:**
- `server/dataCardMetricsDb.ts` (lines 493, 523)

---

#### Error: inventoryDb.ts:689
```typescript
// ERROR: Property 'insertId' does not exist on type MySqlRawQueryResult
server/inventoryDb.ts(689,29): error TS2339
```

**Root Cause:** Using MySQL-specific property on generic result type.

**Analysis:**
- `insertId` is MySQL-specific
- Drizzle's type system doesn't expose it directly
- Need to cast or use different approach

**Fix Approach:**
1. **Option A: Cast the result**
   ```typescript
   const result = await db.execute(sql`INSERT INTO ...`) as any;
   const insertId = result.insertId;
   ```

2. **Option B: Use Drizzle ORM insert (Recommended)**
   ```typescript
   const [result] = await db.insert(batches).values({
     // ... values
   });

   // Drizzle returns the inserted record
   const batchId = result.id;
   ```

3. **Option C: Define proper type**
   ```typescript
   interface MySQLInsertResult {
     insertId: number;
     affectedRows: number;
   }

   const result = await db.execute(sql`...`) as MySQLInsertResult;
   ```

**Recommendation:** Use Option B (Drizzle ORM) for type safety.

---

### Category 5: Admin Router Status Enum Issues (9 errors)

#### Errors: admin.ts lines 44, 63, 68, 78, 101, 106, 116, 121, 126
```typescript
// ERROR: Type '"running"' | '"success"' | '"error"' not assignable to type '"pending"'
server/routers/admin.ts
```

**Root Cause:** Missing status values in type definition.

**Analysis:**
- Code assigns `"running"`, `"success"`, `"error"` to status field
- Type definition only allows `"pending"`
- Status type is too restrictive

**Fix Approach:**
1. **Find the Status Type Definition:**
   ```typescript
   // Look for status type definition in admin router or types
   ```

2. **Expand the Type:**
   ```typescript
   type AdminTaskStatus = "pending" | "running" | "success" | "error";

   interface AdminTask {
     id: string;
     status: AdminTaskStatus;
     // ... other fields
   }
   ```

3. **Update All Usages:**
   ```typescript
   // Before
   let status: "pending" = "pending";
   status = "running"; // ❌ Error

   // After
   let status: AdminTaskStatus = "pending";
   status = "running"; // ✅ OK
   ```

**Pattern:**
- All admin task status updates need this fix
- 9 locations in admin.ts
- Consider creating shared type in types file

---

### Category 6: Import/Export Errors (6 errors)

#### Error: adminMigrations.ts, adminQuickFix.ts, adminSchemaPush.ts
```typescript
// ERROR: Cannot find module '../trpc'
server/routers/adminMigrations.ts(1,41): error TS2307
```

**Root Cause:** Incorrect import path.

**Analysis:**
- Imports from `'../trpc'`
- Should be `'../_core/trpc'`
- Directory structure changed

**Fix Approach:**
```typescript
// ❌ WRONG
import { router, publicProcedure } from '../trpc';

// ✅ CORRECT
import { router, publicProcedure } from '../_core/trpc';
```

**Files to Fix:**
- `server/routers/adminMigrations.ts`
- `server/routers/adminQuickFix.ts`
- `server/routers/adminSchemaPush.ts`

---

#### Error: db export
```typescript
// ERROR: Module has no exported member 'db'
server/routers/adminMigrations.ts(2,10): error TS2305
```

**Root Cause:** Import uses wrong export name.

**Analysis:**
- Trying to import `db` directly
- Module exports `getDb()` function instead
- Need to update import and usage

**Fix Approach:**
```typescript
// ❌ WRONG
import { db } from '../db';
const users = await db.select().from(usersTable);

// ✅ CORRECT
import { getDb } from '../db';
const db = await getDb();
const users = await db.select().from(usersTable);
```

**Impact:**
- Must add `await getDb()` at start of functions
- Affects multiple admin routers
- Pattern is already used correctly in most other files

---

### Category 7: Null Safety Issues (5 errors)

#### Error: inventory.ts user context
```typescript
// ERROR: 'ctx.user' is possibly 'null'
server/routers/inventory.ts(308,327,341,359,371): error TS18047
```

**Root Cause:** Not checking if user exists before accessing properties.

**Analysis:**
- `ctx.user` can be null if not authenticated
- Code assumes user always exists
- Need null checks or use protectedProcedure

**Fix Approach:**
1. **Option A: Use protectedProcedure (Recommended)**
   ```typescript
   // Instead of publicProcedure
   import { protectedProcedure } from '../_core/trpc';

   myEndpoint: protectedProcedure // Ensures user exists
     .input(...)
     .mutation(async ({ ctx, input }) => {
       // ctx.user is guaranteed to exist
       const userId = ctx.user.id; // ✅ No error
     }),
   ```

2. **Option B: Add null check**
   ```typescript
   myEndpoint: publicProcedure
     .input(...)
     .mutation(async ({ ctx, input }) => {
       if (!ctx.user) {
         throw new Error('Authentication required');
       }
       const userId = ctx.user.id; // ✅ TypeScript knows it's not null
     }),
   ```

**Files to Fix:**
- `server/routers/inventory.ts` (5 locations)

**Pattern:**
- All endpoints that need auth should use `protectedProcedure`
- Check other routers for same issue

---

### Category 8: Service Layer Errors (4 errors)

#### Error: strainService.ts
```typescript
// ERROR: Module has no exported member 'db'
server/services/strainService.ts(13,10): error TS2305
```

**Same as Category 6** - Use `getDb()` instead of `db`.

---

#### Error: fuzzySearchStrains
```typescript
// ERROR: has no exported member named 'fuzzySearchStrains'
server/services/strainService.ts(16,10): error TS2724
```

**Root Cause:** Function was renamed.

**Analysis:**
- Old name: `fuzzySearchStrains`
- New name: `searchStrains`
- Import needs updating

**Fix:**
```typescript
// ❌ WRONG
import { fuzzySearchStrains } from '../strainMatcher';

// ✅ CORRECT
import { searchStrains } from '../strainMatcher';

// Update function calls
const results = searchStrains(query);
```

---

#### Error: Implicit any types
```typescript
// ERROR: Parameter implicitly has 'any' type
server/services/strainService.ts(115,44,123,31): error TS7006
```

**Root Cause:** Function parameters without type annotations.

**Fix Approach:**
```typescript
// ❌ WRONG
function processStrain(v) {
  return v.name;
}

// ✅ CORRECT
import type { Strain } from '../drizzle/schema';

function processStrain(v: Strain) {
  return v.name;
}

// For unknown types
function processData(p: unknown) {
  // Type guard before use
  if (typeof p === 'object' && p !== null) {
    // ...
  }
}
```

---

#### Error: Category type mismatch
```typescript
// ERROR: Type 'string | undefined' not assignable to category union
server/services/strainService.ts(186,36): error TS2345
```

**Root Cause:** Category must be specific enum value.

**Fix Approach:**
```typescript
type StrainCategory = "indica" | "sativa" | "hybrid";

// Validate and cast
function sanitizeCategory(cat: string | undefined): StrainCategory | undefined {
  if (!cat) return undefined;
  const lower = cat.toLowerCase();
  if (lower === "indica" || lower === "sativa" || lower === "hybrid") {
    return lower as StrainCategory;
  }
  return undefined;
}

// Usage
const category = sanitizeCategory(input.category);
```

---

### Category 9: strainMatcher.ts Errors (2 errors)

#### Error: insertId property
```typescript
// ERROR: Property 'insertId' does not exist
server/strainMatcher.ts(455,473): error TS2339
```

**Same as inventoryDb.ts** - Use Drizzle ORM insert or cast result.

---

## Systematic Fix Process

### Step 1: Quick Wins (30 minutes)
Fix import path errors:
```bash
# Files to update:
- server/routers/adminMigrations.ts
- server/routers/adminQuickFix.ts
- server/routers/adminSchemaPush.ts

# Change:
'../trpc' → '../_core/trpc'
'{ db }' → '{ getDb }'
```

### Step 2: Type Definitions (2 hours)
Create missing type definitions:
```bash
# Create: server/types/extended.ts
- BatchWithProduct
- InvoiceWithLineItems
- AdminTaskStatus
- etc.
```

### Step 3: API Schema Fixes (2-3 hours)
Fix schema mismatches:
- DataCardGrid moduleId type
- StrainInput threshold parameter
- Status enum expansions

### Step 4: Null Safety (1 hour)
Replace publicProcedure with protectedProcedure where needed:
- inventory.ts (5 locations)

### Step 5: Database Queries (2 hours)
Fix database type issues:
- Replace raw SQL with Drizzle ORM
- Fix status enum usages
- Add proper type casts

### Step 6: Service Layer (1 hour)
Fix service imports and types:
- strainService.ts
- Update function signatures

### Step 7: Final Verification (30 minutes)
```bash
pnpm run check
# Should show 0 errors
```

---

## Testing After Fixes

```bash
# 1. TypeScript check
pnpm run check

# 2. Run tests
pnpm test

# 3. Build
pnpm build

# 4. Manual smoke test
pnpm dev
# Test: Inventory page, Client needs, Orders
```

---

## Estimated Timeline

- **Day 1 Morning:** Categories 1, 6 (Quick wins + imports)
- **Day 1 Afternoon:** Category 2 (Missing properties)
- **Day 2 Morning:** Categories 4, 5 (Database and admin)
- **Day 2 Afternoon:** Categories 3, 7 (Async and null safety)
- **Day 3 Morning:** Categories 8, 9 (Services)
- **Day 3 Afternoon:** Testing and verification

**Total: 2.5 days**

---

## Notes for AI Developer

### Flexibility Points
- **Type definitions:** Create in dedicated files or inline as you prefer
- **Fix order:** Can be done in any order, but imports/quick wins first is recommended
- **Testing:** Add tests as you fix if you see gaps
- **Refactoring:** If you spot better patterns while fixing, implement them

### Context You Have
- You know the business logic better
- You understand the data flow
- You can make architectural decisions
- Adjust approaches based on what you discover

### Things to Watch
- Check git history if unsure about renames
- Test each category after fixing
- Some errors may cascade-fix (fixing one fixes multiple)
- Update any affected tests

---

## Success Criteria

✅ `pnpm run check` returns 0 errors
✅ All tests still pass
✅ Application builds successfully
✅ Manual smoke test passes
✅ No new type safety violations introduced

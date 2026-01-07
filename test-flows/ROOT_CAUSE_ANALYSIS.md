# TERP Application - Root Cause Analysis Report

**Analysis Date**: January 7, 2026  
**Analyst**: Manus AI Agent  
**Repository**: EvanTenenbaum/TERP  

---

## Executive Summary

This report provides deep technical root cause analysis for the critical bugs discovered during comprehensive user flow testing of the TERP cannabis ERP application. Each bug is traced to its source code location with specific file paths, line numbers, and explanations of the underlying system issues.

---

## Bug 1: Order Creation - Inventory Loading Failure

### Symptom
After selecting a customer in `/orders/create`, the system displays "Failed to load inventory" error, blocking order creation.

### Root Cause Analysis

**Primary Issue: Pricing Engine Failure on Empty Rules**

**File**: `server/pricingEngine.ts` (Lines 332-362)

```typescript
export async function getClientPricingRules(clientId: number): Promise<PricingRule[]> {
  // ...
  const client = clientResult[0];
  
  // If client has a pricing profile, use that
  if (client.pricingProfileId) {
    const profile = await getPricingProfileById(client.pricingProfileId);
    if (profile && profile.rules) {
      const ruleIds = (profile.rules as Array<{ ruleId: number; priority: number }>).map(r => r.ruleId);
      // BUG: If ruleIds is empty array, this creates invalid SQL: IN ()
      const rules = await db.select().from(pricingRules).where(sql`${pricingRules.id} IN (${sql.raw(ruleIds.join(","))})`);
      return rules;
    }
  }
  
  // Similar issue with customPricingRules
  if (client.customPricingRules) {
    const customRules = client.customPricingRules as Array<{ ruleId: number; priority: number }>;
    const ruleIds = customRules.map(r => r.ruleId);
    // BUG: Same issue - empty array creates invalid SQL
    const rules = await db.select().from(pricingRules).where(sql`${pricingRules.id} IN (${sql.raw(ruleIds.join(","))})`);
    return rules;
  }
  
  return [];
}
```

**The Problem**:
1. When a client has a `pricingProfileId` but the profile has an empty `rules` array, or when `customPricingRules` is an empty array, the code generates invalid SQL: `WHERE id IN ()` which causes a database error.
2. The error propagates up through `salesSheetsDb.getInventoryWithPricing()` → `salesSheetsRouter.getInventory` → frontend.

**Secondary Issue: Batch Status Filter**

**File**: `server/salesSheetsDb.ts` (Lines 64-71)

```typescript
const inventoryBatches = await db
  .select()
  .from(batches)
  .where(inArray(batches.batchStatus, ["LIVE", "PHOTOGRAPHY_COMPLETE"]))
  .limit(limit)
  .offset(offset);
```

If no batches have status "LIVE" or "PHOTOGRAPHY_COMPLETE", the inventory returns empty, but this isn't clearly communicated to the user.

### Fix Recommendation

```typescript
// In pricingEngine.ts, add empty array check:
if (client.pricingProfileId) {
  const profile = await getPricingProfileById(client.pricingProfileId);
  if (profile && profile.rules && Array.isArray(profile.rules) && profile.rules.length > 0) {
    const ruleIds = profile.rules.map(r => r.ruleId);
    const rules = await db.select().from(pricingRules).where(inArray(pricingRules.id, ruleIds));
    return rules;
  }
}
```

---

## Bug 2: Retry Button Resets Entire Form

### Symptom
When "Retry" is clicked after inventory loading fails, the entire order form resets including customer selection.

### Root Cause Analysis

**File**: `client/src/pages/OrderCreatorPage.tsx` (Lines 572-579)

```typescript
<Button
  variant="outline"
  size="sm"
  onClick={() => window.location.reload()}  // <-- BUG: Full page reload
  className="mt-4"
>
  Retry
</Button>
```

**The Problem**:
The Retry button uses `window.location.reload()` which completely reloads the page, destroying all React state including the selected customer. This is a lazy implementation that should instead just retry the failed query.

### Fix Recommendation

```typescript
// Use tRPC's refetch instead of page reload:
const { refetch: refetchInventory } = trpc.salesSheets.getInventory.useQuery(
  { clientId: clientId ?? 0 },
  { enabled: !!clientId && clientId > 0, retry: false }
);

// In the button:
<Button
  variant="outline"
  size="sm"
  onClick={() => refetchInventory()}  // Only retry the query
  className="mt-4"
>
  Retry
</Button>
```

---

## Bug 3: Batch Detail View Crashes Application

### Symptom
Clicking "View" on any batch causes React crash: "Cannot read properties of undefined (reading 'map')"

### Root Cause Analysis

**File**: `client/src/components/inventory/BatchDetailDrawer.tsx` (Lines 498, 545)

```typescript
// Line 498 - locations.map
{locations.map(location => (
  <Card key={location.id} className="p-3">
    ...
  </Card>
))}

// Line 545 - auditLogs.map
{auditLogs.slice(0, 10).map(log => (
  <TableRow key={log.id}>
    ...
  </TableRow>
))}
```

**The Problem**:
The component destructures `locations` and `auditLogs` from the query response with default empty arrays:

```typescript
const locations = data?.locations || [];
const auditLogs = data?.auditLogs || [];
```

However, if the API returns `locations: undefined` or `auditLogs: undefined` (not `null`), the `|| []` fallback works. But the crash suggests the API might be returning a malformed response where these fields exist but are set to a non-array value, or there's a race condition where `data` exists but sub-properties don't.

**File**: `server/routers/inventory.ts` (Lines 154-170)

```typescript
getById: protectedProcedure
  .use(requirePermission("inventory:read"))
  .input(validators.positiveInt)
  .query(async ({ input }) => {
    try {
      const batch = await inventoryDb.getBatchById(input);
      if (!batch) throw ErrorCatalog.INVENTORY.BATCH_NOT_FOUND(input);

      const locations = await inventoryDb.getBatchLocations(input);
      const auditLogs = await inventoryDb.getAuditLogsForEntity("Batch", input);

      return {
        batch,
        locations,
        auditLogs,
        availableQty: inventoryUtils.calculateAvailableQty(batch),
      };
    } catch (error) {
      handleError(error, "inventory.getById");
      throw error;
    }
  }),
```

**File**: `server/inventoryDb.ts` (Lines 917-925, 938-952)

```typescript
export async function getBatchLocations(batchId: number) {
  const db = await getDb();
  if (!db) return [];  // Returns empty array if no DB
  // ...
}

export async function getAuditLogsForEntity(...) {
  const db = await getDb();
  if (!db) return [];  // Returns empty array if no DB
  // ...
}
```

**Likely Root Cause**:
The `handleError` function in the catch block might be swallowing the error and returning partial data, or there's a database connection issue causing `getDb()` to return `undefined` intermittently, leading to `[]` being returned but in a way that breaks the response structure.

### Fix Recommendation

```typescript
// In BatchDetailDrawer.tsx, add defensive checks:
const locations = Array.isArray(data?.locations) ? data.locations : [];
const auditLogs = Array.isArray(data?.auditLogs) ? data.auditLogs : [];

// Or use optional chaining with nullish coalescing:
{(locations ?? []).map(location => ...)}
```

---

## Bug 4: Search Returns No Results Despite Data Existing

### Symptom
Searching for "OG Kush" (a product in inventory) returns no results.

### Root Cause Analysis

**File**: `server/routers/search.ts` (Lines 94-113)

```typescript
// Search products (batches)
const products = await db
  .select({
    id: batches.id,
    type: sql<string>`'product'`.as("type"),
    code: batches.code,
    sku: batches.sku,
    batchId: batches.id,
    onHandQty: batches.onHandQty,
    unitCogs: batches.unitCogs,
    createdAt: batches.createdAt,
  })
  .from(batches)
  .where(
    or(
      like(batches.code, searchTerm),  // Only searches code
      like(batches.sku, searchTerm)     // Only searches sku
    )
  )
  .limit(limit);
```

**The Problem**:
The search only queries `batches.code` and `batches.sku` fields. It does NOT search:
- Product name
- Strain name
- Category
- Vendor name
- Any descriptive fields

If "OG Kush" is stored in a product name or strain field (not in `code` or `sku`), it won't be found.

**Database Schema Issue**:
Looking at the batches table, there's no direct `productName` or `strain` field being searched. The batch `code` is typically a system-generated identifier like "BATCH-001", not a product name.

### Fix Recommendation

```typescript
// Expand search to include more relevant fields:
const products = await db
  .select({
    id: batches.id,
    type: sql<string>`'product'`.as("type"),
    code: batches.code,
    sku: batches.sku,
    // ... other fields
  })
  .from(batches)
  .leftJoin(products, eq(batches.productId, products.id))  // Join to products table
  .where(
    or(
      like(batches.code, searchTerm),
      like(batches.sku, searchTerm),
      like(products.name, searchTerm),      // Search product name
      like(products.strain, searchTerm),    // Search strain
      like(products.category, searchTerm),  // Search category
    )
  )
  .limit(limit);
```

---

## Bug 5: Settings - Misleading Authentication Error

### Symptom
Users tab shows "Authentication required. Please log in to perform this action" even though user IS logged in.

### Root Cause Analysis

**File**: `server/routers/userManagement.ts` (Lines 14-16)

```typescript
listUsers: strictlyProtectedProcedure
  .use(requirePermission("users:read"))
  .query(async () => { ... });
```

**File**: `server/_core/trpc.ts` (Lines 219-240)

```typescript
const requireAuthenticatedUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  // Reject if no user at all
  if (!ctx.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Authentication required. Please log in to perform this action.",
    });
  }

  // Reject public demo user (id: -1)
  if (isPublicDemoUser(ctx.user)) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Authentication required. Please log in to perform this action.",
    });
  }
  // ...
});
```

**The Problem**:
1. The `strictlyProtectedProcedure` rejects "public demo users" (id: -1) with the same error message as unauthenticated users.
2. Additionally, `requirePermission("users:read")` may be failing, but the error message doesn't distinguish between:
   - Not logged in
   - Logged in as demo user
   - Logged in but lacking permission

**File**: `server/_core/permissionMiddleware.ts` (Lines 58, 145, 230)

```typescript
throw new TRPCError({
  code: "UNAUTHORIZED",
  message: "Authentication required to perform this action",
});
```

### Fix Recommendation

```typescript
// In trpc.ts, differentiate error messages:
if (isPublicDemoUser(ctx.user)) {
  throw new TRPCError({
    code: "FORBIDDEN",  // Use FORBIDDEN, not UNAUTHORIZED
    message: "This feature requires a full account. Demo users cannot access user management.",
  });
}

// In permissionMiddleware.ts:
if (!hasPermission) {
  throw new TRPCError({
    code: "FORBIDDEN",
    message: `Permission denied. You need the '${requiredPermission}' permission to perform this action.`,
  });
}
```

---

## Bug 6: Spreadsheet View Shows Empty Grid

### Symptom
Spreadsheet View page loads with completely empty grid despite inventory data existing.

### Root Cause Analysis

**File**: `client/src/pages/SpreadsheetViewPage.tsx` (Lines 13, 39-56)

```typescript
const { enabled, isLoading, error } = useFeatureFlag("spreadsheet-view");

if (!enabled) {
  return (
    <Card className="mx-auto max-w-3xl">
      <CardHeader>
        <CardTitle>Spreadsheet View</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <Badge variant="outline">Feature Flag: spreadsheet-view</Badge>
        <p className="text-sm text-muted-foreground">
          The unified spreadsheet experience is currently disabled...
        </p>
      </CardContent>
    </Card>
  );
}
```

**File**: `server/routers/spreadsheet.ts` (Lines 13-26)

```typescript
const spreadsheetFeatureGuard = middleware(async ({ ctx, next }) => {
  const enabled = await featureFlagService.isEnabled("spreadsheet-view", {
    userOpenId: ctx.user.openId,
  });

  if (!enabled) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Spreadsheet view is disabled by feature flag",
    });
  }

  return next();
});
```

**The Problem**:
The feature flag `spreadsheet-view` controls access. If the flag is enabled for the UI but the API guard fails (different user context or flag configuration), the grid will render but data won't load.

Additionally, the `InventoryGrid` component shows an empty grid without clear error messaging when data is empty:

```typescript
// InventoryGrid.tsx - No clear empty state handling
<AgGridReact<InventoryGridRow>
  rowData={data?.rows ?? []}  // Empty array shows empty grid
  // ...
/>
```

### Fix Recommendation

```typescript
// Add empty state handling in InventoryGrid.tsx:
if (!isLoading && (!data?.rows || data.rows.length === 0)) {
  return (
    <Card>
      <CardContent className="py-12 text-center">
        <p className="text-muted-foreground">No inventory data available.</p>
        <p className="text-sm text-muted-foreground mt-2">
          Make sure batches have status "LIVE" or "PHOTOGRAPHY_COMPLETE".
        </p>
      </CardContent>
    </Card>
  );
}
```

---

## Summary of Root Causes by Category

### Database/SQL Issues
1. **Empty IN clause** - `pricingEngine.ts` generates invalid SQL when rule arrays are empty
2. **Missing joins** - `search.ts` doesn't join to products table for name search

### State Management Issues
1. **Full page reload** - `OrderCreatorPage.tsx` uses `window.location.reload()` instead of query refetch
2. **Insufficient null checks** - `BatchDetailDrawer.tsx` doesn't handle malformed API responses

### Error Messaging Issues
1. **Generic error messages** - `trpc.ts` and `permissionMiddleware.ts` use same message for different failure modes
2. **Missing empty states** - Multiple components don't distinguish between loading, error, and empty data

### Feature Flag Issues
1. **Inconsistent flag checking** - UI and API may have different flag states for same user

---

## Recommended Priority Order for Fixes

| Priority | Bug | Impact | Effort |
|----------|-----|--------|--------|
| P0 | Inventory Loading Failure | Blocks core business | Medium |
| P0 | Batch Detail View Crash | Blocks inventory management | Low |
| P1 | Search No Results | Users can't find data | Medium |
| P1 | Retry Button Reset | Data loss UX issue | Low |
| P2 | Auth Error Message | Confusing UX | Low |
| P2 | Spreadsheet Empty Grid | Feature appears broken | Low |

---

## Files Requiring Changes

| File | Changes Needed |
|------|----------------|
| `server/pricingEngine.ts` | Add empty array check before SQL IN clause |
| `client/src/pages/OrderCreatorPage.tsx` | Replace `window.location.reload()` with query refetch |
| `client/src/components/inventory/BatchDetailDrawer.tsx` | Add defensive array checks |
| `server/routers/search.ts` | Add product name/strain to search query |
| `server/_core/trpc.ts` | Differentiate error messages |
| `server/_core/permissionMiddleware.ts` | Use FORBIDDEN code for permission errors |
| `client/src/components/spreadsheet/InventoryGrid.tsx` | Add empty state handling |

---

*Report generated by Manus AI Agent*  
*Analysis completed: January 7, 2026*

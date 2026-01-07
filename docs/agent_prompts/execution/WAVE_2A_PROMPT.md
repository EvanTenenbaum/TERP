# Wave 2A: Search & Forms

**Agent Role**: Full Stack Developer  
**Duration**: 4-5 hours  
**Priority**: P1 - HIGH  
**Deadline**: Day 1 PM - Day 2 AM  
**Dependencies**: Wave 1A complete  
**Can Run Parallel With**: Wave 2B

---

## Context

You are fixing search functionality and form handling issues. These affect user experience significantly and must be fixed before Thursday's user testing deadline.

---

## Tasks

### Task 1: BUG-042 - Global Search Returns No Results

**Priority**: P1  
**File**: `server/routers/search.ts`  
**Lines**: 94-113  
**Time Estimate**: 2-3 hours

**Problem**: Global search only searches `batches.code` and `batches.sku` fields. When users search for "OG Kush" (a product name), they get "No results found" even though the product exists.

**Current Code** (around line 94-113):
```typescript
// Current search only queries batch fields
const results = await db.select()
  .from(batches)
  .where(
    or(
      ilike(batches.code, searchPattern),
      ilike(batches.sku, searchPattern),
    )
  );
```

**Fix Required**:
```typescript
// Join to products table and search more fields
const results = await db.select({
  // Select relevant fields
  id: batches.id,
  code: batches.code,
  sku: batches.sku,
  productName: products.name,
  strain: products.strain,
  // ... other fields
})
.from(batches)
.leftJoin(products, eq(batches.productId, products.id))
.leftJoin(clients, eq(batches.clientId, clients.id))
.where(
  or(
    ilike(batches.code, searchPattern),
    ilike(batches.sku, searchPattern),
    ilike(products.name, searchPattern),      // ADD
    ilike(products.strain, searchPattern),    // ADD
    ilike(products.category, searchPattern),  // ADD
    ilike(clients.name, searchPattern),       // ADD
    ilike(clients.company, searchPattern),    // ADD
  )
);
```

**Also Consider**:
- Search orders by order number
- Search invoices by invoice number
- Return categorized results (Products, Clients, Orders, etc.)

**Verification**:
1. Go to https://terp-app-b9s35.ondigitalocean.app
2. Use the global search bar (top of page)
3. Search for "OG Kush" - should find matching products
4. Search for a client name - should find matching clients
5. Search for a batch code - should still work

---

### Task 2: BUG-045 - Retry Button Resets Form (Order Creator)

**Priority**: P1  
**File**: `client/src/pages/OrderCreatorPage.tsx`  
**Line**: 575  
**Time Estimate**: 30 minutes

**Problem**: When inventory loading fails and user clicks "Retry", the entire form is reset because it uses `window.location.reload()`.

**Current Code**:
```typescript
// Line 575
<Button onClick={() => window.location.reload()}>
  Retry
</Button>
```

**Fix Required**:
```typescript
// Use tRPC refetch instead
const { data: inventory, refetch: refetchInventory } = trpc.salesSheets.getInventory.useQuery(...);

// In the error state
<Button onClick={() => refetchInventory()}>
  Retry
</Button>
```

**Verification**:
1. Go to https://terp-app-b9s35.ondigitalocean.app/orders/create
2. Select a customer
3. If inventory loads, manually break it (or wait for error)
4. Click Retry
5. Verify customer selection is preserved
6. Verify form data is not lost

---

### Task 3: BUG-048 - Retry Button Resets Form (Clients List)

**Priority**: P2  
**File**: `client/src/pages/ClientsListPage.tsx`  
**Time Estimate**: 30 minutes

**Problem**: Same issue as BUG-045 but on the Clients List page.

**Fix**: Same pattern as BUG-045 - replace `window.location.reload()` with `refetch()`.

**Verification**:
1. Go to https://terp-app-b9s35.ondigitalocean.app/clients
2. Apply some filters
3. Trigger an error (if possible) and click Retry
4. Verify filters are preserved

---

### Task 4: BUG-046 - Settings Users Tab Auth Error Message

**Priority**: P2  
**File**: `server/_core/trpc.ts` or `server/middleware/permissionMiddleware.ts`  
**Time Estimate**: 1 hour

**Problem**: When a logged-in user (like demo user) tries to access the Users tab in Settings, they see "Authentication required. Please log in." This is misleading - they ARE logged in, they just don't have permission.

**Current Code**:
```typescript
// Same error message for different scenarios
throw new TRPCError({
  code: 'UNAUTHORIZED',
  message: 'Authentication required. Please log in.',
});
```

**Fix Required**:
```typescript
// Distinguish between not logged in and no permission
if (!ctx.user) {
  throw new TRPCError({
    code: 'UNAUTHORIZED',
    message: 'Authentication required. Please log in.',
  });
}

if (!hasPermission(ctx.user, requiredPermission)) {
  throw new TRPCError({
    code: 'FORBIDDEN',  // Use FORBIDDEN, not UNAUTHORIZED
    message: 'You do not have permission to access this resource.',
  });
}
```

**Also Update Frontend**:
```typescript
// In the error handling component
if (error.data?.code === 'FORBIDDEN') {
  return <div>You do not have permission to view this page.</div>;
}
if (error.data?.code === 'UNAUTHORIZED') {
  return <div>Please log in to continue.</div>;
}
```

**Verification**:
1. Log in as demo user
2. Go to https://terp-app-b9s35.ondigitalocean.app/settings
3. Click on "Users" tab
4. Verify message says "You do not have permission" NOT "Please log in"

---

## Git Workflow

```bash
# Create feature branch
git checkout -b fix/wave-2a-search-forms

# Commit each fix separately
git add server/routers/search.ts
git commit -m "fix(BUG-042): Expand global search to include product names

- Added products.name, strain, category to search
- Added clients.name, company to search
- Search now finds products by name like 'OG Kush'"

git add client/src/pages/OrderCreatorPage.tsx
git commit -m "fix(BUG-045): Replace reload with refetch in Order Creator

- Retry button now uses refetchInventory()
- Form data is preserved on retry
- No more data loss on network errors"

git add client/src/pages/ClientsListPage.tsx
git commit -m "fix(BUG-048): Replace reload with refetch in Clients List

- Same fix as BUG-045 for consistency"

git add server/_core/trpc.ts server/middleware/permissionMiddleware.ts
git commit -m "fix(BUG-046): Distinguish auth errors from permission errors

- Use FORBIDDEN for permission denied
- Use UNAUTHORIZED only for not logged in
- Clearer error messages for users"

# Push and create PR
git push origin fix/wave-2a-search-forms
```

---

## Success Criteria

- [ ] Global search finds products by name
- [ ] Global search finds clients by name
- [ ] Retry buttons preserve form data
- [ ] Permission errors show correct message
- [ ] No regressions in existing functionality

---

## Handoff

When complete, notify the Wave 3 lead that Wave 2A is ready for integration. Update the task status in the roadmap.

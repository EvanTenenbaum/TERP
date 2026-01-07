# Wave 1B: Data Display Fixes

**Agent Role**: Frontend Developer  
**Duration**: 3-4 hours  
**Priority**: P0 - CRITICAL  
**Deadline**: Day 1 Morning (Tuesday)  
**Can Run Parallel With**: Wave 1A

---

## Context

You are fixing critical bugs where pages show empty data despite records existing in the database. These must be fixed before Thursday's user testing deadline.

**Known Data**:
- Products table: 121 products exist
- Samples table: 6 samples exist

---

## Tasks

### Task 1: QA-049 - Products Page Shows Empty

**Priority**: P1  
**File**: `client/src/pages/ProductsPage.tsx`  
**Time Estimate**: 1-2 hours

**Problem**: Products page shows "No results found" and "Showing 0 - 0 of 0" despite 121 products existing in the database.

**Investigation Steps**:

1. **Check the tRPC query** (around line 84):
```typescript
const { data: productsData, isLoading } = trpc.productCatalogue.list.useQuery(
  // Check what parameters are being passed
);
```

2. **Add debug logging**:
```typescript
console.log('Products query params:', queryParams);
console.log('Products data:', productsData);
console.log('Products count:', productsData?.length);
```

3. **Check for filter issues**:
- Is there an `archived: false` filter excluding all products?
- Is there a `brandId` filter with no matching products?
- Is there a tenant/organization filter issue?

4. **Check the server endpoint** (`server/routers/productCatalogue.ts`):
- Look at the `list` procedure
- Check what WHERE clauses are applied
- Verify the query returns data

**Likely Fixes**:
```typescript
// Option A: Remove overly restrictive filter
const { data: productsData } = trpc.productCatalogue.list.useQuery({
  // Remove or fix the problematic filter
  archived: undefined, // Instead of archived: false
});

// Option B: Fix default filter value
const [showArchived, setShowArchived] = useState(false);
// Change to include all by default or fix the query
```

**Verification**:
1. Go to https://terp-app-b9s35.ondigitalocean.app/products
2. Verify products appear in the table
3. Verify "Showing X - Y of 121" displays
4. Verify search/filter still works

---

### Task 2: QA-050 - Samples Page Shows Empty

**Priority**: P1  
**File**: `client/src/pages/SamplesPage.tsx` (or similar)  
**Time Estimate**: 1-2 hours

**Problem**: Samples page shows "All 0", "Pending 0", "Approved 0" despite 6 samples existing in the database.

**Investigation Steps**:

1. **Find the samples page file**:
```bash
find client/src -name "*Sample*" -type f
```

2. **Check the tRPC query**:
```typescript
// Look for something like:
const { data: samples } = trpc.samples.list.useQuery({...});
```

3. **Add debug logging**:
```typescript
console.log('Samples query params:', queryParams);
console.log('Samples data:', samples);
```

4. **Check for status filter issues**:
- The tabs show "All", "Pending", "Approved", etc.
- Is the default tab filtering to a status with no samples?
- Check the server endpoint for WHERE clauses

5. **Check the server endpoint** (`server/routers/samples.ts`):
```typescript
// Look at the list procedure
// Check what filters are applied by default
```

**Likely Fixes**:
```typescript
// Option A: Fix status filter
const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
// Instead of defaulting to a specific status

// Option B: Fix the query to not filter by default
const { data: samples } = trpc.samples.list.useQuery({
  status: statusFilter || undefined, // Don't filter if undefined
});
```

**Verification**:
1. Go to https://terp-app-b9s35.ondigitalocean.app/samples
2. Verify "All" tab shows count > 0
3. Verify samples appear in the list
4. Verify tab filtering works correctly

---

### Task 3: DEBUG - Add Diagnostic Logging

**Priority**: P2  
**Time Estimate**: 30 minutes

If the above fixes don't immediately reveal the issue, add comprehensive logging:

```typescript
// In the page component
useEffect(() => {
  console.group('Page Debug');
  console.log('Query state:', { isLoading, isError, error });
  console.log('Data:', data);
  console.log('Data length:', data?.length);
  console.log('Filters:', filters);
  console.groupEnd();
}, [data, isLoading, isError, filters]);
```

Check browser console and network tab for:
- API response payload
- Any error responses
- Query parameters being sent

---

## Git Workflow

```bash
# Create feature branch
git checkout -b fix/wave-1b-data-display

# After each fix, commit separately
git add client/src/pages/ProductsPage.tsx
git commit -m "fix(QA-049): Fix Products page showing empty

- [Describe the actual fix]
- Products now display correctly
- Count shows 121 products"

git add client/src/pages/SamplesPage.tsx
git commit -m "fix(QA-050): Fix Samples page showing empty

- [Describe the actual fix]
- Samples now display correctly
- Tab counts show correct numbers"

# Push and create PR
git push origin fix/wave-1b-data-display
```

---

## Success Criteria

- [ ] Products page shows 121 products
- [ ] Samples page shows 6 samples
- [ ] Tab counts are accurate
- [ ] Search/filter functionality works
- [ ] No console errors

---

## Handoff

When complete, notify the Wave 3 lead that Wave 1B is ready for integration. Update the task status in the roadmap.

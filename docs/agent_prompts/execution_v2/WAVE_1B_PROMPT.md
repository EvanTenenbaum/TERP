# Wave 1B: Data Display Fixes (Stability-Focused)

**Agent Role**: Frontend Developer  
**Duration**: 4-5 hours  
**Priority**: P0 - CRITICAL  
**Deadline**: Day 1 Morning  
**Can Run Parallel With**: Wave 1A, Wave 1C

---

## Stability Requirements (READ FIRST)

Every fix in this wave MUST:
1. ✅ Include integration tests
2. ✅ Include debug logging
3. ✅ Identify and fix ROOT CAUSE (not just symptoms)
4. ✅ Add monitoring for recurrence
5. ✅ Document the actual cause found

---

## Task 1: QA-049 - Products Page Shows Empty

**Priority**: P1  
**Files**: `client/src/pages/ProductsPage.tsx`, `server/routers/productCatalogue.ts`  
**Time Estimate**: 2-2.5 hours

### Investigation Protocol (DO THIS FIRST)

**Step 1: Verify data exists at database level**
```bash
# SSH to server or use database client
psql -c "SELECT COUNT(*) as total, 
         COUNT(*) FILTER (WHERE archived = false) as active,
         COUNT(*) FILTER (WHERE archived = true) as archived
         FROM products;"
```

**Step 2: Check API response directly**
```bash
# Call the API endpoint directly
curl -s "https://terp-app-b9s35.ondigitalocean.app/api/trpc/productCatalogue.list" \
  -H "Cookie: [your-session-cookie]" | jq '.result.data | length'
```

**Step 3: Check browser network tab**
- Open Products page
- Open DevTools → Network tab
- Look for the tRPC call
- Check request params and response

**Step 4: Document findings**
```markdown
## QA-049 Investigation Results

- Database count: ___
- API response count: ___
- Frontend displayed count: ___
- Discrepancy found at: [Database/API/Frontend]
- Root cause: ___
```

### Common Causes & Fixes

#### Cause A: Filter defaults to archived=false but all products are archived
```typescript
// Check current default
const [showArchived, setShowArchived] = useState(false); // This might be the issue

// Fix: Default to showing all, or check if any non-archived exist
const { data: counts } = trpc.productCatalogue.getCounts.useQuery();
const defaultShowArchived = counts?.active === 0; // Show archived if no active products
```

#### Cause B: Tenant/Organization filter not matching
```typescript
// Check if organizationId is being passed correctly
const { data: products } = trpc.productCatalogue.list.useQuery({
  organizationId: currentOrg?.id, // Is this undefined?
});

// Add debug logging
console.log('[ProductsPage] Query params:', { organizationId: currentOrg?.id });
```

#### Cause C: Server-side WHERE clause too restrictive
```typescript
// server/routers/productCatalogue.ts
list: protectedProcedure
  .input(z.object({
    archived: z.boolean().optional(),
    // ... other filters
  }))
  .query(async ({ ctx, input }) => {
    // DEBUG: Log what we're querying
    console.log('[productCatalogue.list] Input:', input);
    console.log('[productCatalogue.list] User org:', ctx.user.organizationId);

    const conditions = [];
    
    // Check each condition
    if (input.archived !== undefined) {
      conditions.push(eq(products.archived, input.archived));
    }
    
    // Is this filtering out everything?
    if (ctx.user.organizationId) {
      conditions.push(eq(products.organizationId, ctx.user.organizationId));
    }

    const result = await db.select()
      .from(products)
      .where(and(...conditions));

    console.log('[productCatalogue.list] Result count:', result.length);
    return result;
  }),
```

### Stable Fix Template

```typescript
// client/src/pages/ProductsPage.tsx

export function ProductsPage() {
  // Add debug state
  const [debugInfo, setDebugInfo] = useState<string>('');

  const { 
    data: products, 
    isLoading, 
    error,
    refetch 
  } = trpc.productCatalogue.list.useQuery(
    { /* params */ },
    {
      onSuccess: (data) => {
        console.log('[ProductsPage] Loaded products:', data?.length);
        if (data?.length === 0) {
          console.warn('[ProductsPage] Zero products returned - check filters');
        }
      },
      onError: (err) => {
        console.error('[ProductsPage] Error loading products:', err);
      },
    }
  );

  // Show debug info in development
  if (process.env.NODE_ENV === 'development' && products?.length === 0) {
    return (
      <div>
        <Alert variant="warning">
          No products found. Debug info:
          <pre>{JSON.stringify({ /* query params */ }, null, 2)}</pre>
        </Alert>
        <Button onClick={() => refetch()}>Retry</Button>
      </div>
    );
  }

  // ... rest of component
}
```

### Integration Test Required

```typescript
// client/src/__tests__/integration/ProductsPage.test.tsx

describe('ProductsPage Integration', () => {
  it('displays products from database', async () => {
    // Setup: Ensure products exist in test DB
    await seedTestProducts(5);
    
    render(<ProductsPage />);
    
    // Wait for loading to complete
    await waitForElementToBeRemoved(() => screen.queryByText(/loading/i));
    
    // Verify products displayed
    expect(screen.getByText(/showing.*of 5/i)).toBeInTheDocument();
  });

  it('shows empty state when no products exist', async () => {
    // Setup: Clear all products
    await clearTestProducts();
    
    render(<ProductsPage />);
    
    await waitFor(() => {
      expect(screen.getByText(/no products found/i)).toBeInTheDocument();
    });
  });

  it('filters work correctly', async () => {
    await seedTestProducts(3, { archived: false });
    await seedTestProducts(2, { archived: true });
    
    render(<ProductsPage />);
    
    // Default: show non-archived
    await waitFor(() => {
      expect(screen.getByText(/showing.*of 3/i)).toBeInTheDocument();
    });
    
    // Toggle to show archived
    fireEvent.click(screen.getByLabelText(/show archived/i));
    
    await waitFor(() => {
      expect(screen.getByText(/showing.*of 5/i)).toBeInTheDocument();
    });
  });
});
```

---

## Task 2: QA-050 - Samples Page Shows Empty

**Priority**: P1  
**Files**: `client/src/pages/SamplesPage.tsx`, `server/routers/samples.ts`  
**Time Estimate**: 2-2.5 hours

### Investigation Protocol (Same as QA-049)

```bash
# Database check
psql -c "SELECT status, COUNT(*) FROM samples GROUP BY status;"

# API check
curl -s "https://terp-app-b9s35.ondigitalocean.app/api/trpc/samples.list" \
  -H "Cookie: [session]" | jq '.result.data | length'
```

### Common Causes & Fixes

#### Cause A: Status filter defaulting to non-existent status
```typescript
// Check what statuses exist vs what's being filtered
const [statusFilter, setStatusFilter] = useState('PENDING'); // What if no PENDING samples?

// Fix: Default to 'ALL' or check available statuses
const { data: statusCounts } = trpc.samples.getStatusCounts.useQuery();
const defaultStatus = statusCounts?.pending > 0 ? 'PENDING' : 'ALL';
```

#### Cause B: Tab counts not matching actual data
```typescript
// The tabs show "All 0", "Pending 0" etc.
// This suggests the count query is also returning 0

// Check the count query
const { data: counts } = trpc.samples.getCounts.useQuery();
console.log('[SamplesPage] Counts:', counts);
// Expected: { all: 6, pending: 2, approved: 4, ... }
// Actual: { all: 0, pending: 0, ... } // BUG IS HERE
```

### Stable Fix Template

```typescript
// client/src/pages/SamplesPage.tsx

export function SamplesPage() {
  const { data: samples, isLoading } = trpc.samples.list.useQuery({
    status: statusFilter === 'ALL' ? undefined : statusFilter,
  });

  const { data: counts } = trpc.samples.getCounts.useQuery();

  // Debug logging
  useEffect(() => {
    console.log('[SamplesPage] Samples loaded:', samples?.length);
    console.log('[SamplesPage] Counts:', counts);
  }, [samples, counts]);

  // Verify counts match reality
  useEffect(() => {
    if (counts && samples) {
      const expectedCount = statusFilter === 'ALL' 
        ? counts.all 
        : counts[statusFilter.toLowerCase()];
      
      if (samples.length !== expectedCount) {
        console.warn('[SamplesPage] Count mismatch:', {
          displayed: samples.length,
          expected: expectedCount,
          filter: statusFilter,
        });
      }
    }
  }, [counts, samples, statusFilter]);

  // ... rest of component
}
```

### Server-Side Fix (if needed)

```typescript
// server/routers/samples.ts

getCounts: protectedProcedure.query(async ({ ctx }) => {
  // Debug: Log the query
  console.log('[samples.getCounts] User:', ctx.user.id);

  const result = await db.select({
    status: samples.status,
    count: count(),
  })
  .from(samples)
  .groupBy(samples.status);

  console.log('[samples.getCounts] Raw result:', result);

  // Transform to expected format
  const counts = {
    all: result.reduce((sum, r) => sum + Number(r.count), 0),
    pending: Number(result.find(r => r.status === 'PENDING')?.count ?? 0),
    approved: Number(result.find(r => r.status === 'APPROVED')?.count ?? 0),
    rejected: Number(result.find(r => r.status === 'REJECTED')?.count ?? 0),
  };

  console.log('[samples.getCounts] Transformed:', counts);
  return counts;
}),
```

---

## Task 3: Add Debug Endpoint (Temporary)

**Time Estimate**: 30 minutes

Create a temporary debug endpoint to help diagnose data issues:

```typescript
// server/routers/debug.ts (TEMPORARY - remove after fixing)

import { router, protectedProcedure } from '../_core/trpc';

export const debugRouter = router({
  dataCounts: protectedProcedure.query(async ({ ctx }) => {
    // Only allow in development or for admins
    if (process.env.NODE_ENV === 'production' && !ctx.user.isAdmin) {
      throw new Error('Debug endpoint not available');
    }

    const [
      productsCount,
      samplesCount,
      batchesCount,
      clientsCount,
    ] = await Promise.all([
      db.select({ count: count() }).from(products),
      db.select({ count: count() }).from(samples),
      db.select({ count: count() }).from(batches),
      db.select({ count: count() }).from(clients),
    ]);

    return {
      products: {
        total: productsCount[0].count,
        // Add breakdown by status/archived
      },
      samples: {
        total: samplesCount[0].count,
      },
      batches: {
        total: batchesCount[0].count,
      },
      clients: {
        total: clientsCount[0].count,
      },
      timestamp: new Date().toISOString(),
    };
  }),
});
```

---

## Documentation Requirement

After fixing, create this file:

```markdown
// docs/bugs/QA-049-050-POSTMORTEM.md

# QA-049 & QA-050 Postmortem

## Summary
Products and Samples pages showed empty despite data existing in database.

## Root Cause
[Document what you actually found]

## Fix Applied
[Document the actual fix]

## Prevention
- Added integration tests to catch this regression
- Added debug logging for future diagnosis
- Added monitoring for zero-result queries

## Timeline
- Discovered: [date]
- Fixed: [date]
- Verified: [date]
```

---

## Git Workflow

```bash
git checkout -b fix/wave-1b-data-display-stable

# Document investigation
git add docs/bugs/QA-049-050-INVESTIGATION.md
git commit -m "docs: Add investigation notes for QA-049/050"

# Fix products page
git add client/src/pages/ProductsPage.tsx
git add server/routers/productCatalogue.ts
git add client/src/__tests__/integration/ProductsPage.test.tsx
git commit -m "fix(QA-049): Fix Products page showing empty

Root cause: [what you found]
Fix: [what you did]

- Added integration tests
- Added debug logging
- Verified with 121 products

Fixes: QA-049"

# Fix samples page
git add client/src/pages/SamplesPage.tsx
git add server/routers/samples.ts
git add client/src/__tests__/integration/SamplesPage.test.tsx
git commit -m "fix(QA-050): Fix Samples page showing empty

Root cause: [what you found]
Fix: [what you did]

- Added integration tests
- Added debug logging
- Verified with 6 samples

Fixes: QA-050"

# Push for review
git push origin fix/wave-1b-data-display-stable
```

---

## Success Criteria

- [ ] Root cause identified and documented
- [ ] Products page shows 121 products
- [ ] Samples page shows 6 samples
- [ ] Integration tests added
- [ ] Debug logging added
- [ ] Postmortem document created

---

## Handoff

When complete:
1. Document the actual root cause found
2. Create PR with investigation notes
3. Notify Wave 3 lead
4. Update roadmap status

# Wave 2A: Search & Form Fixes (Stability-Focused)

**Agent Role**: Full Stack Developer  
**Duration**: 5-6 hours  
**Priority**: P1  
**Deadline**: Day 1 PM - Day 2 AM  
**Can Run Parallel With**: Wave 2B

---

## Stability Requirements (READ FIRST)

Every fix in this wave MUST:
1. ✅ Include performance considerations
2. ✅ Not introduce security vulnerabilities
3. ✅ Include unit tests
4. ✅ Handle edge cases
5. ✅ Be backward compatible

---

## Task 1: BUG-042 - Global Search Returns No Results

**Priority**: P1  
**Files**: `server/routers/search.ts`, database migrations  
**Time Estimate**: 3-4 hours

### Problem Analysis

Current search only queries `batches.code` and `batches.sku`. Users expect to search by product name, strain, vendor, etc.

### Performance Considerations (CRITICAL)

Adding ILIKE queries on multiple columns WITHOUT indexes will be SLOW.

**Step 1: Add Database Indexes FIRST**

```sql
-- migrations/add_search_indexes.sql

-- Enable trigram extension for fuzzy search (if not already)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Add GIN indexes for text search
CREATE INDEX CONCURRENTLY idx_products_name_trgm 
  ON products USING gin(name gin_trgm_ops);

CREATE INDEX CONCURRENTLY idx_products_strain_trgm 
  ON products USING gin(strain gin_trgm_ops);

CREATE INDEX CONCURRENTLY idx_batches_code_trgm 
  ON batches USING gin(code gin_trgm_ops);

CREATE INDEX CONCURRENTLY idx_batches_sku_trgm 
  ON batches USING gin(sku gin_trgm_ops);

CREATE INDEX CONCURRENTLY idx_clients_name_trgm 
  ON clients USING gin(name gin_trgm_ops);

-- Verify indexes were created
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename IN ('products', 'batches', 'clients')
AND indexname LIKE '%trgm%';
```

**Step 2: Update Search Query**

```typescript
// server/routers/search.ts

import { sql, or, ilike } from 'drizzle-orm';

interface SearchResult {
  type: 'product' | 'batch' | 'client' | 'order';
  id: number;
  title: string;
  subtitle: string;
  url: string;
  relevance: number;
}

search: protectedProcedure
  .input(z.object({
    query: z.string().min(1).max(100),
    limit: z.number().min(1).max(50).default(20),
    types: z.array(z.enum(['product', 'batch', 'client', 'order'])).optional(),
  }))
  .query(async ({ ctx, input }) => {
    const { query, limit, types } = input;
    
    // Sanitize search input
    const sanitizedQuery = query
      .trim()
      .replace(/[%_]/g, '\\$&'); // Escape SQL wildcards
    
    const searchPattern = `%${sanitizedQuery}%`;
    
    // Log search for analytics
    console.log(`[Search] User ${ctx.user.id} searched: "${query}"`);
    
    const results: SearchResult[] = [];
    
    // Search Products (if not filtered out)
    if (!types || types.includes('product')) {
      const products = await db.select({
        id: productsTable.id,
        name: productsTable.name,
        strain: productsTable.strain,
        category: productsTable.category,
      })
      .from(productsTable)
      .where(
        or(
          ilike(productsTable.name, searchPattern),
          ilike(productsTable.strain, searchPattern),
          ilike(productsTable.category, searchPattern),
          ilike(productsTable.sku, searchPattern),
        )
      )
      .limit(limit);
      
      results.push(...products.map(p => ({
        type: 'product' as const,
        id: p.id,
        title: p.name,
        subtitle: `${p.strain || ''} - ${p.category || ''}`.trim(),
        url: `/products/${p.id}`,
        relevance: calculateRelevance(query, p.name, p.strain),
      })));
    }
    
    // Search Batches
    if (!types || types.includes('batch')) {
      const batches = await db.select({
        id: batchesTable.id,
        code: batchesTable.code,
        sku: batchesTable.sku,
        productName: productsTable.name,
      })
      .from(batchesTable)
      .leftJoin(productsTable, eq(batchesTable.productId, productsTable.id))
      .where(
        or(
          ilike(batchesTable.code, searchPattern),
          ilike(batchesTable.sku, searchPattern),
          ilike(productsTable.name, searchPattern),
        )
      )
      .limit(limit);
      
      results.push(...batches.map(b => ({
        type: 'batch' as const,
        id: b.id,
        title: b.code,
        subtitle: b.productName || b.sku || '',
        url: `/inventory?batch=${b.id}`,
        relevance: calculateRelevance(query, b.code, b.productName),
      })));
    }
    
    // Search Clients
    if (!types || types.includes('client')) {
      const clients = await db.select({
        id: clientsTable.id,
        name: clientsTable.name,
        email: clientsTable.email,
      })
      .from(clientsTable)
      .where(
        or(
          ilike(clientsTable.name, searchPattern),
          ilike(clientsTable.email, searchPattern),
        )
      )
      .limit(limit);
      
      results.push(...clients.map(c => ({
        type: 'client' as const,
        id: c.id,
        title: c.name,
        subtitle: c.email || '',
        url: `/clients/${c.id}`,
        relevance: calculateRelevance(query, c.name),
      })));
    }
    
    // Sort by relevance and limit
    results.sort((a, b) => b.relevance - a.relevance);
    
    console.log(`[Search] Found ${results.length} results for "${query}"`);
    
    return results.slice(0, limit);
  }),

// Helper function for relevance scoring
function calculateRelevance(query: string, ...fields: (string | null | undefined)[]): number {
  const lowerQuery = query.toLowerCase();
  let score = 0;
  
  for (const field of fields) {
    if (!field) continue;
    const lowerField = field.toLowerCase();
    
    // Exact match = highest score
    if (lowerField === lowerQuery) {
      score += 100;
    }
    // Starts with = high score
    else if (lowerField.startsWith(lowerQuery)) {
      score += 75;
    }
    // Contains = medium score
    else if (lowerField.includes(lowerQuery)) {
      score += 50;
    }
  }
  
  return score;
}
```

### Unit Tests Required

```typescript
// server/__tests__/search.test.ts

describe('search', () => {
  beforeAll(async () => {
    // Seed test data
    await seedTestProduct({ name: 'OG Kush', strain: 'OG' });
    await seedTestProduct({ name: 'Blue Dream', strain: 'Sativa' });
    await seedTestBatch({ code: 'BATCH-001', productName: 'OG Kush' });
    await seedTestClient({ name: 'Test Client', email: 'test@example.com' });
  });

  it('finds products by name', async () => {
    const results = await search({ query: 'OG Kush', limit: 10 });
    
    expect(results.some(r => r.type === 'product' && r.title === 'OG Kush')).toBe(true);
  });

  it('finds products by strain', async () => {
    const results = await search({ query: 'Sativa', limit: 10 });
    
    expect(results.some(r => r.title === 'Blue Dream')).toBe(true);
  });

  it('finds batches by code', async () => {
    const results = await search({ query: 'BATCH-001', limit: 10 });
    
    expect(results.some(r => r.type === 'batch')).toBe(true);
  });

  it('finds batches by product name', async () => {
    const results = await search({ query: 'OG Kush', limit: 10 });
    
    expect(results.some(r => r.type === 'batch')).toBe(true);
  });

  it('finds clients by name', async () => {
    const results = await search({ query: 'Test Client', limit: 10 });
    
    expect(results.some(r => r.type === 'client')).toBe(true);
  });

  it('handles empty results gracefully', async () => {
    const results = await search({ query: 'xyznonexistent123', limit: 10 });
    
    expect(results).toEqual([]);
  });

  it('sanitizes SQL wildcards', async () => {
    // Should not cause SQL injection
    const results = await search({ query: '%_test', limit: 10 });
    
    expect(Array.isArray(results)).toBe(true);
  });

  it('respects limit parameter', async () => {
    const results = await search({ query: 'a', limit: 5 });
    
    expect(results.length).toBeLessThanOrEqual(5);
  });

  it('filters by type', async () => {
    const results = await search({ 
      query: 'OG', 
      limit: 10, 
      types: ['product'] 
    });
    
    expect(results.every(r => r.type === 'product')).toBe(true);
  });
});
```

---

## Task 2: BUG-045 & BUG-048 - Retry Buttons Reset Form

**Priority**: P1  
**Files**: `client/src/pages/OrderCreatorPage.tsx`, `client/src/pages/ClientsListPage.tsx`  
**Time Estimate**: 1 hour

### Problem Analysis

Using `window.location.reload()` destroys all React state, losing user input.

### Stable Fix

```typescript
// client/src/hooks/useRetryableQuery.ts

interface UseRetryableQueryOptions {
  maxRetries?: number;
  onMaxRetriesReached?: () => void;
}

export function useRetryableQuery<T>(
  queryResult: UseQueryResult<T>,
  options: UseRetryableQueryOptions = {}
) {
  const { maxRetries = 3, onMaxRetriesReached } = options;
  const [retryCount, setRetryCount] = useState(0);
  const queryClient = useQueryClient();

  const handleRetry = useCallback(async () => {
    if (retryCount >= maxRetries) {
      console.warn('[useRetryableQuery] Max retries reached');
      onMaxRetriesReached?.();
      return;
    }

    setRetryCount(prev => prev + 1);
    console.log(`[useRetryableQuery] Retry attempt ${retryCount + 1}/${maxRetries}`);

    try {
      // First, invalidate the cache
      await queryClient.invalidateQueries(queryResult.queryKey);
      // Then refetch
      await queryResult.refetch();
    } catch (error) {
      console.error('[useRetryableQuery] Retry failed:', error);
    }
  }, [retryCount, maxRetries, queryClient, queryResult, onMaxRetriesReached]);

  // Reset retry count on success
  useEffect(() => {
    if (queryResult.isSuccess) {
      setRetryCount(0);
    }
  }, [queryResult.isSuccess]);

  return {
    ...queryResult,
    retryCount,
    maxRetries,
    canRetry: retryCount < maxRetries,
    handleRetry,
  };
}
```

**Apply to OrderCreatorPage:**

```typescript
// client/src/pages/OrderCreatorPage.tsx

export function OrderCreatorPage() {
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  
  const inventoryQuery = useRetryableQuery(
    trpc.salesSheets.getInventory.useQuery(
      { clientId: selectedClientId! },
      { enabled: !!selectedClientId }
    ),
    {
      maxRetries: 3,
      onMaxRetriesReached: () => {
        toast.error('Unable to load inventory. Please contact support.');
      },
    }
  );

  // Error state with retry
  if (inventoryQuery.isError) {
    return (
      <div className="p-4">
        <Alert variant="destructive">
          <AlertTitle>Failed to load inventory</AlertTitle>
          <AlertDescription>
            {inventoryQuery.error.message}
          </AlertDescription>
        </Alert>
        
        {inventoryQuery.canRetry ? (
          <Button 
            onClick={inventoryQuery.handleRetry}
            className="mt-4"
          >
            Retry ({inventoryQuery.maxRetries - inventoryQuery.retryCount} attempts remaining)
          </Button>
        ) : (
          <div className="mt-4 text-sm text-muted-foreground">
            <p>Maximum retries reached. Please try:</p>
            <ul className="list-disc ml-4 mt-2">
              <li>Refreshing the page</li>
              <li>Selecting a different customer</li>
              <li>Contacting support if the issue persists</li>
            </ul>
          </div>
        )}
      </div>
    );
  }

  // ... rest of component
}
```

**Apply to ClientsListPage:**

```typescript
// client/src/pages/ClientsListPage.tsx

export function ClientsListPage() {
  const clientsQuery = useRetryableQuery(
    trpc.clients.list.useQuery(filters),
    { maxRetries: 3 }
  );

  if (clientsQuery.isError) {
    return (
      <ErrorState
        message="Failed to load clients"
        error={clientsQuery.error}
        onRetry={clientsQuery.canRetry ? clientsQuery.handleRetry : undefined}
        retryCount={clientsQuery.retryCount}
        maxRetries={clientsQuery.maxRetries}
      />
    );
  }

  // ... rest of component
}
```

---

## Task 3: BUG-046 - Misleading Auth Error

**Priority**: P1  
**Files**: `server/_core/trpc.ts`, `server/middleware/permissionMiddleware.ts`, `client/src/components/ErrorBoundary.tsx`  
**Time Estimate**: 1.5 hours

### Problem Analysis

Same error message "Authentication required" used for:
1. Not logged in
2. Logged in as demo user
3. Logged in but lacking permission

### Stable Fix

**Server-side: Differentiate error types**

```typescript
// server/_core/trpc.ts

// Define specific error types
export const AuthErrors = {
  NOT_AUTHENTICATED: {
    code: 'UNAUTHORIZED' as const,
    message: 'Please log in to continue',
  },
  SESSION_EXPIRED: {
    code: 'UNAUTHORIZED' as const,
    message: 'Your session has expired. Please log in again.',
  },
  DEMO_USER_RESTRICTED: {
    code: 'FORBIDDEN' as const,
    message: 'This feature is not available in demo mode',
  },
  PERMISSION_DENIED: {
    code: 'FORBIDDEN' as const,
    message: 'You do not have permission to perform this action',
  },
} as const;

// Update middleware
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.session) {
    throw new TRPCError(AuthErrors.NOT_AUTHENTICATED);
  }

  if (ctx.session.expired) {
    throw new TRPCError(AuthErrors.SESSION_EXPIRED);
  }

  if (!ctx.user) {
    throw new TRPCError(AuthErrors.NOT_AUTHENTICATED);
  }

  return next({ ctx: { ...ctx, user: ctx.user } });
});

// Permission middleware
export function requirePermission(permission: string) {
  return t.middleware(async ({ ctx, next }) => {
    if (ctx.user.isDemo) {
      // Log for analytics
      console.info(`[Auth] Demo user blocked from: ${permission}`);
      throw new TRPCError({
        ...AuthErrors.DEMO_USER_RESTRICTED,
        message: `Demo users cannot access: ${permission}`,
      });
    }

    const hasPermission = await checkPermission(ctx.user.id, permission);
    
    if (!hasPermission) {
      // Log for security audit
      console.warn(`[Auth] Permission denied: user=${ctx.user.id}, permission=${permission}`);
      throw new TRPCError({
        ...AuthErrors.PERMISSION_DENIED,
        message: `You need the "${permission}" permission to perform this action`,
      });
    }

    return next();
  });
}
```

**Client-side: Handle different error types**

```typescript
// client/src/utils/errorHandler.ts

import { TRPCClientError } from '@trpc/client';

export function handleTRPCError(error: TRPCClientError<any>) {
  const code = error.data?.code;
  const message = error.message;

  switch (code) {
    case 'UNAUTHORIZED':
      // Redirect to login
      toast.error(message || 'Please log in to continue');
      window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname);
      break;
      
    case 'FORBIDDEN':
      // Show permission error (don't redirect)
      if (message.includes('demo')) {
        toast.warning(message, {
          action: {
            label: 'Upgrade',
            onClick: () => window.location.href = '/upgrade',
          },
        });
      } else {
        toast.error(message || 'You do not have permission for this action');
      }
      break;
      
    case 'NOT_FOUND':
      toast.error('The requested resource was not found');
      break;
      
    default:
      toast.error(message || 'An unexpected error occurred');
  }
}

// Use in components
const mutation = trpc.users.delete.useMutation({
  onError: handleTRPCError,
});
```

**Update UserManagement component:**

```typescript
// client/src/components/UserManagement.tsx

export function UserManagement() {
  const { data: users, isLoading, error } = trpc.userManagement.listUsers.useQuery();

  if (error) {
    const code = error.data?.code;
    
    if (code === 'FORBIDDEN') {
      return (
        <Alert variant="warning">
          <AlertTitle>Access Restricted</AlertTitle>
          <AlertDescription>
            {error.message}
            {error.message.includes('demo') && (
              <Button variant="link" asChild>
                <Link to="/upgrade">Upgrade your account</Link>
              </Button>
            )}
          </AlertDescription>
        </Alert>
      );
    }
    
    if (code === 'UNAUTHORIZED') {
      return (
        <Alert variant="destructive">
          <AlertTitle>Session Expired</AlertTitle>
          <AlertDescription>
            <Button variant="link" asChild>
              <Link to="/login">Log in again</Link>
            </Button>
          </AlertDescription>
        </Alert>
      );
    }
    
    return <ErrorState message={error.message} />;
  }

  // ... rest of component
}
```

---

## Git Workflow

```bash
git checkout -b fix/wave-2a-search-forms-stable

# Search fix
git add migrations/add_search_indexes.sql
git commit -m "db: Add trigram indexes for search performance"

git add server/routers/search.ts server/__tests__/search.test.ts
git commit -m "fix(BUG-042): Expand search to include product names

- Search now includes: name, strain, category, sku
- Added relevance scoring
- Added input sanitization
- Added performance indexes
- Added comprehensive tests

Fixes: BUG-042"

# Retry button fix
git add client/src/hooks/useRetryableQuery.ts
git add client/src/pages/OrderCreatorPage.tsx
git add client/src/pages/ClientsListPage.tsx
git commit -m "fix(BUG-045,BUG-048): Replace reload with proper retry

- Created useRetryableQuery hook
- Preserves form state on retry
- Limits retry attempts
- Shows helpful messages on max retries

Fixes: BUG-045, BUG-048"

# Auth error fix
git add server/_core/trpc.ts
git add server/middleware/permissionMiddleware.ts
git add client/src/utils/errorHandler.ts
git add client/src/components/UserManagement.tsx
git commit -m "fix(BUG-046): Differentiate auth error messages

- UNAUTHORIZED = not logged in
- FORBIDDEN = no permission
- Specific messages for demo users
- Client handles each type appropriately

Fixes: BUG-046"

git push origin fix/wave-2a-search-forms-stable
```

---

## Success Criteria

- [ ] Search returns products by name
- [ ] Search indexes created
- [ ] Retry buttons preserve form state
- [ ] Auth errors show correct messages
- [ ] All unit tests pass
- [ ] No performance regression

---

## Handoff

When complete:
1. Create PR with all commits
2. Note: Database migration needs to run
3. Notify Wave 3 lead
4. Update roadmap status

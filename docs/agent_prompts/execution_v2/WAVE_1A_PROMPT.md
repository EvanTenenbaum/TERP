# Wave 1A: Order & Batch Critical Fixes (Stability-Focused)

**Agent Role**: Backend Developer  
**Duration**: 5-6 hours  
**Priority**: P0 - CRITICAL  
**Deadline**: Day 1 Morning  
**Can Run Parallel With**: Wave 1B, Wave 1C

---

## Stability Requirements (READ FIRST)

Every fix in this wave MUST:
1. ✅ Include unit tests for the fix
2. ✅ Include logging for debugging
3. ✅ Handle edge cases explicitly
4. ✅ Not break existing functionality
5. ✅ Be reviewable in isolation

---

## Task 1: BUG-040 - Order Creator Inventory Loading

**Priority**: P0  
**Files**: `server/pricingEngine.ts`, `server/salesSheetsDb.ts`  
**Time Estimate**: 2-3 hours

### Problem Analysis

When a client has an empty `rules` array in their pricing profile, the code generates invalid SQL: `WHERE id IN ()`.

### Root Cause Investigation

Before fixing, understand WHY rules might be empty:
1. New client without pricing setup?
2. Data migration issue?
3. Deleted pricing rules?

```bash
# Check how many clients have empty rules
psql -c "SELECT COUNT(*) FROM clients c LEFT JOIN pricing_rules pr ON c.id = pr.client_id WHERE pr.id IS NULL;"
```

### Stable Fix (Not Just a Patch)

```typescript
// server/pricingEngine.ts

/**
 * Get inventory with pricing for a client.
 * 
 * IMPORTANT: If client has no custom pricing rules, we fall back to
 * default/base pricing. We do NOT return empty inventory.
 * 
 * @param clientId - The client to get pricing for
 * @returns Inventory items with calculated prices
 */
export async function getInventoryWithPricing(clientId: number): Promise<InventoryWithPricing[]> {
  const client = await getClientById(clientId);
  if (!client) {
    throw new Error(`Client ${clientId} not found`);
  }

  const rules = await getPricingRulesForClient(clientId);
  
  // Log for debugging - helps track how often this happens
  if (rules.length === 0) {
    console.info(`[PricingEngine] Client ${clientId} has no custom pricing rules, using defaults`);
  }

  // Get base inventory (always works, no rules needed)
  const inventory = await getBaseInventory();
  
  if (rules.length === 0) {
    // Return inventory with default/base pricing
    return inventory.map(item => ({
      ...item,
      price: item.basePrice,
      priceSource: 'DEFAULT',
    }));
  }

  // Apply custom pricing rules
  const ruleIds = rules.map(r => r.id);
  const customPrices = await getCustomPrices(ruleIds);
  
  return inventory.map(item => {
    const customPrice = customPrices.find(p => p.productId === item.productId);
    return {
      ...item,
      price: customPrice?.price ?? item.basePrice,
      priceSource: customPrice ? 'CUSTOM' : 'DEFAULT',
    };
  });
}
```

### Unit Tests Required

```typescript
// server/__tests__/pricingEngine.test.ts

describe('getInventoryWithPricing', () => {
  it('returns inventory with custom pricing when rules exist', async () => {
    // Setup: Client with pricing rules
    const client = await createTestClient({ withPricingRules: true });
    
    const result = await getInventoryWithPricing(client.id);
    
    expect(result.length).toBeGreaterThan(0);
    expect(result.some(i => i.priceSource === 'CUSTOM')).toBe(true);
  });

  it('returns inventory with default pricing when no rules exist', async () => {
    // Setup: Client WITHOUT pricing rules
    const client = await createTestClient({ withPricingRules: false });
    
    const result = await getInventoryWithPricing(client.id);
    
    expect(result.length).toBeGreaterThan(0);
    expect(result.every(i => i.priceSource === 'DEFAULT')).toBe(true);
  });

  it('throws error for non-existent client', async () => {
    await expect(getInventoryWithPricing(999999))
      .rejects.toThrow('Client 999999 not found');
  });

  it('handles client with some rules but no matching products', async () => {
    // Edge case: Rules exist but don't match any current inventory
    const client = await createTestClient({ withOrphanedRules: true });
    
    const result = await getInventoryWithPricing(client.id);
    
    expect(result.length).toBeGreaterThan(0);
    // Should fall back to default for unmatched products
  });
});
```

### Verification Steps

1. **Database Check**:
```sql
-- Find clients that would have triggered this bug
SELECT c.id, c.name, COUNT(pr.id) as rule_count
FROM clients c
LEFT JOIN pricing_rules pr ON c.id = pr.client_id
GROUP BY c.id, c.name
HAVING COUNT(pr.id) = 0;
```

2. **Manual Test**:
   - Go to `/orders/create`
   - Select a client WITH pricing rules → Should show custom prices
   - Select a client WITHOUT pricing rules → Should show default prices (NOT empty)

3. **Log Verification**:
   - Check server logs for `[PricingEngine] Client X has no custom pricing rules`
   - This helps track the frequency of this edge case

---

## Task 2: BUG-041 - Batch Detail View Crash

**Priority**: P0  
**Files**: `client/src/components/inventory/BatchDetailDrawer.tsx`, `server/routers/inventory.ts`  
**Time Estimate**: 2 hours

### Problem Analysis

The component crashes because `.map()` is called on undefined arrays. But WHY are they undefined?

### Root Cause Investigation

```bash
# Check the API response structure
curl -s "https://terp-app-b9s35.ondigitalocean.app/api/trpc/inventory.getById?input={\"id\":1}" | jq .
```

Possible causes:
1. API returns null for empty arrays instead of `[]`
2. Race condition where data isn't loaded yet
3. Error in API that returns partial data

### Stable Fix (Fix at Source AND Add Defense)

**Server-side fix (preferred):**
```typescript
// server/routers/inventory.ts

getById: protectedProcedure
  .input(z.object({ id: z.number() }))
  .query(async ({ ctx, input }) => {
    const batch = await getBatchById(input.id);
    
    if (!batch) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: `Batch ${input.id} not found`,
      });
    }

    // ALWAYS return arrays, never undefined
    return {
      ...batch,
      locations: batch.locations ?? [],
      auditLogs: batch.auditLogs ?? [],
      // Ensure all array fields have defaults
    };
  }),
```

**Client-side defense (belt AND suspenders):**
```typescript
// client/src/components/inventory/BatchDetailDrawer.tsx

interface BatchDetailDrawerProps {
  batchId: number;
  open: boolean;
  onClose: () => void;
}

export function BatchDetailDrawer({ batchId, open, onClose }: BatchDetailDrawerProps) {
  const { data: batch, isLoading, error } = trpc.inventory.getById.useQuery(
    { id: batchId },
    { enabled: open && batchId > 0 }
  );

  // Handle loading state
  if (isLoading) {
    return <DrawerSkeleton />;
  }

  // Handle error state
  if (error) {
    console.error(`[BatchDetailDrawer] Error loading batch ${batchId}:`, error);
    return (
      <Drawer open={open} onClose={onClose}>
        <ErrorState 
          message="Failed to load batch details" 
          onRetry={() => refetch()}
        />
      </Drawer>
    );
  }

  // Handle missing data (shouldn't happen with proper API, but be safe)
  if (!batch) {
    console.warn(`[BatchDetailDrawer] Batch ${batchId} returned null`);
    return (
      <Drawer open={open} onClose={onClose}>
        <ErrorState message="Batch not found" />
      </Drawer>
    );
  }

  // Safe array access with logging for unexpected states
  const locations = batch.locations ?? [];
  const auditLogs = batch.auditLogs ?? [];
  
  if (!batch.locations) {
    console.warn(`[BatchDetailDrawer] Batch ${batchId} has undefined locations`);
  }
  if (!batch.auditLogs) {
    console.warn(`[BatchDetailDrawer] Batch ${batchId} has undefined auditLogs`);
  }

  return (
    <Drawer open={open} onClose={onClose}>
      {/* ... render with safe arrays ... */}
      
      <section>
        <h3>Locations ({locations.length})</h3>
        {locations.length === 0 ? (
          <EmptyState message="No location data" />
        ) : (
          locations.map(loc => <LocationCard key={loc.id} location={loc} />)
        )}
      </section>
      
      <section>
        <h3>Audit Log ({auditLogs.length})</h3>
        {auditLogs.length === 0 ? (
          <EmptyState message="No audit history" />
        ) : (
          auditLogs.map(log => <AuditLogEntry key={log.id} log={log} />)
        )}
      </section>
    </Drawer>
  );
}
```

### Unit Tests Required

```typescript
// client/src/components/inventory/__tests__/BatchDetailDrawer.test.tsx

describe('BatchDetailDrawer', () => {
  it('renders batch with all data', async () => {
    const batch = mockBatch({ locations: [mockLocation()], auditLogs: [mockAuditLog()] });
    server.use(rest.get('/api/trpc/inventory.getById', (req, res, ctx) => 
      res(ctx.json({ result: { data: batch } }))
    ));

    render(<BatchDetailDrawer batchId={1} open={true} onClose={jest.fn()} />);
    
    await waitFor(() => {
      expect(screen.getByText('Locations (1)')).toBeInTheDocument();
      expect(screen.getByText('Audit Log (1)')).toBeInTheDocument();
    });
  });

  it('handles batch with empty arrays', async () => {
    const batch = mockBatch({ locations: [], auditLogs: [] });
    server.use(rest.get('/api/trpc/inventory.getById', (req, res, ctx) => 
      res(ctx.json({ result: { data: batch } }))
    ));

    render(<BatchDetailDrawer batchId={1} open={true} onClose={jest.fn()} />);
    
    await waitFor(() => {
      expect(screen.getByText('No location data')).toBeInTheDocument();
      expect(screen.getByText('No audit history')).toBeInTheDocument();
    });
  });

  it('handles batch with undefined arrays (legacy data)', async () => {
    const batch = mockBatch({ locations: undefined, auditLogs: undefined });
    server.use(rest.get('/api/trpc/inventory.getById', (req, res, ctx) => 
      res(ctx.json({ result: { data: batch } }))
    ));

    render(<BatchDetailDrawer batchId={1} open={true} onClose={jest.fn()} />);
    
    // Should NOT crash
    await waitFor(() => {
      expect(screen.getByText('No location data')).toBeInTheDocument();
    });
  });

  it('shows error state on API failure', async () => {
    server.use(rest.get('/api/trpc/inventory.getById', (req, res, ctx) => 
      res(ctx.status(500))
    ));

    render(<BatchDetailDrawer batchId={1} open={true} onClose={jest.fn()} />);
    
    await waitFor(() => {
      expect(screen.getByText('Failed to load batch details')).toBeInTheDocument();
    });
  });
});
```

---

## Task 3: BUG-043 - Permission Service Empty Array

**Priority**: P0  
**Files**: `server/services/permissionService.ts`  
**Time Estimate**: 1.5 hours

### Security Consideration

This is a SECURITY-SENSITIVE fix. Empty permissions should mean "NO ACCESS", not "skip the check".

### Stable Fix

```typescript
// server/services/permissionService.ts

/**
 * Check if a user has specific permissions.
 * 
 * SECURITY: Empty permission set = NO permissions granted.
 * This is a deny-by-default security model.
 */
export async function getUserPermissions(userId: number): Promise<Permission[]> {
  const user = await getUserById(userId);
  if (!user) {
    console.warn(`[PermissionService] User ${userId} not found`);
    return []; // No user = no permissions
  }

  const roleIds = await getUserRoleIds(userId);
  
  // SECURITY: No roles = no permissions
  if (roleIds.length === 0) {
    console.info(`[PermissionService] User ${userId} has no roles assigned`);
    return [];
  }

  const permissionIds = await getPermissionIdsForRoles(roleIds);
  
  // SECURITY: No permission IDs = no permissions
  if (permissionIds.length === 0) {
    console.info(`[PermissionService] User ${userId} roles have no permissions`);
    return [];
  }

  // Safe to query now - we know array is not empty
  const permissions = await db.select()
    .from(rolePermissions)
    .where(inArray(rolePermissions.permissionId, permissionIds));

  return permissions;
}

/**
 * Check if user has a specific permission.
 * 
 * SECURITY: Returns false if user has no permissions.
 */
export async function hasPermission(userId: number, permission: string): Promise<boolean> {
  const permissions = await getUserPermissions(userId);
  
  // Empty permissions = deny access
  if (permissions.length === 0) {
    return false;
  }

  return permissions.some(p => p.name === permission);
}

// UTILITY: Safe inArray wrapper for use elsewhere
export function safeInArray<T>(column: Column, values: T[]): SQL {
  if (values.length === 0) {
    // Return a condition that's always false
    return sql`false`;
  }
  return inArray(column, values);
}
```

### Unit Tests Required

```typescript
// server/services/__tests__/permissionService.test.ts

describe('getUserPermissions', () => {
  it('returns permissions for user with roles', async () => {
    const user = await createTestUser({ roles: ['admin'] });
    
    const permissions = await getUserPermissions(user.id);
    
    expect(permissions.length).toBeGreaterThan(0);
  });

  it('returns empty array for user with no roles', async () => {
    const user = await createTestUser({ roles: [] });
    
    const permissions = await getUserPermissions(user.id);
    
    expect(permissions).toEqual([]);
  });

  it('returns empty array for non-existent user', async () => {
    const permissions = await getUserPermissions(999999);
    
    expect(permissions).toEqual([]);
  });
});

describe('hasPermission', () => {
  it('returns true when user has permission', async () => {
    const user = await createTestUser({ roles: ['admin'] });
    
    const result = await hasPermission(user.id, 'manage_users');
    
    expect(result).toBe(true);
  });

  it('returns false when user lacks permission', async () => {
    const user = await createTestUser({ roles: ['viewer'] });
    
    const result = await hasPermission(user.id, 'manage_users');
    
    expect(result).toBe(false);
  });

  it('returns false for user with no roles (security test)', async () => {
    const user = await createTestUser({ roles: [] });
    
    const result = await hasPermission(user.id, 'any_permission');
    
    expect(result).toBe(false);
  });
});
```

---

## Git Workflow

```bash
# Create feature branch
git checkout -b fix/wave-1a-critical-stable

# Work on each fix in separate commits
# BUG-040
git add server/pricingEngine.ts server/__tests__/pricingEngine.test.ts
git commit -m "fix(BUG-040): Handle empty pricing rules with default pricing

- Return default pricing when client has no custom rules
- Add logging for debugging
- Add comprehensive unit tests
- BREAKING: None - behavior improved, not changed

Fixes: BUG-040"

# BUG-041
git add client/src/components/inventory/BatchDetailDrawer.tsx
git add server/routers/inventory.ts
git add client/src/components/inventory/__tests__/BatchDetailDrawer.test.ts
git commit -m "fix(BUG-041): Prevent crash on undefined arrays in BatchDetailDrawer

- Server: Always return arrays, never undefined
- Client: Defensive checks with logging
- Add empty states for missing data
- Add comprehensive unit tests

Fixes: BUG-041"

# BUG-043
git add server/services/permissionService.ts
git add server/services/__tests__/permissionService.test.ts
git commit -m "fix(BUG-043): Handle empty permission arrays safely

- Empty permissions = no access (security)
- Add safeInArray utility for reuse
- Add logging for audit trail
- Add comprehensive unit tests

Fixes: BUG-043
Security: Deny-by-default model maintained"

# Push for review
git push origin fix/wave-1a-critical-stable
```

---

## Success Criteria

- [ ] All three bugs fixed
- [ ] All unit tests pass
- [ ] No regressions in existing tests
- [ ] Logging added for debugging
- [ ] Edge cases handled explicitly
- [ ] Security implications documented

---

## Rollback Plan

If issues are found post-deploy:

```bash
# Revert the specific commit
git revert <commit-hash>
git push origin main

# Or rollback entire branch
git revert --no-commit HEAD~3..HEAD
git commit -m "Rollback Wave 1A due to [issue]"
git push origin main
```

---

## Handoff

When complete:
1. Create PR with all commits
2. Request review from another developer
3. Run full test suite: `pnpm test`
4. Notify Wave 3 lead that 1A is ready
5. Update roadmap status

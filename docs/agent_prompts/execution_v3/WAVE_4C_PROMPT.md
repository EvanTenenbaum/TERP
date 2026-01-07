# Wave 4C: Silent Error Fixes

**Agent Role**: Full Stack Developer  
**Duration**: 4-5 hours  
**Priority**: P2  
**Timeline**: Week 2, Day 1-2  
**Can Run Parallel With**: Wave 4A, 4B

---

## Overview

Fix silent error handling patterns across the codebase that swallow errors, return null/empty without logging, or provide generic error messages that don't help debugging.

---

## Philosophy

**Before (Bad)**:
```typescript
try {
  return await doSomething();
} catch {
  return null; // Silent failure - no one knows what happened
}
```

**After (Good)**:
```typescript
try {
  return await doSomething();
} catch (error) {
  console.error('[doSomething] Failed:', error);
  throw new TRPCError({
    code: 'INTERNAL_SERVER_ERROR',
    message: 'Failed to do something. Please try again.',
    cause: error,
  });
}
```

---

## Task 1: Fix Unsafe .map() Calls (1.5 hours)

### BUG-054: AppointmentRequestsList

**File**: `client/src/components/calendar/AppointmentRequestsList.tsx`

```typescript
// Find the .map() call on potentially undefined data
// BEFORE
{data.appointments.map(apt => (
  <AppointmentCard key={apt.id} {...apt} />
))}

// AFTER
{(data?.appointments ?? []).map(apt => (
  <AppointmentCard key={apt.id} {...apt} />
))}

// Or with explicit check
{data?.appointments?.length > 0 ? (
  data.appointments.map(apt => (
    <AppointmentCard key={apt.id} {...apt} />
  ))
) : (
  <EmptyState 
    title="No appointment requests"
    description="Appointment requests will appear here"
  />
)}
```

### BUG-055: TimeOffRequestsList

**File**: `client/src/components/calendar/TimeOffRequestsList.tsx`

Apply same pattern as BUG-054.

### BUG-056: Dashboard Activity Log

**File**: `client/src/components/dashboard/ActivityLogPanel.tsx`

```typescript
// Find activities.map()
// BEFORE
{activities.map(activity => (
  <ActivityItem key={activity.id} {...activity} />
))}

// AFTER
{(activities ?? []).map(activity => (
  <ActivityItem key={activity.id} {...activity} />
))}
```

### Verification

```typescript
// Add test for each component
describe('AppointmentRequestsList', () => {
  it('handles undefined appointments gracefully', () => {
    render(<AppointmentRequestsList data={undefined} />);
    expect(screen.queryByText('No appointment requests')).toBeInTheDocument();
  });

  it('handles empty appointments array', () => {
    render(<AppointmentRequestsList data={{ appointments: [] }} />);
    expect(screen.queryByText('No appointment requests')).toBeInTheDocument();
  });
});
```

---

## Task 2: Fix Search Inconsistency (1 hour)

### BUG-057: Global Search vs Inventory Search

**Problem**: Global search only searches `code` and `sku`, but inventory search searches 8 fields including product name.

**File**: `server/routers/search.ts`

```typescript
// BEFORE (lines ~94-113)
const batchResults = await db.query.batches.findMany({
  where: or(
    ilike(batches.code, `%${query}%`),
    ilike(batches.sku, `%${query}%`)
  ),
  limit: 10,
});

// AFTER - Match inventory search fields
const batchResults = await db
  .select({
    id: batches.id,
    code: batches.code,
    sku: batches.sku,
    productName: products.name,
    strain: products.strain,
    category: products.category,
    vendor: vendors.name,
  })
  .from(batches)
  .leftJoin(products, eq(batches.productId, products.id))
  .leftJoin(vendors, eq(batches.vendorId, vendors.id))
  .where(
    or(
      ilike(batches.code, `%${query}%`),
      ilike(batches.sku, `%${query}%`),
      ilike(products.name, `%${query}%`),
      ilike(products.strain, `%${query}%`),
      ilike(products.category, `%${query}%`),
      ilike(vendors.name, `%${query}%`)
    )
  )
  .limit(10);
```

### Add Search Index

```sql
-- migrations/add_search_indexes.sql
CREATE INDEX CONCURRENTLY idx_products_name_gin 
  ON products USING gin(name gin_trgm_ops);
  
CREATE INDEX CONCURRENTLY idx_products_strain_gin 
  ON products USING gin(strain gin_trgm_ops);
```

### Test

```typescript
describe('Global Search', () => {
  it('finds products by name', async () => {
    const results = await caller.search.global({ query: 'OG Kush' });
    expect(results.batches.length).toBeGreaterThan(0);
  });

  it('finds products by strain', async () => {
    const results = await caller.search.global({ query: 'Indica' });
    expect(results.batches.length).toBeGreaterThan(0);
  });
});
```

---

## Task 3: Fix Silent Returns in Auth (0.5 hours)

### BUG-058: Auth Helpers Silent Null

**File**: `server/_core/authHelpers.ts`

```typescript
// Find catch blocks that return null silently
// BEFORE
export async function getSessionUser(sessionId: string) {
  try {
    return await db.query.sessions.findFirst({
      where: eq(sessions.id, sessionId),
      with: { user: true },
    });
  } catch {
    return null; // Silent failure
  }
}

// AFTER
export async function getSessionUser(sessionId: string) {
  try {
    const session = await db.query.sessions.findFirst({
      where: eq(sessions.id, sessionId),
      with: { user: true },
    });
    
    if (!session) {
      console.debug('[Auth] Session not found:', sessionId);
    }
    
    return session;
  } catch (error) {
    console.error('[Auth] Failed to get session user:', {
      sessionId,
      error: error instanceof Error ? error.message : error,
    });
    return null; // Still return null but now we know why
  }
}
```

---

## Task 4: Fix Silent Returns in Inventory (0.5 hours)

### BUG-059: Inventory Utils Silent Empty

**File**: `server/inventoryUtils.ts`

```typescript
// BEFORE
export async function getBatchAvailability(batchId: number) {
  try {
    // ... calculation
    return availability;
  } catch {
    return { available: 0, reserved: 0, total: 0 };
  }
}

// AFTER
export async function getBatchAvailability(batchId: number) {
  try {
    const batch = await db.query.batches.findFirst({
      where: eq(batches.id, batchId),
    });
    
    if (!batch) {
      console.warn('[Inventory] Batch not found for availability check:', batchId);
      return { available: 0, reserved: 0, total: 0, error: 'BATCH_NOT_FOUND' };
    }
    
    // ... calculation
    return availability;
  } catch (error) {
    console.error('[Inventory] Failed to get batch availability:', {
      batchId,
      error: error instanceof Error ? error.message : error,
    });
    return { available: 0, reserved: 0, total: 0, error: 'CALCULATION_FAILED' };
  }
}
```

---

## Task 5: Fix Audit Router Silent Returns (0.5 hours)

### BUG-060: Audit Router Empty Array

**File**: `server/routers/audit.ts`

```typescript
// BEFORE
getAuditLogs: protectedProcedure
  .input(z.object({ entityType: z.string(), entityId: z.number() }))
  .query(async ({ input }) => {
    try {
      return await db.query.auditLogs.findMany({
        where: and(
          eq(auditLogs.entityType, input.entityType),
          eq(auditLogs.entityId, input.entityId)
        ),
        orderBy: desc(auditLogs.createdAt),
      });
    } catch {
      return []; // Silent failure
    }
  }),

// AFTER
getAuditLogs: protectedProcedure
  .input(z.object({ entityType: z.string(), entityId: z.number() }))
  .query(async ({ input }) => {
    try {
      const logs = await db.query.auditLogs.findMany({
        where: and(
          eq(auditLogs.entityType, input.entityType),
          eq(auditLogs.entityId, input.entityId)
        ),
        orderBy: desc(auditLogs.createdAt),
      });
      
      console.debug('[Audit] Retrieved logs:', {
        entityType: input.entityType,
        entityId: input.entityId,
        count: logs.length,
      });
      
      return logs;
    } catch (error) {
      console.error('[Audit] Failed to get audit logs:', {
        input,
        error: error instanceof Error ? error.message : error,
      });
      
      // Return empty array but log the error
      // Consider throwing if audit logs are critical
      return [];
    }
  }),
```

---

## Task 6: Fix Generic Error Messages (1 hour)

### BUG-068: Accounting Generic Errors

**File**: `server/routers/accounting.ts`

```typescript
// Find generic "Unauthorized" errors
// BEFORE
if (!hasPermission) {
  throw new TRPCError({
    code: 'UNAUTHORIZED',
    message: 'Unauthorized',
  });
}

// AFTER
if (!hasPermission) {
  throw new TRPCError({
    code: 'FORBIDDEN',
    message: `You don't have permission to ${action} ${resource}. Required: ${requiredPermission}`,
  });
}
```

### BUG-069: Calendar Permission Errors

**File**: `server/routers/calendar.ts`

```typescript
// BEFORE
if (!canViewCalendar) {
  throw new TRPCError({
    code: 'FORBIDDEN',
    message: 'Permission denied',
  });
}

// AFTER
if (!canViewCalendar) {
  throw new TRPCError({
    code: 'FORBIDDEN',
    message: 'You don\'t have permission to view this calendar. Contact your administrator to request access.',
  });
}
```

### Create Error Message Constants

```typescript
// server/constants/errorMessages.ts

export const ERROR_MESSAGES = {
  // Auth
  AUTH_REQUIRED: 'Please log in to continue.',
  SESSION_EXPIRED: 'Your session has expired. Please log in again.',
  
  // Permissions
  PERMISSION_DENIED: (action: string, resource: string) =>
    `You don't have permission to ${action} ${resource}.`,
  ROLE_REQUIRED: (role: string) =>
    `This action requires the ${role} role.`,
  
  // Resources
  NOT_FOUND: (resource: string) =>
    `${resource} not found.`,
  ALREADY_EXISTS: (resource: string) =>
    `${resource} already exists.`,
  
  // Operations
  CREATE_FAILED: (resource: string) =>
    `Failed to create ${resource}. Please try again.`,
  UPDATE_FAILED: (resource: string) =>
    `Failed to update ${resource}. Please try again.`,
  DELETE_FAILED: (resource: string) =>
    `Failed to delete ${resource}. Please try again.`,
};
```

---

## Git Workflow

```bash
git checkout -b fix/wave-4c-silent-errors

# Fix unsafe .map() calls
git add client/src/components/calendar/AppointmentRequestsList.tsx
git add client/src/components/calendar/TimeOffRequestsList.tsx
git add client/src/components/dashboard/ActivityLogPanel.tsx
git commit -m "fix(BUG-054,055,056): Add null checks for .map() calls

- AppointmentRequestsList: Handle undefined appointments
- TimeOffRequestsList: Handle undefined requests
- ActivityLogPanel: Handle undefined activities"

# Fix search
git add server/routers/search.ts
git commit -m "fix(BUG-057): Expand global search to include product fields

Now searches: code, sku, product name, strain, category, vendor"

# Fix silent returns
git add server/_core/authHelpers.ts
git add server/inventoryUtils.ts
git add server/routers/audit.ts
git commit -m "fix(BUG-058,059,060): Add logging to silent error handlers

- authHelpers: Log session lookup failures
- inventoryUtils: Log availability calculation errors
- audit router: Log query failures"

# Fix generic errors
git add server/routers/accounting.ts
git add server/routers/calendar.ts
git add server/constants/errorMessages.ts
git commit -m "fix(BUG-068,069): Replace generic error messages with specific ones

- Accounting: Specific permission error messages
- Calendar: Helpful permission denied messages
- Added ERROR_MESSAGES constants"

git push origin fix/wave-4c-silent-errors
gh pr create --title "fix(Wave-4C): Silent error fixes and improved error messages" --body "..."
```

---

## Testing Requirements

### Unit Tests

```typescript
// server/__tests__/errorHandling.test.ts

describe('Error Handling', () => {
  describe('authHelpers', () => {
    it('logs when session not found', async () => {
      const consoleSpy = jest.spyOn(console, 'debug');
      await getSessionUser('nonexistent-id');
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Auth] Session not found')
      );
    });
  });

  describe('search', () => {
    it('finds products by name', async () => {
      // Seed test product
      const results = await search({ query: 'Test Product' });
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('error messages', () => {
    it('provides specific permission error', async () => {
      // Try to access without permission
      await expect(
        caller.accounting.createInvoice({})
      ).rejects.toThrow(/don't have permission/);
    });
  });
});
```

---

## Success Criteria

- [ ] BUG-054: AppointmentRequestsList handles undefined
- [ ] BUG-055: TimeOffRequestsList handles undefined
- [ ] BUG-056: ActivityLogPanel handles undefined
- [ ] BUG-057: Global search finds products by name
- [ ] BUG-058: Auth helpers log failures
- [ ] BUG-059: Inventory utils log failures
- [ ] BUG-060: Audit router logs failures
- [ ] BUG-068: Accounting has specific errors
- [ ] BUG-069: Calendar has specific errors
- [ ] All tests passing
- [ ] No silent failures in logs

---

## Handoff

After Wave 4C completion:

1. Create PR with all fixes
2. Request review from Wave 4A/4B agents
3. Merge after approval
4. Update MASTER_ROADMAP bug statuses

**Next**: Wave 5A (Sales), 5B (Inventory), 5C (Accounting) - can run in parallel

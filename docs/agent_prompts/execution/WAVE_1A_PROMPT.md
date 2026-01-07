# Wave 1A: Order & Batch Crashes

**Agent Role**: Backend Developer  
**Duration**: 4-5 hours  
**Priority**: P0 - CRITICAL  
**Deadline**: Day 1 Morning (Tuesday)  
**Can Run Parallel With**: Wave 1B

---

## Context

You are fixing critical bugs that crash the TERP application or block core business functions. These must be fixed before Thursday's user testing deadline.

---

## Tasks

### Task 1: BUG-040 - Order Creator Inventory Loading Fails

**Priority**: P0  
**File**: `server/pricingEngine.ts`  
**Lines**: 332-362  
**Time Estimate**: 2-3 hours

**Problem**: When a client has an empty `rules` array in their pricing profile, the code generates invalid SQL: `WHERE id IN ()`. This causes the inventory loading to fail with "Failed to load inventory" error.

**Root Cause**:
```typescript
// Current code around line 350
const ruleIds = rules.map(r => r.id);
// ... later ...
sql.raw(ruleIds.join(","))  // Creates empty string when ruleIds is []
```

**Fix Required**:
```typescript
// Add empty array check before the SQL query
if (ruleIds.length === 0) {
  return []; // Return empty array instead of invalid SQL
}
```

**Verification**:
1. Go to https://terp-app-b9s35.ondigitalocean.app/orders/create
2. Select any customer from dropdown
3. Verify inventory loads without "Failed to load inventory" error
4. Verify products appear in the product selection area

---

### Task 2: BUG-041 - Batch Detail View Crashes App

**Priority**: P0  
**File**: `client/src/components/inventory/BatchDetailDrawer.tsx`  
**Lines**: 498, 545, and similar  
**Time Estimate**: 1-2 hours

**Problem**: The component calls `.map()` on arrays that may be undefined, causing React to crash with "Cannot read properties of undefined (reading 'map')".

**Root Cause**:
```typescript
// Current code
{batch.locations.map(loc => ...)}
{batch.auditLogs.map(log => ...)}
```

**Fix Required**:
```typescript
// Add defensive null checks
{(batch?.locations || []).map(loc => ...)}
{(batch?.auditLogs || []).map(log => ...)}
```

**Also check these lines for similar issues**:
- Line 498: locations mapping
- Line 545: auditLogs mapping
- Any other `.map()` calls on batch properties

**Verification**:
1. Go to https://terp-app-b9s35.ondigitalocean.app/inventory
2. Click "View" button on any batch row
3. Verify the drawer opens without crashing
4. Verify batch details display correctly

---

### Task 3: BUG-043 - Permission Service Empty Array SQL Crash

**Priority**: P0  
**File**: `server/services/permissionService.ts`  
**Lines**: 185-210  
**Time Estimate**: 1 hour

**Problem**: The permission service uses `inArray(permissionIds)` without checking if the array is empty, which generates invalid SQL.

**Root Cause**:
```typescript
// Current code around line 190
const permissions = await db.select()
  .from(rolePermissions)
  .where(inArray(rolePermissions.permissionId, permissionIds));
```

**Fix Required**:
```typescript
// Add empty array check
if (permissionIds.length === 0) {
  return [];
}
const permissions = await db.select()
  .from(rolePermissions)
  .where(inArray(rolePermissions.permissionId, permissionIds));
```

**Verification**:
1. Create a test user with no roles assigned (or use demo user)
2. Verify the app doesn't crash on permission checks
3. Verify appropriate "permission denied" messages appear instead of crashes

---

## Git Workflow

```bash
# Create feature branch
git checkout -b fix/wave-1a-critical-crashes

# After each fix, commit separately
git add server/pricingEngine.ts
git commit -m "fix(BUG-040): Add empty array check in pricing engine

- Prevents invalid SQL when client has no pricing rules
- Returns empty array instead of crashing
- Fixes Order Creator inventory loading"

git add client/src/components/inventory/BatchDetailDrawer.tsx
git commit -m "fix(BUG-041): Add null checks to BatchDetailDrawer

- Prevents crash when locations/auditLogs are undefined
- Uses defensive (arr || []).map() pattern
- Fixes Batch Detail View crash"

git add server/services/permissionService.ts
git commit -m "fix(BUG-043): Add empty array check in permission service

- Prevents invalid SQL when permissionIds is empty
- Returns empty array instead of crashing"

# Push and create PR
git push origin fix/wave-1a-critical-crashes
```

---

## Success Criteria

- [ ] Order Creator loads inventory for all customers
- [ ] Batch Detail View opens without crashing
- [ ] No SQL errors in server logs related to empty arrays
- [ ] All changes have unit tests (if time permits)

---

## Handoff

When complete, notify the Wave 3 lead that Wave 1A is ready for integration. Update the task status in the roadmap.

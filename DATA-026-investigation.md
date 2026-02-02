# DATA-026 Investigation Report

## Executive Summary

The dashboard/inventory data mismatch is caused by **localStorage filter persistence** (Known Bug Pattern #2), NOT by different SQL queries.

## Root Cause Analysis

### What's Happening

1. **Dashboard Main Page**: Shows ~$13M inventory value (CORRECT)
   - Source: `inventoryDb.getDashboardStats()`
   - Query: Sums all batches with status in ["LIVE", "PHOTOGRAPHY_COMPLETE"]
   - Filter: Sellable statuses only, excludes soft-deleted

2. **Inventory Page Shows 0 Batches**: Due to persisted filters
   - The page uses `useInventoryFilters` hook
   - Filters are auto-saved to localStorage on every change (useInventoryFilters.ts:144-147)
   - When user returns to page, filters reload from localStorage (useInventoryFilters.ts:134-136)
   - If previous filter excluded all batches (e.g., status="QUARANTINED"), list shows empty

3. **Inventory Page Dashboard Stats**: Shows $13M (CORRECT but CONFUSING)
   - Line 470: `trpc.inventory.dashboardStats.useQuery()`
   - Calls same `getDashboardStats()` function
   - **Does NOT respect filters** - shows total inventory regardless of current filter state

### The Actual Bug

**INCONSISTENCY**: The Inventory page shows two contradictory views:

- **Dashboard cards at top**: $13M total inventory (unfiltered)
- **Inventory list below**: 0 batches (filtered by localStorage)

This violates user expectations - stats should match the list below them.

### Evidence from Code

**useInventoryFilters.ts:**

```typescript
// Line 86-100: Saves filters to localStorage
function saveFiltersToStorage(filters: InventoryFilters): void {
  try {
    const toStore = { ...filters, ... };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
  } catch { }
}

// Line 144-147: Auto-persists on every filter change
useEffect(() => {
  saveFiltersToStorage(filters);
}, [filters]);

// Line 134-136: Loads persisted filters on mount
const storedFilters = loadFiltersFromStorage();
if (storedFilters) {
  return { ...defaultFilters, ...storedFilters };
}
```

**Inventory.tsx:**

```typescript
// Line 685-708: Shows enhanced stats when available (RESPECTS FILTERS)
{useEnhancedApi && enhancedResponse?.summary ? (
  <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
    <Card className="p-4">
      <div className="text-sm text-muted-foreground">Total Value</div>
      <div className="text-2xl font-bold">
        ${enhancedResponse.summary.totalValue.toLocaleString(...)}
      </div>
    </Card>
  </div>
) : (
  // Line 707: Fallback shows unfiltered stats (IGNORES FILTERS)
  <DataCardSection moduleId="inventory" />
)}
```

**inventoryDb.ts:**

```typescript
// Line 1479-1618: getDashboardStats() - Used by BOTH pages
export async function getDashboardStats() {
  // Line 1492-1495: ALWAYS filters to sellable statuses only
  const sellableStatusFilter = and(
    safeInArray(batches.batchStatus, [...SELLABLE_BATCH_STATUSES]),
    isNull(batches.deletedAt)
  );

  // Line 1500-1509: Aggregates ALL sellable inventory
  const [totalsResult] = await db
    .select({
      totalUnits: sql`COALESCE(SUM(...), 0)`,
      totalValue: sql`COALESCE(SUM(...), 0)`,
    })
    .from(batches)
    .where(sellableStatusFilter); // NO USER FILTERS APPLIED
}
```

## Queries Comparison

Both pages use **THE SAME FUNCTION** for dashboard stats:

| Metric           | Dashboard Page                    | Inventory Page                    |
| ---------------- | --------------------------------- | --------------------------------- |
| **Function**     | `inventoryDb.getDashboardStats()` | `inventoryDb.getDashboardStats()` |
| **Filter Logic** | Sellable statuses only            | Sellable statuses only            |
| **User Filters** | ❌ Not applied                    | ❌ Not applied                    |
| **Result**       | ~$13M                             | ~$13M (same!)                     |

The Inventory **LIST** (not stats) uses different query:

- Function: `trpc.inventory.getEnhanced.useQuery()`
- Filters: **Respects user filters from localStorage**
- Result: 0 batches if filters exclude everything

## The Fix Strategy

### Option 1: Make stats respect filters (RECOMMENDED)

**Pros:**

- Stats match list (consistency)
- Users see impact of their filters
- Clear cause-and-effect

**Cons:**

- Requires passing filters to getDashboardStats
- Performance impact (can't use cached total)

**Implementation:**

```typescript
// Option 1a: Use enhanced API summary (already filtered)
{useEnhancedApi && enhancedResponse?.summary ? (
  // Show filtered stats
  <Card>Total Value: ${enhancedResponse.summary.totalValue}</Card>
) : (
  // Fallback to unfiltered (with warning)
  <DataCardSection moduleId="inventory" />
)}

// Option 1b: Always show filtered stats
const { data: filteredStats } = trpc.inventory.getEnhanced.useQuery({
  ...filters,
  pageSize: 0, // Just get summary
});
<Card>Total Value (Filtered): ${filteredStats?.summary.totalValue}</Card>
```

### Option 2: Clear filters on page load

**Pros:**

- Simple fix
- Ensures fresh start

**Cons:**

- Loses intentional filters
- Annoying for users who want persistent filters

### Option 3: Show both filtered and unfiltered stats

**Pros:**

- Most informative
- Shows impact of filters

**Cons:**

- More UI complexity
- Might confuse users

**Implementation:**

```typescript
<div className="grid gap-4 grid-cols-2">
  <Card>
    <div className="text-sm">Total Inventory Value</div>
    <div className="text-2xl">${unfiltered}</div>
  </Card>
  <Card>
    <div className="text-sm">Filtered Value</div>
    <div className="text-2xl">${filtered}</div>
    <Badge>Showing {filteredCount}/{totalCount} batches</Badge>
  </Card>
</div>
```

## Recommended Fix

**Implement Option 1a** with fallback indicator:

1. When using enhanced API, show filtered stats from `enhancedResponse.summary` (ALREADY WORKS)
2. When falling back to legacy API, show indicator that stats are unfiltered:

   ```tsx
   <DataCardSection moduleId="inventory" />;
   {
     hasActiveFilters && (
       <Alert>
         <AlertCircle className="h-4 w-4" />
         <AlertDescription>
           Stats above show total inventory. Use filters below to refine.
         </AlertDescription>
       </Alert>
     );
   }
   ```

3. Add clear "Active Filters" badge at top when filters are loaded from localStorage:
   ```tsx
   {
     hasActiveFilters && (
       <Alert className="mb-4">
         <Filter className="h-4 w-4" />
         <AlertDescription>
           {activeFilterCount} filter(s) active from previous session
           <Button onClick={clearAllFilters}>Clear All</Button>
         </AlertDescription>
       </Alert>
     );
   }
   ```

## Detection Command

```bash
# Check localStorage for persisted filters
# (Run in browser console on Inventory page)
JSON.parse(localStorage.getItem('terp-inventory-filters'))

# Check if enhanced API is being used
grep -n "useEnhancedApi" client/src/pages/Inventory.tsx

# Verify getDashboardStats doesn't take filter params
grep -A20 "export async function getDashboardStats" server/inventoryDb.ts
```

## Test Plan

1. **Reproduce the bug:**
   - Go to Inventory page
   - Apply status filter that excludes all batches (e.g., "QUARANTINED")
   - Refresh page
   - Verify: Stats show $13M but list shows 0 batches

2. **Verify the fix:**
   - Apply same filter
   - Stats should now show $0 (filtered) OR show clear "Unfiltered" indicator
   - Clear filters button should be prominent

3. **Edge cases:**
   - localStorage disabled/full
   - No batches in database
   - All batches have status that's filtered out
   - URL params override localStorage

## Files to Modify

1. `client/src/pages/Inventory.tsx` (lines 685-708)
   - Update stats display to use filtered values OR add unfiltered indicator

2. `client/src/hooks/useInventoryFilters.ts` (optional)
   - Add method to get filter summary for display

3. Documentation: Update known-bug-patterns.md with this finding

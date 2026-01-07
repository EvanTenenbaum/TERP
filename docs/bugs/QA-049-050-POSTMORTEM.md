# QA-049 & QA-050 Postmortem

## Summary

**QA-049**: Products page showed empty despite data existing in database
**QA-050**: Samples page showed empty despite data existing in database

## Investigation Results

### QA-049 (Products Page)

**Investigation Steps:**
1. Reviewed `ProductsPage.tsx` - Uses `trpc.productCatalogue.list.useQuery()` with pagination
2. Reviewed `productCatalogue.ts` router - Returns `createSafeUnifiedResponse()` with items
3. Reviewed `productsDb.ts` - Query filters by `deletedAt IS NULL` unless `includeDeleted=true`
4. Existing test was outdated - mocked `trpc.inventory.list` instead of `trpc.productCatalogue.list`

**Potential Root Causes Identified:**
- All products could be archived (soft-deleted), making default view empty
- No clear empty state messaging to guide users
- No debug logging to diagnose issues
- Test suite not covering actual tRPC endpoint used

### QA-050 (Samples Page)

**Investigation Steps:**
1. Reviewed `SampleManagement.tsx` - Uses `trpc.samples.getAll.useQuery({ limit: 200 })`
2. Reviewed `samples.ts` router - Returns `createSafeUnifiedResponse()` with items
3. Reviewed `samplesDb.ts` - No filtering applied in `getAllSampleRequests()`
4. Frontend has complex data extraction logic handling multiple response formats

**Potential Root Causes Identified:**
- No samples exist in database yet (clean environment)
- No clear empty state messaging to guide users
- No debug logging to diagnose data flow issues
- Complex response normalization could mask issues

## Fixes Applied

### 1. Debug Logging (Both Pages)

**Frontend (`ProductsPage.tsx`):**
```typescript
useEffect(() => {
  console.log('[ProductsPage] Query state:', {
    isLoading, isError, error, itemCount, total, showDeleted,
  });
  // Warn if unexpected zero results
}, [productsData, isLoading, isError, error, showDeleted]);
```

**Frontend (`SampleManagement.tsx`):**
```typescript
useEffect(() => {
  console.log('[SampleManagement] Query state:', {
    isLoading, isError, error, itemCount, hasItemsProperty,
  });
}, [samplesData, samplesLoading, isSamplesError, samplesError]);
```

**Server (`productCatalogue.ts`):**
```typescript
console.log('[productCatalogue.list] Input:', { limit, offset, includeDeleted, userId });
console.log('[productCatalogue.list] Result:', { productsCount, total, hasProducts });
```

**Server (`samples.ts`):**
```typescript
console.log('[samples.getAll] Input:', { limit, userId });
console.log('[samples.getAll] Result:', { requestsCount, hasRequests });
```

### 2. Improved Empty State Handling

**ProductsPage:**
- Added clear empty state with explanation
- Shows "No Products Found" with possible reasons
- Provides "Show Archived Products" button
- Provides "Refresh" button for retry

**SampleManagement:**
- Added clear empty state with explanation
- Shows "No Samples Found" with possible reasons
- Provides "Create New Sample Request" button
- Provides "Refresh" button for retry

### 3. Error State Handling

Both pages now include:
- Clear error message display
- Retry button functionality
- Test ID attributes for testing

### 4. Debug Endpoint

Added `debug.dataDisplayDiagnostics` endpoint that provides:
- Products breakdown: total, active, deleted
- Samples breakdown: total, pending, fulfilled, returned, cancelled
- Related data counts: brands, strains
- Automated recommendations based on findings

### 5. Updated Test Suites

**ProductsPage.test.tsx:**
- Fixed mock to use correct tRPC endpoint (`productCatalogue.list`)
- Added tests for empty state scenarios
- Added tests for error state scenarios
- Added tests for archive toggle functionality

**SampleManagement.test.tsx:**
- Added tests for empty state scenarios
- Added tests for error state scenarios
- Enhanced data display tests
- Added query parameter verification

## Prevention Measures

1. **Integration Tests**: Both pages now have tests that verify:
   - Data display when products/samples exist
   - Empty state handling when no data
   - Error state handling on failures
   - Query retry functionality

2. **Debug Logging**: Console logs added at key points:
   - Query parameters on request
   - Result counts on response
   - Warnings for unexpected zero results

3. **Server-Side Logging**: Added to routers for:
   - Input parameter logging
   - Result count logging
   - Warning for zero results with no filters

4. **Diagnostic Endpoint**: `debug.dataDisplayDiagnostics` allows:
   - Quick database state verification
   - Breakdown by status/archive state
   - Automated issue detection
   - Actionable recommendations

## How to Diagnose Future Issues

### Step 1: Check Browser Console
Look for `[ProductsPage]` or `[SampleManagement]` log entries showing:
- Query state (isLoading, isError, itemCount)
- Warning messages for zero results

### Step 2: Check Server Logs
Look for `[productCatalogue.list]` or `[samples.getAll]` log entries showing:
- Input parameters received
- Result counts returned

### Step 3: Use Debug Endpoint (Dev Only)
```bash
curl "http://localhost:3000/api/trpc/debug.dataDisplayDiagnostics" | jq
```

Returns breakdown of all data counts with automated recommendations.

### Step 4: Check Database Directly
```sql
-- Products
SELECT COUNT(*) as total,
       COUNT(*) FILTER (WHERE deleted_at IS NULL) as active
FROM products;

-- Samples
SELECT sample_request_status, COUNT(*)
FROM sample_requests
GROUP BY sample_request_status;
```

## Timeline

- **Discovered**: Via QA testing (Wave 1B)
- **Investigated**: 2026-01-07
- **Fixed**: 2026-01-07
- **Tests Added**: 2026-01-07

## Related Files Changed

### Frontend
- `client/src/pages/ProductsPage.tsx` - Debug logging, error/empty states
- `client/src/pages/SampleManagement.tsx` - Debug logging, error/empty states
- `client/src/pages/ProductsPage.test.tsx` - Updated tests
- `client/src/pages/SampleManagement.test.tsx` - Updated tests

### Server
- `server/routers/productCatalogue.ts` - Debug logging
- `server/routers/samples.ts` - Debug logging
- `server/routers/debug.ts` - New `dataDisplayDiagnostics` endpoint

### Documentation
- `docs/bugs/QA-049-050-POSTMORTEM.md` - This document

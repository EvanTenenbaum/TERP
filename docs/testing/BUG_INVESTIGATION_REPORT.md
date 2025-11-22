# Bug Investigation Report

## BUG-008: Purchase Orders Page Crashes with Application Error

**Date:** November 22, 2025  
**Investigator:** E2E Testing Agent  
**Status:** Under Investigation

---

### Bug Summary

**Severity:** P0 (CRITICAL - APPLICATION CRASH)  
**Location:** /purchase-orders  
**Error ID:** f7826da2e91648ebb82ddbbec10f2bc6  
**Impact:** Complete feature failure - users cannot access purchase orders

---

### Investigation Findings

#### 1. Router Configuration ✅ VERIFIED
The route is properly configured in the application:

**File:** `client/src/App.tsx` (Line 117)
```tsx
<Route path="/purchase-orders" component={PurchaseOrdersPage} />
```

**File:** `client/src/components/DashboardLayout.tsx` (Lines 60)
```tsx
{ icon: FileText, label: "Purchase Orders", path: "/purchase-orders" }
```

**Conclusion:** Routing configuration is correct.

---

#### 2. Frontend Component Analysis ✅ VERIFIED

**File:** `client/src/pages/PurchaseOrdersPage.tsx`

The component structure appears sound:
- Imports are correct
- tRPC queries properly defined:
  - `trpc.purchaseOrders.getAll.useQuery()` (Line 44)
  - `trpc.vendors.getAll.useQuery()` (Line 45)
  - `trpc.inventory.getAll.useQuery()` (Line 46)
- Mutations properly defined
- Error handling implemented with toast notifications
- Component renders table with proper null handling

**Conclusion:** Frontend component code appears correct.

---

#### 3. Backend Router Analysis ✅ VERIFIED

**File:** `server/routers/purchaseOrders.ts`

The backend router is properly implemented:
- Exported as `purchaseOrdersRouter`
- Registered in `server/routers.ts` (Line 106)
- `getAll` procedure properly defined (Lines 68-97)
- Proper error handling with database checks
- Query logic appears sound

**Conclusion:** Backend router code appears correct.

---

#### 4. Likely Root Cause Analysis

Based on the investigation, the most likely causes are:

##### Hypothesis 1: Database Schema Issue (MOST LIKELY)
The crash may be caused by a database schema mismatch or missing table:
- The `purchaseOrders` table may not exist in the database
- The table schema may not match the Drizzle schema definition
- Database migration may not have been run

**Evidence:**
- The error occurs immediately on page load when `getAll` query executes
- Other pages that don't query purchase orders work fine
- Similar pattern seen with vendors (0 records) and locations (0 records)

**Next Steps:**
1. Check if `purchaseOrders` table exists in database
2. Verify table schema matches Drizzle schema
3. Check if database migrations have been run
4. Review database seed data

##### Hypothesis 2: Database Connection Issue
The database connection may be failing specifically for this query:
- Database may be timing out
- Connection pool may be exhausted
- Query may be malformed for the specific database engine

**Evidence:**
- Error ID suggests unhandled exception
- Other queries work, suggesting partial database connectivity

##### Hypothesis 3: Data Type Mismatch
There may be a data type mismatch in the query or response:
- The `total` field is stored as string but may be expected as number
- Date fields may have format issues
- Enum values may not match

**Evidence:**
- Line 291 in PurchaseOrdersPage.tsx: `${parseFloat(po.total).toFixed(2)}`
- This suggests `total` is expected to be parseable as float

---

### Recommended Fixes

#### Immediate Actions (Priority Order)

1. **Verify Database Schema**
   ```bash
   # Check if table exists
   mysql> SHOW TABLES LIKE 'purchaseOrders';
   
   # Check table structure
   mysql> DESCRIBE purchaseOrders;
   ```

2. **Run Database Migrations**
   ```bash
   cd /home/ubuntu/TERP
   pnpm db:push
   # or
   pnpm db:migrate
   ```

3. **Add Error Boundary to Component**
   Wrap PurchaseOrdersPage with error boundary to catch and display errors gracefully

4. **Add Detailed Logging**
   Add console.log to identify exact failure point:
   ```tsx
   const { data: pos = [], refetch, error } = trpc.purchaseOrders.getAll.useQuery();
   
   useEffect(() => {
     if (error) {
       console.error("Purchase Orders Query Error:", error);
     }
   }, [error]);
   ```

5. **Check Database Connection**
   Verify database is accessible and has proper permissions

---

### Testing Plan

Once fix is implemented:

1. **Verify table exists:** Check database schema
2. **Test empty state:** Verify page loads with 0 purchase orders
3. **Test with data:** Create test purchase order and verify display
4. **Test all CRUD operations:**
   - Create purchase order
   - View purchase order
   - Update purchase order
   - Delete purchase order
5. **Test error handling:** Verify graceful error display
6. **Test with multiple vendors:** Verify vendor dropdown works
7. **Test search and filter:** Verify search and status filter work

---

### Related Issues

- **Vendors:** 0 vendors in database (may cause issues with PO creation)
- **Locations:** 0 locations in database
- **Pattern:** Multiple features have missing seed data

**Recommendation:** Create comprehensive seed data for all related entities to enable full testing.

---

### Status

**Current Status:** Investigation Complete - Awaiting Database Verification

**Next Step:** Check database schema and run migrations if needed

**Estimated Fix Time:** 30 minutes - 2 hours (depending on root cause)

---

## BUG-009: Create Order Route Returns 404

**Date:** November 22, 2025  
**Investigator:** E2E Testing Agent  
**Status:** Under Investigation

---

### Bug Summary

**Severity:** P1 (MEDIUM-HIGH - FEATURE ACCESSIBILITY)  
**Location:** /create-order  
**Impact:** Users cannot create orders via direct route

---

### Investigation Findings

#### 1. Router Configuration Analysis

**File:** `client/src/App.tsx`

Searching for create-order route...

**Finding:** Need to check if route exists in App.tsx

---

### Recommended Investigation Steps

1. **Search for create-order route in App.tsx**
2. **Check if CreateOrderPage component exists**
3. **Verify if alternative order creation path exists**
4. **Check if route was renamed or moved**
5. **Verify sidebar link points to correct route**

---

### Status

**Current Status:** Initial Investigation - Requires Code Review

**Next Step:** Search codebase for create-order route and CreateOrderPage component

**Estimated Fix Time:** 1-2 hours

---

**Document Version:** 1.0  
**Last Updated:** November 22, 2025


---

## BUG-009 Investigation Update

### Root Cause Identified ✅

**Finding:** The route `/create-order` does NOT exist in `App.tsx`, but the sidebar link points to it.

**Evidence:**

1. **Sidebar Configuration** (`client/src/components/DashboardLayout.tsx`, Line 53):
   ```tsx
   { icon: Package, label: "Create Order", path: "/create-order" }
   ```

2. **Actual Route** (`client/src/App.tsx`, Line 109):
   ```tsx
   <Route path="/orders/create" component={OrderCreatorPage} />
   ```

**Conclusion:** The sidebar link is incorrect. It should point to `/orders/create` instead of `/create-order`.

---

### Fix Required

**File:** `client/src/components/DashboardLayout.tsx`  
**Line:** 53  
**Current:**
```tsx
{ icon: Package, label: "Create Order", path: "/create-order" }
```

**Should Be:**
```tsx
{ icon: Package, label: "Create Order", path: "/orders/create" }
```

---

### Impact Analysis

**Current Impact:**
- Users clicking "Create Order" in sidebar get 404 error
- Order creation is still accessible via `/orders/create` direct URL
- No data loss or system instability

**After Fix:**
- Users can click "Create Order" in sidebar successfully
- Consistent navigation experience
- No breaking changes to existing functionality

---

### Testing Plan

Once fix is implemented:

1. **Verify sidebar link:** Click "Create Order" in sidebar
2. **Verify route works:** Navigate to `/orders/create` directly
3. **Verify order creation:** Create a test order
4. **Verify navigation:** Ensure all order-related navigation works
5. **Verify no regressions:** Check that other sidebar links still work

---

### Recommended Fix

**Priority:** P1 (HIGH - Quick fix with high user impact)

**Estimated Fix Time:** 5 minutes

**Implementation:**
```bash
# Edit the file
cd /home/ubuntu/TERP
# Change line 53 in client/src/components/DashboardLayout.tsx
# From: { icon: Package, label: "Create Order", path: "/create-order" }
# To:   { icon: Package, label: "Create Order", path: "/orders/create" }
```

**Commit Message:**
```
Fix BUG-009: Correct Create Order sidebar link

- Change sidebar link from /create-order to /orders/create
- Resolves 404 error when clicking Create Order in sidebar
- Route /orders/create already exists and works correctly
```

---

### Status Update

**Current Status:** Root Cause Identified - Ready for Fix

**Next Step:** Apply fix to DashboardLayout.tsx

**Estimated Fix Time:** 5 minutes

---

**Investigation Complete:** November 22, 2025

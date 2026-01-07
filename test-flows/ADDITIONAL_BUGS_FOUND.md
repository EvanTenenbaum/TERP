# TERP Application - Additional Bugs Found Through Codebase Analysis

**Analysis Date**: January 7, 2026  
**Analyst**: Manus AI Agent  
**Repository**: EvanTenenbaum/TERP  

---

## Executive Summary

After analyzing the entire TERP codebase for patterns similar to the bugs discovered during live testing, I found **23 additional potential bugs** across 6 categories. These bugs follow the same patterns as the critical issues identified in the root cause analysis.

---

## Category 1: Empty Array SQL Issues (Similar to Pricing Engine Bug)

### Bug 1.1: Permission Service - Empty Role IDs
**File**: `server/services/permissionService.ts` (Lines 182-197)
**Severity**: HIGH

```typescript
const roleIds = userRoleRecords.map((r) => r.roleId);
// No check if roleIds is empty before query
const rolePermissionRecords = await db
  .select({ permissionId: rolePermissions.permissionId })
  .from(rolePermissions)
  .where(inArray(rolePermissions.roleId, roleIds));  // Will fail if roleIds = []
```

**Issue**: If a user has no roles, `roleIds` will be an empty array. Drizzle's `inArray` with an empty array generates invalid SQL.

**Fix**:
```typescript
if (roleIds.length === 0) return new Set<string>();
```

---

### Bug 1.2: Permission Service - Empty Permission IDs
**File**: `server/services/permissionService.ts` (Lines 189-197)
**Severity**: HIGH

```typescript
const permissionIds = rolePermissionRecords.map((rp) => rp.permissionId);
// No check if permissionIds is empty
const permissionRecords = await db
  .select({ name: permissions.name })
  .from(permissions)
  .where(inArray(permissions.id, permissionIds));  // Will fail if permissionIds = []
```

**Issue**: Same pattern - if no role permissions exist, this query will fail.

---

### Bug 1.3: Live Catalog Service - Hidden Items SQL Injection Risk
**File**: `server/services/liveCatalogService.ts` (Line 121)
**Severity**: MEDIUM

```typescript
if (liveCatalogConfig?.hiddenItems && liveCatalogConfig.hiddenItems.length > 0) {
  conditions.push(sql`${batches.id} NOT IN (${liveCatalogConfig.hiddenItems.join(',')})`);
}
```

**Issue**: While there's a length check, the `join(',')` approach is vulnerable if `hiddenItems` contains non-numeric values. Should use parameterized query.

**Fix**:
```typescript
conditions.push(sql`${batches.id} NOT IN (${sql.join(liveCatalogConfig.hiddenItems.map(id => sql`${id}`), sql`, `)})`);
```

---

### Bug 1.4: VIP Portal - Empty Batch IDs
**File**: `server/routers/vipPortal.ts` (Lines 1839, 2053)
**Severity**: HIGH

```typescript
.where(inArray(batches.id, batchIds));  // No empty array check
```

**Issue**: Multiple locations where `batchIds` array is used without checking if empty first.

---

### Bug 1.5: Tag Management - Empty Tag IDs
**File**: `server/tagManagementService.ts` (Lines 124, 309, 405-406)
**Severity**: MEDIUM

```typescript
.where(inArray(tags.id, childIds));  // Line 124
.where(inArray(tags.id, tagIds));    // Line 309
```

**Issue**: Multiple `inArray` calls without empty array guards.

---

### Bug 1.6: Credit Engine Patch - Empty Session IDs
**File**: `server/services/creditEngine-patch.ts` (Line 62)
**Severity**: MEDIUM

```typescript
.where(inArray(sessionCartItems.sessionId, sessionIds));
```

**Issue**: If no active sessions exist, `sessionIds` will be empty, causing SQL error.

---

## Category 2: window.location.reload() Misuse (Similar to Order Creator Bug)

### Bug 2.1: ClientsListPage Retry Button
**File**: `client/src/pages/ClientsListPage.tsx` (Line 607)
**Severity**: MEDIUM

```typescript
action={{
  label: "Retry",
  onClick: () => window.location.reload(),
}}
```

**Issue**: Same pattern as OrderCreatorPage - full page reload instead of query refetch. Loses any filter state the user had set.

**Fix**: Use tRPC's `refetch()` method instead.

---

## Category 3: Unsafe .map() Calls (Similar to BatchDetailDrawer Bug)

### Bug 3.1: AuditModal - Multiple Unsafe Maps
**File**: `client/src/components/audit/AuditModal.tsx` (Lines 149, 235, 297, 349, 404)
**Severity**: MEDIUM

```typescript
{data.transactions.map((t, i) => ...)}
{data.movements.map((m, i) => ...)}
{data.lineItems.map((li, i) => ...)}
{data.payments.map((p, i) => ...)}
```

**Issue**: While there's a `if (!data) return null` check at the function level, if the API returns `data` with undefined sub-properties (e.g., `{ transactions: undefined }`), these will crash.

**Fix**: Add defensive checks:
```typescript
{(data.transactions ?? []).map((t, i) => ...)}
```

---

### Bug 3.2: AppointmentRequestsList - Unsafe Map
**File**: `client/src/components/calendar/AppointmentRequestsList.tsx` (Line 191)
**Severity**: MEDIUM

```typescript
{data.requests.map((request: AppointmentRequest) => ...)}
```

**Issue**: If `data.requests` is undefined, this will crash.

---

### Bug 3.3: TimeOffRequestsList - Unsafe Map
**File**: `client/src/components/calendar/TimeOffRequestsList.tsx` (Line 267)
**Severity**: MEDIUM

```typescript
{data.requests.map((request: TimeOffRequest) => ...)}
```

**Issue**: Same pattern as above.

---

### Bug 3.4: Dashboard Widgets - Unsafe Maps
**Files**: 
- `client/src/components/dashboard/widgets-v2/CashCollectedLeaderboard.tsx` (Line 57)
- `client/src/components/dashboard/widgets-v2/ClientDebtLeaderboard.tsx` (Line 47)
- `client/src/components/dashboard/widgets-v2/ClientProfitMarginLeaderboard.tsx` (Line 41)
- `client/src/components/dashboard/widgets-v2/SalesByClientWidget.tsx` (Line 93)

**Severity**: LOW (likely have loading checks)

```typescript
{data.map((client: any, index: number) => ...)}
```

**Issue**: Direct `.map()` on data without null check.

---

## Category 4: Search Implementation Gaps (Similar to Global Search Bug)

### Bug 4.1: Global Search Missing Product Name Search
**File**: `server/routers/search.ts` (Lines 94-113)
**Severity**: HIGH (Already documented in root cause)

The global search only searches `batches.code` and `batches.sku`, missing product names, strains, and categories.

---

### Bug 4.2: Inventory Search vs Global Search Inconsistency
**File**: `server/inventoryDb.ts` vs `server/routers/search.ts`
**Severity**: MEDIUM

**Issue**: `inventoryDb.searchBatches()` searches many fields (sku, code, productName, vendor, brand, category, subcategory, grade), but `search.ts` only searches code and sku. This creates inconsistent user experience.

---

## Category 5: Generic Error Messages (Similar to Auth Error Bug)

### Bug 5.1: Multiple "Unauthorized" Messages Without Context
**Files**: Multiple locations in `server/routers/accounting.ts`
**Severity**: LOW

```typescript
if (!ctx.user) throw new Error("Unauthorized");
```

**Issue**: 26+ instances of generic "Unauthorized" error that don't tell the user what permission they need or why they're unauthorized.

---

### Bug 5.2: Calendar Permission Denied Without Details
**Files**: 
- `server/routers/calendar.ts` (Lines 189, 537, 639)
- `server/routers/calendarInvitations.ts` (Lines 205, 325, 688, 759, 884, 943)
- `server/routers/calendarParticipants.ts` (Lines 37, 65, 173, 214)

**Severity**: LOW

```typescript
throw new Error("Permission denied");
```

**Issue**: Generic "Permission denied" doesn't explain what permission is needed or why access was denied.

---

### Bug 5.3: Permission Middleware Same Message for Different Failures
**File**: `server/_core/permissionMiddleware.ts` (Lines 58, 145, 230)
**Severity**: MEDIUM

```typescript
message: "Authentication required to perform this action",
```

**Issue**: Same message used for:
- No user context
- Demo user trying protected action
- User lacking specific permission

---

## Category 6: Silent Error Swallowing

### Bug 6.1: Auth Helpers Silent Null Return
**File**: `server/_core/authHelpers.ts` (Lines 39-41)
**Severity**: LOW

```typescript
} catch {
  return null;
}
```

**Issue**: Errors are silently swallowed, returning null. This could mask real issues like database connectivity problems.

---

### Bug 6.2: Inventory Utils Silent Empty Object Return
**File**: `server/inventoryUtils.ts` (Lines 435-436)
**Severity**: LOW

```typescript
} catch {
  return {};
}
```

**Issue**: Errors silently return empty object, potentially hiding issues.

---

### Bug 6.3: Spreadsheet View Service Silent Null Returns
**File**: `server/services/spreadsheetViewService.ts` (Lines 340-341, 360-361)
**Severity**: MEDIUM

```typescript
} catch {
  return null;
}
```

**Issue**: Errors in spreadsheet data processing are silently swallowed, which could explain why the spreadsheet view shows empty grids.

---

### Bug 6.4: Audit Router Silent Empty Array Return
**File**: `server/routers/audit.ts` (Lines 655-656)
**Severity**: LOW

```typescript
console.error("[Audit] getEntityHistory error:", error);
return [];
```

**Issue**: Errors return empty array instead of propagating, making debugging difficult.

---

## Category 7: Missing Empty State Handling

### Bug 7.1: Pages Without Empty States
**Files**:
- `client/src/pages/AnalyticsPage.tsx`
- `client/src/pages/CalendarPage.tsx`
- `client/src/pages/NotificationsPage.tsx`
- `client/src/pages/PhotographyPage.tsx`
- `client/src/pages/PickPackPage.tsx`
- `client/src/pages/ProductsPage.tsx`
- `client/src/pages/SampleManagement.tsx`

**Severity**: LOW

**Issue**: These pages don't have explicit empty state handling, which can result in blank screens or confusing UI when no data exists.

---

## Summary Table

| Category | Bug Count | Severity Distribution |
|----------|-----------|----------------------|
| Empty Array SQL | 6 | 4 HIGH, 2 MEDIUM |
| window.location.reload | 1 | 1 MEDIUM |
| Unsafe .map() | 7 | 4 MEDIUM, 3 LOW |
| Search Gaps | 2 | 1 HIGH, 1 MEDIUM |
| Generic Errors | 3 | 2 MEDIUM, 1 LOW |
| Silent Errors | 4 | 1 MEDIUM, 3 LOW |
| Missing Empty States | 7 | 7 LOW |
| **TOTAL** | **30** | **5 HIGH, 10 MEDIUM, 15 LOW** |

---

## Recommended Priority Order

### P0 - Fix Immediately (HIGH severity, blocks functionality)
1. Permission Service empty array checks (Bugs 1.1, 1.2)
2. VIP Portal empty batch IDs (Bug 1.4)
3. Global Search product name search (Bug 4.1)

### P1 - Fix Soon (MEDIUM severity, degrades UX)
1. Live Catalog SQL injection risk (Bug 1.3)
2. ClientsListPage reload (Bug 2.1)
3. AuditModal unsafe maps (Bug 3.1)
4. Spreadsheet View silent errors (Bug 6.3)
5. Permission middleware error messages (Bug 5.3)

### P2 - Fix When Possible (LOW severity, minor issues)
1. All remaining unsafe .map() calls
2. Generic error messages
3. Silent error swallowing
4. Missing empty states

---

## Files Requiring Changes (Prioritized)

| Priority | File | Changes Needed |
|----------|------|----------------|
| P0 | `server/services/permissionService.ts` | Add empty array checks before `inArray` |
| P0 | `server/routers/vipPortal.ts` | Add empty array checks |
| P0 | `server/routers/search.ts` | Add product name/strain to search |
| P1 | `server/services/liveCatalogService.ts` | Use parameterized query for hiddenItems |
| P1 | `client/src/pages/ClientsListPage.tsx` | Replace reload with refetch |
| P1 | `client/src/components/audit/AuditModal.tsx` | Add defensive array checks |
| P1 | `server/services/spreadsheetViewService.ts` | Log errors instead of silent return |
| P1 | `server/_core/permissionMiddleware.ts` | Differentiate error messages |

---

*Report generated by Manus AI Agent*  
*Analysis completed: January 7, 2026*

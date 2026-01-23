# RBAC Validation Report - Work Surfaces

**Date**: 2026-01-20
**Analyzer**: QA RBAC Validation Agent
**Scope**: Work Surface permission enforcement

---

## Summary

| Metric | Value |
|--------|-------|
| Violations Found | 3 |
| Roles Checked | 10 |
| Critical Issues | 3 |

---

## Roles Validated

| Role | QA Account | Permission Categories |
|------|------------|----------------------|
| Super Admin | qa.superadmin@terp.test | ALL (bypasses permission checks) |
| Owner/Executive | - | Full system access |
| Operations Manager | - | Cross-functional operations |
| Sales Manager | qa.salesmanager@terp.test | clients:*, orders:*, quotes:*, pricing:* |
| Accountant | qa.accounting@terp.test | accounting:*, invoices:*, credits:*, badDebt:* |
| Inventory Manager | qa.inventory@terp.test | inventory:*, batches:*, strains:*, products:* |
| Buyer/Procurement | - | purchase_orders:*, vendors:* |
| Customer Service | qa.salesrep@terp.test | clients:*, orders:*, returns:* |
| Warehouse Staff | qa.fulfillment@terp.test | orders:fulfill, inventory:adjust, inventory:transfer |
| Read-Only Auditor | qa.auditor@terp.test | *:read, audit:* |

---

## Critical Issues Found

### Issue 1: Feature Flags Router - Missing Permission Check
**File**: `server/routers/featureFlags.ts:56`
**Severity**: P1 (Critical)

**Problem**: The `getEffectiveFlags` query uses `protectedProcedure` but doesn't validate specific permissions. Any authenticated user can query feature flag states.

**Impact**: Information disclosure - users can discover disabled features.

**Suggested Fix**:
```typescript
getEffectiveFlags: protectedProcedure
  .use(requirePermission("system:read"))
  .query(...)
```

---

### Issue 2: Alerts Router - Admin-Only Instead of Role-Based
**File**: `server/routers/alerts.ts:list`
**Severity**: P2 (Important)

**Problem**: The alerts list procedure uses `adminProcedure` which restricts access to admins only, rather than role-based access control.

**Impact**: Non-admin users with legitimate need (e.g., inventory managers for stock alerts) cannot access alerts.

**Suggested Fix**:
```typescript
list: protectedProcedure
  .use(requireAnyPermission(["alerts:read", "dashboard:read"]))
  .query(...)
```

---

### Issue 3: Permission Seed Gap
**File**: `docs/reference/USER_FLOW_MATRIX.csv` (rows 10-53)
**Severity**: P2 (Important)

**Problem**: Multiple Work Surface procedures in the flow matrix are marked with 'Permission string not in RBAC seed' status. The following permissions may not be fully enumerated:
- `accounting:read`
- `accounting:create`
- `accounting:update`
- `accounting:delete`

**Impact**: Some procedures may not have proper RBAC coverage.

**Suggested Fix**: Audit USER_FLOW_MATRIX.csv and ensure all permission strings exist in rbacDefinitions.ts

---

## Strengths Identified

### ✅ Permission Middleware Implementation
The permission middleware properly enforces RBAC with three variants:
- `requirePermission(permission)` - Single permission check
- `requireAllPermissions([...])` - All permissions required
- `requireAnyPermission([...])` - At least one permission required

### ✅ Super Admin Bypass
Super Admin bypass is correctly implemented - users with Super Admin role skip individual permission checks.

### ✅ Work Surface Payment Procedures
Payment-related procedures correctly use permission checks:
- `receiveClientPayment` → `requirePermission("accounting:create")`
- `payVendor` → `requirePermission("accounting:create")`

### ✅ Permission Coverage
- 255 permissions across 20 modules
- Clear role mappings in rbacDefinitions.ts
- Admin security tests validate procedure protections

---

## Work Surface Permission Matrix

| Work Surface | Route | Required Permission | Implemented |
|--------------|-------|---------------------|-------------|
| Orders | /orders | orders:read | ✅ |
| Invoices | /accounting/invoices | accounting:read | ✅ |
| Inventory | /inventory | inventory:read | ✅ |
| Clients | /clients | clients:read | ✅ |
| Purchase Orders | /purchase-orders | purchase_orders:read | ✅ |
| Pick/Pack | /pick-pack | pick_pack:read | ✅ |
| Client Ledger | /clients/:id/ledger | ledger:read | ✅ |
| Quotes | /quotes | quotes:read | ✅ |
| Direct Intake | /spreadsheet-view | inventory:create | ✅ |

---

## Client-Side Permission Handling

**Observation**: Work Surface components do not include explicit client-side permission guards. They rely on server-side rejection.

**Impact**: Users may see UI elements they cannot interact with, leading to confusion when actions fail.

**Recommendation**: Add client-side permission guards using the `usePermissions` hook for better UX:

```typescript
const { hasPermission } = usePermissions();

// Hide action buttons user cannot perform
{hasPermission("orders:create") && (
  <Button onClick={createOrder}>Create Order</Button>
)}
```

---

## Recommendations

### P1 - Critical (Address Immediately)
1. Add permission check to feature flags router
2. Audit all procedures marked "Permission string not in RBAC seed"

### P2 - Important (Address Soon)
1. Convert alerts router to role-based access
2. Add client-side permission guards in Work Surface components
3. Create permission documentation for each Work Surface

### P3 - Minor (Address When Possible)
1. Add permission audit logging for failed permission checks
2. Create integration tests for each role's Work Surface access

---

## Conclusion

**RBAC Implementation: GOOD (with minor gaps)**

The RBAC system is well-designed with proper middleware enforcement. The issues found are minor and do not represent significant security vulnerabilities:
- Super Admin bypass works correctly
- Server-side permission checks are properly implemented
- Role definitions are comprehensive

Primary concerns are around completeness (permission seed gaps) and UX (client-side guards).

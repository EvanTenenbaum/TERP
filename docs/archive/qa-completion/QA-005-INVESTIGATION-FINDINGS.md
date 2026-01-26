# QA-005: Investigation Findings - Systemic Data Access Issues

**Date:** 2025-11-14
**Session:** Session-20251114-QA-005-e9e20a5d
**Status:** Root Cause Identified

---

## 🔍 Executive Summary

**ROOT CAUSE IDENTIFIED:** The application has implemented a comprehensive RBAC (Role-Based Access Control) system with 255 granular permissions across 10 predefined roles, but **RBAC is not being seeded on application startup**. This causes all users to have zero permissions, resulting in "No data found" across all modules.

---

## 📊 Investigation Process

### 1. Architecture Analysis

**Tech Stack:**

- Backend: Express + tRPC
- Database: MySQL (via Drizzle ORM)
- Authentication: Simple JWT-based auth (simpleAuth)
- Authorization: RBAC with permissions middleware

**Key Files Analyzed:**

- `server/_core/context.ts` - User authentication
- `server/_core/trpc.ts` - Procedure definitions (publicProcedure, protectedProcedure, adminProcedure)
- `server/_core/permissionMiddleware.ts` - Permission checking middleware
- `server/services/permissionService.ts` - Permission lookup with caching
- `server/routers/orders.ts` - Example router using permissions
- `scripts/seed-rbac.ts` - RBAC seeding script (NOT CALLED)
- `server/services/seedDefaults.ts` - Default data seeding (NO RBAC)

### 2. Permission Flow Analysis

**Current Flow:**

1. User logs in → JWT token created
2. Request made → `createContext()` authenticates user from JWT
3. Protected procedure called → `requirePermission()` middleware runs
4. Permission service queries database for user's roles/permissions
5. **User has NO roles** → Empty permission set returned
6. Permission check fails → `FORBIDDEN` error thrown
7. Frontend receives error → Shows "No data found"

**Expected Flow:**

1. User logs in → JWT token created
2. **User should have roles assigned** (e.g., "Super Admin")
3. Request made → Permission check passes
4. Data returned → Frontend displays data

### 3. Database Schema Analysis

**RBAC Tables:**

- `roles` - 10 predefined roles (Super Admin, Operations Manager, etc.)
- `permissions` - 255 granular permissions (e.g., "orders:read", "inventory:create")
- `role_permissions` - Many-to-many mapping of roles to permissions
- `user_roles` - Many-to-many mapping of users to roles
- `user_permission_overrides` - Per-user permission grants/revocations

**Current State:**

- ❌ `roles` table: EMPTY
- ❌ `permissions` table: EMPTY
- ❌ `role_permissions` table: EMPTY
- ❌ `user_roles` table: EMPTY

### 4. Seeding Analysis

**What IS being seeded (`server/services/seedDefaults.ts`):**

- ✅ Locations (warehouses, zones, racks, shelves, bins)
- ✅ Categories and subcategories (Flower, Concentrates, Vapes, etc.)
- ✅ Grades (A, B, C, D)
- ✅ Expense categories
- ✅ Accounting accounts

**What is NOT being seeded:**

- ❌ RBAC roles
- ❌ RBAC permissions
- ❌ Role-permission mappings
- ❌ User-role assignments

**RBAC Seed Script Exists:**

- File: `scripts/seed-rbac.ts`
- Contains: Complete definitions for 10 roles and 255 permissions
- Status: **NOT INTEGRATED INTO STARTUP SEQUENCE**
- Must be run manually: `pnpm tsx scripts/seed-rbac.ts`

---

## 🎯 Root Cause

**The RBAC system is fully implemented but not initialized.**

The application startup sequence (`server/_core/index.ts`) calls `seedAllDefaults()` which seeds locations, categories, grades, and accounts, but **does not seed RBAC roles and permissions**. This means:

1. All RBAC tables are empty on first startup
2. All users have zero roles assigned
3. All permission checks fail
4. All data endpoints return FORBIDDEN errors
5. Frontend interprets this as "No data found"

---

## 🔧 Impact Analysis

**Affected Modules:** ALL modules using `protectedProcedure` with `requirePermission()`

**Confirmed Affected:**

- Dashboard
- Orders
- Inventory
- Clients
- Pricing Rules
- Pricing Profiles
- Matchmaking
- Calendar
- Sales Sheets
- Create Order
- Vendors
- Purchase Orders
- Returns
- Refunds
- Accounting
- Analytics
- Todo Lists
- Comments
- Inbox

**Symptom Explanation:**

- Orders shows "4,400 total" in metrics → Metrics use `publicProcedure` (no permission check)
- Orders table shows "0 items" → Table uses `protectedProcedure` with `requirePermission("orders:read")`
- Inventory shows "$96M value" → Metrics use `publicProcedure`
- Inventory table shows "No inventory found" → Table uses `requirePermission("inventory:read")`

---

## ✅ Solution

### Immediate Fix (Required)

1. **Integrate RBAC seeding into startup sequence**
   - Add RBAC seed function to `server/services/seedDefaults.ts`
   - Call it from `seedAllDefaults()` before creating admin user

2. **Assign Super Admin role to default admin user**
   - After creating "Evan" user, assign "Super Admin" role
   - This gives the default user full system access

### Implementation Steps

1. Create `seedRBACDefaults()` function in `server/services/seedDefaults.ts`
2. Import and call from `seedAllDefaults()`
3. Update admin user creation to assign "Super Admin" role
4. Add user-role assignment helper function

### Testing

1. Drop and recreate database (or run on fresh instance)
2. Start application
3. Verify RBAC tables are populated
4. Verify admin user has "Super Admin" role
5. Login as admin
6. Verify all modules show data

---

## 📝 Additional Findings

### Permission Caching

- Permission service implements 5-minute TTL cache
- Cache is per-user and in-memory
- May need to clear cache after role changes

### Super Admin Bypass

- Super Admin role bypasses ALL permission checks
- Implemented in `permissionMiddleware.ts`
- Uses `isSuperAdmin()` check before permission lookup

### User Authentication

- Uses simple JWT-based auth (not Clerk)
- Default admin: username="Evan", password="oliver"
- User ID stored as `openId` in context

### Missing User Management

- No UI for assigning roles to users
- No UI for creating new users
- Admin must use database directly or API endpoints

---

## 🚀 Next Steps

1. ✅ Root cause identified
2. ⏳ Implement fix (integrate RBAC seeding)
3. ⏳ Test fix locally
4. ⏳ Update session file with progress
5. ⏳ Commit changes
6. ⏳ Create completion report
7. ⏳ Submit PR

---

**Estimated Time to Fix:** 1-2 hours
**Confidence Level:** HIGH (root cause definitively identified)

# TER-1230: Admin Gate Audit Report

## Task Summary
Audit client-side admin-only gates and loosen non-critical ones for Sales Manager and other roles.

## Audit Scope
- Searched all client/ code for hardcoded admin role checks
- Patterns searched: `role === 'admin'`, `isAdmin`, `requireAdmin`, `hasRole('admin')`, `isSuperAdmin`
- Excluded server-side changes per task scope

## Findings

### 1. Client-Side Admin Gates Found

#### Fixed Issues (1)
**CalendarPage.tsx (line 518)**
- **Before**: `<TimeOffRequestsList isAdmin={true} />`
- **After**: `<TimeOffRequestsList isAdmin={user?.role === "admin"} />`
- **Impact**: All users saw approve/reject buttons for time-off requests (server correctly blocked them, but UX was confusing)
- **Category**: Bug fix - UX improvement

#### Appropriate Gates (Kept As-Is)
1. **Settings.tsx** - Feature Flags section
   - `requiresAdmin: true`
   - **Justification**: RED tier - System-critical feature flag management
   
2. **Settings.tsx** - Database section
   - `requiresDevTools: true` (admin or dev-tools permission)
   - **Justification**: RED tier - Destructive database operations

#### Already Properly Loosened
The codebase extensively uses RBAC permissions via `usePermissions()` hook:
- Settings dev tools: `isSuperAdmin || hasPermission("admin:dev-tools")`
- Organization settings: `isSuperAdmin || hasPermission("settings:edit")`
- COGS management: `isSuperAdmin || hasPermission("settings:edit")`

### 2. RBAC Permission System Status

**Current State**: Mature RBAC system with:
- 10 predefined roles (Super Admin, Operations Manager, Sales Manager, etc.)
- 331 fine-grained permissions across 27 modules
- Proper permission assignments in `server/services/rbacDefinitions.ts`

**Sales Manager Already Has:**
- Full client/order/quote/sales sheet management
- Sample request creation and viewing
- Calendar event management
- VIP portal administration
- Pricing view access
- Analytics and reports access
- Accounting reports view (read-only)

**Operations Manager Already Has:**
- Full inventory/PO/vendor management
- User management (`users:read`, `users:manage`)
- Full calendar access
- System health monitoring
- Sample management

### 3. Server-Side Observations (Out of Scope)

For context only (not changed per task scope):
- 200+ `adminProcedure` endpoints identified
- These properly enforce admin-only access for:
  - Feature flags, user promotion, schema migrations
  - Debug tools, system settings, administrative functions
  
Time-off approval/rejection endpoints use hardcoded `role === 'admin'` check in `/server/routers/timeOffRequests.ts` (lines 170, 285). This could be migrated to RBAC permissions in a future task, but is outside this task's client-only scope.

## Conclusion

**Gates Loosened**: 1 (CalendarPage.tsx time-off admin check)

**Why So Few?**
1. The codebase already uses RBAC permissions extensively
2. Most operational features are already open to appropriate roles via permission assignments
3. Remaining admin-only gates are RED-tier (auth, billing, system admin)

**Recommendation**: The single fix addresses the only inappropriate client-side admin gate found. Further access expansion should be done through RBAC permission assignments to roles (in `rbacDefinitions.ts`) rather than removing code-level gates.

## Changes Made

1. **client/src/pages/CalendarPage.tsx**
   - Changed `isAdmin={true}` to `isAdmin={user?.role === "admin"}`
   - Prevents non-admin users from seeing non-functional approve/reject buttons

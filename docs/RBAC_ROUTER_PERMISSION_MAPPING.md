# RBAC Router Permission Mapping

This document defines which permissions should protect which router endpoints across the TERP system.

## Permission Naming Convention

Permissions follow the format: `{module}:{action}`

Actions:
- `read` - View/list data
- `create` - Create new records
- `update` - Modify existing records
- `delete` - Remove records
- `manage` - Full CRUD access (for admin-only modules)

## Router Permission Mappings

### Accounting & Financial
- **accounting.ts** → `accounting:read`, `accounting:create`, `accounting:update`
- **accountingHooks.ts** → `accounting:manage`
- **badDebt.ts** → `accounting:manage`
- **credit.ts** → `credits:read`, `credits:create`, `credits:update`
- **credits.ts** → `credits:read`, `credits:create`, `credits:update`, `credits:delete`
- **refunds.ts** → `refunds:read`, `refunds:create`, `refunds:update`

### Calendar & Scheduling
- **calendar.ts** → `calendar:read`, `calendar:create`, `calendar:update`, `calendar:delete`
- **calendarFinancials.ts** → `calendar:read`, `accounting:read`
- **calendarMeetings.ts** → `calendar:read`, `calendar:create`, `calendar:update`
- **calendarParticipants.ts** → `calendar:read`, `calendar:update`
- **calendarRecurrence.ts** → `calendar:read`, `calendar:create`, `calendar:update`
- **calendarReminders.ts** → `calendar:read`, `calendar:create`, `calendar:update`, `calendar:delete`
- **calendarViews.ts** → `calendar:read`

### Client Management
- **clients.ts** → `clients:read`, `clients:create`, `clients:update`, `clients:delete`
- **clientNeeds.ts** → `clients:read`, `clients:update`
- **clientNeedsEnhanced.ts** → `clients:read`, `clients:update`

### Inventory & Products
- **inventory.ts** → `inventory:read`, `inventory:create`, `inventory:update`, `inventory:delete`
- **inventoryMovements.ts** → `inventory:read`, `inventory:update`
- **locations.ts** → `inventory:read`, `settings:manage`
- **productIntake.ts** → `inventory:create`, `inventory:update`
- **strains.ts** → `inventory:read`, `inventory:create`, `inventory:update`, `inventory:delete`
- **warehouseTransfers.ts** → `inventory:read`, `inventory:create`, `inventory:update`

### Orders & Sales
- **orders.ts** → `orders:read`, `orders:create`, `orders:update`, `orders:delete`
- **orderEnhancements.ts** → `orders:read`, `orders:update`
- **ordersEnhancedV2.ts** → `orders:read`, `orders:create`, `orders:update`
- **salesSheets.ts** → `orders:read`, `orders:create`, `orders:update`
- **salesSheetEnhancements.ts** → `orders:read`, `orders:update`
- **returns.ts** → `orders:read`, `orders:create`, `orders:update`
- **samples.ts** → `orders:read`, `orders:create`, `orders:update`

### Purchase Orders & Vendors
- **purchaseOrders.ts** → `purchase_orders:read`, `purchase_orders:create`, `purchase_orders:update`, `purchase_orders:delete`
- **poReceiving.ts** → `purchase_orders:read`, `purchase_orders:update`
- **vendors.ts** → `vendors:read`, `vendors:create`, `vendors:update`, `vendors:delete`
- **vendorSupply.ts** → `vendors:read`, `vendors:update`

### Pricing & COGS
- **pricing.ts** → `pricing:read`, `pricing:create`, `pricing:update`
- **pricingDefaults.ts** → `pricing:read`, `settings:manage`
- **cogs.ts** → `cogs:read`, `cogs:create`, `cogs:update`
- **matching.ts** → `cogs:read`, `cogs:update`
- **matchingEnhanced.ts** → `cogs:read`, `cogs:update`

### Dashboard & Analytics
- **dashboard.ts** → `dashboard:read`
- **dashboardEnhanced.ts** → `dashboard:read`
- **dashboardPreferences.ts** → `dashboard:read` (user's own preferences)
- **dataCardMetrics.ts** → `dashboard:read`
- **analytics.ts** → `analytics:read`

### Task Management
- **todoLists.ts** → `todos:read`, `todos:create`, `todos:update`, `todos:delete`
- **todoTasks.ts** → `todos:read`, `todos:create`, `todos:update`, `todos:delete`
- **todoActivity.ts** → `todos:read`
- **inbox.ts** → `todos:read`, `todos:update`

### Communication & Collaboration
- **comments.ts** → `comments:read`, `comments:create`, `comments:update`, `comments:delete`
- **freeformNotes.ts** → `notes:read`, `notes:create`, `notes:update`, `notes:delete`
- **scratchPad.ts** → `notes:read`, `notes:create`, `notes:update`, `notes:delete`

### Admin & System
- **admin.ts** → `system:manage`
- **adminImport.ts** → `system:manage`
- **adminMigrations.ts** → `system:manage`
- **adminQuickFix.ts** → `system:manage`
- **adminSchemaPush.ts** → `system:manage`
- **auditLogs.ts** → `audit:read`
- **configuration.ts** → `settings:manage`
- **settings.ts** → `settings:read`, `settings:manage`
- **userManagement.ts** → `users:manage`

### RBAC Management
- **rbac-users.ts** → `rbac:manage`
- **rbac-roles.ts** → `rbac:manage`
- **rbac-permissions.ts** → `rbac:manage`

### VIP Portal
- **vipPortal.ts** → `vip_portal:read`, `vip_portal:create`
- **vipPortalAdmin.ts** → `vip_portal:manage`

### Advanced Features
- **advancedTagFeatures.ts** → `tags:read`, `tags:create`, `tags:update`, `tags:delete`

### Public/Auth (No Protection)
- **auth.ts** → No protection (public authentication endpoints)

## Implementation Strategy

For each router:
1. Import `requirePermission` from `server/_core/permissionMiddleware.ts`
2. Replace `protectedProcedure` with `requirePermission('module:action')`
3. Use appropriate permission based on the operation (read, create, update, delete)
4. Keep `publicProcedure` for truly public endpoints (rare)
5. Use `adminProcedure` only for Super Admin-only operations

## Example

```typescript
import { requirePermission } from "../_core/permissionMiddleware";

export const ordersRouter = router({
  list: requirePermission("orders:read")
    .input(z.object({ ... }))
    .query(async ({ input }) => { ... }),
    
  create: requirePermission("orders:create")
    .input(z.object({ ... }))
    .mutation(async ({ input }) => { ... }),
    
  update: requirePermission("orders:update")
    .input(z.object({ ... }))
    .mutation(async ({ input }) => { ... }),
    
  delete: requirePermission("orders:delete")
    .input(z.object({ ... }))
    .mutation(async ({ input }) => { ... }),
});
```

## Notes

- Some routers may have mixed permissions (e.g., list uses `read`, create uses `create`)
- Admin routers should use `system:manage` or `rbac:manage`
- User-specific data (like dashboard preferences) may only need authentication, not specific permissions
- The seed script already creates all these permissions in the database

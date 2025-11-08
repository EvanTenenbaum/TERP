# RBAC Frontend Implementation Guide

This guide explains how to implement permission-based UI rendering in the TERP frontend using the `usePermissions` hook.

## Overview

The RBAC system provides frontend hooks and components to conditionally render UI elements based on user permissions. This ensures users only see actions they're authorized to perform.

## Core Hook: `usePermissions()`

Located at: `client/src/hooks/usePermissions.ts`

### Basic Usage

```tsx
import { usePermissions } from "@/hooks/usePermissions";

function MyComponent() {
  const { hasPermission, isSuperAdmin } = usePermissions();

  return (
    <div>
      {hasPermission('orders:create') && (
        <Button>Create Order</Button>
      )}
      
      {isSuperAdmin && (
        <Button>Admin Panel</Button>
      )}
    </div>
  );
}
```

### API Reference

#### `hasPermission(permission: string): boolean`
Check if user has a specific permission.

```tsx
if (hasPermission('inventory:delete')) {
  // Show delete button
}
```

#### `hasAnyPermission(permissions: string[]): boolean`
Check if user has at least one of the specified permissions.

```tsx
if (hasAnyPermission(['orders:create', 'orders:update'])) {
  // Show order management UI
}
```

#### `hasAllPermissions(permissions: string[]): boolean`
Check if user has all of the specified permissions.

```tsx
if (hasAllPermissions(['accounting:read', 'accounting:create'])) {
  // Show full accounting UI
}
```

#### `isSuperAdmin: boolean`
Check if user is a Super Admin (has all permissions).

```tsx
if (isSuperAdmin) {
  // Show system administration features
}
```

#### `permissions: string[]`
Array of all permissions the user has.

```tsx
console.log(permissions); // ['orders:read', 'orders:create', ...]
```

## Permission Gate Component

For declarative permission checks:

```tsx
import { PermissionGate } from "@/hooks/usePermissions";

<PermissionGate permission="orders:create">
  <CreateOrderButton />
</PermissionGate>

<PermissionGate 
  permissions={['inventory:update', 'inventory:delete']} 
  requireAll={false}
  fallback={<div>No access</div>}
>
  <InventoryActions />
</PermissionGate>
```

### Props

- `permission?: string` - Single permission to check
- `permissions?: string[]` - Multiple permissions to check
- `requireAll?: boolean` - If true, requires all permissions; if false, requires any (default: false)
- `fallback?: React.ReactNode` - Content to show when permission check fails
- `children: React.ReactNode` - Content to show when permission check passes

## Module-Specific Hook: `useModulePermissions()`

Convenience hook for checking CRUD permissions on a specific module:

```tsx
import { useModulePermissions } from "@/hooks/usePermissions";

function OrdersPage() {
  const { canRead, canCreate, canUpdate, canDelete } = useModulePermissions('orders');

  return (
    <div>
      {canRead && <OrdersList />}
      {canCreate && <CreateOrderButton />}
      {canUpdate && <EditOrderButton />}
      {canDelete && <DeleteOrderButton />}
    </div>
  );
}
```

## Implementation Patterns

### 1. Conditional Button Rendering

```tsx
function OrdersToolbar() {
  const { hasPermission } = usePermissions();

  return (
    <div className="flex gap-2">
      {hasPermission('orders:read') && (
        <Button variant="outline">View Orders</Button>
      )}
      {hasPermission('orders:create') && (
        <Button>Create Order</Button>
      )}
      {hasPermission('orders:delete') && (
        <Button variant="destructive">Delete Selected</Button>
      )}
    </div>
  );
}
```

### 2. Conditional Menu Items

```tsx
function NavigationMenu() {
  const { hasPermission } = usePermissions();

  return (
    <nav>
      {hasPermission('dashboard:read') && (
        <NavLink to="/dashboard">Dashboard</NavLink>
      )}
      {hasPermission('orders:read') && (
        <NavLink to="/orders">Orders</NavLink>
      )}
      {hasPermission('inventory:read') && (
        <NavLink to="/inventory">Inventory</NavLink>
      )}
      {hasPermission('rbac:manage') && (
        <NavLink to="/settings">Settings</NavLink>
      )}
    </nav>
  );
}
```

### 3. Conditional Form Fields

```tsx
function OrderForm() {
  const { hasPermission } = usePermissions();

  return (
    <form>
      <Input name="clientId" label="Client" />
      <Input name="items" label="Items" />
      
      {hasPermission('pricing:override') && (
        <Input name="customPrice" label="Custom Price" />
      )}
      
      {hasPermission('orders:approve') && (
        <Checkbox name="approved" label="Approve Order" />
      )}
    </form>
  );
}
```

### 4. Conditional Table Actions

```tsx
function OrdersTable() {
  const { hasPermission } = usePermissions();

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Order ID</TableHead>
          <TableHead>Client</TableHead>
          {hasPermission('orders:update') && <TableHead>Actions</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {orders.map(order => (
          <TableRow key={order.id}>
            <TableCell>{order.id}</TableCell>
            <TableCell>{order.clientName}</TableCell>
            {hasPermission('orders:update') && (
              <TableCell>
                <Button size="sm">Edit</Button>
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
```

### 5. Conditional Page Access

```tsx
function AdminPage() {
  const { hasPermission, isLoading } = usePermissions();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!hasPermission('system:manage')) {
    return (
      <div className="p-8 text-center">
        <h1>Access Denied</h1>
        <p>You don't have permission to access this page.</p>
      </div>
    );
  }

  return <AdminDashboard />;
}
```

### 6. Disable vs Hide Pattern

Sometimes you want to show a disabled button instead of hiding it:

```tsx
function OrderActions({ orderId }: { orderId: number }) {
  const { hasPermission } = usePermissions();
  const canDelete = hasPermission('orders:delete');

  return (
    <div>
      {/* Always show, but disable if no permission */}
      <Button 
        variant="destructive"
        disabled={!canDelete}
        title={!canDelete ? "You don't have permission to delete orders" : "Delete order"}
      >
        Delete
      </Button>
      
      {/* Or hide completely */}
      {canDelete && (
        <Button variant="destructive">Delete</Button>
      )}
    </div>
  );
}
```

## Permission Naming Convention

Permissions follow the format: `{module}:{action}`

### Common Modules
- `orders` - Sales orders and quotes
- `inventory` - Inventory and products
- `clients` - Client management
- `vendors` - Vendor management
- `purchase_orders` - Purchase orders
- `accounting` - Financial records
- `dashboard` - Dashboard access
- `calendar` - Calendar and events
- `todos` - Task management
- `rbac` - RBAC administration
- `system` - System administration

### Common Actions
- `read` - View/list data
- `create` - Create new records
- `update` - Modify existing records
- `delete` - Remove records
- `manage` - Full CRUD access (admin only)

### Examples
- `orders:read` - View orders
- `orders:create` - Create new orders
- `inventory:update` - Update inventory
- `clients:delete` - Delete clients
- `rbac:manage` - Full RBAC administration
- `system:manage` - System administration

## Best Practices

### 1. Always Check Permissions for Sensitive Actions

```tsx
// ❌ Bad - No permission check
<Button onClick={deleteOrder}>Delete</Button>

// ✅ Good - Permission-gated
{hasPermission('orders:delete') && (
  <Button onClick={deleteOrder}>Delete</Button>
)}
```

### 2. Use Loading States

```tsx
function MyComponent() {
  const { hasPermission, isLoading } = usePermissions();

  if (isLoading) {
    return <Skeleton />;
  }

  return hasPermission('orders:create') ? <CreateButton /> : null;
}
```

### 3. Provide Feedback for Disabled Actions

```tsx
<Button 
  disabled={!hasPermission('orders:delete')}
  title={!hasPermission('orders:delete') ? "Insufficient permissions" : "Delete order"}
>
  Delete
</Button>
```

### 4. Use Module Hook for CRUD Pages

```tsx
// ✅ Good - Clean and readable
function OrdersPage() {
  const { canRead, canCreate, canUpdate, canDelete } = useModulePermissions('orders');
  
  return (
    <>
      {canRead && <OrdersList />}
      {canCreate && <CreateOrderDialog />}
    </>
  );
}
```

### 5. Backend Protection is Primary

Remember: Frontend permission checks are for UX only. The backend MUST enforce permissions via middleware. Never rely solely on frontend checks for security.

```tsx
// Frontend - Hide UI
{hasPermission('orders:delete') && <DeleteButton />}

// Backend - Enforce permission
delete: requirePermission("orders:delete")
  .mutation(async ({ input }) => { ... })
```

## Migration Strategy

To add RBAC to existing components:

1. **Import the hook**
   ```tsx
   import { usePermissions } from "@/hooks/usePermissions";
   ```

2. **Add permission checks**
   ```tsx
   const { hasPermission } = usePermissions();
   ```

3. **Wrap sensitive UI**
   ```tsx
   {hasPermission('module:action') && <SensitiveComponent />}
   ```

4. **Test with different roles**
   - Log in as different users
   - Verify UI updates correctly
   - Ensure no errors in console

## Testing

### Manual Testing
1. Create test users with different roles
2. Log in as each user
3. Verify UI elements appear/disappear correctly
4. Check that disabled elements show appropriate tooltips

### Automated Testing
```tsx
import { render } from '@testing-library/react';
import { usePermissions } from '@/hooks/usePermissions';

jest.mock('@/hooks/usePermissions');

test('shows create button for users with permission', () => {
  (usePermissions as jest.Mock).mockReturnValue({
    hasPermission: (perm: string) => perm === 'orders:create',
  });

  const { getByText } = render(<OrdersPage />);
  expect(getByText('Create Order')).toBeInTheDocument();
});
```

## Troubleshooting

### Hook returns empty permissions
- Check that `getMyPermissions` endpoint is working
- Verify user has roles assigned
- Check browser console for errors

### UI doesn't update after permission change
- Permission cache may need clearing
- User may need to log out and back in
- Check that `clearPermissionCache` is called on backend

### Performance issues
- The hook uses React Query caching
- Permissions are fetched once per session
- Use `isLoading` to show skeleton states

## See Also

- [RBAC Implementation Roadmap](./RBAC_IMPLEMENTATION_ROADMAP.md)
- [RBAC Router Permission Mapping](./RBAC_ROUTER_PERMISSION_MAPPING.md)
- [Development Protocols](./DEVELOPMENT_PROTOCOLS.md)

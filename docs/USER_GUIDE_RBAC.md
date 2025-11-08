# TERP User Roles & Permissions Guide

**Version:** 1.0  
**Last Updated:** November 7, 2025  
**For:** TERP System Users and Administrators

---

## Overview

TERP uses a Role-Based Access Control (RBAC) system to manage what users can see and do in the system. This guide explains how roles and permissions work, and how administrators can manage them.

## What are Roles and Permissions?

### Permissions

**Permissions** are individual abilities to perform specific actions in TERP. For example:

- `orders:read` - View orders
- `orders:create` - Create new orders
- `inventory:update` - Update inventory items
- `clients:delete` - Delete client records

### Roles

**Roles** are collections of permissions that define what a user can do. For example:

- **Sales Representative** - Can view clients, create orders, and view inventory
- **Inventory Manager** - Can manage all inventory operations
- **Accountant** - Can view and manage financial records

### Users

**Users** are assigned one or more roles. A user's permissions are the combination of all permissions from their assigned roles.

## Default Roles in TERP

TERP comes with 10 pre-configured roles:

### 1. Super Admin
- **Description**: Full system access with no restrictions
- **Key Permissions**: All permissions (bypasses all checks)
- **Use Case**: System administrators and owners

### 2. Admin
- **Description**: Administrative access to most features
- **Key Permissions**: Manage users, roles, system settings, all CRUD operations
- **Use Case**: Department heads and senior managers

### 3. Manager
- **Description**: Management-level access across modules
- **Key Permissions**: View and manage orders, inventory, clients, vendors, accounting
- **Use Case**: Operations managers and team leaders

### 4. Sales Representative
- **Description**: Sales-focused permissions
- **Key Permissions**: 
  - View and create clients
  - Create and update orders
  - View inventory (read-only)
  - View pricing
- **Use Case**: Sales team members

### 5. Inventory Manager
- **Description**: Full inventory control
- **Key Permissions**:
  - Full inventory CRUD
  - Manage products and batches
  - View orders and purchase orders
  - Manage warehouse operations
- **Use Case**: Warehouse managers and inventory staff

### 6. Accountant
- **Description**: Financial operations access
- **Key Permissions**:
  - View and manage accounting records
  - Create and update invoices
  - View orders and clients
  - Manage financial reports
- **Use Case**: Accounting and finance team

### 7. Purchasing Agent
- **Description**: Purchase order management
- **Key Permissions**:
  - View and create purchase orders
  - Manage vendor relationships
  - View inventory levels
  - Create and update vendors
- **Use Case**: Procurement team members

### 8. Warehouse Staff
- **Description**: Basic warehouse operations
- **Key Permissions**:
  - View and update inventory
  - View orders
  - Basic product management
- **Use Case**: Warehouse workers and stock clerks

### 9. Viewer
- **Description**: Read-only access to most modules
- **Key Permissions**:
  - View orders, inventory, clients, vendors
  - View dashboard and reports
  - No create, update, or delete permissions
- **Use Case**: Auditors, consultants, read-only stakeholders

### 10. Custom Role
- **Description**: Placeholder for creating custom roles
- **Key Permissions**: None by default (must be configured)
- **Use Case**: Special cases requiring unique permission sets

## Managing Roles and Permissions

### Accessing RBAC Management

1. Log in as a **Super Admin** or **Admin**
2. Navigate to **Settings** in the main menu
3. Click on the **User Roles**, **Roles**, or **Permissions** tab

### Assigning Roles to Users

**To assign a role to a user:**

1. Go to **Settings** > **User Roles**
2. Find the user in the list (or search by user ID)
3. Click the **Assign Role** dropdown
4. Select the role to assign
5. Click **Assign**

**To remove a role from a user:**

1. Find the user in the list
2. Click the **X** on the role badge
3. Confirm the removal

### Creating Custom Roles

**To create a new role:**

1. Go to **Settings** > **Roles**
2. Click **Create Role**
3. Enter a **Role Name** (e.g., "Regional Manager")
4. Enter a **Description** (e.g., "Manages operations for a specific region")
5. Click **Create**

**To assign permissions to a role:**

1. Go to **Settings** > **Permissions**
2. Select the role from the dropdown
3. Browse permissions by module
4. Click **Assign** next to each permission you want to add
5. Or use **Bulk Assign** mode to select multiple permissions at once

### Editing Roles

**To edit a role:**

1. Go to **Settings** > **Roles**
2. Click the **Edit** icon next to the role
3. Update the name or description
4. Click **Save**

**Note:** System roles (like "Super Admin" and "Sales Representative") cannot be deleted, but their permissions can be modified.

### Deleting Custom Roles

**To delete a custom role:**

1. Go to **Settings** > **Roles**
2. Click the **Delete** icon next to the custom role
3. Confirm the deletion

**Note:** You cannot delete system roles. Only custom roles can be deleted.

### Permission Overrides

In special cases, you may need to grant or revoke a specific permission for an individual user, overriding their role permissions.

**To grant a permission override:**

1. Go to **Settings** > **User Roles**
2. Click on a user to view their details
3. In the **Permission Overrides** section, click **Grant Permission**
4. Select the permission to grant
5. Click **Grant**

**To revoke a permission override:**

1. View the user's details
2. In the **Permission Overrides** section, find the permission
3. Click **Revoke**

**Note:** Permission overrides take precedence over role permissions. A revoked override will prevent access even if the user's role grants that permission.

## Understanding Permission Levels

### Read Permissions
- Allow viewing and listing data
- Example: `orders:read` lets you view the orders list

### Create Permissions
- Allow creating new records
- Example: `clients:create` lets you add new clients

### Update Permissions
- Allow modifying existing records
- Example: `inventory:update` lets you edit inventory items

### Delete Permissions
- Allow removing records
- Example: `orders:delete` lets you delete orders

### Manage Permissions
- Full CRUD access (Create, Read, Update, Delete)
- Example: `rbac:manage` gives full control over roles and permissions

## How Permissions Affect the UI

The TERP interface adapts based on your permissions:

### Hidden Elements
- Buttons and menu items you don't have permission for are hidden
- Example: If you don't have `orders:create`, you won't see the "Create Order" button

### Disabled Elements
- Some elements may be shown but disabled if you lack permission
- Hover over disabled elements to see why they're disabled

### Restricted Pages
- Pages you don't have permission to access show an "Access Denied" message
- Example: Settings page is only visible to Admins and Super Admins

### Conditional Features
- Some features are only available with specific permissions
- Example: Custom pricing requires `pricing:override` permission

## Common Scenarios

### Scenario 1: New Sales Team Member

**Goal:** Give a new employee access to view clients and create orders

**Steps:**
1. Create the user account
2. Assign the **Sales Representative** role
3. The user can now view clients, create orders, and view inventory

### Scenario 2: Temporary Inventory Access

**Goal:** Give an accountant temporary access to update inventory

**Steps:**
1. Find the accountant in **Settings** > **User Roles**
2. Grant a permission override for `inventory:update`
3. When temporary access is no longer needed, revoke the override

### Scenario 3: Regional Manager

**Goal:** Create a role for regional managers who need more access than sales reps but less than full managers

**Steps:**
1. Go to **Settings** > **Roles**
2. Create a new role called "Regional Manager"
3. Go to **Settings** > **Permissions**
4. Assign relevant permissions:
   - All `orders` permissions
   - All `clients` permissions
   - `inventory:read` and `inventory:update`
   - `dashboard:read`
5. Assign this role to regional managers

### Scenario 4: Read-Only Consultant

**Goal:** Give a consultant view-only access to orders and inventory

**Steps:**
1. Create the user account
2. Assign the **Viewer** role
3. The consultant can view data but cannot create, update, or delete anything

## Security Best Practices

### 1. Principle of Least Privilege
- Only grant the minimum permissions needed for a user's job
- Start with a restrictive role and add permissions as needed

### 2. Regular Audits
- Periodically review user roles and permissions
- Remove access for users who no longer need it

### 3. Use Roles, Not Overrides
- Prefer assigning roles over granting individual permission overrides
- Overrides should be temporary or for special cases

### 4. Protect Admin Access
- Limit the number of Super Admin and Admin users
- Only grant admin access to trusted personnel

### 5. Document Custom Roles
- Keep notes on why custom roles were created
- Document the intended use case for each custom role

## Troubleshooting

### "Access Denied" Messages

**Problem:** User sees "Access Denied" when trying to access a page

**Solution:**
1. Check the user's assigned roles
2. Verify the role has the required permissions
3. Check for revoked permission overrides
4. Contact an administrator if access is needed

### Missing Buttons or Features

**Problem:** User can't see expected buttons or menu items

**Solution:**
1. Verify the user has the required permission
2. Check if the feature requires multiple permissions
3. Contact an administrator to request access

### Permission Changes Not Taking Effect

**Problem:** Role or permission changes don't seem to work

**Solution:**
1. Log out and log back in
2. Refresh the page (Ctrl+F5 or Cmd+Shift+R)
3. Wait a few minutes for the permission cache to clear
4. Contact support if the issue persists

### Can't Modify System Roles

**Problem:** Unable to delete or rename a system role

**Solution:**
- System roles (like "Super Admin" and "Sales Representative") are protected and cannot be deleted
- You can modify their permissions but not their name or system status
- Create a custom role instead if you need different settings

## FAQ

### Q: Can a user have multiple roles?

**A:** Yes! Users can be assigned multiple roles, and they will have the combined permissions from all their roles.

### Q: What happens if I remove all roles from a user?

**A:** The user will have no permissions and won't be able to access any features except logging in and viewing their profile.

### Q: Can I rename a system role?

**A:** No, system roles cannot be renamed. You can create a custom role with a different name instead.

### Q: How do I know what permissions a role has?

**A:** Go to **Settings** > **Roles**, click on a role to view its details, and you'll see all assigned permissions.

### Q: Can I export a list of users and their roles?

**A:** This feature is planned for a future release. Contact support for assistance with user audits.

### Q: What's the difference between a role and a permission?

**A:** A **permission** is a single ability (like "create orders"). A **role** is a collection of permissions (like "Sales Representative" which includes multiple order and client permissions).

### Q: Can I copy permissions from one role to another?

**A:** Currently, you need to manually assign permissions to each role. Bulk permission management features are planned for future releases.

## Getting Help

If you need assistance with roles and permissions:

1. **Contact your administrator** - They can adjust your permissions
2. **Check the documentation** - Review this guide and other TERP docs
3. **Submit a support ticket** - Contact TERP support for technical issues

---

**Last Updated:** November 7, 2025  
**Version:** 1.0  
**For questions or feedback:** Contact your TERP administrator

# PRD: User Roles & Permissions (RBAC)

**Author**: Manus AI  
**Date**: November 6, 2025  
**Status**: DRAFT
**Roadmap ID**: 1.2

---

## 1. Overview

This document outlines the requirements for a comprehensive Role-Based Access Control (RBAC) system for the TERP application. The goal is to create a flexible, scalable, and secure permissions system that can restrict user access to specific modules, actions, and data based on their assigned role.

## 2. Problem Statement

The TERP application currently lacks a granular permissions system. All users have near-administrative access, which presents a significant security risk and operational hazard. As the team grows and different roles emerge (e.g., sales, inventory manager, accountant), there is a critical need to restrict access to prevent unauthorized actions, data breaches, and accidental errors.

## 3. Goals

-   **Enhance Security**: Prevent unauthorized access to sensitive data and critical system functions.
-   **Improve Operational Efficiency**: Show users only the modules and actions relevant to their roles, reducing clutter and potential for error.
-   **Increase Scalability**: Provide a flexible framework that can accommodate new roles and permissions as the organization grows.
-   **Ensure Auditability**: Lay the groundwork for future audit trails by associating all actions with a user and their permissions.

## 4. User Roles (Initial Set)

The system should be seeded with the following base roles. These roles should be editable, and new roles can be created.

| Role | Description | Key Responsibilities & Access |
| :--- | :--- | :--- |
| **Super Admin** | Unrestricted access to the entire system. | Can manage users, roles, permissions, and all system settings. |
| **Manager** | Oversees a specific department (e.g., Sales Manager, Inventory Manager). | Can view all data within their department and manage their team members. Cannot change system-wide settings. |
| **Standard User** | A general employee with access to specific modules. | Can perform daily tasks within their assigned modules (e.g., create a sales order, check in inventory). Cannot see financial data or manage users. |
| **Read-Only** | Can view data but cannot make any changes. | Useful for auditors, executives, or temporary staff who need to view reports or data without risk of modification. |

## 5. Core Features & Requirements

### 5.1. RBAC Core Implementation

-   **Database Schema**: Create new tables to store `roles`, `permissions`, and the mapping between them (`role_permissions`). Also, a `user_roles` table to link users to their roles.
-   **Permission Structure**: Permissions should be granular and action-based (e.g., `orders:create`, `inventory:delete`, `users:edit`).
-   **API Endpoint Protection**: Implement middleware in the tRPC API layer that checks a user's permissions before allowing an endpoint to be executed.

### 5.2. User Management UI

-   A new section in the **Settings** page for Super Admins to manage users.
-   **Functionality**:
    -   Invite new users.
    -   Assign one or more roles to a user.
    -   Deactivate/reactivate users.
    -   View a user's assigned roles and effective permissions.

### 5.3. Role & Permission Management UI

-   A new section in the **Settings** page for Super Admins to manage roles and permissions.
-   **Functionality**:
    -   Create, edit, and delete roles.
    -   Assign permissions to roles using a checklist or multi-select interface.
    -   View which users are assigned to a specific role.
    -   (Optional) Ability to create new, custom permissions (for future-proofing).

### 5.4. Per-User Permission Overrides

-   In addition to roles, Super Admins should have the ability to grant a specific, one-off permission to an individual user without creating a new role. This is for handling exceptions.

### 5.5. UI Visibility Control

-   The frontend application must dynamically hide UI elements (navigation links, buttons, form fields) that the current user does not have permission to access. This should not be just a visual change; the underlying API calls must also be protected.

## 6. Technical Considerations

-   **Performance**: The permission-checking middleware should be highly optimized to avoid adding significant latency to API requests.
-   **Default Deny**: The system should operate on a "default deny" principle. Access is only granted if a user has the explicit permission.
-   **Integration with Authentication**: The RBAC system will integrate with the existing Clerk authentication system. The user's ID from Clerk will be the key to look up their roles and permissions.

## 7. Testing Requirements

-   **Unit Tests**: For the permission-checking logic.
-   **Integration Tests**: To verify that API endpoints are correctly protected.
-   **End-to-End Tests**: To simulate different user roles and verify that:
    -   They can access the correct pages and perform allowed actions.
    -   They are correctly blocked from accessing restricted pages or performing unauthorized actions.
    -   The UI dynamically adjusts based on their permissions.

## 8. Success Metrics

-   The system is considered successful if a Super Admin can create a new role, assign it a limited set of permissions, assign that role to a new user, and that user is effectively restricted to only the granted permissions.
-   Zero security incidents related to unauthorized access after deployment.
-   Positive feedback from managers that they can now safely delegate tasks to their teams.

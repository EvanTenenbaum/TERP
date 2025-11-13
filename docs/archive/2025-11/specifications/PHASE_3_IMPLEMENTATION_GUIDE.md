# Phase 3 Implementation Guide: User & Role Management UI

**Task**: 1.2 - User Roles & Permissions (RBAC)  
**Phase**: 3 of 7  
**Duration**: 2 weeks (80 hours)  
**Approach**: Sub-phased with self-healing checkpoints

---

## Overview

Phase 3 involves building the complete User & Role Management UI for the RBAC system. This phase is broken into 4 sub-phases, each with a self-healing checkpoint to ensure quality and adherence to Bible protocols.

---

## Sub-Phase 3.1: Build API Routers (3-4 days)

### Objective
Create 3 new tRPC routers with comprehensive CRUD operations for users, roles, and permissions.

### Deliverables

#### 1. `server/routers/rbac-users.ts`
**Endpoints** (10 total):
- `list` - Get all users with their roles
- `getById` - Get a specific user by ID
- `invite` - Invite a new user (send invitation email)
- `assignRole` - Assign a role to a user
- `removeRole` - Remove a role from a user
- `grantPermission` - Grant a specific permission to a user (override)
- `revokePermission` - Revoke a specific permission from a user (override)
- `deactivate` - Deactivate a user
- `reactivate` - Reactivate a user
- `delete` - Delete a user (soft delete)

**Permissions Required**:
- All endpoints require `users:manage` permission
- Super Admins bypass all checks

**Testing**:
- Unit tests for each endpoint
- Test permission checks
- Test Super Admin bypass

#### 2. `server/routers/rbac-roles.ts`
**Endpoints** (8 total):
- `list` - Get all roles
- `getById` - Get a specific role by ID
- `create` - Create a new role
- `update` - Update a role
- `delete` - Delete a role (only non-system roles)
- `getPermissions` - Get all permissions for a role
- `assignPermission` - Assign a permission to a role
- `removePermission` - Remove a permission from a role

**Permissions Required**:
- All endpoints require `roles:manage` permission
- Super Admins bypass all checks

**Testing**:
- Unit tests for each endpoint
- Test system role protection (cannot delete)
- Test permission checks

#### 3. `server/routers/rbac-permissions.ts`
**Endpoints** (3 total):
- `list` - Get all permissions (grouped by module)
- `getById` - Get a specific permission by ID
- `getByRole` - Get all permissions for a specific role

**Permissions Required**:
- All endpoints require `permissions:view` permission
- Super Admins bypass all checks

**Testing**:
- Unit tests for each endpoint
- Test permission grouping logic

### Self-Healing Checkpoint 1

**Code Quality Review**:
- [ ] All endpoints follow tRPC best practices
- [ ] Proper error handling for all edge cases
- [ ] Input validation using Zod schemas
- [ ] Consistent naming conventions
- [ ] No placeholders or stubs

**Test Coverage Review**:
- [ ] All endpoints have unit tests
- [ ] Permission checks are tested
- [ ] Edge cases are covered
- [ ] Tests pass successfully

**Bible Protocol Adherence**:
- [ ] Follows "No Placeholders/Stubs" protocol
- [ ] Follows "Standard QA Protocols"
- [ ] Proper logging for all operations
- [ ] Proper error messages

**Self-Heal Actions**:
- Fix any code quality issues found
- Add missing tests
- Improve error handling
- Update documentation

**Commit & Push**:
- Commit message: `feat(rbac): Add API routers for user, role, and permission management (Phase 3.1)`

---

## Sub-Phase 3.2: Build User Management UI (3-4 days)

### Objective
Build the User Management tab in the Settings page with full CRUD operations.

### Deliverables

#### 1. UI Components
Create in `client/src/components/settings/rbac/`:
- `UserManagementTab.tsx` - Main tab component
- `UserList.tsx` - Table showing all users with their roles
- `InviteUserDialog.tsx` - Dialog for inviting new users
- `AssignRoleDialog.tsx` - Dialog for assigning roles to users
- `UserPermissionOverridesDialog.tsx` - Dialog for per-user permission overrides
- `UserActionsMenu.tsx` - Dropdown menu for user actions (deactivate, delete, etc.)

#### 2. Features
- **User List Table**:
  - Columns: Name, Email, Roles, Status, Actions
  - Sortable by name, email, status
  - Filterable by role, status
  - Pagination (50 users per page)
  
- **Invite User**:
  - Form: Email, Initial Role
  - Validation: Email format, role selection required
  - Success: Show confirmation, send invitation email
  
- **Assign/Remove Roles**:
  - Multi-select dropdown for roles
  - Show current roles
  - Confirm before removing roles
  
- **Permission Overrides**:
  - Show all permissions grouped by module
  - Toggle to grant/revoke specific permissions
  - Visual indicator for overrides (different from role permissions)
  
- **User Actions**:
  - Deactivate/Reactivate
  - Delete (with confirmation)

#### 3. Integration
- Wire up all components to API endpoints from Sub-Phase 3.1
- Handle loading states
- Handle error states with user-friendly messages
- Optimistic UI updates where appropriate

#### 4. Testing
- E2E tests for all user flows:
  - Inviting a user
  - Assigning a role
  - Removing a role
  - Granting a permission override
  - Revoking a permission override
  - Deactivating a user
  - Reactivating a user
  - Deleting a user

### Self-Healing Checkpoint 2

**UI/UX Review**:
- [ ] Consistent with TERP design system
- [ ] Responsive on all screen sizes
- [ ] Accessible (keyboard navigation, screen readers)
- [ ] Clear error messages
- [ ] Loading states are smooth

**Functionality Review**:
- [ ] All features work as expected
- [ ] API integration is correct
- [ ] No console errors
- [ ] Optimistic updates work correctly

**Bible Protocol Adherence**:
- [ ] Follows "Holistic System Integration" protocol
- [ ] No placeholders or stubs
- [ ] Proper error handling

**Self-Heal Actions**:
- Fix any UI/UX issues found
- Add missing E2E tests
- Improve error handling
- Update documentation

**Commit & Push**:
- Commit message: `feat(rbac): Add User Management UI in Settings (Phase 3.2)`

---

## Sub-Phase 3.3: Build Role Management UI (3-4 days)

### Objective
Build the Role Management tab in the Settings page with full CRUD operations.

### Deliverables

#### 1. UI Components
Create in `client/src/components/settings/rbac/`:
- `RoleManagementTab.tsx` - Main tab component
- `RoleList.tsx` - Table showing all roles
- `CreateRoleDialog.tsx` - Dialog for creating new roles
- `EditRoleDialog.tsx` - Dialog for editing roles
- `RolePermissionsDialog.tsx` - Dialog for viewing/editing role permissions
- `RoleActionsMenu.tsx` - Dropdown menu for role actions

#### 2. Features
- **Role List Table**:
  - Columns: Name, Description, User Count, System Role, Actions
  - Sortable by name, user count
  - Filterable by system/custom roles
  
- **Create Role**:
  - Form: Name, Description
  - Validation: Name required, unique
  - Success: Show confirmation, navigate to permission assignment
  
- **Edit Role**:
  - Form: Name, Description
  - Cannot edit system roles
  - Validation: Name required, unique
  
- **View/Edit Permissions**:
  - Show all permissions grouped by module
  - Checkboxes to assign/remove permissions
  - Visual indicator for assigned permissions
  - Cannot edit permissions for system roles
  
- **Delete Role**:
  - Cannot delete system roles
  - Confirm before deleting
  - Show warning if role has users assigned

#### 3. Integration
- Wire up all components to API endpoints from Sub-Phase 3.1
- Handle loading states
- Handle error states with user-friendly messages
- Optimistic UI updates where appropriate

#### 4. Testing
- E2E tests for all role flows:
  - Creating a role
  - Editing a role
  - Assigning permissions to a role
  - Removing permissions from a role
  - Deleting a role
  - Attempting to edit/delete system roles (should fail)

### Self-Healing Checkpoint 3

**UI/UX Review**:
- [ ] Consistent with TERP design system
- [ ] Responsive on all screen sizes
- [ ] Accessible (keyboard navigation, screen readers)
- [ ] Clear error messages
- [ ] Loading states are smooth

**Functionality Review**:
- [ ] All features work as expected
- [ ] API integration is correct
- [ ] System role protection works
- [ ] No console errors

**Bible Protocol Adherence**:
- [ ] Follows "Holistic System Integration" protocol
- [ ] No placeholders or stubs
- [ ] Proper error handling

**Self-Heal Actions**:
- Fix any UI/UX issues found
- Add missing E2E tests
- Improve error handling
- Update documentation

**Commit & Push**:
- Commit message: `feat(rbac): Add Role Management UI in Settings (Phase 3.3)`

---

## Sub-Phase 3.4: Build Permission Assignment UI (3-4 days)

### Objective
Build the Permission Assignment tab in the Settings page with a permission matrix view.

### Deliverables

#### 1. UI Components
Create in `client/src/components/settings/rbac/`:
- `PermissionAssignmentTab.tsx` - Main tab component
- `PermissionMatrix.tsx` - Matrix view (roles × permissions)
- `PermissionGroupAccordion.tsx` - Accordion for permission groups (modules)

#### 2. Features
- **Permission Matrix**:
  - Rows: Permissions (grouped by module)
  - Columns: Roles
  - Cells: Checkboxes to assign/remove permissions
  - Expandable/collapsible permission groups
  - Visual indicator for system roles (read-only)
  
- **Bulk Operations**:
  - Select all permissions in a module
  - Assign all permissions in a module to a role
  - Remove all permissions in a module from a role
  
- **Search/Filter**:
  - Search permissions by name
  - Filter by module
  - Filter by assigned/unassigned

#### 3. Integration
- Wire up to API endpoints from Sub-Phase 3.1
- Handle loading states (matrix can be large)
- Handle error states
- Optimistic UI updates

#### 4. Testing
- E2E tests for permission assignment flows:
  - Assigning a permission to a role via matrix
  - Removing a permission from a role via matrix
  - Bulk assigning permissions
  - Bulk removing permissions
  - Attempting to edit system role permissions (should fail)

### Self-Healing Checkpoint 4

**UI/UX Review**:
- [ ] Matrix is performant with 255 permissions × 10 roles
- [ ] Consistent with TERP design system
- [ ] Responsive on all screen sizes
- [ ] Accessible
- [ ] Clear visual indicators

**Functionality Review**:
- [ ] All features work as expected
- [ ] API integration is correct
- [ ] System role protection works
- [ ] No performance issues

**Bible Protocol Adherence**:
- [ ] Follows "Holistic System Integration" protocol
- [ ] No placeholders or stubs
- [ ] Proper error handling

**Self-Heal Actions**:
- Fix any UI/UX issues found
- Optimize performance if needed
- Add missing E2E tests
- Update documentation

**Commit & Push**:
- Commit message: `feat(rbac): Add Permission Assignment UI in Settings (Phase 3.4)`

---

## Final Phase 3 Integration

### Objective
Integrate all 4 sub-phases into a cohesive Settings page experience.

### Deliverables

#### 1. Settings Page Integration
- Add 3 new tabs to Settings page:
  - "Users" (UserManagementTab)
  - "Roles" (RoleManagementTab)
  - "Permissions" (PermissionAssignmentTab)
  
- Update Settings page navigation
- Ensure proper routing

#### 2. Final Testing
- Run full E2E test suite for all RBAC features
- Manual QA for all user flows
- Cross-browser testing
- Mobile responsiveness testing

#### 3. Documentation
- Update CHANGELOG.md with Phase 3 completion
- Update PROGRESS.md
- Add user documentation for RBAC features

#### 4. Commit & Push
- Final commit: `feat(rbac): Complete Phase 3 - User & Role Management UI`
- Push all changes to feature branch

---

## Dependencies

### External Dependencies
- tRPC client/server setup (already exists)
- Clerk authentication (already integrated)
- shadcn/ui components (already in use)
- React Hook Form (for forms)
- Zod (for validation)

### Internal Dependencies
- Phase 1: Database schema (COMPLETE)
- Phase 2: Permission service & middleware (COMPLETE)
- Settings page structure (already exists)

---

## Success Criteria

Phase 3 is considered complete when:
- [ ] All 3 API routers are implemented and tested
- [ ] All UI components are implemented and tested
- [ ] All E2E tests pass
- [ ] Manual QA confirms all features work
- [ ] No placeholders or stubs remain
- [ ] All Bible protocols are followed
- [ ] Documentation is updated
- [ ] All changes are committed and pushed

---

## Estimated Timeline

| Sub-Phase | Duration | Cumulative |
|-----------|----------|------------|
| 3.1: API Routers | 3-4 days | 3-4 days |
| 3.2: User Management UI | 3-4 days | 6-8 days |
| 3.3: Role Management UI | 3-4 days | 9-12 days |
| 3.4: Permission Assignment UI | 3-4 days | 12-16 days |
| Final Integration | 1-2 days | 13-18 days |

**Total**: 2-3 weeks (allowing for self-healing and testing)

---

## Notes for Next Agent

- Strictly follow the sub-phased approach with self-healing checkpoints
- Do not skip checkpoints - they are critical for quality
- Refer to the RBAC PRD (`docs/specs/TERP_RBAC_PRD.md`) for detailed requirements
- Refer to the Permission Mapping (`docs/specs/TERP_PERMISSION_MAPPING.md`) for the complete list of 255 permissions
- Follow all Bible protocols, especially "No Placeholders/Stubs" and "Holistic System Integration"
- Test thoroughly at each checkpoint
- Commit frequently with clear messages

Good luck!

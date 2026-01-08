# RBAC-001: RBAC Permission Harmonization

<!-- METADATA (for validation) -->
<!-- TASK_ID: RBAC-001 -->
<!-- TASK_TITLE: RBAC Permission Harmonization -->
<!-- PROMPT_VERSION: 1.0 -->
<!-- LAST_VALIDATED: 2026-01-08 -->

**Repository:** https://github.com/EvanTenenbaum/TERP
**Task ID:** RBAC-001
**Estimated Time:** 4-8h
**Module:** `server/db/seed.ts`, `server/routers/`
**Priority:** HIGH

---

## Problem Statement

The ST-045 User Flow Analysis identified multiple RBAC permission strings used in code that are not present in the database seed. This causes:

1. Permission checks to fail silently or fall back to Super Admin bypass
2. Non-Super Admin roles cannot access legitimately protected endpoints
3. Inconsistent authorization behavior across the application

## Affected Permission Strings

The following permission strings are used in router middleware but NOT present in RBAC seed:

| Permission String | Module | Used By |
|-------------------|--------|---------|
| `accounting:read` | Accounting | All accounting read operations |
| `accounting:create` | Accounting | Invoice generation, payments |
| `accounting:update` | Accounting | Status updates, reconciliation |
| `accounting:delete` | Accounting | Void operations |
| `accounting:manage` | Accounting | Bad debt, fiscal period management |
| `analytics:read` | Analytics | All analytics queries |
| `settings:manage` | Admin | Configuration management |
| `audit:read` | Admin | Audit log access |
| `pricing:read` | Pricing | Pricing rules and profiles |
| `pricing:create` | Pricing | Create pricing rules |
| `pricing:update` | Pricing | Update pricing rules |
| `todos:read` | Workflow | Todo list access |
| `todos:create` | Workflow | Create tasks |
| `todos:update` | Workflow | Update tasks |
| `todos:delete` | Workflow | Delete tasks |

## Objectives

1. Add all missing permission strings to `server/db/seed.ts`
2. Assign permissions to appropriate roles (Sales Manager, Accounting Manager, etc.)
3. Create migration script to add permissions to production DB
4. Verify all endpoints work correctly for non-Super Admin users

## Reference Documentation

- **Flow Guide:** `docs/reference/FLOW_GUIDE.md`
- **Flow Matrix:** `docs/reference/USER_FLOW_MATRIX.csv`
- **RBAC Mismatches:** `docs/assets/ST-045/TERP_RBAC_Permission_Mismatches.csv`

## Deliverables

- [ ] Add missing permissions to `server/db/seed.ts` in `permissions` array
- [ ] Add role_permissions mappings for each new permission
- [ ] Create migration script: `scripts/rbac-001-add-permissions.ts`
- [ ] Test endpoints with non-Super Admin user
- [ ] Update `docs/reference/FLOW_GUIDE.md` if roles change
- [ ] All tests passing
- [ ] Zero TypeScript errors

## Implementation Steps

### Step 1: Update Seed File

Add to `server/db/seed.ts`:

```typescript
// Add to permissions array
{ name: 'accounting:read', module: 'accounting', description: 'Read accounting data' },
{ name: 'accounting:create', module: 'accounting', description: 'Create accounting records' },
{ name: 'accounting:update', module: 'accounting', description: 'Update accounting records' },
{ name: 'accounting:delete', module: 'accounting', description: 'Delete accounting records' },
{ name: 'accounting:manage', module: 'accounting', description: 'Manage fiscal periods and bad debt' },
{ name: 'analytics:read', module: 'analytics', description: 'Read analytics data' },
{ name: 'settings:manage', module: 'settings', description: 'Manage system settings' },
{ name: 'audit:read', module: 'audit', description: 'Read audit logs' },
// ... etc
```

### Step 2: Create Migration Script

```typescript
// scripts/rbac-001-add-permissions.ts
// Script to add permissions to existing production database
```

### Step 3: Test Authorization

```bash
# Test with non-Super Admin user
# Verify accounting endpoints work for Accounting Manager
# Verify analytics endpoints work for Sales Manager
```

## Success Criteria

- All permission strings in code are present in DB
- Non-Super Admin users can access their permitted endpoints
- No regressions for existing functionality
- Clear error messages for unauthorized access

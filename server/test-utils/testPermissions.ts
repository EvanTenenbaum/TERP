/**
 * Test Permission Service Utility
 * 
 * Provides a properly mocked permission service for testing that allows all permissions.
 * This utility solves permission middleware failures in tests.
 */

import { vi } from 'vitest';

/**
 * Create a mock permission service that allows all permissions
 * 
 * Use this when testing routes that have permission middleware checks.
 * The mock will return true for all permission checks, allowing tests to focus
 * on the business logic rather than permission validation.
 * 
 * @example
 * ```typescript
 * // In your test file:
 * import { setupPermissionMock } from '../test-utils/testPermissions';
 * 
 * // Mock BEFORE other imports
 * vi.mock('../services/permissionService', () => setupPermissionMock());
 * 
 * // Then import your modules
 * import { appRouter } from '../routers';
 * ```
 */
export function setupPermissionMock() {
  return {
    getUserPermissions: vi.fn().mockResolvedValue(new Set(['*'])),
    hasPermission: vi.fn().mockResolvedValue(true),
    hasAllPermissions: vi.fn().mockResolvedValue(true),
    hasAnyPermission: vi.fn().mockResolvedValue(true),
    getUserRoles: vi.fn().mockResolvedValue([
      { id: 1, name: 'Super Admin', description: 'Full system access' }
    ]),
    isSuperAdmin: vi.fn().mockResolvedValue(true),
    clearPermissionCache: vi.fn(),
    default: {
      getUserPermissions: vi.fn().mockResolvedValue(new Set(['*'])),
      hasPermission: vi.fn().mockResolvedValue(true),
      hasAllPermissions: vi.fn().mockResolvedValue(true),
      hasAnyPermission: vi.fn().mockResolvedValue(true),
      getUserRoles: vi.fn().mockResolvedValue([
        { id: 1, name: 'Super Admin', description: 'Full system access' }
      ]),
      isSuperAdmin: vi.fn().mockResolvedValue(true),
      clearPermissionCache: vi.fn(),
    },
  };
}

/**
 * Create a mock permission service that denies all permissions
 * 
 * Use this when testing permission denial scenarios.
 * 
 * @example
 * ```typescript
 * vi.mock('../services/permissionService', () => setupPermissionMockDenied());
 * ```
 */
export function setupPermissionMockDenied() {
  return {
    getUserPermissions: vi.fn().mockResolvedValue(new Set()),
    hasPermission: vi.fn().mockResolvedValue(false),
    hasAllPermissions: vi.fn().mockResolvedValue(false),
    hasAnyPermission: vi.fn().mockResolvedValue(false),
    getUserRoles: vi.fn().mockResolvedValue([]),
    isSuperAdmin: vi.fn().mockResolvedValue(false),
    clearPermissionCache: vi.fn(),
    default: {
      getUserPermissions: vi.fn().mockResolvedValue(new Set()),
      hasPermission: vi.fn().mockResolvedValue(false),
      hasAllPermissions: vi.fn().mockResolvedValue(false),
      hasAnyPermission: vi.fn().mockResolvedValue(false),
      getUserRoles: vi.fn().mockResolvedValue([]),
      isSuperAdmin: vi.fn().mockResolvedValue(false),
      clearPermissionCache: vi.fn(),
    },
  };
}

/**
 * Create a mock permission service with specific permissions
 * 
 * Use this when testing specific permission scenarios.
 * 
 * @param permissions - Array of permission strings to grant
 * @example
 * ```typescript
 * vi.mock('../services/permissionService', () => 
 *   setupPermissionMockWithPerms(['accounting:read', 'accounting:write'])
 * );
 * ```
 */
export function setupPermissionMockWithPerms(permissions: string[]) {
  const permSet = new Set(permissions);
  return {
    getUserPermissions: vi.fn().mockResolvedValue(permSet),
    hasPermission: vi.fn().mockImplementation(async (userId: number, perm: string) => {
      return permSet.has(perm) || permSet.has('*');
    }),
    hasAllPermissions: vi.fn().mockImplementation(async (userId: number, perms: string[]) => {
      return perms.every(p => permSet.has(p) || permSet.has('*'));
    }),
    hasAnyPermission: vi.fn().mockImplementation(async (userId: number, perms: string[]) => {
      return perms.some(p => permSet.has(p) || permSet.has('*'));
    }),
    getUserRoles: vi.fn().mockResolvedValue([
      { id: 2, name: 'Custom Role', description: 'Custom permissions' }
    ]),
    isSuperAdmin: vi.fn().mockResolvedValue(permSet.has('*')),
    clearPermissionCache: vi.fn(),
    default: {
      getUserPermissions: vi.fn().mockResolvedValue(permSet),
      hasPermission: vi.fn().mockImplementation(async (userId: number, perm: string) => {
        return permSet.has(perm) || permSet.has('*');
      }),
      hasAllPermissions: vi.fn().mockImplementation(async (userId: number, perms: string[]) => {
        return perms.every(p => permSet.has(p) || permSet.has('*'));
      }),
      hasAnyPermission: vi.fn().mockImplementation(async (userId: number, perms: string[]) => {
        return perms.some(p => permSet.has(p) || permSet.has('*'));
      }),
      getUserRoles: vi.fn().mockResolvedValue([
        { id: 2, name: 'Custom Role', description: 'Custom permissions' }
      ]),
      isSuperAdmin: vi.fn().mockResolvedValue(permSet.has('*')),
      clearPermissionCache: vi.fn(),
    },
  };
}

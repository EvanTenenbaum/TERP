/**
 * Tests for testPermissions utility
 * Validates that the permission mocking utility works correctly
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setupPermissionMock, setupPermissionMockDenied, setupPermissionMockWithPerms } from './testPermissions';

describe('testPermissions utility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('setupPermissionMock', () => {
    it('should return a mock that allows all permissions', async () => {
      const mock = setupPermissionMock();
      
      expect(await mock.hasPermission(1, 'any:permission')).toBe(true);
      expect(await mock.hasAllPermissions(1, ['perm1', 'perm2'])).toBe(true);
      expect(await mock.hasAnyPermission(1, ['perm1', 'perm2'])).toBe(true);
      expect(await mock.isSuperAdmin(1)).toBe(true);
    });

    it('should return getUserPermissions with wildcard', async () => {
      const mock = setupPermissionMock();
      const perms = await mock.getUserPermissions(1);
      
      expect(perms).toBeInstanceOf(Set);
      expect(perms.has('*')).toBe(true);
    });

    it('should return super admin role', async () => {
      const mock = setupPermissionMock();
      const roles = await mock.getUserRoles(1);
      
      expect(roles).toHaveLength(1);
      expect(roles[0].name).toBe('Super Admin');
    });

    it('should have default export with same functions', async () => {
      const mock = setupPermissionMock();
      
      expect(await mock.default.hasPermission(1, 'test')).toBe(true);
      expect(await mock.default.isSuperAdmin(1)).toBe(true);
    });
  });

  describe('setupPermissionMockDenied', () => {
    it('should return a mock that denies all permissions', async () => {
      const mock = setupPermissionMockDenied();
      
      expect(await mock.hasPermission(1, 'any:permission')).toBe(false);
      expect(await mock.hasAllPermissions(1, ['perm1', 'perm2'])).toBe(false);
      expect(await mock.hasAnyPermission(1, ['perm1', 'perm2'])).toBe(false);
      expect(await mock.isSuperAdmin(1)).toBe(false);
    });

    it('should return empty permission set', async () => {
      const mock = setupPermissionMockDenied();
      const perms = await mock.getUserPermissions(1);
      
      expect(perms).toBeInstanceOf(Set);
      expect(perms.size).toBe(0);
    });

    it('should return empty roles array', async () => {
      const mock = setupPermissionMockDenied();
      const roles = await mock.getUserRoles(1);
      
      expect(roles).toHaveLength(0);
    });
  });

  describe('setupPermissionMockWithPerms', () => {
    it('should grant only specified permissions', async () => {
      const mock = setupPermissionMockWithPerms(['accounting:read', 'accounting:write']);
      
      expect(await mock.hasPermission(1, 'accounting:read')).toBe(true);
      expect(await mock.hasPermission(1, 'accounting:write')).toBe(true);
      expect(await mock.hasPermission(1, 'accounting:delete')).toBe(false);
    });

    it('should handle hasAllPermissions correctly', async () => {
      const mock = setupPermissionMockWithPerms(['perm1', 'perm2', 'perm3']);
      
      expect(await mock.hasAllPermissions(1, ['perm1', 'perm2'])).toBe(true);
      expect(await mock.hasAllPermissions(1, ['perm1', 'perm4'])).toBe(false);
    });

    it('should handle hasAnyPermission correctly', async () => {
      const mock = setupPermissionMockWithPerms(['perm1', 'perm2']);
      
      expect(await mock.hasAnyPermission(1, ['perm1', 'perm3'])).toBe(true);
      expect(await mock.hasAnyPermission(1, ['perm3', 'perm4'])).toBe(false);
    });

    it('should grant wildcard permission if included', async () => {
      const mock = setupPermissionMockWithPerms(['*']);
      
      expect(await mock.hasPermission(1, 'any:permission')).toBe(true);
      expect(await mock.isSuperAdmin(1)).toBe(true);
    });

    it('should return custom role', async () => {
      const mock = setupPermissionMockWithPerms(['test:perm']);
      const roles = await mock.getUserRoles(1);
      
      expect(roles).toHaveLength(1);
      expect(roles[0].name).toBe('Custom Role');
    });

    it('should return correct permission set', async () => {
      const mock = setupPermissionMockWithPerms(['perm1', 'perm2']);
      const perms = await mock.getUserPermissions(1);
      
      expect(perms).toBeInstanceOf(Set);
      expect(perms.has('perm1')).toBe(true);
      expect(perms.has('perm2')).toBe(true);
      expect(perms.has('perm3')).toBe(false);
    });
  });
});

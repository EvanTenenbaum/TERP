/**
 * Integration Tests for RBAC Users Router
 *
 * Tests all tRPC procedures in the rbac-users router.
 * Uses AAA (Arrange, Act, Assert) pattern for clarity.
 *
 * @module server/routers/rbac-users.test.ts
 */
import { describe, it, expect, beforeAll, vi, beforeEach } from "vitest";
import { setupDbMock } from "../test-utils/testDb";

// Mock the database (MUST be before other imports)
vi.mock("../db", () => setupDbMock());

// Mock permission service
vi.mock("../services/permissionService");

import { appRouter } from "../routers";
import { createContext } from "../_core/context";
import { db } from "../db";
import * as permissionService from "../services/permissionService";

// Mock user for authenticated requests (Super Admin)
const mockUser = {
  id: 1,
  openId: "user_superadmin123",
  email: "admin@terp.com",
  name: "Super Admin",
};

// Create a test caller with mock context
const createCaller = async () => {
  const ctx = await createContext({
    req: { headers: {} as Record<string, string> },
    res: {} as Record<string, unknown>,
  });
  return appRouter.createCaller({
    ...ctx,
    user: mockUser,
  });
};

describe("RBAC Users Router", () => {
  let caller: Awaited<ReturnType<typeof createCaller>>;

  beforeAll(async () => {
    caller = await createCaller();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock Super Admin check to return true by default
    vi.mocked(permissionService.isSuperAdmin).mockResolvedValue(true);
  });

  describe("list", () => {
    it("should retrieve list of users with their roles", async () => {
      // Arrange
      const mockUserRoles = [
        {
          userId: "user_123",
          roleId: 1,
          roleName: "Sales Manager",
          roleDescription: "Full access to sales",
          assignedAt: new Date(),
        },
        {
          userId: "user_123",
          roleId: 2,
          roleName: "Inventory Manager",
          roleDescription: "Full access to inventory",
          assignedAt: new Date(),
        },
      ];

      const mockFrom = vi.fn().mockReturnThis();
      const mockInnerJoin = vi.fn().mockReturnThis();
      const mockLimit = vi.fn().mockReturnThis();
      const mockOffset = vi.fn().mockResolvedValue(mockUserRoles);

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        innerJoin: mockInnerJoin,
        limit: mockLimit,
        offset: mockOffset,
      } as unknown as ReturnType<typeof db.select>);

      // Act
      const result = await caller.rbacUsers.list({});

      // Assert
      expect(result.users).toBeDefined();
      expect(db.select).toHaveBeenCalled();
    });

    it("should apply pagination parameters", async () => {
      // Arrange
      const mockUserRoles: unknown[] = [];

      const mockFrom = vi.fn().mockReturnThis();
      const mockInnerJoin = vi.fn().mockReturnThis();
      const mockLimit = vi.fn().mockReturnThis();
      const mockOffset = vi.fn().mockResolvedValue(mockUserRoles);

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        innerJoin: mockInnerJoin,
        limit: mockLimit,
        offset: mockOffset,
      } as unknown as ReturnType<typeof db.select>);

      // Act
      await caller.rbacUsers.list({ limit: 25, offset: 50 });

      // Assert
      expect(mockLimit).toHaveBeenCalledWith(25);
      expect(mockOffset).toHaveBeenCalledWith(50);
    });
  });

  describe("getById", () => {
    it("should retrieve user details with roles and permission overrides", async () => {
      // Arrange
      const userId = "user_123";
      const mockRoles = [
        {
          roleId: 1,
          roleName: "Sales Manager",
          roleDescription: "Full access to sales",
          assignedAt: new Date(),
        },
      ];
      const mockOverrides = [
        {
          permissionId: 1,
          permissionName: "orders:delete",
          permissionDescription: "Can delete orders",
          granted: 1,
          createdAt: new Date(),
        },
      ];

      const mockFrom = vi.fn().mockReturnThis();
      const mockInnerJoin = vi.fn().mockReturnThis();
      const mockWhere = vi.fn();

      // First call for roles
      mockWhere.mockResolvedValueOnce(mockRoles);
      // Second call for overrides
      mockWhere.mockResolvedValueOnce(mockOverrides);

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        innerJoin: mockInnerJoin,
        where: mockWhere,
      } as unknown as ReturnType<typeof db.select>);

      // Act
      const result = await caller.rbacUsers.getById({ userId });

      // Assert
      expect(result.userId).toBe(userId);
      expect(result.roles).toBeDefined();
      expect(result.permissionOverrides).toBeDefined();
    });
  });

  describe("assignRole", () => {
    it("should assign a role to a user", async () => {
      // Arrange
      const userId = "user_123";
      const roleId = 1;
      const mockRole = [{ id: 1, name: "Sales Manager" }];

      const mockFrom = vi.fn().mockReturnThis();
      const mockWhere = vi.fn().mockReturnThis();
      const mockLimit = vi.fn();

      // First call: check role exists
      mockLimit.mockResolvedValueOnce(mockRole);
      // Second call: check if user already has role
      mockLimit.mockResolvedValueOnce([]);

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
        limit: mockLimit,
      } as unknown as ReturnType<typeof db.select>);

      const mockValues = vi.fn().mockResolvedValue({});

      vi.mocked(db.insert).mockReturnValue({
        values: mockValues,
      } as unknown as ReturnType<typeof db.select>);

      vi.mocked(permissionService.clearPermissionCache).mockReturnValue(
        undefined
      );

      // Act
      const result = await caller.rbacUsers.assignRole({ userId, roleId });

      // Assert
      expect(result.success).toBe(true);
      expect(db.insert).toHaveBeenCalled();
      expect(permissionService.clearPermissionCache).toHaveBeenCalledWith(
        userId
      );
    });

    it("should throw error if role does not exist", async () => {
      // Arrange
      const userId = "user_123";
      const roleId = 999;

      const mockFrom = vi.fn().mockReturnThis();
      const mockWhere = vi.fn().mockReturnThis();
      const mockLimit = vi.fn().mockResolvedValue([]);

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
        limit: mockLimit,
      } as unknown as ReturnType<typeof db.select>);

      // Act & Assert
      await expect(
        caller.rbacUsers.assignRole({ userId, roleId })
      ).rejects.toThrow("Role with ID 999 not found");
    });

    it("should throw error if user already has the role", async () => {
      // Arrange
      const userId = "user_123";
      const roleId = 1;
      const mockRole = [{ id: 1, name: "Sales Manager" }];
      const mockExisting = [{ userId: "user_123" }];

      const mockFrom = vi.fn().mockReturnThis();
      const mockWhere = vi.fn().mockReturnThis();
      const mockLimit = vi.fn();

      // First call: check role exists
      mockLimit.mockResolvedValueOnce(mockRole);
      // Second call: check if user already has role
      mockLimit.mockResolvedValueOnce(mockExisting);

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
        limit: mockLimit,
      } as unknown as ReturnType<typeof db.select>);

      // Act & Assert
      await expect(
        caller.rbacUsers.assignRole({ userId, roleId })
      ).rejects.toThrow("User already has role Sales Manager");
    });
  });

  describe("removeRole", () => {
    it("should remove a role from a user", async () => {
      // Arrange
      const userId = "user_123";
      const roleId = 1;
      const mockRole = [{ name: "Sales Manager" }];

      const mockFrom = vi.fn().mockReturnThis();
      const mockWhere = vi.fn().mockReturnThis();
      const mockLimit = vi.fn().mockResolvedValue(mockRole);

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
        limit: mockLimit,
      } as unknown as ReturnType<typeof db.select>);

      const mockDeleteWhere = vi.fn().mockResolvedValue({});

      vi.mocked(db.delete).mockReturnValue({
        where: mockDeleteWhere,
      } as unknown as ReturnType<typeof db.select>);

      vi.mocked(permissionService.clearPermissionCache).mockReturnValue(
        undefined
      );

      // Act
      const result = await caller.rbacUsers.removeRole({ userId, roleId });

      // Assert
      expect(result.success).toBe(true);
      expect(db.delete).toHaveBeenCalled();
      expect(permissionService.clearPermissionCache).toHaveBeenCalledWith(
        userId
      );
    });
  });

  describe("grantPermission", () => {
    it("should grant a permission override to a user", async () => {
      // Arrange
      const userId = "user_123";
      const permissionId = 1;
      const mockPermission = [{ id: 1, name: "orders:delete" }];

      const mockFrom = vi.fn().mockReturnThis();
      const mockWhere = vi.fn().mockReturnThis();
      const mockLimit = vi.fn().mockResolvedValue(mockPermission);

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
        limit: mockLimit,
      } as unknown as ReturnType<typeof db.select>);

      const mockValues = vi.fn().mockReturnThis();
      const mockOnDuplicateKeyUpdate = vi.fn().mockResolvedValue({});

      vi.mocked(db.insert).mockReturnValue({
        values: mockValues,
        onDuplicateKeyUpdate: mockOnDuplicateKeyUpdate,
      } as unknown as ReturnType<typeof db.select>);

      vi.mocked(permissionService.clearPermissionCache).mockReturnValue(
        undefined
      );

      // Act
      const result = await caller.rbacUsers.grantPermission({
        userId,
        permissionId,
      });

      // Assert
      expect(result.success).toBe(true);
      expect(db.insert).toHaveBeenCalled();
      expect(permissionService.clearPermissionCache).toHaveBeenCalledWith(
        userId
      );
    });
  });

  describe("revokePermission", () => {
    it("should revoke a permission override from a user", async () => {
      // Arrange
      const userId = "user_123";
      const permissionId = 1;
      const mockPermission = [{ id: 1, name: "orders:delete" }];

      const mockFrom = vi.fn().mockReturnThis();
      const mockWhere = vi.fn().mockReturnThis();
      const mockLimit = vi.fn().mockResolvedValue(mockPermission);

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
        limit: mockLimit,
      } as unknown as ReturnType<typeof db.select>);

      const mockValues = vi.fn().mockReturnThis();
      const mockOnDuplicateKeyUpdate = vi.fn().mockResolvedValue({});

      vi.mocked(db.insert).mockReturnValue({
        values: mockValues,
        onDuplicateKeyUpdate: mockOnDuplicateKeyUpdate,
      } as unknown as ReturnType<typeof db.select>);

      vi.mocked(permissionService.clearPermissionCache).mockReturnValue(
        undefined
      );

      // Act
      const result = await caller.rbacUsers.revokePermission({
        userId,
        permissionId,
      });

      // Assert
      expect(result.success).toBe(true);
      expect(permissionService.clearPermissionCache).toHaveBeenCalledWith(
        userId
      );
    });
  });

  describe("bulkAssignRoles", () => {
    it("should assign multiple roles to a user", async () => {
      // Arrange
      const userId = "user_123";
      const roleIds = [1, 2, 3];
      const mockRoles = [
        { id: 1, name: "Sales Manager" },
        { id: 2, name: "Inventory Manager" },
        { id: 3, name: "Accountant" },
      ];
      const mockCurrentRoles: unknown[] = [];

      const mockFrom = vi.fn().mockReturnThis();
      const mockWhere = vi.fn();

      // First call: validate roles exist
      mockWhere.mockResolvedValueOnce(mockRoles);
      // Second call: get current roles
      mockWhere.mockResolvedValueOnce(mockCurrentRoles);

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
      } as unknown as ReturnType<typeof db.select>);

      const mockValues = vi.fn().mockResolvedValue({});

      vi.mocked(db.insert).mockReturnValue({
        values: mockValues,
      } as unknown as ReturnType<typeof db.select>);

      vi.mocked(permissionService.clearPermissionCache).mockReturnValue(
        undefined
      );

      // Act
      const result = await caller.rbacUsers.bulkAssignRoles({
        userId,
        roleIds,
      });

      // Assert
      expect(result.success).toBe(true);
      expect(result.assignedCount).toBe(3);
      expect(permissionService.clearPermissionCache).toHaveBeenCalledWith(
        userId
      );
    });
  });

  describe("replaceRoles", () => {
    it("should replace all roles for a user", async () => {
      // Arrange
      const userId = "user_123";
      const roleIds = [2, 3];
      const mockRoles = [
        { id: 2, name: "Inventory Manager" },
        { id: 3, name: "Accountant" },
      ];

      const mockFrom = vi.fn().mockReturnThis();
      const mockWhere = vi.fn().mockResolvedValue(mockRoles);

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
      } as unknown as ReturnType<typeof db.select>);

      const mockDeleteWhere = vi.fn().mockResolvedValue({});

      vi.mocked(db.delete).mockReturnValue({
        where: mockDeleteWhere,
      } as unknown as ReturnType<typeof db.select>);

      const mockValues = vi.fn().mockResolvedValue({});

      vi.mocked(db.insert).mockReturnValue({
        values: mockValues,
      } as unknown as ReturnType<typeof db.select>);

      vi.mocked(permissionService.clearPermissionCache).mockReturnValue(
        undefined
      );

      // Act
      const result = await caller.rbacUsers.replaceRoles({ userId, roleIds });

      // Assert
      expect(result.success).toBe(true);
      expect(db.delete).toHaveBeenCalled();
      expect(db.insert).toHaveBeenCalled();
      expect(permissionService.clearPermissionCache).toHaveBeenCalledWith(
        userId
      );
    });
  });
});

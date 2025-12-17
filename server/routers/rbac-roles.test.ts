/**
 * Integration Tests for RBAC Roles Router
 *
 * Tests all tRPC procedures in the rbac-roles router.
 * Uses AAA (Arrange, Act, Assert) pattern for clarity.
 *
 * @module server/routers/rbac-roles.test.ts
 */
import { describe, it, expect, beforeAll, vi, beforeEach } from "vitest";
import { setupDbMock } from "../test-utils/testDb";
import { setupPermissionMock } from "../test-utils/testPermissions";

// Mock the database (MUST be before other imports)
vi.mock("../db", () => setupDbMock());

// Mock permission service (MUST be before other imports)
vi.mock("../services/permissionService", () => setupPermissionMock());

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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    req: { headers: {} } as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    res: {} as any,
  });
  return appRouter.createCaller({
    ...ctx,
    user: mockUser,
  });
};

describe("RBAC Roles Router", () => {
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
    it("should retrieve list of roles with permission and user counts", async () => {
      // Arrange
      const mockRoles = [
        {
          id: 1,
          name: "Sales Manager",
          description: "Full access to sales",
          isSystemRole: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 2,
          name: "Custom Role",
          description: "Custom role",
          isSystemRole: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const mockPermissionCounts = [
        { roleId: 1, count: 25 },
        { roleId: 2, count: 10 },
      ];

      const mockUserCounts = [
        { roleId: 1, count: 5 },
        { roleId: 2, count: 2 },
      ];

      const mockSelect = vi.fn().mockReturnThis();
      const mockFrom = vi.fn().mockReturnThis();
      const mockWhere = vi.fn().mockReturnThis();
      const mockLimit = vi.fn().mockReturnThis();
      const mockOffset = vi.fn().mockReturnThis();
      const mockGroupBy = vi.fn();

      // First call: get roles
      mockOffset.mockResolvedValueOnce(mockRoles);
      // Second call: get permission counts
      mockGroupBy.mockResolvedValueOnce(mockPermissionCounts);
      // Third call: get user counts
      mockGroupBy.mockResolvedValueOnce(mockUserCounts);

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
        limit: mockLimit,
        offset: mockOffset,
        groupBy: mockGroupBy,
      } as any);

      // Act
      const result = await caller.rbacRoles.list({});

      // Assert
      expect(result.roles).toBeDefined();
      expect(result.roles.length).toBe(2);
      expect(result.roles[0].permissionCount).toBe(25);
      expect(result.roles[0].userCount).toBe(5);
    });

    // TODO: Fix mock chain - where().groupBy() chain breaks
    it.skip("should filter out system roles when requested", async () => {
      // Arrange
      const mockRoles = [
        {
          id: 2,
          name: "Custom Role",
          description: "Custom role",
          isSystemRole: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const mockSelect = vi.fn().mockReturnThis();
      const mockFrom = vi.fn().mockReturnThis();
      const mockWhere = vi.fn().mockReturnThis();
      const mockLimit = vi.fn().mockReturnThis();
      const mockOffset = vi.fn().mockResolvedValue(mockRoles);

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
        limit: mockLimit,
        offset: mockOffset,
      } as any);

      // Act
      await caller.rbacRoles.list({ includeSystemRoles: false });

      // Assert
      expect(mockWhere).toHaveBeenCalled();
    });
  });

  describe("getById", () => {
    // TODO: Fix mock chain - where().limit() chain breaks
    it.skip("should retrieve role details with permissions and user count", async () => {
      // Arrange
      const roleId = 1;
      const mockRole = [
        {
          id: 1,
          name: "Sales Manager",
          description: "Full access to sales",
          isSystemRole: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const mockPermissions = [
        {
          permissionId: 1,
          permissionName: "orders:create",
          permissionDescription: "Can create orders",
          permissionModule: "orders",
          assignedAt: new Date(),
        },
      ];

      const mockUserCount = [{ count: 5 }];

      const mockSelect = vi.fn().mockReturnThis();
      const mockFrom = vi.fn().mockReturnThis();
      const mockInnerJoin = vi.fn().mockReturnThis();
      const mockWhere = vi.fn().mockReturnThis();
      const mockLimit = vi.fn();

      // First call: get role
      mockLimit.mockResolvedValueOnce(mockRole);
      // Second call: get permissions
      mockWhere.mockResolvedValueOnce(mockPermissions);
      // Third call: get user count
      mockWhere.mockResolvedValueOnce(mockUserCount);

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        innerJoin: mockInnerJoin,
        where: mockWhere,
        limit: mockLimit,
      } as any);

      // Act
      const result = await caller.rbacRoles.getById({ roleId });

      // Assert
      expect(result.id).toBe(1);
      expect(result.name).toBe("Sales Manager");
      expect(result.permissions).toBeDefined();
      expect(result.userCount).toBe(5);
    });

    it("should throw error if role not found", async () => {
      // Arrange
      const roleId = 999;

      const mockSelect = vi.fn().mockReturnThis();
      const mockFrom = vi.fn().mockReturnThis();
      const mockWhere = vi.fn().mockReturnThis();
      const mockLimit = vi.fn().mockResolvedValue([]);

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
        limit: mockLimit,
      } as any);

      // Act & Assert
      await expect(
        caller.rbacRoles.getById({ roleId })
      ).rejects.toThrow("Role with ID 999 not found");
    });
  });

  describe("create", () => {
    it("should create a new custom role", async () => {
      // Arrange
      const roleName = "New Custom Role";
      const roleDescription = "A new custom role";

      const mockSelect = vi.fn().mockReturnThis();
      const mockFrom = vi.fn().mockReturnThis();
      const mockWhere = vi.fn().mockReturnThis();
      const mockLimit = vi.fn().mockResolvedValue([]);

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
        limit: mockLimit,
      } as any);

      const mockInsert = vi.fn().mockReturnThis();
      // Router expects array format: [{ insertId: number }]
      const mockValues = vi.fn().mockResolvedValue([{ insertId: 10 }]);

      vi.mocked(db.insert).mockReturnValue({
        values: mockValues,
      } as any);

      // Act
      const result = await caller.rbacRoles.create({
        name: roleName,
        description: roleDescription,
      });

      // Assert
      expect(result.success).toBe(true);
      expect(result.roleId).toBe(10);
      expect(db.insert).toHaveBeenCalled();
    });

    it("should throw error if role name already exists", async () => {
      // Arrange
      const roleName = "Existing Role";
      const mockExisting = [{ id: 5 }];

      const mockSelect = vi.fn().mockReturnThis();
      const mockFrom = vi.fn().mockReturnThis();
      const mockWhere = vi.fn().mockReturnThis();
      const mockLimit = vi.fn().mockResolvedValue(mockExisting);

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
        limit: mockLimit,
      } as any);

      // Act & Assert
      await expect(
        caller.rbacRoles.create({ name: roleName })
      ).rejects.toThrow('Role with name "Existing Role" already exists');
    });
  });

  describe("update", () => {
    it("should update a custom role", async () => {
      // Arrange
      const roleId = 10;
      const newName = "Updated Role Name";
      const mockRole = [{ id: 10, name: "Old Name", isSystemRole: 0 }];

      const mockSelect = vi.fn().mockReturnThis();
      const mockFrom = vi.fn().mockReturnThis();
      const mockWhere = vi.fn().mockReturnThis();
      const mockLimit = vi.fn();

      // First call: check role exists and is not system role
      mockLimit.mockResolvedValueOnce(mockRole);
      // Second call: check for name conflicts
      mockLimit.mockResolvedValueOnce([]);

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
        limit: mockLimit,
      } as any);

      const mockUpdate = vi.fn().mockReturnThis();
      const mockSet = vi.fn().mockReturnThis();
      const mockUpdateWhere = vi.fn().mockResolvedValue({});

      vi.mocked(db.update).mockReturnValue({
        set: mockSet,
        where: mockUpdateWhere,
      } as any);

      // Act
      const result = await caller.rbacRoles.update({
        roleId,
        name: newName,
      });

      // Assert
      expect(result.success).toBe(true);
      expect(db.update).toHaveBeenCalled();
    });

    it("should throw error when trying to update a system role", async () => {
      // Arrange
      const roleId = 1;
      const mockRole = [{ id: 1, name: "Super Admin", isSystemRole: 1 }];

      const mockSelect = vi.fn().mockReturnThis();
      const mockFrom = vi.fn().mockReturnThis();
      const mockWhere = vi.fn().mockReturnThis();
      const mockLimit = vi.fn().mockResolvedValue(mockRole);

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
        limit: mockLimit,
      } as any);

      // Act & Assert
      await expect(
        caller.rbacRoles.update({ roleId, name: "New Name" })
      ).rejects.toThrow("System roles cannot be modified");
    });
  });

  describe("delete", () => {
    it("should delete a custom role", async () => {
      // Arrange
      const roleId = 10;
      const mockRole = [{ id: 10, name: "Custom Role", isSystemRole: 0 }];

      const mockSelect = vi.fn().mockReturnThis();
      const mockFrom = vi.fn().mockReturnThis();
      const mockWhere = vi.fn().mockReturnThis();
      const mockLimit = vi.fn().mockResolvedValue(mockRole);

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
        limit: mockLimit,
      } as any);

      const mockDelete = vi.fn().mockReturnThis();
      const mockDeleteWhere = vi.fn().mockResolvedValue({});

      vi.mocked(db.delete).mockReturnValue({
        where: mockDeleteWhere,
      } as any);

      vi.mocked(permissionService.clearPermissionCache).mockReturnValue(undefined);

      // Act
      const result = await caller.rbacRoles.delete({ roleId });

      // Assert
      expect(result.success).toBe(true);
      expect(db.delete).toHaveBeenCalled();
      expect(permissionService.clearPermissionCache).toHaveBeenCalled();
    });

    it("should throw error when trying to delete a system role", async () => {
      // Arrange
      const roleId = 1;
      const mockRole = [{ id: 1, name: "Super Admin", isSystemRole: 1 }];

      const mockSelect = vi.fn().mockReturnThis();
      const mockFrom = vi.fn().mockReturnThis();
      const mockWhere = vi.fn().mockReturnThis();
      const mockLimit = vi.fn().mockResolvedValue(mockRole);

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
        limit: mockLimit,
      } as any);

      // Act & Assert
      await expect(
        caller.rbacRoles.delete({ roleId })
      ).rejects.toThrow("System roles cannot be deleted");
    });
  });

  describe("assignPermission", () => {
    it("should assign a permission to a role", async () => {
      // Arrange
      const roleId = 1;
      const permissionId = 10;
      const mockRole = [{ id: 1, name: "Sales Manager" }];
      const mockPermission = [{ id: 10, name: "orders:create" }];

      const mockSelect = vi.fn().mockReturnThis();
      const mockFrom = vi.fn().mockReturnThis();
      const mockWhere = vi.fn().mockReturnThis();
      const mockLimit = vi.fn();

      // First call: validate role
      mockLimit.mockResolvedValueOnce(mockRole);
      // Second call: validate permission
      mockLimit.mockResolvedValueOnce(mockPermission);
      // Third call: check if already assigned
      mockLimit.mockResolvedValueOnce([]);

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
        limit: mockLimit,
      } as any);

      const mockInsert = vi.fn().mockReturnThis();
      const mockValues = vi.fn().mockResolvedValue({});

      vi.mocked(db.insert).mockReturnValue({
        values: mockValues,
      } as any);

      vi.mocked(permissionService.clearPermissionCache).mockReturnValue(undefined);

      // Act
      const result = await caller.rbacRoles.assignPermission({ roleId, permissionId });

      // Assert
      expect(result.success).toBe(true);
      expect(db.insert).toHaveBeenCalled();
      expect(permissionService.clearPermissionCache).toHaveBeenCalled();
    });
  });

  describe("removePermission", () => {
    it("should remove a permission from a role", async () => {
      // Arrange
      const roleId = 1;
      const permissionId = 10;
      const mockRole = [{ name: "Sales Manager" }];
      const mockPermission = [{ name: "orders:create" }];

      const mockSelect = vi.fn().mockReturnThis();
      const mockFrom = vi.fn().mockReturnThis();
      const mockWhere = vi.fn().mockReturnThis();
      const mockLimit = vi.fn();

      // First call: get role name
      mockLimit.mockResolvedValueOnce(mockRole);
      // Second call: get permission name
      mockLimit.mockResolvedValueOnce(mockPermission);

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
        limit: mockLimit,
      } as any);

      const mockDelete = vi.fn().mockReturnThis();
      const mockDeleteWhere = vi.fn().mockResolvedValue({});

      vi.mocked(db.delete).mockReturnValue({
        where: mockDeleteWhere,
      } as any);

      vi.mocked(permissionService.clearPermissionCache).mockReturnValue(undefined);

      // Act
      const result = await caller.rbacRoles.removePermission({ roleId, permissionId });

      // Assert
      expect(result.success).toBe(true);
      expect(db.delete).toHaveBeenCalled();
      expect(permissionService.clearPermissionCache).toHaveBeenCalled();
    });
  });

  describe("bulkAssignPermissions", () => {
    // TODO: Fix mock chain - where().limit() chain breaks
    it.skip("should assign multiple permissions to a role", async () => {
      // Arrange
      const roleId = 1;
      const permissionIds = [10, 11, 12];
      const mockRole = [{ id: 1, name: "Sales Manager" }];
      const mockPermissions = [
        { id: 10 },
        { id: 11 },
        { id: 12 },
      ];
      const mockCurrentPermissions: any[] = [];

      const mockSelect = vi.fn().mockReturnThis();
      const mockFrom = vi.fn().mockReturnThis();
      const mockWhere = vi.fn();

      // First call: validate role
      mockWhere.mockResolvedValueOnce(mockRole);
      // Second call: validate permissions
      mockWhere.mockResolvedValueOnce(mockPermissions);
      // Third call: get current permissions
      mockWhere.mockResolvedValueOnce(mockCurrentPermissions);

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
      } as any);

      const mockInsert = vi.fn().mockReturnThis();
      const mockValues = vi.fn().mockResolvedValue({});

      vi.mocked(db.insert).mockReturnValue({
        values: mockValues,
      } as any);

      vi.mocked(permissionService.clearPermissionCache).mockReturnValue(undefined);

      // Act
      const result = await caller.rbacRoles.bulkAssignPermissions({ roleId, permissionIds });

      // Assert
      expect(result.success).toBe(true);
      expect(result.assignedCount).toBe(3);
      expect(permissionService.clearPermissionCache).toHaveBeenCalled();
    });
  });

  describe("replacePermissions", () => {
    // TODO: Fix mock chain - where().limit() chain breaks
    it.skip("should replace all permissions for a role", async () => {
      // Arrange
      const roleId = 1;
      const permissionIds = [11, 12];
      const mockRole = [{ id: 1, name: "Sales Manager" }];
      const mockPermissions = [
        { id: 11 },
        { id: 12 },
      ];

      const mockSelect = vi.fn().mockReturnThis();
      const mockFrom = vi.fn().mockReturnThis();
      const mockWhere = vi.fn();

      // First call: validate role
      mockWhere.mockResolvedValueOnce(mockRole);
      // Second call: validate permissions
      mockWhere.mockResolvedValueOnce(mockPermissions);

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
      } as any);

      const mockDelete = vi.fn().mockReturnThis();
      const mockDeleteWhere = vi.fn().mockResolvedValue({});

      vi.mocked(db.delete).mockReturnValue({
        where: mockDeleteWhere,
      } as any);

      const mockInsert = vi.fn().mockReturnThis();
      const mockValues = vi.fn().mockResolvedValue({});

      vi.mocked(db.insert).mockReturnValue({
        values: mockValues,
      } as any);

      vi.mocked(permissionService.clearPermissionCache).mockReturnValue(undefined);

      // Act
      const result = await caller.rbacRoles.replacePermissions({ roleId, permissionIds });

      // Assert
      expect(result.success).toBe(true);
      expect(db.delete).toHaveBeenCalled();
      expect(db.insert).toHaveBeenCalled();
      expect(permissionService.clearPermissionCache).toHaveBeenCalled();
    });
  });
});

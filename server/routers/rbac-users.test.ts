/**
 * Integration Tests for RBAC Users Router
 *
 * Tests all tRPC procedures in the rbac-users router.
 * Uses AAA (Arrange, Act, Assert) pattern for clarity.
 *
 * @module server/routers/rbac-users.test.ts
 */
import { describe, it, expect, beforeAll, vi, beforeEach } from "vitest";
import { appRouter } from "../routers";
import { createContext } from "../_core/context";
import { getDb } from "../db";
import * as permissionService from "../services/permissionService";

// Mock the database
vi.mock("../db", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    delete: vi.fn(),
    update: vi.fn(),
  },
}));

// Mock permission service
vi.mock("../services/permissionService");

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

      const mockSelect = vi.fn().mockReturnThis();
      const mockFrom = vi.fn().mockReturnThis();
      const mockInnerJoin = vi.fn().mockReturnThis();
      const mockLimit = vi.fn().mockReturnThis();
      const mockOffset = vi.fn().mockResolvedValue(mockUserRoles);

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        innerJoin: mockInnerJoin,
        limit: mockLimit,
        offset: mockOffset,
      } as any);

      // Act
      const result = await caller.rbacUsers.list({});

      // Assert
      expect(result.users).toBeDefined();
      expect(db.select).toHaveBeenCalled();
    });

    it("should apply pagination parameters", async () => {
      // Arrange
      const mockUserRoles: any[] = [];

      const mockSelect = vi.fn().mockReturnThis();
      const mockFrom = vi.fn().mockReturnThis();
      const mockInnerJoin = vi.fn().mockReturnThis();
      const mockLimit = vi.fn().mockReturnThis();
      const mockOffset = vi.fn().mockResolvedValue(mockUserRoles);

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        innerJoin: mockInnerJoin,
        limit: mockLimit,
        offset: mockOffset,
      } as any);

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

      const mockSelect = vi.fn().mockReturnThis();
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
      } as any);

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

      const mockSelect = vi.fn().mockReturnThis();
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
      } as any);

      const mockInsert = vi.fn().mockReturnThis();
      const mockValues = vi.fn().mockResolvedValue({});

      vi.mocked(db.insert).mockReturnValue({
        values: mockValues,
      } as any);

      vi.mocked(permissionService.clearPermissionCache).mockReturnValue(undefined);

      // Act
      const result = await caller.rbacUsers.assignRole({ userId, roleId });

      // Assert
      expect(result.success).toBe(true);
      expect(db.insert).toHaveBeenCalled();
      expect(permissionService.clearPermissionCache).toHaveBeenCalledWith(userId);
    });

    it("should throw error if role does not exist", async () => {
      // Arrange
      const userId = "user_123";
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
        caller.rbacUsers.assignRole({ userId, roleId })
      ).rejects.toThrow("Role with ID 999 not found");
    });

    it("should throw error if user already has the role", async () => {
      // Arrange
      const userId = "user_123";
      const roleId = 1;
      const mockRole = [{ id: 1, name: "Sales Manager" }];
      const mockExisting = [{ userId: "user_123" }];

      const mockSelect = vi.fn().mockReturnThis();
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
      } as any);

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
      const result = await caller.rbacUsers.removeRole({ userId, roleId });

      // Assert
      expect(result.success).toBe(true);
      expect(db.delete).toHaveBeenCalled();
      expect(permissionService.clearPermissionCache).toHaveBeenCalledWith(userId);
    });
  });

  describe("grantPermission", () => {
    it("should grant a permission override to a user", async () => {
      // Arrange
      const userId = "user_123";
      const permissionId = 1;
      const mockPermission = [{ id: 1, name: "orders:delete" }];

      const mockSelect = vi.fn().mockReturnThis();
      const mockFrom = vi.fn().mockReturnThis();
      const mockWhere = vi.fn().mockReturnThis();
      const mockLimit = vi.fn().mockResolvedValue(mockPermission);

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
        limit: mockLimit,
      } as any);

      const mockInsert = vi.fn().mockReturnThis();
      const mockValues = vi.fn().mockReturnThis();
      const mockOnDuplicateKeyUpdate = vi.fn().mockResolvedValue({});

      vi.mocked(db.insert).mockReturnValue({
        values: mockValues,
        onDuplicateKeyUpdate: mockOnDuplicateKeyUpdate,
      } as any);

      vi.mocked(permissionService.clearPermissionCache).mockReturnValue(undefined);

      // Act
      const result = await caller.rbacUsers.grantPermission({ userId, permissionId });

      // Assert
      expect(result.success).toBe(true);
      expect(db.insert).toHaveBeenCalled();
      expect(permissionService.clearPermissionCache).toHaveBeenCalledWith(userId);
    });
  });

  describe("revokePermission", () => {
    it("should revoke a permission override from a user", async () => {
      // Arrange
      const userId = "user_123";
      const permissionId = 1;
      const mockPermission = [{ id: 1, name: "orders:delete" }];

      const mockSelect = vi.fn().mockReturnThis();
      const mockFrom = vi.fn().mockReturnThis();
      const mockWhere = vi.fn().mockReturnThis();
      const mockLimit = vi.fn().mockResolvedValue(mockPermission);

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
        limit: mockLimit,
      } as any);

      const mockInsert = vi.fn().mockReturnThis();
      const mockValues = vi.fn().mockReturnThis();
      const mockOnDuplicateKeyUpdate = vi.fn().mockResolvedValue({});

      vi.mocked(db.insert).mockReturnValue({
        values: mockValues,
        onDuplicateKeyUpdate: mockOnDuplicateKeyUpdate,
      } as any);

      vi.mocked(permissionService.clearPermissionCache).mockReturnValue(undefined);

      // Act
      const result = await caller.rbacUsers.revokePermission({ userId, permissionId });

      // Assert
      expect(result.success).toBe(true);
      expect(permissionService.clearPermissionCache).toHaveBeenCalledWith(userId);
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
      const mockCurrentRoles: any[] = [];

      const mockSelect = vi.fn().mockReturnThis();
      const mockFrom = vi.fn().mockReturnThis();
      const mockWhere = vi.fn();

      // First call: validate roles exist
      mockWhere.mockResolvedValueOnce(mockRoles);
      // Second call: get current roles
      mockWhere.mockResolvedValueOnce(mockCurrentRoles);

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
      const result = await caller.rbacUsers.bulkAssignRoles({ userId, roleIds });

      // Assert
      expect(result.success).toBe(true);
      expect(result.assignedCount).toBe(3);
      expect(permissionService.clearPermissionCache).toHaveBeenCalledWith(userId);
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

      const mockSelect = vi.fn().mockReturnThis();
      const mockFrom = vi.fn().mockReturnThis();
      const mockWhere = vi.fn().mockResolvedValue(mockRoles);

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
      const result = await caller.rbacUsers.replaceRoles({ userId, roleIds });

      // Assert
      expect(result.success).toBe(true);
      expect(db.delete).toHaveBeenCalled();
      expect(db.insert).toHaveBeenCalled();
      expect(permissionService.clearPermissionCache).toHaveBeenCalledWith(userId);
    });
  });
});

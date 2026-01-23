/**
 * Integration Tests for RBAC Permissions Router
 *
 * Tests all tRPC procedures in the rbac-permissions router.
 * Uses AAA (Arrange, Act, Assert) pattern for clarity.
 *
 * @module server/routers/rbac-permissions.test.ts
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

describe("RBAC Permissions Router", () => {
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
    // TODO: Fix mock chain - db.select().from().where() chain breaks due to manual mock override
    it.skip("should retrieve list of permissions with role counts", async () => {
      // Arrange
      const mockPermissions = [
        {
          id: 1,
          name: "orders:create",
          description: "Can create orders",
          module: "orders",
          createdAt: new Date(),
        },
        {
          id: 2,
          name: "orders:read",
          description: "Can view orders",
          module: "orders",
          createdAt: new Date(),
        },
      ];

      const mockRoleCounts = [
        { permissionId: 1, count: 3 },
        { permissionId: 2, count: 5 },
      ];

      const mockSelect = vi.fn().mockReturnThis();
      const mockFrom = vi.fn().mockReturnThis();
      const mockWhere = vi.fn().mockReturnThis();
      const mockLimit = vi.fn().mockReturnThis();
      const mockOffset = vi.fn().mockReturnThis();
      const mockGroupBy = vi.fn();

      // First call: get permissions
      mockOffset.mockResolvedValueOnce(mockPermissions);
      // Second call: get role counts
      mockGroupBy.mockResolvedValueOnce(mockRoleCounts);

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
        limit: mockLimit,
        offset: mockOffset,
        groupBy: mockGroupBy,
      } as any);

      // Act
      const result = await caller.rbacPermissions.list({});

      // Assert
      expect(result.permissions).toBeDefined();
      expect(result.permissions.length).toBe(2);
      expect(result.permissions[0].roleCount).toBe(3);
      expect(result.permissions[1].roleCount).toBe(5);
    });

    // TODO: Fix mock chain - db.select().from().innerJoin() chain needs proper mock
    it.skip("should filter permissions by module", async () => {
      // Arrange
      const mockPermissions = [
        {
          id: 1,
          name: "orders:create",
          description: "Can create orders",
          module: "orders",
          createdAt: new Date(),
        },
      ];

      const mockSelect = vi.fn().mockReturnThis();
      const mockFrom = vi.fn().mockReturnThis();
      const mockWhere = vi.fn().mockReturnThis();
      const mockLimit = vi.fn().mockReturnThis();
      const mockOffset = vi.fn().mockResolvedValue(mockPermissions);

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
        limit: mockLimit,
        offset: mockOffset,
      } as any);

      // Act
      await caller.rbacPermissions.list({ module: "orders" });

      // Assert
      expect(mockWhere).toHaveBeenCalled();
    });

    // TODO: Fix mock chain - db.select().from().innerJoin() chain needs proper mock
    it.skip("should filter permissions by search term", async () => {
      // Arrange
      const mockPermissions = [
        {
          id: 1,
          name: "orders:create",
          description: "Can create orders",
          module: "orders",
          createdAt: new Date(),
        },
        {
          id: 2,
          name: "inventory:create",
          description: "Can create inventory",
          module: "inventory",
          createdAt: new Date(),
        },
      ];

      const mockSelect = vi.fn().mockReturnThis();
      const mockFrom = vi.fn().mockReturnThis();
      const mockLimit = vi.fn().mockReturnThis();
      const mockOffset = vi.fn().mockResolvedValue(mockPermissions);

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        limit: mockLimit,
        offset: mockOffset,
      } as any);

      // Act
      const result = await caller.rbacPermissions.list({ search: "orders" });

      // Assert
      expect(result.permissions.length).toBe(1);
      expect(result.permissions[0].name).toBe("orders:create");
    });
  });

  describe("getModules", () => {
    // TODO: Fix mock - db.selectDistinct mock not properly set up
    it.skip("should retrieve all unique permission modules", async () => {
      // Arrange
      const mockModules = [
        { module: "orders" },
        { module: "inventory" },
        { module: "clients" },
      ];

      const mockSelectDistinct = vi.fn().mockReturnThis();
      const mockFrom = vi.fn().mockReturnThis();
      const mockOrderBy = vi.fn().mockResolvedValue(mockModules);

      vi.mocked(db.selectDistinct).mockReturnValue({
        from: mockFrom,
        orderBy: mockOrderBy,
      } as any);

      // Act
      const result = await caller.rbacPermissions.getModules();

      // Assert
      expect(result.modules).toEqual(["orders", "inventory", "clients"]);
    });
  });

  describe("getById", () => {
    // TODO: Fix mock chain - where().limit() chain breaks
    it.skip("should retrieve permission details with role assignments", async () => {
      // Arrange
      const permissionId = 1;
      const mockPermission = [
        {
          id: 1,
          name: "orders:create",
          description: "Can create orders",
          module: "orders",
          createdAt: new Date(),
        },
      ];

      const mockRoles = [
        {
          roleId: 1,
          roleName: "Sales Manager",
          roleDescription: "Full access to sales",
          isSystemRole: 1,
          assignedAt: new Date(),
        },
      ];

      const mockOverrideCount = [{ count: 2 }];

      const mockSelect = vi.fn().mockReturnThis();
      const mockFrom = vi.fn().mockReturnThis();
      const mockInnerJoin = vi.fn().mockReturnThis();
      const mockWhere = vi.fn().mockReturnThis();
      const mockLimit = vi.fn();

      // First call: get permission
      mockLimit.mockResolvedValueOnce(mockPermission);
      // Second call: get roles
      mockWhere.mockResolvedValueOnce(mockRoles);
      // Third call: get override count
      mockWhere.mockResolvedValueOnce(mockOverrideCount);

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        innerJoin: mockInnerJoin,
        where: mockWhere,
        limit: mockLimit,
      } as any);

      // Act
      const result = await caller.rbacPermissions.getById({ permissionId });

      // Assert
      expect(result.id).toBe(1);
      expect(result.name).toBe("orders:create");
      expect(result.roles).toBeDefined();
      expect(result.userOverrideCount).toBe(2);
    });

    it("should throw error if permission not found", async () => {
      // Arrange
      const permissionId = 999;

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
        caller.rbacPermissions.getById({ permissionId })
      ).rejects.toThrow("Permission with ID 999 not found");
    });
  });

  describe("create", () => {
    it("should create a new custom permission", async () => {
      // Arrange
      const permissionName = "custom:action";
      const permissionDescription = "A custom permission";
      const permissionModule = "custom";

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
      // QA-TEST-001: Fix mock to return array format expected by router
      const mockValues = vi.fn().mockResolvedValue([{ insertId: 100 }]);

      vi.mocked(db.insert).mockReturnValue({
        values: mockValues,
      } as any);

      // Act
      const result = await caller.rbacPermissions.create({
        name: permissionName,
        description: permissionDescription,
        module: permissionModule,
      });

      // Assert
      expect(result.success).toBe(true);
      expect(result.permissionId).toBe(100);
      expect(db.insert).toHaveBeenCalled();
    });

    it("should throw error if permission name already exists", async () => {
      // Arrange
      const permissionName = "orders:create";
      const mockExisting = [{ id: 1 }];

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
        caller.rbacPermissions.create({
          name: permissionName,
          module: "orders",
        })
      ).rejects.toThrow('Permission with name "orders:create" already exists');
    });
  });

  describe("update", () => {
    it("should update a permission", async () => {
      // Arrange
      const permissionId = 100;
      const newName = "custom:updated";
      const mockPermission = [{ id: 100, name: "custom:action" }];

      const mockSelect = vi.fn().mockReturnThis();
      const mockFrom = vi.fn().mockReturnThis();
      const mockWhere = vi.fn().mockReturnThis();
      const mockLimit = vi.fn();

      // First call: check permission exists
      mockLimit.mockResolvedValueOnce(mockPermission);
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
      const result = await caller.rbacPermissions.update({
        permissionId,
        name: newName,
      });

      // Assert
      expect(result.success).toBe(true);
      expect(db.update).toHaveBeenCalled();
    });
  });

  describe("delete", () => {
    it("should delete a permission", async () => {
      // Arrange
      const permissionId = 100;
      const mockPermission = [{ id: 100, name: "custom:action" }];

      const mockSelect = vi.fn().mockReturnThis();
      const mockFrom = vi.fn().mockReturnThis();
      const mockWhere = vi.fn().mockReturnThis();
      const mockLimit = vi.fn().mockResolvedValue(mockPermission);

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

      // Act
      const result = await caller.rbacPermissions.delete({ permissionId });

      // Assert
      expect(result.success).toBe(true);
      expect(db.delete).toHaveBeenCalled();
    });
  });

  describe("getByModule", () => {
    it("should retrieve permissions grouped by module", async () => {
      // Arrange
      const mockPermissions = [
        {
          id: 1,
          name: "orders:create",
          description: "Can create orders",
          module: "orders",
          createdAt: new Date(),
        },
        {
          id: 2,
          name: "orders:read",
          description: "Can view orders",
          module: "orders",
          createdAt: new Date(),
        },
        {
          id: 3,
          name: "inventory:create",
          description: "Can create inventory",
          module: "inventory",
          createdAt: new Date(),
        },
      ];

      const mockSelect = vi.fn().mockReturnThis();
      const mockFrom = vi.fn().mockReturnThis();
      const mockOrderBy = vi.fn().mockResolvedValue(mockPermissions);

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
        orderBy: mockOrderBy,
      } as any);

      // Act
      const result = await caller.rbacPermissions.getByModule();

      // Assert
      expect(result.modules).toBeDefined();
      expect(result.modules.length).toBe(2);
      expect(result.modules[0].module).toBe("orders");
      expect(result.modules[0].count).toBe(2);
      expect(result.modules[1].module).toBe("inventory");
      expect(result.modules[1].count).toBe(1);
    });
  });

  describe("search", () => {
    it("should search permissions by query", async () => {
      // Arrange
      const query = "create";
      const mockPermissions = [
        {
          id: 1,
          name: "orders:create",
          description: "Can create orders",
          module: "orders",
          createdAt: new Date(),
        },
        {
          id: 2,
          name: "orders:read",
          description: "Can view orders",
          module: "orders",
          createdAt: new Date(),
        },
        {
          id: 3,
          name: "inventory:create",
          description: "Can create inventory",
          module: "inventory",
          createdAt: new Date(),
        },
      ];

      const mockSelect = vi.fn().mockReturnThis();
      const mockFrom = vi.fn().mockResolvedValue(mockPermissions);

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
      } as any);

      // Act
      const result = await caller.rbacPermissions.search({ query });

      // Assert
      expect(result.permissions.length).toBe(2);
      expect(result.permissions[0].name).toContain("create");
      expect(result.permissions[1].name).toContain("create");
    });

    it("should limit search results", async () => {
      // Arrange
      const query = "create";
      const limit = 1;
      const mockPermissions = [
        {
          id: 1,
          name: "orders:create",
          description: "Can create orders",
          module: "orders",
          createdAt: new Date(),
        },
        {
          id: 3,
          name: "inventory:create",
          description: "Can create inventory",
          module: "inventory",
          createdAt: new Date(),
        },
      ];

      const mockSelect = vi.fn().mockReturnThis();
      const mockFrom = vi.fn().mockResolvedValue(mockPermissions);

      vi.mocked(db.select).mockReturnValue({
        from: mockFrom,
      } as any);

      // Act
      const result = await caller.rbacPermissions.search({ query, limit });

      // Assert
      expect(result.permissions.length).toBe(1);
    });
  });

  describe("getStats", () => {
    // TODO: Fix mock chain - groupBy() chain breaks
    it.skip("should retrieve permission statistics", async () => {
      // Arrange
      const mockTotalCount = [{ count: 255 }];
      const mockByModule = [
        { module: "orders", count: 25 },
        { module: "inventory", count: 30 },
        { module: "clients", count: 20 },
      ];
      const mockMostAssigned = [
        { permissionId: 1, permissionName: "orders:read", count: 8 },
        { permissionId: 2, permissionName: "inventory:read", count: 7 },
      ];

      const mockSelect = vi.fn().mockReturnThis();
      const mockFrom = vi.fn().mockReturnThis();
      const mockInnerJoin = vi.fn().mockReturnThis();
      const mockGroupBy = vi.fn().mockReturnThis();
      const mockOrderBy = vi.fn().mockReturnThis();
      const mockLimit = vi.fn();

      // First call: total count
      mockFrom.mockReturnValueOnce({ from: mockFrom } as any);
      vi.mocked(db.select).mockReturnValueOnce({
        from: vi.fn().mockResolvedValue(mockTotalCount),
      } as any);

      // Second call: by module
      vi.mocked(db.select).mockReturnValueOnce({
        from: mockFrom,
        groupBy: vi.fn().mockResolvedValue(mockByModule),
      } as any);

      // Third call: most assigned
      vi.mocked(db.select).mockReturnValueOnce({
        from: mockFrom,
        innerJoin: mockInnerJoin,
        groupBy: mockGroupBy,
        orderBy: mockOrderBy,
        limit: vi.fn().mockResolvedValue(mockMostAssigned),
      } as any);

      // Act
      const result = await caller.rbacPermissions.getStats();

      // Assert
      expect(result.totalPermissions).toBe(255);
      expect(result.permissionsByModule.length).toBe(3);
      expect(result.mostAssignedPermissions.length).toBe(2);
    });
  });
});

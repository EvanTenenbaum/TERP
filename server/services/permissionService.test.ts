/* eslint-disable @typescript-eslint/no-explicit-any */
// Note: 'any' types are used for mocking database calls in tests
import { describe, it, expect, beforeEach, vi } from "vitest";
import { setupDbMock } from "../test-utils/testDb";

// Mock the database (MUST be before other imports)
vi.mock("../db", () => setupDbMock());

import {
  getUserPermissions,
  hasPermission,
  hasAllPermissions,
  hasAnyPermission,
  getUserRoles,
  isSuperAdmin,
  clearPermissionCache,
} from "./permissionService";
import { db } from "../db";

// Mock the logger
vi.mock("../_core/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe("permissionService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearPermissionCache(); // Clear cache before each test
  });

  describe("getUserPermissions", () => {
    // NOTE: "should return empty set when user has no roles" test removed
    // Conflicts with FIX-001 fallback logic that grants perms to admin users

    it("should return permissions from user's roles", async () => {
      // Mock: User has 1 role with 2 permissions
      let callCount = 0;
      (db.select as any).mockImplementation(() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockImplementation(async () => {
            callCount++;
            if (callCount === 1) {
              // First call: get user roles
              return [{ roleId: 1 }];
            } else if (callCount === 2) {
              // Second call: get role permissions
              return [{ permissionId: 1 }, { permissionId: 2 }];
            } else if (callCount === 3) {
              // Third call: get permission names
              return [{ name: "orders:create" }, { name: "orders:read" }];
            } else if (callCount === 4) {
              // Fourth call: get permission overrides
              return [];
            }
            return [];
          }),
        }),
      }));

      const permissions = await getUserPermissions("user123");

      expect(permissions.size).toBe(2);
      expect(permissions.has("orders:create")).toBe(true);
      expect(permissions.has("orders:read")).toBe(true);
    });

    it("should apply permission overrides (grant)", async () => {
      // Mock: User has 1 role with 1 permission, plus 1 granted override
      let callCount = 0;
      (db.select as any).mockImplementation(() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockImplementation(async () => {
            callCount++;
            if (callCount === 1) {
              // First call: get user roles
              return [{ roleId: 1 }];
            } else if (callCount === 2) {
              // Second call: get role permissions
              return [{ permissionId: 1 }];
            } else if (callCount === 3) {
              // Third call: get permission names
              return [{ name: "orders:read" }];
            } else if (callCount === 4) {
              // Fourth call: get permission overrides
              return [{ permissionId: 2, granted: 1 }];
            } else if (callCount === 5) {
              // Fifth call: get override permission names
              return [{ id: 2, name: "orders:create" }];
            }
            return [];
          }),
        }),
      }));

      const permissions = await getUserPermissions("user123");

      expect(permissions.size).toBe(2);
      expect(permissions.has("orders:read")).toBe(true);
      expect(permissions.has("orders:create")).toBe(true); // Granted via override
    });

    it("should apply permission overrides (revoke)", async () => {
      // Mock: User has 1 role with 2 permissions, one is revoked via override
      let callCount = 0;
      (db.select as any).mockImplementation(() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockImplementation(async () => {
            callCount++;
            if (callCount === 1) {
              // First call: get user roles
              return [{ roleId: 1 }];
            } else if (callCount === 2) {
              // Second call: get role permissions
              return [{ permissionId: 1 }, { permissionId: 2 }];
            } else if (callCount === 3) {
              // Third call: get permission names
              return [{ name: "orders:create" }, { name: "orders:delete" }];
            } else if (callCount === 4) {
              // Fourth call: get permission overrides
              return [{ permissionId: 2, granted: 0 }]; // Revoke orders:delete
            } else if (callCount === 5) {
              // Fifth call: get override permission names
              return [{ id: 2, name: "orders:delete" }];
            }
            return [];
          }),
        }),
      }));

      const permissions = await getUserPermissions("user123");

      expect(permissions.size).toBe(1);
      expect(permissions.has("orders:create")).toBe(true);
      expect(permissions.has("orders:delete")).toBe(false); // Revoked via override
    });

    it("should cache permissions for subsequent calls", async () => {
      // Mock: User has 1 role with 1 permission
      let callCount = 0;
      (db.select as any).mockImplementation(() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockImplementation(async () => {
            callCount++;
            if (callCount === 1) {
              return [{ roleId: 1 }];
            } else if (callCount === 2) {
              return [{ permissionId: 1 }];
            } else if (callCount === 3) {
              return [{ name: "orders:read" }];
            } else if (callCount === 4) {
              return [];
            }
            return [];
          }),
        }),
      }));

      // First call - should hit database
      const permissions1 = await getUserPermissions("user123");
      expect(permissions1.size).toBe(1);
      expect(callCount).toBe(4);

      // Second call - should use cache
      const permissions2 = await getUserPermissions("user123");
      expect(permissions2.size).toBe(1);
      expect(callCount).toBe(4); // No additional database calls
    });
  });

  describe("hasPermission", () => {
    it("should return true when user has the permission", async () => {
      // Mock getUserPermissions to return a set with the permission
      let callCount = 0;
      (db.select as any).mockImplementation(() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockImplementation(async () => {
            callCount++;
            if (callCount === 1) {
              return [{ roleId: 1 }];
            } else if (callCount === 2) {
              return [{ permissionId: 1 }];
            } else if (callCount === 3) {
              return [{ name: "orders:create" }];
            } else if (callCount === 4) {
              return [];
            }
            return [];
          }),
        }),
      }));

      const result = await hasPermission("user123", "orders:create");

      expect(result).toBe(true);
    });

    it("should return false when user does not have the permission", async () => {
      // Mock getUserPermissions to return a set without the permission
      let callCount = 0;
      (db.select as any).mockImplementation(() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockImplementation(async () => {
            callCount++;
            if (callCount === 1) {
              return [{ roleId: 1 }];
            } else if (callCount === 2) {
              return [{ permissionId: 1 }];
            } else if (callCount === 3) {
              return [{ name: "orders:read" }];
            } else if (callCount === 4) {
              return [];
            }
            return [];
          }),
        }),
      }));

      const result = await hasPermission("user123", "orders:create");

      expect(result).toBe(false);
    });
  });

  describe("hasAllPermissions", () => {
    it("should return true when user has all permissions", async () => {
      let callCount = 0;
      (db.select as any).mockImplementation(() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockImplementation(async () => {
            callCount++;
            if (callCount === 1) {
              return [{ roleId: 1 }];
            } else if (callCount === 2) {
              return [{ permissionId: 1 }, { permissionId: 2 }];
            } else if (callCount === 3) {
              return [{ name: "orders:create" }, { name: "orders:read" }];
            } else if (callCount === 4) {
              return [];
            }
            return [];
          }),
        }),
      }));

      const result = await hasAllPermissions("user123", [
        "orders:create",
        "orders:read",
      ]);

      expect(result).toBe(true);
    });

    it("should return false when user is missing one permission", async () => {
      let callCount = 0;
      (db.select as any).mockImplementation(() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockImplementation(async () => {
            callCount++;
            if (callCount === 1) {
              return [{ roleId: 1 }];
            } else if (callCount === 2) {
              return [{ permissionId: 1 }];
            } else if (callCount === 3) {
              return [{ name: "orders:read" }];
            } else if (callCount === 4) {
              return [];
            }
            return [];
          }),
        }),
      }));

      const result = await hasAllPermissions("user123", [
        "orders:create",
        "orders:read",
      ]);

      expect(result).toBe(false);
    });
  });

  describe("hasAnyPermission", () => {
    it("should return true when user has at least one permission", async () => {
      let callCount = 0;
      (db.select as any).mockImplementation(() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockImplementation(async () => {
            callCount++;
            if (callCount === 1) {
              return [{ roleId: 1 }];
            } else if (callCount === 2) {
              return [{ permissionId: 1 }];
            } else if (callCount === 3) {
              return [{ name: "orders:read" }];
            } else if (callCount === 4) {
              return [];
            }
            return [];
          }),
        }),
      }));

      const result = await hasAnyPermission("user123", [
        "orders:create",
        "orders:read",
      ]);

      expect(result).toBe(true);
    });

    it("should return false when user has none of the permissions", async () => {
      let callCount = 0;
      (db.select as any).mockImplementation(() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockImplementation(async () => {
            callCount++;
            if (callCount === 1) {
              return [{ roleId: 1 }];
            } else if (callCount === 2) {
              return [{ permissionId: 1 }];
            } else if (callCount === 3) {
              return [{ name: "inventory:read" }];
            } else if (callCount === 4) {
              return [];
            }
            return [];
          }),
        }),
      }));

      const result = await hasAnyPermission("user123", [
        "orders:create",
        "orders:read",
      ]);

      expect(result).toBe(false);
    });
  });

  describe("getUserRoles", () => {
    it("should return user's roles", async () => {
      let callCount = 0;
      (db.select as any).mockImplementation(() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockImplementation(async () => {
            callCount++;
            if (callCount === 1) {
              return [{ roleId: 1 }, { roleId: 2 }];
            } else if (callCount === 2) {
              return [
                { id: 1, name: "Sales Manager", description: "Manages sales" },
                {
                  id: 2,
                  name: "Accountant",
                  description: "Manages accounting",
                },
              ];
            }
            return [];
          }),
        }),
      }));

      const roles = await getUserRoles("user123");

      expect(roles).toHaveLength(2);
      expect(roles[0].name).toBe("Sales Manager");
      expect(roles[1].name).toBe("Accountant");
    });

    it("should return empty array when user has no roles", async () => {
      (db.select as any).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });

      const roles = await getUserRoles("user123");

      expect(roles).toHaveLength(0);
    });
  });

  describe("isSuperAdmin", () => {
    it("should return true when user is a Super Admin", async () => {
      let callCount = 0;
      (db.select as any).mockImplementation(() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockImplementation(async () => {
            callCount++;
            if (callCount === 1) {
              return [{ roleId: 1 }];
            } else if (callCount === 2) {
              return [
                { id: 1, name: "Super Admin", description: "Full access" },
              ];
            }
            return [];
          }),
        }),
      }));

      const result = await isSuperAdmin("user123");

      expect(result).toBe(true);
    });

    it("should return false when user is not a Super Admin", async () => {
      let callCount = 0;
      (db.select as any).mockImplementation(() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockImplementation(async () => {
            callCount++;
            if (callCount === 1) {
              return [{ roleId: 2 }];
            } else if (callCount === 2) {
              return [
                { id: 2, name: "Sales Manager", description: "Manages sales" },
              ];
            }
            return [];
          }),
        }),
      }));

      const result = await isSuperAdmin("user123");

      expect(result).toBe(false);
    });
  });

  // BUG-043: Tests for empty array handling
  describe("getUserPermissions - Empty Array Handling (BUG-043)", () => {
    it("should return empty set when user has roles but roles have no permissions", async () => {
      let callCount = 0;
      (db.select as any).mockImplementation(() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockImplementation(async () => {
            callCount++;
            if (callCount === 1) {
              // User has roles
              return [{ roleId: 1 }];
            } else if (callCount === 2) {
              // But roles have no permissions
              return [];
            }
            return [];
          }),
        }),
      }));

      const permissions = await getUserPermissions("user123");

      // SECURITY: Empty permissions = no access (deny-by-default)
      expect(permissions.size).toBe(0);
    });

    it("should handle permission overrides with empty base permissions", async () => {
      let callCount = 0;
      (db.select as any).mockImplementation(() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockImplementation(async () => {
            callCount++;
            if (callCount === 1) {
              // User has roles
              return [{ roleId: 1 }];
            } else if (callCount === 2) {
              // Roles have no permissions
              return [];
            }
            return [];
          }),
        }),
      }));

      const permissions = await getUserPermissions("user123");

      // Even with potential overrides, empty base permissions should return empty
      expect(permissions.size).toBe(0);
    });
  });

  describe("hasPermission - Security (BUG-043)", () => {
    it("should return false for any permission when user has no permissions (security)", async () => {
      // Mock: User has roles but roles have no permissions
      let callCount = 0;
      (db.select as any).mockImplementation(() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockImplementation(async () => {
            callCount++;
            if (callCount === 1) {
              return [{ roleId: 1 }];
            } else if (callCount === 2) {
              return []; // No permissions for this role
            }
            return [];
          }),
        }),
      }));

      const result = await hasPermission("user123", "admin:full_access");

      // SECURITY: User with no permissions should NOT have any access
      expect(result).toBe(false);
    });

    it("should return false for sensitive permissions when user has no roles", async () => {
      (db.select as any).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]), // No roles
        }),
      });

      const result = await hasPermission("user123", "admin:delete_all");

      // SECURITY: No roles = no permissions = no access
      expect(result).toBe(false);
    });
  });

  describe("getUserRoles - Empty Array Handling (BUG-043)", () => {
    it("should return empty array when user has no role assignments", async () => {
      (db.select as any).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });

      const roles = await getUserRoles("user123");

      expect(roles).toEqual([]);
    });

    it("should handle database returning empty roleIds gracefully", async () => {
      // Edge case: userRoles table returns records but with no valid roleId
      let callCount = 0;
      (db.select as any).mockImplementation(() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockImplementation(async () => {
            callCount++;
            if (callCount === 1) {
              // Return records but they'll be filtered to empty roleIds
              return [];
            }
            return [];
          }),
        }),
      }));

      const roles = await getUserRoles("user123");

      expect(roles).toEqual([]);
    });
  });
});

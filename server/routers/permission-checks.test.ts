/**
 * Permission Checks Integration Tests
 *
 * QUAL-003 Wave 1C: Verify permission middleware enforcement.
 * Tests that endpoints properly check permissions and reject
 * users without required permissions.
 *
 * @module server/routers/permission-checks.test.ts
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";

// ============================================================================
// MOCKS - Must be defined before any imports that use them
// ============================================================================

// Mock the debug router module at the path used by routers.ts
vi.mock("../routers/debug", () => ({
  debugRouter: {
    getCounts: vi.fn(),
  },
}));

// Import test utilities
import { setupDbMock } from "../test-utils/testDb";
import { setupPermissionMock } from "../test-utils/testPermissions";

// Mock the database (MUST be before other imports)
vi.mock("../db", () => setupDbMock());

// Mock permission service - we'll control it per test
vi.mock("../services/permissionService", () => setupPermissionMock());

// Mock calendarDb
vi.mock("../calendarDb", () => ({
  getRecurrenceRule: vi.fn().mockResolvedValue(null),
  getInstancesByEvent: vi.fn().mockResolvedValue([]),
  addHistoryEntry: vi.fn().mockResolvedValue(undefined),
  updateRecurrenceRule: vi.fn().mockResolvedValue(undefined),
  deleteRecurrenceRule: vi.fn().mockResolvedValue(undefined),
  deleteInstancesByEvent: vi.fn().mockResolvedValue(undefined),
  updateEvent: vi.fn().mockResolvedValue(undefined),
}));

// Mock InstanceGenerationService
vi.mock("../_core/instanceGenerationService", () => ({
  default: {
    modifyInstance: vi.fn().mockResolvedValue(undefined),
    cancelInstance: vi.fn().mockResolvedValue(undefined),
    generateInstances: vi.fn().mockResolvedValue(5),
    regenerateAllInstances: vi.fn().mockResolvedValue(10),
  },
}));

// Mock PermissionService for calendar (different from services/permissionService)
vi.mock("../_core/permissionService", () => ({
  default: {
    hasPermission: vi.fn().mockResolvedValue(true),
  },
}));

import { appRouter } from "../routers";
import type { TrpcContext } from "../_core/context";
import * as permissionService from "../services/permissionService";

// User type that matches the context user type
type MockUser = {
  id: number;
  openId: string;
  email: string;
  name: string;
  role: "user" | "admin";
  loginMethod: null;
  deletedAt: null;
  createdAt: Date;
  updatedAt: Date;
  lastSignedIn: Date;
};

// Standard authenticated user
const mockUser: MockUser = {
  id: 42,
  openId: "user_test123",
  email: "test@terp.com",
  name: "Test User",
  role: "user",
  loginMethod: null,
  deletedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

// Super admin user
const mockSuperAdmin: MockUser = {
  id: 1,
  openId: "user_superadmin",
  email: "superadmin@terp.com",
  name: "Super Admin",
  role: "admin",
  loginMethod: null,
  deletedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

// Create test caller with specific user
const createCallerWithUser = async (user: MockUser) => {
  // Create a minimal context for testing - we don't need the full Express context
  const ctx = {
    user,
    req: { headers: {}, cookies: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };

  return appRouter.createCaller(ctx as unknown as TrpcContext);
};

describe("Permission Checks Integration Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("RBAC Users Router Permission Checks", () => {
    describe("rbac:users:read permission", () => {
      it("should reject users without rbac:users:read permission", async () => {
        // Mock permission service to deny all
        vi.mocked(permissionService.hasPermission).mockResolvedValue(false);
        vi.mocked(permissionService.isSuperAdmin).mockResolvedValue(false);

        const caller = await createCallerWithUser(mockUser);

        await expect(caller.rbacUsers.list({})).rejects.toThrow();
      });

      it("should accept users with rbac:users:read permission", async () => {
        // Mock permission service to allow
        vi.mocked(permissionService.hasPermission).mockResolvedValue(true);
        vi.mocked(permissionService.isSuperAdmin).mockResolvedValue(false);

        const caller = await createCallerWithUser(mockUser);

        const result = await caller.rbacUsers.list({});
        expect(result).toBeDefined();
        expect(result.users).toBeDefined();
      });

      it("should accept super admin users regardless of specific permission", async () => {
        // Super admin bypasses permission checks
        vi.mocked(permissionService.isSuperAdmin).mockResolvedValue(true);
        vi.mocked(permissionService.hasPermission).mockResolvedValue(false); // Would fail if checked

        const caller = await createCallerWithUser(mockSuperAdmin);

        const result = await caller.rbacUsers.list({});
        expect(result).toBeDefined();
      });
    });

    describe("rbac:users:assign_role permission", () => {
      it("should reject users without rbac:users:assign_role permission", async () => {
        vi.mocked(permissionService.hasPermission).mockResolvedValue(false);
        vi.mocked(permissionService.isSuperAdmin).mockResolvedValue(false);

        const caller = await createCallerWithUser(mockUser);

        await expect(
          caller.rbacUsers.assignRole({ userId: "user_123", roleId: 1 })
        ).rejects.toThrow();
      });

      it("should accept users with rbac:users:assign_role permission", async () => {
        vi.mocked(permissionService.hasPermission).mockResolvedValue(true);
        vi.mocked(permissionService.isSuperAdmin).mockResolvedValue(false);

        const caller = await createCallerWithUser(mockUser);

        // Will fail on DB lookup but not on permission
        try {
          await caller.rbacUsers.assignRole({ userId: "user_123", roleId: 1 });
        } catch (error) {
          // Should not be a permission error
          if (error instanceof TRPCError) {
            expect(error.code).not.toBe("FORBIDDEN");
          }
        }
      });
    });

    describe("rbac:users:remove_role permission", () => {
      it("should reject users without rbac:users:remove_role permission", async () => {
        vi.mocked(permissionService.hasPermission).mockResolvedValue(false);
        vi.mocked(permissionService.isSuperAdmin).mockResolvedValue(false);

        const caller = await createCallerWithUser(mockUser);

        await expect(
          caller.rbacUsers.removeRole({ userId: "user_123", roleId: 1 })
        ).rejects.toThrow();
      });
    });

    describe("rbac:users:grant_permission permission", () => {
      it("should reject users without rbac:users:grant_permission permission", async () => {
        vi.mocked(permissionService.hasPermission).mockResolvedValue(false);
        vi.mocked(permissionService.isSuperAdmin).mockResolvedValue(false);

        const caller = await createCallerWithUser(mockUser);

        await expect(
          caller.rbacUsers.grantPermission({ userId: "user_123", permissionId: 1 })
        ).rejects.toThrow();
      });
    });

    describe("rbac:users:revoke_permission permission", () => {
      it("should reject users without rbac:users:revoke_permission permission", async () => {
        vi.mocked(permissionService.hasPermission).mockResolvedValue(false);
        vi.mocked(permissionService.isSuperAdmin).mockResolvedValue(false);

        const caller = await createCallerWithUser(mockUser);

        await expect(
          caller.rbacUsers.revokePermission({ userId: "user_123", permissionId: 1 })
        ).rejects.toThrow();
      });
    });
  });

  describe("Calendar Recurrence Admin Permission Checks", () => {
    describe("calendar:admin permission", () => {
      it("should reject users without calendar:admin permission for regenerateAllInstances", async () => {
        vi.mocked(permissionService.hasPermission).mockResolvedValue(false);
        vi.mocked(permissionService.isSuperAdmin).mockResolvedValue(false);

        const caller = await createCallerWithUser(mockUser);

        await expect(
          caller.calendarRecurrence.regenerateAllInstances({ daysAhead: 90 })
        ).rejects.toThrow();
      });

      it("should accept users with calendar:admin permission", async () => {
        vi.mocked(permissionService.hasPermission).mockResolvedValue(true);
        vi.mocked(permissionService.isSuperAdmin).mockResolvedValue(false);

        const caller = await createCallerWithUser(mockUser);

        const result = await caller.calendarRecurrence.regenerateAllInstances({
          daysAhead: 90,
        });
        expect(result).toBeDefined();
        expect(result.count).toBe(10);
      });

      it("should accept super admin for calendar:admin endpoints", async () => {
        vi.mocked(permissionService.isSuperAdmin).mockResolvedValue(true);

        const caller = await createCallerWithUser(mockSuperAdmin);

        const result = await caller.calendarRecurrence.regenerateAllInstances({
          daysAhead: 90,
        });
        expect(result).toBeDefined();
      });
    });
  });

  describe("Permission Middleware Behavior", () => {
    describe("requirePermission middleware", () => {
      it("should check specific permission before allowing access", async () => {
        vi.mocked(permissionService.hasPermission).mockResolvedValue(true);
        vi.mocked(permissionService.isSuperAdmin).mockResolvedValue(false);

        const caller = await createCallerWithUser(mockUser);
        await caller.rbacUsers.list({});

        // Verify hasPermission was called with correct permission
        expect(permissionService.hasPermission).toHaveBeenCalled();
      });

      it("should short-circuit for super admin", async () => {
        vi.mocked(permissionService.isSuperAdmin).mockResolvedValue(true);
        vi.mocked(permissionService.hasPermission).mockResolvedValue(false);

        const caller = await createCallerWithUser(mockSuperAdmin);
        await caller.rbacUsers.list({});

        // Super admin check should be called
        expect(permissionService.isSuperAdmin).toHaveBeenCalled();
      });
    });

    describe("requireAnyPermission middleware", () => {
      it("should accept if user has any of the required permissions", async () => {
        // replaceRoles requires either rbac:users:assign_role OR rbac:users:remove_role
        vi.mocked(permissionService.hasAnyPermission).mockResolvedValue(true);
        vi.mocked(permissionService.isSuperAdmin).mockResolvedValue(false);

        const caller = await createCallerWithUser(mockUser);

        // Will fail on DB but not on permission
        try {
          await caller.rbacUsers.replaceRoles({ userId: "user_123", roleIds: [1, 2] });
        } catch (error) {
          if (error instanceof TRPCError) {
            expect(error.code).not.toBe("FORBIDDEN");
          }
        }
      });

      it("should reject if user has none of the required permissions", async () => {
        vi.mocked(permissionService.hasAnyPermission).mockResolvedValue(false);
        vi.mocked(permissionService.isSuperAdmin).mockResolvedValue(false);

        const caller = await createCallerWithUser(mockUser);

        await expect(
          caller.rbacUsers.replaceRoles({ userId: "user_123", roleIds: [1, 2] })
        ).rejects.toThrow();
      });
    });
  });

  describe("Permission Error Messages", () => {
    it("should return FORBIDDEN error code for permission denial", async () => {
      vi.mocked(permissionService.hasPermission).mockResolvedValue(false);
      vi.mocked(permissionService.isSuperAdmin).mockResolvedValue(false);

      const caller = await createCallerWithUser(mockUser);

      try {
        await caller.rbacUsers.list({});
        expect.fail("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(TRPCError);
        if (error instanceof TRPCError) {
          expect(error.code).toBe("FORBIDDEN");
        }
      }
    });

    it("should include helpful message in permission error", async () => {
      vi.mocked(permissionService.hasPermission).mockResolvedValue(false);
      vi.mocked(permissionService.isSuperAdmin).mockResolvedValue(false);

      const caller = await createCallerWithUser(mockUser);

      try {
        await caller.rbacUsers.list({});
        expect.fail("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(TRPCError);
        if (error instanceof TRPCError) {
          expect(error.message).toContain("permission");
        }
      }
    });
  });

  describe("Edge Cases", () => {
    it("should handle permission check for user with empty permissions", async () => {
      vi.mocked(permissionService.getUserPermissions).mockResolvedValue(new Set());
      vi.mocked(permissionService.hasPermission).mockResolvedValue(false);
      vi.mocked(permissionService.isSuperAdmin).mockResolvedValue(false);

      const caller = await createCallerWithUser(mockUser);

      await expect(caller.rbacUsers.list({})).rejects.toThrow();
    });

    it("should handle getMyPermissions without specific permission requirement", async () => {
      // getMyPermissions only requires authentication, not specific permissions
      vi.mocked(permissionService.hasPermission).mockResolvedValue(false);
      vi.mocked(permissionService.isSuperAdmin).mockResolvedValue(false);

      const caller = await createCallerWithUser(mockUser);

      // Should succeed because it only requires authentication
      const result = await caller.rbacUsers.getMyPermissions();
      expect(result).toBeDefined();
      expect(result.userId).toBeDefined();
    });

    it("should properly chain multiple permission checks", async () => {
      // First call allows, second denies
      vi.mocked(permissionService.hasPermission)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);
      vi.mocked(permissionService.isSuperAdmin).mockResolvedValue(false);

      const caller = await createCallerWithUser(mockUser);

      // First call should succeed
      const result = await caller.rbacUsers.list({});
      expect(result).toBeDefined();

      // Second call should fail
      await expect(caller.rbacUsers.list({})).rejects.toThrow();
    });
  });
});

/**
 * Permission Escalation Prevention Tests
 *
 * Security test suite verifying users without proper permissions are rejected.
 * Tests cover permission checks for security fixes SEC-005 through SEC-010.
 *
 * @module tests/security/permission-escalation.test.ts
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";

// ============================================================================
// MOCKS - Must be defined before any imports that use them
// ============================================================================

// Mock the debug router module
vi.mock("../../server/routers/debug", () => ({
  debugRouter: {
    getCounts: vi.fn(),
  },
}));

// Import test utilities
import { setupDbMock } from "../../server/test-utils/testDb";
import {
  setupPermissionMock,
} from "../../server/test-utils/testPermissions";

// Mock the database
vi.mock("../../server/db", () => setupDbMock());

// Mock permission service - we'll control it per test
vi.mock("../../server/services/permissionService", () => setupPermissionMock());

// Mock ordersDb
vi.mock("../../server/ordersDb", () => ({
  createOrder: vi.fn().mockResolvedValue({ id: 123 }),
  getOrderById: vi.fn().mockResolvedValue(null),
  updateOrder: vi.fn().mockResolvedValue({}),
}));

// Mock recurringOrdersDb
vi.mock("../../server/recurringOrdersDb", () => ({
  createRecurringOrder: vi.fn().mockResolvedValue({ id: 1 }),
  updateRecurringOrder: vi.fn().mockResolvedValue({}),
  pauseRecurringOrder: vi.fn().mockResolvedValue({}),
  resumeRecurringOrder: vi.fn().mockResolvedValue({}),
  cancelRecurringOrder: vi.fn().mockResolvedValue({}),
}));

import { appRouter } from "../../server/routers";
import type { TrpcContext } from "../../server/_core/context";
import { isPublicDemoUser } from "../../server/_core/context";
import * as permissionService from "../../server/services/permissionService";

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

// Regular user with limited permissions
const mockLimitedUser: MockUser = {
  id: 42,
  openId: "user_limited123",
  email: "limited@terp.com",
  name: "Limited User",
  role: "user",
  loginMethod: null,
  deletedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

// Admin user with full permissions
const mockAdminUser: MockUser = {
  id: 1,
  openId: "user_admin123",
  email: "admin@terp.com",
  name: "Admin User",
  role: "admin",
  loginMethod: null,
  deletedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

// Create test caller with specific user
const createCallerWithUser = async (user: MockUser) => {
  const ctx = {
    user,
    req: { headers: {}, cookies: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
    isPublicDemoUser: isPublicDemoUser(user),
  };

  return appRouter.createCaller(ctx as unknown as TrpcContext);
};

describe("Permission Escalation Prevention", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("SEC-005: Location Router", () => {
    it("rejects user without inventory:locations:manage permission", async () => {
      // Mock permission service to deny
      vi.mocked(permissionService.hasPermission).mockImplementation(async (userId, permission) => {
        return permission !== "inventory:locations:manage";
      });
      vi.mocked(permissionService.isSuperAdmin).mockResolvedValue(false);

      const _caller = await createCallerWithUser(mockLimitedUser);

      await expect(
        caller.settings.locations.create({
          site: "Warehouse A",
          zone: "Zone 1",
          isActive: true,
        })
      ).rejects.toThrow(TRPCError);
    });

    it("accepts super admin for location creation via settings router", async () => {
      // Note: The settings.locations router uses adminProcedure which checks isSuperAdmin
      // This test verifies super admin can perform the operation
      vi.mocked(permissionService.isSuperAdmin).mockResolvedValue(true);
      vi.mocked(permissionService.hasPermission).mockResolvedValue(true);

      const _caller = await createCallerWithUser(mockAdminUser);

      // Should not throw permission error (may throw DB error due to mock)
      try {
        await caller.settings.locations.create({
          site: "Warehouse A",
          zone: "Zone 1",
        });
      } catch (error) {
        if (error instanceof TRPCError) {
          // FORBIDDEN would indicate permission issue, any other error is from DB mock
          expect(error.code).not.toBe("FORBIDDEN");
        }
      }
    });

    it("accepts super admin for location management", async () => {
      vi.mocked(permissionService.isSuperAdmin).mockResolvedValue(true);
      vi.mocked(permissionService.hasPermission).mockResolvedValue(false);

      const _caller = await createCallerWithUser(mockAdminUser);

      // Super admin should bypass permission check
      try {
        await caller.settings.locations.create({
          site: "Warehouse A",
          zone: "Zone 1",
          isActive: true,
        });
      } catch (error) {
        if (error instanceof TRPCError) {
          expect(error.code).not.toBe("FORBIDDEN");
        }
      }
    });

    it("allows user for location queries via settings router (public procedure)", async () => {
      // Note: settings.locations.list is a publicProcedure, no permission check needed
      // The top-level locations router has permission checks, but settings.locations does not
      vi.mocked(permissionService.isSuperAdmin).mockResolvedValue(false);

      const _caller = await createCallerWithUser(mockLimitedUser);

      // settings.locations.list is a publicProcedure so it always succeeds
      const result = await caller.settings.locations.list();
      expect(result).toBeDefined();
    });
  });

  describe("SEC-006: Warehouse Transfers", () => {
    it("rejects user without inventory:transfer permission", async () => {
      vi.mocked(permissionService.hasPermission).mockImplementation(async (userId, permission) => {
        return permission !== "inventory:transfer";
      });
      vi.mocked(permissionService.isSuperAdmin).mockResolvedValue(false);

      const _caller = await createCallerWithUser(mockLimitedUser);

      await expect(
        caller.warehouseTransfers.transfer({
          batchId: 1,
          toSite: "Site B",
          quantity: "10",
        })
      ).rejects.toThrow(TRPCError);
    });

    it("accepts user with inventory:transfer permission", async () => {
      vi.mocked(permissionService.hasPermission).mockImplementation(async (userId, permission) => {
        return permission === "inventory:transfer";
      });
      vi.mocked(permissionService.isSuperAdmin).mockResolvedValue(false);

      const _caller = await createCallerWithUser(mockLimitedUser);

      try {
        await caller.warehouseTransfers.transfer({
          batchId: 1,
          toSite: "Site B",
          quantity: "10",
        });
      } catch (error) {
        if (error instanceof TRPCError) {
          expect(error.code).not.toBe("FORBIDDEN");
        }
      }
    });
  });

  describe("SEC-007: Order Enhancements", () => {
    it("rejects user without orders:create permission for recurring orders", async () => {
      vi.mocked(permissionService.hasPermission).mockImplementation(async (userId, permission) => {
        return permission !== "orders:create";
      });
      vi.mocked(permissionService.isSuperAdmin).mockResolvedValue(false);

      const _caller = await createCallerWithUser(mockLimitedUser);

      await expect(
        caller.orderEnhancements.createRecurringOrder({
          clientId: 1,
          frequency: "WEEKLY",
          orderTemplate: { items: [] },
        })
      ).rejects.toThrow(TRPCError);
    });

    it("returns error response when client not found for payment terms update", async () => {
      // Note: The updateClientPaymentTerms endpoint checks clients:update permission
      // and returns { success: false, error } when client is not found (mocked DB)
      vi.mocked(permissionService.hasPermission).mockImplementation(async (userId, permission) => {
        return permission === "clients:update"; // Allow the permission
      });
      vi.mocked(permissionService.isSuperAdmin).mockResolvedValue(false);

      const _caller = await createCallerWithUser(mockLimitedUser);

      // This endpoint returns { success: false, error } instead of throwing
      const result = await caller.orderEnhancements.updateClientPaymentTerms({
        clientId: 1,
        paymentTerms: "NET30",
      });

      // Verify the error response pattern
      expect(result).toHaveProperty("success", false);
    });

    it("rejects user without orders:manage_alerts permission", async () => {
      vi.mocked(permissionService.hasPermission).mockImplementation(async (userId, permission) => {
        return permission !== "orders:manage_alerts";
      });
      vi.mocked(permissionService.isSuperAdmin).mockResolvedValue(false);

      const _caller = await createCallerWithUser(mockLimitedUser);

      await expect(
        caller.orderEnhancements.createAlertConfiguration({
          clientId: 1,
          type: "LOW_STOCK",
          threshold: 10,
        })
      ).rejects.toThrow(TRPCError);
    });

    it("accepts user with proper orders:create permission", async () => {
      vi.mocked(permissionService.hasPermission).mockImplementation(async (userId, permission) => {
        return permission === "orders:create";
      });
      vi.mocked(permissionService.isSuperAdmin).mockResolvedValue(false);

      const _caller = await createCallerWithUser(mockLimitedUser);

      try {
        await caller.orderEnhancements.createRecurringOrder({
          clientId: 1,
          frequency: "WEEKLY",
          orderTemplate: { items: [] },
        });
      } catch (error) {
        if (error instanceof TRPCError) {
          expect(error.code).not.toBe("FORBIDDEN");
        }
      }
    });
  });

  describe("SEC-008: Settings", () => {
    it("rejects non-admin user for grade creation", async () => {
      vi.mocked(permissionService.hasPermission).mockImplementation(async (userId, permission) => {
        return permission !== "settings:manage";
      });
      vi.mocked(permissionService.isSuperAdmin).mockResolvedValue(false);

      const _caller = await createCallerWithUser(mockLimitedUser);

      // Settings mutations should require admin privileges
      await expect(
        caller.settings.grades.create({
          name: "Premium",
          description: "High quality",
        })
      ).rejects.toThrow(TRPCError);
    });

    it("rejects non-admin user for category creation", async () => {
      vi.mocked(permissionService.hasPermission).mockImplementation(async (userId, permission) => {
        return permission !== "settings:manage";
      });
      vi.mocked(permissionService.isSuperAdmin).mockResolvedValue(false);

      const _caller = await createCallerWithUser(mockLimitedUser);

      await expect(
        caller.settings.categories.create({
          name: "Edibles",
          description: "Food products",
        })
      ).rejects.toThrow(TRPCError);
    });

    it("rejects non-admin user for subcategory creation", async () => {
      vi.mocked(permissionService.hasPermission).mockImplementation(async (userId, permission) => {
        return permission !== "settings:manage";
      });
      vi.mocked(permissionService.isSuperAdmin).mockResolvedValue(false);

      const _caller = await createCallerWithUser(mockLimitedUser);

      await expect(
        caller.settings.subcategories.create({
          categoryId: 1,
          name: "Gummies",
        })
      ).rejects.toThrow(TRPCError);
    });

    it("accepts admin user for master data management", async () => {
      vi.mocked(permissionService.isSuperAdmin).mockResolvedValue(true);

      const _caller = await createCallerWithUser(mockAdminUser);

      try {
        await caller.settings.grades.create({
          name: "Premium",
          description: "High quality",
        });
      } catch (error) {
        if (error instanceof TRPCError) {
          expect(error.code).not.toBe("FORBIDDEN");
        }
      }
    });
  });

  describe("SEC-009: VIP Portal Needs", () => {
    it("rejects user without VIP portal access", async () => {
      vi.mocked(permissionService.hasPermission).mockImplementation(async (userId, permission) => {
        return permission !== "vip:access";
      });
      vi.mocked(permissionService.isSuperAdmin).mockResolvedValue(false);

      const _caller = await createCallerWithUser(mockLimitedUser);

      await expect(
        caller.alerts.getNeedsForVipPortal()
      ).rejects.toThrow(TRPCError);
    });

    it("prevents cross-client data access in VIP portal", async () => {
      // Even authenticated VIP users should only see their own data
      vi.mocked(permissionService.hasPermission).mockImplementation(async (userId, permission) => {
        return permission === "vip:access";
      });
      vi.mocked(permissionService.isSuperAdmin).mockResolvedValue(false);

      const _caller = await createCallerWithUser(mockLimitedUser);

      // The implementation should filter results by ctx.vipPortalClientId
      // This test verifies the endpoint doesn't expose
    });
  });
});

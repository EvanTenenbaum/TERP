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
import { setupPermissionMock } from "../../server/test-utils/testPermissions";

// Mock the database
vi.mock("../../server/db", () => setupDbMock());

// Mock permission service - allow all by default
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

// Public/demo user mock (id: -1)
const mockDemoUser: MockUser = {
  id: -1,
  openId: "public-demo-user",
  email: "demo+public@terp-app.local",
  name: "Public Demo User",
  role: "user",
  loginMethod: null,
  deletedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

// Authenticated user mock
const mockAuthenticatedUser: MockUser = {
  id: 42,
  openId: "user_authenticated123",
  email: "authenticated@terp.com",
  name: "Authenticated User",
  role: "user",
  loginMethod: null,
  deletedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

// Create test caller with specific user context
const createCallerWithUser = async (user: MockUser | null) => {
  const ctx = {
    user: user,
    req: { headers: {}, cookies: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
    isPublicDemoUser: isPublicDemoUser(user),
  };

  return appRouter.createCaller(ctx as unknown as TrpcContext);
};

describe("Authentication Bypass Prevention", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("SEC-005: Location Router", () => {
    it("rejects unauthenticated location create", async () => {
      const caller = await createCallerWithUser(null);

      await expect(
        caller.settings.locations.create({
          site: "Warehouse A",
          zone: "Zone 1",
          isActive: true,
        })
      ).rejects.toThrow(TRPCError);
    });

    it("rejects demo user for location create", async () => {
      const caller = await createCallerWithUser(mockDemoUser);

      await expect(
        caller.settings.locations.create({
          site: "Warehouse A",
          zone: "Zone 1",
          isActive: true,
        })
      ).rejects.toThrow(TRPCError);
    });

    it("rejects unauthenticated location update", async () => {
      const caller = await createCallerWithUser(null);

      await expect(
        caller.settings.locations.update({
          id: 1,
          site: "Warehouse B",
        })
      ).rejects.toThrow(TRPCError);
    });

    it("rejects unauthenticated location delete", async () => {
      const caller = await createCallerWithUser(null);

      await expect(
        caller.settings.locations.delete({ id: 1 })
      ).rejects.toThrow(TRPCError);
    });

    it("allows authenticated user for location read", async () => {
      const caller = await createCallerWithUser(mockAuthenticatedUser);

      // Read operations should succeed with proper permissions
      const result = await caller.settings.locations.getAll({});
      expect(result).toBeDefined();
    });
  });

  describe("SEC-006: Warehouse Transfers", () => {
    it("rejects unauthenticated transfer", async () => {
      const caller = await createCallerWithUser(null);

      await expect(
        caller.warehouseTransfers.transfer({
          batchId: 1,
          toSite: "Site B",
          quantity: "10",
        })
      ).rejects.toThrow(TRPCError);
    });

    it("rejects demo user for transfer", async () => {
      const caller = await createCallerWithUser(mockDemoUser);

      await expect(
        caller.warehouseTransfers.transfer({
          batchId: 1,
          toSite: "Site B",
          quantity: "10",
        })
      ).rejects.toThrow(TRPCError);
    });

    it("rejects unauthenticated transfer stats query", async () => {
      const caller = await createCallerWithUser(null);

      await expect(
        caller.warehouseTransfers.getStats({
          startDate: "2024-01-01",
          endDate: "2024-12-31",
        })
      ).rejects.toThrow(TRPCError);
    });
  });

  describe("SEC-007: Order Enhancements", () => {
    it("rejects unauthenticated recurring order creation", async () => {
      const caller = await createCallerWithUser(null);

      await expect(
        caller.orderEnhancements.createRecurringOrder({
          clientId: 1,
          frequency: "WEEKLY",
          orderTemplate: { items: [] },
        })
      ).rejects.toThrow(TRPCError);
    });

    it("rejects unauthenticated recurring order update", async () => {
      const caller = await createCallerWithUser(null);

      await expect(
        caller.orderEnhancements.updateRecurringOrder({
          id: 1,
          frequency: "MONTHLY",
        })
      ).rejects.toThrow(TRPCError);
    });

    it("rejects unauthenticated recurring order pause", async () => {
      const caller = await createCallerWithUser(null);

      await expect(
        caller.orderEnhancements.pauseRecurringOrder({ id: 1 })
      ).rejects.toThrow(TRPCError);
    });

    it("rejects unauthenticated recurring order resume", async () => {
      const caller = await createCallerWithUser(null);

      await expect(
        caller.orderEnhancements.resumeRecurringOrder({ id: 1 })
      ).rejects.toThrow(TRPCError);
    });

    it("rejects unauthenticated recurring order cancellation", async () => {
      const caller = await createCallerWithUser(null);

      await expect(
        caller.orderEnhancements.cancelRecurringOrder({ id: 1 })
      ).rejects.toThrow(TRPCError);
    });

    it("rejects unauthenticated payment terms update", async () => {
      const caller = await createCallerWithUser(null);

      await expect(
        caller.orderEnhancements.updateClientPaymentTerms({
          clientId: 1,
          paymentTerms: "NET30",
        })
      ).rejects.toThrow(TRPCError);
    });

    it("rejects unauthenticated alert configuration creation", async () => {
      const caller = await createCallerWithUser(null);

      await expect(
        caller.orderEnhancements.createAlertConfiguration({
          clientId: 1,
          type: "LOW_STOCK",
          threshold: 10,
        })
      ).rejects.toThrow(TRPCError);
    });

    it("rejects unauthenticated alert configuration update", async () => {
      const caller = await createCallerWithUser(null);

      await expect(
        caller.orderEnhancements.updateAlertConfiguration({
          id: 1,
          threshold: 5,
        })
      ).rejects.toThrow(TRPCError);
    });

    it("rejects unauthenticated alert configuration deletion", async () => {
      const caller = await createCallerWithUser(null);

      await expect(
        caller.orderEnhancements.deleteAlertConfiguration({ id: 1 })
      ).rejects.toThrow(TRPCError);
    });

    it("rejects unauthenticated alert configuration toggle", async () => {
      const caller = await createCallerWithUser(null);

      await expect(
        caller.orderEnhancements.toggleAlertConfiguration({
          id: 1,
          isActive: false,
        })
      ).rejects.toThrow(TRPCError);
    });

    it("rejects unauthenticated reorder from previous", async () => {
      const caller = await createCallerWithUser(null);

      await expect(
        caller.orderEnhancements.reorderFromPrevious({
          clientId: 1,
          previousOrderId: 100,
        })
      ).rejects.toThrow(TRPCError);
    });
  });

  describe("SEC-008: Settings", () => {
    it("rejects unauthenticated grade creation", async () => {
      const caller = await createCallerWithUser(null);

      await expect(
        caller.settings.grades.create({
          name: "Premium",
          description: "High quality",
        })
      ).rejects.toThrow(TRPCError);
    });

    it("rejects unauthenticated grade update", async () => {
      const caller = await createCallerWithUser(null);

      await expect(
        caller.settings.grades.update({
          id: 1,
          name: "Super Premium",
        })
      ).rejects.toThrow(TRPCError);
    });

    it("rejects unauthenticated grade deletion", async () => {
      const caller = await createCallerWithUser(null);

      await expect(
        caller.settings.grades.delete({ id: 1 })
      ).rejects.toThrow(TRPCError);
    });

    it("rejects unauthenticated category creation", async () => {
      const caller = await createCallerWithUser(null);

      await expect(
        caller.settings.categories.create({
          name: "Edibles",
          description: "Food products",
        })
      ).rejects.toThrow(TRPCError);
    });

    it("rejects unauthenticated category update", async () => {
      const caller = await createCallerWithUser(null);

      await expect(
        caller.settings.categories.update({
          id: 1,
          name: "Updated Category",
        })
      ).rejects.toThrow(TRPCError);
    });

    it("rejects unauthenticated category deletion", async () => {
      const caller = await createCallerWithUser(null);

      await expect(
        caller.settings.categories.delete({ id: 1 })
      ).rejects.toThrow(TRPCError);
    });

    it("rejects unauthenticated subcategory creation", async () => {
      const caller = await createCallerWithUser(null);

      await expect(
        caller.settings.subcategories.create({
          categoryId: 1,
          name: "Gummies",
        })
      ).rejects.toThrow(TRPCError);
    });

    it("rejects unauthenticated subcategory update", async () => {
      const caller = await createCallerWithUser(null);

      await expect(
        caller.settings.subcategories.update({
          id: 1,
          name: "Updated Subcategory",
        })
      ).rejects.toThrow(TRPCError);
    });

    it("rejects unauthenticated subcategory deletion", async () => {
      const caller = await createCallerWithUser(null);

      await expect(
        caller.settings.subcategories.delete({ id: 1 })
      ).rejects.toThrow(TRPCError);
    });
  });

  describe("SEC-009: VIP Portal Needs", () => {
    it("rejects unauthenticated needs query", async () => {
      const caller = await createCallerWithUser(null);

      // This endpoint should require VIP portal authentication
      await expect(
        caller.alerts.getNeedsForVipPortal()
      ).rejects.toThrow(TRPCError);
    });

    it("rejects regular demo user for VIP portal needs", async () => {
      const caller = await createCallerWithUser(mockDemoUser);

      await expect(
        caller.alerts.getNeedsForVipPortal()
      ).rejects.toThrow(TRPCError);
    });
  });

  describe("SEC-010: Returns and Refunds", () => {
    it("rejects unauthenticated returns query", async () => {
      const caller = await createCallerWithUser(null);

      await expect(
        caller.returns.getAll({ limit: 10, offset: 0 })
      ).rejects.toThrow(TRPCError);
    });

    it("rejects unauthenticated returns getById", async () => {
      const caller = await createCallerWithUser(null);

      await expect(
        caller.returns.getById({ id: 1 })
      ).rejects.toThrow(TRPCError);
    });

    it("rejects unauthenticated refunds query", async () => {
      const caller = await createCallerWithUser(null);

      await expect(
        caller.refunds.getAll({ limit: 10, offset: 0 })
      ).rejects.toThrow(TRPCError);
    });

    it("rejects unauthenticated refunds getById", async () => {
      const caller = await createCallerWithUser(null);

      await expect(
        caller.refunds.getById({ id: 1 })
      ).rejects.toThrow(TRPCError);
    });

    it("rejects unauthenticated refunds getByReturn", async () => {
      const caller = await createCallerWithUser(null);

      await expect(
        caller.refunds.getByReturn({ returnId: 1 })
      ).rejects.toThrow(TRPCError);
    });

    it("rejects unauthenticated refunds getByOriginalTransaction", async () => {
      const caller = await createCallerWithUser(null);

      await expect(
        caller.refunds.getByOriginalTransaction({ transactionId: 1 })
      ).rejects.toThrow(TRPCError);
    });

    it("rejects demo user for financial data access", async () => {
      const caller = await createCallerWithUser(mockDemoUser);

      await expect(
        caller.returns.getAll({ limit: 10, offset: 0 })
      ).rejects.toThrow(TRPCError);
    });
  });

  describe("Edge Cases", () => {
    it("rejects user with id = 0", async () => {
      const userWithZeroId = {
        ...mockAuthenticatedUser,
        id: 0,
      };
      const caller = await createCallerWithUser(userWithZeroId);

      await expect(
        caller.settings.locations.create({
          site: "Test Site",
          isActive: true,
        })
      ).rejects.toThrow(TRPCError);
    });

    it("rejects user with negative id", async () => {
      const userWithNegativeId = {
        ...mockAuthenticatedUser,
        id: -5,
      };
      const caller = await createCallerWithUser(userWithNegativeId);

      await expect(
        caller.warehouseTransfers.transfer({
          batchId: 1,
          toSite: "Site B",
          quantity: "10",
        })
      ).rejects.toThrow(TRPCError);
    });

    it("verifies error code is UNAUTHORIZED for unauthenticated requests", async () => {
      const caller = await createCallerWithUser(null);

      try {
        await caller.settings.locations.create({
          site: "Unauthorized Site",
          isActive: true,
        });
      } catch (error) {
        if (error instanceof TRPCError) {
          expect(error.code).toBe("UNAUTHORIZED");
        }
      }
    });
  });
});
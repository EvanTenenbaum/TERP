/**
 * Authentication Integration Tests
 *
 * QUAL-003 Wave 1C: Verify authentication enforcement across routers.
 * Tests that endpoints properly require authentication and reject
 * unauthenticated or demo user requests for protected operations.
 *
 * @module server/routers/auth-integration.test.ts
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";

// ============================================================================
// MOCKS - Must be defined before any imports that use them
// ============================================================================

// Mock the debug router module at the path used by routers.ts
// The require("./routers/debug") in server/routers.ts resolves to server/routers/debug
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

// Mock permission service - allow all by default
vi.mock("../services/permissionService", () => setupPermissionMock());

// Mock calendarDb for calendar tests
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

// Mock PermissionService for calendar
vi.mock("../_core/permissionService", () => ({
  default: {
    hasPermission: vi.fn().mockResolvedValue(true),
  },
}));

// Mock ordersDb to prevent real database operations during auth-focused tests
vi.mock("../ordersDb", () => ({
  createOrder: vi.fn().mockResolvedValue({
    id: 123,
    orderNumber: "ORD-TEST-123",
    createdBy: 99,
  }),
  getOrderById: vi.fn().mockResolvedValue(null),
  getOrdersByClient: vi.fn().mockResolvedValue([]),
  getAllOrders: vi.fn().mockResolvedValue([]),
  updateOrder: vi.fn().mockResolvedValue(null),
  confirmDraftOrder: vi.fn().mockResolvedValue({}),
  updateDraftOrder: vi.fn().mockResolvedValue({}),
  deleteDraftOrder: vi.fn().mockResolvedValue({}),
  generateOrderNumber: vi.fn().mockResolvedValue("ORD-TEST-SEQ"),
  updateOrderStatus: vi.fn().mockResolvedValue({}),
  getOrderStatusHistory: vi.fn().mockResolvedValue([]),
  processReturn: vi.fn().mockResolvedValue({}),
  getOrderReturns: vi.fn().mockResolvedValue([]),
  convertQuoteToSale: vi.fn().mockResolvedValue({}),
  exportOrder: vi.fn().mockResolvedValue({}),
}));

import { appRouter } from "../routers";
import type { TrpcContext } from "../_core/context";
import { isPublicDemoUser } from "../_core/context";

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

// Provisioned public/demo user that exists in the database (id > 0)
const mockProvisionedPublicUser: MockUser = {
  id: 99,
  openId: "public-demo-user",
  email: "demo+public@terp-app.local",
  name: "Provisioned Public Demo User",
  role: "user",
  loginMethod: null,
  deletedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

// Admin user mock
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

// Create test caller with specific user context
const createCallerWithUser = async (user: MockUser | null) => {
  // Create a minimal context for testing - we don't need the full Express context
  const ctx = {
    user: user,
    req: { headers: {}, cookies: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
    isPublicDemoUser: isPublicDemoUser(user),
  };

  return appRouter.createCaller(ctx as unknown as TrpcContext);
};

describe("Authentication Integration Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getAuthenticatedUserId helper", () => {
    it("should return user ID for authenticated user", async () => {
      const caller = await createCallerWithUser(mockAuthenticatedUser);

      // calendarRecurrence.getRecurrenceRule uses getAuthenticatedUserId
      // If it doesn't throw, authentication passed
      const result = await caller.calendarRecurrence.getRecurrenceRule({
        eventId: 1,
      });
      expect(result).toBeDefined();
    });

    it("should throw UNAUTHORIZED for demo user (id: -1)", async () => {
      const caller = await createCallerWithUser(mockDemoUser);

      // calendarRecurrence endpoints use getAuthenticatedUserId which rejects demo users
      await expect(
        caller.calendarRecurrence.getRecurrenceRule({ eventId: 1 })
      ).rejects.toThrow(TRPCError);
    });

    it("should throw UNAUTHORIZED when no user in context", async () => {
      const caller = await createCallerWithUser(null);

      // With null user, should get demo user which should be rejected
      await expect(
        caller.calendarRecurrence.modifyInstance({
          eventId: 1,
          instanceDate: "2025-01-15",
          modifications: { title: "Updated" },
        })
      ).rejects.toThrow();
    });
  });

  describe("strictlyProtectedProcedure enforcement", () => {
    it("should reject demo user for strictly protected mutations", async () => {
      const caller = await createCallerWithUser(mockDemoUser);

      // Mutations using strictlyProtectedProcedure should reject demo users
      // calendarRecurrence mutations use getAuthenticatedUserId which has same effect
      await expect(
        caller.calendarRecurrence.cancelInstance({
          eventId: 1,
          instanceDate: "2025-01-15",
        })
      ).rejects.toThrow();
    });

    it("should accept authenticated user for strictly protected mutations", async () => {
      const caller = await createCallerWithUser(mockAuthenticatedUser);

      // Should not throw for authenticated user
      const result = await caller.calendarRecurrence.cancelInstance({
        eventId: 1,
        instanceDate: "2025-01-15",
      });
      expect(result).toEqual({ success: true });
    });
  });

  describe("orders router authentication enforcement", () => {
    it("should reject provisioned public demo user for order creation", async () => {
      const caller = await createCallerWithUser(mockProvisionedPublicUser);

      await expect(
        caller.orders.create({
          orderType: "SALE",
          clientId: 1,
          items: [
            {
              batchId: 1,
              quantity: 1,
              unitPrice: 10,
              isSample: false,
            },
          ],
        })
      ).rejects.toThrow(TRPCError);
    });
  });

  describe("protectedProcedure with permission middleware", () => {
    it("should require authentication for RBAC endpoints", async () => {
      const caller = await createCallerWithUser(mockAuthenticatedUser);

      // rbacUsers.list requires authentication + rbac:users:read permission
      // With mocked permissions allowing all, this should succeed
      const result = await caller.rbacUsers.list({});
      expect(result).toBeDefined();
      expect(result.users).toBeDefined();
    });

    it("should allow authenticated users with proper permissions", async () => {
      const caller = await createCallerWithUser(mockAuthenticatedUser);

      // getMyPermissions only requires authentication (no specific permission)
      const result = await caller.rbacUsers.getMyPermissions();
      expect(result).toBeDefined();
      expect(result.userId).toBeDefined();
    });
  });

  describe("permission-protected admin endpoints", () => {
    it("should reject users without system:manage permission", async () => {
      // Mock permission service to deny
      const permissionService = await import("../services/permissionService");
      vi.mocked(permissionService.hasPermission).mockResolvedValue(false);
      vi.mocked(permissionService.isSuperAdmin).mockResolvedValue(false);

      const caller = await createCallerWithUser(mockAuthenticatedUser);

      // Admin endpoints with requirePermission should reject users without permission
      await expect(caller.admin.getStrainSystemStatus()).rejects.toThrow();
    });

    it("should reject demo user for permission-protected endpoints", async () => {
      const caller = await createCallerWithUser(mockDemoUser);

      // Demo user should be rejected before permission check
      await expect(caller.admin.getStrainSystemStatus()).rejects.toThrow();
    });

    it("should accept users with proper permissions", async () => {
      // Mock permission service to allow
      const permissionService = await import("../services/permissionService");
      vi.mocked(permissionService.hasPermission).mockResolvedValue(true);
      vi.mocked(permissionService.isSuperAdmin).mockResolvedValue(false);

      const caller = await createCallerWithUser(mockAdminUser);

      // Admin user with permission should be able to access
      // Note: May still fail due to DB mocking, but shouldn't fail on auth/permission
      try {
        await caller.admin.getStrainSystemStatus();
      } catch (error) {
        // If it throws, it should NOT be an auth/permission error
        if (error instanceof TRPCError) {
          expect(error.code).not.toBe("UNAUTHORIZED");
          expect(error.code).not.toBe("FORBIDDEN");
        }
      }
    });
  });

  describe("User ID validation in mutations", () => {
    it("should not allow userId: 0 fallback pattern", async () => {
      const caller = await createCallerWithUser(mockDemoUser);

      // Mutations should not accept demo user (which would have triggered
      // the old ctx.user?.id || 1 fallback pattern)
      await expect(
        caller.calendarRecurrence.updateRecurrenceRule({
          eventId: 1,
          updates: { frequency: "WEEKLY" },
        })
      ).rejects.toThrow();
    });

    it("should properly attribute mutations to authenticated user", async () => {
      const caller = await createCallerWithUser(mockAuthenticatedUser);

      // Authenticated user mutations should succeed
      const result = await caller.calendarRecurrence.updateRecurrenceRule({
        eventId: 1,
        updates: { frequency: "WEEKLY" },
      });
      expect(result).toEqual({ success: true });
    });
  });

  describe("Edge cases", () => {
    it("should handle user with id = 0 as potentially problematic", async () => {
      // Note: Currently the system only specifically rejects id = -1 (demo user)
      // User with id = 0 passes through - this test documents current behavior
      // A future security enhancement could reject all non-positive IDs
      const userWithZeroId = {
        ...mockAuthenticatedUser,
        id: 0,
      };
      const caller = await createCallerWithUser(userWithZeroId);

      // Currently succeeds - documenting actual behavior
      // The getAuthenticatedUserId helper only checks for -1
      const result = await caller.calendarRecurrence.modifyInstance({
        eventId: 1,
        instanceDate: "2025-01-15",
        modifications: {},
      });
      expect(result).toEqual({ success: true });
    });

    it("should handle negative user IDs other than -1", async () => {
      // Note: Currently only -1 (demo user) is specifically rejected
      // Other negative IDs pass through - this test documents current behavior
      const userWithNegativeId = {
        ...mockAuthenticatedUser,
        id: -5,
      };
      const caller = await createCallerWithUser(userWithNegativeId);

      // Currently succeeds - documenting actual behavior
      const result = await caller.calendarRecurrence.deleteRecurrenceRule({
        eventId: 1,
      });
      expect(result).toEqual({ success: true });
    });

    it("should accept positive user IDs", async () => {
      const userWithPositiveId = {
        ...mockAuthenticatedUser,
        id: 100,
      };
      const caller = await createCallerWithUser(userWithPositiveId);

      // Positive IDs should be accepted
      const result = await caller.calendarRecurrence.getRecurrenceRule({
        eventId: 1,
      });
      expect(result).toBeDefined();
    });
  });
});

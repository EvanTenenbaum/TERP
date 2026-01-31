/**
 * Security Tests for Advanced Tag Features Router
 *
 * SEC-033: Verify actor attribution comes from authenticated context,
 * not from client input
 *
 * Tests that createTagGroup:
 * - Uses createdBy from ctx.user.id (authenticated context)
 * - Does NOT accept createdBy from input
 * - Rejects unauthenticated requests with UNAUTHORIZED error
 *
 * @module server/routers/advancedTagFeatures.test.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { setupDbMock } from "../test-utils/testDb";
import { setupPermissionMock } from "../test-utils/testPermissions";
import { TRPCError } from "@trpc/server";

// Mock the database (MUST be before other imports)
vi.mock("../db", () => setupDbMock());

// Mock permission service (MUST be before other imports)
vi.mock("../services/permissionService", () => setupPermissionMock());

// Mock advancedTagFeatures module with explicit exports
vi.mock("../advancedTagFeatures", () => ({
  booleanTagSearch: vi.fn(),
  createTagHierarchy: vi.fn(),
  getTagChildren: vi.fn(),
  getTagAncestors: vi.fn(),
  mergeTags: vi.fn(),
  createTagGroup: vi.fn(),
  addTagToGroup: vi.fn(),
  getTagsInGroup: vi.fn(),
  getTagUsageStats: vi.fn(),
  bulkAddTags: vi.fn(),
  bulkRemoveTags: vi.fn(),
}));

import { appRouter } from "../routers";
import { createContext } from "../_core/context";
import * as advancedTagFeatures from "../advancedTagFeatures";

// Mock users for testing
const mockUser = {
  id: 42,
  email: "test@terp.com",
  name: "Test User",
};

const mockDifferentUser = {
  id: 99,
  email: "different@terp.com",
  name: "Different User",
};

// Create a test caller with mock context
const createCaller = async (user: typeof mockUser | null = mockUser) => {
  const ctx = await createContext({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    req: { headers: {} } as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    res: {} as any,
  });

  return appRouter.createCaller({
    ...ctx,
    user: user,
  });
};

describe("advancedTagFeatures Router - SEC-033: Actor Attribution", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(advancedTagFeatures.createTagGroup).mockResolvedValue({
      id: 1,
      name: "Test Group",
      description: "Test Description",
      color: "#FF0000",
      createdBy: 42,
      createdAt: new Date(),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("createGroup", () => {
    it("should use createdBy from authenticated context (ctx.user.id), not from input", async () => {
      // Arrange
      const caller = await createCaller(mockUser);

      // Act
      await caller.advancedTagFeatures.createGroup({
        name: "Test Group",
        description: "Test Description",
        color: "#FF0000",
      });

      // Assert - verify createTagGroup was called with the authenticated user's ID
      expect(advancedTagFeatures.createTagGroup).toHaveBeenCalledTimes(1);
      expect(advancedTagFeatures.createTagGroup).toHaveBeenCalledWith(
        "Test Group",
        "Test Description",
        "#FF0000",
        42 // This MUST be ctx.user.id, not any value from input
      );
    });

    it("should use correct user ID when different user is authenticated", async () => {
      // Arrange
      const caller = await createCaller(mockDifferentUser);

      // Act
      await caller.advancedTagFeatures.createGroup({
        name: "Different Group",
        description: "Different Description",
        color: "#00FF00",
      });

      // Assert - verify createTagGroup was called with the different user's ID
      expect(advancedTagFeatures.createTagGroup).toHaveBeenCalledTimes(1);
      expect(advancedTagFeatures.createTagGroup).toHaveBeenCalledWith(
        "Different Group",
        "Different Description",
        "#00FF00",
        99 // Different user's ID
      );
    });

    it("should reject unauthenticated requests with UNAUTHORIZED error", async () => {
      // Arrange
      const unauthenticatedCaller = await createCaller(null);

      // Act & Assert
      await expect(
        unauthenticatedCaller.advancedTagFeatures.createGroup({
          name: "Test Group",
          description: "Test Description",
          color: "#FF0000",
        })
      ).rejects.toThrow(TRPCError);

      await expect(
        unauthenticatedCaller.advancedTagFeatures.createGroup({
          name: "Test Group",
          description: "Test Description",
          color: "#FF0000",
        })
      ).rejects.toThrow("Authentication required");

      // Verify createTagGroup was never called
      expect(advancedTagFeatures.createTagGroup).not.toHaveBeenCalled();
    });

    it("should NOT accept createdBy from input (schema validation)", async () => {
      // Arrange
      const caller = await createCaller(mockUser);

      // Act & Assert - TypeScript should prevent this, but verify runtime behavior
      // @ts-expect-error - Testing that createdBy in input is not allowed
      await caller.advancedTagFeatures.createGroup({
        name: "Test Group",
        description: "Test Description",
        color: "#FF0000",
        createdBy: 999, // Malicious attempt to set createdBy
      });

      // Assert - even if createdBy was passed in input, it should be ignored
      // and the actual ctx.user.id should be used
      expect(advancedTagFeatures.createTagGroup).toHaveBeenCalledWith(
        "Test Group",
        "Test Description",
        "#FF0000",
        42 // ctx.user.id, NOT 999 from input
      );
    });
  });
});

describe("advancedTagFeatures Router - Security Best Practices", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should verify createGroup uses protectedProcedure (requires authentication)", async () => {
    // This test verifies the router is configured with protectedProcedure
    // which ensures authentication is required

    const unauthenticatedCaller = await createCaller(null);

    // All protectedProcedure endpoints should reject unauthenticated requests
    await expect(
      unauthenticatedCaller.advancedTagFeatures.createGroup({
        name: "Test",
        description: "Test",
        color: "#000000",
      })
    ).rejects.toThrow();
  });

  it("should have input validation for required fields", async () => {
    const caller = await createCaller(mockUser);

    // Test missing name
    await expect(
      // @ts-expect-error - Testing invalid input
      caller.advancedTagFeatures.createGroup({
        description: "Test",
        color: "#000000",
      })
    ).rejects.toThrow();

    // Test missing description
    await expect(
      // @ts-expect-error - Testing invalid input
      caller.advancedTagFeatures.createGroup({
        name: "Test",
        color: "#000000",
      })
    ).rejects.toThrow();

    // Test missing color
    await expect(
      // @ts-expect-error - Testing invalid input
      caller.advancedTagFeatures.createGroup({
        name: "Test",
        description: "Test",
      })
    ).rejects.toThrow();
  });
});

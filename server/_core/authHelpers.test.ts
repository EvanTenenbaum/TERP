import { describe, it, expect, vi } from "vitest";
import { getCurrentUserId, getCurrentUserIdOrNull } from "./authHelpers";
import type { TrpcContext } from "./context";
import { TRPCError } from "@trpc/server";

// Mock the trpc module
vi.mock("./trpc", () => ({
  getAuthenticatedUserId: vi.fn((ctx: { user?: { id: number } | null }) => {
    if (!ctx.user || ctx.user.id === -1) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Authentication required",
      });
    }
    return ctx.user.id;
  }),
}));

// Helper to create mock context
function createMockContext(userId: number | null): TrpcContext {
  return {
    req: {} as TrpcContext["req"],
    res: {} as TrpcContext["res"],
    user: userId !== null
      ? {
          id: userId,
          openId: "test-open-id",
          name: "Test User",
          email: "test@example.com",
          role: "user" as const,
          loginMethod: null,
          deletedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          lastSignedIn: new Date(),
        }
      : ({} as TrpcContext["user"]),
  };
}

describe("authHelpers", () => {
  describe("getCurrentUserId", () => {
    it("should return valid user ID for authenticated user", () => {
      const ctx = createMockContext(42);
      const result = getCurrentUserId(ctx);
      expect(result).toBe(42);
    });

    it("should throw UNAUTHORIZED when no user in context", () => {
      const ctx = createMockContext(null);
      // Override user to be undefined
      (ctx as { user: undefined }).user = undefined;

      expect(() => getCurrentUserId(ctx)).toThrow(TRPCError);
      expect(() => getCurrentUserId(ctx)).toThrow("Authentication required");
    });

    it("should throw UNAUTHORIZED for demo user (id = -1)", () => {
      const ctx = createMockContext(-1);

      expect(() => getCurrentUserId(ctx)).toThrow(TRPCError);
    });

    it("should throw UNAUTHORIZED for user with id <= 0", () => {
      const ctx = createMockContext(0);

      expect(() => getCurrentUserId(ctx)).toThrow(TRPCError);
      expect(() => getCurrentUserId(ctx)).toThrow(
        "You must be logged in to perform this action"
      );
    });
  });

  describe("getCurrentUserIdOrNull", () => {
    it("should return user ID for authenticated user", () => {
      const ctx = createMockContext(42);
      const result = getCurrentUserIdOrNull(ctx);
      expect(result).toBe(42);
    });

    it("should return null when no user in context", () => {
      const ctx = createMockContext(null);
      (ctx as { user: undefined }).user = undefined;

      const result = getCurrentUserIdOrNull(ctx);
      expect(result).toBeNull();
    });

    it("should return null for demo user (id = -1)", () => {
      const ctx = createMockContext(-1);
      const result = getCurrentUserIdOrNull(ctx);
      expect(result).toBeNull();
    });

    it("should return null for user with id = 0", () => {
      const ctx = createMockContext(0);
      const result = getCurrentUserIdOrNull(ctx);
      expect(result).toBeNull();
    });

    it("should return valid ID for positive user ID", () => {
      const ctx = createMockContext(100);
      const result = getCurrentUserIdOrNull(ctx);
      expect(result).toBe(100);
    });
  });
});

/**
 * Tests for Global Error Handling Middleware
 * ST-002: Implement Global Error Handling
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";
import { createErrorHandlingMiddleware, errorTracking } from "./errorHandling";
import { logger } from "./logger";

// Mock logger
vi.mock("./logger", () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

describe("Error Handling Middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createErrorHandlingMiddleware", () => {
    it("should pass through successful procedure execution", async () => {
      const middleware = createErrorHandlingMiddleware("testProcedure");
      const mockNext = vi.fn().mockResolvedValue({ success: true });

      const result = await middleware({
        ctx: { user: undefined },
        next: mockNext,
        path: "test.procedure",
        type: "query",
        input: { test: "data" },
      });

      expect(result).toEqual({ success: true });
      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(logger.error).not.toHaveBeenCalled();
    });

    it("should catch and log TRPCError", async () => {
      const middleware = createErrorHandlingMiddleware("testProcedure");
      const testError = new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Test error",
      });
      const mockNext = vi.fn().mockRejectedValue(testError);

      await expect(
        middleware({
          ctx: { user: { id: 123, role: "admin" } },
          next: mockNext,
          path: "test.procedure",
          type: "mutation",
          input: { test: "data" },
        })
      ).rejects.toThrow(TRPCError);

      expect(logger.error).toHaveBeenCalled();
      const logCall = (logger.error as unknown as { mock: { calls: Array<[Record<string, unknown>]> } }).mock.calls[0];
      expect(logCall[0]).toMatchObject({
        code: "INTERNAL_SERVER_ERROR",
        message: "Test error",
        userId: 123,
        userRole: "admin",
        procedure: "testProcedure",
      });
    });

    it("should convert non-TRPCError to TRPCError", async () => {
      const middleware = createErrorHandlingMiddleware();
      const testError = new Error("Regular error");
      const mockNext = vi.fn().mockRejectedValue(testError);

      await expect(
        middleware({
          ctx: { user: undefined },
          next: mockNext,
          path: "test.procedure",
          type: "query",
        })
      ).rejects.toThrow(TRPCError);

      expect(logger.error).toHaveBeenCalled();
      const logCall = (logger.error as unknown as { mock: { calls: Array<[Record<string, unknown>]> } }).mock.calls[0];
      expect(logCall[0].code).toBe("INTERNAL_SERVER_ERROR");
      expect(logCall[0].message).toBe("Regular error");
    });

    it("should generate unique error IDs", async () => {
      const middleware = createErrorHandlingMiddleware();
      const testError = new TRPCError({
        code: "BAD_REQUEST",
        message: "Test error",
      });
      const mockNext = vi.fn().mockRejectedValue(testError);

      await expect(
        middleware({
          ctx: { user: undefined },
          next: mockNext,
          path: "test.procedure",
          type: "query",
        })
      ).rejects.toThrow();

      const logCall = (logger.info as unknown as { mock: { calls: Array<[Record<string, unknown>]> } }).mock.calls[0];
      expect(logCall[0].errorId).toMatch(/^err_\d+_[a-z0-9]+$/);
    });

    it("should categorize error severity correctly", async () => {
      const testCases = [
        { code: "INTERNAL_SERVER_ERROR" as const, expectedLogger: logger.error },
        { code: "FORBIDDEN" as const, expectedLogger: logger.error },
        { code: "NOT_FOUND" as const, expectedLogger: logger.warn },
        { code: "BAD_REQUEST" as const, expectedLogger: logger.info },
      ];

      for (const { code, expectedLogger } of testCases) {
        vi.clearAllMocks();
        const middleware = createErrorHandlingMiddleware();
        const testError = new TRPCError({ code, message: "Test" });
        const mockNext = vi.fn().mockRejectedValue(testError);

        await expect(
          middleware({
            ctx: { user: undefined },
            next: mockNext,
            path: "test",
            type: "query",
          })
        ).rejects.toThrow();

        expect(expectedLogger).toHaveBeenCalled();
      }
    });

    it("should include user context when available", async () => {
      const middleware = createErrorHandlingMiddleware();
      const testError = new TRPCError({
        code: "UNAUTHORIZED",
        message: "Not authorized",
      });
      const mockNext = vi.fn().mockRejectedValue(testError);

      await expect(
        middleware({
          ctx: { user: { id: 456, role: "user" } },
          next: mockNext,
          path: "test.procedure",
          type: "query",
        })
      ).rejects.toThrow();

      const logCall = (logger.error as unknown as { mock: { calls: Array<[Record<string, unknown>]> } }).mock.calls[0];
      expect(logCall[0]).toMatchObject({
        userId: 456,
        userRole: "user",
      });
    });

    it("should include input in error logs", async () => {
      const middleware = createErrorHandlingMiddleware();
      const testError = new TRPCError({
        code: "BAD_REQUEST",
        message: "Invalid input",
      });
      const mockNext = vi.fn().mockRejectedValue(testError);
      const testInput = { field: "value", nested: { data: 123 } };

      await expect(
        middleware({
          ctx: { user: undefined },
          next: mockNext,
          path: "test.procedure",
          type: "mutation",
          input: testInput,
        })
      ).rejects.toThrow();

      const logCall = (logger.info as unknown as { mock: { calls: Array<[Record<string, unknown>]> } }).mock.calls[0];
      expect(logCall[0].input).toEqual(testInput);
    });
  });

  describe("errorTracking utilities", () => {
    it("should track handled errors", () => {
      const error = new Error("Handled error");
      const errorId = errorTracking.trackHandledError(error, {
        operation: "testOperation",
        userId: 789,
        additionalContext: { extra: "data" },
      });

      expect(errorId).toMatch(/^err_\d+_[a-z0-9]+$/);
      expect(logger.warn).toHaveBeenCalled();
      const logCall = (logger.warn as unknown as { mock: { calls: Array<[Record<string, unknown>]> } }).mock.calls[0];
      expect(logCall[0]).toMatchObject({
        operation: "testOperation",
        userId: 789,
        extra: "data",
      });
    });

    it("should track validation errors", () => {
      const errorId = errorTracking.trackValidationError(
        "email",
        "invalid-email",
        "Invalid email format",
        { userId: 123 }
      );

      expect(errorId).toMatch(/^err_\d+_[a-z0-9]+$/);
      expect(logger.info).toHaveBeenCalled();
      const logCall = (logger.info as unknown as { mock: { calls: Array<[Record<string, unknown>]> } }).mock.calls[0];
      expect(logCall[0]).toMatchObject({
        field: "email",
        value: "invalid-email",
        reason: "Invalid email format",
        userId: 123,
      });
    });

    it("should track business errors", () => {
      const errorId = errorTracking.trackBusinessError(
        "orderCreation",
        "Insufficient inventory",
        { productId: 456, requestedQty: 10 }
      );

      expect(errorId).toMatch(/^err_\d+_[a-z0-9]+$/);
      expect(logger.info).toHaveBeenCalled();
      const logCall = (logger.info as unknown as { mock: { calls: Array<[Record<string, unknown>]> } }).mock.calls[0];
      expect(logCall[0]).toMatchObject({
        operation: "orderCreation",
        reason: "Insufficient inventory",
        productId: 456,
        requestedQty: 10,
      });
    });
  });
});

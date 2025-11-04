/**
 * Error Handling Test Suite
 * ✅ TERP-INIT-005 Phase 3 - Test error catalog and handling
 */

import { describe, it, expect } from "vitest";
import { AppError, ErrorCatalog } from "../_core/errors";

describe("AppError", () => {
  it("should create error with correct properties", () => {
    const error = new AppError("Test error", "TEST_ERROR", 400, {
      field: "test",
    });

    expect(error.message).toBe("Test error");
    expect(error.code).toBe("TEST_ERROR");
    expect(error.statusCode).toBe(400);
    expect(error.metadata).toEqual({ field: "test" });
    expect(error.name).toBe("AppError");
  });

  it("should default to 500 status code", () => {
    const error = new AppError("Test error", "TEST_ERROR");
    expect(error.statusCode).toBe(500);
  });
});

describe("ErrorCatalog", () => {
  describe("INVENTORY errors", () => {
    it("should create BATCH_NOT_FOUND error", () => {
      const error = ErrorCatalog.INVENTORY.BATCH_NOT_FOUND(123);

      expect(error.message).toContain("Batch 123 not found");
      expect(error.code).toBe("NOT_FOUND");
      expect(error.statusCode).toBe(404);
      expect(error.metadata?.batchId).toBe(123);
    });

    it("should create INSUFFICIENT_QUANTITY error", () => {
      const error = ErrorCatalog.INVENTORY.INSUFFICIENT_QUANTITY(123, 50, 100);

      expect(error.message).toContain("Insufficient quantity");
      expect(error.message).toContain("123");
      expect(error.message).toContain("50");
      expect(error.message).toContain("100");
      expect(error.code).toBe("INSUFFICIENT_QUANTITY");
      expect(error.statusCode).toBe(400);
    });

    it("should create INVALID_STATUS_TRANSITION error", () => {
      const error = ErrorCatalog.INVENTORY.INVALID_STATUS_TRANSITION(
        "LIVE",
        "CLOSED"
      );

      expect(error.message).toContain("LIVE");
      expect(error.message).toContain("CLOSED");
      expect(error.code).toBe("INVALID_TRANSITION");
      expect(error.statusCode).toBe(400);
    });

    it("should create NEGATIVE_QUANTITY error", () => {
      const error = ErrorCatalog.INVENTORY.NEGATIVE_QUANTITY(123, -10);

      expect(error.message).toContain("negative quantity");
      expect(error.code).toBe("NEGATIVE_QUANTITY");
      expect(error.statusCode).toBe(400);
    });

    it("should create INVALID_QUANTITY error", () => {
      const error = ErrorCatalog.INVENTORY.INVALID_QUANTITY(-5);

      expect(error.message).toContain("Invalid quantity");
      expect(error.code).toBe("INVALID_QUANTITY");
      expect(error.statusCode).toBe(400);
    });
  });

  describe("NOT_FOUND errors", () => {
    it("should create entity not found errors", () => {
      const vendorError = ErrorCatalog.NOT_FOUND.VENDOR(1);
      const brandError = ErrorCatalog.NOT_FOUND.BRAND(2);
      const productError = ErrorCatalog.NOT_FOUND.PRODUCT(3);
      const lotError = ErrorCatalog.NOT_FOUND.LOT(4);
      const movementError = ErrorCatalog.NOT_FOUND.MOVEMENT(5);

      expect(vendorError.code).toBe("NOT_FOUND");
      expect(brandError.code).toBe("NOT_FOUND");
      expect(productError.code).toBe("NOT_FOUND");
      expect(lotError.code).toBe("NOT_FOUND");
      expect(movementError.code).toBe("NOT_FOUND");

      expect(vendorError.statusCode).toBe(404);
      expect(brandError.statusCode).toBe(404);
    });
  });

  describe("VALIDATION errors", () => {
    it("should create INVALID_INPUT error", () => {
      const error = ErrorCatalog.VALIDATION.INVALID_INPUT(
        "quantity",
        "must be positive"
      );

      expect(error.message).toContain("quantity");
      expect(error.message).toContain("must be positive");
      expect(error.code).toBe("BAD_REQUEST");
      expect(error.statusCode).toBe(400);
    });

    it("should create MISSING_REQUIRED_FIELD error", () => {
      const error =
        ErrorCatalog.VALIDATION.MISSING_REQUIRED_FIELD("vendorName");

      expect(error.message).toContain("vendorName");
      expect(error.code).toBe("BAD_REQUEST");
      expect(error.statusCode).toBe(400);
    });
  });

  describe("DATABASE errors", () => {
    it("should create TRANSACTION_FAILED error", () => {
      const error = ErrorCatalog.DATABASE.TRANSACTION_FAILED(
        "intake",
        "connection timeout"
      );

      expect(error.message).toContain("intake");
      expect(error.message).toContain("connection timeout");
      expect(error.code).toBe("TRANSACTION_FAILED");
      expect(error.statusCode).toBe(500);
    });

    it("should create CONSTRAINT_VIOLATION error", () => {
      const error =
        ErrorCatalog.DATABASE.CONSTRAINT_VIOLATION("unique_batch_code");

      expect(error.message).toContain("unique_batch_code");
      expect(error.code).toBe("CONFLICT");
      expect(error.statusCode).toBe(409);
    });
  });

  describe("AUTH errors", () => {
    it("should create UNAUTHORIZED error", () => {
      const error = ErrorCatalog.AUTH.UNAUTHORIZED();

      expect(error.message).toContain("Authentication required");
      expect(error.code).toBe("UNAUTHORIZED");
      expect(error.statusCode).toBe(401);
    });

    it("should create FORBIDDEN error", () => {
      const error = ErrorCatalog.AUTH.FORBIDDEN("delete batch");

      expect(error.message).toContain("delete batch");
      expect(error.code).toBe("FORBIDDEN");
      expect(error.statusCode).toBe(403);
    });
  });
});

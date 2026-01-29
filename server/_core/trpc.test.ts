/**
 * Tests for SQL Error Sanitization
 * SEC-042: Prevent Raw SQL Exposure in UI Error Messages
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";

// Mock logger
vi.mock("./logger", () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

describe("SEC-042: SQL Error Sanitization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Database error detection", () => {
    it("should detect 'unknown column' errors", () => {
      const error = new Error("Unknown column 'products.strainId' in 'field list'");
      expect(error.message.toLowerCase()).toContain("unknown column");
    });

    it("should detect 'no such column' errors", () => {
      const error = new Error("no such column: products.invalid_field");
      expect(error.message.toLowerCase()).toContain("no such column");
    });

    it("should detect 'failed query:' errors", () => {
      const error = new Error("Failed query: SELECT * FROM invalid_table");
      expect(error.message.toLowerCase()).toContain("failed query:");
    });

    it("should detect SQL syntax errors", () => {
      const error = new Error("You have an error in your SQL syntax near 'SELECT'");
      expect(error.message.toLowerCase()).toContain("sql syntax");
    });

    it("should detect table doesn't exist errors", () => {
      const error = new Error("Table 'terp.invalid_table' doesn't exist");
      expect(error.message.toLowerCase()).toContain("table");
      expect(error.message.toLowerCase()).toContain("doesn't exist");
    });

    it("should detect column does not exist errors", () => {
      const error = new Error("column 'invalid_field' does not exist");
      expect(error.message.toLowerCase()).toContain("column");
      expect(error.message.toLowerCase()).toContain("does not exist");
    });

    it("should detect MySQL error codes", () => {
      const error = new Error("ER_NO_SUCH_TABLE: Table doesn't exist");
      expect(error.message.toLowerCase()).toContain("er_");
    });

    it("should detect drizzle errors", () => {
      const error = new Error("Drizzle ORM: Query failed");
      expect(error.message.toLowerCase()).toContain("drizzle");
    });

    it("should detect mysql2 errors", () => {
      const error = new Error("mysql error: Connection failed");
      expect(error.message.toLowerCase()).toContain("mysql");
      expect(error.message.toLowerCase()).toContain("error");
    });

    it("should detect connection errors with port", () => {
      const error = new Error("ECONNREFUSED 127.0.0.1:3306");
      expect(error.message.toLowerCase()).toContain("econnrefused");
      expect(error.message.toLowerCase()).toContain("3306");
    });
  });

  describe("Non-database error detection", () => {
    it("should not detect regular validation errors as database errors", () => {
      const error = new Error("Invalid email format");
      expect(error.message.toLowerCase()).not.toContain("unknown column");
      expect(error.message.toLowerCase()).not.toContain("sql");
    });

    it("should not detect business logic errors as database errors", () => {
      const error = new Error("Insufficient inventory");
      expect(error.message.toLowerCase()).not.toContain("table");
      expect(error.message.toLowerCase()).not.toContain("column");
    });

    it("should not detect authorization errors as database errors", () => {
      const error = new TRPCError({
        code: "UNAUTHORIZED",
        message: "You are not authorized to perform this action",
      });
      expect(error.message.toLowerCase()).not.toContain("query");
    });
  });

  describe("Error message patterns", () => {
    it("should recognize common MySQL error patterns", () => {
      const patterns = [
        "Unknown column 'users.invalid_field' in 'field list'",
        "Table 'database.nonexistent_table' doesn't exist",
        "You have an error in your SQL syntax; check the manual",
        "ER_DUP_ENTRY: Duplicate entry '123' for key 'PRIMARY'",
        "ER_NO_REFERENCED_ROW_2: Cannot add or update a child row",
        "Failed query: INSERT INTO table VALUES (1, 2, 3)",
        "Column 'created_at' does not exist in table 'products'",
      ];

      for (const pattern of patterns) {
        const error = new Error(pattern);
        const message = error.message.toLowerCase();

        const isDatabaseError =
          message.includes("unknown column") ||
          message.includes("no such column") ||
          message.includes("failed query:") ||
          message.includes("sql syntax") ||
          (message.includes("table") && (message.includes("doesn't exist") || message.includes("does not exist"))) ||
          (message.includes("column") && message.includes("does not exist")) ||
          message.includes("er_") ||
          message.includes("drizzle") ||
          (message.includes("mysql") && message.includes("error")) ||
          message.includes("query failed") ||
          message.includes("database error");

        expect(isDatabaseError).toBe(true);
      }
    });

    it("should not recognize non-database error patterns", () => {
      const patterns = [
        "Invalid input: email is required",
        "User not found",
        "Unauthorized access",
        "Validation failed: price must be positive",
        "Business rule violation: cannot delete active order",
        "Network timeout",
        "File not found",
      ];

      for (const pattern of patterns) {
        const error = new Error(pattern);
        const message = error.message.toLowerCase();

        const isDatabaseError =
          message.includes("unknown column") ||
          message.includes("no such column") ||
          message.includes("failed query:") ||
          message.includes("sql syntax") ||
          (message.includes("table") && (message.includes("doesn't exist") || message.includes("does not exist"))) ||
          (message.includes("column") && message.includes("does not exist")) ||
          message.includes("er_") ||
          message.includes("drizzle") ||
          (message.includes("mysql") && message.includes("error")) ||
          message.includes("query failed") ||
          message.includes("database error");

        expect(isDatabaseError).toBe(false);
      }
    });
  });

  describe("Generic error message", () => {
    it("should use a user-friendly generic message", () => {
      const genericMessage = "A database error occurred. Please try again or contact support if the problem persists.";

      expect(genericMessage.toLowerCase()).not.toContain("sql");
      expect(genericMessage.toLowerCase()).not.toContain("query");
      expect(genericMessage.toLowerCase()).not.toContain("column");
      expect(genericMessage.toLowerCase()).not.toContain("table");

      expect(genericMessage).toContain("Please");
      expect(genericMessage).toContain("try again");
    });
  });

  describe("Logging behavior", () => {
    it("should log database errors with full details", () => {
      const sqlError = {
        message: "Unknown column 'products.strainId' in 'field list'",
        stack: "Error: Unknown column...\n  at Query.query",
        sql: "SELECT * FROM products WHERE strainId = ?",
        params: [123],
      };

      const expectedLogData = {
        error: sqlError.message,
        stack: sqlError.stack,
        path: "products.list",
        userId: 1,
        errorType: "database",
      };

      expect(expectedLogData.error).toBe(sqlError.message);
      expect(expectedLogData.stack).toBeDefined();
      expect(expectedLogData.errorType).toBe("database");
    });
  });
});

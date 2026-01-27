/**
 * Photography Router Tests
 * BUG-112: Tests for schema drift error handling
 */

import { describe, it, expect } from "vitest";

/**
 * Replicate the isSchemaError function from photography.ts for testing
 * This tests the logic without needing database access
 */
function isSchemaError(error: unknown): boolean {
  let msg = "";

  if (error instanceof Error) {
    msg = error.message;
  } else if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof (error as { message: unknown }).message === "string"
  ) {
    msg = (error as { message: string }).message;
  } else if (typeof error === "string") {
    msg = error;
  }

  if (!msg) {
    return false;
  }

  const msgLower = msg.toLowerCase();
  return (
    msgLower.includes("unknown column") ||
    msgLower.includes("no such column") ||
    msgLower.includes("er_bad_field_error") ||
    (msgLower.includes("column") && msgLower.includes("does not exist"))
  );
}

describe("Photography Router - Schema Error Detection (BUG-112)", () => {
  describe("isSchemaError", () => {
    it("detects MySQL 'Unknown column' error from Error instance", () => {
      const error = new Error(
        "Unknown column 'products.strainId' in 'on clause'"
      );
      expect(isSchemaError(error)).toBe(true);
    });

    it("detects MySQL error from plain object with message property", () => {
      // MySQL2 driver may return plain objects
      const error = {
        message: "Unknown column 'products.strainId' in 'on clause'",
        code: "ER_BAD_FIELD_ERROR",
        errno: 1054,
      };
      expect(isSchemaError(error)).toBe(true);
    });

    it("detects error from string", () => {
      const error = "Unknown column 'products.strainId' in 'field list'";
      expect(isSchemaError(error)).toBe(true);
    });

    it("detects MySQL error code ER_BAD_FIELD_ERROR", () => {
      const error = new Error("ER_BAD_FIELD_ERROR: Unknown column...");
      expect(isSchemaError(error)).toBe(true);
    });

    it("detects SQLite 'no such column' error", () => {
      const error = new Error("no such column: products.strainId");
      expect(isSchemaError(error)).toBe(true);
    });

    it("detects PostgreSQL 'column does not exist' error", () => {
      const error = new Error('column "strainId" does not exist');
      expect(isSchemaError(error)).toBe(true);
    });

    it("returns false for non-schema errors", () => {
      const error = new Error("Connection timeout");
      expect(isSchemaError(error)).toBe(false);
    });

    it("returns false for null/undefined", () => {
      expect(isSchemaError(null)).toBe(false);
      expect(isSchemaError(undefined)).toBe(false);
    });

    it("returns false for empty object", () => {
      expect(isSchemaError({})).toBe(false);
    });

    it("returns false for object with non-string message", () => {
      expect(isSchemaError({ message: 123 })).toBe(false);
      expect(isSchemaError({ message: null })).toBe(false);
    });

    it("is case-insensitive", () => {
      expect(isSchemaError(new Error("UNKNOWN COLUMN 'x'"))).toBe(true);
      expect(isSchemaError(new Error("UnKnOwN CoLuMn 'x'"))).toBe(true);
    });
  });
});

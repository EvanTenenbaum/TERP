/**
 * SQL Safety Utilities Tests
 *
 * Tests for the SQL safety helper functions that prevent empty array crashes.
 * Part of Wave 4A: SQL Safety Audit
 */

import { describe, it, expect } from "vitest";
import {
  safeInArray,
  safeNotInArray,
  safeJoinForIn,
  assertNonEmptyArray,
  isSafeForInArray,
  safeInRaw,
  safeNotInRaw,
} from "./sqlSafety";
import { sql } from "drizzle-orm";

describe("sqlSafety", () => {
  describe("safeInArray", () => {
    it("returns SQL object for empty array without throwing", () => {
      const mockColumn = sql`id`;

      // Should not throw with empty array
      expect(() => safeInArray(mockColumn, [])).not.toThrow();

      // Should return a valid SQL object
      const result = safeInArray(mockColumn, []);
      expect(result).toBeDefined();
      expect(typeof result.getSQL).toBe("function");
    });

    it("returns SQL object for undefined without throwing", () => {
      const mockColumn = sql`id`;

      expect(() =>
        safeInArray(mockColumn, undefined as unknown as number[])
      ).not.toThrow();
      const result = safeInArray(mockColumn, undefined as unknown as number[]);
      expect(result).toBeDefined();
    });

    it("returns SQL object for null without throwing", () => {
      const mockColumn = sql`id`;

      expect(() =>
        safeInArray(mockColumn, null as unknown as number[])
      ).not.toThrow();
      const result = safeInArray(mockColumn, null as unknown as number[]);
      expect(result).toBeDefined();
    });

    it("returns inArray SQL for non-empty array", () => {
      const mockColumn = sql`id`;
      const result = safeInArray(mockColumn, [1, 2, 3]);

      expect(result).toBeDefined();
      expect(typeof result.getSQL).toBe("function");
    });

    it("handles string arrays", () => {
      const mockColumn = sql`name`;
      const result = safeInArray(mockColumn, ["a", "b", "c"]);

      expect(result).toBeDefined();
    });
  });

  describe("safeNotInArray", () => {
    it("returns SQL object for empty array without throwing", () => {
      const mockColumn = sql`id`;

      expect(() => safeNotInArray(mockColumn, [])).not.toThrow();
      const result = safeNotInArray(mockColumn, []);
      expect(result).toBeDefined();
      expect(typeof result.getSQL).toBe("function");
    });

    it("returns SQL object for undefined without throwing", () => {
      const mockColumn = sql`id`;

      expect(() =>
        safeNotInArray(mockColumn, undefined as unknown as number[])
      ).not.toThrow();
      const result = safeNotInArray(
        mockColumn,
        undefined as unknown as number[]
      );
      expect(result).toBeDefined();
    });

    it("returns notInArray SQL for non-empty array", () => {
      const mockColumn = sql`id`;
      const result = safeNotInArray(mockColumn, [1, 2, 3]);

      expect(result).toBeDefined();
      expect(typeof result.getSQL).toBe("function");
    });
  });

  describe("safeJoinForIn", () => {
    it("throws for empty array", () => {
      expect(() => safeJoinForIn([])).toThrow(
        "Cannot create IN clause with empty array"
      );
    });

    it("throws for undefined as any", () => {
      expect(() => safeJoinForIn(undefined as unknown as number[])).toThrow(
        "Cannot create IN clause with empty array"
      );
    });

    it("throws for null as any", () => {
      expect(() => safeJoinForIn(null as unknown as number[])).toThrow(
        "Cannot create IN clause with empty array"
      );
    });

    it("joins numbers correctly", () => {
      const result = safeJoinForIn([1, 2, 3]);
      expect(result).toBe("1,2,3");
    });

    it("quotes strings correctly", () => {
      const result = safeJoinForIn(["a", "b"]);
      expect(result).toBe("'a','b'");
    });

    it("handles mixed types", () => {
      const result = safeJoinForIn([1, "two", 3]);
      expect(result).toBe("1,'two',3");
    });

    it("escapes single quotes in strings", () => {
      const result = safeJoinForIn(["it's", "test"]);
      expect(result).toBe("'it''s','test'");
    });
  });

  describe("assertNonEmptyArray", () => {
    it("throws for empty array", () => {
      expect(() => assertNonEmptyArray([], "testArray")).toThrow(
        "testArray cannot be empty"
      );
    });

    it("throws for undefined as any", () => {
      expect(() =>
        assertNonEmptyArray(undefined as unknown as number[], "testArray")
      ).toThrow("testArray cannot be empty");
    });

    it("passes for non-empty array", () => {
      expect(() => assertNonEmptyArray([1], "testArray")).not.toThrow();
    });

    it("passes for array with multiple elements", () => {
      expect(() => assertNonEmptyArray([1, 2, 3], "testArray")).not.toThrow();
    });

    it("narrows type correctly", () => {
      const arr: number[] = [1, 2, 3];
      assertNonEmptyArray(arr, "arr");
      // After assertion, arr should be typed as [number, ...number[]]
      expect(arr[0]).toBe(1);
    });
  });

  describe("isSafeForInArray", () => {
    it("returns false for empty array", () => {
      expect(isSafeForInArray([])).toBe(false);
    });

    it("returns false for undefined", () => {
      expect(isSafeForInArray(undefined)).toBe(false);
    });

    it("returns false for null", () => {
      expect(isSafeForInArray(null)).toBe(false);
    });

    it("returns true for non-empty array", () => {
      expect(isSafeForInArray([1])).toBe(true);
    });

    it("returns true for array with multiple elements", () => {
      expect(isSafeForInArray([1, 2, 3])).toBe(true);
    });

    it("works as type guard", () => {
      const arr: number[] | undefined = [1, 2, 3];
      if (isSafeForInArray(arr)) {
        // TypeScript should know arr is [number, ...number[]]
        expect(arr[0]).toBe(1);
      }
    });
  });

  describe("safeInRaw", () => {
    it("returns SQL object for empty array without throwing", () => {
      const mockColumn = sql`id`;

      expect(() => safeInRaw(mockColumn, [])).not.toThrow();
      const result = safeInRaw(mockColumn, []);
      expect(result).toBeDefined();
      expect(typeof result.getSQL).toBe("function");
    });

    it("returns SQL for non-empty array", () => {
      const mockColumn = sql`id`;
      const result = safeInRaw(mockColumn, [1, 2, 3]);

      expect(result).toBeDefined();
      expect(typeof result.getSQL).toBe("function");
    });
  });

  describe("safeNotInRaw", () => {
    it("returns SQL object for empty array without throwing", () => {
      const mockColumn = sql`id`;

      expect(() => safeNotInRaw(mockColumn, [])).not.toThrow();
      const result = safeNotInRaw(mockColumn, []);
      expect(result).toBeDefined();
      expect(typeof result.getSQL).toBe("function");
    });

    it("returns SQL for non-empty array", () => {
      const mockColumn = sql`id`;
      const result = safeNotInRaw(mockColumn, [1, 2, 3]);

      expect(result).toBeDefined();
      expect(typeof result.getSQL).toBe("function");
    });
  });
});

/**
 * Property-Based Tests for API Response Utilities
 *
 * **Feature: data-display-fix, Property 1: Paginated Response Extraction Consistency**
 * **Validates: Requirements 1.1, 2.1, 3.1, 4.1, 5.1, 5.2, 5.3, 5.4, 10.2**
 *
 * Uses fast-check to verify that extractArray correctly handles all response formats.
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
  extractArray,
  extractTotal,
  isPaginatedResponse,
} from "./api-utils";

describe("extractArray", () => {
  /**
   * **Feature: data-display-fix, Property 1: Paginated Response Extraction Consistency**
   * **Validates: Requirements 1.1, 2.1, 3.1, 4.1, 5.1, 5.2, 5.3, 5.4, 10.2**
   *
   * Property: For any paginated API response with structure { entityName: T[], total: number },
   * the extraction utility SHALL return the array at response[entityName],
   * and for any direct array response, the utility SHALL return the array unchanged.
   */
  describe("Property 1: Paginated Response Extraction Consistency", () => {
    it("should extract array from object response with matching key", () => {
      fc.assert(
        fc.property(
          // Generate random arrays of objects
          fc.array(fc.record({ id: fc.integer(), name: fc.string() })),
          // Generate random key names (common API response keys)
          fc.constantFrom(
            "invoices",
            "bills",
            "payments",
            "expenses",
            "items",
            "data"
          ),
          // Generate random total (should be >= array length in real API)
          fc.nat(),
          (items, key, total) => {
            // Create paginated response object
            const response = { [key]: items, total };

            // Extract array using the utility
            const extracted = extractArray(response, key);

            // Property: extracted array should equal original items
            expect(extracted).toEqual(items);
            expect(extracted.length).toBe(items.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should return direct array unchanged", () => {
      fc.assert(
        fc.property(
          // Generate random arrays
          fc.array(fc.anything()),
          // Key doesn't matter for direct arrays
          fc.string(),
          (items, key) => {
            // Extract from direct array
            const extracted = extractArray(items, key);

            // Property: should return the same array
            expect(extracted).toEqual(items);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should return empty array for undefined/null inputs", () => {
      fc.assert(
        fc.property(fc.string(), (key) => {
          // Property: undefined input returns empty array
          expect(extractArray(undefined, key)).toEqual([]);

          // Property: null input returns empty array
          expect(extractArray(null, key)).toEqual([]);
        }),
        { numRuns: 100 }
      );
    });

    it("should return empty array when key does not exist in object", () => {
      fc.assert(
        fc.property(
          // Generate object with random key
          fc.record({ existingKey: fc.array(fc.integer()) }),
          // Generate different key to look for
          fc.constantFrom("invoices", "bills", "payments", "nonexistent"),
          (response, searchKey) => {
            // searchKey will never match 'existingKey', so extraction should fail
            const extracted = extractArray(response, searchKey);
            // Property: should return empty array when key doesn't exist
            expect(extracted).toEqual([]);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should handle nested object values that are not arrays", () => {
      fc.assert(
        fc.property(
          fc.constantFrom("invoices", "bills", "data"),
          fc.oneof(fc.string(), fc.integer(), fc.object()),
          (key, nonArrayValue) => {
            // Create response with non-array value at key
            const response = { [key]: nonArrayValue, total: 0 };

            // Property: should return empty array when value is not an array
            const extracted = extractArray(response, key);
            expect(extracted).toEqual([]);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});

describe("extractTotal", () => {
  it("should extract total from paginated response", () => {
    fc.assert(
      fc.property(fc.nat(), (total) => {
        const response = { items: [], total };
        expect(extractTotal(response)).toBe(total);
      }),
      { numRuns: 100 }
    );
  });

  it("should return 0 for undefined/null inputs", () => {
    expect(extractTotal(undefined)).toBe(0);
    expect(extractTotal(null)).toBe(0);
  });

  it("should return 0 when total is not a number", () => {
    fc.assert(
      fc.property(
        fc.oneof(fc.string(), fc.boolean(), fc.array(fc.anything())),
        (nonNumberTotal) => {
          const response = { items: [], total: nonNumberTotal };
          expect(extractTotal(response as Record<string, unknown>)).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe("isPaginatedResponse", () => {
  it("should return true for valid paginated responses", () => {
    fc.assert(
      fc.property(
        fc.array(fc.anything()),
        fc.nat(),
        fc.constantFrom("invoices", "bills", "payments", "items"),
        (items, total, key) => {
          const response = { [key]: items, total };
          expect(isPaginatedResponse(response, key)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("should return false for non-object inputs", () => {
    fc.assert(
      fc.property(
        fc.oneof(fc.string(), fc.integer(), fc.boolean(), fc.constant(null)),
        fc.string(),
        (input, key) => {
          expect(isPaginatedResponse(input, key)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("should return false when key is missing", () => {
    fc.assert(
      fc.property(fc.nat(), (total) => {
        const response = { otherKey: [], total };
        expect(isPaginatedResponse(response, "invoices")).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  it("should return false when total is missing or not a number", () => {
    fc.assert(
      fc.property(
        fc.array(fc.anything()),
        fc.constantFrom("invoices", "items"),
        (items, key) => {
          // Missing total
          const responseNoTotal = { [key]: items };
          expect(isPaginatedResponse(responseNoTotal, key)).toBe(false);

          // Non-number total
          const responseStringTotal = { [key]: items, total: "10" };
          expect(isPaginatedResponse(responseStringTotal, key)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Inventory Utilities Test Suite
 * ✅ TERP-INIT-005 Phase 3 - Comprehensive test coverage
 */

import { describe, it, expect } from "vitest";
import {
  calculateAvailableQty,
  validateQuantityConsistency,
  getQuantityBreakdown,
  isValidStatusTransition,
  validateMetadata,
  parseMetadata,
  stringifyMetadata,
  type BatchMetadata,
} from "../inventoryUtils";
import type { Batch } from "../../drizzle/schema";

// Mock batch helper
function createMockBatch(overrides: Partial<Batch> = {}): Batch {
  return {
    id: 1,
    code: "BATCH-000001",
    sku: "TEST-SKU-20251104-0001",
    productId: 1,
    lotId: 1,
    status: "LIVE",
    grade: "A",
    isSample: 0,
    sampleOnly: 0,
    sampleAvailable: 0,
    cogsMode: "FIXED",
    unitCogs: "10.00",
    unitCogsMin: null,
    unitCogsMax: null,
    paymentTerms: "NET_30",
    metadata: null,
    onHandQty: "100",
    sampleQty: "0",
    reservedQty: "0",
    quarantineQty: "0",
    holdQty: "0",
    defectiveQty: "0",
    publishEcom: 0,
    publishB2b: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as Batch;
}

describe("Quantity Calculations", () => {
  describe("calculateAvailableQty", () => {
    it("should calculate available quantity correctly", () => {
      const batch = createMockBatch({
        onHandQty: "100",
        reservedQty: "20",
        quarantineQty: "10",
        holdQty: "5",
      });

      const available = calculateAvailableQty(batch);
      expect(available).toBe(65); // 100 - 20 - 10 - 5
    });

    it("should never return negative values", () => {
      const batch = createMockBatch({
        onHandQty: "10",
        reservedQty: "20",
        quarantineQty: "5",
        holdQty: "5",
      });

      const available = calculateAvailableQty(batch);
      expect(available).toBe(0); // Should be 0, not -20
    });

    it("should handle null/undefined values", () => {
      const batch = createMockBatch({
        onHandQty: "100",
        reservedQty: undefined as unknown as string,
        quarantineQty: null as unknown as string,
        holdQty: "0",
      });

      const available = calculateAvailableQty(batch);
      expect(available).toBe(100);
    });
  });

  describe("validateQuantityConsistency", () => {
    it("should pass for valid quantities", () => {
      const batch = createMockBatch({
        onHandQty: "100",
        reservedQty: "20",
        quarantineQty: "10",
        holdQty: "5",
        defectiveQty: "0",
      });

      const result = validateQuantityConsistency(batch);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should fail for negative quantities", () => {
      const batch = createMockBatch({
        onHandQty: "-10",
        reservedQty: "0",
      });

      const result = validateQuantityConsistency(batch);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("onHandQty cannot be negative");
    });

    it("should fail when allocated exceeds on-hand", () => {
      const batch = createMockBatch({
        onHandQty: "100",
        reservedQty: "60",
        quarantineQty: "30",
        holdQty: "20",
      });

      const result = validateQuantityConsistency(batch);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes("exceeds on-hand"))).toBe(true);
    });

    it("should fail for NaN values", () => {
      const batch = createMockBatch({
        onHandQty: "invalid",
      });

      const result = validateQuantityConsistency(batch);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("onHandQty is not a valid number");
    });
  });

  describe("getQuantityBreakdown", () => {
    it("should return complete quantity breakdown", () => {
      const batch = createMockBatch({
        onHandQty: "100",
        reservedQty: "20",
        quarantineQty: "10",
        holdQty: "5",
        defectiveQty: "3",
      });

      const breakdown = getQuantityBreakdown(batch);

      expect(breakdown.onHand).toBe(100);
      expect(breakdown.reserved).toBe(20);
      expect(breakdown.quarantine).toBe(10);
      expect(breakdown.hold).toBe(5);
      expect(breakdown.defective).toBe(3);
      expect(breakdown.available).toBe(65);
      expect(breakdown.totalAllocated).toBe(35);
    });
  });
});

describe("Status Transitions", () => {
  describe("isValidStatusTransition", () => {
    it("should allow valid transitions", () => {
      expect(isValidStatusTransition("AWAITING_INTAKE", "LIVE")).toBe(true);
      expect(isValidStatusTransition("LIVE", "ON_HOLD")).toBe(true);
      expect(isValidStatusTransition("ON_HOLD", "LIVE")).toBe(true);
      expect(isValidStatusTransition("LIVE", "SOLD_OUT")).toBe(true);
    });

    it("should reject invalid transitions", () => {
      expect(isValidStatusTransition("SOLD_OUT", "LIVE")).toBe(false);
      expect(isValidStatusTransition("CLOSED", "LIVE")).toBe(false);
      expect(isValidStatusTransition("AWAITING_INTAKE", "SOLD_OUT")).toBe(
        false
      );
    });

    it("should allow same-status transitions", () => {
      expect(isValidStatusTransition("LIVE", "LIVE")).toBe(true);
      expect(isValidStatusTransition("ON_HOLD", "ON_HOLD")).toBe(true);
    });
  });
});

describe("Metadata Validation", () => {
  describe("validateMetadata", () => {
    it("should accept valid metadata", () => {
      const metadata: BatchMetadata = {
        testResults: {
          thc: 25.5,
          cbd: 0.5,
          terpenes: ["Myrcene", "Limonene"],
          testDate: "2025-11-04",
          labName: "Test Lab Inc",
        },
        packaging: {
          type: "jar",
          size: "3.5g",
          material: "glass",
        },
        sourcing: {
          growMethod: "indoor",
          organic: true,
          region: "California",
        },
        notes: "Premium quality",
        tags: ["organic", "indoor"],
      };

      const result = validateMetadata(metadata);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should accept null/undefined metadata", () => {
      expect(validateMetadata(null).valid).toBe(true);
      expect(validateMetadata(undefined).valid).toBe(true);
    });

    it("should reject non-object metadata", () => {
      expect(validateMetadata("string").valid).toBe(false);
      expect(validateMetadata(123).valid).toBe(false);
      expect(validateMetadata([]).valid).toBe(false);
    });

    it("should reject invalid testResults structure", () => {
      const metadata = {
        testResults: {
          thc: "25.5", // Should be number
        },
      };

      const result = validateMetadata(metadata);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("testResults.thc must be a number");
    });

    it("should reject invalid sourcing.organic type", () => {
      const metadata = {
        sourcing: {
          organic: "yes", // Should be boolean
        },
      };

      const result = validateMetadata(metadata);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("sourcing.organic must be a boolean");
    });
  });

  describe("parseMetadata", () => {
    it("should parse valid JSON metadata", () => {
      const json = JSON.stringify({
        testResults: { thc: 25.5 },
        notes: "Test",
      });

      const result = parseMetadata(json);
      expect(result.testResults?.thc).toBe(25.5);
      expect(result.notes).toBe("Test");
    });

    it("should return empty object for null/empty", () => {
      expect(parseMetadata(null)).toEqual({});
      expect(parseMetadata("")).toEqual({});
    });

    it("should return empty object for invalid JSON", () => {
      const result = parseMetadata("{invalid json}");
      expect(result).toEqual({});
    });

    it("should return empty object for invalid metadata structure", () => {
      const json = JSON.stringify({
        testResults: {
          thc: "invalid", // Should be number
        },
      });

      const result = parseMetadata(json);
      expect(result).toEqual({});
    });
  });

  describe("stringifyMetadata", () => {
    it("should stringify valid metadata", () => {
      const metadata: BatchMetadata = {
        testResults: { thc: 25.5 },
        notes: "Test",
      };

      const result = stringifyMetadata(metadata);
      const parsed = JSON.parse(result);
      expect(parsed.testResults.thc).toBe(25.5);
      expect(parsed.notes).toBe("Test");
    });

    it("should throw for invalid metadata", () => {
      const metadata = {
        testResults: {
          thc: "invalid", // Should be number
        },
      };

      expect(() => stringifyMetadata(metadata)).toThrow("Invalid metadata");
    });
  });
});

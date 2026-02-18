/**
 * TER-260: Regression tests for computeTotalQty
 *
 * totalQty is NOT stored in the database. It is always derived as the sum of
 * the six component quantity fields: onHandQty + sampleQty + reservedQty +
 * quarantineQty + holdQty + defectiveQty.
 *
 * These tests verify that the computeTotalQty helper produces the correct
 * string result for every combination of null, zero, and non-zero values.
 */

import { describe, expect, it } from "vitest";
import { computeTotalQty } from "../inventoryUtils";

describe("computeTotalQty", () => {
  it("should return onHandQty as totalQty when all other fields are zero", () => {
    // Batch with only onHandQty set — totalQty must equal onHandQty
    const result = computeTotalQty({
      onHandQty: "100.0000",
      sampleQty: "0.0000",
      reservedQty: "0.0000",
      quarantineQty: "0.0000",
      holdQty: "0.0000",
      defectiveQty: "0.0000",
    });

    expect(result).toBe("100.0000");
  });

  it("should return correct sum when all 6 fields have non-zero values", () => {
    // 10 + 2 + 3 + 1 + 4 + 5 = 25
    const result = computeTotalQty({
      onHandQty: "10.0000",
      sampleQty: "2.0000",
      reservedQty: "3.0000",
      quarantineQty: "1.0000",
      holdQty: "4.0000",
      defectiveQty: "5.0000",
    });

    expect(result).toBe("25.0000");
  });

  it("should treat null fields as 0 and not throw", () => {
    // Batch where most fields are null (newly created batch before intake)
    const result = computeTotalQty({
      onHandQty: "50.0000",
      sampleQty: null,
      reservedQty: null,
      quarantineQty: null,
      holdQty: null,
      defectiveQty: null,
    });

    expect(result).toBe("50.0000");
  });

  it("should return 0.0000 when all fields are zero strings", () => {
    // Batch with "0.0000" in all fields — totalQty must be "0.0000", not null/undefined
    const result = computeTotalQty({
      onHandQty: "0.0000",
      sampleQty: "0.0000",
      reservedQty: "0.0000",
      quarantineQty: "0.0000",
      holdQty: "0.0000",
      defectiveQty: "0.0000",
    });

    expect(result).toBe("0.0000");
  });

  it("should return 0.0000 when all fields are null or undefined", () => {
    // Batch where all qty fields are null (e.g. not yet fetched / missing)
    const result = computeTotalQty({
      onHandQty: null,
      sampleQty: null,
      reservedQty: null,
      quarantineQty: null,
      holdQty: null,
      defectiveQty: null,
    });

    expect(result).toBe("0.0000");
  });

  it("should return correct sum after a 25-unit onHandQty adjustment", () => {
    // Simulate the state of a batch after adjustQty(field=onHandQty, adjustment=25)
    // starting from all-zero state. totalQty should be 25.0000.
    const batchAfterAdjustment = {
      onHandQty: "25.0000",
      sampleQty: "0.0000",
      reservedQty: "0.0000",
      quarantineQty: "0.0000",
      holdQty: "0.0000",
      defectiveQty: "0.0000",
    };

    const result = computeTotalQty(batchAfterAdjustment);

    expect(result).toBe("25.0000");
  });

  it("should handle decimal precision correctly for fractional quantities", () => {
    // 0.1 + 0.2 = 0.3 in most languages has floating-point issues,
    // but toFixed(4) should produce "0.3000"
    const result = computeTotalQty({
      onHandQty: "0.1000",
      sampleQty: "0.2000",
      reservedQty: "0.0000",
      quarantineQty: "0.0000",
      holdQty: "0.0000",
      defectiveQty: "0.0000",
    });

    expect(result).toBe("0.3000");
  });
});

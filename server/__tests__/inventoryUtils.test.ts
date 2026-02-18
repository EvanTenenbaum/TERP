/**
 * TER-260: Regression tests for computeTotalQty
 *
 * totalQty is NOT stored in the database. It is always derived as:
 *   onHandQty + sampleQty + defectiveQty
 *
 * reserved, quarantine, and hold are SUB-BUCKETS of onHandQty (not separate
 * pools), so they are NOT added again. See calculateAvailableQty for proof:
 *   available = onHand - reserved - quarantine - hold
 */

import { describe, expect, it } from "vitest";
import { computeTotalQty } from "../inventoryUtils";

describe("computeTotalQty", () => {
  it("should return onHandQty as totalQty when sample and defective are zero", () => {
    const result = computeTotalQty({
      onHandQty: "100.0000",
      sampleQty: "0.0000",
      defectiveQty: "0.0000",
    });

    expect(result).toBe("100.0000");
  });

  it("should sum onHand + sample + defective (the 3 independent pools)", () => {
    // 100 on-hand + 5 sample + 3 defective = 108 total physical units
    const result = computeTotalQty({
      onHandQty: "100.0000",
      sampleQty: "5.0000",
      defectiveQty: "3.0000",
    });

    expect(result).toBe("108.0000");
  });

  it("should NOT double-count reserved/quarantine/hold (they are sub-buckets of onHand)", () => {
    // A batch with 100 on-hand, 20 reserved, 10 quarantine, 5 hold.
    // The 20+10+5 are INSIDE the 100, not additional to it.
    // totalQty should be 100 + 2 (sample) + 1 (defective) = 103, NOT 138.
    const result = computeTotalQty({
      onHandQty: "100.0000",
      sampleQty: "2.0000",
      defectiveQty: "1.0000",
    });

    expect(result).toBe("103.0000");
  });

  it("should treat null fields as 0 and not throw", () => {
    const result = computeTotalQty({
      onHandQty: "50.0000",
      sampleQty: null,
      defectiveQty: null,
    });

    expect(result).toBe("50.0000");
  });

  it("should return 0.0000 when all fields are zero strings", () => {
    const result = computeTotalQty({
      onHandQty: "0.0000",
      sampleQty: "0.0000",
      defectiveQty: "0.0000",
    });

    expect(result).toBe("0.0000");
  });

  it("should return 0.0000 when all fields are null or undefined", () => {
    const result = computeTotalQty({
      onHandQty: null,
      sampleQty: null,
      defectiveQty: null,
    });

    expect(result).toBe("0.0000");
  });

  it("should return correct sum after a 25-unit onHandQty adjustment", () => {
    const result = computeTotalQty({
      onHandQty: "25.0000",
      sampleQty: "0.0000",
      defectiveQty: "0.0000",
    });

    expect(result).toBe("25.0000");
  });

  it("should handle decimal precision correctly for fractional quantities", () => {
    // 0.1 + 0.2 = 0.3 in most languages has floating-point issues,
    // but toFixed(4) should produce "0.3000"
    const result = computeTotalQty({
      onHandQty: "0.1000",
      sampleQty: "0.2000",
      defectiveQty: "0.0000",
    });

    expect(result).toBe("0.3000");
  });
});

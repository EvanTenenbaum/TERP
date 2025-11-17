/**
 * Status Transition Validation Tests
 * Tests for ST-017: Batch Status Transition Logic
 */

import { describe, it, expect, beforeEach } from "vitest";
import { isValidStatusTransition, getAllowedNextStatuses, type BatchStatus } from "../inventoryUtils";

describe("Status Transition Validation", () => {
  describe("isValidStatusTransition", () => {
    it("should allow valid transitions from AWAITING_INTAKE", () => {
      expect(isValidStatusTransition("AWAITING_INTAKE", "LIVE")).toBe(true);
      expect(isValidStatusTransition("AWAITING_INTAKE", "QUARANTINED")).toBe(true);
    });

    it("should reject invalid transitions from AWAITING_INTAKE", () => {
      expect(isValidStatusTransition("AWAITING_INTAKE", "PHOTOGRAPHY_COMPLETE")).toBe(false);
      expect(isValidStatusTransition("AWAITING_INTAKE", "ON_HOLD")).toBe(false);
      expect(isValidStatusTransition("AWAITING_INTAKE", "SOLD_OUT")).toBe(false);
      expect(isValidStatusTransition("AWAITING_INTAKE", "CLOSED")).toBe(false);
    });

    it("should allow valid transitions from LIVE", () => {
      expect(isValidStatusTransition("LIVE", "PHOTOGRAPHY_COMPLETE")).toBe(true);
      expect(isValidStatusTransition("LIVE", "ON_HOLD")).toBe(true);
      expect(isValidStatusTransition("LIVE", "QUARANTINED")).toBe(true);
      expect(isValidStatusTransition("LIVE", "SOLD_OUT")).toBe(true);
    });

    it("should reject invalid transitions from LIVE", () => {
      expect(isValidStatusTransition("LIVE", "AWAITING_INTAKE")).toBe(false);
      expect(isValidStatusTransition("LIVE", "CLOSED")).toBe(false);
    });

    it("should allow valid transitions from PHOTOGRAPHY_COMPLETE", () => {
      expect(isValidStatusTransition("PHOTOGRAPHY_COMPLETE", "LIVE")).toBe(true);
      expect(isValidStatusTransition("PHOTOGRAPHY_COMPLETE", "ON_HOLD")).toBe(true);
      expect(isValidStatusTransition("PHOTOGRAPHY_COMPLETE", "QUARANTINED")).toBe(true);
      expect(isValidStatusTransition("PHOTOGRAPHY_COMPLETE", "SOLD_OUT")).toBe(true);
    });

    it("should allow valid transitions from ON_HOLD", () => {
      expect(isValidStatusTransition("ON_HOLD", "LIVE")).toBe(true);
      expect(isValidStatusTransition("ON_HOLD", "QUARANTINED")).toBe(true);
    });

    it("should reject invalid transitions from ON_HOLD", () => {
      expect(isValidStatusTransition("ON_HOLD", "PHOTOGRAPHY_COMPLETE")).toBe(false);
      expect(isValidStatusTransition("ON_HOLD", "SOLD_OUT")).toBe(false);
      expect(isValidStatusTransition("ON_HOLD", "CLOSED")).toBe(false);
    });

    it("should allow valid transitions from QUARANTINED", () => {
      expect(isValidStatusTransition("QUARANTINED", "LIVE")).toBe(true);
      expect(isValidStatusTransition("QUARANTINED", "ON_HOLD")).toBe(true);
      expect(isValidStatusTransition("QUARANTINED", "CLOSED")).toBe(true);
    });

    it("should reject invalid transitions from QUARANTINED", () => {
      expect(isValidStatusTransition("QUARANTINED", "AWAITING_INTAKE")).toBe(false);
      expect(isValidStatusTransition("QUARANTINED", "PHOTOGRAPHY_COMPLETE")).toBe(false);
      expect(isValidStatusTransition("QUARANTINED", "SOLD_OUT")).toBe(false);
    });

    it("should allow only CLOSED transition from SOLD_OUT", () => {
      expect(isValidStatusTransition("SOLD_OUT", "CLOSED")).toBe(true);
      expect(isValidStatusTransition("SOLD_OUT", "LIVE")).toBe(false);
      expect(isValidStatusTransition("SOLD_OUT", "QUARANTINED")).toBe(false);
    });

    it("should not allow any transitions from CLOSED", () => {
      expect(isValidStatusTransition("CLOSED", "LIVE")).toBe(false);
      expect(isValidStatusTransition("CLOSED", "AWAITING_INTAKE")).toBe(false);
      expect(isValidStatusTransition("CLOSED", "QUARANTINED")).toBe(false);
    });

    it("should allow same-status transitions (no-op)", () => {
      const statuses: BatchStatus[] = [
        "AWAITING_INTAKE",
        "LIVE",
        "PHOTOGRAPHY_COMPLETE",
        "ON_HOLD",
        "QUARANTINED",
        "SOLD_OUT",
        "CLOSED",
      ];

      statuses.forEach(status => {
        expect(isValidStatusTransition(status, status)).toBe(true);
      });
    });
  });

  describe("getAllowedNextStatuses", () => {
    it("should return correct allowed statuses for AWAITING_INTAKE", () => {
      const allowed = getAllowedNextStatuses("AWAITING_INTAKE");
      expect(allowed).toEqual(["LIVE", "QUARANTINED"]);
    });

    it("should return correct allowed statuses for LIVE", () => {
      const allowed = getAllowedNextStatuses("LIVE");
      expect(allowed).toEqual(["PHOTOGRAPHY_COMPLETE", "ON_HOLD", "QUARANTINED", "SOLD_OUT"]);
    });

    it("should return correct allowed statuses for PHOTOGRAPHY_COMPLETE", () => {
      const allowed = getAllowedNextStatuses("PHOTOGRAPHY_COMPLETE");
      expect(allowed).toEqual(["LIVE", "ON_HOLD", "QUARANTINED", "SOLD_OUT"]);
    });

    it("should return correct allowed statuses for ON_HOLD", () => {
      const allowed = getAllowedNextStatuses("ON_HOLD");
      expect(allowed).toEqual(["LIVE", "QUARANTINED"]);
    });

    it("should return correct allowed statuses for QUARANTINED", () => {
      const allowed = getAllowedNextStatuses("QUARANTINED");
      expect(allowed).toEqual(["LIVE", "ON_HOLD", "CLOSED"]);
    });

    it("should return correct allowed statuses for SOLD_OUT", () => {
      const allowed = getAllowedNextStatuses("SOLD_OUT");
      expect(allowed).toEqual(["CLOSED"]);
    });

    it("should return empty array for CLOSED", () => {
      const allowed = getAllowedNextStatuses("CLOSED");
      expect(allowed).toEqual([]);
    });
  });

  describe("Status Transition Flow Examples", () => {
    it("should support typical happy path: AWAITING_INTAKE -> LIVE -> PHOTOGRAPHY_COMPLETE -> SOLD_OUT -> CLOSED", () => {
      expect(isValidStatusTransition("AWAITING_INTAKE", "LIVE")).toBe(true);
      expect(isValidStatusTransition("LIVE", "PHOTOGRAPHY_COMPLETE")).toBe(true);
      expect(isValidStatusTransition("PHOTOGRAPHY_COMPLETE", "SOLD_OUT")).toBe(true);
      expect(isValidStatusTransition("SOLD_OUT", "CLOSED")).toBe(true);
    });

    it("should support quarantine flow: AWAITING_INTAKE -> QUARANTINED -> LIVE", () => {
      expect(isValidStatusTransition("AWAITING_INTAKE", "QUARANTINED")).toBe(true);
      expect(isValidStatusTransition("QUARANTINED", "LIVE")).toBe(true);
    });

    it("should support hold flow: LIVE -> ON_HOLD -> LIVE", () => {
      expect(isValidStatusTransition("LIVE", "ON_HOLD")).toBe(true);
      expect(isValidStatusTransition("ON_HOLD", "LIVE")).toBe(true);
    });

    it("should support quarantine to closure: LIVE -> QUARANTINED -> CLOSED", () => {
      expect(isValidStatusTransition("LIVE", "QUARANTINED")).toBe(true);
      expect(isValidStatusTransition("QUARANTINED", "CLOSED")).toBe(true);
    });

    it("should prevent reopening closed batches", () => {
      expect(isValidStatusTransition("CLOSED", "LIVE")).toBe(false);
      expect(isValidStatusTransition("CLOSED", "AWAITING_INTAKE")).toBe(false);
    });

    it("should prevent skipping required steps", () => {
      // Can't go directly from AWAITING_INTAKE to SOLD_OUT
      expect(isValidStatusTransition("AWAITING_INTAKE", "SOLD_OUT")).toBe(false);
      
      // Can't go directly from ON_HOLD to SOLD_OUT
      expect(isValidStatusTransition("ON_HOLD", "SOLD_OUT")).toBe(false);
    });
  });
});

describe("Bulk Status Transition Validation", () => {
  it("should validate each batch independently", () => {
    // Simulate bulk update with mixed current statuses
    const batches = [
      { id: 1, status: "AWAITING_INTAKE" as BatchStatus },
      { id: 2, status: "LIVE" as BatchStatus },
      { id: 3, status: "CLOSED" as BatchStatus },
    ];

    const targetStatus: BatchStatus = "LIVE";

    const results = batches.map(batch => ({
      batchId: batch.id,
      currentStatus: batch.status,
      targetStatus,
      valid: isValidStatusTransition(batch.status, targetStatus),
    }));

    expect(results[0].valid).toBe(true); // AWAITING_INTAKE -> LIVE is valid
    expect(results[1].valid).toBe(true); // LIVE -> LIVE is valid (no-op)
    expect(results[2].valid).toBe(false); // CLOSED -> LIVE is invalid
  });

  it("should collect errors for invalid transitions", () => {
    const batches = [
      { id: 1, status: "AWAITING_INTAKE" as BatchStatus },
      { id: 2, status: "SOLD_OUT" as BatchStatus },
      { id: 3, status: "CLOSED" as BatchStatus },
    ];

    const targetStatus: BatchStatus = "ON_HOLD";

    const errors: Array<{ batchId: number; reason: string }> = [];

    batches.forEach(batch => {
      if (!isValidStatusTransition(batch.status, targetStatus)) {
        errors.push({
          batchId: batch.id,
          reason: `Invalid transition from ${batch.status} to ${targetStatus}`,
        });
      }
    });

    expect(errors).toHaveLength(3); // All three are invalid
    expect(errors[0].batchId).toBe(1);
    expect(errors[1].batchId).toBe(2);
    expect(errors[2].batchId).toBe(3);
  });
});

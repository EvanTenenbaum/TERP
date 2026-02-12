/**
 * ST-017: Comprehensive Batch Status Transition Tests
 * Tests all valid and invalid status transitions for inventory batches
 */

import { describe, it, expect } from "vitest";
import inventoryUtils from "../inventoryUtils";
import type { BatchStatus } from "../inventoryUtils";

describe("Batch Status Transition Logic (ST-017)", () => {
  describe("Valid Transitions", () => {
    it("AWAITING_INTAKE → LIVE", () => {
      expect(
        inventoryUtils.isValidStatusTransition("AWAITING_INTAKE", "LIVE")
      ).toBe(true);
    });

    it("AWAITING_INTAKE → QUARANTINED", () => {
      expect(
        inventoryUtils.isValidStatusTransition("AWAITING_INTAKE", "QUARANTINED")
      ).toBe(true);
    });

    it("LIVE → PHOTOGRAPHY_COMPLETE", () => {
      expect(
        inventoryUtils.isValidStatusTransition("LIVE", "PHOTOGRAPHY_COMPLETE")
      ).toBe(true);
    });

    it("LIVE → ON_HOLD", () => {
      expect(inventoryUtils.isValidStatusTransition("LIVE", "ON_HOLD")).toBe(
        true
      );
    });

    it("LIVE → QUARANTINED", () => {
      expect(
        inventoryUtils.isValidStatusTransition("LIVE", "QUARANTINED")
      ).toBe(true);
    });

    it("LIVE → SOLD_OUT", () => {
      expect(inventoryUtils.isValidStatusTransition("LIVE", "SOLD_OUT")).toBe(
        true
      );
    });

    it("PHOTOGRAPHY_COMPLETE → LIVE", () => {
      expect(
        inventoryUtils.isValidStatusTransition("PHOTOGRAPHY_COMPLETE", "LIVE")
      ).toBe(true);
    });

    it("PHOTOGRAPHY_COMPLETE → ON_HOLD", () => {
      expect(
        inventoryUtils.isValidStatusTransition("PHOTOGRAPHY_COMPLETE", "ON_HOLD")
      ).toBe(true);
    });

    it("PHOTOGRAPHY_COMPLETE → QUARANTINED", () => {
      expect(
        inventoryUtils.isValidStatusTransition(
          "PHOTOGRAPHY_COMPLETE",
          "QUARANTINED"
        )
      ).toBe(true);
    });

    it("PHOTOGRAPHY_COMPLETE → SOLD_OUT", () => {
      expect(
        inventoryUtils.isValidStatusTransition("PHOTOGRAPHY_COMPLETE", "SOLD_OUT")
      ).toBe(true);
    });

    it("ON_HOLD → LIVE", () => {
      expect(inventoryUtils.isValidStatusTransition("ON_HOLD", "LIVE")).toBe(
        true
      );
    });

    it("ON_HOLD → QUARANTINED", () => {
      expect(
        inventoryUtils.isValidStatusTransition("ON_HOLD", "QUARANTINED")
      ).toBe(true);
    });

    it("QUARANTINED → LIVE", () => {
      expect(
        inventoryUtils.isValidStatusTransition("QUARANTINED", "LIVE")
      ).toBe(true);
    });

    it("QUARANTINED → ON_HOLD", () => {
      expect(
        inventoryUtils.isValidStatusTransition("QUARANTINED", "ON_HOLD")
      ).toBe(true);
    });

    it("QUARANTINED → CLOSED", () => {
      expect(
        inventoryUtils.isValidStatusTransition("QUARANTINED", "CLOSED")
      ).toBe(true);
    });

    it("SOLD_OUT → CLOSED", () => {
      expect(
        inventoryUtils.isValidStatusTransition("SOLD_OUT", "CLOSED")
      ).toBe(true);
    });

    it("Same status transition (idempotent)", () => {
      const statuses: BatchStatus[] = [
        "AWAITING_INTAKE",
        "LIVE",
        "PHOTOGRAPHY_COMPLETE",
        "ON_HOLD",
        "QUARANTINED",
        "SOLD_OUT",
        "CLOSED",
      ];

      statuses.forEach((status) => {
        expect(inventoryUtils.isValidStatusTransition(status, status)).toBe(
          true
        );
      });
    });
  });

  describe("Invalid Transitions", () => {
    it("CLOSED → any status (terminal state)", () => {
      const targetStatuses: BatchStatus[] = [
        "AWAITING_INTAKE",
        "LIVE",
        "PHOTOGRAPHY_COMPLETE",
        "ON_HOLD",
        "QUARANTINED",
        "SOLD_OUT",
      ];

      targetStatuses.forEach((target) => {
        expect(inventoryUtils.isValidStatusTransition("CLOSED", target)).toBe(
          false
        );
      });
    });

    it("SOLD_OUT → LIVE (cannot reactivate sold out)", () => {
      expect(inventoryUtils.isValidStatusTransition("SOLD_OUT", "LIVE")).toBe(
        false
      );
    });

    it("SOLD_OUT → ON_HOLD (cannot hold sold out)", () => {
      expect(
        inventoryUtils.isValidStatusTransition("SOLD_OUT", "ON_HOLD")
      ).toBe(false);
    });

    it("SOLD_OUT → QUARANTINED (cannot quarantine sold out)", () => {
      expect(
        inventoryUtils.isValidStatusTransition("SOLD_OUT", "QUARANTINED")
      ).toBe(false);
    });

    it("AWAITING_INTAKE → PHOTOGRAPHY_COMPLETE (must go LIVE first)", () => {
      expect(
        inventoryUtils.isValidStatusTransition(
          "AWAITING_INTAKE",
          "PHOTOGRAPHY_COMPLETE"
        )
      ).toBe(false);
    });

    it("AWAITING_INTAKE → ON_HOLD (must go LIVE first)", () => {
      expect(
        inventoryUtils.isValidStatusTransition("AWAITING_INTAKE", "ON_HOLD")
      ).toBe(false);
    });

    it("AWAITING_INTAKE → SOLD_OUT (must go LIVE first)", () => {
      expect(
        inventoryUtils.isValidStatusTransition("AWAITING_INTAKE", "SOLD_OUT")
      ).toBe(false);
    });

    it("AWAITING_INTAKE → CLOSED (must go through proper lifecycle)", () => {
      expect(
        inventoryUtils.isValidStatusTransition("AWAITING_INTAKE", "CLOSED")
      ).toBe(false);
    });

    it("LIVE → CLOSED (must go through SOLD_OUT or QUARANTINED)", () => {
      expect(inventoryUtils.isValidStatusTransition("LIVE", "CLOSED")).toBe(
        false
      );
    });

    it("PHOTOGRAPHY_COMPLETE → CLOSED (must go through proper path)", () => {
      expect(
        inventoryUtils.isValidStatusTransition("PHOTOGRAPHY_COMPLETE", "CLOSED")
      ).toBe(false);
    });

    it("ON_HOLD → SOLD_OUT (must return to LIVE first)", () => {
      expect(
        inventoryUtils.isValidStatusTransition("ON_HOLD", "SOLD_OUT")
      ).toBe(false);
    });

    it("ON_HOLD → CLOSED (must go through proper path)", () => {
      expect(inventoryUtils.isValidStatusTransition("ON_HOLD", "CLOSED")).toBe(
        false
      );
    });

    it("ON_HOLD → PHOTOGRAPHY_COMPLETE (invalid path)", () => {
      expect(
        inventoryUtils.isValidStatusTransition("ON_HOLD", "PHOTOGRAPHY_COMPLETE")
      ).toBe(false);
    });

    it("QUARANTINED → SOLD_OUT (cannot sell quarantined)", () => {
      expect(
        inventoryUtils.isValidStatusTransition("QUARANTINED", "SOLD_OUT")
      ).toBe(false);
    });

    it("QUARANTINED → PHOTOGRAPHY_COMPLETE (invalid path)", () => {
      expect(
        inventoryUtils.isValidStatusTransition(
          "QUARANTINED",
          "PHOTOGRAPHY_COMPLETE"
        )
      ).toBe(false);
    });
  });

  describe("getAllowedNextStatuses", () => {
    it("AWAITING_INTAKE has 2 allowed next statuses", () => {
      const allowed = inventoryUtils.getAllowedNextStatuses("AWAITING_INTAKE");
      expect(allowed).toHaveLength(2);
      expect(allowed).toContain("LIVE");
      expect(allowed).toContain("QUARANTINED");
    });

    it("LIVE has 4 allowed next statuses", () => {
      const allowed = inventoryUtils.getAllowedNextStatuses("LIVE");
      expect(allowed).toHaveLength(4);
      expect(allowed).toContain("PHOTOGRAPHY_COMPLETE");
      expect(allowed).toContain("ON_HOLD");
      expect(allowed).toContain("QUARANTINED");
      expect(allowed).toContain("SOLD_OUT");
    });

    it("CLOSED has no allowed next statuses (terminal)", () => {
      const allowed = inventoryUtils.getAllowedNextStatuses("CLOSED");
      expect(allowed).toHaveLength(0);
    });

    it("SOLD_OUT has only CLOSED as next status", () => {
      const allowed = inventoryUtils.getAllowedNextStatuses("SOLD_OUT");
      expect(allowed).toHaveLength(1);
      expect(allowed).toContain("CLOSED");
    });
  });

  describe("Business Rules", () => {
    it("Lifecycle: AWAITING_INTAKE → LIVE → SOLD_OUT → CLOSED", () => {
      expect(
        inventoryUtils.isValidStatusTransition("AWAITING_INTAKE", "LIVE")
      ).toBe(true);
      expect(inventoryUtils.isValidStatusTransition("LIVE", "SOLD_OUT")).toBe(
        true
      );
      expect(
        inventoryUtils.isValidStatusTransition("SOLD_OUT", "CLOSED")
      ).toBe(true);
    });

    it("Lifecycle: AWAITING_INTAKE → QUARANTINED → CLOSED", () => {
      expect(
        inventoryUtils.isValidStatusTransition("AWAITING_INTAKE", "QUARANTINED")
      ).toBe(true);
      expect(
        inventoryUtils.isValidStatusTransition("QUARANTINED", "CLOSED")
      ).toBe(true);
    });

    it("Lifecycle: LIVE → PHOTOGRAPHY_COMPLETE → SOLD_OUT → CLOSED", () => {
      expect(
        inventoryUtils.isValidStatusTransition("LIVE", "PHOTOGRAPHY_COMPLETE")
      ).toBe(true);
      expect(
        inventoryUtils.isValidStatusTransition("PHOTOGRAPHY_COMPLETE", "SOLD_OUT")
      ).toBe(true);
      expect(
        inventoryUtils.isValidStatusTransition("SOLD_OUT", "CLOSED")
      ).toBe(true);
    });

    it("Recovery: QUARANTINED → LIVE (can recover from quarantine)", () => {
      expect(
        inventoryUtils.isValidStatusTransition("QUARANTINED", "LIVE")
      ).toBe(true);
    });

    it("Recovery: ON_HOLD → LIVE (can release from hold)", () => {
      expect(inventoryUtils.isValidStatusTransition("ON_HOLD", "LIVE")).toBe(
        true
      );
    });

    it("Reversibility: LIVE ↔ PHOTOGRAPHY_COMPLETE", () => {
      expect(
        inventoryUtils.isValidStatusTransition("LIVE", "PHOTOGRAPHY_COMPLETE")
      ).toBe(true);
      expect(
        inventoryUtils.isValidStatusTransition("PHOTOGRAPHY_COMPLETE", "LIVE")
      ).toBe(true);
    });
  });
});

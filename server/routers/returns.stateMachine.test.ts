/**
 * Return Status State Machine Tests
 * SM-003: Unit tests for return status transitions
 */

import { describe, it, expect } from "vitest";
import {
  RETURN_STATUS_TRANSITIONS,
  extractReturnStatus,
  isValidReturnStatusTransition,
  getReturnTransitionError,
} from "./returns";

describe("Return Status State Machine (SM-003)", () => {
  describe("RETURN_STATUS_TRANSITIONS", () => {
    it("should define all expected statuses", () => {
      const expectedStatuses = [
        "PENDING",
        "APPROVED",
        "REJECTED",
        "RECEIVED",
        "PROCESSED",
        "CANCELLED",
      ];
      expectedStatuses.forEach(status => {
        expect(RETURN_STATUS_TRANSITIONS[status]).toBeDefined();
      });
    });

    it("should have PENDING allow APPROVED, REJECTED, CANCELLED", () => {
      expect(RETURN_STATUS_TRANSITIONS["PENDING"]).toContain("APPROVED");
      expect(RETURN_STATUS_TRANSITIONS["PENDING"]).toContain("REJECTED");
      expect(RETURN_STATUS_TRANSITIONS["PENDING"]).toContain("CANCELLED");
    });

    it("should have APPROVED allow RECEIVED, CANCELLED", () => {
      expect(RETURN_STATUS_TRANSITIONS["APPROVED"]).toContain("RECEIVED");
      expect(RETURN_STATUS_TRANSITIONS["APPROVED"]).toContain("CANCELLED");
    });

    it("should have RECEIVED allow PROCESSED, CANCELLED", () => {
      expect(RETURN_STATUS_TRANSITIONS["RECEIVED"]).toContain("PROCESSED");
      expect(RETURN_STATUS_TRANSITIONS["RECEIVED"]).toContain("CANCELLED");
    });

    it("should have terminal states with empty arrays", () => {
      expect(RETURN_STATUS_TRANSITIONS["REJECTED"]).toEqual([]);
      expect(RETURN_STATUS_TRANSITIONS["PROCESSED"]).toEqual([]);
      expect(RETURN_STATUS_TRANSITIONS["CANCELLED"]).toEqual([]);
    });
  });

  describe("extractReturnStatus", () => {
    it("should return PENDING for null notes", () => {
      expect(extractReturnStatus(null)).toBe("PENDING");
    });

    it("should return PENDING for empty notes", () => {
      expect(extractReturnStatus("")).toBe("PENDING");
    });

    it("should return PENDING for notes without status markers", () => {
      expect(extractReturnStatus("Customer requested return")).toBe("PENDING");
    });

    it("should extract APPROVED status from notes", () => {
      expect(extractReturnStatus("[APPROVED] by admin on 2026-01-26")).toBe(
        "APPROVED"
      );
    });

    it("should extract REJECTED status from notes", () => {
      expect(
        extractReturnStatus("[REJECTED] - item not eligible for return")
      ).toBe("REJECTED");
    });

    it("should extract RECEIVED status from notes", () => {
      expect(
        extractReturnStatus(
          "[APPROVED] [RECEIVED] items checked into warehouse"
        )
      ).toBe("RECEIVED");
    });

    it("should extract PROCESSED status from notes", () => {
      expect(
        extractReturnStatus(
          "[APPROVED] [RECEIVED] [PROCESSED] credit issued to customer"
        )
      ).toBe("PROCESSED");
    });

    it("should extract CANCELLED status from notes", () => {
      expect(
        extractReturnStatus("[APPROVED] [CANCELLED] customer changed mind")
      ).toBe("CANCELLED");
    });

    it("should return most recent status when multiple present", () => {
      // PROCESSED is later in workflow than APPROVED/RECEIVED
      const notes =
        "[APPROVED] by manager [RECEIVED] at warehouse [PROCESSED] credit issued";
      expect(extractReturnStatus(notes)).toBe("PROCESSED");
    });
  });

  describe("isValidReturnStatusTransition", () => {
    // Valid transitions from PENDING
    it("should allow PENDING -> APPROVED", () => {
      expect(isValidReturnStatusTransition("PENDING", "APPROVED")).toBe(true);
    });

    it("should allow PENDING -> REJECTED", () => {
      expect(isValidReturnStatusTransition("PENDING", "REJECTED")).toBe(true);
    });

    it("should allow PENDING -> CANCELLED", () => {
      expect(isValidReturnStatusTransition("PENDING", "CANCELLED")).toBe(true);
    });

    // Valid transitions from APPROVED
    it("should allow APPROVED -> RECEIVED", () => {
      expect(isValidReturnStatusTransition("APPROVED", "RECEIVED")).toBe(true);
    });

    it("should allow APPROVED -> CANCELLED", () => {
      expect(isValidReturnStatusTransition("APPROVED", "CANCELLED")).toBe(true);
    });

    // Valid transitions from RECEIVED
    it("should allow RECEIVED -> PROCESSED", () => {
      expect(isValidReturnStatusTransition("RECEIVED", "PROCESSED")).toBe(true);
    });

    it("should allow RECEIVED -> CANCELLED", () => {
      expect(isValidReturnStatusTransition("RECEIVED", "CANCELLED")).toBe(true);
    });

    // Invalid transitions - backwards
    it("should NOT allow APPROVED -> PENDING (backwards)", () => {
      expect(isValidReturnStatusTransition("APPROVED", "PENDING")).toBe(false);
    });

    it("should NOT allow RECEIVED -> APPROVED (backwards)", () => {
      expect(isValidReturnStatusTransition("RECEIVED", "APPROVED")).toBe(false);
    });

    it("should NOT allow PROCESSED -> RECEIVED (backwards)", () => {
      expect(isValidReturnStatusTransition("PROCESSED", "RECEIVED")).toBe(
        false
      );
    });

    // Invalid transitions - skipping steps
    it("should NOT allow PENDING -> RECEIVED (skip approval)", () => {
      expect(isValidReturnStatusTransition("PENDING", "RECEIVED")).toBe(false);
    });

    it("should NOT allow PENDING -> PROCESSED (skip steps)", () => {
      expect(isValidReturnStatusTransition("PENDING", "PROCESSED")).toBe(false);
    });

    it("should NOT allow APPROVED -> PROCESSED (skip receiving)", () => {
      expect(isValidReturnStatusTransition("APPROVED", "PROCESSED")).toBe(
        false
      );
    });

    // Terminal states
    it("should NOT allow any transitions from REJECTED", () => {
      expect(isValidReturnStatusTransition("REJECTED", "PENDING")).toBe(false);
      expect(isValidReturnStatusTransition("REJECTED", "APPROVED")).toBe(false);
      expect(isValidReturnStatusTransition("REJECTED", "CANCELLED")).toBe(
        false
      );
    });

    it("should NOT allow any transitions from PROCESSED", () => {
      expect(isValidReturnStatusTransition("PROCESSED", "RECEIVED")).toBe(
        false
      );
      expect(isValidReturnStatusTransition("PROCESSED", "CANCELLED")).toBe(
        false
      );
    });

    it("should NOT allow any transitions from CANCELLED", () => {
      expect(isValidReturnStatusTransition("CANCELLED", "PENDING")).toBe(false);
      expect(isValidReturnStatusTransition("CANCELLED", "APPROVED")).toBe(
        false
      );
    });

    // Unknown status
    it("should return false for unknown current status", () => {
      expect(isValidReturnStatusTransition("UNKNOWN", "APPROVED")).toBe(false);
    });
  });

  describe("getReturnTransitionError", () => {
    it("should return terminal state message for REJECTED", () => {
      const error = getReturnTransitionError("REJECTED", "APPROVED");
      expect(error).toContain("terminal state");
      expect(error).toContain("REJECTED");
    });

    it("should return terminal state message for PROCESSED", () => {
      const error = getReturnTransitionError("PROCESSED", "RECEIVED");
      expect(error).toContain("terminal state");
      expect(error).toContain("PROCESSED");
    });

    it("should return terminal state message for CANCELLED", () => {
      const error = getReturnTransitionError("CANCELLED", "PENDING");
      expect(error).toContain("terminal state");
      expect(error).toContain("CANCELLED");
    });

    it("should list valid transitions for non-terminal state", () => {
      const error = getReturnTransitionError("PENDING", "PROCESSED");
      expect(error).toContain("Invalid");
      expect(error).toContain("PENDING");
      expect(error).toContain("PROCESSED");
      expect(error).toContain("APPROVED");
      expect(error).toContain("REJECTED");
      expect(error).toContain("CANCELLED");
    });

    it("should list valid transitions for APPROVED", () => {
      const error = getReturnTransitionError("APPROVED", "PROCESSED");
      expect(error).toContain("RECEIVED");
      expect(error).toContain("CANCELLED");
    });
  });
});

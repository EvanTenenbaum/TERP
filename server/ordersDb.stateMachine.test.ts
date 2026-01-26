/**
 * Orders DB State Machine Tests
 * SM-001/SM-002: Unit tests for quote and sale status transitions
 */

import { describe, it, expect } from "vitest";
import {
  isValidStatusTransition,
  getTransitionError,
  getValidSaleStatusTransitions,
} from "./ordersDb";

describe("Quote Status State Machine (SM-001)", () => {
  describe("isValidStatusTransition for quotes", () => {
    // Valid transitions from DRAFT
    it("should allow DRAFT -> SENT", () => {
      expect(isValidStatusTransition("quote", "DRAFT", "SENT")).toBe(true);
    });

    it("should allow DRAFT -> ACCEPTED", () => {
      expect(isValidStatusTransition("quote", "DRAFT", "ACCEPTED")).toBe(true);
    });

    it("should allow DRAFT -> REJECTED", () => {
      expect(isValidStatusTransition("quote", "DRAFT", "REJECTED")).toBe(true);
    });

    it("should allow DRAFT -> EXPIRED", () => {
      expect(isValidStatusTransition("quote", "DRAFT", "EXPIRED")).toBe(true);
    });

    // Valid transitions from SENT
    it("should allow SENT -> ACCEPTED", () => {
      expect(isValidStatusTransition("quote", "SENT", "ACCEPTED")).toBe(true);
    });

    it("should allow SENT -> REJECTED", () => {
      expect(isValidStatusTransition("quote", "SENT", "REJECTED")).toBe(true);
    });

    it("should allow SENT -> EXPIRED", () => {
      expect(isValidStatusTransition("quote", "SENT", "EXPIRED")).toBe(true);
    });

    // Valid transitions from ACCEPTED
    it("should allow ACCEPTED -> CONVERTED", () => {
      expect(isValidStatusTransition("quote", "ACCEPTED", "CONVERTED")).toBe(
        true
      );
    });

    // Invalid transitions
    it("should NOT allow SENT -> DRAFT (backwards)", () => {
      expect(isValidStatusTransition("quote", "SENT", "DRAFT")).toBe(false);
    });

    it("should NOT allow ACCEPTED -> SENT (backwards)", () => {
      expect(isValidStatusTransition("quote", "ACCEPTED", "SENT")).toBe(false);
    });

    it("should NOT allow DRAFT -> CONVERTED (skip acceptance)", () => {
      expect(isValidStatusTransition("quote", "DRAFT", "CONVERTED")).toBe(
        false
      );
    });

    it("should NOT allow SENT -> CONVERTED (skip acceptance)", () => {
      expect(isValidStatusTransition("quote", "SENT", "CONVERTED")).toBe(false);
    });

    // Terminal states
    it("should NOT allow transitions from REJECTED", () => {
      expect(isValidStatusTransition("quote", "REJECTED", "DRAFT")).toBe(false);
      expect(isValidStatusTransition("quote", "REJECTED", "SENT")).toBe(false);
      expect(isValidStatusTransition("quote", "REJECTED", "ACCEPTED")).toBe(
        false
      );
    });

    it("should NOT allow transitions from EXPIRED", () => {
      expect(isValidStatusTransition("quote", "EXPIRED", "DRAFT")).toBe(false);
      expect(isValidStatusTransition("quote", "EXPIRED", "SENT")).toBe(false);
    });

    it("should NOT allow transitions from CONVERTED", () => {
      expect(isValidStatusTransition("quote", "CONVERTED", "ACCEPTED")).toBe(
        false
      );
      expect(isValidStatusTransition("quote", "CONVERTED", "DRAFT")).toBe(
        false
      );
    });

    // Unknown status
    it("should return false for unknown status", () => {
      expect(isValidStatusTransition("quote", "UNKNOWN", "SENT")).toBe(false);
    });
  });
});

describe("Sale Status State Machine (SM-002)", () => {
  describe("isValidStatusTransition for sales", () => {
    // Valid transitions from PENDING
    it("should allow PENDING -> PARTIAL", () => {
      expect(isValidStatusTransition("sale", "PENDING", "PARTIAL")).toBe(true);
    });

    it("should allow PENDING -> PAID", () => {
      expect(isValidStatusTransition("sale", "PENDING", "PAID")).toBe(true);
    });

    it("should allow PENDING -> OVERDUE", () => {
      expect(isValidStatusTransition("sale", "PENDING", "OVERDUE")).toBe(true);
    });

    it("should allow PENDING -> CANCELLED", () => {
      expect(isValidStatusTransition("sale", "PENDING", "CANCELLED")).toBe(
        true
      );
    });

    // Valid transitions from PARTIAL
    it("should allow PARTIAL -> PAID", () => {
      expect(isValidStatusTransition("sale", "PARTIAL", "PAID")).toBe(true);
    });

    it("should allow PARTIAL -> OVERDUE", () => {
      expect(isValidStatusTransition("sale", "PARTIAL", "OVERDUE")).toBe(true);
    });

    it("should allow PARTIAL -> CANCELLED", () => {
      expect(isValidStatusTransition("sale", "PARTIAL", "CANCELLED")).toBe(
        true
      );
    });

    // Valid transitions from OVERDUE
    it("should allow OVERDUE -> PARTIAL", () => {
      expect(isValidStatusTransition("sale", "OVERDUE", "PARTIAL")).toBe(true);
    });

    it("should allow OVERDUE -> PAID", () => {
      expect(isValidStatusTransition("sale", "OVERDUE", "PAID")).toBe(true);
    });

    it("should allow OVERDUE -> CANCELLED", () => {
      expect(isValidStatusTransition("sale", "OVERDUE", "CANCELLED")).toBe(
        true
      );
    });

    // Invalid transitions
    it("should NOT allow PARTIAL -> PENDING (backwards)", () => {
      expect(isValidStatusTransition("sale", "PARTIAL", "PENDING")).toBe(false);
    });

    it("should NOT allow PENDING -> PENDING (self)", () => {
      expect(isValidStatusTransition("sale", "PENDING", "PENDING")).toBe(false);
    });

    // Terminal states
    it("should NOT allow transitions from PAID", () => {
      expect(isValidStatusTransition("sale", "PAID", "PENDING")).toBe(false);
      expect(isValidStatusTransition("sale", "PAID", "PARTIAL")).toBe(false);
      expect(isValidStatusTransition("sale", "PAID", "CANCELLED")).toBe(false);
    });

    it("should NOT allow transitions from CANCELLED", () => {
      expect(isValidStatusTransition("sale", "CANCELLED", "PENDING")).toBe(
        false
      );
      expect(isValidStatusTransition("sale", "CANCELLED", "PAID")).toBe(false);
    });

    // Unknown status
    it("should return false for unknown status", () => {
      expect(isValidStatusTransition("sale", "UNKNOWN", "PAID")).toBe(false);
    });
  });

  describe("getValidSaleStatusTransitions", () => {
    it("should return valid transitions for PENDING", () => {
      const transitions = getValidSaleStatusTransitions("PENDING");
      expect(transitions).toContain("PARTIAL");
      expect(transitions).toContain("PAID");
      expect(transitions).toContain("OVERDUE");
      expect(transitions).toContain("CANCELLED");
    });

    it("should return valid transitions for PARTIAL", () => {
      const transitions = getValidSaleStatusTransitions("PARTIAL");
      expect(transitions).toContain("PAID");
      expect(transitions).toContain("OVERDUE");
      expect(transitions).toContain("CANCELLED");
      expect(transitions).not.toContain("PENDING");
    });

    it("should return empty array for PAID (terminal)", () => {
      expect(getValidSaleStatusTransitions("PAID")).toEqual([]);
    });

    it("should return empty array for CANCELLED (terminal)", () => {
      expect(getValidSaleStatusTransitions("CANCELLED")).toEqual([]);
    });

    it("should return empty array for unknown status", () => {
      expect(getValidSaleStatusTransitions("UNKNOWN")).toEqual([]);
    });
  });

  describe("getTransitionError", () => {
    it("should return terminal state message for PAID", () => {
      const error = getTransitionError("sale", "PAID", "PENDING");
      expect(error).toContain("terminal state");
    });

    it("should return terminal state message for CANCELLED", () => {
      const error = getTransitionError("sale", "CANCELLED", "PENDING");
      expect(error).toContain("terminal state");
    });

    it("should list valid transitions for non-terminal state", () => {
      const error = getTransitionError("sale", "PENDING", "PAID_INVALID");
      expect(error).toContain("PENDING");
      expect(error).toContain("Invalid");
    });

    it("should work for quote status type", () => {
      const error = getTransitionError("quote", "REJECTED", "SENT");
      expect(error).toContain("terminal state");
    });
  });
});

describe("Fulfillment Status State Machine", () => {
  describe("isValidStatusTransition for fulfillment", () => {
    it("should allow PENDING -> PACKED", () => {
      expect(isValidStatusTransition("fulfillment", "PENDING", "PACKED")).toBe(
        true
      );
    });

    it("should allow PACKED -> SHIPPED", () => {
      expect(isValidStatusTransition("fulfillment", "PACKED", "SHIPPED")).toBe(
        true
      );
    });

    // ORD-003 fix verification
    it("should NOT allow PACKED -> PENDING (ORD-003)", () => {
      expect(isValidStatusTransition("fulfillment", "PACKED", "PENDING")).toBe(
        false
      );
    });

    it("should NOT allow transitions from CANCELLED", () => {
      expect(
        isValidStatusTransition("fulfillment", "CANCELLED", "PENDING")
      ).toBe(false);
    });
  });
});

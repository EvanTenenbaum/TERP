/**
 * Order State Machine Tests
 * SM-001/SM-002/SM-003/ORD-003: Unit tests for state machine validation
 */

import { describe, it, expect } from "vitest";
import {
  canTransition,
  getNextStatuses,
  isTerminalStatus,
  ORDER_STATUS_TRANSITIONS,
  FulfillmentStatus,
} from "./orderStateMachine";

describe("Order State Machine (ORD-003)", () => {
  describe("canTransition", () => {
    // Valid transitions
    it("should allow DRAFT -> CONFIRMED", () => {
      expect(canTransition("DRAFT", "CONFIRMED")).toBe(true);
    });

    it("should allow DRAFT -> CANCELLED", () => {
      expect(canTransition("DRAFT", "CANCELLED")).toBe(true);
    });

    it("should allow CONFIRMED -> PENDING", () => {
      expect(canTransition("CONFIRMED", "PENDING")).toBe(true);
    });

    it("should allow PENDING -> PACKED", () => {
      expect(canTransition("PENDING", "PACKED")).toBe(true);
    });

    it("should allow PACKED -> SHIPPED", () => {
      expect(canTransition("PACKED", "SHIPPED")).toBe(true);
    });

    it("should allow SHIPPED -> DELIVERED", () => {
      expect(canTransition("SHIPPED", "DELIVERED")).toBe(true);
    });

    it("should allow SHIPPED -> RETURNED", () => {
      expect(canTransition("SHIPPED", "RETURNED")).toBe(true);
    });

    it("should allow DELIVERED -> RETURNED", () => {
      expect(canTransition("DELIVERED", "RETURNED")).toBe(true);
    });

    it("should allow RETURNED -> RESTOCKED", () => {
      expect(canTransition("RETURNED", "RESTOCKED")).toBe(true);
    });

    it("should allow RETURNED -> RETURNED_TO_VENDOR", () => {
      expect(canTransition("RETURNED", "RETURNED_TO_VENDOR")).toBe(true);
    });

    // Invalid transitions (ORD-003 fix)
    it("should NOT allow PACKED -> PENDING (ORD-003 fix)", () => {
      expect(canTransition("PACKED", "PENDING")).toBe(false);
    });

    it("should NOT allow SHIPPED -> PACKED (backwards transition)", () => {
      expect(canTransition("SHIPPED", "PACKED")).toBe(false);
    });

    it("should NOT allow DELIVERED -> SHIPPED (backwards transition)", () => {
      expect(canTransition("DELIVERED", "SHIPPED")).toBe(false);
    });

    // Terminal states
    it("should NOT allow transitions from CANCELLED", () => {
      expect(canTransition("CANCELLED", "PENDING")).toBe(false);
      expect(canTransition("CANCELLED", "DRAFT")).toBe(false);
    });

    it("should NOT allow transitions from RESTOCKED", () => {
      expect(canTransition("RESTOCKED", "RETURNED")).toBe(false);
    });

    it("should NOT allow transitions from RETURNED_TO_VENDOR", () => {
      expect(canTransition("RETURNED_TO_VENDOR", "RETURNED")).toBe(false);
    });

    // Unknown status
    it("should return false for unknown status", () => {
      expect(canTransition("UNKNOWN", "PENDING")).toBe(false);
    });
  });

  describe("getNextStatuses", () => {
    it("should return valid next statuses for DRAFT", () => {
      const next = getNextStatuses("DRAFT");
      expect(next).toContain("CONFIRMED");
      expect(next).toContain("CANCELLED");
      expect(next).not.toContain("SHIPPED");
    });

    it("should return valid next statuses for PACKED", () => {
      const next = getNextStatuses("PACKED");
      expect(next).toContain("SHIPPED");
      expect(next).toContain("CANCELLED");
      // ORD-003: PENDING should not be allowed from PACKED
      expect(next).not.toContain("PENDING");
    });

    it("should return empty array for terminal states", () => {
      expect(getNextStatuses("CANCELLED")).toEqual([]);
      expect(getNextStatuses("RESTOCKED")).toEqual([]);
      expect(getNextStatuses("RETURNED_TO_VENDOR")).toEqual([]);
    });

    it("should return empty array for unknown status", () => {
      expect(getNextStatuses("UNKNOWN")).toEqual([]);
    });
  });

  describe("isTerminalStatus", () => {
    it("should return true for CANCELLED", () => {
      expect(isTerminalStatus("CANCELLED")).toBe(true);
    });

    it("should return true for RESTOCKED", () => {
      expect(isTerminalStatus("RESTOCKED")).toBe(true);
    });

    it("should return true for RETURNED_TO_VENDOR", () => {
      expect(isTerminalStatus("RETURNED_TO_VENDOR")).toBe(true);
    });

    it("should return false for non-terminal statuses", () => {
      expect(isTerminalStatus("DRAFT")).toBe(false);
      expect(isTerminalStatus("PENDING")).toBe(false);
      expect(isTerminalStatus("PACKED")).toBe(false);
      expect(isTerminalStatus("SHIPPED")).toBe(false);
    });

    it("should return false for unknown status", () => {
      expect(isTerminalStatus("UNKNOWN")).toBe(false);
    });
  });

  describe("ORDER_STATUS_TRANSITIONS completeness", () => {
    const allStatuses: FulfillmentStatus[] = [
      "DRAFT",
      "CONFIRMED",
      "PENDING",
      "PACKED",
      "SHIPPED",
      "DELIVERED",
      "RETURNED",
      "RESTOCKED",
      "RETURNED_TO_VENDOR",
      "CANCELLED",
    ];

    it("should define transitions for all statuses", () => {
      allStatuses.forEach(status => {
        expect(ORDER_STATUS_TRANSITIONS[status]).toBeDefined();
        expect(Array.isArray(ORDER_STATUS_TRANSITIONS[status])).toBe(true);
      });
    });

    it("should only reference valid statuses in transitions", () => {
      Object.entries(ORDER_STATUS_TRANSITIONS).forEach(
        ([_status, transitions]) => {
          transitions.forEach(nextStatus => {
            expect(allStatuses).toContain(nextStatus);
          });
        }
      );
    });
  });
});

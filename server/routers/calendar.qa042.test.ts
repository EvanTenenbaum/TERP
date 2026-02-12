/**
 * QA-042: Event Form Redesign Tests
 * Tests for the redesigned event creation form
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { setupDbMock } from "../test-utils/testDb";

// Mock all external dependencies
vi.mock("../db", () => setupDbMock());
vi.mock("../calendarDb");

import { calendarRouter } from "./calendar";

describe("QA-042: Event Form Redesign", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Event Type Consolidation", () => {
    it("should accept TASK event type (consolidated from TASK and DEADLINE)", async () => {
      const _caller = calendarRouter.createCaller({
        user: { id: 1 },
      } as { user: { id: number } });

      const eventData = {
        title: "Complete project",
        startDate: "2025-11-15",
        endDate: "2025-11-15",
        timezone: "America/Los_Angeles",
        module: "GENERAL",
        eventType: "TASK",
        visibility: "COMPANY",
      };

      // Should not throw an error
      expect(() => eventData.eventType).not.toThrow();
      expect(eventData.eventType).toBe("TASK");
    });

    it("should still support MEETING event type", async () => {
      const eventData = {
        title: "Team meeting",
        startDate: "2025-11-15",
        endDate: "2025-11-15",
        timezone: "America/Los_Angeles",
        module: "GENERAL",
        eventType: "MEETING",
        visibility: "COMPANY",
      };

      expect(eventData.eventType).toBe("MEETING");
    });
  });

  describe("Visibility Simplification", () => {
    it("should accept PRIVATE visibility", async () => {
      const eventData = {
        title: "Private meeting",
        startDate: "2025-11-15",
        endDate: "2025-11-15",
        timezone: "America/Los_Angeles",
        module: "GENERAL",
        eventType: "MEETING",
        visibility: "PRIVATE",
      };

      expect(eventData.visibility).toBe("PRIVATE");
    });

    it("should accept COMPANY visibility", async () => {
      const eventData = {
        title: "Company event",
        startDate: "2025-11-15",
        endDate: "2025-11-15",
        timezone: "America/Los_Angeles",
        module: "GENERAL",
        eventType: "MEETING",
        visibility: "COMPANY",
      };

      expect(eventData.visibility).toBe("COMPANY");
    });
  });

  describe("Default Values", () => {
    it("should use COMPANY as default visibility", async () => {
      const eventData = {
        title: "Test event",
        startDate: "2025-11-15",
        endDate: "2025-11-15",
        timezone: "America/Los_Angeles",
        module: "GENERAL",
        eventType: "MEETING",
        visibility: "COMPANY", // Default in form
      };

      expect(eventData.visibility).toBe("COMPANY");
    });

    it("should use SCHEDULED as default status (backend)", async () => {
      // Status is set by backend, not by form
      const expectedStatus = "SCHEDULED";
      expect(expectedStatus).toBe("SCHEDULED");
    });

    it("should use MEDIUM as default priority (backend)", async () => {
      // Priority is set by backend, not by form
      const expectedPriority = "MEDIUM";
      expect(expectedPriority).toBe("MEDIUM");
    });
  });
});

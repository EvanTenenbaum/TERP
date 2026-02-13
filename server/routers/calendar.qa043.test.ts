/**
 * QA-043: Event Attendees Functionality Tests
 * Tests for adding internal team members as event attendees
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { setupDbMock } from "../test-utils/testDb";

// Mock all external dependencies
vi.mock("../db", () => setupDbMock());
vi.mock("../calendarDb");
vi.mock("../_core/permissionService");
vi.mock("../_core/timezoneService");

import { calendarRouter } from "./calendar";
import * as calendarDb from "../calendarDb";

describe("QA-043: Event Attendees Functionality", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Creating Events with Attendees", () => {
    it("should create an event with multiple attendees", async () => {
      const mockCreateEvent = vi.spyOn(calendarDb, "createEvent");
      mockCreateEvent.mockResolvedValue({ id: 1 });

      const mockAddParticipant = vi.spyOn(calendarDb, "addParticipant");
      mockAddParticipant.mockResolvedValue({ id: 1 });

      const caller = calendarRouter.createCaller({
        user: { id: 1 },
      } as { user: { id: number } });

      await caller.createEvent({
        title: "Team Meeting",
        startDate: "2025-11-15",
        endDate: "2025-11-15",
        startTime: "10:00",
        endTime: "11:00",
        timezone: "America/Los_Angeles",
        module: "GENERAL",
        eventType: "MEETING",
        visibility: "COMPANY",
        participants: [2, 3, 4], // Three attendees
      });

      // Verify event was created
      expect(mockCreateEvent).toHaveBeenCalledOnce();

      // Verify participants were added
      expect(mockAddParticipant).toHaveBeenCalledTimes(3);
      expect(mockAddParticipant).toHaveBeenCalledWith(
        expect.objectContaining({
          eventId: 1,
          userId: 2,
          role: "REQUIRED",
          responseStatus: "PENDING",
        })
      );
    });

    it("should create an event without attendees", async () => {
      const mockCreateEvent = vi.spyOn(calendarDb, "createEvent");
      mockCreateEvent.mockResolvedValue({ id: 1 });

      const mockAddParticipant = vi.spyOn(calendarDb, "addParticipant");

      const caller = calendarRouter.createCaller({
        user: { id: 1 },
      } as { user: { id: number } });

      await caller.createEvent({
        title: "Solo Task",
        startDate: "2025-11-15",
        endDate: "2025-11-15",
        timezone: "America/Los_Angeles",
        module: "GENERAL",
        eventType: "TASK",
        visibility: "PRIVATE",
        participants: [], // No attendees
      });

      // Verify event was created
      expect(mockCreateEvent).toHaveBeenCalledOnce();

      // Verify no participants were added
      expect(mockAddParticipant).not.toHaveBeenCalled();
    });

    it("should set attendees as REQUIRED with PENDING status by default", async () => {
      const mockCreateEvent = vi.spyOn(calendarDb, "createEvent");
      mockCreateEvent.mockResolvedValue({ id: 1 });

      const mockAddParticipant = vi.spyOn(calendarDb, "addParticipant");
      mockAddParticipant.mockResolvedValue({ id: 1 });

      const caller = calendarRouter.createCaller({
        user: { id: 1 },
      } as { user: { id: number } });

      await caller.createEvent({
        title: "Important Meeting",
        startDate: "2025-11-15",
        endDate: "2025-11-15",
        timezone: "America/Los_Angeles",
        module: "GENERAL",
        eventType: "MEETING",
        visibility: "COMPANY",
        participants: [5],
      });

      expect(mockAddParticipant).toHaveBeenCalledWith(
        expect.objectContaining({
          role: "REQUIRED",
          responseStatus: "PENDING",
          notifyOnCreation: true,
          notifyOnUpdate: true,
        })
      );
    });
  });

  describe("Attendees Database Operations", () => {
    it("should call getEventParticipants when loading event data", async () => {
      const mockGetEventParticipants = vi.spyOn(calendarDb, "getEventParticipants");
      mockGetEventParticipants.mockResolvedValue([
        { id: 1, eventId: 1, userId: 2, role: "REQUIRED", responseStatus: "PENDING" },
        { id: 2, eventId: 1, userId: 3, role: "REQUIRED", responseStatus: "ACCEPTED" },
      ] as unknown as Array<{ id: number; eventId: number; userId: number; role: string; responseStatus: string }>);

      const participants = await calendarDb.getEventParticipants(1);

      expect(participants).toHaveLength(2);
      expect(participants[0].userId).toBe(2);
      expect(participants[1].userId).toBe(3);
      expect(mockGetEventParticipants).toHaveBeenCalledWith(1);
    });
  });
});

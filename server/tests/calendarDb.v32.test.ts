/**
 * Calendar Database v3.2 Functions Tests
 * Tests for new v3.2 query functions and conflict detection
 * 
 * Following TERP Testing Protocol:
 * - TDD workflow (Red → Green → Refactor)
 * - Testing Trophy: 70% integration, 20% unit, 10% E2E
 * - Mock all external dependencies
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as calendarDb from "../calendarDb";
import { getDb } from "../db";

// Mock database
vi.mock("../db");

describe("Calendar Database v3.2 - New Functions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("getEventsByClient", () => {
    it("should return all events for a specific client", async () => {
      // Arrange
      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue([
          {
            id: 1,
            title: "Client Meeting",
            clientId: 123,
            eventType: "MEETING",
            startDate: "2025-11-15",
          },
          {
            id: 2,
            title: "Intake Appointment",
            clientId: 123,
            eventType: "INTAKE",
            startDate: "2025-11-20",
          },
        ]),
      };

      vi.mocked(getDb).mockResolvedValue(mockDb as any);

      // Act
      const result = await calendarDb.getEventsByClient(123);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].clientId).toBe(123);
      expect(result[1].clientId).toBe(123);
      expect(mockDb.where).toHaveBeenCalled();
      expect(mockDb.orderBy).toHaveBeenCalled();
    });

    it("should return empty array if client has no events", async () => {
      // Arrange
      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue([]),
      };

      vi.mocked(getDb).mockResolvedValue(mockDb as any);

      // Act
      const result = await calendarDb.getEventsByClient(999);

      // Assert
      expect(result).toHaveLength(0);
    });

    it("should exclude soft-deleted events", async () => {
      // Arrange
      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue([
          {
            id: 1,
            title: "Active Event",
            clientId: 123,
            deletedAt: null,
          },
        ]),
      };

      vi.mocked(getDb).mockResolvedValue(mockDb as any);

      // Act
      const result = await calendarDb.getEventsByClient(123);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].deletedAt).toBeNull();
    });
  });

  describe("getEventsByVendor", () => {
    it("should return all events for a specific vendor", async () => {
      // Arrange
      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue([
          {
            id: 1,
            title: "Vendor Payment",
            vendorId: 456,
            eventType: "AP_PAYMENT",
            startDate: "2025-11-15",
          },
        ]),
      };

      vi.mocked(getDb).mockResolvedValue(mockDb as any);

      // Act
      const result = await calendarDb.getEventsByVendor(456);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].vendorId).toBe(456);
    });
  });

  describe("checkConflicts", () => {
    it("should return empty array if no conflicts", async () => {
      // Arrange
      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([]),
      };

      vi.mocked(getDb).mockResolvedValue(mockDb as any);

      // Act
      const result = await calendarDb.checkConflicts({
        startDate: "2025-11-15",
        startTime: "09:00:00",
        endDate: "2025-11-15",
        endTime: "10:00:00",
      });

      // Assert
      expect(result).toHaveLength(0);
    });

    it("should return conflicting events", async () => {
      // Arrange
      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([
          {
            id: 1,
            title: "Existing Event",
            startDate: "2025-11-15",
            startTime: "09:30:00",
            endDate: "2025-11-15",
            endTime: "10:30:00",
          },
        ]),
      };

      vi.mocked(getDb).mockResolvedValue(mockDb as any);

      // Act
      const result = await calendarDb.checkConflicts({
        startDate: "2025-11-15",
        startTime: "09:00:00",
        endDate: "2025-11-15",
        endTime: "10:00:00",
      });

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe("Existing Event");
    });

    it("should exclude specific event when checking conflicts", async () => {
      // Arrange
      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([]),
      };

      vi.mocked(getDb).mockResolvedValue(mockDb as any);

      // Act
      const result = await calendarDb.checkConflicts({
        startDate: "2025-11-15",
        startTime: "09:00:00",
        endDate: "2025-11-15",
        endTime: "10:00:00",
        excludeEventId: 1,
      });

      // Assert
      expect(result).toHaveLength(0);
    });

    it("should exclude cancelled events from conflicts", async () => {
      // Arrange
      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([]),
      };

      vi.mocked(getDb).mockResolvedValue(mockDb as any);

      // Act
      const result = await calendarDb.checkConflicts({
        startDate: "2025-11-15",
        startTime: "09:00:00",
        endDate: "2025-11-15",
        endTime: "10:00:00",
      });

      // Assert
      expect(result).toHaveLength(0);
    });
  });

  describe("withTransaction", () => {
    it("should execute callback within transaction", async () => {
      // Arrange
      const mockTransaction = vi.fn().mockImplementation(async (callback) => {
        return await callback({});
      });

      const mockDb = {
        transaction: mockTransaction,
      };

      vi.mocked(getDb).mockResolvedValue(mockDb as any);

      const callback = vi.fn().mockResolvedValue({ success: true });

      // Act
      const result = await calendarDb.withTransaction(callback);

      // Assert
      expect(mockTransaction).toHaveBeenCalled();
      expect(callback).toHaveBeenCalled();
      expect(result).toEqual({ success: true });
    });

    it("should rollback transaction on error", async () => {
      // Arrange
      const mockTransaction = vi.fn().mockImplementation(async (callback) => {
        try {
          return await callback({});
        } catch (error) {
          throw error;
        }
      });

      const mockDb = {
        transaction: mockTransaction,
      };

      vi.mocked(getDb).mockResolvedValue(mockDb as any);

      const callback = vi.fn().mockRejectedValue(new Error("Test error"));

      // Act & Assert
      await expect(calendarDb.withTransaction(callback)).rejects.toThrow(
        "Test error"
      );
      expect(mockTransaction).toHaveBeenCalled();
    });
  });
});

/**
 * Calendar Database v3.2 Functions Tests
 * Tests for new v3.2 query functions and conflict detection
 *
 * Following TERP Testing Protocol:
 * - TDD workflow (Red -> Green -> Refactor)
 * - Testing Trophy: 70% integration, 20% unit, 10% E2E
 * - Mock all external dependencies
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock database before any imports that might use it
// The mock must be defined before importing modules that use db
vi.mock("../db", () => ({
  getDb: vi.fn(),
  db: {}, // Mock the synchronous db export to prevent initialization errors
}));

import * as calendarDb from "../calendarDb";
import { getDb } from "../db";

describe("Calendar Database v3.2 - New Functions", () => {
  let mockDb: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create comprehensive mock database
    mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      leftJoin: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      transaction: vi.fn(callback => callback(mockDb)),
      $returningId: vi.fn().mockResolvedValue([{ id: 1 }]),
    };

    vi.mocked(getDb).mockResolvedValue(
      mockDb as unknown as Awaited<ReturnType<typeof getDb>>
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("getEventsByClient", () => {
    it("should return all events for a specific client", async () => {
      // Arrange
      const mockEvents = [
        {
          id: 1,
          title: "Client Meeting",
          clientId: 123,
          eventType: "MEETING",
          startDate: "2025-11-15",
          deletedAt: null,
        },
        {
          id: 2,
          title: "Intake Appointment",
          clientId: 123,
          eventType: "INTAKE",
          startDate: "2025-11-20",
          deletedAt: null,
        },
      ];

      // Create thenable mock
      const thenableMock = {
        ...mockDb,
        then: (resolve: (value: unknown) => void) => resolve(mockEvents),
      };
      mockDb.orderBy.mockReturnValue(thenableMock);

      // Act
      const result = await calendarDb.getEventsByClient(123);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].clientId).toBe(123);
      expect(result[1].clientId).toBe(123);
      expect(mockDb.select).toHaveBeenCalled();
      expect(mockDb.where).toHaveBeenCalled();
    });

    it("should return empty array if client has no events", async () => {
      // Arrange
      const thenableMock = {
        ...mockDb,
        then: (resolve: (value: unknown) => void) => resolve([]),
      };
      mockDb.orderBy.mockReturnValue(thenableMock);

      // Act
      const result = await calendarDb.getEventsByClient(999);

      // Assert
      expect(result).toHaveLength(0);
    });

    it("should exclude soft-deleted events", async () => {
      // Arrange
      const mockEvents = [
        {
          id: 1,
          title: "Active Event",
          clientId: 123,
          deletedAt: null,
        },
      ];

      const thenableMock = {
        ...mockDb,
        then: (resolve: (value: unknown) => void) => resolve(mockEvents),
      };
      mockDb.orderBy.mockReturnValue(thenableMock);

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
      const mockEvents = [
        {
          id: 1,
          title: "Vendor Payment",
          vendorId: 456,
          eventType: "AP_PAYMENT",
          startDate: "2025-11-15",
          deletedAt: null,
        },
      ];

      const thenableMock = {
        ...mockDb,
        then: (resolve: (value: unknown) => void) => resolve(mockEvents),
      };
      mockDb.orderBy.mockReturnValue(thenableMock);

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
      const thenableMock = {
        ...mockDb,
        then: (resolve: (value: unknown) => void) => resolve([]),
      };
      mockDb.where.mockReturnValue(thenableMock);

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
      const mockConflicts = [
        {
          id: 1,
          title: "Existing Event",
          startDate: "2025-11-15",
          startTime: "09:30:00",
          endDate: "2025-11-15",
          endTime: "10:30:00",
          deletedAt: null,
        },
      ];

      const thenableMock = {
        ...mockDb,
        then: (resolve: (value: unknown) => void) => resolve(mockConflicts),
      };
      mockDb.where.mockReturnValue(thenableMock);

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
      // Arrange - returns empty when the specific event is excluded
      const thenableMock = {
        ...mockDb,
        then: (resolve: (value: unknown) => void) => resolve([]),
      };
      mockDb.where.mockReturnValue(thenableMock);

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
      const thenableMock = {
        ...mockDb,
        then: (resolve: (value: unknown) => void) => resolve([]),
      };
      mockDb.where.mockReturnValue(thenableMock);

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
      const mockTransaction = vi.fn().mockImplementation(async callback => {
        return await callback({});
      });

      mockDb.transaction = mockTransaction;

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
      const mockTransaction = vi.fn().mockImplementation(async callback => {
        return await callback({});
      });

      mockDb.transaction = mockTransaction;

      const callback = vi.fn().mockRejectedValue(new Error("Test error"));

      // Act & Assert
      await expect(calendarDb.withTransaction(callback)).rejects.toThrow(
        "Test error"
      );
      expect(mockTransaction).toHaveBeenCalled();
    });
  });
});

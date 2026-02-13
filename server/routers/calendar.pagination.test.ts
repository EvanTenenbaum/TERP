import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { setupDbMock } from "../test-utils/testDb";
import { setupPermissionMock } from "../test-utils/testPermissions";

// Mock the database (MUST be before other imports)
vi.mock("../db", () => setupDbMock());

// Mock permission service (MUST be before other imports)
vi.mock("../services/permissionService", () => setupPermissionMock());

import { calendarRouter } from "./calendar";
import { getDb } from "../db";
import PermissionService from "../_core/permissionService";

describe("Calendar Router - Pagination", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("getEvents with Pagination", () => {
    it("should support limit parameter to restrict number of results", async () => {
      // Arrange
      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockReturnThis(),
      };

      vi.mocked(getDb).mockResolvedValue(mockDb as unknown as Awaited<ReturnType<typeof getDb>>);

      // Create 50 mock events
      const mockEvents = Array.from({ length: 50 }, (_, i) => ({
        id: i + 1,
        title: `Event ${i + 1}`,
        startDate: "2025-11-01",
        endDate: "2025-11-01",
        createdBy: 1,
        visibility: "COMPANY",
        deletedAt: null,
      }));

      // Mock database query chain
      mockDb.where.mockReturnValueOnce(mockDb); // First where for events
      mockDb.limit.mockReturnValueOnce(mockDb);
      mockDb.offset.mockResolvedValueOnce(mockEvents.slice(0, 10));
      mockDb.where.mockResolvedValueOnce([]); // Second where for instances

      // Mock batch permission checking - all events visible
      const batchCheckSpy = vi.spyOn(PermissionService, "batchCheckPermissions");
      const permissionMap = Object.fromEntries(
        mockEvents.slice(0, 10).map((e) => [e.id, true])
      );
      batchCheckSpy.mockResolvedValue(permissionMap);

      const caller = calendarRouter.createCaller({
        user: { id: 1 },
      } as { user: { id: number } });

      // Act
      const result = await caller.getEvents({
        startDate: "2025-11-01",
        endDate: "2025-11-30",
        limit: 10,
      });

      // Assert
      expect(mockDb.limit).toHaveBeenCalledWith(10);
      expect(result).toHaveLength(10);
      expect(result[0].id).toBe(1);
      expect(result[9].id).toBe(10);
    });

    it("should support offset parameter for pagination", async () => {
      // Arrange
      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockReturnThis(),
      };

      vi.mocked(getDb).mockResolvedValue(mockDb as unknown as Awaited<ReturnType<typeof getDb>>);

      // Create 50 mock events
      const mockEvents = Array.from({ length: 50 }, (_, i) => ({
        id: i + 1,
        title: `Event ${i + 1}`,
        startDate: "2025-11-01",
        endDate: "2025-11-01",
        createdBy: 1,
        visibility: "COMPANY",
        deletedAt: null,
      }));

      // Mock database query chain
      mockDb.where.mockReturnValueOnce(mockDb); // First where for events
      mockDb.limit.mockReturnValueOnce(mockDb);
      mockDb.offset.mockResolvedValueOnce(mockEvents.slice(10, 20));
      mockDb.where.mockResolvedValueOnce([]); // Second where for instances

      // Mock batch permission checking
      const batchCheckSpy = vi.spyOn(PermissionService, "batchCheckPermissions");
      const permissionMap = Object.fromEntries(
        mockEvents.slice(10, 20).map((e) => [e.id, true])
      );
      batchCheckSpy.mockResolvedValue(permissionMap);

      const caller = calendarRouter.createCaller({
        user: { id: 1 },
      } as { user: { id: number } });

      // Act
      const result = await caller.getEvents({
        startDate: "2025-11-01",
        endDate: "2025-11-30",
        limit: 10,
        offset: 10,
      });

      // Assert
      expect(mockDb.limit).toHaveBeenCalledWith(10);
      expect(mockDb.offset).toHaveBeenCalledWith(10);
      expect(result).toHaveLength(10);
      expect(result[0].id).toBe(11);
      expect(result[9].id).toBe(20);
    });

    it("should return total count for pagination metadata", async () => {
      // Arrange
      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockReturnThis(),
      };

      vi.mocked(getDb).mockResolvedValue(mockDb as unknown as Awaited<ReturnType<typeof getDb>>);

      const mockEvents = Array.from({ length: 10 }, (_, i) => ({
        id: i + 1,
        title: `Event ${i + 1}`,
        startDate: "2025-11-01",
        endDate: "2025-11-01",
        createdBy: 1,
        visibility: "COMPANY",
        deletedAt: null,
      }));

      // First call for count
      mockDb.where.mockResolvedValueOnce([{ count: 50 }]);
      // Second call for limited results
      mockDb.where.mockReturnValueOnce(mockDb);
      mockDb.limit.mockReturnValueOnce(mockDb);
      mockDb.offset.mockResolvedValueOnce(mockEvents);
      // Third call for instances
      mockDb.where.mockResolvedValueOnce([]);

      const batchCheckSpy = vi.spyOn(PermissionService, "batchCheckPermissions");
      const permissionMap = Object.fromEntries(
        mockEvents.map((e) => [e.id, true])
      );
      batchCheckSpy.mockResolvedValue(permissionMap);

      const caller = calendarRouter.createCaller({
        user: { id: 1 },
      } as { user: { id: number } });

      // Act
      const result = await caller.getEvents({
        startDate: "2025-11-01",
        endDate: "2025-11-30",
        limit: 10,
        offset: 0,
        includeTotalCount: true,
      });

      // Assert
      expect(result).toHaveProperty("data");
      expect(result).toHaveProperty("pagination");
      expect(result.pagination.total).toBe(50);
      expect(result.pagination.limit).toBe(10);
      expect(result.pagination.offset).toBe(0);
      expect(result.pagination.hasMore).toBe(true);
    });

    it("should have default limit of 100 if not specified", async () => {
      // Arrange
      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockReturnThis(),
      };

      vi.mocked(getDb).mockResolvedValue(mockDb as unknown as Awaited<ReturnType<typeof getDb>>);

      const mockEvents = Array.from({ length: 100 }, (_, i) => ({
        id: i + 1,
        title: `Event ${i + 1}`,
        startDate: "2025-11-01",
        endDate: "2025-11-01",
        createdBy: 1,
        visibility: "COMPANY",
        deletedAt: null,
      }));

      // Mock database query chain
      mockDb.where.mockReturnValueOnce(mockDb);
      mockDb.limit.mockReturnValueOnce(mockDb);
      mockDb.offset.mockResolvedValueOnce(mockEvents);
      mockDb.where.mockResolvedValueOnce([]);

      const batchCheckSpy = vi.spyOn(PermissionService, "batchCheckPermissions");
      const permissionMap = Object.fromEntries(
        mockEvents.map((e) => [e.id, true])
      );
      batchCheckSpy.mockResolvedValue(permissionMap);

      const caller = calendarRouter.createCaller({
        user: { id: 1 },
      } as { user: { id: number } });

      // Act
      await caller.getEvents({
        startDate: "2025-11-01",
        endDate: "2025-11-30",
      });

      // Assert
      expect(mockDb.limit).toHaveBeenCalledWith(100);
    });

    it("should enforce maximum limit of 500", async () => {
      // Arrange
      const caller = calendarRouter.createCaller({
        user: { id: 1 },
      } as { user: { id: number } });

      // Act & Assert
      // Should throw validation error for limit > 500
      await expect(
        caller.getEvents({
          startDate: "2025-11-01",
          endDate: "2025-12-31",
          limit: 1000, // Try to request more than max
        })
      ).rejects.toThrow();
    });

    it("should work with existing filters (modules, eventTypes, etc.)", async () => {
      // Arrange
      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockReturnThis(),
      };

      vi.mocked(getDb).mockResolvedValue(mockDb as unknown as Awaited<ReturnType<typeof getDb>>);

      const mockEvents = [
        { id: 1, title: "Event 1", module: "INVENTORY", startDate: "2025-11-01", endDate: "2025-11-01", createdBy: 1, visibility: "COMPANY", deletedAt: null },
        { id: 2, title: "Event 2", module: "INVENTORY", startDate: "2025-11-02", endDate: "2025-11-02", createdBy: 1, visibility: "COMPANY", deletedAt: null },
      ];

      // Mock database query chain
      mockDb.where.mockReturnValueOnce(mockDb);
      mockDb.limit.mockReturnValueOnce(mockDb);
      mockDb.offset.mockResolvedValueOnce(mockEvents);
      mockDb.where.mockResolvedValueOnce([]);

      const batchCheckSpy = vi.spyOn(PermissionService, "batchCheckPermissions");
      batchCheckSpy.mockResolvedValue({ 1: true, 2: true });

      const caller = calendarRouter.createCaller({
        user: { id: 1 },
      } as { user: { id: number } });

      // Act
      await caller.getEvents({
        startDate: "2025-11-01",
        endDate: "2025-11-30",
        modules: ["INVENTORY"],
        limit: 10,
        offset: 0,
      });

      // Assert
      expect(mockDb.where).toHaveBeenCalled();
      expect(mockDb.limit).toHaveBeenCalledWith(10);
      expect(mockDb.offset).toHaveBeenCalledWith(0);
    });
  });
});
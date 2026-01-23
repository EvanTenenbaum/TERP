import { describe, it, expect, beforeAll, vi } from "vitest";
import { setupDbMock } from "../test-utils/testDb";
import { setupPermissionMock } from "../test-utils/testPermissions";

// Mock the database (MUST be before other imports)
vi.mock("../db", () => setupDbMock());

// Mock permission service (MUST be before other imports)
vi.mock("../services/permissionService", () => setupPermissionMock());

// Mock the strain service
vi.mock("../services/strainService");

import { appRouter } from "../routers";
import { createContext } from "../_core/context";
import { db } from "../db";
import { strainService } from "../services/strainService";

// Mock user for authenticated requests
const mockUser = {
  id: 1,
  email: "test@terp.com",
  name: "Test User",
};

// Create a test caller with mock context
const createCaller = async () => {
  const ctx = await createContext({
    req: { headers: {} } as any,
    res: {} as any,
  });

  return appRouter.createCaller({
    ...ctx,
    user: mockUser,
  });
};

describe("Analytics Router", () => {
  let caller: Awaited<ReturnType<typeof createCaller>>;

  beforeAll(async () => {
    caller = await createCaller();
  });

  describe("getSummary", () => {
    it("should retrieve summary analytics with real data", async () => {
      // Arrange - mock database responses
      const mockDb = db as any;
      mockDb.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ totalInventoryItems: 150 }]),
        }),
      });

      // For orders
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ totalOrders: 100, totalRevenue: "50000.00" }]),
        }),
      });

      // For clients
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ totalClients: 25 }]),
        }),
      });

      // For batches
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ totalInventoryItems: 150 }]),
        }),
      });

      // Act
      const result = await caller.analytics.getSummary();

      // Assert
      expect(result).toHaveProperty("totalRevenue");
      expect(result).toHaveProperty("totalOrders");
      expect(result).toHaveProperty("totalClients");
      expect(result).toHaveProperty("totalInventoryItems");
      expect(typeof result.totalRevenue).toBe("number");
      expect(typeof result.totalOrders).toBe("number");
      expect(typeof result.totalClients).toBe("number");
      expect(typeof result.totalInventoryItems).toBe("number");
    });

    it("should handle empty database gracefully", async () => {
      // Arrange - mock empty database
      const mockDb = db as any;
      mockDb.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ totalInventoryItems: 0 }]),
        }),
      });

      // For orders
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ totalOrders: 0, totalRevenue: null }]),
        }),
      });

      // For clients
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ totalClients: 0 }]),
        }),
      });

      // For batches
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ totalInventoryItems: 0 }]),
        }),
      });

      // Act
      const result = await caller.analytics.getSummary();

      // Assert - should return zeros, not throw
      expect(result.totalRevenue).toBe(0);
      expect(result.totalOrders).toBe(0);
      expect(result.totalClients).toBe(0);
      expect(result.totalInventoryItems).toBe(0);
    });
  });

  describe("clientStrainPreferences", () => {
    it("should retrieve client strain preferences", async () => {
      // Arrange
      const mockPreferences = {
        clientId: 1,
        topFamilies: [
          {
            familyId: 1,
            familyName: "OG Kush",
            orderCount: 25,
            totalQuantity: 500,
          },
          {
            familyId: 2,
            familyName: "Blue Dream",
            orderCount: 20,
            totalQuantity: 400,
          },
        ],
      };

      vi.mocked(strainService.getClientPreferences).mockResolvedValue(
        mockPreferences
      );

      // Act
      const result = await caller.analytics.clientStrainPreferences({
        clientId: 1,
      });

      // Assert
      expect(result).toEqual(mockPreferences);
      expect(strainService.getClientPreferences).toHaveBeenCalledWith(1);
    });

    it("should handle client with no preferences", async () => {
      // Arrange
      const mockEmptyPreferences = {
        clientId: 999,
        topFamilies: [],
      };

      vi.mocked(strainService.getClientPreferences).mockResolvedValue(
        mockEmptyPreferences
      );

      // Act
      const result = await caller.analytics.clientStrainPreferences({
        clientId: 999,
      });

      // Assert
      expect(result.topFamilies).toEqual([]);
    });
  });

  describe("topStrainFamilies", () => {
    it("should retrieve top strain families with default limit", async () => {
      // Arrange
      const mockTopFamilies = [
        {
          familyId: 1,
          familyName: "OG Kush",
          totalSales: 10000,
          orderCount: 50,
        },
        {
          familyId: 2,
          familyName: "Blue Dream",
          totalSales: 8000,
          orderCount: 40,
        },
      ];

      vi.mocked(strainService.getTopFamilies).mockResolvedValue(
        mockTopFamilies
      );

      // Act
      const result = await caller.analytics.topStrainFamilies({});

      // Assert
      expect(result).toEqual(mockTopFamilies);
      expect(strainService.getTopFamilies).toHaveBeenCalledWith(
        10,
        undefined,
        undefined
      );
    });

    it("should retrieve top strain families with custom limit", async () => {
      // Arrange
      const mockTopFamilies = [
        { familyId: 1, familyName: "OG Kush", totalSales: 10000 },
      ];

      vi.mocked(strainService.getTopFamilies).mockResolvedValue(
        mockTopFamilies
      );

      // Act
      const result = await caller.analytics.topStrainFamilies({ limit: 5 });

      // Assert
      expect(result).toHaveLength(1);
      expect(strainService.getTopFamilies).toHaveBeenCalledWith(
        5,
        undefined,
        undefined
      );
    });

    it("should filter by date range", async () => {
      // Arrange
      const startDate = new Date("2024-01-01");
      const endDate = new Date("2024-12-31");
      const mockTopFamilies = [
        { familyId: 1, familyName: "OG Kush", totalSales: 5000 },
      ];

      vi.mocked(strainService.getTopFamilies).mockResolvedValue(
        mockTopFamilies
      );

      // Act
      const result = await caller.analytics.topStrainFamilies({
        limit: 10,
        startDate,
        endDate,
      });

      // Assert
      expect(result).toEqual(mockTopFamilies);
      expect(strainService.getTopFamilies).toHaveBeenCalledWith(
        10,
        startDate,
        endDate
      );
    });
  });

  describe("strainFamilyTrends", () => {
    it("should retrieve strain family trends with default months", async () => {
      // Arrange
      const mockTrends = {
        familyId: 1,
        familyName: "OG Kush",
        trends: [
          { month: "2024-01", sales: 1000, orderCount: 10 },
          { month: "2024-02", sales: 1200, orderCount: 12 },
          { month: "2024-03", sales: 1100, orderCount: 11 },
        ],
      };

      vi.mocked(strainService.getFamilyTrends).mockResolvedValue(mockTrends);

      // Act
      const result = await caller.analytics.strainFamilyTrends({ familyId: 1 });

      // Assert
      expect(result).toEqual(mockTrends);
      expect(strainService.getFamilyTrends).toHaveBeenCalledWith(1, 6);
    });

    it("should retrieve strain family trends with custom months", async () => {
      // Arrange
      const mockTrends = {
        familyId: 2,
        familyName: "Blue Dream",
        trends: [{ month: "2024-01", sales: 800, orderCount: 8 }],
      };

      vi.mocked(strainService.getFamilyTrends).mockResolvedValue(mockTrends);

      // Act
      const result = await caller.analytics.strainFamilyTrends({
        familyId: 2,
        months: 12,
      });

      // Assert
      expect(result).toEqual(mockTrends);
      expect(strainService.getFamilyTrends).toHaveBeenCalledWith(2, 12);
    });

    it("should handle family with no trends", async () => {
      // Arrange
      const mockEmptyTrends = {
        familyId: 999,
        familyName: "Unknown",
        trends: [],
      };

      vi.mocked(strainService.getFamilyTrends).mockResolvedValue(
        mockEmptyTrends
      );

      // Act
      const result = await caller.analytics.strainFamilyTrends({
        familyId: 999,
      });

      // Assert
      expect(result.trends).toEqual([]);
    });
  });

  describe("Edge Cases", () => {
    it("should handle service error in clientStrainPreferences", async () => {
      // Arrange
      vi.mocked(strainService.getClientPreferences).mockRejectedValue(
        new Error("Database error")
      );

      // Act & Assert
      await expect(
        caller.analytics.clientStrainPreferences({ clientId: 1 })
      ).rejects.toThrow("Failed to get client preferences");
    });

    it("should handle service error in topStrainFamilies", async () => {
      // Arrange
      vi.mocked(strainService.getTopFamilies).mockRejectedValue(
        new Error("Database error")
      );

      // Act & Assert
      await expect(caller.analytics.topStrainFamilies({})).rejects.toThrow(
        "Failed to get top families"
      );
    });

    it("should handle service error in strainFamilyTrends", async () => {
      // Arrange
      vi.mocked(strainService.getFamilyTrends).mockRejectedValue(
        new Error("Database error")
      );

      // Act & Assert
      await expect(
        caller.analytics.strainFamilyTrends({ familyId: 1 })
      ).rejects.toThrow("Failed to get family trends");
    });
  });
});
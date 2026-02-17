/**
 * Integration Tests for Sales Sheets Router
 *
 * Tests all tRPC procedures in the salesSheets router.
 * Uses AAA (Arrange, Act, Assert) pattern for clarity.
 *
 * @module server/routers/salesSheets.test.ts
 */

import { describe, it, expect, beforeAll, vi } from "vitest";
import { setupDbMock } from "../test-utils/testDb";
import { setupPermissionMock } from "../test-utils/testPermissions";

// Mock the database (MUST be before other imports)
vi.mock("../db", () => setupDbMock());

// Mock permission service (MUST be before other imports)
vi.mock("../services/permissionService", () => setupPermissionMock());

// Mock the salesSheets module
vi.mock("../salesSheetsDb");

import { appRouter } from "../routers";
import { createMockContext } from "../../tests/unit/mocks/db.mock";
import * as salesSheetsDb from "../salesSheetsDb";

// Mock user for authenticated requests
const mockUser = {
  id: 1,
  email: "test@terp.com",
  name: "Test User",
};

// Create a test caller with mock context
const createCaller = () => {
  const ctx = createMockContext({ user: mockUser });
  return appRouter.createCaller(ctx);
};

describe("Sales Sheets Router", () => {
  let caller: ReturnType<typeof createCaller>;

  beforeAll(() => {
    caller = createCaller();
  });

  describe("getInventory", () => {
    it("should retrieve inventory with pricing for a client", async () => {
      // Arrange
      const mockInventory = [
        {
          id: 1,
          name: "OG Kush - Premium",
          category: "Flower",
          strain: "OG Kush",
          basePrice: 100,
          retailPrice: 150,
          quantity: 50,
          grade: "A+",
          priceMarkup: 50,
        },
        {
          id: 2,
          name: "Blue Dream - Standard",
          category: "Flower",
          strain: "Blue Dream",
          basePrice: 80,
          retailPrice: 120,
          quantity: 30,
          grade: "A",
          priceMarkup: 50,
        },
      ];

      vi.mocked(salesSheetsDb.getInventoryWithPricing).mockResolvedValue(
        mockInventory
      );

      // Act
      const result = await caller.salesSheets.getInventory({ clientId: 1 });

      // Assert
      expect(result).toEqual(mockInventory);
      expect(salesSheetsDb.getInventoryWithPricing).toHaveBeenCalledWith(1);
    });

    it("should handle client with no inventory", async () => {
      // Arrange
      vi.mocked(salesSheetsDb.getInventoryWithPricing).mockResolvedValue([]);

      // Act
      const result = await caller.salesSheets.getInventory({ clientId: 999 });

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe("save", () => {
    it("should save a sales sheet", async () => {
      // Arrange
      const input = {
        clientId: 1,
        items: [
          {
            id: 1,
            name: "OG Kush",
            basePrice: 100,
            retailPrice: 150,
            finalPrice: 150,
            quantity: 10,
            priceMarkup: 50,
          },
          {
            id: 2,
            name: "Blue Dream",
            basePrice: 80,
            retailPrice: 120,
            finalPrice: 120,
            quantity: 5,
            priceMarkup: 50,
          },
        ],
        totalValue: 270,
      };

      const mockSavedSheet = {
        id: 1,
        ...input,
        createdBy: 1,
        createdAt: new Date(),
      };

      vi.mocked(salesSheetsDb.saveSalesSheet).mockResolvedValue(mockSavedSheet);

      // Act
      const result = await caller.salesSheets.save(input);

      // Assert
      expect(result).toEqual(mockSavedSheet);
      expect(salesSheetsDb.saveSalesSheet).toHaveBeenCalledWith(
        expect.objectContaining({
          clientId: 1,
          items: input.items,
          totalValue: 270,
          createdBy: 1,
        })
      );
    });

    it("should use retailPrice when finalPrice is not provided", async () => {
      // Arrange
      const input = {
        clientId: 1,
        items: [
          {
            id: 1,
            name: "OG Kush",
            basePrice: 100,
            retailPrice: 150,
            quantity: 10,
            priceMarkup: 50,
          },
        ],
        totalValue: 150,
      };

      const mockSavedSheet = {
        id: 1,
        ...input,
        createdBy: 1,
      };

      vi.mocked(salesSheetsDb.saveSalesSheet).mockResolvedValue(mockSavedSheet);

      // Act
      const result = await caller.salesSheets.save(input);

      // Assert
      expect(result).toBeDefined();
    });

    it("should reject when total value mismatch", async () => {
      // Arrange
      const input = {
        clientId: 1,
        items: [
          {
            id: 1,
            name: "OG Kush",
            basePrice: 100,
            retailPrice: 150,
            finalPrice: 150,
            quantity: 10,
            priceMarkup: 50,
          },
        ],
        totalValue: 999, // Wrong total
      };

      // Act & Assert
      await expect(caller.salesSheets.save(input)).rejects.toThrow(
        "Total value mismatch"
      );
    });
  });

  describe("getHistory", () => {
    it("should retrieve sales sheet history for a client", async () => {
      // Arrange
      const mockHistory = [
        {
          id: 1,
          clientId: 1,
          totalValue: 500,
          createdAt: new Date("2024-01-15"),
          createdBy: 1,
        },
        {
          id: 2,
          clientId: 1,
          totalValue: 750,
          createdAt: new Date("2024-01-20"),
          createdBy: 1,
        },
      ];

      vi.mocked(salesSheetsDb.getSalesSheetHistory).mockResolvedValue(
        mockHistory
      );

      // Act
      const result = await caller.salesSheets.getHistory({ clientId: 1 });

      // Assert
      expect(result).toEqual(mockHistory);
      expect(salesSheetsDb.getSalesSheetHistory).toHaveBeenCalledWith(
        1,
        undefined
      );
    });

    it("should retrieve history with limit", async () => {
      // Arrange
      const mockHistory = [
        {
          id: 1,
          clientId: 1,
          totalValue: 500,
          createdAt: new Date(),
        },
      ];

      vi.mocked(salesSheetsDb.getSalesSheetHistory).mockResolvedValue(
        mockHistory
      );

      // Act
      const result = await caller.salesSheets.getHistory({
        clientId: 1,
        limit: 10,
      });

      // Assert
      expect(result).toHaveLength(1);
      expect(salesSheetsDb.getSalesSheetHistory).toHaveBeenCalledWith(1, 10);
    });

    it("should handle client with no history", async () => {
      // Arrange
      vi.mocked(salesSheetsDb.getSalesSheetHistory).mockResolvedValue([]);

      // Act
      const result = await caller.salesSheets.getHistory({ clientId: 999 });

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty items array validation", async () => {
      // Arrange
      const input = {
        clientId: 1,
        items: [],
        totalValue: 0,
      };

      // Act & Assert
      await expect(caller.salesSheets.save(input)).rejects.toThrow();
    });

    it("should handle large item count", async () => {
      // Arrange
      const items = Array.from({ length: 100 }, (_, i) => ({
        id: i + 1,
        name: `Product ${i + 1}`,
        basePrice: 10,
        retailPrice: 15,
        finalPrice: 15,
        quantity: 1,
        priceMarkup: 5,
      }));

      const input = {
        clientId: 1,
        items,
        totalValue: 1500,
      };

      const mockSavedSheet = {
        id: 1,
        ...input,
        createdBy: 1,
      };

      vi.mocked(salesSheetsDb.saveSalesSheet).mockResolvedValue(mockSavedSheet);

      // Act
      const result = await caller.salesSheets.save(input);

      // Assert
      expect(result.items).toHaveLength(100);
    });

    it("should handle zero quantity items", async () => {
      // Arrange
      const input = {
        clientId: 1,
        items: [
          {
            id: 1,
            name: "OG Kush",
            basePrice: 100,
            retailPrice: 150,
            finalPrice: 150,
            quantity: 0,
            priceMarkup: 50,
          },
        ],
        totalValue: 150,
      };

      const mockSavedSheet = {
        id: 1,
        ...input,
        createdBy: 1,
      };

      vi.mocked(salesSheetsDb.saveSalesSheet).mockResolvedValue(mockSavedSheet);

      // Act
      const result = await caller.salesSheets.save(input);

      // Assert
      expect(result.items[0].quantity).toBe(0);
    });
  });
});

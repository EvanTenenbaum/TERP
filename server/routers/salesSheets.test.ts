/**
 * Integration Tests for Sales Sheets Router
 *
 * Tests all tRPC procedures in the salesSheets router.
 * Uses AAA (Arrange, Act, Assert) pattern for clarity.
 *
 * @module server/routers/salesSheets.test.ts
 */

import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
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

const createPublicCaller = () => {
  const ctx = createMockContext({ user: null });
  return appRouter.createCaller(ctx);
};

describe("Sales Sheets Router", () => {
  let caller: ReturnType<typeof createCaller>;
  let publicCaller: ReturnType<typeof createPublicCaller>;

  beforeAll(() => {
    caller = createCaller();
    publicCaller = createPublicCaller();
  });

  beforeEach(() => {
    vi.clearAllMocks();
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
      // Arrange — totalValue = SUM(finalPrice * quantity) = 150*10 + 120*5 = 2100
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
        totalValue: 2100,
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
          totalValue: 2100,
          createdBy: 1,
        })
      );
    });

    it("should use retailPrice when finalPrice is not provided", async () => {
      // Arrange — totalValue = retailPrice * quantity = 150 * 10 = 1500
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

  describe("list", () => {
    it("should use the paginated sales sheet listing helper", async () => {
      // Arrange
      const mockSheets = [
        {
          id: 11,
          clientId: 4,
          items: [],
          totalValue: "1250.00",
          itemCount: 0,
          createdBy: 1,
          createdAt: new Date("2026-03-30T12:00:00Z"),
        },
      ];

      vi.mocked(salesSheetsDb.listSalesSheets).mockResolvedValue({
        sheets: mockSheets,
        total: 42,
      });

      // Act
      const result = await caller.salesSheets.list({
        limit: 10,
        offset: 20,
      });

      // Assert
      expect(result).toEqual({
        data: mockSheets,
        total: 42,
        limit: 10,
        offset: 20,
        hasMore: true,
      });
      expect(salesSheetsDb.listSalesSheets).toHaveBeenCalledWith(
        undefined,
        10,
        20
      );
      expect(salesSheetsDb.getSalesSheetHistory).not.toHaveBeenCalled();
    });
  });

  describe("getByToken", () => {
    it("should allow public access and sanitize shared sheet pricing", async () => {
      // Arrange
      vi.mocked(salesSheetsDb.getSalesSheetByToken).mockResolvedValue({
        id: 17,
        clientId: 3,
        clientName: "Acme Wellness",
        items: [
          {
            id: 101,
            name: "Moonrocks",
            category: "Flower",
            vendor: "North Farm",
            quantity: 2,
            finalPrice: 125,
            retailPrice: 140,
            imageUrl: "https://example.com/moonrocks.png",
          },
          {
            id: 102,
            name: "Pre-roll Pack",
            quantity: 1,
            retailPrice: 40,
          },
        ],
        totalValue: "290.00",
        itemCount: 2,
        createdBy: 1,
        createdAt: new Date("2026-03-31T09:00:00Z"),
        shareExpiresAt: new Date("2026-04-07T09:00:00Z"),
      } as Awaited<ReturnType<typeof salesSheetsDb.getSalesSheetByToken>>);
      vi.mocked(salesSheetsDb.incrementViewCount).mockResolvedValue();

      // Act
      const result = await publicCaller.salesSheets.getByToken({
        token: "public-share-token",
      });

      // Assert
      expect(result).toEqual({
        id: 17,
        clientName: "Acme Wellness",
        items: [
          {
            brand: undefined,
            id: 101,
            name: "Moonrocks",
            category: "Flower",
            subcategory: undefined,
            quantity: 2,
            price: 125,
            imageUrl: "https://example.com/moonrocks.png",
          },
          {
            brand: undefined,
            id: 102,
            name: "Pre-roll Pack",
            category: undefined,
            subcategory: undefined,
            quantity: 1,
            price: 40,
            imageUrl: undefined,
          },
        ],
        totalValue: "290.00",
        itemCount: 2,
        createdAt: new Date("2026-03-31T09:00:00Z"),
        expiresAt: new Date("2026-04-07T09:00:00Z"),
      });
      expect(salesSheetsDb.getSalesSheetByToken).toHaveBeenCalledWith(
        "public-share-token"
      );
      expect(salesSheetsDb.incrementViewCount).toHaveBeenCalledWith(17);
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
      // Arrange — quantity 0 means line total = 0
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
        totalValue: 0,
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

    it("should handle $0 finalPrice (comp/sample items)", async () => {
      // Arrange — finalPrice=0 should be used, NOT fallback to retailPrice
      const input = {
        clientId: 1,
        items: [
          {
            id: 1,
            name: "Sample Item",
            basePrice: 100,
            retailPrice: 150,
            finalPrice: 0,
            quantity: 5,
            priceMarkup: 0,
          },
        ],
        totalValue: 0, // 0 * 5 = 0
      };

      const mockSavedSheet = { id: 1, ...input, createdBy: 1 };
      vi.mocked(salesSheetsDb.saveSalesSheet).mockResolvedValue(mockSavedSheet);

      // Act — should NOT throw "Total value mismatch"
      const result = await caller.salesSheets.save(input);

      // Assert
      expect(result).toBeDefined();
    });

    it("should handle floating-point precision correctly", async () => {
      // Arrange — 0.1 + 0.2 scenario multiplied out
      const input = {
        clientId: 1,
        items: [
          {
            id: 1,
            name: "Item A",
            basePrice: 0.1,
            retailPrice: 0.1,
            finalPrice: 0.1,
            quantity: 3,
            priceMarkup: 0,
          },
          {
            id: 2,
            name: "Item B",
            basePrice: 0.2,
            retailPrice: 0.2,
            finalPrice: 0.2,
            quantity: 3,
            priceMarkup: 0,
          },
        ],
        totalValue: 0.9, // 0.1*3 + 0.2*3 = 0.3 + 0.6 = 0.9 (rounded)
      };

      const mockSavedSheet = { id: 1, ...input, createdBy: 1 };
      vi.mocked(salesSheetsDb.saveSalesSheet).mockResolvedValue(mockSavedSheet);

      // Act — should pass with cent rounding
      const result = await caller.salesSheets.save(input);

      // Assert
      expect(result).toBeDefined();
    });
  });

  describe("saveDraft total correction", () => {
    it("should correct totalValue server-side when saving draft", async () => {
      // Arrange — send wrong total, server should correct it
      const input = {
        clientId: 1,
        name: "Test Draft",
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
        totalValue: 150, // Wrong (old sum-of-prices), should be 1500
      };

      vi.mocked(salesSheetsDb.saveDraft).mockResolvedValue(42);

      // Act
      const result = await caller.salesSheets.saveDraft(input);

      // Assert — server should have corrected to 1500
      expect(result.draftId).toBe(42);
      expect(salesSheetsDb.saveDraft).toHaveBeenCalledWith(
        expect.objectContaining({
          totalValue: 1500, // Corrected by server
        })
      );
    });
  });

  describe("convertToOrder", () => {
    it("should call convertToOrder with correct params", async () => {
      // Arrange
      vi.mocked(salesSheetsDb.convertToOrder).mockResolvedValue(99);

      // Act
      const result = await caller.salesSheets.convertToOrder({
        sheetId: 1,
        orderType: "DRAFT",
      });

      // Assert
      expect(result.orderId).toBe(99);
      expect(salesSheetsDb.convertToOrder).toHaveBeenCalledWith(1, 1, "DRAFT");
    });

    it("should call convertToOrder with QUOTE type", async () => {
      // Arrange
      vi.mocked(salesSheetsDb.convertToOrder).mockResolvedValue(100);

      // Act
      const result = await caller.salesSheets.convertToOrder({
        sheetId: 5,
        orderType: "QUOTE",
      });

      // Assert
      expect(result.orderId).toBe(100);
      expect(salesSheetsDb.convertToOrder).toHaveBeenCalledWith(5, 1, "QUOTE");
    });

    it("should propagate conversion errors to caller", async () => {
      // Arrange — simulate transaction/DB failure
      vi.mocked(salesSheetsDb.convertToOrder).mockRejectedValue(
        new Error("Sales sheet not found")
      );

      // Act & Assert
      await expect(
        caller.salesSheets.convertToOrder({ sheetId: 999, orderType: "DRAFT" })
      ).rejects.toThrow("Sales sheet not found");
    });
  });

  describe("convertToLiveSession", () => {
    it("should call convertToLiveSession with correct params", async () => {
      // Arrange
      vi.mocked(salesSheetsDb.convertToLiveSession).mockResolvedValue(55);

      // Act
      const result = await caller.salesSheets.convertToLiveSession({
        sheetId: 3,
      });

      // Assert
      expect(result.sessionId).toBe(55);
      expect(salesSheetsDb.convertToLiveSession).toHaveBeenCalledWith(3, 1);
    });

    it("should propagate live session conversion errors", async () => {
      // Arrange
      vi.mocked(salesSheetsDb.convertToLiveSession).mockRejectedValue(
        new Error("Database not available")
      );

      // Act & Assert
      await expect(
        caller.salesSheets.convertToLiveSession({ sheetId: 1 })
      ).rejects.toThrow("Database not available");
    });
  });
});

import { describe, it, expect, beforeEach, vi } from "vitest";
import { setupDbMock } from "../test-utils/testDb";

// Mock database (MUST be before other imports)
vi.mock("../db", () => setupDbMock());

import { db } from "../db";
import * as liveCatalogService from "./liveCatalogService";

describe("liveCatalogService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getCatalog", () => {
    it("should return catalog items with pricing for client", async () => {
      // Mock configuration
      const mockConfig = {
        id: 1,
        clientId: 1,
        moduleLiveCatalogEnabled: true,
      };

      // Mock batches
      const mockBatches = [
        {
          id: 1,
          code: "BATCH001",
          productId: 1,
          grade: "A",
          batchStatus: "LIVE",
        },
      ];

      // Mock products
      const mockProducts = [
        {
          id: 1,
          nameCanonical: "Premium Flower",
          category: "Flower",
          subcategory: "Indoor",
        },
      ];

      vi.mocked(db.query.vipPortalConfigurations.findFirst).mockResolvedValue(
        mockConfig as unknown as Awaited<
          ReturnType<typeof db.query.vipPortalConfigurations.findFirst>
        >
      );
      vi.mocked(db.query.batches.findMany).mockResolvedValue(
        mockBatches as unknown as Awaited<
          ReturnType<typeof db.query.batches.findMany>
        >
      );
      vi.mocked(db.query.products.findMany).mockResolvedValue(
        mockProducts as unknown as Awaited<
          ReturnType<typeof db.query.products.findMany>
        >
      );

      const result = await liveCatalogService.getCatalog(1, {});

      expect(result).toBeDefined();
      expect(result.items).toBeDefined();
    });

    it("should accept category filter parameter", async () => {
      const mockConfig = {
        id: 1,
        clientId: 1,
        moduleLiveCatalogEnabled: true,
      };

      vi.mocked(db.query.vipPortalConfigurations.findFirst).mockResolvedValue(
        mockConfig as unknown as Awaited<
          ReturnType<typeof db.query.vipPortalConfigurations.findFirst>
        >
      );
      vi.mocked(db.query.batches.findMany).mockResolvedValue([]);

      // Test that getCatalog accepts category filter without throwing
      const result = await liveCatalogService.getCatalog(1, {
        category: "Flower",
      });

      expect(result).toBeDefined();
      expect(result.items).toBeDefined();
    });
  });

  describe("getFilterOptions", () => {
    it("should return available filter options for client", async () => {
      const mockConfig = {
        id: 1,
        clientId: 1,
        moduleLiveCatalogEnabled: true,
      };

      const mockBatches = [
        { grade: "A", pricePerUnit: "100" },
        { grade: "B", pricePerUnit: "80" },
      ];

      vi.mocked(db.query.vipPortalConfigurations.findFirst).mockResolvedValue(
        mockConfig as unknown as Awaited<
          ReturnType<typeof db.query.vipPortalConfigurations.findFirst>
        >
      );
      vi.mocked(db.query.batches.findMany).mockResolvedValue(
        mockBatches as unknown as Awaited<
          ReturnType<typeof db.query.batches.findMany>
        >
      );

      const result = await liveCatalogService.getFilterOptions(1);

      expect(result).toBeDefined();
      expect(result.categories).toBeDefined();
      expect(result.grades).toBeDefined();
    });
  });

  describe("detectChanges", () => {
    it("should detect price change when prices differ", () => {
      const result = liveCatalogService.detectChanges(
        120, // currentPrice
        10, // currentQuantity
        true, // currentlyAvailable
        100, // snapshotPrice
        10 // snapshotQuantity
      );

      expect(result.priceChanged).toBe(true);
      expect(result.quantityChanged).toBe(false);
      expect(result.stillAvailable).toBe(true);
    });

    it("should detect quantity change", () => {
      const result = liveCatalogService.detectChanges(
        100, // currentPrice
        5, // currentQuantity
        true, // currentlyAvailable
        100, // snapshotPrice
        10 // snapshotQuantity
      );

      expect(result.priceChanged).toBe(false);
      expect(result.quantityChanged).toBe(true);
      expect(result.stillAvailable).toBe(true);
    });

    it("should detect no change when values are equal", () => {
      const result = liveCatalogService.detectChanges(
        100, // currentPrice
        10, // currentQuantity
        true, // currentlyAvailable
        100, // snapshotPrice
        10 // snapshotQuantity
      );

      expect(result.priceChanged).toBe(false);
      expect(result.quantityChanged).toBe(false);
      expect(result.stillAvailable).toBe(true);
    });
  });
});

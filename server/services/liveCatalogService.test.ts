import { describe, it, expect, beforeEach, vi } from "vitest";
import { setupDbMock } from "../test-utils/testDb";

// Mock database (MUST be before other imports)
vi.mock("../db", () => setupDbMock());

const pricingEngineMocks = vi.hoisted(() => ({
  getClientPricingRules: vi.fn(),
  calculateRetailPrices: vi.fn(),
}));

vi.mock("../pricingEngine", () => pricingEngineMocks);

import { db } from "../db";
import * as liveCatalogService from "./liveCatalogService";

type SelectBuilderMock = {
  from: ReturnType<typeof vi.fn>;
  leftJoin: ReturnType<typeof vi.fn>;
  where: ReturnType<typeof vi.fn>;
  orderBy: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
  offset: ReturnType<typeof vi.fn>;
  groupBy: ReturnType<typeof vi.fn>;
  then: (resolve: (value: unknown[]) => unknown) => unknown;
};

function mockSelectSequence(resultSets: unknown[][]): SelectBuilderMock[] {
  let i = 0;
  const builders: SelectBuilderMock[] = [];
  vi.mocked(db.select).mockImplementation((() => {
    const rows = resultSets[i++] ?? [];
    const builder: SelectBuilderMock = {
      from: vi.fn(() => builder),
      leftJoin: vi.fn(() => builder),
      where: vi.fn(() => builder),
      orderBy: vi.fn(() => builder),
      limit: vi.fn(() => builder),
      offset: vi.fn(() => builder),
      groupBy: vi.fn(() => builder),
      then: resolve => resolve(rows),
    };
    builders.push(builder);
    return builder;
  }) as never);
  return builders;
}

describe("liveCatalogService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    pricingEngineMocks.getClientPricingRules.mockResolvedValue([]);
    pricingEngineMocks.calculateRetailPrices.mockImplementation(
      async (items: Array<Record<string, unknown>>) =>
        items.map(item => ({
          ...item,
          retailPrice: Number(item.basePrice || 0),
          priceMarkup: 0,
          appliedRules: [],
        }))
    );
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

    it("prefers visible batch media over product-level fallback media", async () => {
      const originalQuery = (db as unknown as { query: unknown }).query;
      (db as unknown as { query: Record<string, unknown> }).query = {
        vipPortalConfigurations: {
          findFirst: vi.fn().mockResolvedValue({
            id: 1,
            clientId: 1,
            moduleLiveCatalogEnabled: true,
            featuresConfig: {
              liveCatalog: {
                showBasePrice: false,
                showMarkup: false,
                showQuantity: true,
              },
            },
          }),
        },
        clientDraftInterests: {
          findMany: vi.fn().mockResolvedValue([]),
        },
      };

      mockSelectSequence([
        [
          {
            batch: {
              id: 42,
              sku: "BATCH-42",
              productId: 7,
              grade: "A",
              onHandQty: "10",
              unitCogs: "125",
            },
            product: {
              id: 7,
              category: "Flower",
              subcategory: "Indoor",
            },
          },
        ],
        [{ batchId: 42, url: "https://images.example.com/batch-visible.jpg" }],
      ]);

      try {
        const result = await liveCatalogService.getCatalog(1, {});

        expect(result.items).toHaveLength(1);
        expect(result.items[0].imageUrl).toBe(
          "https://images.example.com/batch-visible.jpg"
        );
      } finally {
        (db as unknown as { query: unknown }).query = originalQuery;
      }
    });

    it("orders product-level fallback media for deterministic image selection", async () => {
      const originalQuery = (db as unknown as { query: unknown }).query;
      (db as unknown as { query: Record<string, unknown> }).query = {
        vipPortalConfigurations: {
          findFirst: vi.fn().mockResolvedValue({
            id: 1,
            clientId: 1,
            moduleLiveCatalogEnabled: true,
            featuresConfig: {
              liveCatalog: {
                showBasePrice: false,
                showMarkup: false,
                showQuantity: true,
              },
            },
          }),
        },
        clientDraftInterests: {
          findMany: vi.fn().mockResolvedValue([]),
        },
      };

      const selectBuilders = mockSelectSequence([
        [
          {
            batch: {
              id: 77,
              sku: "BATCH-77",
              productId: 9,
              grade: "A",
              onHandQty: "4",
              unitCogs: "88",
            },
            product: {
              id: 9,
              category: "Flower",
              subcategory: "Mixed Light",
            },
          },
        ],
        [],
        [
          { productId: 9, url: "https://images.example.com/newest.jpg" },
          { productId: 9, url: "https://images.example.com/older.jpg" },
        ],
      ]);

      try {
        const result = await liveCatalogService.getCatalog(1, {});

        expect(result.items).toHaveLength(1);
        expect(result.items[0].imageUrl).toBe(
          "https://images.example.com/newest.jpg"
        );
        expect(selectBuilders[2]?.orderBy).toHaveBeenCalledTimes(1);
      } finally {
        (db as unknown as { query: unknown }).query = originalQuery;
      }
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

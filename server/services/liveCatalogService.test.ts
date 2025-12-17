import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setupDbMock } from '../test-utils/testDb';

// Mock database (MUST be before other imports)
vi.mock('../db', () => setupDbMock());

// Mock pricingEngine
vi.mock('../pricingEngine', () => ({
  getClientPricingRules: vi.fn().mockResolvedValue([]),
  calculateRetailPrices: vi.fn().mockImplementation((items) => 
    Promise.resolve(items.map((item: any) => ({
      ...item,
      retailPrice: item.basePrice * 1.2,
      priceMarkup: item.basePrice * 0.2,
      appliedRules: [],
    })))
  ),
}));

import { db } from '../db';
import * as liveCatalogService from './liveCatalogService';

describe('liveCatalogService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getCatalog', () => {
    it('should return empty catalog when Live Catalog is not enabled', async () => {
      // Mock configuration - not enabled
      const mockConfig = {
        id: 1,
        clientId: 1,
        moduleLiveCatalogEnabled: false,
      };

      vi.mocked(db.query.vipPortalConfigurations.findFirst).mockResolvedValue(mockConfig as any);

      const result = await liveCatalogService.getCatalog(1, {});

      expect(result).toBeDefined();
      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('should return catalog when enabled', async () => {
      // Mock configuration - enabled
      const mockConfig = {
        id: 1,
        clientId: 1,
        moduleLiveCatalogEnabled: true,
        featuresConfig: { liveCatalog: {} },
      };

      vi.mocked(db.query.vipPortalConfigurations.findFirst).mockResolvedValue(mockConfig as any);
      vi.mocked(db.query.clientDraftInterests.findMany).mockResolvedValue([]);

      // Mock the db.select for batches query
      const mockBatchesWithProducts = [
        {
          batch: { id: 1, sku: 'TEST-001', productId: 1, unitCogs: '100', onHandQty: '50', grade: 'A' },
          product: { id: 1, nameCanonical: 'Test Product', category: 'Flower', subcategory: 'Indoor' },
        },
      ];

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                offset: vi.fn().mockResolvedValue(mockBatchesWithProducts),
              }),
            }),
          }),
        }),
      } as any);

      const result = await liveCatalogService.getCatalog(1, {});

      expect(result).toBeDefined();
    });
  });

  describe('getFilterOptions', () => {
    it('should return empty options when Live Catalog is not enabled', async () => {
      const mockConfig = {
        id: 1,
        clientId: 1,
        moduleLiveCatalogEnabled: false,
      };

      vi.mocked(db.query.vipPortalConfigurations.findFirst).mockResolvedValue(mockConfig as any);

      const result = await liveCatalogService.getFilterOptions(1);

      expect(result).toBeDefined();
      expect(result.categories).toHaveLength(0);
      expect(result.brands).toHaveLength(0);
      expect(result.grades).toHaveLength(0);
    });

    it('should return filter options when enabled', async () => {
      const mockConfig = {
        id: 1,
        clientId: 1,
        moduleLiveCatalogEnabled: true,
      };

      vi.mocked(db.query.vipPortalConfigurations.findFirst).mockResolvedValue(mockConfig as any);

      // Mock the db.select for batches with products query
      const mockBatchesWithProducts = [
        {
          batch: { id: 1, grade: 'A', batchStatus: 'LIVE' },
          product: { id: 1, category: 'Flower' },
        },
        {
          batch: { id: 2, grade: 'B', batchStatus: 'LIVE' },
          product: { id: 2, category: 'Edibles' },
        },
      ];

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(mockBatchesWithProducts),
          }),
        }),
      } as any);

      const result = await liveCatalogService.getFilterOptions(1);

      expect(result).toBeDefined();
      expect(result.categories.map(c => c.name)).toContain('Flower');
      expect(result.categories.map(c => c.name)).toContain('Edibles');
      expect(result.grades).toContain('A');
      expect(result.grades).toContain('B');
    });
  });

  describe('detectChanges', () => {
    it('should detect price change', () => {
      const result = liveCatalogService.detectChanges(
        120,   // currentPrice
        50,    // currentQuantity
        true,  // currentlyAvailable
        100,   // snapshotPrice
        50     // snapshotQuantity
      );

      expect(result.priceChanged).toBe(true);
      expect(result.quantityChanged).toBe(false);
      expect(result.stillAvailable).toBe(true);
    });

    it('should detect quantity change', () => {
      const result = liveCatalogService.detectChanges(
        100,   // currentPrice
        30,    // currentQuantity
        true,  // currentlyAvailable
        100,   // snapshotPrice
        50     // snapshotQuantity
      );

      expect(result.priceChanged).toBe(false);
      expect(result.quantityChanged).toBe(true);
      expect(result.stillAvailable).toBe(true);
    });

    it('should detect no changes when prices and quantities are equal', () => {
      const result = liveCatalogService.detectChanges(
        100,   // currentPrice
        50,    // currentQuantity
        true,  // currentlyAvailable
        100,   // snapshotPrice
        50     // snapshotQuantity
      );

      expect(result.priceChanged).toBe(false);
      expect(result.quantityChanged).toBe(false);
      expect(result.stillAvailable).toBe(true);
    });
  });
});

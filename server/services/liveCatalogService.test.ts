import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setupDbMock } from '../test-utils/testDb';

// Mock database (MUST be before other imports)
vi.mock('../db', () => setupDbMock());

import { db } from '../db';
import * as liveCatalogService from './liveCatalogService';

describe('liveCatalogService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getCatalogForClient', () => {
    it('should return catalog items with pricing for client', async () => {
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
          code: 'BATCH001',
          productId: 1,
          grade: 'A',
          batchStatus: 'LIVE',
        },
      ];

      // Mock products
      const mockProducts = [
        {
          id: 1,
          name: 'Premium Flower',
          category: 'Flower',
          subcategory: 'Indoor',
        },
      ];

      vi.mocked(db.query.vipPortalConfigurations.findFirst).mockResolvedValue(mockConfig as any);
      vi.mocked(db.query.batches.findMany).mockResolvedValue(mockBatches as any);
      vi.mocked(db.query.products.findMany).mockResolvedValue(mockProducts as any);

      const result = await liveCatalogService.getCatalogForClient(1, {});

      expect(result).toBeDefined();
      expect(result.items).toHaveLength(1);
      expect(result.items[0].name).toBe('Premium Flower');
    });

    it('should apply category filter when provided', async () => {
      const mockConfig = {
        id: 1,
        clientId: 1,
        moduleLiveCatalogEnabled: true,
      };

      vi.mocked(db.query.vipPortalConfigurations.findFirst).mockResolvedValue(mockConfig as any);
      vi.mocked(db.query.batches.findMany).mockResolvedValue([]);

      await liveCatalogService.getCatalogForClient(1, { category: 'Flower' });

      expect(db.query.batches.findMany).toHaveBeenCalled();
    });

    it('should throw error if Live Catalog is not enabled for client', async () => {
      const mockConfig = {
        id: 1,
        clientId: 1,
        moduleLiveCatalogEnabled: false,
      };

      vi.mocked(db.query.vipPortalConfigurations.findFirst).mockResolvedValue(mockConfig as any);

      await expect(
        liveCatalogService.getCatalogForClient(1, {})
      ).rejects.toThrow('Live Catalog is not enabled');
    });
  });

  describe('getFilterOptions', () => {
    it('should return available filter options for client', async () => {
      const mockProducts = [
        { category: 'Flower', subcategory: 'Indoor' },
        { category: 'Edibles', subcategory: 'Gummies' },
      ];

      const mockBatches = [
        { grade: 'A', brand: 'Premium' },
        { grade: 'B', brand: 'Standard' },
      ];

      vi.mocked(db.query.products.findMany).mockResolvedValue(mockProducts as any);
      vi.mocked(db.query.batches.findMany).mockResolvedValue(mockBatches as any);

      const result = await liveCatalogService.getFilterOptions(1);

      expect(result).toBeDefined();
      expect(result.categories).toContain('Flower');
      expect(result.categories).toContain('Edibles');
      expect(result.grades).toContain('A');
      expect(result.grades).toContain('B');
    });
  });

  describe('detectChanges', () => {
    it('should detect price increase', () => {
      const snapshotPrice = 100;
      const currentPrice = 120;

      const result = liveCatalogService.detectPriceChange(snapshotPrice, currentPrice);

      expect(result.hasChanged).toBe(true);
      expect(result.changeType).toBe('increase');
      expect(result.percentageChange).toBe(20);
    });

    it('should detect price decrease', () => {
      const snapshotPrice = 100;
      const currentPrice = 80;

      const result = liveCatalogService.detectPriceChange(snapshotPrice, currentPrice);

      expect(result.hasChanged).toBe(true);
      expect(result.changeType).toBe('decrease');
      expect(result.percentageChange).toBe(-20);
    });

    it('should detect no change when prices are equal', () => {
      const snapshotPrice = 100;
      const currentPrice = 100;

      const result = liveCatalogService.detectPriceChange(snapshotPrice, currentPrice);

      expect(result.hasChanged).toBe(false);
      expect(result.changeType).toBe('none');
      expect(result.percentageChange).toBe(0);
    });
  });
});

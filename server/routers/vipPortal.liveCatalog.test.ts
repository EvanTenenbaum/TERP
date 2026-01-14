/**
 * Integration Tests for VIP Portal - Live Catalog (Client-Facing)
 * 
 * Tests all tRPC procedures in the vipPortal.liveCatalog router.
 * Follows TDD approach: These tests are written BEFORE implementation.
 * Uses AAA (Arrange, Act, Assert) pattern for clarity.
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { setupDbMock } from '../test-utils/testDb';

// Mock the database (MUST be before other imports)
vi.mock('../db', () => setupDbMock());

// Mock drizzle-orm to return simple objects for testDb.ts
vi.mock("drizzle-orm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm")>();
  return {
    ...actual,
    eq: (col: any, val: any) => ({ op: 'eq', col, val }),
    and: (...args: any[]) => ({ op: 'and', args }),
    or: (...args: any[]) => ({ op: 'or', args }),
    inArray: (col: any, values: any[]) => ({ op: 'inArray', col, values }),
  };
});

import { appRouter } from '../routers';
import { db, getDb } from '../db';
import { clients } from '../../drizzle/schema';
import {
  vipPortalConfigurations,
  clientDraftInterests,
  clientCatalogViews,
  batches,
  products,
} from '../../drizzle/schema';
import { eq } from 'drizzle-orm';
import { withTransaction } from '../dbTransaction';

// Mock VIP portal client user
const mockVipClient = {
  id: 1,
  vipPortalClientId: 0, // Will be set in beforeAll
};

// Create a test caller with mock VIP portal context
const createCaller = (clientId: number) => {
  return appRouter.createCaller({
    vipPortalClientId: clientId,
    req: {} as any,
    res: {} as any,
  });
};

// SKIPPED: Mixed mock/real database pattern needs refactoring
// These tests need to either fully mock the database or run in an integration test environment
describe.skip('VIP Portal - Live Catalog (Client-Facing)', () => {
  let caller: ReturnType<typeof createCaller>;
  let testClientId: number;

  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    
    // Create a test client
    const result = await db.insert(clients).values({
      name: 'Test VIP Client',
      email: 'vipclient@test.com',
      phone: '555-VIP',
      vipPortalEnabled: true,
    });
    
    testClientId = Number(result.insertId);
    
    // Create product
    const productResult = await db.insert(products).values({
      brandId: 1,
      nameCanonical: "Test Product",
      category: "Flower",
      uomSellable: "EA",
    });
    const productId = Number(productResult.insertId);

    // Create batches (IDs 1-6 for tests)
    for (let i = 1; i <= 6; i++) {
        await db.insert(batches).values({
            id: i,
            productId: productId,
            code: `BATCH-00${i}`,
            sku: `SKU-00${i}`,
            lotId: 1,
            cogsMode: "FIXED",
            paymentTerms: "COD",
            batchStatus: "LIVE",
            onHandQty: "100",
        });
    }
    
    // Create VIP portal configuration with Live Catalog enabled
    await db.insert(vipPortalConfigurations).values({
      clientId: testClientId,
      moduleLiveCatalogEnabled: true,
      featuresConfig: {
        liveCatalog: {
          visibleCategories: [],
          showQuantity: true,
          showBrand: true,
          showGrade: true,
          showDate: true,
          showBasePrice: false,
          showMarkup: false,
          enablePriceAlerts: true,
        },
      },
    });
    
    caller = createCaller(testClientId);
  });

  afterAll(async () => {
    // DI-003: Wrap cascading deletes in transaction to prevent orphaned test data
    await withTransaction(async (tx) => {
      await tx.delete(clientCatalogViews).where(eq(clientCatalogViews.clientId, testClientId));
      await tx.delete(clientDraftInterests).where(eq(clientDraftInterests.clientId, testClientId));
      await tx.delete(vipPortalConfigurations).where(eq(vipPortalConfigurations.clientId, testClientId));
      await tx.delete(clients).where(eq(clients.id, testClientId));
    });
  });

  describe('get', () => {
    it('should return filtered inventory with personalized pricing', async () => {
      // Arrange
      const input = {};

      // Act
      const result = await caller.vipPortal.liveCatalog.get(input);

      // Assert
      expect(result).toBeDefined();
      expect(result.items).toBeDefined();
      expect(Array.isArray(result.items)).toBe(true);
      expect(result.total).toBeDefined();
      expect(typeof result.total).toBe('number');
    });

    it('should return empty array if live catalog is disabled', async () => {
      // Arrange
      const db = await getDb();
      if (!db) throw new Error('Database not available');
      
      // Create a client with Live Catalog disabled
      const disabledResult = await db.insert(clients).values({
        name: 'Disabled Catalog Client',
        email: 'disabled@test.com',
        phone: '555-DIS',
        vipPortalEnabled: true,
      });
      const disabledClientId = Number(disabledResult.insertId);
      
      await db.insert(vipPortalConfigurations).values({
        clientId: disabledClientId,
        moduleLiveCatalogEnabled: false,
      });
      
      const disabledCaller = createCaller(disabledClientId);
      const input = {};

      // Act
      const result = await disabledCaller.vipPortal.liveCatalog.get(input);

      // Assert
      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);

      // Cleanup - DI-003: Wrap cascading deletes in transaction
      await withTransaction(async (tx) => {
        await tx.delete(vipPortalConfigurations).where(eq(vipPortalConfigurations.clientId, disabledClientId));
        await tx.delete(clients).where(eq(clients.id, disabledClientId));
      });
    });

    it('should apply category filters correctly', async () => {
      // Arrange
      const input = { category: 'Flower' };

      // Act
      const result = await caller.vipPortal.liveCatalog.get(input);

      // Assert
      expect(result).toBeDefined();
      expect(Array.isArray(result.items)).toBe(true);
      // All items should be in the Flower category
      result.items.forEach(item => {
        expect(item.category).toBe('Flower');
      });
    });

    it('should apply price range filters correctly', async () => {
      // Arrange
      const input = { 
        priceMin: 50,
        priceMax: 150,
      };

      // Act
      const result = await caller.vipPortal.liveCatalog.get(input);

      // Assert
      expect(result).toBeDefined();
      expect(Array.isArray(result.items)).toBe(true);
      // All items should be within the price range
      result.items.forEach(item => {
        const price = parseFloat(item.retailPrice);
        expect(price).toBeGreaterThanOrEqual(50);
        expect(price).toBeLessThanOrEqual(150);
      });
    });

    it('should apply brand filters correctly', async () => {
      // Arrange
      const input = { brand: ['Top Shelf', 'Premium'] };

      // Act
      const result = await caller.vipPortal.liveCatalog.get(input);

      // Assert
      expect(result).toBeDefined();
      expect(Array.isArray(result.items)).toBe(true);
      // All items should match one of the selected brands
      result.items.forEach(item => {
        expect(['Top Shelf', 'Premium']).toContain(item.brand);
      });
    });

    it('should apply search filter correctly', async () => {
      // Arrange
      const input = { search: 'OG' };

      // Act
      const result = await caller.vipPortal.liveCatalog.get(input);

      // Assert
      expect(result).toBeDefined();
      expect(Array.isArray(result.items)).toBe(true);
      // All items should contain 'OG' in the name
      result.items.forEach(item => {
        expect(item.itemName.toLowerCase()).toContain('og');
      });
    });

    it('should respect pagination', async () => {
      // Arrange
      const input = { limit: 5, offset: 0 };

      // Act
      const result = await caller.vipPortal.liveCatalog.get(input);

      // Assert
      expect(result.items.length).toBeLessThanOrEqual(5);
    });
  });

  describe('getFilterOptions', () => {
    it('should return available filter options', async () => {
      // Arrange & Act
      const result = await caller.vipPortal.liveCatalog.getFilterOptions();

      // Assert
      expect(result).toBeDefined();
      expect(result.categories).toBeDefined();
      expect(Array.isArray(result.categories)).toBe(true);
      expect(result.brands).toBeDefined();
      expect(Array.isArray(result.brands)).toBe(true);
      expect(result.grades).toBeDefined();
      expect(Array.isArray(result.grades)).toBe(true);
      expect(result.priceRange).toBeDefined();
      expect(result.priceRange.min).toBeDefined();
      expect(result.priceRange.max).toBeDefined();
    });
  });

  describe('getDraftInterests', () => {
    it('should return empty result if no draft interests exist', async () => {
      // Arrange & Act
      const result = await caller.vipPortal.liveCatalog.getDraftInterests();

      // Assert
      expect(result).toBeDefined();
      expect(result.items).toEqual([]);
      expect(result.totalItems).toBe(0);
      expect(result.totalValue).toBe('0.00');
      expect(result.hasChanges).toBe(false);
    });
  });

  describe('addToDraft', () => {
    it('should add item to draft', async () => {
      // Arrange
      const input = { batchId: 1 }; // Assuming batch 1 exists

      // Act
      const result = await caller.vipPortal.liveCatalog.addToDraft(input);

      // Assert
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.draftId).toBeDefined();
      expect(typeof result.draftId).toBe('number');
    });

    it('should prevent duplicates and return existing draft ID', async () => {
      // Arrange
      const input = { batchId: 1 };

      // Act - Add the same item twice
      const result1 = await caller.vipPortal.liveCatalog.addToDraft(input);
      const result2 = await caller.vipPortal.liveCatalog.addToDraft(input);

      // Assert
      expect(result1.draftId).toBe(result2.draftId);
    });

    it('should throw error if batch does not exist', async () => {
      // Arrange
      const input = { batchId: 999999 };

      // Act & Assert
      await expect(
        caller.vipPortal.liveCatalog.addToDraft(input)
      ).rejects.toThrow();
    });
  });

  describe('removeFromDraft', () => {
    it('should remove item from draft', async () => {
      // Arrange
      const addResult = await caller.vipPortal.liveCatalog.addToDraft({ batchId: 2 });
      const input = { draftId: addResult.draftId };

      // Act
      const result = await caller.vipPortal.liveCatalog.removeFromDraft(input);

      // Assert
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });

    it('should throw error if draft item does not exist', async () => {
      // Arrange
      const input = { draftId: 999999 };

      // Act & Assert
      await expect(
        caller.vipPortal.liveCatalog.removeFromDraft(input)
      ).rejects.toThrow();
    });
  });

  describe('clearDraft', () => {
    it('should clear all draft items', async () => {
      // Arrange
      await caller.vipPortal.liveCatalog.addToDraft({ batchId: 3 });
      await caller.vipPortal.liveCatalog.addToDraft({ batchId: 4 });

      // Act
      const result = await caller.vipPortal.liveCatalog.clearDraft();

      // Assert
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.itemsCleared).toBeGreaterThan(0);
      
      // Verify draft is empty
      const draftResult = await caller.vipPortal.liveCatalog.getDraftInterests();
      expect(draftResult.items).toEqual([]);
    });
  });

  describe('submitInterestList', () => {
    it('should throw error if draft is empty', async () => {
      // Arrange - Ensure draft is empty
      await caller.vipPortal.liveCatalog.clearDraft();

      // Act & Assert
      await expect(
        caller.vipPortal.liveCatalog.submitInterestList()
      ).rejects.toThrow();
    });

    it('should create interest list and clear draft', async () => {
      // Arrange
      await caller.vipPortal.liveCatalog.addToDraft({ batchId: 5 });
      await caller.vipPortal.liveCatalog.addToDraft({ batchId: 6 });

      // Act
      const result = await caller.vipPortal.liveCatalog.submitInterestList();

      // Assert
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.interestListId).toBeDefined();
      expect(result.totalItems).toBe(2);
      expect(result.totalValue).toBeDefined();
      
      // Verify draft is cleared
      const draftResult = await caller.vipPortal.liveCatalog.getDraftInterests();
      expect(draftResult.items).toEqual([]);
    });
  });

  describe('views.list', () => {
    it('should return empty array if no saved views exist', async () => {
      // Arrange & Act
      const result = await caller.vipPortal.liveCatalog.views.list();

      // Assert
      expect(result).toBeDefined();
      expect(result.views).toBeDefined();
      expect(Array.isArray(result.views)).toBe(true);
    });
  });

  describe('views.save', () => {
    it('should save a new view', async () => {
      // Arrange
      const input = {
        name: 'Premium Flower',
        filters: {
          category: 'Flower',
          grade: ['AAA'],
          priceMin: 100,
        },
      };

      // Act
      const result = await caller.vipPortal.liveCatalog.views.save(input);

      // Assert
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.viewId).toBeDefined();
    });

    it('should throw error if name is empty', async () => {
      // Arrange
      const input = {
        name: '',
        filters: {},
      };

      // Act & Assert
      await expect(
        caller.vipPortal.liveCatalog.views.save(input)
      ).rejects.toThrow();
    });

    it('should throw error if name already exists', async () => {
      // Arrange
      const input = {
        name: 'Premium Flower', // Already created in previous test
        filters: {},
      };

      // Act & Assert
      await expect(
        caller.vipPortal.liveCatalog.views.save(input)
      ).rejects.toThrow();
    });
  });

  describe('views.delete', () => {
    it('should delete a view', async () => {
      // Arrange
      const saveResult = await caller.vipPortal.liveCatalog.views.save({
        name: 'Temporary View',
        filters: {},
      });
      const input = { viewId: saveResult.viewId };

      // Act
      const result = await caller.vipPortal.liveCatalog.views.delete(input);

      // Assert
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });

    it('should throw error if view does not exist', async () => {
      // Arrange
      const input = { viewId: 999999 };

      // Act & Assert
      await expect(
        caller.vipPortal.liveCatalog.views.delete(input)
      ).rejects.toThrow();
    });
  });
});

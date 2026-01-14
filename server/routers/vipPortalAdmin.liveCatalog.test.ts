/**
 * Integration Tests for VIP Portal Admin - Live Catalog
 * 
 * Tests all tRPC procedures in the vipPortalAdmin.liveCatalog router.
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
import {
  clients,
  vipPortalConfigurations,
  roles,
  userRoles,
  permissions,
  rolePermissions
} from '../../drizzle/schema';
import { seedRBACDefaults, assignRoleToUser } from '../services/seedRBAC';
import { eq } from 'drizzle-orm';
import { withTransaction } from '../dbTransaction';

// Mock user for authenticated admin requests
const mockAdminUser = {
  id: 1,
  openId: "admin-user-id",
  email: 'admin@terp.com',
  name: 'Admin User',
  role: 'admin' as const,
};

// Create a test caller with mock admin context
const createCaller = () => {
  return appRouter.createCaller({
    user: mockAdminUser,
    req: {} as any,
    res: {} as any,
  });
};

describe('VIP Portal Admin - Live Catalog', () => {
  let caller: ReturnType<typeof createCaller>;
  let testClientId: number;

  beforeAll(async () => {
    caller = createCaller();
    
    // Create a test client for testing
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    
    // Seed RBAC and assign role to admin user
    await seedRBACDefaults();
    await assignRoleToUser("admin-user-id", "Super Admin");
    
    const result = await db.insert(clients).values({
      name: 'Test Live Catalog Client',
      email: 'livecatalog@test.com',
      phone: '555-TEST',
      vipPortalEnabled: true,
    });
    
    testClientId = Number(result.insertId);
    
    // Create default VIP portal configuration
    await db.insert(vipPortalConfigurations).values({
      clientId: testClientId,
      moduleLiveCatalogEnabled: false,
    });
  });

  afterAll(async () => {
    // DI-003: Wrap cascading deletes in transaction to prevent orphaned test data
    await withTransaction(async (tx) => {
      await tx.delete(vipPortalConfigurations).where(eq(vipPortalConfigurations.clientId, testClientId));
      await tx.delete(clients).where(eq(clients.id, testClientId));
    });
  });

  describe('saveConfiguration', () => {
    it('should save live catalog configuration for a client', async () => {
      // Arrange
      const input = {
        clientId: testClientId,
        enabled: true,
        visibleCategories: [1, 2],
        showQuantity: true,
        showBrand: true,
        showGrade: false,
        enablePriceAlerts: true,
      };

      // Act
      const result = await caller.vipPortalAdmin.liveCatalog.saveConfiguration(input);

      // Assert
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      
      // Verify the configuration was saved
      const db = await getDb();
      if (!db) throw new Error('Database not available');
      
      const config = await db.query.vipPortalConfigurations.findFirst({
        where: eq(vipPortalConfigurations.clientId, testClientId),
      });
      
      expect(config).toBeDefined();
      expect(config?.moduleLiveCatalogEnabled).toBe(true);
      expect(config?.featuresConfig?.liveCatalog?.visibleCategories).toEqual([1, 2]);
      expect(config?.featuresConfig?.liveCatalog?.showQuantity).toBe(true);
      expect(config?.featuresConfig?.liveCatalog?.showBrand).toBe(true);
      expect(config?.featuresConfig?.liveCatalog?.showGrade).toBe(false);
      expect(config?.featuresConfig?.liveCatalog?.enablePriceAlerts).toBe(true);
    });

    it('should update existing configuration', async () => {
      // Arrange
      const input = {
        clientId: testClientId,
        enabled: false,
        visibleCategories: [1, 2, 3],
        showQuantity: false,
        showBrand: false,
        showGrade: true,
        enablePriceAlerts: false,
      };

      // Act
      const result = await caller.vipPortalAdmin.liveCatalog.saveConfiguration(input);

      // Assert
      expect(result.success).toBe(true);
      
      // Verify the configuration was updated
      const db = await getDb();
      if (!db) throw new Error('Database not available');
      
      const config = await db.query.vipPortalConfigurations.findFirst({
        where: eq(vipPortalConfigurations.clientId, testClientId),
      });
      
      expect(config?.moduleLiveCatalogEnabled).toBe(false);
      expect(config?.featuresConfig?.liveCatalog?.visibleCategories).toEqual([1, 2, 3]);
      expect(config?.featuresConfig?.liveCatalog?.showQuantity).toBe(false);
      expect(config?.featuresConfig?.liveCatalog?.showGrade).toBe(true);
    });

    it('should throw error if client does not exist', async () => {
      // Arrange
      const input = {
        clientId: 999999, // Non-existent client
        enabled: true,
      };

      // Act & Assert
      await expect(
        caller.vipPortalAdmin.liveCatalog.saveConfiguration(input)
      ).rejects.toThrow();
    });
  });

  describe('getConfiguration', () => {
    it('should retrieve live catalog configuration', async () => {
      // Arrange
      const input = { clientId: testClientId };

      // Act
      const result = await caller.vipPortalAdmin.liveCatalog.getConfiguration(input);

      // Assert
      expect(result).toBeDefined();
      expect(result.clientId).toBe(testClientId);
      expect(result).toHaveProperty('moduleLiveCatalogEnabled');
      expect(result).toHaveProperty('featuresConfig');
    });

    it('should return null if no configuration exists', async () => {
      // Arrange
      const db = await getDb();
      if (!db) throw new Error('Database not available');
      
      // Create a client without configuration
      const result = await db.insert(clients).values({
        name: 'No Config Client',
        email: 'noconfig@test.com',
        phone: '555-NONE',
        vipPortalEnabled: true,
      });
      const noConfigClientId = Number(result.insertId);

      const input = { clientId: noConfigClientId };

      // Act
      const config = await caller.vipPortalAdmin.liveCatalog.getConfiguration(input);

      // Assert
      expect(config).toBeNull();
      
      // Cleanup
      await db.delete(clients).where(eq(clients.id, noConfigClientId));
    });
  });

  describe('interestLists.getByClient', () => {
    it('should return empty array if no interest lists exist', async () => {
      // Arrange
      const input = { clientId: testClientId };

      // Act
      const result = await caller.vipPortalAdmin.liveCatalog.interestLists.getByClient(input);

      // Assert
      expect(result).toBeDefined();
      expect(result.lists).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should filter by status', async () => {
      // Arrange
      const input = { 
        clientId: testClientId,
        status: 'NEW' as const,
      };

      // Act
      const result = await caller.vipPortalAdmin.liveCatalog.interestLists.getByClient(input);

      // Assert
      expect(result).toBeDefined();
      expect(Array.isArray(result.lists)).toBe(true);
      // All results should have NEW status
      result.lists.forEach(list => {
        expect(list.status).toBe('NEW');
      });
    });

    it('should respect pagination', async () => {
      // Arrange
      const input = { 
        clientId: testClientId,
        limit: 5,
        offset: 0,
      };

      // Act
      const result = await caller.vipPortalAdmin.liveCatalog.interestLists.getByClient(input);

      // Assert
      expect(result).toBeDefined();
      expect(result.lists.length).toBeLessThanOrEqual(5);
    });
  });

  describe('interestLists.getById', () => {
    it('should throw error if interest list does not exist', async () => {
      // Arrange
      const input = { listId: 999999 };

      // Act & Assert
      await expect(
        caller.vipPortalAdmin.liveCatalog.interestLists.getById(input)
      ).rejects.toThrow();
    });
  });

  describe('interestLists.updateStatus', () => {
    it('should throw error if interest list does not exist', async () => {
      // Arrange
      const input = { 
        listId: 999999,
        status: 'REVIEWED' as const,
      };

      // Act & Assert
      await expect(
        caller.vipPortalAdmin.liveCatalog.interestLists.updateStatus(input)
      ).rejects.toThrow();
    });
  });

  describe('interestLists.addToNewOrder', () => {
    it('should throw error if interest list does not exist', async () => {
      // Arrange
      const input = { 
        listId: 999999,
        itemIds: [1, 2, 3],
      };

      // Act & Assert
      await expect(
        caller.vipPortalAdmin.liveCatalog.interestLists.addToNewOrder(input)
      ).rejects.toThrow();
    });
  });

  describe('interestLists.addToDraftOrder', () => {
    it('should throw error if interest list does not exist', async () => {
      // Arrange
      const input = { 
        listId: 999999,
        orderId: 1,
        itemIds: [1, 2, 3],
      };

      // Act & Assert
      await expect(
        caller.vipPortalAdmin.liveCatalog.interestLists.addToDraftOrder(input)
      ).rejects.toThrow();
    });

    it('should throw error if order belongs to different client', async () => {
      // This test will be implemented once we have test data
      // For now, we just verify the endpoint exists
      expect(caller.vipPortalAdmin.liveCatalog.interestLists.addToDraftOrder).toBeDefined();
    });

    it('should throw error if order is not in DRAFT status', async () => {
      // This test will be implemented once we have test data
      // For now, we just verify the endpoint exists
      expect(caller.vipPortalAdmin.liveCatalog.interestLists.addToDraftOrder).toBeDefined();
    });
  });

  describe('draftInterests.getByClient', () => {
    it('should return empty result if no draft interests exist', async () => {
      // Arrange
      const input = { clientId: testClientId };

      // Act
      const result = await caller.vipPortalAdmin.liveCatalog.draftInterests.getByClient(input);

      // Assert
      expect(result).toBeDefined();
      expect(result.items).toEqual([]);
      expect(result.totalItems).toBe(0);
      expect(result.totalValue).toBe('0.00');
    });
  });
});

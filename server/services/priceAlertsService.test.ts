import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getDb } from '../db';
import * as priceAlertsService from './priceAlertsService';
import { calculateRetailPrice, getClientPricingRules } from '../pricingEngine';

// Mock getDb
vi.mock('../db', () => ({
  getDb: vi.fn(),
}));

// Mock pricing engine
vi.mock('../pricingEngine', () => ({
  calculateRetailPrice: vi.fn(),
  getClientPricingRules: vi.fn().mockResolvedValue([]),
}));

describe('priceAlertsService', () => {
  let mockDb: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Create mock database
    mockDb = {
      query: {
        batches: {
          findFirst: vi.fn(),
        },
        clientPriceAlerts: {
          findFirst: vi.fn(),
          findMany: vi.fn(),
        },
      },
      insert: vi.fn(() => ({
        values: vi.fn(() => ({
          returning: vi.fn(),
        })),
      })),
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          innerJoin: vi.fn(() => ({
            leftJoin: vi.fn(() => ({
              where: vi.fn(() => ({
                orderBy: vi.fn(),
              })),
            })),
          })),
        })),
      })),
      update: vi.fn(() => ({
        set: vi.fn(() => ({
          where: vi.fn(),
        })),
      })),
    };
    
    vi.mocked(getDb).mockResolvedValue(mockDb);
  });

  describe('createPriceAlert', () => {
    it('should create a price alert for a client', async () => {
      // Mock batch exists
      mockDb.query.batches.findFirst.mockResolvedValue({ id: 1 });
      
      // Mock no existing alert
      mockDb.query.clientPriceAlerts.findFirst.mockResolvedValue(null);
      
      // Mock insert - service expects array format: [{ insertId: number }]
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockResolvedValue([{ insertId: 1 }]),
      });

      const result = await priceAlertsService.createPriceAlert(1, 1, 90);

      expect(result.success).toBe(true);
      expect(result.alertId).toBe(1);
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it('should return error if batch not found', async () => {
      // Mock batch not found
      mockDb.query.batches.findFirst.mockResolvedValue(null);

      const result = await priceAlertsService.createPriceAlert(1, 999, 90);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Batch not found');
    });
  });

  describe('checkPriceAlerts', () => {
    it('should identify triggered alerts when price drops below target', async () => {
      const mockAlerts = [
        {
          id: 1,
          clientId: 1,
          batchId: 1,
          targetPrice: '110',  // String as returned from DB
          clientName: 'Test Client',
          clientEmail: 'test@example.com',
          productName: 'Test Product',
          unitCogs: '100',
        },
      ];

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            innerJoin: vi.fn().mockReturnValue({
              leftJoin: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue(mockAlerts),
              }),
            }),
          }),
        }),
      });

      // Mock pricing engine to return price below target
      vi.mocked(calculateRetailPrice).mockResolvedValue({ retailPrice: 95 } as any);

      const triggeredAlerts = await priceAlertsService.checkPriceAlerts();

      expect(triggeredAlerts).toHaveLength(1);
      expect(triggeredAlerts[0].alertId).toBe(1);
      expect(triggeredAlerts[0].currentPrice).toBe(95);
      expect(triggeredAlerts[0].targetPrice).toBe(110);
    });

    it('should not trigger alerts when price is above target', async () => {
      const mockAlerts = [
        {
          id: 1,
          clientId: 1,
          batchId: 1,
          targetPrice: '80',  // String as returned from DB
          clientName: 'Test Client',
          clientEmail: 'test@example.com',
          productName: 'Test Product',
          unitCogs: '100',
        },
      ];

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            innerJoin: vi.fn().mockReturnValue({
              leftJoin: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue(mockAlerts),
              }),
            }),
          }),
        }),
      });

      // Mock pricing engine to return price above target
      vi.mocked(calculateRetailPrice).mockResolvedValue({ retailPrice: 100 } as any);

      const triggeredAlerts = await priceAlertsService.checkPriceAlerts();

      expect(triggeredAlerts).toHaveLength(0);
    });
  });

  describe('deactivatePriceAlert', () => {
    it('should deactivate an active price alert', async () => {
      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      });

      const result = await priceAlertsService.deactivatePriceAlert(1, 1);

      expect(result.success).toBe(true);
      expect(mockDb.update).toHaveBeenCalled();
    });
  });

  describe('sendPriceAlertNotifications', () => {
    it('should send notifications for triggered alerts', async () => {
      const notifications = [
        {
          alertId: 1,
          clientId: 1,
          clientName: 'Test Client',
          clientEmail: 'test@example.com',
          batchId: 1,
          productName: 'Test Product',
          targetPrice: 110,
          currentPrice: 95,
          priceDropAmount: 15,
          priceDropPercentage: 13.64,
        },
      ];

      // Mock deactivatePriceAlert
      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      });

      // Should not throw
      await expect(
        priceAlertsService.sendPriceAlertNotifications(notifications)
      ).resolves.not.toThrow();
    });
  });
});

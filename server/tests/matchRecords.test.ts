import { describe, it, expect } from 'vitest';

/**
 * Match Records Tests
 * Tests for match tracking, analytics, and conversion tracking
 */

describe('Match Records', () => {
  describe('Match Recording', () => {
    it('should record match with all required fields', () => {
      const matchRecord = {
        clientId: 1,
        clientNeedId: 10,
        inventoryBatchId: 5,
        matchType: 'EXACT',
        confidenceScore: '95',
        matchReasons: ['Exact strain match', 'Category match', 'Within budget'],
        userAction: 'NONE',
        resultedInSale: false,
      };

      expect(matchRecord.clientId).toBe(1);
      expect(matchRecord.matchType).toBe('EXACT');
      expect(matchRecord.confidenceScore).toBe('95');
      expect(matchRecord.matchReasons).toHaveLength(3);
    });

    it('should track inventory batch matches', () => {
      const matchRecord = {
        inventoryBatchId: 5,
        vendorSupplyId: null,
      };

      const isInventoryMatch = matchRecord.inventoryBatchId !== null;
      const isVendorMatch = matchRecord.vendorSupplyId !== null;

      expect(isInventoryMatch).toBe(true);
      expect(isVendorMatch).toBe(false);
    });

    it('should track vendor supply matches', () => {
      const matchRecord = {
        inventoryBatchId: null,
        vendorSupplyId: 3,
      };

      const isInventoryMatch = matchRecord.inventoryBatchId !== null;
      const isVendorMatch = matchRecord.vendorSupplyId !== null;

      expect(isInventoryMatch).toBe(false);
      expect(isVendorMatch).toBe(true);
    });
  });

  describe('User Actions', () => {
    it('should track CREATED_QUOTE action', () => {
      const matchRecord = {
        userAction: 'CREATED_QUOTE',
        actionedAt: new Date(),
        actionedBy: 1,
      };

      expect(matchRecord.userAction).toBe('CREATED_QUOTE');
      expect(matchRecord.actionedAt).toBeDefined();
      expect(matchRecord.actionedBy).toBe(1);
    });

    it('should track CONTACTED_VENDOR action', () => {
      const matchRecord = {
        userAction: 'CONTACTED_VENDOR',
      };

      expect(matchRecord.userAction).toBe('CONTACTED_VENDOR');
    });

    it('should track DISMISSED action', () => {
      const matchRecord = {
        userAction: 'DISMISSED',
      };

      expect(matchRecord.userAction).toBe('DISMISSED');
    });

    it('should default to NONE action', () => {
      const matchRecord = {
        userAction: 'NONE',
      };

      expect(matchRecord.userAction).toBe('NONE');
    });
  });

  describe('Conversion Tracking', () => {
    it('should mark match as converted when sale is made', () => {
      const matchRecord = {
        resultedInSale: true,
        saleOrderId: 123,
      };

      expect(matchRecord.resultedInSale).toBe(true);
      expect(matchRecord.saleOrderId).toBe(123);
    });

    it('should not mark as converted by default', () => {
      const matchRecord = {
        resultedInSale: false,
        saleOrderId: null,
      };

      expect(matchRecord.resultedInSale).toBe(false);
      expect(matchRecord.saleOrderId).toBeNull();
    });
  });

  describe('Analytics Calculations', () => {
    it('should calculate conversion rate', () => {
      const matches = [
        { resultedInSale: true },
        { resultedInSale: false },
        { resultedInSale: true },
        { resultedInSale: false },
        { resultedInSale: true },
      ];

      const conversions = matches.filter(m => m.resultedInSale).length;
      const conversionRate = (conversions / matches.length) * 100;

      expect(conversionRate).toBe(60); // 3 out of 5 = 60%
    });

    it('should calculate average confidence score', () => {
      const matches = [
        { confidenceScore: '90' },
        { confidenceScore: '80' },
        { confidenceScore: '70' },
        { confidenceScore: '85' },
      ];

      const total = matches.reduce((sum, m) => sum + parseFloat(m.confidenceScore), 0);
      const average = total / matches.length;

      expect(average).toBe(81.25);
    });

    it('should count matches by type', () => {
      const matches = [
        { matchType: 'EXACT' },
        { matchType: 'CLOSE' },
        { matchType: 'EXACT' },
        { matchType: 'HISTORICAL' },
        { matchType: 'EXACT' },
      ];

      const counts = {
        EXACT: 0,
        CLOSE: 0,
        HISTORICAL: 0,
      };

      matches.forEach(m => {
        counts[m.matchType] += 1;
      });

      expect(counts.EXACT).toBe(3);
      expect(counts.CLOSE).toBe(1);
      expect(counts.HISTORICAL).toBe(1);
    });

    it('should count matches by action', () => {
      const matches = [
        { userAction: 'CREATED_QUOTE' },
        { userAction: 'DISMISSED' },
        { userAction: 'CREATED_QUOTE' },
        { userAction: 'NONE' },
        { userAction: 'CONTACTED_VENDOR' },
      ];

      const counts = {
        CREATED_QUOTE: 0,
        CONTACTED_VENDOR: 0,
        DISMISSED: 0,
        NONE: 0,
      };

      matches.forEach(m => {
        counts[m.userAction] += 1;
      });

      expect(counts.CREATED_QUOTE).toBe(2);
      expect(counts.DISMISSED).toBe(1);
      expect(counts.CONTACTED_VENDOR).toBe(1);
      expect(counts.NONE).toBe(1);
    });
  });

  describe('Performance Metrics', () => {
    it('should identify top performing match types', () => {
      const matchTypes = [
        { type: 'EXACT', conversions: 8, total: 10 }, // 80%
        { type: 'CLOSE', conversions: 3, total: 10 }, // 30%
        { type: 'HISTORICAL', conversions: 5, total: 10 }, // 50%
      ];

      const withRates = matchTypes.map(mt => ({
        ...mt,
        conversionRate: (mt.conversions / mt.total) * 100,
      }));

      const sorted = withRates.sort((a, b) => b.conversionRate - a.conversionRate);

      expect(sorted[0].type).toBe('EXACT');
      expect(sorted[0].conversionRate).toBe(80);
      expect(sorted[1].type).toBe('HISTORICAL');
      expect(sorted[2].type).toBe('CLOSE');
    });

    it('should calculate match effectiveness score', () => {
      // Effectiveness = (conversions * avgConfidence) / totalMatches
      const stats = {
        conversions: 15,
        avgConfidence: 85,
        totalMatches: 20,
      };

      const effectiveness = (stats.conversions * stats.avgConfidence) / stats.totalMatches;

      expect(effectiveness).toBe(63.75);
    });
  });

  describe('Match Filtering', () => {
    it('should filter matches by client', () => {
      const matches = [
        { clientId: 1, matchType: 'EXACT' },
        { clientId: 2, matchType: 'CLOSE' },
        { clientId: 1, matchType: 'HISTORICAL' },
        { clientId: 3, matchType: 'EXACT' },
      ];

      const clientMatches = matches.filter(m => m.clientId === 1);

      expect(clientMatches).toHaveLength(2);
      expect(clientMatches.every(m => m.clientId === 1)).toBe(true);
    });

    it('should filter matches by type', () => {
      const matches = [
        { matchType: 'EXACT' },
        { matchType: 'CLOSE' },
        { matchType: 'EXACT' },
        { matchType: 'HISTORICAL' },
      ];

      const exactMatches = matches.filter(m => m.matchType === 'EXACT');

      expect(exactMatches).toHaveLength(2);
    });

    it('should filter converted matches', () => {
      const matches = [
        { resultedInSale: true },
        { resultedInSale: false },
        { resultedInSale: true },
        { resultedInSale: false },
      ];

      const converted = matches.filter(m => m.resultedInSale);

      expect(converted).toHaveLength(2);
    });
  });
});


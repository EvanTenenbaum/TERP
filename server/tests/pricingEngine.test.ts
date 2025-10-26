import { describe, it, expect } from 'vitest';
import { calculateRetailPrice } from '../pricingEngine';
import type { InventoryItem, PricingRule } from '../pricingEngine';

describe('Pricing Engine', () => {
  describe('calculateRetailPrice', () => {
    it('should return base price when no rules apply', async () => {
      const item: InventoryItem = {
        id: 1,
        name: 'Test Item',
        basePrice: 100.00,
      };
      
      const rules: PricingRule[] = [];
      
      const result = await calculateRetailPrice(item, rules);
      
      expect(result.retailPrice).toBe(100.00);
      expect(result.appliedRules).toHaveLength(0);
    });

    it('should apply percentage markup', async () => {
      const item: InventoryItem = {
        id: 1,
        name: 'Test Item',
        basePrice: 100.00,
        category: 'flower',
      };
      
      const rules: PricingRule[] = [
        {
          id: 1,
          name: 'Flower Markup',
          adjustmentType: 'PERCENT_MARKUP',
          adjustmentValue: '20', // 20% markup
          conditions: { category: 'flower' },
          logicType: 'AND',
          priority: 1,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          description: null,
          createdBy: null,
        },
      ];
      
      const result = await calculateRetailPrice(item, rules);
      
      // 100 * 1.20 = 120
      expect(result.retailPrice).toBe(120.00);
      expect(result.appliedRules).toHaveLength(1);
      expect(result.appliedRules[0].ruleName).toBe('Flower Markup');
    });

    it('should apply percentage markdown', async () => {
      const item: InventoryItem = {
        id: 1,
        name: 'Test Item',
        basePrice: 100.00,
        category: 'clearance',
      };
      
      const rules: PricingRule[] = [
        {
          id: 1,
          name: 'Clearance Discount',
          adjustmentType: 'PERCENT_MARKDOWN',
          adjustmentValue: '25', // 25% discount
          conditions: { category: 'clearance' },
          logicType: 'AND',
          priority: 1,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          description: null,
          createdBy: null,
        },
      ];
      
      const result = await calculateRetailPrice(item, rules);
      
      // 100 * 0.75 = 75
      expect(result.retailPrice).toBe(75.00);
      expect(result.appliedRules).toHaveLength(1);
    });

    it('should apply dollar markup', async () => {
      const item: InventoryItem = {
        id: 1,
        name: 'Test Item',
        basePrice: 100.00,
        grade: 'premium',
      };
      
      const rules: PricingRule[] = [
        {
          id: 1,
          name: 'Premium Markup',
          adjustmentType: 'DOLLAR_MARKUP',
          adjustmentValue: '15.00', // $15 markup
          conditions: { grade: 'premium' },
          logicType: 'AND',
          priority: 1,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          description: null,
          createdBy: null,
        },
      ];
      
      const result = await calculateRetailPrice(item, rules);
      
      // 100 + 15 = 115
      expect(result.retailPrice).toBe(115.00);
    });

    it('should apply dollar markdown', async () => {
      const item: InventoryItem = {
        id: 1,
        name: 'Test Item',
        basePrice: 100.00,
        tags: ['sale'],
      };
      
      const rules: PricingRule[] = [
        {
          id: 1,
          name: 'Sale Discount',
          adjustmentType: 'DOLLAR_MARKDOWN',
          adjustmentValue: '10.00', // $10 discount
          conditions: { tag: 'sale' },
          logicType: 'AND',
          priority: 1,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          description: null,
          createdBy: null,
        },
      ];
      
      const result = await calculateRetailPrice(item, rules);
      
      // 100 - 10 = 90
      expect(result.retailPrice).toBe(90.00);
    });

    it('should apply highest priority rule when multiple rules match', async () => {
      const item: InventoryItem = {
        id: 1,
        name: 'Test Item',
        basePrice: 100.00,
        category: 'flower',
        grade: 'premium',
      };
      
      const rules: PricingRule[] = [
        {
          id: 1,
          name: 'Flower Markup',
          adjustmentType: 'PERCENT_MARKUP',
          adjustmentValue: '20', // 20% markup
          conditions: { category: 'flower' },
          logicType: 'AND',
          priority: 2, // Lower priority
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          description: null,
          createdBy: null,
        },
        {
          id: 2,
          name: 'Premium Markup',
          adjustmentType: 'DOLLAR_MARKUP',
          adjustmentValue: '30.00', // $30 markup
          conditions: { grade: 'premium' },
          logicType: 'AND',
          priority: 10, // Higher priority
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          description: null,
          createdBy: null,
        },
      ];
      
      const result = await calculateRetailPrice(item, rules);
      
      // Should apply premium rule first: 100 + 30 = 130
      // Then flower rule: 130 * 1.20 = 156
      expect(result.retailPrice).toBe(156.00);
      expect(result.appliedRules).toHaveLength(2);
    });

    it('should not apply rules that do not match conditions', async () => {
      const item: InventoryItem = {
        id: 1,
        name: 'Test Item',
        basePrice: 100.00,
        category: 'flower',
      };
      
      const rules: PricingRule[] = [
        {
          id: 1,
          name: 'Edibles Markup',
          adjustmentType: 'PERCENT_MARKUP',
          adjustmentValue: '50',
          conditions: { category: 'edibles' }, // Does not match
          logicType: 'AND',
          priority: 1,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          description: null,
          createdBy: null,
        },
      ];
      
      const result = await calculateRetailPrice(item, rules);
      
      // No rules applied, should be base price
      expect(result.retailPrice).toBe(100.00);
      expect(result.appliedRules).toHaveLength(0);
    });

    it('should handle price range conditions', async () => {
      const item: InventoryItem = {
        id: 1,
        name: 'Test Item',
        basePrice: 50.00,
      };
      
      const rules: PricingRule[] = [
        {
          id: 1,
          name: 'Budget Markup',
          adjustmentType: 'PERCENT_MARKUP',
          adjustmentValue: '30',
          conditions: { priceMin: 0, priceMax: 100 }, // Matches
          logicType: 'AND',
          priority: 1,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          description: null,
          createdBy: null,
        },
      ];
      
      const result = await calculateRetailPrice(item, rules);
      
      // 50 * 1.30 = 65
      expect(result.retailPrice).toBe(65.00);
    });

    it('should calculate price markup correctly', async () => {
      const item: InventoryItem = {
        id: 1,
        name: 'Test Item',
        basePrice: 100.00,
        category: 'all',
      };
      
      const rules: PricingRule[] = [
        {
          id: 1,
          name: 'Standard Markup',
          adjustmentType: 'PERCENT_MARKUP',
          adjustmentValue: '50', // 50% markup
          conditions: { category: 'all' }, // Match all items in 'all' category
          logicType: 'AND',
          priority: 1,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          description: null,
          createdBy: null,
        },
      ];
      
      const result = await calculateRetailPrice(item, rules);
      
      expect(result.priceMarkup).toBe(50.00); // 50% markup
      expect(result.retailPrice).toBe(150.00);
    });
  });
});


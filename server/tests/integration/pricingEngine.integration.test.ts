/**
 * Integration tests for Pricing Engine
 * Tests actual pricing engine behavior with realistic scenarios
 */

import { describe, it, expect } from 'vitest';
import { calculateRetailPrices, type InventoryItem } from '../../pricingEngine';

// Define PricingRule type to match actual implementation
interface PricingRule {
  id: number;
  name: string;
  adjustmentType: 'PERCENT_MARKUP' | 'PERCENT_MARKDOWN' | 'DOLLAR_MARKUP' | 'DOLLAR_MARKDOWN';
  adjustmentValue: string;
  conditions: Record<string, any>;
  logicType?: 'AND' | 'OR';
  priority?: number;
  isActive?: boolean;
}

describe('Pricing Engine - Integration Tests', () => {
  describe('Basic Pricing Operations', () => {
    it('should apply percentage markup correctly', async () => {
      const items: InventoryItem[] = [
        {
          id: 1,
          name: 'Test Product',
          basePrice: 10.00,
        },
      ];

      const rules: PricingRule[] = [
        {
          id: 1,
          name: 'Standard Markup',
          priority: 1,
          conditions: { priceMin: 0 }, // Match all items with price >= 0
          adjustmentType: 'PERCENT_MARKUP',
          adjustmentValue: '50',
          isActive: true,
        },
      ];

      const result = await calculateRetailPrices(items, rules);

      expect(result[0].retailPrice).toBe(15.00); // $10 * 1.5
      expect(result[0].priceMarkup).toBe(50);
      expect(result[0].appliedRules).toHaveLength(1);
    });

    it('should apply percentage markdown correctly', async () => {
      const items: InventoryItem[] = [
        {
          id: 1,
          name: 'Test Product',
          basePrice: 20.00,
        },
      ];

      const rules: PricingRule[] = [
        {
          id: 1,
          name: 'Discount',
          priority: 1,
          conditions: { priceMin: 0 },
          adjustmentType: 'PERCENT_MARKDOWN',
          adjustmentValue: '25',
          isActive: true,
        },
      ];

      const result = await calculateRetailPrices(items, rules);

      expect(result[0].retailPrice).toBe(15.00); // $20 * 0.75
      expect(result[0].appliedRules).toHaveLength(1);
    });

    it('should apply dollar markup correctly', async () => {
      const items: InventoryItem[] = [
        {
          id: 1,
          name: 'Test Product',
          basePrice: 10.00,
        },
      ];

      const rules: PricingRule[] = [
        {
          id: 1,
          name: 'Fixed Markup',
          priority: 1,
          conditions: { priceMin: 0 },
          adjustmentType: 'DOLLAR_MARKUP',
          adjustmentValue: '5.00',
          isActive: true,
        },
      ];

      const result = await calculateRetailPrices(items, rules);

      expect(result[0].retailPrice).toBe(15.00); // $10 + $5
      expect(result[0].appliedRules).toHaveLength(1);
    });

    it('should apply dollar markdown correctly', async () => {
      const items: InventoryItem[] = [
        {
          id: 1,
          name: 'Test Product',
          basePrice: 20.00,
        },
      ];

      const rules: PricingRule[] = [
        {
          id: 1,
          name: 'Fixed Discount',
          priority: 1,
          conditions: { priceMin: 0 },
          adjustmentType: 'DOLLAR_MARKDOWN',
          adjustmentValue: '7.00',
          isActive: true,
        },
      ];

      const result = await calculateRetailPrices(items, rules);

      expect(result[0].retailPrice).toBe(13.00); // $20 - $7
      expect(result[0].appliedRules).toHaveLength(1);
    });
  });

  describe('Conditional Pricing', () => {
    it('should apply rule when category matches', async () => {
      const items: InventoryItem[] = [
        {
          id: 1,
          name: 'Flower Product',
          category: 'Flower',
          basePrice: 10.00,
        },
        {
          id: 2,
          name: 'Edible Product',
          category: 'Edible',
          basePrice: 10.00,
        },
      ];

      const rules: PricingRule[] = [
        {
          id: 1,
          name: 'Flower Markup',
          priority: 1,
          conditions: { category: 'Flower' },
          adjustmentType: 'PERCENT_MARKUP',
          adjustmentValue: '50',
          isActive: true,
        },
      ];

      const result = await calculateRetailPrices(items, rules);

      // Flower should get markup
      expect(result[0].retailPrice).toBe(15.00);
      expect(result[0].appliedRules).toHaveLength(1);

      // Edible should not get markup
      expect(result[1].retailPrice).toBe(10.00);
      expect(result[1].appliedRules).toHaveLength(0);
    });

    it('should apply rule when strain matches', async () => {
      const items: InventoryItem[] = [
        {
          id: 1,
          name: 'Blue Dream',
          strain: 'Blue Dream',
          basePrice: 10.00,
        },
        {
          id: 2,
          name: 'Other Strain',
          strain: 'OG Kush',
          basePrice: 10.00,
        },
      ];

      const rules: PricingRule[] = [
        {
          id: 1,
          name: 'Blue Dream Premium',
          priority: 1,
          conditions: { strain: 'Blue Dream' },
          adjustmentType: 'DOLLAR_MARKUP',
          adjustmentValue: '3.00',
          isActive: true,
        },
      ];

      const result = await calculateRetailPrices(items, rules);

      expect(result[0].retailPrice).toBe(13.00);
      expect(result[0].appliedRules).toHaveLength(1);
      expect(result[1].retailPrice).toBe(10.00);
      expect(result[1].appliedRules).toHaveLength(0);
    });

    it('should apply rule when grade matches', async () => {
      const items: InventoryItem[] = [
        {
          id: 1,
          name: 'Premium Grade',
          grade: 'A+',
          basePrice: 10.00,
        },
        {
          id: 2,
          name: 'Standard Grade',
          grade: 'B',
          basePrice: 10.00,
        },
      ];

      const rules: PricingRule[] = [
        {
          id: 1,
          name: 'Premium Grade Markup',
          priority: 1,
          conditions: { grade: 'A+' },
          adjustmentType: 'PERCENT_MARKUP',
          adjustmentValue: '30',
          isActive: true,
        },
      ];

      const result = await calculateRetailPrices(items, rules);

      expect(result[0].retailPrice).toBe(13.00);
      expect(result[0].appliedRules).toHaveLength(1);
      expect(result[1].retailPrice).toBe(10.00);
      expect(result[1].appliedRules).toHaveLength(0);
    });

    it('should apply rule when vendor matches', async () => {
      const items: InventoryItem[] = [
        {
          id: 1,
          name: 'Premium Vendor Product',
          vendor: 'Premium Co',
          basePrice: 10.00,
        },
        {
          id: 2,
          name: 'Standard Vendor Product',
          vendor: 'Standard Co',
          basePrice: 10.00,
        },
      ];

      const rules: PricingRule[] = [
        {
          id: 1,
          name: 'Premium Vendor Surcharge',
          priority: 1,
          conditions: { vendor: 'Premium Co' },
          adjustmentType: 'DOLLAR_MARKUP',
          adjustmentValue: '2.50',
          isActive: true,
        },
      ];

      const result = await calculateRetailPrices(items, rules);

      expect(result[0].retailPrice).toBe(12.50);
      expect(result[0].appliedRules).toHaveLength(1);
      expect(result[1].retailPrice).toBe(10.00);
      expect(result[1].appliedRules).toHaveLength(0);
    });
  });

  describe('Multiple Rules', () => {
    it('should apply multiple rules in priority order', async () => {
      const items: InventoryItem[] = [
        {
          id: 1,
          name: 'Test Product',
          basePrice: 10.00,
        },
      ];

      const rules: PricingRule[] = [
        {
          id: 1,
          name: 'First Markup',
          priority: 2, // Higher priority
          conditions: { priceMin: 0 },
          adjustmentType: 'PERCENT_MARKUP',
          adjustmentValue: '50',
          isActive: true,
        },
        {
          id: 2,
          name: 'Second Markup',
          priority: 1, // Lower priority
          conditions: { priceMin: 0 },
          adjustmentType: 'PERCENT_MARKUP',
          adjustmentValue: '20',
          isActive: true,
        },
      ];

      const result = await calculateRetailPrices(items, rules);

      // $10 * 1.5 * 1.2 = $18.00
      expect(result[0].retailPrice).toBe(18.00);
      expect(result[0].appliedRules).toHaveLength(2);
    });

    it('should combine markup and markdown', async () => {
      const items: InventoryItem[] = [
        {
          id: 1,
          name: 'Test Product',
          basePrice: 10.00,
        },
      ];

      const rules: PricingRule[] = [
        {
          id: 1,
          name: 'Markup',
          priority: 2,
          conditions: { priceMin: 0 },
          adjustmentType: 'PERCENT_MARKUP',
          adjustmentValue: '100', // Double the price
          isActive: true,
        },
        {
          id: 2,
          name: 'Markdown',
          priority: 1,
          conditions: { priceMin: 0 },
          adjustmentType: 'PERCENT_MARKDOWN',
          adjustmentValue: '25', // Then 25% off
          isActive: true,
        },
      ];

      const result = await calculateRetailPrices(items, rules);

      // $10 * 2.0 * 0.75 = $15.00
      expect(result[0].retailPrice).toBe(15.00);
      expect(result[0].appliedRules).toHaveLength(2);
    });

    it('should apply all rules when passed directly (isActive not checked)', async () => {
      const items: InventoryItem[] = [
        {
          id: 1,
          name: 'Test Product',
          basePrice: 10.00,
        },
      ];

      // Note: calculateRetailPrices doesn't filter by isActive when rules are passed directly
      // The isActive filtering happens in getPricingRules() which queries the database
      const rules: PricingRule[] = [
        {
          id: 1,
          name: 'First Rule',
          priority: 2, // Higher priority applied first
          conditions: { priceMin: 0 },
          adjustmentType: 'PERCENT_MARKUP',
          adjustmentValue: '100',
          isActive: true,
        },
        {
          id: 2,
          name: 'Second Rule',
          priority: 1,
          conditions: { priceMin: 0 },
          adjustmentType: 'PERCENT_MARKUP',
          adjustmentValue: '50',
          isActive: true,
        },
      ];

      const result = await calculateRetailPrices(items, rules);

      // Both rules applied: $10 * 2.0 * 1.5 = $30.00
      expect(result[0].retailPrice).toBe(30.00);
      expect(result[0].appliedRules).toHaveLength(2);
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero base price', async () => {
      const items: InventoryItem[] = [
        {
          id: 1,
          name: 'Free Item',
          basePrice: 0,
        },
      ];

      const rules: PricingRule[] = [
        {
          id: 1,
          name: 'Markup',
          priority: 1,
          conditions: { priceMin: 0 },
          adjustmentType: 'PERCENT_MARKUP',
          adjustmentValue: '50',
          isActive: true,
        },
      ];

      const result = await calculateRetailPrices(items, rules);

      expect(result[0].retailPrice).toBe(0);
    });

    it('should not allow negative prices', async () => {
      const items: InventoryItem[] = [
        {
          id: 1,
          name: 'Test Product',
          basePrice: 10.00,
        },
      ];

      const rules: PricingRule[] = [
        {
          id: 1,
          name: 'Excessive Markdown',
          priority: 1,
          conditions: { priceMin: 0 },
          adjustmentType: 'DOLLAR_MARKDOWN',
          adjustmentValue: '20.00',
          isActive: true,
        },
      ];

      const result = await calculateRetailPrices(items, rules);

      expect(result[0].retailPrice).toBe(0); // Clamped to 0
    });

    it('should round to 2 decimal places', async () => {
      const items: InventoryItem[] = [
        {
          id: 1,
          name: 'Test Product',
          basePrice: 10.00,
        },
      ];

      const rules: PricingRule[] = [
        {
          id: 1,
          name: 'Odd Percentage',
          priority: 1,
          conditions: { priceMin: 0 },
          adjustmentType: 'PERCENT_MARKUP',
          adjustmentValue: '33.333',
          isActive: true,
        },
      ];

      const result = await calculateRetailPrices(items, rules);

      // $10 * 1.33333 = $13.3333 → $13.33
      expect(result[0].retailPrice).toBe(13.33);
    });

    it('should handle no matching rules', async () => {
      const items: InventoryItem[] = [
        {
          id: 1,
          name: 'Test Product',
          category: 'Other',
          basePrice: 10.00,
        },
      ];

      const rules: PricingRule[] = [
        {
          id: 1,
          name: 'Flower Only',
          priority: 1,
          conditions: { category: 'Flower' },
          adjustmentType: 'PERCENT_MARKUP',
          adjustmentValue: '50',
          isActive: true,
        },
      ];

      const result = await calculateRetailPrices(items, rules);

      expect(result[0].retailPrice).toBe(10.00); // No change
      expect(result[0].appliedRules).toHaveLength(0);
    });

    it('should handle empty rules array', async () => {
      const items: InventoryItem[] = [
        {
          id: 1,
          name: 'Test Product',
          basePrice: 10.00,
        },
      ];

      const rules: PricingRule[] = [];

      const result = await calculateRetailPrices(items, rules);

      expect(result[0].retailPrice).toBe(10.00);
      expect(result[0].appliedRules).toHaveLength(0);
    });
  });
});


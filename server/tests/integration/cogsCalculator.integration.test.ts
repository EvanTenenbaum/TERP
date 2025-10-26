/**
 * Integration tests for COGS Calculator
 * Tests with realistic data scenarios
 */

import { describe, it, expect } from 'vitest';
import { calculateCogs, calculateDueDate, getMarginCategory } from '../../cogsCalculator';

describe('COGS Calculator - Integration Tests', () => {
  describe('Real-world COGS Calculations', () => {
    it('should calculate COGS for typical flower batch', () => {
      const result = calculateCogs({
        batch: {
          id: 1,
          cogsMode: 'FIXED',
          unitCogs: '8.50',
          unitCogsMin: null,
          unitCogsMax: null,
        },
        client: {
          id: 1,
          cogsAdjustmentType: 'NONE',
          cogsAdjustmentValue: '0',
        },
        context: {
          quantity: 100,
          salePrice: 12.00,
        },
      });

      expect(result.unitCogs).toBe(8.50);
      expect(result.unitMargin).toBe(3.50);
      expect(result.marginPercent).toBeCloseTo(29.17, 1);
      expect(result.cogsSource).toBe('FIXED');
    });

    it('should calculate COGS for premium product with range pricing', () => {
      const result = calculateCogs({
        batch: {
          id: 2,
          cogsMode: 'RANGE',
          unitCogs: null,
          unitCogsMin: '15.00',
          unitCogsMax: '25.00',
        },
        client: {
          id: 1,
          cogsAdjustmentType: 'NONE',
          cogsAdjustmentValue: '0',
        },
        context: {
          quantity: 50,
          salePrice: 30.00,
        },
      });

      expect(result.unitCogs).toBe(20.00); // Midpoint
      expect(result.unitMargin).toBe(10.00);
      expect(result.marginPercent).toBeCloseTo(33.33, 1);
      expect(result.cogsSource).toBe('MIDPOINT');
    });

    it('should apply VIP client discount correctly', () => {
      const result = calculateCogs({
        batch: {
          id: 2,
          cogsMode: 'RANGE',
          unitCogs: null,
          unitCogsMin: '10.00',
          unitCogsMax: '20.00',
        },
        client: {
          id: 2,
          cogsAdjustmentType: 'PERCENTAGE',
          cogsAdjustmentValue: '15', // 15% VIP discount
        },
        context: {
          quantity: 100,
          salePrice: 18.00,
        },
      });

      // Midpoint: $15, with 15% discount: $15 * 0.85 = $12.75
      expect(result.unitCogs).toBe(12.75);
      expect(result.unitMargin).toBe(5.25);
      expect(result.cogsSource).toBe('CLIENT_ADJUSTMENT');
    });

    it('should handle bulk order with fixed discount', () => {
      const result = calculateCogs({
        batch: {
          id: 2,
          cogsMode: 'RANGE',
          unitCogs: null,
          unitCogsMin: '8.00',
          unitCogsMax: '12.00',
        },
        client: {
          id: 3,
          cogsAdjustmentType: 'FIXED_AMOUNT',
          cogsAdjustmentValue: '1.50', // $1.50 bulk discount per unit
        },
        context: {
          quantity: 500,
          salePrice: 11.00,
        },
      });

      // Midpoint: $10, with $1.50 discount: $10 - $1.50 = $8.50
      expect(result.unitCogs).toBe(8.50);
      expect(result.unitMargin).toBe(2.50);
      expect(result.cogsSource).toBe('CLIENT_ADJUSTMENT');
    });
  });

  describe('Margin Category Classification', () => {
    it('should classify excellent margin (>=70%)', () => {
      const category = getMarginCategory(75.00);
      expect(category).toBe('excellent');
    });

    it('should classify good margin (50-70%)', () => {
      const category = getMarginCategory(60.00);
      expect(category).toBe('good');
    });

    it('should classify fair margin (30-50%)', () => {
      const category = getMarginCategory(40.00);
      expect(category).toBe('fair');
    });

    it('should classify low margin (15-30%)', () => {
      const category = getMarginCategory(20.00);
      expect(category).toBe('low');
    });

    it('should classify negative margin (<15%)', () => {
      const category = getMarginCategory(5.00);
      expect(category).toBe('negative');
    });

    it('should handle actual negative margin', () => {
      const category = getMarginCategory(-10.00);
      expect(category).toBe('negative');
    });
  });

  describe('Due Date Calculations', () => {
    it('should calculate NET_7 due date', () => {
      const dueDate = calculateDueDate('NET_7');
      const today = new Date();
      const expected = new Date(today);
      expected.setDate(expected.getDate() + 7);
      
      expect(dueDate.getDate()).toBe(expected.getDate());
    });

    it('should calculate NET_15 due date', () => {
      const dueDate = calculateDueDate('NET_15');
      const today = new Date();
      const expected = new Date(today);
      expected.setDate(expected.getDate() + 15);
      
      expect(dueDate.getDate()).toBe(expected.getDate());
    });

    it('should calculate NET_30 due date', () => {
      const dueDate = calculateDueDate('NET_30');
      const today = new Date();
      const expected = new Date(today);
      expected.setDate(expected.getDate() + 30);
      
      expect(dueDate.getDate()).toBe(expected.getDate());
    });

    it('should handle COD (same day)', () => {
      const dueDate = calculateDueDate('COD');
      const today = new Date();
      
      expect(dueDate.getDate()).toBe(today.getDate());
    });
  });

  describe('Complex Pricing Scenarios', () => {
    it('should handle low-margin high-volume sale', () => {
      const result = calculateCogs({
        batch: {
          id: 1,
          cogsMode: 'FIXED',
          unitCogs: '9.50',
          unitCogsMin: null,
          unitCogsMax: null,
        },
        client: {
          id: 1,
          cogsAdjustmentType: 'NONE',
          cogsAdjustmentValue: '0',
        },
        context: {
          quantity: 1000,
          salePrice: 10.00,
        },
      });

      expect(result.unitCogs).toBe(9.50);
      expect(result.unitMargin).toBe(0.50);
      expect(result.marginPercent).toBe(5.00);
      expect(getMarginCategory(result.marginPercent)).toBe('negative');
    });

    it('should handle premium pricing with high margin', () => {
      const result = calculateCogs({
        batch: {
          id: 1,
          cogsMode: 'FIXED',
          unitCogs: '5.00',
          unitCogsMin: null,
          unitCogsMax: null,
        },
        client: {
          id: 1,
          cogsAdjustmentType: 'NONE',
          cogsAdjustmentValue: '0',
        },
        context: {
          quantity: 20,
          salePrice: 12.00,
        },
      });

      expect(result.unitCogs).toBe(5.00);
      expect(result.unitMargin).toBe(7.00);
      expect(result.marginPercent).toBeCloseTo(58.33, 1);
      expect(getMarginCategory(result.marginPercent)).toBe('good');
    });

    it('should handle consignment terms', () => {
      const result = calculateCogs({
        batch: {
          id: 1,
          cogsMode: 'FIXED',
          unitCogs: '10.00',
          unitCogsMin: null,
          unitCogsMax: null,
        },
        client: {
          id: 1,
          cogsAdjustmentType: 'NONE',
          cogsAdjustmentValue: '0',
        },
        context: {
          quantity: 100,
          salePrice: 15.00,
          paymentTerms: 'CONSIGNMENT',
        },
      });

      expect(result.unitCogs).toBe(10.00);
      expect(result.unitMargin).toBe(5.00);
      expect(result.marginPercent).toBeCloseTo(33.33, 1);
    });
  });
});


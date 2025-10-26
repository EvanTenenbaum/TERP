import { describe, it, expect } from 'vitest';
import { 
  calculateCogs, 
  getBaseCogs, 
  applyClientAdjustment,
  getMarginCategory,
  calculateDueDate
} from '../cogsCalculator';

describe('COGS Calculator', () => {
  describe('calculateCogs', () => {
    it('should return COGS for FIXED mode batch', () => {
      const input = {
        batch: {
          id: 1,
          cogsMode: 'FIXED' as const,
          unitCogs: '10.00',
          unitCogsMin: null,
          unitCogsMax: null,
        },
        client: {
          id: 1,
          cogsAdjustmentType: 'NONE' as const,
          cogsAdjustmentValue: '0',
        },
        context: {
          quantity: 1,
          salePrice: 15.00,
        },
      };
      
      const result = calculateCogs(input);
      
      expect(result.unitCogs).toBe(10.00);
      expect(result.cogsSource).toBe('FIXED');
      expect(result.unitMargin).toBe(5.00);
      expect(result.marginPercent).toBeCloseTo(33.33, 1);
    });

    it('should return midpoint for RANGE mode batch without client adjustment', () => {
      const input = {
        batch: {
          id: 1,
          cogsMode: 'RANGE' as const,
          unitCogs: null,
          unitCogsMin: '10.00',
          unitCogsMax: '20.00',
        },
        client: {
          id: 1,
          cogsAdjustmentType: 'NONE' as const,
          cogsAdjustmentValue: '0',
        },
        context: {
          quantity: 1,
          salePrice: 25.00,
        },
      };
      
      const result = calculateCogs(input);
      
      expect(result.unitCogs).toBe(15.00);
      expect(result.cogsSource).toBe('MIDPOINT');
    });

    it('should apply client percentage adjustment to RANGE mode batch', () => {
      const input = {
        batch: {
          id: 1,
          cogsMode: 'RANGE' as const,
          unitCogs: null,
          unitCogsMin: '10.00',
          unitCogsMax: '20.00',
        },
        client: {
          id: 1,
          cogsAdjustmentType: 'PERCENTAGE' as const,
          cogsAdjustmentValue: '10', // 10% discount
        },
        context: {
          quantity: 1,
          salePrice: 25.00,
        },
      };
      
      const result = calculateCogs(input);
      
      // Midpoint: 15.00, 10% discount: 15.00 * 0.9 = 13.50
      expect(result.unitCogs).toBe(13.50);
      expect(result.cogsSource).toBe('CLIENT_ADJUSTMENT');
    });

    it('should apply client fixed adjustment to RANGE mode batch', () => {
      const input = {
        batch: {
          id: 1,
          cogsMode: 'RANGE' as const,
          unitCogs: null,
          unitCogsMin: '10.00',
          unitCogsMax: '20.00',
        },
        client: {
          id: 1,
          cogsAdjustmentType: 'FIXED_AMOUNT' as const,
          cogsAdjustmentValue: '2.00', // $2 discount
        },
        context: {
          quantity: 1,
          salePrice: 25.00,
        },
      };
      
      const result = calculateCogs(input);
      
      // Midpoint: 15.00, $2 discount: 15.00 - 2.00 = 13.00
      expect(result.unitCogs).toBe(13.00);
      expect(result.cogsSource).toBe('CLIENT_ADJUSTMENT');
    });

    it('should not go below cogsMin when applying adjustment', () => {
      const input = {
        batch: {
          id: 1,
          cogsMode: 'RANGE' as const,
          unitCogs: null,
          unitCogsMin: '10.00',
          unitCogsMax: '20.00',
        },
        client: {
          id: 1,
          cogsAdjustmentType: 'FIXED_AMOUNT' as const,
          cogsAdjustmentValue: '10.00', // $10 discount (would go below min)
        },
        context: {
          quantity: 1,
          salePrice: 25.00,
        },
      };
      
      const result = calculateCogs(input);
      
      // Should be clamped to cogsMin
      expect(result.unitCogs).toBe(10.00);
    });

    it('should calculate margin correctly', () => {
      const input = {
        batch: {
          id: 1,
          cogsMode: 'FIXED' as const,
          unitCogs: '20.00',
          unitCogsMin: null,
          unitCogsMax: null,
        },
        client: {
          id: 1,
          cogsAdjustmentType: 'NONE' as const,
          cogsAdjustmentValue: '0',
        },
        context: {
          quantity: 1,
          salePrice: 100.00,
        },
      };
      
      const result = calculateCogs(input);
      
      expect(result.unitMargin).toBe(80.00);
      expect(result.marginPercent).toBe(80.00);
    });
  });

  describe('getBaseCogs', () => {
    it('should return COGS for FIXED mode', () => {
      const batch = {
        cogsMode: 'FIXED' as const,
        unitCogs: '15.50',
        unitCogsMin: null,
        unitCogsMax: null,
      };
      
      const result = getBaseCogs(batch);
      
      expect(result).toBe(15.50);
    });

    it('should return midpoint for RANGE mode', () => {
      const batch = {
        cogsMode: 'RANGE' as const,
        unitCogs: null,
        unitCogsMin: '10.00',
        unitCogsMax: '30.00',
      };
      
      const result = getBaseCogs(batch);
      
      expect(result).toBe(20.00);
    });
  });

  describe('applyClientAdjustment', () => {
    it('should apply percentage adjustment', () => {
      const result = applyClientAdjustment(100.00, 'PERCENTAGE', '20');
      
      expect(result).toBe(80.00);
    });

    it('should apply fixed amount adjustment', () => {
      const result = applyClientAdjustment(100.00, 'FIXED_AMOUNT', '15.00');
      
      expect(result).toBe(85.00);
    });

    it('should return original value for NONE adjustment', () => {
      const result = applyClientAdjustment(100.00, 'NONE', '0');
      
      expect(result).toBe(100.00);
    });
  });

  describe('getMarginCategory', () => {
    it('should return excellent for >= 70%', () => {
      expect(getMarginCategory(75)).toBe('excellent');
      expect(getMarginCategory(70)).toBe('excellent');
    });

    it('should return good for >= 50%', () => {
      expect(getMarginCategory(60)).toBe('good');
      expect(getMarginCategory(50)).toBe('good');
    });

    it('should return fair for >= 30%', () => {
      expect(getMarginCategory(40)).toBe('fair');
      expect(getMarginCategory(30)).toBe('fair');
    });

    it('should return low for >= 15%', () => {
      expect(getMarginCategory(20)).toBe('low');
      expect(getMarginCategory(15)).toBe('low');
    });

    it('should return negative for < 15%', () => {
      expect(getMarginCategory(10)).toBe('negative');
      expect(getMarginCategory(0)).toBe('negative');
      expect(getMarginCategory(-5)).toBe('negative');
    });
  });

  describe('calculateDueDate', () => {
    const testDate = new Date('2025-01-01');

    it('should calculate NET_7 due date', () => {
      const result = calculateDueDate('NET_7', testDate);
      expect(result.toISOString().split('T')[0]).toBe('2025-01-08');
    });

    it('should calculate NET_15 due date', () => {
      const result = calculateDueDate('NET_15', testDate);
      expect(result.toISOString().split('T')[0]).toBe('2025-01-16');
    });

    it('should calculate NET_30 due date', () => {
      const result = calculateDueDate('NET_30', testDate);
      expect(result.toISOString().split('T')[0]).toBe('2025-01-31');
    });

    it('should return same date for COD', () => {
      const result = calculateDueDate('COD', testDate);
      expect(result.toISOString().split('T')[0]).toBe('2025-01-01');
    });

    it('should default to 30 days for PARTIAL', () => {
      const result = calculateDueDate('PARTIAL', testDate);
      expect(result.toISOString().split('T')[0]).toBe('2025-01-31');
    });
  });
});


/**
 * Unit tests for data card formatters
 */

import { describe, it, expect } from 'vitest';
import { formatValue } from './formatters';

describe('formatValue', () => {
  describe('currency format', () => {
    it('should format positive currency values', () => {
      expect(formatValue(1234.56, 'currency')).toBe('$1,234.56');
      expect(formatValue(1000000, 'currency')).toBe('$1,000,000.00');
      expect(formatValue(0.99, 'currency')).toBe('$0.99');
    });

    it('should format negative currency values', () => {
      expect(formatValue(-1234.56, 'currency')).toBe('-$1,234.56');
      expect(formatValue(-100, 'currency')).toBe('-$100.00');
    });

    it('should handle zero', () => {
      expect(formatValue(0, 'currency')).toBe('$0.00');
    });

    it('should handle very large numbers', () => {
      expect(formatValue(1234567890.12, 'currency')).toBe('$1,234,567,890.12');
    });

    it('should handle very small numbers', () => {
      expect(formatValue(0.01, 'currency')).toBe('$0.01');
      expect(formatValue(0.001, 'currency')).toBe('$0.00');
    });
  });

  describe('number format', () => {
    it('should format positive numbers with commas', () => {
      expect(formatValue(1234, 'number')).toBe('1,234');
      expect(formatValue(1234567, 'number')).toBe('1,234,567');
    });

    it('should format negative numbers', () => {
      expect(formatValue(-1234, 'number')).toBe('-1,234');
    });

    it('should handle zero', () => {
      expect(formatValue(0, 'number')).toBe('0');
    });

    it('should handle decimals', () => {
      expect(formatValue(1234.56, 'number')).toBe('1,234.56');
      expect(formatValue(1234.5, 'number')).toBe('1,234.5');
    });

    it('should handle very large numbers', () => {
      expect(formatValue(1234567890, 'number')).toBe('1,234,567,890');
    });
  });

  describe('percentage format', () => {
    it('should format percentages with 2 decimal places', () => {
      expect(formatValue(25.5, 'percentage')).toBe('25.50%');
      expect(formatValue(100, 'percentage')).toBe('100.00%');
      expect(formatValue(0.5, 'percentage')).toBe('0.50%');
    });

    it('should handle negative percentages', () => {
      expect(formatValue(-10.5, 'percentage')).toBe('-10.50%');
    });

    it('should handle zero', () => {
      expect(formatValue(0, 'percentage')).toBe('0.00%');
    });

    it('should handle very small percentages', () => {
      expect(formatValue(0.01, 'percentage')).toBe('0.01%');
    });

    it('should handle percentages over 100', () => {
      expect(formatValue(150.75, 'percentage')).toBe('150.75%');
    });
  });

  describe('count format', () => {
    it('should format counts as integers', () => {
      expect(formatValue(123, 'count')).toBe('123');
      expect(formatValue(1234567, 'count')).toBe('1,234,567');
    });

    it('should handle zero', () => {
      expect(formatValue(0, 'count')).toBe('0');
    });

    it('should round decimals to integers', () => {
      expect(formatValue(123.7, 'count')).toBe('124');
      expect(formatValue(123.4, 'count')).toBe('123');
    });

    it('should handle negative counts', () => {
      expect(formatValue(-5, 'count')).toBe('-5');
    });
  });

  describe('edge cases', () => {
    it('should handle undefined values', () => {
      expect(formatValue(undefined as unknown as number, 'currency')).toBe('$0.00');
      expect(formatValue(undefined as unknown as number, 'number')).toBe('0');
      expect(formatValue(undefined as unknown as number, 'percentage')).toBe('0.00%');
      expect(formatValue(undefined as unknown as number, 'count')).toBe('0');
    });

    it('should handle null values', () => {
      expect(formatValue(null as unknown as number, 'currency')).toBe('$0.00');
      expect(formatValue(null as unknown as number, 'number')).toBe('0');
      expect(formatValue(null as unknown as number, 'percentage')).toBe('0.00%');
      expect(formatValue(null as unknown as number, 'count')).toBe('0');
    });

    it('should handle NaN', () => {
      expect(formatValue(NaN, 'currency')).toBe('$0.00');
      expect(formatValue(NaN, 'number')).toBe('0');
      expect(formatValue(NaN, 'percentage')).toBe('0.00%');
      expect(formatValue(NaN, 'count')).toBe('0');
    });

    it('should handle Infinity', () => {
      expect(formatValue(Infinity, 'currency')).toBe('$0.00');
      expect(formatValue(-Infinity, 'currency')).toBe('$0.00');
    });

    it('should handle string numbers', () => {
      expect(formatValue('1234' as unknown as number, 'currency')).toBe('$1,234.00');
      expect(formatValue('1234.56' as unknown as number, 'number')).toBe('1,234.56');
    });

    it('should handle invalid strings', () => {
      expect(formatValue('abc' as unknown as number, 'currency')).toBe('$0.00');
      expect(formatValue('abc' as unknown as number, 'number')).toBe('0');
    });
  });

  describe('precision', () => {
    it('should maintain precision for currency', () => {
      expect(formatValue(1234.567, 'currency')).toBe('$1,234.57');
      expect(formatValue(1234.564, 'currency')).toBe('$1,234.56');
    });

    it('should maintain precision for percentages', () => {
      expect(formatValue(12.345, 'percentage')).toBe('12.35%');
      expect(formatValue(12.344, 'percentage')).toBe('12.34%');
    });

    it('should round counts properly', () => {
      expect(formatValue(12.5, 'count')).toBe('13');
      expect(formatValue(12.4, 'count')).toBe('12');
    });
  });
});

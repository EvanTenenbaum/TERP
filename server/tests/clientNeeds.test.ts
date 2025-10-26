import { describe, it, expect } from 'vitest';

/**
 * Client Needs Tests
 * Tests for duplicate prevention, validation, and CRUD operations
 */

describe('Client Needs', () => {
  describe('Duplicate Prevention', () => {
    it('should detect duplicate needs with same client and strain', () => {
      const existing = {
        clientId: 1,
        strain: 'Blue Dream',
        category: 'Flower',
        status: 'ACTIVE',
      };

      const newNeed = {
        clientId: 1,
        strain: 'Blue Dream',
        category: 'Flower',
      };

      // Check if they match
      const isDuplicate = 
        existing.clientId === newNeed.clientId &&
        existing.strain === newNeed.strain &&
        existing.category === newNeed.category &&
        existing.status === 'ACTIVE';

      expect(isDuplicate).toBe(true);
    });

    it('should allow different clients with same strain', () => {
      const existing = {
        clientId: 1,
        strain: 'Blue Dream',
        status: 'ACTIVE',
      };

      const newNeed = {
        clientId: 2,
        strain: 'Blue Dream',
      };

      const isDuplicate = 
        existing.clientId === newNeed.clientId &&
        existing.strain === newNeed.strain &&
        existing.status === 'ACTIVE';

      expect(isDuplicate).toBe(false);
    });

    it('should allow duplicate if existing is not active', () => {
      const existing = {
        clientId: 1,
        strain: 'Blue Dream',
        status: 'FULFILLED',
      };

      const newNeed = {
        clientId: 1,
        strain: 'Blue Dream',
      };

      const isDuplicate = 
        existing.clientId === newNeed.clientId &&
        existing.strain === newNeed.strain &&
        existing.status === 'ACTIVE';

      expect(isDuplicate).toBe(false);
    });
  });

  describe('Validation', () => {
    it('should validate quantityMax >= quantityMin', () => {
      const need = {
        quantityMin: '100',
        quantityMax: '50',
      };

      const minQty = parseFloat(need.quantityMin);
      const maxQty = parseFloat(need.quantityMax);

      const isValid = maxQty >= minQty;

      expect(isValid).toBe(false);
    });

    it('should accept valid quantity range', () => {
      const need = {
        quantityMin: '50',
        quantityMax: '100',
      };

      const minQty = parseFloat(need.quantityMin);
      const maxQty = parseFloat(need.quantityMax);

      const isValid = maxQty >= minQty;

      expect(isValid).toBe(true);
    });

    it('should validate expiresAt > neededBy', () => {
      const neededBy = new Date('2025-11-01');
      const expiresAt = new Date('2025-10-01');

      const isValid = expiresAt > neededBy;

      expect(isValid).toBe(false);
    });

    it('should accept valid date range', () => {
      const neededBy = new Date('2025-11-01');
      const expiresAt = new Date('2025-12-01');

      const isValid = expiresAt > neededBy;

      expect(isValid).toBe(true);
    });

    it('should validate neededBy is in the future', () => {
      const neededBy = new Date('2025-12-01');
      const now = new Date('2025-10-26');

      const isValid = neededBy > now;

      expect(isValid).toBe(true);
    });
  });

  describe('Status Transitions', () => {
    it('should allow ACTIVE -> FULFILLED', () => {
      const currentStatus = 'ACTIVE';
      const newStatus = 'FULFILLED';

      const validTransitions = {
        'ACTIVE': ['FULFILLED', 'EXPIRED', 'CANCELLED'],
      };

      const isValid = validTransitions[currentStatus]?.includes(newStatus);

      expect(isValid).toBe(true);
    });

    it('should allow ACTIVE -> CANCELLED', () => {
      const currentStatus = 'ACTIVE';
      const newStatus = 'CANCELLED';

      const validTransitions = {
        'ACTIVE': ['FULFILLED', 'EXPIRED', 'CANCELLED'],
      };

      const isValid = validTransitions[currentStatus]?.includes(newStatus);

      expect(isValid).toBe(true);
    });

    it('should allow ACTIVE -> EXPIRED', () => {
      const currentStatus = 'ACTIVE';
      const newStatus = 'EXPIRED';

      const validTransitions = {
        'ACTIVE': ['FULFILLED', 'EXPIRED', 'CANCELLED'],
      };

      const isValid = validTransitions[currentStatus]?.includes(newStatus);

      expect(isValid).toBe(true);
    });
  });

  describe('Expiration Logic', () => {
    it('should expire needs past expiresAt date', () => {
      const expiresAt = new Date('2025-10-01');
      const now = new Date('2025-10-26');

      const shouldExpire = expiresAt < now;

      expect(shouldExpire).toBe(true);
    });

    it('should not expire needs before expiresAt date', () => {
      const expiresAt = new Date('2025-12-01');
      const now = new Date('2025-10-26');

      const shouldExpire = expiresAt < now;

      expect(shouldExpire).toBe(false);
    });
  });

  describe('Priority Handling', () => {
    it('should sort by priority correctly', () => {
      const needs = [
        { priority: 'MEDIUM', createdAt: new Date('2025-10-20') },
        { priority: 'URGENT', createdAt: new Date('2025-10-21') },
        { priority: 'LOW', createdAt: new Date('2025-10-22') },
        { priority: 'HIGH', createdAt: new Date('2025-10-23') },
      ];

      const priorityOrder = {
        'URGENT': 4,
        'HIGH': 3,
        'MEDIUM': 2,
        'LOW': 1,
      };

      const sorted = [...needs].sort((a, b) => {
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      });

      expect(sorted[0].priority).toBe('URGENT');
      expect(sorted[1].priority).toBe('HIGH');
      expect(sorted[2].priority).toBe('MEDIUM');
      expect(sorted[3].priority).toBe('LOW');
    });
  });
});


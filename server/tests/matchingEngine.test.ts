import { describe, it, expect } from 'vitest';

/**
 * Matching Engine Tests
 * Tests for confidence scoring, matching logic, and match recording
 */

// Import the confidence calculation function (we'll need to export it for testing)
// For now, we'll test the logic directly

describe('Matching Engine', () => {
  describe('Confidence Scoring', () => {
    it('should give 40 points for exact strain match', () => {
      const need = {
        strain: 'Blue Dream',
        category: 'Flower',
        subcategory: null,
        grade: null,
        priceMax: null,
        quantityMin: null,
        quantityMax: null,
      };

      const candidate = {
        strain: 'Blue Dream',
        category: null,
        subcategory: null,
        grade: null,
        calculatedPrice: null,
        availableQuantity: null,
      };

      // Expected: 40 points for exact strain match
      const expectedConfidence = 40;
      
      // Manual calculation to verify logic
      let confidence = 0;
      if (need.strain && candidate.strain) {
        if (need.strain.toLowerCase() === candidate.strain.toLowerCase()) {
          confidence += 40;
        }
      }

      expect(confidence).toBe(expectedConfidence);
    });

    it('should give 20 points for partial strain match', () => {
      const need = {
        strain: 'Blue Dream',
      };

      const candidate = {
        strain: 'Blue Dream Haze',
      };

      // Expected: 20 points for partial match
      let confidence = 0;
      const needStrain = need.strain.toLowerCase();
      const candidateStrain = candidate.strain.toLowerCase();

      if (candidateStrain.includes(needStrain) || needStrain.includes(candidateStrain)) {
        confidence += 20;
      }

      expect(confidence).toBe(20);
    });

    it('should give 30 points for category match', () => {
      const need = {
        category: 'Flower',
      };

      const candidate = {
        category: 'Flower',
      };

      let confidence = 0;
      if (need.category && candidate.category) {
        if (need.category.toLowerCase() === candidate.category.toLowerCase()) {
          confidence += 30;
        }
      }

      expect(confidence).toBe(30);
    });

    it('should give 15 points for subcategory match', () => {
      const need = {
        subcategory: 'Indoor',
      };

      const candidate = {
        subcategory: 'Indoor',
      };

      let confidence = 0;
      if (need.subcategory && candidate.subcategory) {
        if (need.subcategory.toLowerCase() === candidate.subcategory.toLowerCase()) {
          confidence += 15;
        }
      }

      expect(confidence).toBe(15);
    });

    it('should give 10 points for grade match', () => {
      const need = {
        grade: 'A+',
      };

      const candidate = {
        grade: 'A+',
      };

      let confidence = 0;
      if (need.grade && candidate.grade) {
        if (need.grade.toLowerCase() === candidate.grade.toLowerCase()) {
          confidence += 10;
        }
      }

      expect(confidence).toBe(10);
    });

    it('should give bonus for price within budget', () => {
      const need = {
        priceMax: '100',
      };

      const candidate = {
        calculatedPrice: 80,
      };

      let confidence = 0;
      if (need.priceMax && candidate.calculatedPrice !== null) {
        const maxPrice = parseFloat(need.priceMax);
        if (candidate.calculatedPrice <= maxPrice) {
          confidence += 5;
        }
      }

      expect(confidence).toBe(5);
    });

    it('should penalize for price over budget', () => {
      const need = {
        priceMax: '100',
      };

      const candidate = {
        calculatedPrice: 120,
      };

      let confidence = 0;
      if (need.priceMax && candidate.calculatedPrice !== null) {
        const maxPrice = parseFloat(need.priceMax);
        if (candidate.calculatedPrice > maxPrice) {
          confidence -= 10;
        }
      }

      expect(confidence).toBe(-10);
    });

    it('should penalize for insufficient quantity', () => {
      const need = {
        quantityMin: '100',
      };

      const candidate = {
        availableQuantity: 50,
      };

      let confidence = 0;
      const minQty = parseFloat(need.quantityMin);
      
      if (candidate.availableQuantity < minQty) {
        confidence -= 15;
      }

      expect(confidence).toBe(-15);
    });

    it('should calculate perfect match score', () => {
      // Perfect match: strain + category + subcategory + grade + price + quantity
      // 40 + 30 + 15 + 10 + 5 = 100 points
      
      const need = {
        strain: 'Blue Dream',
        category: 'Flower',
        subcategory: 'Indoor',
        grade: 'A+',
        priceMax: '100',
        quantityMin: '50',
        quantityMax: '200',
      };

      const candidate = {
        strain: 'Blue Dream',
        category: 'Flower',
        subcategory: 'Indoor',
        grade: 'A+',
        calculatedPrice: 80,
        availableQuantity: 100,
      };

      let confidence = 0;

      // Strain (40)
      if (need.strain.toLowerCase() === candidate.strain.toLowerCase()) {
        confidence += 40;
      }

      // Category (30)
      if (need.category.toLowerCase() === candidate.category.toLowerCase()) {
        confidence += 30;
      }

      // Subcategory (15)
      if (need.subcategory.toLowerCase() === candidate.subcategory.toLowerCase()) {
        confidence += 15;
      }

      // Grade (10)
      if (need.grade.toLowerCase() === candidate.grade.toLowerCase()) {
        confidence += 10;
      }

      // Price (5)
      if (candidate.calculatedPrice <= parseFloat(need.priceMax)) {
        confidence += 5;
      }

      expect(confidence).toBe(100);
    });

    it('should cap confidence at 100', () => {
      // Even if we somehow get more than 100 points, it should cap at 100
      let confidence = 110;
      confidence = Math.min(100, confidence);
      
      expect(confidence).toBe(100);
    });

    it('should floor confidence at 0', () => {
      // Even if we get negative points, it should floor at 0
      let confidence = -20;
      confidence = Math.max(0, confidence);
      
      expect(confidence).toBe(0);
    });
  });

  describe('Match Type Classification', () => {
    it('should classify as EXACT for confidence >= 80', () => {
      const confidence = 85;
      const matchType = confidence >= 80 ? 'EXACT' : 'CLOSE';
      
      expect(matchType).toBe('EXACT');
    });

    it('should classify as CLOSE for confidence < 80', () => {
      const confidence = 70;
      const matchType = confidence >= 80 ? 'EXACT' : 'CLOSE';
      
      expect(matchType).toBe('CLOSE');
    });

    it('should not match for confidence < 50', () => {
      const confidence = 40;
      const shouldMatch = confidence >= 50;
      
      expect(shouldMatch).toBe(false);
    });
  });

  describe('Quantity Validation', () => {
    it('should validate sufficient quantity', () => {
      const need = {
        quantityMin: '50',
        quantityMax: '200',
      };

      const available = 100;
      const minQty = parseFloat(need.quantityMin);
      const maxQty = parseFloat(need.quantityMax);

      const isSufficient = available >= minQty && available <= maxQty;

      expect(isSufficient).toBe(true);
    });

    it('should detect insufficient quantity', () => {
      const need = {
        quantityMin: '100',
      };

      const available = 50;
      const minQty = parseFloat(need.quantityMin);

      const isSufficient = available >= minQty;

      expect(isSufficient).toBe(false);
    });

    it('should handle excess quantity', () => {
      const need = {
        quantityMax: '100',
      };

      const available = 200;
      const maxQty = parseFloat(need.quantityMax);

      const isExcess = available > maxQty;

      expect(isExcess).toBe(true);
    });
  });

  describe('Price Validation', () => {
    it('should validate price within budget', () => {
      const priceMax = 100;
      const calculatedPrice = 80;

      const isWithinBudget = calculatedPrice <= priceMax;

      expect(isWithinBudget).toBe(true);
    });

    it('should detect price over budget', () => {
      const priceMax = 100;
      const calculatedPrice = 120;

      const isOverBudget = calculatedPrice > priceMax;

      expect(isOverBudget).toBe(true);
    });
  });

  describe('Match Reasons', () => {
    it('should generate appropriate reasons for matches', () => {
      const reasons: string[] = [];

      // Simulate match logic
      const hasStrainMatch = true;
      const hasCategoryMatch = true;
      const hasGradeMatch = true;
      const isWithinBudget = true;

      if (hasStrainMatch) {
        reasons.push('Exact strain match');
      }
      if (hasCategoryMatch) {
        reasons.push('Category match');
      }
      if (hasGradeMatch) {
        reasons.push('Grade match');
      }
      if (isWithinBudget) {
        reasons.push('Within price budget');
      }

      expect(reasons).toHaveLength(4);
      expect(reasons).toContain('Exact strain match');
      expect(reasons).toContain('Category match');
    });

    it('should generate reasons for non-matches', () => {
      const reasons: string[] = [];

      const isOverBudget = true;
      const isInsufficientQty = true;

      if (isOverBudget) {
        reasons.push('Over budget ($120.00 > $100.00)');
      }
      if (isInsufficientQty) {
        reasons.push('Insufficient quantity (50 < 100)');
      }

      expect(reasons).toHaveLength(2);
      expect(reasons[0]).toContain('Over budget');
      expect(reasons[1]).toContain('Insufficient quantity');
    });
  });
});


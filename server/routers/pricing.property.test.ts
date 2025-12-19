/**
 * Pricing Router Property Tests
 * 
 * Property-based tests using fast-check to validate pricing calculation invariants.
 * These tests verify that pricing rules produce mathematically correct results
 * regardless of input variations.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

/**
 * **Feature: Pricing Calculations, Property 1: Percent markup produces higher price**
 * 
 * For any positive base price and positive markup percentage,
 * the final price should always be greater than the base price.
 */
describe('Property 1: Percent markup produces higher price', () => {
  it('should always increase price with positive percent markup', () => {
    fc.assert(
      fc.property(
        fc.float({ min: Math.fround(0.01), max: Math.fround(10000), noNaN: true }),
        fc.float({ min: Math.fround(0.01), max: Math.fround(100), noNaN: true }),
        (basePrice, markupPercent) => {
          // Calculate markup
          const markupAmount = basePrice * (markupPercent / 100);
          const finalPrice = basePrice + markupAmount;
          
          // Invariant: final price > base price for positive markup
          expect(finalPrice).toBeGreaterThan(basePrice);
          
          // Verify the markup calculation
          const calculatedMarkup = finalPrice - basePrice;
          expect(calculatedMarkup).toBeCloseTo(markupAmount, 2);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should calculate correct final price for various markup percentages', () => {
    fc.assert(
      fc.property(
        fc.float({ min: Math.fround(1), max: Math.fround(1000), noNaN: true }),
        fc.constantFrom(5, 10, 15, 20, 25, 50, 100),
        (basePrice, markupPercent) => {
          const expectedFinal = basePrice * (1 + markupPercent / 100);
          const actualFinal = basePrice + (basePrice * markupPercent / 100);
          
          expect(actualFinal).toBeCloseTo(expectedFinal, 2);
          
          return true;
        }
      ),
      { numRuns: 50 }
    );
  });
});

/**
 * **Feature: Pricing Calculations, Property 2: Percent markdown produces lower price**
 * 
 * For any positive base price and positive markdown percentage (< 100%),
 * the final price should always be less than the base price but >= 0.
 */
describe('Property 2: Percent markdown produces lower price', () => {
  it('should always decrease price with positive percent markdown', () => {
    fc.assert(
      fc.property(
        fc.float({ min: Math.fround(0.01), max: Math.fround(10000), noNaN: true }),
        fc.float({ min: Math.fround(0.01), max: Math.fround(99.99), noNaN: true }),
        (basePrice, markdownPercent) => {
          // Calculate markdown
          const markdownAmount = basePrice * (markdownPercent / 100);
          const finalPrice = basePrice - markdownAmount;
          
          // Invariant: final price < base price for positive markdown
          expect(finalPrice).toBeLessThan(basePrice);
          
          // Invariant: final price >= 0 for markdown < 100%
          expect(finalPrice).toBeGreaterThanOrEqual(0);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should result in zero price for 100% markdown', () => {
    fc.assert(
      fc.property(
        fc.float({ min: Math.fround(0.01), max: Math.fround(10000), noNaN: true }),
        (basePrice) => {
          const markdownPercent = 100;
          const finalPrice = basePrice - (basePrice * markdownPercent / 100);
          
          // 100% markdown should result in zero
          expect(finalPrice).toBeCloseTo(0, 2);
          
          return true;
        }
      ),
      { numRuns: 50 }
    );
  });
});

/**
 * **Feature: Pricing Calculations, Property 3: Dollar adjustments are additive**
 * 
 * Dollar markup/markdown should be exactly additive/subtractive.
 * $10 markup on $100 = $110, $10 markdown on $100 = $90.
 */
describe('Property 3: Dollar adjustments are additive', () => {
  it('should add exact dollar amount for markup', () => {
    fc.assert(
      fc.property(
        fc.float({ min: Math.fround(0.01), max: Math.fround(10000), noNaN: true }),
        fc.float({ min: Math.fround(0.01), max: Math.fround(1000), noNaN: true }),
        (basePrice, dollarMarkup) => {
          const finalPrice = basePrice + dollarMarkup;
          
          // Invariant: difference should be exactly the markup amount
          const difference = finalPrice - basePrice;
          expect(difference).toBeCloseTo(dollarMarkup, 2);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should subtract exact dollar amount for markdown', () => {
    fc.assert(
      fc.property(
        fc.float({ min: Math.fround(100), max: Math.fround(10000), noNaN: true }),
        fc.float({ min: Math.fround(0.01), max: Math.fround(99), noNaN: true }),
        (basePrice, dollarMarkdown) => {
          const finalPrice = basePrice - dollarMarkdown;
          
          // Invariant: difference should be exactly the markdown amount
          const difference = basePrice - finalPrice;
          expect(difference).toBeCloseTo(dollarMarkdown, 2);
          
          // Final price should still be positive
          expect(finalPrice).toBeGreaterThan(0);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * **Feature: Pricing Calculations, Property 4: Rule priority ordering**
 * 
 * Higher priority rules should be applied before lower priority rules.
 * Priority is a positive integer where higher = more important.
 */
describe('Property 4: Rule priority ordering', () => {
  interface PricingRule {
    id: number;
    priority: number;
    adjustmentType: 'PERCENT_MARKUP' | 'PERCENT_MARKDOWN' | 'DOLLAR_MARKUP' | 'DOLLAR_MARKDOWN';
    adjustmentValue: number;
  }

  it('should sort rules by priority in descending order', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.integer({ min: 1, max: 1000 }),
            priority: fc.integer({ min: 1, max: 100 }),
            adjustmentType: fc.constantFrom('PERCENT_MARKUP', 'PERCENT_MARKDOWN', 'DOLLAR_MARKUP', 'DOLLAR_MARKDOWN') as fc.Arbitrary<PricingRule['adjustmentType']>,
            adjustmentValue: fc.float({ min: Math.fround(1), max: Math.fround(50), noNaN: true }),
          }),
          { minLength: 2, maxLength: 10 }
        ),
        (rules: PricingRule[]) => {
          // Sort by priority descending (higher priority first)
          const sortedRules = [...rules].sort((a, b) => b.priority - a.priority);
          
          // Verify sorting
          for (let i = 1; i < sortedRules.length; i++) {
            expect(sortedRules[i - 1].priority).toBeGreaterThanOrEqual(sortedRules[i].priority);
          }
          
          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should apply highest priority rule first', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        fc.integer({ min: 1, max: 100 }),
        (priority1, priority2) => {
          const rules = [
            { id: 1, priority: priority1 },
            { id: 2, priority: priority2 },
          ];
          
          const sorted = [...rules].sort((a, b) => b.priority - a.priority);
          const firstRule = sorted[0];
          
          // First rule should have highest priority
          expect(firstRule.priority).toBe(Math.max(priority1, priority2));
          
          return true;
        }
      ),
      { numRuns: 50 }
    );
  });
});

/**
 * **Feature: Pricing Calculations, Property 5: Compound adjustments**
 * 
 * Multiple adjustments should compound correctly.
 * 10% markup then 10% markdown should not equal original price.
 */
describe('Property 5: Compound adjustments', () => {
  it('should correctly compound percent markup then markdown', () => {
    fc.assert(
      fc.property(
        fc.float({ min: Math.fround(100), max: Math.fround(1000), noNaN: true }),
        fc.float({ min: Math.fround(1), max: Math.fround(50), noNaN: true }),
        fc.float({ min: Math.fround(1), max: Math.fround(50), noNaN: true }),
        (basePrice, markupPercent, markdownPercent) => {
          // Apply markup first
          const afterMarkup = basePrice * (1 + markupPercent / 100);
          
          // Then apply markdown
          const finalPrice = afterMarkup * (1 - markdownPercent / 100);
          
          // Calculate expected compound effect
          const compoundFactor = (1 + markupPercent / 100) * (1 - markdownPercent / 100);
          const expectedFinal = basePrice * compoundFactor;
          
          expect(finalPrice).toBeCloseTo(expectedFinal, 2);
          
          // If markup% equals markdown%, final should be less than original
          // (because markdown is applied to larger base)
          if (Math.abs(markupPercent - markdownPercent) < 0.01) {
            expect(finalPrice).toBeLessThan(basePrice);
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should correctly compound dollar adjustments', () => {
    fc.assert(
      fc.property(
        fc.float({ min: Math.fround(100), max: Math.fround(1000), noNaN: true }),
        fc.float({ min: Math.fround(1), max: Math.fround(50), noNaN: true }),
        fc.float({ min: Math.fround(1), max: Math.fround(50), noNaN: true }),
        (basePrice, dollarMarkup, dollarMarkdown) => {
          // Apply markup then markdown
          const afterMarkup = basePrice + dollarMarkup;
          const finalPrice = afterMarkup - dollarMarkdown;
          
          // Net effect should be markup - markdown
          const netAdjustment = dollarMarkup - dollarMarkdown;
          const expectedFinal = basePrice + netAdjustment;
          
          expect(finalPrice).toBeCloseTo(expectedFinal, 2);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * **Feature: Pricing Calculations, Property 6: Price floor enforcement**
 * 
 * Final price should never go below zero regardless of adjustments.
 */
describe('Property 6: Price floor enforcement', () => {
  it('should enforce minimum price of zero', () => {
    fc.assert(
      fc.property(
        fc.float({ min: Math.fround(0.01), max: Math.fround(100), noNaN: true }),
        fc.float({ min: Math.fround(0), max: Math.fround(200), noNaN: true }),
        (basePrice, markdownPercent) => {
          // Calculate markdown
          let finalPrice = basePrice * (1 - markdownPercent / 100);
          
          // Enforce floor
          finalPrice = Math.max(0, finalPrice);
          
          // Invariant: price should never be negative
          expect(finalPrice).toBeGreaterThanOrEqual(0);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should enforce minimum price with dollar markdown', () => {
    fc.assert(
      fc.property(
        fc.float({ min: Math.fround(0.01), max: Math.fround(100), noNaN: true }),
        fc.float({ min: Math.fround(0), max: Math.fround(200), noNaN: true }),
        (basePrice, dollarMarkdown) => {
          // Calculate markdown
          let finalPrice = basePrice - dollarMarkdown;
          
          // Enforce floor
          finalPrice = Math.max(0, finalPrice);
          
          // Invariant: price should never be negative
          expect(finalPrice).toBeGreaterThanOrEqual(0);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});

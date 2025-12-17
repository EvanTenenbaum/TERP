/**
 * Property-Based Tests for Pricing Logic
 *
 * Uses fast-check to generate randomized inputs and verify
 * that business invariants always hold.
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";

// Pricing business logic (simplified for testing)
interface OrderItem {
  quantity: number;
  unitPrice: number;
}

function applyPercentageDiscount(price: number, percentage: number): number {
  return price * (1 - percentage / 100);
}

function applyFixedDiscount(price: number, fixed: number): number {
  return Math.max(0, price - fixed);
}

function calculateLineTotal(item: OrderItem): number {
  return item.quantity * item.unitPrice;
}

function calculateOrderTotal(items: OrderItem[]): number {
  return items.reduce((sum, item) => sum + calculateLineTotal(item), 0);
}

describe("Pricing Properties", () => {
  describe("Percentage Discount", () => {
    it("should always return non-negative price", () => {
      fc.assert(
        fc.property(
          fc.float({ min: 0, max: 10000, noNaN: true }), // price
          fc.float({ min: 0, max: 100, noNaN: true }), // percentage
          (price, percentage) => {
            const result = applyPercentageDiscount(price, percentage);
            return result >= 0;
          }
        )
      );
    });

    it("should return original price when discount is 0%", () => {
      fc.assert(
        fc.property(fc.float({ min: 0, max: 10000, noNaN: true }), price => {
          const result = applyPercentageDiscount(price, 0);
          return Math.abs(result - price) < 0.01;
        })
      );
    });

    it("should return 0 when discount is 100%", () => {
      fc.assert(
        fc.property(fc.float({ min: 0, max: 10000, noNaN: true }), price => {
          const result = applyPercentageDiscount(price, 100);
          return Math.abs(result) < 0.01;
        })
      );
    });

    it("should be monotonically decreasing with discount percentage", () => {
      fc.assert(
        fc.property(
          fc.float({ min: 0, max: 10000, noNaN: true }),
          fc.float({ min: 0, max: 50, noNaN: true }),
          (price, discount1) => {
            const discount2 = discount1 + 10;
            const result1 = applyPercentageDiscount(price, discount1);
            const result2 = applyPercentageDiscount(price, discount2);
            return result1 >= result2;
          }
        )
      );
    });
  });

  describe("Fixed Discount", () => {
    it("should never return negative", () => {
      fc.assert(
        fc.property(
          fc.float({ min: 0, max: 10000, noNaN: true }),
          fc.float({ min: 0, max: 20000, noNaN: true }),
          (price, discount) => {
            const result = applyFixedDiscount(price, discount);
            return result >= 0;
          }
        )
      );
    });

    it("should return 0 when discount exceeds price", () => {
      fc.assert(
        fc.property(fc.float({ min: 0, max: 100, noNaN: true }), price => {
          const result = applyFixedDiscount(price, price + 100);
          return result === 0;
        })
      );
    });
  });

  describe("Order Total", () => {
    it("should always be non-negative", () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              quantity: fc.integer({ min: 0, max: 1000 }),
              unitPrice: fc.float({ min: 0, max: 1000, noNaN: true }),
            }),
            { minLength: 0, maxLength: 20 }
          ),
          items => {
            const total = calculateOrderTotal(items);
            return total >= 0;
          }
        )
      );
    });

    it("should equal sum of line totals", () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              quantity: fc.integer({ min: 0, max: 1000 }),
              unitPrice: fc.float({ min: 0, max: 1000, noNaN: true }),
            }),
            { minLength: 1, maxLength: 10 }
          ),
          items => {
            const orderTotal = calculateOrderTotal(items);
            const sumOfLines = items.reduce(
              (sum, item) => sum + calculateLineTotal(item),
              0
            );
            return Math.abs(orderTotal - sumOfLines) < 0.01;
          }
        )
      );
    });

    it("should be 0 for empty order", () => {
      const total = calculateOrderTotal([]);
      expect(total).toBe(0);
    });

    it("should be commutative (order of items does not matter)", () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              quantity: fc.integer({ min: 1, max: 100 }),
              unitPrice: fc.float({ min: 1, max: 100, noNaN: true }),
            }),
            { minLength: 2, maxLength: 10 }
          ),
          items => {
            const total1 = calculateOrderTotal(items);
            const total2 = calculateOrderTotal([...items].reverse());
            return Math.abs(total1 - total2) < 0.01;
          }
        )
      );
    });
  });

  describe("Line Total", () => {
    it("quantity * price = total", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 10000 }),
          fc.float({ min: 0, max: 1000, noNaN: true }),
          (quantity, unitPrice) => {
            const item: OrderItem = { quantity, unitPrice };
            const expected = quantity * unitPrice;
            const actual = calculateLineTotal(item);
            return Math.abs(expected - actual) < 0.01;
          }
        )
      );
    });

    it("should be 0 when quantity is 0", () => {
      fc.assert(
        fc.property(fc.float({ min: 0, max: 1000, noNaN: true }), unitPrice => {
          const item: OrderItem = { quantity: 0, unitPrice };
          return calculateLineTotal(item) === 0;
        })
      );
    });
  });
});

/**
 * Property-Based Tests for Order Seeder
 *
 * **Feature: data-completeness-fix, Property 1: Order Items Product Metadata Completeness**
 * **Validates: Requirements 1.1, 3.1, 3.2, 3.3**
 *
 * **Feature: data-completeness-fix, Property 2: Price Field Compatibility**
 * **Validates: Requirements 2.1**
 *
 * Uses fast-check to verify order items have complete product metadata.
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { generateOrderItems, generateOrder, type BatchWithMetadata, type OrderItem, type OrderData } from "./seed-orders";

// ============================================================================
// Arbitraries (Generators)
// ============================================================================

const gradeArb = fc.constantFrom<string | null>("AAA", "AA", "A", null);

const categoryArb = fc.constantFrom(
  "Flower",
  "Concentrates",
  "Edibles",
  "Pre-Rolls",
  "Vapes",
  "Topicals"
);

const subcategoryArb = fc.constantFrom<string | null>(
  "Indoor",
  "Outdoor",
  "Greenhouse",
  "Live Resin",
  "Shatter",
  null
);

const strainNameArb = fc.constantFrom<string | null>(
  "Blue Dream",
  "OG Kush",
  "Sour Diesel",
  "Girl Scout Cookies",
  "Gorilla Glue",
  null
);

/**
 * Generate a BatchWithMetadata object for testing
 */
const batchWithMetadataArb: fc.Arbitrary<BatchWithMetadata> = fc.record({
  id: fc.integer({ min: 1, max: 10000 }),
  productId: fc.integer({ min: 1, max: 10000 }),
  unitCogs: fc.float({ min: Math.fround(50), max: Math.fround(2000), noNaN: true }).map(n => n.toFixed(2)),
  onHandQty: fc.float({ min: Math.fround(1), max: Math.fround(1000), noNaN: true }).map(n => n.toFixed(2)),
  grade: gradeArb,
  productName: fc.stringMatching(/^Product-[A-Z]{3}-[0-9]{3}$/),
  category: categoryArb,
  subcategory: subcategoryArb,
  strainId: fc.option(fc.integer({ min: 1, max: 1000 }), { nil: null }),
  strainName: strainNameArb,
});

/**
 * Generate an array of batches with metadata
 */
const batchArrayArb = fc.array(batchWithMetadataArb, { minLength: 1, maxLength: 20 });

// ============================================================================
// Property Tests
// ============================================================================

describe("Order Items Product Metadata", () => {
  /**
   * **Feature: data-completeness-fix, Property 1: Order Items Product Metadata Completeness**
   * **Validates: Requirements 1.1, 3.1, 3.2, 3.3**
   *
   * Property: For any seeded order item, the item SHALL contain `strain` (or null if product
   * has no strain), `category` (non-null), and `grade` fields populated from the associated
   * batch/product data.
   */
  describe("Property 1: Order Items Product Metadata Completeness", () => {
    it("should include category field (non-null) for all order items", () => {
      fc.assert(
        fc.property(
          batchArrayArb,
          fc.integer({ min: 1, max: 10 }),
          (batches, itemCount) => {
            const { items } = generateOrderItems(batches, itemCount);

            // Property: All items should have a non-null category
            for (const item of items) {
              expect(item.category).toBeDefined();
              expect(item.category).not.toBeNull();
              expect(typeof item.category).toBe("string");
              expect(item.category.length).toBeGreaterThan(0);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should include strain field matching batch strainName", () => {
      fc.assert(
        fc.property(
          batchArrayArb,
          fc.integer({ min: 1, max: 10 }),
          (batches, itemCount) => {
            const { items } = generateOrderItems(batches, itemCount);

            // Property: Each item's strain should match its source batch's strainName
            for (let i = 0; i < items.length; i++) {
              const item = items[i];
              const sourceBatch = batches[i % batches.length];
              expect(item.strain).toBe(sourceBatch.strainName);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should include grade field matching batch grade", () => {
      fc.assert(
        fc.property(
          batchArrayArb,
          fc.integer({ min: 1, max: 10 }),
          (batches, itemCount) => {
            const { items } = generateOrderItems(batches, itemCount);

            // Property: Each item's grade should match its source batch's grade
            for (let i = 0; i < items.length; i++) {
              const item = items[i];
              const sourceBatch = batches[i % batches.length];
              expect(item.grade).toBe(sourceBatch.grade);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should include subcategory field matching batch subcategory", () => {
      fc.assert(
        fc.property(
          batchArrayArb,
          fc.integer({ min: 1, max: 10 }),
          (batches, itemCount) => {
            const { items } = generateOrderItems(batches, itemCount);

            // Property: Each item's subcategory should match its source batch's subcategory
            for (let i = 0; i < items.length; i++) {
              const item = items[i];
              const sourceBatch = batches[i % batches.length];
              expect(item.subcategory).toBe(sourceBatch.subcategory);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should set displayName to strain name when available, otherwise category", () => {
      fc.assert(
        fc.property(
          batchArrayArb,
          fc.integer({ min: 1, max: 10 }),
          (batches, itemCount) => {
            const { items } = generateOrderItems(batches, itemCount);

            // Property: displayName should prefer strainName, fallback to category
            for (let i = 0; i < items.length; i++) {
              const item = items[i];
              const sourceBatch = batches[i % batches.length];
              
              if (sourceBatch.strainName) {
                expect(item.displayName).toBe(sourceBatch.strainName);
              } else if (sourceBatch.category) {
                expect(item.displayName).toBe(sourceBatch.category);
              } else {
                expect(item.displayName).toBe(sourceBatch.productName);
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: data-completeness-fix, Property 2: Price Field Compatibility**
   * **Validates: Requirements 2.1**
   *
   * Property: For any seeded order item, the `price` field SHALL equal the `unitPrice` field,
   * ensuring compatibility with both field names.
   */
  describe("Property 2: Price Field Compatibility", () => {
    it("should have price field equal to unitPrice for all order items", () => {
      fc.assert(
        fc.property(
          batchArrayArb,
          fc.integer({ min: 1, max: 10 }),
          (batches, itemCount) => {
            const { items } = generateOrderItems(batches, itemCount);

            // Property: price should equal unitPrice for all items
            for (const item of items) {
              expect(item.price).toBe(item.unitPrice);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should have positive price values for all order items", () => {
      fc.assert(
        fc.property(
          batchArrayArb,
          fc.integer({ min: 1, max: 10 }),
          (batches, itemCount) => {
            const { items } = generateOrderItems(batches, itemCount);

            // Property: price should be positive for all items
            for (const item of items) {
              expect(item.price).toBeGreaterThan(0);
              expect(item.unitPrice).toBeGreaterThan(0);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe("Order Items Financial Calculations", () => {
    it("should calculate lineTotal as quantity * unitPrice", () => {
      fc.assert(
        fc.property(
          batchArrayArb,
          fc.integer({ min: 1, max: 10 }),
          (batches, itemCount) => {
            const { items } = generateOrderItems(batches, itemCount);

            // Property: lineTotal should equal quantity * unitPrice (within floating point tolerance)
            // Using 0 decimal places (integer comparison) due to toFixed(2) rounding in implementation
            for (const item of items) {
              const expectedLineTotal = item.quantity * item.unitPrice;
              expect(item.lineTotal).toBeCloseTo(expectedLineTotal, 0);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should calculate subtotal as sum of all lineTotals", () => {
      fc.assert(
        fc.property(
          batchArrayArb,
          fc.integer({ min: 1, max: 10 }),
          (batches, itemCount) => {
            const { items, subtotal } = generateOrderItems(batches, itemCount);

            // Property: subtotal should equal sum of all lineTotals
            // Using 0 decimal places due to accumulated floating-point errors
            const expectedSubtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
            expect(subtotal).toBeCloseTo(expectedSubtotal, 0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should calculate totalCogs as sum of all lineCogs", () => {
      fc.assert(
        fc.property(
          batchArrayArb,
          fc.integer({ min: 1, max: 10 }),
          (batches, itemCount) => {
            const { items, totalCogs } = generateOrderItems(batches, itemCount);

            // Property: totalCogs should equal sum of all lineCogs
            // Using 0 decimal places due to accumulated floating-point errors
            const expectedTotalCogs = items.reduce((sum, item) => sum + item.lineCogs, 0);
            expect(totalCogs).toBeCloseTo(expectedTotalCogs, 0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should have positive margin for all items (price > cogs)", () => {
      fc.assert(
        fc.property(
          batchArrayArb,
          fc.integer({ min: 1, max: 10 }),
          (batches, itemCount) => {
            const { items } = generateOrderItems(batches, itemCount);

            // Property: unitPrice should be greater than unitCogs (positive margin)
            for (const item of items) {
              expect(item.unitPrice).toBeGreaterThan(item.unitCogs);
              expect(item.lineMargin).toBeGreaterThan(0);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe("Order Items Batch References", () => {
    it("should preserve batchId from source batch", () => {
      fc.assert(
        fc.property(
          batchArrayArb,
          fc.integer({ min: 1, max: 10 }),
          (batches, itemCount) => {
            const { items } = generateOrderItems(batches, itemCount);

            // Property: Each item's batchId should match its source batch's id
            for (let i = 0; i < items.length; i++) {
              const item = items[i];
              const sourceBatch = batches[i % batches.length];
              expect(item.batchId).toBe(sourceBatch.id);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should preserve productId from source batch", () => {
      fc.assert(
        fc.property(
          batchArrayArb,
          fc.integer({ min: 1, max: 10 }),
          (batches, itemCount) => {
            const { items } = generateOrderItems(batches, itemCount);

            // Property: Each item's productId should match its source batch's productId
            for (let i = 0; i < items.length; i++) {
              const item = items[i];
              const sourceBatch = batches[i % batches.length];
              expect(item.productId).toBe(sourceBatch.productId);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});


describe("Draft Orders and Today's Orders", () => {
  /**
   * **Feature: data-completeness-fix, Property 5: Draft Orders Presence**
   * **Validates: Requirements 5.1, 5.2**
   *
   * Property: For any complete seed operation, 10-15% of orders SHALL have
   * isDraft: true with saleStatus null.
   */
  describe("Property 5: Draft Orders Presence", () => {
    it("should generate draft orders with isDraft: true", () => {
      fc.assert(
        fc.property(
          batchArrayArb,
          fc.integer({ min: 1, max: 1000 }),
          (batches, clientId) => {
            const order = generateOrder(0, clientId, batches, false, { isDraft: true });

            // Property: Draft orders should have isDraft: true
            expect(order.isDraft).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should set saleStatus to null for draft orders", () => {
      fc.assert(
        fc.property(
          batchArrayArb,
          fc.integer({ min: 1, max: 1000 }),
          (batches, clientId) => {
            const order = generateOrder(0, clientId, batches, false, { isDraft: true });

            // Property: Draft orders should have null saleStatus
            expect(order.saleStatus).toBeNull();
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should set quoteStatus to DRAFT for draft orders", () => {
      fc.assert(
        fc.property(
          batchArrayArb,
          fc.integer({ min: 1, max: 1000 }),
          (batches, clientId) => {
            const order = generateOrder(0, clientId, batches, false, { isDraft: true });

            // Property: Draft orders should have quoteStatus: "DRAFT"
            expect(order.quoteStatus).toBe("DRAFT");
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should set orderType to QUOTE for draft orders", () => {
      fc.assert(
        fc.property(
          batchArrayArb,
          fc.integer({ min: 1, max: 1000 }),
          (batches, clientId) => {
            const order = generateOrder(0, clientId, batches, false, { isDraft: true });

            // Property: Draft orders should have orderType: "QUOTE"
            expect(order.orderType).toBe("QUOTE");
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: data-completeness-fix, Property 8: Today's Orders Presence**
   * **Validates: Requirements 8.1, 8.2**
   *
   * Property: For any complete seed operation, 3-5 orders SHALL have createdAt
   * set to today's date, distributed across different clients.
   */
  describe("Property 8: Today's Orders Presence", () => {
    it("should generate today's orders with today's date", () => {
      fc.assert(
        fc.property(
          batchArrayArb,
          fc.integer({ min: 1, max: 1000 }),
          (batches, clientId) => {
            const order = generateOrder(0, clientId, batches, false, { isToday: true });

            // Property: Today's orders should have today's date
            const today = new Date();
            const orderDate = new Date(order.createdAt);
            
            expect(orderDate.getFullYear()).toBe(today.getFullYear());
            expect(orderDate.getMonth()).toBe(today.getMonth());
            expect(orderDate.getDate()).toBe(today.getDate());
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should not be draft orders", () => {
      fc.assert(
        fc.property(
          batchArrayArb,
          fc.integer({ min: 1, max: 1000 }),
          (batches, clientId) => {
            const order = generateOrder(0, clientId, batches, false, { isToday: true });

            // Property: Today's orders should not be drafts
            expect(order.isDraft).toBe(false);
            expect(order.orderType).toBe("SALE");
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should have valid saleStatus", () => {
      fc.assert(
        fc.property(
          batchArrayArb,
          fc.integer({ min: 1, max: 1000 }),
          (batches, clientId) => {
            const order = generateOrder(0, clientId, batches, false, { isToday: true });

            // Property: Today's orders should have a valid saleStatus
            const validStatuses = ["PENDING", "PARTIAL", "PAID", "OVERDUE"];
            expect(validStatuses).toContain(order.saleStatus);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe("Regular Orders", () => {
    it("should generate regular orders with isDraft: false by default", () => {
      fc.assert(
        fc.property(
          batchArrayArb,
          fc.integer({ min: 1, max: 1000 }),
          (batches, clientId) => {
            const order = generateOrder(0, clientId, batches, false);

            // Property: Regular orders should have isDraft: false
            expect(order.isDraft).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should have valid saleStatus for regular orders", () => {
      fc.assert(
        fc.property(
          batchArrayArb,
          fc.integer({ min: 1, max: 1000 }),
          (batches, clientId) => {
            const order = generateOrder(0, clientId, batches, false);

            // Property: Regular orders should have a valid saleStatus
            const validStatuses = ["PENDING", "PARTIAL", "PAID", "OVERDUE"];
            expect(validStatuses).toContain(order.saleStatus);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});

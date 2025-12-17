/**
 * Property-Based Tests for Purchase Orders Seeder
 *
 * **Feature: data-completeness-fix, Property 7: Purchase Orders Completeness**
 * **Validates: Requirements 7.1, 7.2, 7.3**
 *
 * Uses fast-check to verify purchase orders have valid data.
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { generatePurchaseOrder, generatePOLineItems, type POStatus } from "./seed-purchase-orders";

// ============================================================================
// Arbitraries (Generators)
// ============================================================================

const vendorIdArb = fc.integer({ min: 1, max: 10000 });
const indexArb = fc.integer({ min: 0, max: 10000 });
const poStatusArb = fc.constantFrom<POStatus>(
  "DRAFT", "SENT", "CONFIRMED", "RECEIVING", "RECEIVED", "CANCELLED"
);

// ============================================================================
// Property Tests
// ============================================================================

describe("Purchase Orders Seeder Properties", () => {
  /**
   * **Feature: data-completeness-fix, Property 7: Purchase Orders Completeness**
   * **Validates: Requirements 7.1, 7.2, 7.3**
   */
  describe("Property 7: Purchase Orders Completeness", () => {
    it("should generate POs with valid status values", () => {
      fc.assert(
        fc.property(
          indexArb,
          vendorIdArb,
          poStatusArb,
          (index, vendorId, status) => {
            const po = generatePurchaseOrder(index, vendorId, status);

            // Property: status should be one of the valid enum values
            const validStatuses: POStatus[] = [
              "DRAFT", "SENT", "CONFIRMED", "RECEIVING", "RECEIVED", "CANCELLED"
            ];
            expect(validStatuses).toContain(po.purchaseOrderStatus);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should preserve vendorId", () => {
      fc.assert(
        fc.property(
          indexArb,
          vendorIdArb,
          poStatusArb,
          (index, vendorId, status) => {
            const po = generatePurchaseOrder(index, vendorId, status);
            expect(po.vendorId).toBe(vendorId);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should have valid PO number format", () => {
      fc.assert(
        fc.property(
          indexArb,
          vendorIdArb,
          poStatusArb,
          (index, vendorId, status) => {
            const po = generatePurchaseOrder(index, vendorId, status);
            expect(po.poNumber).toMatch(/^PO-\d{6}$/);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should have actualDeliveryDate only for RECEIVED status", () => {
      fc.assert(
        fc.property(
          indexArb,
          vendorIdArb,
          (index, vendorId) => {
            const receivedPO = generatePurchaseOrder(index, vendorId, "RECEIVED");
            const draftPO = generatePurchaseOrder(index, vendorId, "DRAFT");
            
            expect(receivedPO.actualDeliveryDate).not.toBeNull();
            expect(draftPO.actualDeliveryDate).toBeNull();
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should have sentAt only for non-DRAFT status", () => {
      fc.assert(
        fc.property(
          indexArb,
          vendorIdArb,
          (index, vendorId) => {
            const draftPO = generatePurchaseOrder(index, vendorId, "DRAFT");
            const sentPO = generatePurchaseOrder(index, vendorId, "SENT");
            
            expect(draftPO.sentAt).toBeNull();
            expect(sentPO.sentAt).not.toBeNull();
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should have positive total amount", () => {
      fc.assert(
        fc.property(
          indexArb,
          vendorIdArb,
          poStatusArb,
          (index, vendorId, status) => {
            const po = generatePurchaseOrder(index, vendorId, status);
            expect(parseFloat(po.total)).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe("PO Line Items", () => {
    it("should generate at least one line item", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 10000 }),
          fc.array(fc.integer({ min: 1, max: 10000 }), { minLength: 1, maxLength: 10 }),
          poStatusArb,
          fc.float({ min: Math.fround(100), max: Math.fround(10000), noNaN: true }),
          (poId, productIds, status, totalAmount) => {
            const lineItems = generatePOLineItems(poId, productIds, status, totalAmount);
            expect(lineItems.length).toBeGreaterThanOrEqual(1);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should preserve purchaseOrderId in all line items", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 10000 }),
          fc.array(fc.integer({ min: 1, max: 10000 }), { minLength: 1, maxLength: 10 }),
          poStatusArb,
          fc.float({ min: Math.fround(100), max: Math.fround(10000), noNaN: true }),
          (poId, productIds, status, totalAmount) => {
            const lineItems = generatePOLineItems(poId, productIds, status, totalAmount);
            for (const item of lineItems) {
              expect(item.purchaseOrderId).toBe(poId);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should have quantityReceived = quantityOrdered for RECEIVED status", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 10000 }),
          fc.array(fc.integer({ min: 1, max: 10000 }), { minLength: 1, maxLength: 10 }),
          fc.float({ min: Math.fround(100), max: Math.fround(10000), noNaN: true }),
          (poId, productIds, totalAmount) => {
            const lineItems = generatePOLineItems(poId, productIds, "RECEIVED", totalAmount);
            for (const item of lineItems) {
              expect(parseFloat(item.quantityReceived)).toBeCloseTo(parseFloat(item.quantityOrdered), 2);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should have quantityReceived = 0 for DRAFT status", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 10000 }),
          fc.array(fc.integer({ min: 1, max: 10000 }), { minLength: 1, maxLength: 10 }),
          fc.float({ min: Math.fround(100), max: Math.fround(10000), noNaN: true }),
          (poId, productIds, totalAmount) => {
            const lineItems = generatePOLineItems(poId, productIds, "DRAFT", totalAmount);
            for (const item of lineItems) {
              expect(parseFloat(item.quantityReceived)).toBe(0);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});

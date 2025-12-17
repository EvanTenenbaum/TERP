/**
 * Property-Based Tests for Vendor Bills Seeder
 *
 * **Feature: data-completeness-fix, Property 6: Vendor Bills Completeness**
 * **Validates: Requirements 6.1, 6.2, 6.3, 6.4**
 *
 * Uses fast-check to verify vendor bills have valid data.
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { generateBill, generateBillLineItems, type BillStatus } from "./seed-vendor-bills";

// ============================================================================
// Arbitraries (Generators)
// ============================================================================

const vendorIdArb = fc.integer({ min: 1, max: 10000 });
const lotIdArb = fc.option(fc.integer({ min: 1, max: 10000 }), { nil: null });
const indexArb = fc.integer({ min: 0, max: 10000 });
const billStatusArb = fc.constantFrom<BillStatus>(
  "DRAFT", "PENDING", "APPROVED", "PARTIAL", "PAID", "OVERDUE", "VOID"
);

// ============================================================================
// Property Tests
// ============================================================================

describe("Vendor Bills Seeder Properties", () => {
  /**
   * **Feature: data-completeness-fix, Property 6: Vendor Bills Completeness**
   * **Validates: Requirements 6.1, 6.2, 6.3, 6.4**
   */
  describe("Property 6: Vendor Bills Completeness", () => {
    it("should generate bills with valid status values", () => {
      fc.assert(
        fc.property(
          indexArb,
          vendorIdArb,
          lotIdArb,
          billStatusArb,
          (index, vendorId, lotId, status) => {
            const bill = generateBill(index, vendorId, lotId, status);

            // Property: status should be one of the valid enum values
            const validStatuses: BillStatus[] = [
              "DRAFT", "PENDING", "APPROVED", "PARTIAL", "PAID", "OVERDUE", "VOID"
            ];
            expect(validStatuses).toContain(bill.status);
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
          lotIdArb,
          billStatusArb,
          (index, vendorId, lotId, status) => {
            const bill = generateBill(index, vendorId, lotId, status);
            expect(bill.vendorId).toBe(vendorId);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should set referenceType to LOT when lotId is provided", () => {
      fc.assert(
        fc.property(
          indexArb,
          vendorIdArb,
          fc.integer({ min: 1, max: 10000 }), // Non-null lotId
          billStatusArb,
          (index, vendorId, lotId, status) => {
            const bill = generateBill(index, vendorId, lotId, status);
            expect(bill.referenceType).toBe("LOT");
            expect(bill.referenceId).toBe(lotId);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should have amountDue = totalAmount - amountPaid", () => {
      fc.assert(
        fc.property(
          indexArb,
          vendorIdArb,
          lotIdArb,
          billStatusArb,
          (index, vendorId, lotId, status) => {
            const bill = generateBill(index, vendorId, lotId, status);
            const totalAmount = parseFloat(bill.totalAmount);
            const amountPaid = parseFloat(bill.amountPaid);
            const amountDue = parseFloat(bill.amountDue);
            
            expect(amountDue).toBeCloseTo(Math.max(0, totalAmount - amountPaid), 1);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should have amountPaid = totalAmount for PAID status", () => {
      fc.assert(
        fc.property(
          indexArb,
          vendorIdArb,
          lotIdArb,
          (index, vendorId, lotId) => {
            const bill = generateBill(index, vendorId, lotId, "PAID");
            const totalAmount = parseFloat(bill.totalAmount);
            const amountPaid = parseFloat(bill.amountPaid);
            
            expect(amountPaid).toBeCloseTo(totalAmount, 1);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should have partial amountPaid for PARTIAL status", () => {
      fc.assert(
        fc.property(
          indexArb,
          vendorIdArb,
          lotIdArb,
          (index, vendorId, lotId) => {
            const bill = generateBill(index, vendorId, lotId, "PARTIAL");
            const totalAmount = parseFloat(bill.totalAmount);
            const amountPaid = parseFloat(bill.amountPaid);
            
            expect(amountPaid).toBeGreaterThan(0);
            expect(amountPaid).toBeLessThan(totalAmount);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe("Bill Line Items", () => {
    it("should generate at least one line item", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 10000 }),
          fc.array(fc.integer({ min: 1, max: 10000 }), { minLength: 1, maxLength: 10 }),
          lotIdArb,
          fc.float({ min: Math.fround(100), max: Math.fround(10000), noNaN: true }),
          (billId, productIds, lotId, totalAmount) => {
            const lineItems = generateBillLineItems(billId, productIds, lotId, totalAmount);
            expect(lineItems.length).toBeGreaterThanOrEqual(1);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should preserve billId in all line items", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 10000 }),
          fc.array(fc.integer({ min: 1, max: 10000 }), { minLength: 1, maxLength: 10 }),
          lotIdArb,
          fc.float({ min: Math.fround(100), max: Math.fround(10000), noNaN: true }),
          (billId, productIds, lotId, totalAmount) => {
            const lineItems = generateBillLineItems(billId, productIds, lotId, totalAmount);
            for (const item of lineItems) {
              expect(item.billId).toBe(billId);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});

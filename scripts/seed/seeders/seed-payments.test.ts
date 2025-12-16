/**
 * Property-Based Tests for Payment Seeder
 *
 * **Feature: data-display-fix, Property 7: Invoice-Payment Linkage Integrity**
 * **Validates: Requirements 9.3**
 *
 * Uses fast-check to verify payment-invoice linkage and invoice amount updates.
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
  calculateInvoiceStatus,
  calculateInvoiceUpdate,
} from "./seed-payments";

// ============================================================================
// Type Definitions (matching the seeder types)
// ============================================================================

type InvoiceStatus = "DRAFT" | "SENT" | "VIEWED" | "PARTIAL" | "PAID" | "OVERDUE" | "VOID";

interface Invoice {
  id: number;
  invoiceNumber: string;
  customerId: number;
  totalAmount: string;
  amountPaid: string;
  amountDue: string;
  status: InvoiceStatus;
}

interface Payment {
  id: number;
  paymentNumber: string;
  invoiceId: number | null;
  amount: string;
  customerId: number | null;
}

interface InvoiceUpdate {
  invoiceId: number;
  newAmountPaid: string;
  newAmountDue: string;
  newStatus: InvoiceStatus;
}

// ============================================================================
// Arbitraries (Generators)
// ============================================================================

const invoiceStatusArb = fc.constantFrom<InvoiceStatus>(
  "DRAFT",
  "SENT",
  "VIEWED",
  "PARTIAL",
  "PAID",
  "OVERDUE",
  "VOID"
);

const invoiceArb = fc.record({
  id: fc.integer({ min: 1, max: 10000 }),
  invoiceNumber: fc.stringMatching(/^INV-[0-9]{6}$/),
  customerId: fc.integer({ min: 1, max: 1000 }),
  totalAmount: fc.float({ min: Math.fround(100), max: Math.fround(100000), noNaN: true }).map((n) => n.toFixed(2)),
  amountPaid: fc.float({ min: Math.fround(0), max: Math.fround(50000), noNaN: true }).map((n) => n.toFixed(2)),
  amountDue: fc.float({ min: Math.fround(0), max: Math.fround(100000), noNaN: true }).map((n) => n.toFixed(2)),
  status: invoiceStatusArb,
});

// Generate invoice with consistent amounts (amountPaid + amountDue = totalAmount)
const consistentInvoiceArb = fc
  .record({
    id: fc.integer({ min: 1, max: 10000 }),
    invoiceNumber: fc.stringMatching(/^INV-[0-9]{6}$/),
    customerId: fc.integer({ min: 1, max: 1000 }),
    totalAmount: fc.float({ min: Math.fround(100), max: Math.fround(100000), noNaN: true }),
    paidRatio: fc.float({ min: Math.fround(0), max: Math.fround(1), noNaN: true }),
  })
  .map(({ id, invoiceNumber, customerId, totalAmount, paidRatio }) => {
    const amountPaid = totalAmount * paidRatio;
    const amountDue = totalAmount - amountPaid;
    let status: InvoiceStatus;
    if (amountPaid >= totalAmount) {
      status = "PAID";
    } else if (amountPaid > 0) {
      status = "PARTIAL";
    } else {
      status = "SENT";
    }
    return {
      id,
      invoiceNumber,
      customerId,
      totalAmount: totalAmount.toFixed(2),
      amountPaid: amountPaid.toFixed(2),
      amountDue: amountDue.toFixed(2),
      status,
    };
  });

const paymentAmountArb = fc.float({ min: Math.fround(0.01), max: Math.fround(50000), noNaN: true });

// ============================================================================
// Property Tests
// ============================================================================

describe("Invoice-Payment Linkage", () => {
  /**
   * **Feature: data-display-fix, Property 7: Invoice-Payment Linkage Integrity**
   * **Validates: Requirements 9.3**
   *
   * Property: For any seeded payment linked to an invoice, the invoice's amountPaid
   * SHALL increase by the payment amount, and the invoice's status SHALL update to
   * "PARTIAL" or "PAID" accordingly.
   */
  describe("Property 7: Invoice-Payment Linkage Integrity", () => {
    it("should increase invoice amountPaid by payment amount", () => {
      fc.assert(
        fc.property(
          consistentInvoiceArb,
          paymentAmountArb,
          (invoice, paymentAmount) => {
            const currentAmountPaid = parseFloat(invoice.amountPaid);
            const totalAmount = parseFloat(invoice.totalAmount);

            const update = calculateInvoiceUpdate(
              invoice.id,
              currentAmountPaid,
              totalAmount,
              paymentAmount
            );

            // Property: newAmountPaid should equal currentAmountPaid + paymentAmount
            const expectedAmountPaid = currentAmountPaid + paymentAmount;
            expect(parseFloat(update.newAmountPaid)).toBeCloseTo(expectedAmountPaid, 2);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should correctly calculate amountDue after payment", () => {
      fc.assert(
        fc.property(
          consistentInvoiceArb,
          paymentAmountArb,
          (invoice, paymentAmount) => {
            const currentAmountPaid = parseFloat(invoice.amountPaid);
            const totalAmount = parseFloat(invoice.totalAmount);

            const update = calculateInvoiceUpdate(
              invoice.id,
              currentAmountPaid,
              totalAmount,
              paymentAmount
            );

            // Property: newAmountDue should equal max(0, totalAmount - newAmountPaid)
            const expectedAmountDue = Math.max(0, totalAmount - (currentAmountPaid + paymentAmount));
            expect(parseFloat(update.newAmountDue)).toBeCloseTo(expectedAmountDue, 2);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should set status to PAID when fully paid", () => {
      fc.assert(
        fc.property(
          consistentInvoiceArb,
          (invoice) => {
            const currentAmountPaid = parseFloat(invoice.amountPaid);
            const totalAmount = parseFloat(invoice.totalAmount);
            // Payment that fully pays the invoice
            const remainingDue = totalAmount - currentAmountPaid;
            const paymentAmount = remainingDue + 10; // Overpay slightly

            const update = calculateInvoiceUpdate(
              invoice.id,
              currentAmountPaid,
              totalAmount,
              paymentAmount
            );

            // Property: status should be PAID when amountPaid >= totalAmount
            expect(update.newStatus).toBe("PAID");
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should set status to PARTIAL when partially paid", () => {
      // Generate invoice with room for partial payment
      const unpaidInvoiceArb = fc
        .record({
          id: fc.integer({ min: 1, max: 10000 }),
          invoiceNumber: fc.stringMatching(/^INV-[0-9]{6}$/),
          customerId: fc.integer({ min: 1, max: 1000 }),
          totalAmount: fc.float({ min: Math.fround(1000), max: Math.fround(100000), noNaN: true }),
        })
        .map(({ id, invoiceNumber, customerId, totalAmount }) => ({
          id,
          invoiceNumber,
          customerId,
          totalAmount: totalAmount.toFixed(2),
          amountPaid: "0.00",
          amountDue: totalAmount.toFixed(2),
          status: "SENT" as InvoiceStatus,
        }));

      fc.assert(
        fc.property(
          unpaidInvoiceArb,
          fc.float({ min: Math.fround(0.1), max: Math.fround(0.9), noNaN: true }),
          (invoice, paymentRatio) => {
            const totalAmount = parseFloat(invoice.totalAmount);
            // Partial payment (between 10% and 90% of total)
            const paymentAmount = totalAmount * paymentRatio;

            const update = calculateInvoiceUpdate(
              invoice.id,
              0, // Starting from 0 paid
              totalAmount,
              paymentAmount
            );

            // Property: status should be PARTIAL when 0 < amountPaid < totalAmount
            expect(update.newStatus).toBe("PARTIAL");
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should preserve invoiceId in update", () => {
      fc.assert(
        fc.property(
          consistentInvoiceArb,
          paymentAmountArb,
          (invoice, paymentAmount) => {
            const currentAmountPaid = parseFloat(invoice.amountPaid);
            const totalAmount = parseFloat(invoice.totalAmount);

            const update = calculateInvoiceUpdate(
              invoice.id,
              currentAmountPaid,
              totalAmount,
              paymentAmount
            );

            // Property: invoiceId should be preserved
            expect(update.invoiceId).toBe(invoice.id);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should never have negative amountDue", () => {
      fc.assert(
        fc.property(
          consistentInvoiceArb,
          // Large payment that could exceed total
          fc.float({ min: Math.fround(1), max: Math.fround(200000), noNaN: true }),
          (invoice, paymentAmount) => {
            const currentAmountPaid = parseFloat(invoice.amountPaid);
            const totalAmount = parseFloat(invoice.totalAmount);

            const update = calculateInvoiceUpdate(
              invoice.id,
              currentAmountPaid,
              totalAmount,
              paymentAmount
            );

            // Property: amountDue should never be negative
            expect(parseFloat(update.newAmountDue)).toBeGreaterThanOrEqual(0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe("Invoice Status Calculation", () => {
    it("should return PAID when amountPaid equals totalAmount", () => {
      fc.assert(
        fc.property(
          fc.float({ min: Math.fround(100), max: Math.fround(100000), noNaN: true }),
          (amount) => {
            const status = calculateInvoiceStatus(amount, amount);
            expect(status).toBe("PAID");
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should return PAID when amountPaid exceeds totalAmount", () => {
      fc.assert(
        fc.property(
          fc.float({ min: Math.fround(100), max: Math.fround(100000), noNaN: true }),
          fc.float({ min: Math.fround(1), max: Math.fround(1000), noNaN: true }),
          (totalAmount, overpayment) => {
            const status = calculateInvoiceStatus(totalAmount, totalAmount + overpayment);
            expect(status).toBe("PAID");
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should return PARTIAL when amountPaid is between 0 and totalAmount", () => {
      fc.assert(
        fc.property(
          fc.float({ min: Math.fround(100), max: Math.fround(100000), noNaN: true }),
          fc.float({ min: Math.fround(0.01), max: Math.fround(0.99), noNaN: true }),
          (totalAmount, ratio) => {
            const amountPaid = totalAmount * ratio;
            const status = calculateInvoiceStatus(totalAmount, amountPaid);
            expect(status).toBe("PARTIAL");
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should return SENT when amountPaid is 0", () => {
      fc.assert(
        fc.property(
          fc.float({ min: Math.fround(100), max: Math.fround(100000), noNaN: true }),
          (totalAmount) => {
            const status = calculateInvoiceStatus(totalAmount, 0);
            expect(status).toBe("SENT");
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe("Multiple Payments to Same Invoice", () => {
    it("should correctly accumulate multiple payments", () => {
      fc.assert(
        fc.property(
          consistentInvoiceArb,
          fc.array(paymentAmountArb, { minLength: 1, maxLength: 5 }),
          (invoice, paymentAmounts) => {
            const totalAmount = parseFloat(invoice.totalAmount);
            let currentAmountPaid = parseFloat(invoice.amountPaid);

            // Apply each payment sequentially
            for (const paymentAmount of paymentAmounts) {
              const update = calculateInvoiceUpdate(
                invoice.id,
                currentAmountPaid,
                totalAmount,
                paymentAmount
              );
              currentAmountPaid = parseFloat(update.newAmountPaid);
            }

            // Property: final amountPaid should equal initial + sum of all payments
            // Using precision of 1 decimal place due to accumulated floating-point errors
            // from multiple toFixed(2) operations
            const expectedTotal =
              parseFloat(invoice.amountPaid) +
              paymentAmounts.reduce((sum, amt) => sum + amt, 0);
            expect(currentAmountPaid).toBeCloseTo(expectedTotal, 1);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});

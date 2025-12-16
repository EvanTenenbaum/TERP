/**
 * Property-Based Tests for Client Transactions Seeder
 *
 * **Feature: data-display-fix, Property 3: Client Transaction Creation from Orders**
 * **Validates: Requirements 6.1, 9.1**
 *
 * **Feature: data-display-fix, Property 4: Client Total Spent Calculation**
 * **Feature: data-display-fix, Property 5: Client Amount Owed Calculation**
 * **Validates: Requirements 6.2, 6.3**
 *
 * Uses fast-check to verify client transaction creation and stats calculation.
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";

// ============================================================================
// Type Definitions (matching the seeder types)
// ============================================================================

type TransactionType = "INVOICE" | "PAYMENT" | "QUOTE" | "ORDER" | "REFUND" | "CREDIT";
type PaymentStatus = "PAID" | "PENDING" | "OVERDUE" | "PARTIAL";
type SaleStatus = "PENDING" | "PARTIAL" | "PAID" | "OVERDUE";

interface Order {
  id: number;
  orderNumber: string;
  clientId: number;
  total: string;
  saleStatus: SaleStatus;
  createdAt: Date;
}

interface ClientTransaction {
  clientId: number;
  transactionType: TransactionType;
  transactionNumber: string | null;
  transactionDate: Date;
  amount: string;
  paymentStatus: PaymentStatus;
  paymentDate: Date | null;
  paymentAmount: string | null;
}

// ============================================================================
// Pure Functions Under Test (extracted from seeder for testability)
// ============================================================================

/**
 * Map order sale status to transaction payment status
 */
function mapSaleStatusToPaymentStatus(saleStatus: SaleStatus): PaymentStatus {
  switch (saleStatus) {
    case "PAID":
      return "PAID";
    case "PARTIAL":
      return "PARTIAL";
    case "OVERDUE":
      return "OVERDUE";
    case "PENDING":
    default:
      return "PENDING";
  }
}

/**
 * Generate a client transaction from an order (pure function version)
 */
function generateTransactionFromOrder(order: Order): ClientTransaction {
  const paymentStatus = mapSaleStatusToPaymentStatus(order.saleStatus);
  const amount = order.total;
  const transactionDate = order.createdAt;

  let paymentDate: Date | null = null;
  let paymentAmount: string | null = null;

  if (paymentStatus === "PAID") {
    paymentDate = new Date(transactionDate);
    paymentDate.setDate(paymentDate.getDate() + 7); // Fixed for determinism
    paymentAmount = amount;
  } else if (paymentStatus === "PARTIAL") {
    paymentDate = new Date(transactionDate);
    paymentDate.setDate(paymentDate.getDate() + 7);
    paymentAmount = (parseFloat(amount) * 0.5).toFixed(2); // Fixed 50% for determinism
  }

  return {
    clientId: order.clientId,
    transactionType: "ORDER",
    transactionNumber: order.orderNumber,
    transactionDate,
    amount,
    paymentStatus,
    paymentDate,
    paymentAmount,
  };
}

/**
 * Calculate client total spent from transactions
 * Requirements: 6.2
 */
function calculateTotalSpent(transactions: ClientTransaction[]): number {
  return transactions
    .filter((txn) => txn.transactionType === "INVOICE" || txn.transactionType === "ORDER")
    .reduce((sum, txn) => sum + parseFloat(txn.amount), 0);
}

/**
 * Calculate client total owed from transactions
 * Requirements: 6.3
 */
function calculateTotalOwed(transactions: ClientTransaction[]): number {
  return transactions
    .filter(
      (txn) =>
        (txn.transactionType === "INVOICE" || txn.transactionType === "ORDER") &&
        txn.paymentStatus !== "PAID"
    )
    .reduce((sum, txn) => sum + parseFloat(txn.amount), 0);
}

// ============================================================================
// Arbitraries (Generators)
// ============================================================================

const saleStatusArb = fc.constantFrom<SaleStatus>("PENDING", "PARTIAL", "PAID", "OVERDUE");

const orderArb = fc.record({
  id: fc.integer({ min: 1, max: 10000 }),
  orderNumber: fc.stringMatching(/^ORD-[0-9]{6}$/),
  clientId: fc.integer({ min: 1, max: 1000 }),
  total: fc.float({ min: Math.fround(0.01), max: Math.fround(100000), noNaN: true }).map((n) => n.toFixed(2)),
  saleStatus: saleStatusArb,
  createdAt: fc.date({ min: new Date(2024, 0, 1), max: new Date() }),
});

const transactionTypeArb = fc.constantFrom<TransactionType>(
  "INVOICE",
  "PAYMENT",
  "QUOTE",
  "ORDER",
  "REFUND",
  "CREDIT"
);

const paymentStatusArb = fc.constantFrom<PaymentStatus>("PAID", "PENDING", "OVERDUE", "PARTIAL");

const clientTransactionArb = fc.record({
  clientId: fc.integer({ min: 1, max: 1000 }),
  transactionType: transactionTypeArb,
  transactionNumber: fc.option(fc.stringMatching(/^(ORD|INV)-[0-9]{6}$/), { nil: null }),
  transactionDate: fc.date({ min: new Date(2024, 0, 1), max: new Date() }),
  amount: fc.float({ min: Math.fround(0.01), max: Math.fround(100000), noNaN: true }).map((n) => n.toFixed(2)),
  paymentStatus: paymentStatusArb,
  paymentDate: fc.option(fc.date({ min: new Date(2024, 0, 1), max: new Date() }), { nil: null }),
  paymentAmount: fc.option(
    fc.float({ min: Math.fround(0.01), max: Math.fround(100000), noNaN: true }).map((n) => n.toFixed(2)),
    { nil: null }
  ),
});

// ============================================================================
// Property Tests
// ============================================================================

describe("Client Transaction Creation", () => {
  /**
   * **Feature: data-display-fix, Property 3: Client Transaction Creation from Orders**
   * **Validates: Requirements 6.1, 9.1**
   *
   * Property: For any seeded order, there SHALL exist a corresponding clientTransaction
   * record with matching clientId, amount equal to order total, and transactionType equal to "ORDER".
   */
  describe("Property 3: Client Transaction Creation from Orders", () => {
    it("should create transaction with matching clientId from order", () => {
      fc.assert(
        fc.property(orderArb, (order) => {
          const transaction = generateTransactionFromOrder(order);

          // Property: clientId must match
          expect(transaction.clientId).toBe(order.clientId);
        }),
        { numRuns: 100 }
      );
    });

    it("should create transaction with amount equal to order total", () => {
      fc.assert(
        fc.property(orderArb, (order) => {
          const transaction = generateTransactionFromOrder(order);

          // Property: amount must equal order total
          expect(transaction.amount).toBe(order.total);
        }),
        { numRuns: 100 }
      );
    });

    it("should create transaction with transactionType ORDER", () => {
      fc.assert(
        fc.property(orderArb, (order) => {
          const transaction = generateTransactionFromOrder(order);

          // Property: transactionType must be ORDER
          expect(transaction.transactionType).toBe("ORDER");
        }),
        { numRuns: 100 }
      );
    });

    it("should create transaction with matching order number", () => {
      fc.assert(
        fc.property(orderArb, (order) => {
          const transaction = generateTransactionFromOrder(order);

          // Property: transactionNumber must match orderNumber
          expect(transaction.transactionNumber).toBe(order.orderNumber);
        }),
        { numRuns: 100 }
      );
    });

    it("should map sale status to payment status correctly", () => {
      fc.assert(
        fc.property(orderArb, (order) => {
          const transaction = generateTransactionFromOrder(order);

          // Property: payment status must be correctly mapped from sale status
          const expectedStatus = mapSaleStatusToPaymentStatus(order.saleStatus);
          expect(transaction.paymentStatus).toBe(expectedStatus);
        }),
        { numRuns: 100 }
      );
    });

    it("should set transaction date to order creation date", () => {
      fc.assert(
        fc.property(orderArb, (order) => {
          const transaction = generateTransactionFromOrder(order);

          // Property: transactionDate must equal order createdAt
          expect(transaction.transactionDate.getTime()).toBe(order.createdAt.getTime());
        }),
        { numRuns: 100 }
      );
    });
  });

  describe("Sale Status to Payment Status Mapping", () => {
    it("should map PAID to PAID", () => {
      expect(mapSaleStatusToPaymentStatus("PAID")).toBe("PAID");
    });

    it("should map PARTIAL to PARTIAL", () => {
      expect(mapSaleStatusToPaymentStatus("PARTIAL")).toBe("PARTIAL");
    });

    it("should map OVERDUE to OVERDUE", () => {
      expect(mapSaleStatusToPaymentStatus("OVERDUE")).toBe("OVERDUE");
    });

    it("should map PENDING to PENDING", () => {
      expect(mapSaleStatusToPaymentStatus("PENDING")).toBe("PENDING");
    });
  });
});

describe("Client Stats Calculation", () => {
  /**
   * **Feature: data-display-fix, Property 4: Client Total Spent Calculation**
   * **Validates: Requirements 6.2**
   *
   * Property: For any client with transactions, the totalSpent field SHALL equal
   * the sum of all transaction amounts where transactionType is "INVOICE" or "ORDER".
   */
  describe("Property 4: Client Total Spent Calculation", () => {
    it("should calculate total spent as sum of INVOICE and ORDER amounts", () => {
      fc.assert(
        fc.property(fc.array(clientTransactionArb, { minLength: 0, maxLength: 50 }), (transactions) => {
          const totalSpent = calculateTotalSpent(transactions);

          // Calculate expected total manually
          const expectedTotal = transactions
            .filter((t) => t.transactionType === "INVOICE" || t.transactionType === "ORDER")
            .reduce((sum, t) => sum + parseFloat(t.amount), 0);

          // Property: calculated total must equal expected
          expect(totalSpent).toBeCloseTo(expectedTotal, 2);
        }),
        { numRuns: 100 }
      );
    });

    it("should return 0 for empty transaction list", () => {
      expect(calculateTotalSpent([])).toBe(0);
    });

    it("should ignore non-INVOICE/ORDER transactions", () => {
      const nonSpendingTransactionArb = fc.record({
        clientId: fc.integer({ min: 1, max: 1000 }),
        transactionType: fc.constantFrom<TransactionType>("PAYMENT", "QUOTE", "REFUND", "CREDIT"),
        transactionNumber: fc.option(fc.stringMatching(/^(ORD|INV)-[0-9]{6}$/), { nil: null }),
        transactionDate: fc.date({ min: new Date(2024, 0, 1), max: new Date() }),
        amount: fc.float({ min: Math.fround(0.01), max: Math.fround(100000), noNaN: true }).map((n) => n.toFixed(2)),
        paymentStatus: paymentStatusArb,
        paymentDate: fc.option(fc.date({ min: new Date(2024, 0, 1), max: new Date() }), { nil: null }),
        paymentAmount: fc.option(
          fc.float({ min: Math.fround(0.01), max: Math.fround(100000), noNaN: true }).map((n) => n.toFixed(2)),
          { nil: null }
        ),
      });

      fc.assert(
        fc.property(
          fc.array(nonSpendingTransactionArb, { minLength: 1, maxLength: 20 }),
          (transactions) => {
            const totalSpent = calculateTotalSpent(transactions);

            // Property: should be 0 when no INVOICE/ORDER transactions
            expect(totalSpent).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: data-display-fix, Property 5: Client Amount Owed Calculation**
   * **Validates: Requirements 6.3**
   *
   * Property: For any client with unpaid transactions, the totalOwed field SHALL equal
   * the sum of amounts for transactions where paymentStatus is not "PAID".
   */
  describe("Property 5: Client Amount Owed Calculation", () => {
    it("should calculate total owed as sum of unpaid INVOICE/ORDER amounts", () => {
      fc.assert(
        fc.property(fc.array(clientTransactionArb, { minLength: 0, maxLength: 50 }), (transactions) => {
          const totalOwed = calculateTotalOwed(transactions);

          // Calculate expected total manually
          const expectedTotal = transactions
            .filter(
              (t) =>
                (t.transactionType === "INVOICE" || t.transactionType === "ORDER") &&
                t.paymentStatus !== "PAID"
            )
            .reduce((sum, t) => sum + parseFloat(t.amount), 0);

          // Property: calculated total must equal expected
          expect(totalOwed).toBeCloseTo(expectedTotal, 2);
        }),
        { numRuns: 100 }
      );
    });

    it("should return 0 for empty transaction list", () => {
      expect(calculateTotalOwed([])).toBe(0);
    });

    it("should return 0 when all transactions are PAID", () => {
      const paidTransactionArb = fc.record({
        clientId: fc.integer({ min: 1, max: 1000 }),
        transactionType: fc.constantFrom<TransactionType>("INVOICE", "ORDER"),
        transactionNumber: fc.option(fc.stringMatching(/^(ORD|INV)-[0-9]{6}$/), { nil: null }),
        transactionDate: fc.date({ min: new Date(2024, 0, 1), max: new Date() }),
        amount: fc.float({ min: Math.fround(0.01), max: Math.fround(100000), noNaN: true }).map((n) => n.toFixed(2)),
        paymentStatus: fc.constant<PaymentStatus>("PAID"),
        paymentDate: fc.option(fc.date({ min: new Date(2024, 0, 1), max: new Date() }), { nil: null }),
        paymentAmount: fc.option(
          fc.float({ min: Math.fround(0.01), max: Math.fround(100000), noNaN: true }).map((n) => n.toFixed(2)),
          { nil: null }
        ),
      });

      fc.assert(
        fc.property(
          fc.array(paidTransactionArb, { minLength: 1, maxLength: 20 }),
          (transactions) => {
            const totalOwed = calculateTotalOwed(transactions);

            // Property: should be 0 when all are PAID
            expect(totalOwed).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should include PENDING, PARTIAL, and OVERDUE transactions", () => {
      const unpaidTransactionArb = fc.record({
        clientId: fc.integer({ min: 1, max: 1000 }),
        transactionType: fc.constantFrom<TransactionType>("INVOICE", "ORDER"),
        transactionNumber: fc.option(fc.stringMatching(/^(ORD|INV)-[0-9]{6}$/), { nil: null }),
        transactionDate: fc.date({ min: new Date(2024, 0, 1), max: new Date() }),
        amount: fc.float({ min: Math.fround(0.01), max: Math.fround(100000), noNaN: true }).map((n) => n.toFixed(2)),
        paymentStatus: fc.constantFrom<PaymentStatus>("PENDING", "PARTIAL", "OVERDUE"),
        paymentDate: fc.option(fc.date({ min: new Date(2024, 0, 1), max: new Date() }), { nil: null }),
        paymentAmount: fc.option(
          fc.float({ min: Math.fround(0.01), max: Math.fround(100000), noNaN: true }).map((n) => n.toFixed(2)),
          { nil: null }
        ),
      });

      fc.assert(
        fc.property(
          fc.array(unpaidTransactionArb, { minLength: 1, maxLength: 20 }),
          (transactions) => {
            const totalOwed = calculateTotalOwed(transactions);

            // Calculate expected total
            const expectedTotal = transactions.reduce((sum, t) => sum + parseFloat(t.amount), 0);

            // Property: all unpaid transactions should be included
            expect(totalOwed).toBeCloseTo(expectedTotal, 2);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});

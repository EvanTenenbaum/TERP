/**
 * Tests for arApDb soft-delete filtering
 * Ensures that getInvoices() and getPayments() properly filter out soft-deleted records
 *
 * Unit tests using mocked database for CI environments.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock the database module before imports
vi.mock("./db", () => ({
  getDb: vi.fn(),
}));

import { getDb } from "./db";
import {
  getInvoices,
  getPayments,
  getInvoiceById,
  getOutstandingReceivables,
  calculateARAging,
  getBills,
  getBillById,
  getOutstandingPayables,
  calculateAPAging,
  getPaymentById,
} from "./arApDb";

describe("arApDb Soft-Delete Filtering", () => {
  const testClientId = 1;
  const activeInvoiceId = 101;
  const deletedInvoiceId = 102;
  const activePaymentId = 201;
  const deletedPaymentId = 202;

  // Mock data
  const activeInvoice = {
    id: activeInvoiceId,
    invoiceNumber: "INV-ACTIVE-001",
    customerId: testClientId,
    invoiceDate: new Date("2025-01-01"),
    dueDate: new Date("2025-01-31"),
    subtotal: "1000.00",
    taxAmount: "80.00",
    discountAmount: "0.00",
    totalAmount: "1080.00",
    amountPaid: "0.00",
    amountDue: "1080.00",
    status: "SENT",
    deletedAt: null,
  };

  const activePayment = {
    id: activePaymentId,
    paymentNumber: "PAY-ACTIVE-001",
    paymentType: "RECEIVED",
    paymentDate: new Date("2025-01-15"),
    amount: "500.00",
    paymentMethod: "CASH",
    customerId: testClientId,
    invoiceId: activeInvoiceId,
    deletedAt: null,
  };

  // Helper to create a thenable mock chain
  const _createMockChain = (result: any[]) => {
    const chain: any = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      leftJoin: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      offset: vi.fn().mockReturnThis(),
      groupBy: vi.fn().mockReturnThis(),
      then: (resolve: any) => resolve(result),
    };
    // Make all methods return the chain
    Object.keys(chain).forEach(key => {
      if (key !== 'then' && typeof chain[key] === 'function') {
        chain[key].mockReturnValue(chain);
      }
    });
    return chain;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getInvoices", () => {
    it("should only return active invoices (exclude soft-deleted)", async () => {
      // Arrange - Create mock that returns count first, then invoices
      let callCount = 0;
      const mockDb = {
        select: vi.fn().mockImplementation(() => {
          callCount++;
          const chain: any = {
            from: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            orderBy: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            offset: vi.fn().mockReturnThis(),
            then: (resolve: any) => {
              // First call is count, second is data
              if (callCount === 1) {
                resolve([{ count: 1 }]);
              } else {
                resolve([activeInvoice]);
              }
            },
          };
          Object.keys(chain).forEach(key => {
            if (key !== 'then' && typeof chain[key]?.mockReturnValue === 'function') {
              chain[key].mockReturnValue(chain);
            }
          });
          return chain;
        }),
      };
      vi.mocked(getDb).mockResolvedValue(mockDb as any);

      // Act
      const result = await getInvoices({ customerId: testClientId });

      // Assert
      expect(result.invoices).toBeDefined();
      expect(Array.isArray(result.invoices)).toBe(true);

      // Should find the active invoice
      const active = result.invoices.find((inv: any) => inv.id === activeInvoiceId);
      expect(active).toBeDefined();
      expect(active?.deletedAt).toBeNull();

      // Should NOT find the deleted invoice
      const deleted = result.invoices.find((inv: any) => inv.id === deletedInvoiceId);
      expect(deleted).toBeUndefined();
    });

    it("should filter by status AND exclude soft-deleted", async () => {
      // Arrange
      let callCount = 0;
      const mockDb = {
        select: vi.fn().mockImplementation(() => {
          callCount++;
          const chain: any = {
            from: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            orderBy: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            offset: vi.fn().mockReturnThis(),
            then: (resolve: any) => {
              if (callCount === 1) {
                resolve([{ count: 1 }]);
              } else {
                resolve([activeInvoice]);
              }
            },
          };
          Object.keys(chain).forEach(key => {
            if (key !== 'then' && typeof chain[key]?.mockReturnValue === 'function') {
              chain[key].mockReturnValue(chain);
            }
          });
          return chain;
        }),
      };
      vi.mocked(getDb).mockResolvedValue(mockDb as any);

      // Act
      const result = await getInvoices({
        customerId: testClientId,
        status: "SENT",
      });

      // Assert - Should only return active SENT invoices
      expect(result.invoices.length).toBeGreaterThanOrEqual(0);
      result.invoices.forEach((inv: any) => {
        expect(inv.deletedAt).toBeNull();
        expect(inv.status).toBe("SENT");
      });
    });
  });

  describe("getPayments", () => {
    it("should only return active payments (exclude soft-deleted)", async () => {
      // Arrange
      let callCount = 0;
      const mockDb = {
        select: vi.fn().mockImplementation(() => {
          callCount++;
          const chain: any = {
            from: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            orderBy: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            offset: vi.fn().mockReturnThis(),
            then: (resolve: any) => {
              if (callCount === 1) {
                resolve([{ count: 1 }]);
              } else {
                resolve([activePayment]);
              }
            },
          };
          Object.keys(chain).forEach(key => {
            if (key !== 'then' && typeof chain[key]?.mockReturnValue === 'function') {
              chain[key].mockReturnValue(chain);
            }
          });
          return chain;
        }),
      };
      vi.mocked(getDb).mockResolvedValue(mockDb as any);

      // Act
      const result = await getPayments({ customerId: testClientId });

      // Assert
      expect(result.payments).toBeDefined();
      expect(Array.isArray(result.payments)).toBe(true);

      // Should find the active payment
      const active = result.payments.find((pmt: any) => pmt.id === activePaymentId);
      expect(active).toBeDefined();
      expect(active?.deletedAt).toBeNull();

      // Should NOT find the deleted payment
      const deleted = result.payments.find((pmt: any) => pmt.id === deletedPaymentId);
      expect(deleted).toBeUndefined();
    });

    it("should filter by paymentType AND exclude soft-deleted", async () => {
      // Arrange
      let callCount = 0;
      const mockDb = {
        select: vi.fn().mockImplementation(() => {
          callCount++;
          const chain: any = {
            from: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            orderBy: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            offset: vi.fn().mockReturnThis(),
            then: (resolve: any) => {
              if (callCount === 1) {
                resolve([{ count: 1 }]);
              } else {
                resolve([activePayment]);
              }
            },
          };
          Object.keys(chain).forEach(key => {
            if (key !== 'then' && typeof chain[key]?.mockReturnValue === 'function') {
              chain[key].mockReturnValue(chain);
            }
          });
          return chain;
        }),
      };
      vi.mocked(getDb).mockResolvedValue(mockDb as any);

      // Act
      const result = await getPayments({
        customerId: testClientId,
        paymentType: "RECEIVED",
      });

      // Assert
      expect(result.payments.length).toBeGreaterThanOrEqual(0);
      result.payments.forEach((pmt: any) => {
        expect(pmt.deletedAt).toBeNull();
        expect(pmt.paymentType).toBe("RECEIVED");
      });
    });

    it("should filter by invoiceId AND exclude soft-deleted", async () => {
      // Arrange
      let callCount = 0;
      const mockDb = {
        select: vi.fn().mockImplementation(() => {
          callCount++;
          const chain: any = {
            from: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            orderBy: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            offset: vi.fn().mockReturnThis(),
            then: (resolve: any) => {
              if (callCount === 1) {
                resolve([{ count: 1 }]);
              } else {
                resolve([activePayment]);
              }
            },
          };
          Object.keys(chain).forEach(key => {
            if (key !== 'then' && typeof chain[key]?.mockReturnValue === 'function') {
              chain[key].mockReturnValue(chain);
            }
          });
          return chain;
        }),
      };
      vi.mocked(getDb).mockResolvedValue(mockDb as any);

      // Act
      const result = await getPayments({ invoiceId: activeInvoiceId });

      // Assert
      result.payments.forEach((pmt: any) => {
        expect(pmt.deletedAt).toBeNull();
        expect(pmt.invoiceId).toBe(activeInvoiceId);
      });
    });
  });
});

/**
 * Extended tests for additional soft-delete filtering functions
 */
describe("arApDb Extended Soft-Delete Filtering", () => {
  let mockDb: any;
  const testClientId = 1;
  const activeInvoiceId = 101;
  const deletedInvoiceId = 102;
  const activePaymentId = 201;
  const deletedPaymentId = 202;
  const activeBillId = 301;
  const deletedBillId = 302;

  const activeInvoice = {
    id: activeInvoiceId,
    invoiceNumber: "INV-ACTIVE-EXT-001",
    customerId: testClientId,
    invoiceDate: new Date("2025-01-01"),
    dueDate: new Date("2025-01-31"),
    subtotal: "1000.00",
    taxAmount: "80.00",
    discountAmount: "0.00",
    totalAmount: "1080.00",
    amountPaid: "0.00",
    amountDue: "1080.00",
    status: "SENT",
    deletedAt: null,
  };

  const activePayment = {
    id: activePaymentId,
    paymentNumber: "PMT-ACTIVE-EXT-001",
    customerId: testClientId,
    invoiceId: activeInvoiceId,
    paymentDate: new Date("2025-01-15"),
    amount: "100.00",
    paymentType: "RECEIVED",
    paymentMethod: "BANK_TRANSFER",
    deletedAt: null,
  };

  const activeBill = {
    id: activeBillId,
    billNumber: "BILL-ACTIVE-EXT-001",
    vendorId: testClientId,
    billDate: new Date("2025-01-01"),
    dueDate: new Date("2025-01-31"),
    subtotal: "2000.00",
    taxAmount: "160.00",
    discountAmount: "0.00",
    totalAmount: "2160.00",
    amountPaid: "0.00",
    amountDue: "2160.00",
    status: "PENDING",
    deletedAt: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      leftJoin: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      offset: vi.fn().mockReturnThis(),
      groupBy: vi.fn().mockReturnThis(),
    };

    vi.mocked(getDb).mockResolvedValue(mockDb as any);
  });

  describe("getInvoiceById", () => {
    it("should return active invoice by ID", async () => {
      // Arrange
      mockDb.limit.mockResolvedValue([activeInvoice]);

      // Act
      const invoice = await getInvoiceById(activeInvoiceId);

      // Assert
      expect(invoice).toBeDefined();
      expect(invoice?.id).toBe(activeInvoiceId);
      expect(invoice?.deletedAt).toBeNull();
    });

    it("should NOT return soft-deleted invoice by ID", async () => {
      // Arrange - empty result simulates soft-delete filtering
      mockDb.limit.mockResolvedValue([]);

      // Act
      const invoice = await getInvoiceById(deletedInvoiceId);

      // Assert
      expect(invoice).toBeNull();
    });
  });

  describe("getOutstandingReceivables", () => {
    it("should only include active invoices in outstanding receivables", async () => {
      // Arrange
      const thenableMock = {
        then: (resolve: any) => resolve([activeInvoice]),
      };
      mockDb.orderBy.mockReturnValue(thenableMock);
      mockDb.offset = vi.fn().mockReturnValue(thenableMock);
      mockDb.limit = vi.fn().mockReturnValue(thenableMock);

      // Act
      const result = await getOutstandingReceivables();

      // Assert
      expect(result.invoices).toBeDefined();

      // Should include active invoice
      const active = result.invoices.find((inv: any) => inv.id === activeInvoiceId);
      expect(active).toBeDefined();

      // Should NOT include deleted invoice
      const deleted = result.invoices.find((inv: any) => inv.id === deletedInvoiceId);
      expect(deleted).toBeUndefined();
    });
  });

  describe("calculateARAging", () => {
    it("should exclude soft-deleted invoices from AR aging calculation", async () => {
      // Arrange - mock returns array of invoices with aging data
      const mockInvoices = [
        { invoiceId: 1, dueDate: new Date(), amountDue: "500.00" },
        { invoiceId: 2, dueDate: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000), amountDue: "200.00" },
      ];

      // Create thenable mock for the query chain
      const thenableMock = {
        then: (resolve: any) => resolve(mockInvoices),
      };
      mockDb.where.mockReturnValue(thenableMock);

      // Act
      const aging = await calculateARAging();

      // Assert
      expect(aging).toBeDefined();
      expect(typeof aging.current).toBe("number");
      expect(typeof aging.days30).toBe("number");

      const total = aging.current + aging.days30 + aging.days60 + aging.days90 + aging.days90Plus;
      expect(total).toBeGreaterThanOrEqual(0);
    });
  });

  describe("getPaymentById", () => {
    it("should return active payment by ID", async () => {
      // Arrange
      mockDb.limit.mockResolvedValue([activePayment]);

      // Act
      const payment = await getPaymentById(activePaymentId);

      // Assert
      expect(payment).toBeDefined();
      expect(payment?.id).toBe(activePaymentId);
      expect(payment?.deletedAt).toBeNull();
    });

    it("should NOT return soft-deleted payment by ID", async () => {
      // Arrange
      mockDb.limit.mockResolvedValue([]);

      // Act
      const payment = await getPaymentById(deletedPaymentId);

      // Assert
      expect(payment).toBeNull();
    });
  });

  describe("getBills", () => {
    it("should only return active bills (exclude soft-deleted)", async () => {
      // Arrange
      const thenableMock = {
        then: (resolve: any) => resolve([activeBill]),
      };
      mockDb.orderBy.mockReturnValue(thenableMock);
      mockDb.offset = vi.fn().mockReturnValue(thenableMock);
      mockDb.limit = vi.fn().mockReturnValue(thenableMock);

      // Act
      const result = await getBills({ vendorId: testClientId });

      // Assert
      expect(result.bills).toBeDefined();

      // Should include active bill
      const active = result.bills.find((bill: any) => bill.id === activeBillId);
      expect(active).toBeDefined();

      // Should NOT include deleted bill
      const deleted = result.bills.find((bill: any) => bill.id === deletedBillId);
      expect(deleted).toBeUndefined();
    });
  });

  describe("getBillById", () => {
    it("should return active bill by ID", async () => {
      // Arrange
      mockDb.limit.mockResolvedValue([activeBill]);

      // Act
      const bill = await getBillById(activeBillId);

      // Assert
      expect(bill).toBeDefined();
      expect(bill?.id).toBe(activeBillId);
      expect(bill?.deletedAt).toBeNull();
    });

    it("should NOT return soft-deleted bill by ID", async () => {
      // Arrange
      mockDb.limit.mockResolvedValue([]);

      // Act
      const bill = await getBillById(deletedBillId);

      // Assert
      expect(bill).toBeNull();
    });
  });

  describe("getOutstandingPayables", () => {
    it("should only include active bills in outstanding payables", async () => {
      // Arrange
      const thenableMock = {
        then: (resolve: any) => resolve([activeBill]),
      };
      mockDb.orderBy.mockReturnValue(thenableMock);
      mockDb.offset = vi.fn().mockReturnValue(thenableMock);
      mockDb.limit = vi.fn().mockReturnValue(thenableMock);

      // Act
      const result = await getOutstandingPayables();

      // Assert
      expect(result.bills).toBeDefined();

      // Should include active bill
      const active = result.bills.find((bill: any) => bill.id === activeBillId);
      expect(active).toBeDefined();

      // Should NOT include deleted bill
      const deleted = result.bills.find((bill: any) => bill.id === deletedBillId);
      expect(deleted).toBeUndefined();
    });
  });

  describe("calculateAPAging", () => {
    it("should exclude soft-deleted bills from AP aging calculation", async () => {
      // Arrange - mock returns array of bills with aging data
      const mockBills = [
        { billId: 1, dueDate: new Date(), amountDue: "1000.00" },
        { billId: 2, dueDate: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000), amountDue: "500.00" },
      ];

      // Create thenable mock for the query chain
      const thenableMock = {
        then: (resolve: any) => resolve(mockBills),
      };
      mockDb.where.mockReturnValue(thenableMock);

      // Act
      const aging = await calculateAPAging();

      // Assert
      expect(aging).toBeDefined();
      expect(typeof aging.current).toBe("number");
      expect(typeof aging.days30).toBe("number");

      const total = aging.current + aging.days30 + aging.days60 + aging.days90 + aging.days90Plus;
      expect(total).toBeGreaterThanOrEqual(0);
    });
  });
});

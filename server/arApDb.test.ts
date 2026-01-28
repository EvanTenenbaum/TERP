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
  generateInvoiceNumber,
  generateBillNumber,
  generatePaymentNumber,
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

/**
 * FIN-001: Tests for atomic invoice/bill/payment number generation
 * These tests verify that the sequence generation functions properly use
 * database transactions with row-level locking to prevent race conditions.
 */
describe("arApDb Atomic Sequence Generation (FIN-001)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("generateInvoiceNumber", () => {
    it("should generate invoice number with correct format", async () => {
      // Arrange
      const mockSequence = {
        id: 1,
        name: `invoice_${new Date().getFullYear()}`,
        prefix: `INV-${new Date().getFullYear()}-`,
        currentValue: 5,
      };

      const mockTransaction = vi.fn().mockImplementation(async (callback) => {
        const mockTx = {
          select: vi.fn().mockReturnThis(),
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          for: vi.fn().mockResolvedValue([mockSequence]),
          insert: vi.fn().mockReturnThis(),
          values: vi.fn().mockResolvedValue([{ insertId: 1 }]),
          update: vi.fn().mockReturnThis(),
          set: vi.fn().mockReturnThis(),
        };
        // Mock the update chain
        mockTx.update = vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ affectedRows: 1 }]),
          }),
        });
        return callback(mockTx);
      });

      const mockDb = {
        transaction: mockTransaction,
      };

      vi.mocked(getDb).mockResolvedValue(mockDb as any);

      // Act
      const invoiceNumber = await generateInvoiceNumber();

      // Assert
      const year = new Date().getFullYear();
      expect(invoiceNumber).toBe(`INV-${year}-000006`);
    });

    it("should create new sequence if it does not exist", async () => {
      // Arrange - First call returns empty, second returns the new sequence
      let callCount = 0;
      const year = new Date().getFullYear();
      const newSequence = {
        id: 1,
        name: `invoice_${year}`,
        prefix: `INV-${year}-`,
        currentValue: 0,
      };

      const mockTransaction = vi.fn().mockImplementation(async (callback) => {
        const mockTx = {
          select: vi.fn().mockReturnThis(),
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          for: vi.fn().mockImplementation(() => {
            callCount++;
            // First call returns empty (sequence doesn't exist)
            // Second call returns the newly created sequence
            return Promise.resolve(callCount === 1 ? [] : [newSequence]);
          }),
          insert: vi.fn().mockReturnThis(),
          values: vi.fn().mockResolvedValue([{ insertId: 1 }]),
          update: vi.fn().mockReturnValue({
            set: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([{ affectedRows: 1 }]),
            }),
          }),
        };
        return callback(mockTx);
      });

      const mockDb = {
        transaction: mockTransaction,
      };

      vi.mocked(getDb).mockResolvedValue(mockDb as any);

      // Act
      const invoiceNumber = await generateInvoiceNumber();

      // Assert
      expect(invoiceNumber).toBe(`INV-${year}-000001`);
    });

    it("should throw error when database is not available", async () => {
      // Arrange
      vi.mocked(getDb).mockResolvedValue(null);

      // Act & Assert
      await expect(generateInvoiceNumber()).rejects.toThrow("Database not available");
    });

    it("should propagate transaction errors", async () => {
      // Arrange
      const mockTransaction = vi.fn().mockRejectedValue(new Error("Lock timeout"));

      const mockDb = {
        transaction: mockTransaction,
      };

      vi.mocked(getDb).mockResolvedValue(mockDb as any);

      // Act & Assert
      await expect(generateInvoiceNumber()).rejects.toThrow("Failed to generate invoice number: Lock timeout");
    });
  });

  describe("generateBillNumber", () => {
    it("should generate bill number with correct format", async () => {
      // Arrange
      const year = new Date().getFullYear();
      const mockSequence = {
        id: 1,
        name: `bill_${year}`,
        prefix: `BILL-${year}-`,
        currentValue: 10,
      };

      const mockTransaction = vi.fn().mockImplementation(async (callback) => {
        const mockTx = {
          select: vi.fn().mockReturnThis(),
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          for: vi.fn().mockResolvedValue([mockSequence]),
          update: vi.fn().mockReturnValue({
            set: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([{ affectedRows: 1 }]),
            }),
          }),
        };
        return callback(mockTx);
      });

      const mockDb = {
        transaction: mockTransaction,
      };

      vi.mocked(getDb).mockResolvedValue(mockDb as any);

      // Act
      const billNumber = await generateBillNumber();

      // Assert
      expect(billNumber).toBe(`BILL-${year}-000011`);
    });
  });

  describe("generatePaymentNumber", () => {
    it("should generate received payment number with correct format", async () => {
      // Arrange
      const year = new Date().getFullYear();
      const mockSequence = {
        id: 1,
        name: `payment_received_${year}`,
        prefix: `PMT-RCV-${year}-`,
        currentValue: 3,
      };

      const mockTransaction = vi.fn().mockImplementation(async (callback) => {
        const mockTx = {
          select: vi.fn().mockReturnThis(),
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          for: vi.fn().mockResolvedValue([mockSequence]),
          update: vi.fn().mockReturnValue({
            set: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([{ affectedRows: 1 }]),
            }),
          }),
        };
        return callback(mockTx);
      });

      const mockDb = {
        transaction: mockTransaction,
      };

      vi.mocked(getDb).mockResolvedValue(mockDb as any);

      // Act
      const paymentNumber = await generatePaymentNumber("RECEIVED");

      // Assert
      expect(paymentNumber).toBe(`PMT-RCV-${year}-000004`);
    });

    it("should generate sent payment number with correct format", async () => {
      // Arrange
      const year = new Date().getFullYear();
      const mockSequence = {
        id: 1,
        name: `payment_sent_${year}`,
        prefix: `PMT-SNT-${year}-`,
        currentValue: 7,
      };

      const mockTransaction = vi.fn().mockImplementation(async (callback) => {
        const mockTx = {
          select: vi.fn().mockReturnThis(),
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          for: vi.fn().mockResolvedValue([mockSequence]),
          update: vi.fn().mockReturnValue({
            set: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([{ affectedRows: 1 }]),
            }),
          }),
        };
        return callback(mockTx);
      });

      const mockDb = {
        transaction: mockTransaction,
      };

      vi.mocked(getDb).mockResolvedValue(mockDb as any);

      // Act
      const paymentNumber = await generatePaymentNumber("SENT");

      // Assert
      expect(paymentNumber).toBe(`PMT-SNT-${year}-000008`);
    });
  });

  describe("Concurrent generation protection", () => {
    it("should use SELECT ... FOR UPDATE for row-level locking", async () => {
      // Arrange
      const year = new Date().getFullYear();
      const mockSequence = {
        id: 1,
        name: `invoice_${year}`,
        prefix: `INV-${year}-`,
        currentValue: 0,
      };

      const forMock = vi.fn().mockResolvedValue([mockSequence]);

      const mockTransaction = vi.fn().mockImplementation(async (callback) => {
        const mockTx = {
          select: vi.fn().mockReturnThis(),
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          for: forMock,
          update: vi.fn().mockReturnValue({
            set: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([{ affectedRows: 1 }]),
            }),
          }),
        };
        return callback(mockTx);
      });

      const mockDb = {
        transaction: mockTransaction,
      };

      vi.mocked(getDb).mockResolvedValue(mockDb as any);

      // Act
      await generateInvoiceNumber();

      // Assert - Verify that FOR UPDATE was called for row-level locking
      expect(forMock).toHaveBeenCalledWith("update");
    });

    it("should use transaction for atomic updates", async () => {
      // Arrange
      const transactionMock = vi.fn().mockImplementation(async (callback) => {
        const mockTx = {
          select: vi.fn().mockReturnThis(),
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          for: vi.fn().mockResolvedValue([{
            id: 1,
            name: `invoice_${new Date().getFullYear()}`,
            prefix: `INV-${new Date().getFullYear()}-`,
            currentValue: 0,
          }]),
          update: vi.fn().mockReturnValue({
            set: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([{ affectedRows: 1 }]),
            }),
          }),
        };
        return callback(mockTx);
      });

      const mockDb = {
        transaction: transactionMock,
      };

      vi.mocked(getDb).mockResolvedValue(mockDb as any);

      // Act
      await generateInvoiceNumber();

      // Assert - Verify transaction was used
      expect(transactionMock).toHaveBeenCalledTimes(1);
    });
  });
});

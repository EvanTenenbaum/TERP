/**
 * REL-003: Payments Router Tests - Transaction Rollback Scenarios
 * @module server/routers/payments.test
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { TRPCError } from "@trpc/server";
import { setupDbMock } from "../test-utils/testDb";
import { setupPermissionMock } from "../test-utils/testPermissions";

// Mock the database (MUST be before other imports)
vi.mock("../db", () => setupDbMock());

// Mock permission service (MUST be before other imports)
vi.mock("../services/permissionService", () => setupPermissionMock());

// Mock dependencies
vi.mock("../_core/accountLookup", () => ({
  getAccountIdByName: vi.fn().mockResolvedValue(1),
  ACCOUNT_NAMES: {
    CASH: "Cash",
    ACCOUNTS_RECEIVABLE: "Accounts Receivable",
  },
}));

vi.mock("../_core/fiscalPeriod", () => ({
  getFiscalPeriodIdOrDefault: vi.fn().mockResolvedValue(1),
}));

vi.mock("../services/clientBalanceService", () => ({
  syncClientBalance: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../_core/logger", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

import { appRouter } from "../routers";
import { createContext } from "../_core/context";
import { getDb } from "../db";
import { logger } from "../_core/logger";

// Mock user for authenticated requests
const mockUser = {
  id: 1,
  email: "test@terp.com",
  name: "Test User",
};

// Create a test caller with mock context
const createCaller = async () => {
  const ctx = await createContext({
    req: { headers: {} } as any,
    res: {} as any,
  });

  return appRouter.createCaller({
    ...ctx,
    user: mockUser,
  });
};

describe("Payments Router - Transaction Rollback", () => {
  let caller: Awaited<ReturnType<typeof createCaller>>;
  let mockDb: any;

  beforeEach(async () => {
    caller = await createCaller();
    mockDb = await getDb();
    vi.clearAllMocks();
  });

  describe("recordPayment - Transaction Rollback", () => {
    it("should rollback transaction and re-throw error on payment insert failure", async () => {
      // Arrange: Set up invoice mock to return valid invoice
      mockDb.query.invoices.findMany.mockResolvedValue([
        {
          id: 1,
          invoiceNumber: "INV-001",
          customerId: 1,
          status: "SENT",
          totalAmount: "100.00",
          amountPaid: "0.00",
          amountDue: "100.00",
        },
      ]);

      // Mock transaction to fail when inserting payment
      const mockTransaction = vi.fn(async (callback: any) => {
        const mockTx = {
          insert: vi.fn().mockImplementation(() => {
            throw new Error("Database constraint violation");
          }),
          update: vi.fn(),
          select: vi.fn(),
        };
        await callback(mockTx);
      });

      mockDb.transaction = mockTransaction;

      // Act & Assert
      await expect(
        caller.payments.recordPayment({
          invoiceId: 1,
          amount: 50,
          paymentMethod: "CASH",
        })
      ).rejects.toThrow("Database constraint violation");

      // Verify error was logged
      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          msg: "[Payments] Payment transaction rolled back",
          invoiceId: 1,
        })
      );
    });

    it("should rollback transaction on invoice update failure", async () => {
      // Arrange
      mockDb.query.invoices.findMany.mockResolvedValue([
        {
          id: 1,
          invoiceNumber: "INV-001",
          customerId: 1,
          status: "SENT",
          totalAmount: "100.00",
          amountPaid: "0.00",
          amountDue: "100.00",
        },
      ]);

      const mockTransaction = vi.fn(async (callback: any) => {
        const mockTx = {
          insert: vi.fn().mockReturnValue({
            values: vi.fn().mockReturnValue({
              $returningId: vi
                .fn()
                .mockResolvedValue([{ id: 1 }])
                .mockRejectedValueOnce([{ id: 1 }]), // First call succeeds (payment insert)
            }),
          }),
          update: vi.fn().mockImplementation(() => {
            throw new Error("Invoice update failed - optimistic lock");
          }),
        };
        await callback(mockTx);
      });

      mockDb.transaction = mockTransaction;

      // Act & Assert
      await expect(
        caller.payments.recordPayment({
          invoiceId: 1,
          amount: 50,
          paymentMethod: "CASH",
        })
      ).rejects.toThrow();

      expect(logger.error).toHaveBeenCalled();
    });

    it("should rollback transaction on GL entry failure", async () => {
      // Arrange
      mockDb.query.invoices.findMany.mockResolvedValue([
        {
          id: 1,
          invoiceNumber: "INV-001",
          customerId: 1,
          status: "SENT",
          totalAmount: "100.00",
          amountPaid: "0.00",
          amountDue: "100.00",
        },
      ]);

      let insertCallCount = 0;
      const mockTransaction = vi.fn(async (callback: any) => {
        const mockTx = {
          insert: vi.fn().mockImplementation(() => {
            insertCallCount++;
            if (insertCallCount === 2) {
              // Fail on GL entry insert (after payment insert)
              throw new Error("Fiscal period not found");
            }
            return {
              values: vi.fn().mockReturnValue({
                $returningId: vi.fn().mockResolvedValue([{ id: 1 }]),
              }),
            };
          }),
          update: vi.fn().mockReturnValue({
            set: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([]),
            }),
          }),
        };
        await callback(mockTx);
      });

      mockDb.transaction = mockTransaction;

      // Act & Assert
      await expect(
        caller.payments.recordPayment({
          invoiceId: 1,
          amount: 50,
          paymentMethod: "CASH",
        })
      ).rejects.toThrow("Fiscal period not found");

      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          msg: "[Payments] Payment transaction rolled back",
        })
      );
    });
  });

  describe("recordMultiInvoicePayment - Transaction Rollback", () => {
    it("should rollback transaction on payment insert failure", async () => {
      // Arrange
      const mockTransaction = vi.fn(async (callback: any) => {
        const mockTx = {
          insert: vi.fn().mockImplementation(() => {
            throw new Error("Payment number generation failed");
          }),
        };
        await callback(mockTx);
      });

      mockDb.transaction = mockTransaction;

      // Act & Assert
      await expect(
        caller.payments.recordMultiInvoicePayment({
          clientId: 1,
          totalAmount: 100,
          allocations: [{ invoiceId: 1, amount: 100 }],
          paymentMethod: "CASH",
        })
      ).rejects.toThrow("Payment number generation failed");

      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          msg: "[Payments] Multi-invoice payment transaction rolled back",
          clientId: 1,
          totalAmount: 100,
        })
      );
    });

    it("should rollback transaction when invoice not found mid-allocation", async () => {
      // Arrange
      const mockTransaction = vi.fn(async (callback: any) => {
        const mockTx = {
          insert: vi.fn().mockReturnValue({
            values: vi.fn().mockReturnValue({
              $returningId: vi.fn().mockResolvedValue([{ id: 1 }]),
            }),
          }),
          select: vi.fn().mockReturnValue({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([]), // Invoice not found
              }),
            }),
          }),
        };
        await callback(mockTx);
      });

      mockDb.transaction = mockTransaction;

      // Act & Assert
      await expect(
        caller.payments.recordMultiInvoicePayment({
          clientId: 1,
          totalAmount: 100,
          allocations: [{ invoiceId: 999, amount: 100 }],
          paymentMethod: "CASH",
        })
      ).rejects.toThrow(TRPCError);

      expect(logger.error).toHaveBeenCalled();
    });

    it("should rollback transaction on invoice_payments junction table insert failure", async () => {
      // Arrange
      const mockTransaction = vi.fn(async (callback: any) => {
        let insertCallCount = 0;
        const mockTx = {
          insert: vi.fn().mockImplementation((table: any) => {
            insertCallCount++;
            if (insertCallCount === 2) {
              // Fail on invoice_payments insert
              throw new Error("Foreign key constraint violation");
            }
            return {
              values: vi.fn().mockReturnValue({
                $returningId: vi.fn().mockResolvedValue([{ id: 1 }]),
              }),
            };
          }),
          select: vi.fn().mockReturnValue({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([
                  {
                    id: 1,
                    invoiceNumber: "INV-001",
                    amountDue: "100.00",
                    amountPaid: "0.00",
                    totalAmount: "100.00",
                    status: "SENT",
                  },
                ]),
              }),
            }),
          }),
          update: vi.fn(),
        };
        await callback(mockTx);
      });

      mockDb.transaction = mockTransaction;

      // Act & Assert
      await expect(
        caller.payments.recordMultiInvoicePayment({
          clientId: 1,
          totalAmount: 100,
          allocations: [{ invoiceId: 1, amount: 100 }],
          paymentMethod: "CASH",
        })
      ).rejects.toThrow("Foreign key constraint violation");

      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          msg: "[Payments] Multi-invoice payment transaction rolled back",
        })
      );
    });
  });

  describe("void - Transaction Rollback", () => {
    it("should rollback transaction on payment soft delete failure", async () => {
      // Arrange
      mockDb.query.payments.findMany.mockResolvedValue([
        {
          id: 1,
          paymentNumber: "PMT-001",
          amount: "50.00",
          customerId: 1,
          deletedAt: null,
        },
      ]);

      const mockTransaction = vi.fn(async (callback: any) => {
        const mockTx = {
          update: vi.fn().mockImplementation(() => {
            throw new Error("Database lock timeout");
          }),
          select: vi.fn(),
        };
        await callback(mockTx);
      });

      mockDb.transaction = mockTransaction;

      // Act & Assert
      await expect(
        caller.payments.void({
          id: 1,
          reason: "Duplicate payment",
        })
      ).rejects.toThrow("Database lock timeout");

      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          msg: "[Payments] Payment void transaction rolled back",
          paymentId: 1,
        })
      );
    });

    it("should rollback transaction on invoice reversal failure", async () => {
      // Arrange
      mockDb.query.payments.findMany.mockResolvedValue([
        {
          id: 1,
          paymentNumber: "PMT-001",
          amount: "50.00",
          customerId: 1,
          invoiceId: 1,
          deletedAt: null,
        },
      ]);

      const mockTransaction = vi.fn(async (callback: any) => {
        let updateCallCount = 0;
        const mockTx = {
          update: vi.fn().mockImplementation(() => {
            updateCallCount++;
            if (updateCallCount === 2) {
              // Fail on invoice update (after payment soft delete)
              throw new Error("Invoice update failed");
            }
            return {
              set: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue([]),
              }),
            };
          }),
          select: vi.fn().mockReturnValue({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([
                {
                  id: 1,
                  amountPaid: "50.00",
                  amountDue: "0.00",
                  totalAmount: "50.00",
                  status: "PAID",
                },
              ]),
            }),
          }),
          insert: vi.fn(),
        };
        await callback(mockTx);
      });

      mockDb.transaction = mockTransaction;

      // Act & Assert
      await expect(
        caller.payments.void({
          id: 1,
          reason: "Error in payment",
        })
      ).rejects.toThrow();

      expect(logger.error).toHaveBeenCalled();
    });

    it("should rollback transaction on GL reversal entry failure", async () => {
      // Arrange
      mockDb.query.payments.findMany.mockResolvedValue([
        {
          id: 1,
          paymentNumber: "PMT-001",
          amount: "50.00",
          customerId: 1,
          invoiceId: 1,
          deletedAt: null,
        },
      ]);

      const mockTransaction = vi.fn(async (callback: any) => {
        const mockTx = {
          update: vi.fn().mockReturnValue({
            set: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([]),
            }),
          }),
          select: vi.fn().mockReturnValue({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([
                {
                  id: 1,
                  amountPaid: "50.00",
                  totalAmount: "50.00",
                },
              ]),
            }),
          }),
          insert: vi.fn().mockImplementation(() => {
            throw new Error("GL entry failed - account locked");
          }),
        };
        await callback(mockTx);
      });

      mockDb.transaction = mockTransaction;

      // Act & Assert
      await expect(
        caller.payments.void({
          id: 1,
          reason: "Void payment",
        })
      ).rejects.toThrow("GL entry failed - account locked");

      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          msg: "[Payments] Payment void transaction rolled back",
        })
      );
    });
  });

  describe("Error Logging Verification", () => {
    it("should log error details before re-throwing in recordPayment", async () => {
      // Arrange
      mockDb.query.invoices.findMany.mockResolvedValue([
        {
          id: 1,
          status: "SENT",
          totalAmount: "100.00",
          amountDue: "100.00",
          amountPaid: "0.00",
          customerId: 1,
        },
      ]);

      const testError = new Error("Test transaction failure");
      mockDb.transaction = vi.fn().mockRejectedValue(testError);

      // Act & Assert
      await expect(
        caller.payments.recordPayment({
          invoiceId: 1,
          amount: 50,
          paymentMethod: "CASH",
        })
      ).rejects.toThrow("Test transaction failure");

      // Verify error logging occurred before re-throw
      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          msg: "[Payments] Payment transaction rolled back",
          error: "Test transaction failure",
        })
      );
    });

    it("should preserve error stack trace when re-throwing", async () => {
      // Arrange
      mockDb.query.invoices.findMany.mockResolvedValue([
        {
          id: 1,
          status: "SENT",
          totalAmount: "100.00",
          amountDue: "100.00",
          amountPaid: "0.00",
          customerId: 1,
        },
      ]);

      const originalError = new Error("Original error");
      mockDb.transaction = vi.fn().mockRejectedValue(originalError);

      // Act & Assert
      try {
        await caller.payments.recordPayment({
          invoiceId: 1,
          amount: 50,
          paymentMethod: "CASH",
        });
        expect.fail("Should have thrown error");
      } catch (error) {
        // Error should be the same instance (not wrapped)
        expect(error).toBe(originalError);
      }
    });
  });
});

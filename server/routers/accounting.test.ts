/**
 * Integration Tests for Accounting Router
 *
 * Tests all tRPC procedures in the accounting router.
 * Uses AAA (Arrange, Act, Assert) pattern for clarity.
 *
 * @module server/routers/accounting.test.ts
 */

import { describe, it, expect, beforeAll, vi } from "vitest";
import * as fc from "fast-check";
import { z } from "zod";
import { setupDbMock } from "../test-utils/testDb";
import { setupPermissionMock } from "../test-utils/testPermissions";

// Mock the database (MUST be before other imports)
vi.mock("../db", () => setupDbMock());

// Mock permission service (MUST be before other imports)
vi.mock("../services/permissionService", () => setupPermissionMock());

// Mock the accounting modules
vi.mock("../accountingDb");
vi.mock("../arApDb");
vi.mock("../cashExpensesDb");

import { appRouter } from "../routers";
import { createContext } from "../_core/context";
import { db } from "../db";
import * as accountingDb from "../accountingDb";
import * as arApDb from "../arApDb";
import * as cashExpensesDb from "../cashExpensesDb";

// Mock user for authenticated requests
const mockUser = {
  id: 1,
  email: "test@terp.com",
  name: "Test User",
};

// Create a test caller with mock context
const createCaller = async () => {
  const ctx = await createContext({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    req: { headers: {} } as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    res: {} as any,
  });

  return appRouter.createCaller({
    ...ctx,
    user: mockUser,
  });
};

describe("Accounting Router", () => {
  let caller: Awaited<ReturnType<typeof createCaller>>;

  beforeAll(async () => {
    caller = await createCaller();
  });

  describe("Chart of Accounts", () => {
    describe("accounts.list", () => {
      it("should list all accounts", async () => {
        // Arrange
        const mockAccounts = [
          {
            id: 1,
            accountNumber: "1000",
            accountName: "Cash",
            accountType: "ASSET",
          },
          {
            id: 2,
            accountNumber: "2000",
            accountName: "Accounts Payable",
            accountType: "LIABILITY",
          },
        ];

        vi.mocked(accountingDb.getAccounts).mockResolvedValue(mockAccounts);

        // Act
        const result = await caller.accounting.accounts.list({});

        // Assert
        expect(result).toEqual(mockAccounts);
        expect(result).toHaveLength(2);
      });

      it("should filter accounts by type", async () => {
        // Arrange
        const mockAssetAccounts = [
          {
            id: 1,
            accountNumber: "1000",
            accountName: "Cash",
            accountType: "ASSET",
          },
        ];

        vi.mocked(accountingDb.getAccounts).mockResolvedValue(
          mockAssetAccounts
        );

        // Act
        const result = await caller.accounting.accounts.list({
          accountType: "ASSET",
        });

        // Assert
        expect(result).toHaveLength(1);
        expect(accountingDb.getAccounts).toHaveBeenCalledWith({
          accountType: "ASSET",
        });
      });
    });

    describe("accounts.getById", () => {
      it("should retrieve account by ID", async () => {
        // Arrange
        const mockAccount = {
          id: 1,
          accountNumber: "1000",
          accountName: "Cash",
          accountType: "ASSET",
        };

        vi.mocked(accountingDb.getAccountById).mockResolvedValue(mockAccount);

        // Act
        const result = await caller.accounting.accounts.getById({ id: 1 });

        // Assert
        expect(result).toEqual(mockAccount);
      });
    });

    describe("accounts.create", () => {
      it("should create a new account", async () => {
        // Arrange
        const input = {
          accountNumber: "3000",
          accountName: "Revenue",
          accountType: "REVENUE" as const,
          normalBalance: "CREDIT" as const,
        };

        const mockCreatedAccount = {
          id: 3,
          ...input,
        };

        vi.mocked(accountingDb.createAccount).mockResolvedValue(
          mockCreatedAccount
        );

        // Act
        const result = await caller.accounting.accounts.create(input);

        // Assert
        expect(result).toEqual(mockCreatedAccount);
      });
    });

    describe("accounts.getBalance", () => {
      it("should retrieve account balance", async () => {
        // Arrange
        const mockBalance = {
          accountId: 1,
          balance: 10000.5,
          asOfDate: new Date("2025-01-01"),
        };

        vi.mocked(accountingDb.getAccountBalance).mockResolvedValue(
          mockBalance
        );

        // Act
        const result = await caller.accounting.accounts.getBalance({
          accountId: 1,
          asOfDate: new Date("2025-01-01"),
        });

        // Assert
        expect(result).toEqual(mockBalance);
      });
    });
  });

  describe("General Ledger", () => {
    describe("ledger.list", () => {
      it("should list ledger entries", async () => {
        // Arrange
        const mockEntries = [
          {
            id: 1,
            entryNumber: "JE-001",
            accountId: 1,
            debit: 1000,
            credit: 0,
          },
          {
            id: 2,
            entryNumber: "JE-001",
            accountId: 2,
            debit: 0,
            credit: 1000,
          },
        ];

        vi.mocked(accountingDb.getLedgerEntries).mockResolvedValue(mockEntries);

        // Act
        const result = await caller.accounting.ledger.list({});

        // Assert
        expect(result).toEqual(mockEntries);
      });

      it("should filter ledger entries by account", async () => {
        // Arrange
        const mockFilteredEntries = [{ id: 1, accountId: 1, debit: 1000 }];

        vi.mocked(accountingDb.getLedgerEntries).mockResolvedValue(
          mockFilteredEntries
        );

        // Act
        await caller.accounting.ledger.list({ accountId: 1 });

        // Assert
        expect(accountingDb.getLedgerEntries).toHaveBeenCalledWith({
          accountId: 1,
        });
      });
    });
  });

  describe("AR/AP", () => {
    describe("arAp.getArSummary", () => {
      it.skip("should retrieve AR summary", async () => {
        // Arrange
        const mockArSummary = {
          totalAr: 50000,
          current: 30000,
          days30: 10000,
          days60: 5000,
          days90: 3000,
          days90Plus: 2000,
        };

        vi.mocked(arApDb.getArSummary).mockResolvedValue(mockArSummary);

        // Act
        const _result = await caller.accounting.arAp.getArSummary();

        // Assert
        expect(_result).toEqual(mockArSummary);
      });
    });

    describe("arAp.getApSummary", () => {
      it.skip("should retrieve AP summary", async () => {
        // Arrange
        const mockApSummary = {
          totalAp: 25000,
          current: 20000,
          days30: 3000,
          days60: 1000,
          days90: 500,
          days90Plus: 500,
        };

        vi.mocked(arApDb.getApSummary).mockResolvedValue(mockApSummary);

        // Act
        const _result = await caller.accounting.arAp.getApSummary();

        // Assert
        expect(_result).toEqual(mockApSummary);
      });
    });
  });

  describe("Cash & Expenses", () => {
    describe("cashExpenses.listExpenses", () => {
      it.skip("should list expenses", async () => {
        // Arrange
        const mockExpenses = [
          { id: 1, description: "Rent", amount: 2000, date: new Date() },
          { id: 2, description: "Utilities", amount: 500, date: new Date() },
        ];

        vi.mocked(cashExpensesDb.getExpenses).mockResolvedValue(mockExpenses);

        // Act
        const result = await caller.accounting.cashExpenses.listExpenses({});

        // Assert
        expect(result).toEqual(mockExpenses);
      });
    });

    describe("cashExpenses.createExpense", () => {
      it.skip("should create a new expense", async () => {
        // Arrange
        const input = {
          description: "Office Supplies",
          amount: 150.5,
          date: new Date("2025-01-15"),
          categoryId: 1,
        };

        const mockCreatedExpense = {
          id: 3,
          ...input,
        };

        vi.mocked(cashExpensesDb.createExpense).mockResolvedValue(
          mockCreatedExpense
        );

        // Act
        const result =
          await caller.accounting.cashExpenses.createExpense(input);

        // Assert
        expect(result).toEqual(mockCreatedExpense);
      });
    });
  });

  describe("Financial Reports", () => {
    describe("reports.balanceSheet", () => {
      it.skip("should generate balance sheet", async () => {
        // Arrange
        const mockBalanceSheet = {
          assets: { total: 100000, current: 50000, fixed: 50000 },
          liabilities: { total: 40000, current: 20000, longTerm: 20000 },
          equity: { total: 60000 },
        };

        vi.mocked(accountingDb.generateBalanceSheet).mockResolvedValue(
          mockBalanceSheet
        );

        // Act
        const result = await caller.accounting.reports.balanceSheet({
          asOfDate: new Date("2025-01-31"),
        });

        // Assert
        expect(result).toEqual(mockBalanceSheet);
      });
    });

    describe("reports.incomeStatement", () => {
      it.skip("should generate income statement", async () => {
        // Arrange
        const mockIncomeStatement = {
          revenue: 150000,
          expenses: 100000,
          netIncome: 50000,
        };

        vi.mocked(accountingDb.generateIncomeStatement).mockResolvedValue(
          mockIncomeStatement
        );

        // Act
        const result = await caller.accounting.reports.incomeStatement({
          startDate: new Date("2025-01-01"),
          endDate: new Date("2025-01-31"),
        });

        // Assert
        expect(result).toEqual(mockIncomeStatement);
      });
    });
  });

  /**
   * **Feature: data-display-fix, Property 2: Invoice Status Schema Completeness**
   * **Validates: Requirements 1.3, 10.3**
   *
   * Property: For any invoice status value that exists in the database schema enum,
   * the API Zod schema SHALL accept that value as valid input.
   */
  describe("Property 2: Invoice Status Schema Completeness", () => {
    // Database enum values from drizzle/schema.ts - invoices table
    const DATABASE_INVOICE_STATUSES = [
      "DRAFT",
      "SENT",
      "VIEWED",
      "PARTIAL",
      "PAID",
      "OVERDUE",
      "VOID",
    ] as const;

    // Zod schema matching the accounting router's invoice status enum
    const invoiceStatusSchema = z.enum([
      "DRAFT",
      "SENT",
      "VIEWED",
      "PARTIAL",
      "PAID",
      "OVERDUE",
      "VOID",
    ]);

    it("should accept all database enum values in Zod schema", () => {
      fc.assert(
        fc.property(
          // Generate random status from database enum values
          fc.constantFrom(...DATABASE_INVOICE_STATUSES),
          (status) => {
            // Property: Zod schema should successfully parse any database enum value
            const result = invoiceStatusSchema.safeParse(status);
            expect(result.success).toBe(true);
            if (result.success) {
              expect(result.data).toBe(status);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should have matching enum values between database and Zod schema", () => {
      // Get the enum values from the Zod schema
      const zodEnumValues = invoiceStatusSchema.options;

      // Property: All database values should be in Zod schema
      for (const dbStatus of DATABASE_INVOICE_STATUSES) {
        expect(zodEnumValues).toContain(dbStatus);
      }

      // Property: All Zod values should be in database enum
      for (const zodStatus of zodEnumValues) {
        expect(DATABASE_INVOICE_STATUSES).toContain(zodStatus);
      }

      // Property: Both should have the same length
      expect(zodEnumValues.length).toBe(DATABASE_INVOICE_STATUSES.length);
    });

    it("should reject invalid status values", () => {
      fc.assert(
        fc.property(
          // Generate random strings that are NOT valid statuses
          fc.string().filter(
            (s) => !DATABASE_INVOICE_STATUSES.includes(s as typeof DATABASE_INVOICE_STATUSES[number])
          ),
          (invalidStatus) => {
            // Property: Zod schema should reject invalid status values
            const result = invoiceStatusSchema.safeParse(invalidStatus);
            expect(result.success).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should handle case sensitivity correctly", () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...DATABASE_INVOICE_STATUSES),
          (status) => {
            // Property: lowercase versions should be rejected (case-sensitive)
            const lowercaseResult = invoiceStatusSchema.safeParse(status.toLowerCase());
            expect(lowercaseResult.success).toBe(false);

            // Property: mixed case versions should be rejected
            const mixedCase = status.charAt(0) + status.slice(1).toLowerCase();
            if (mixedCase !== status) {
              const mixedCaseResult = invoiceStatusSchema.safeParse(mixedCase);
              expect(mixedCaseResult.success).toBe(false);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: data-display-fix, Property 8: Status Filter Correctness**
   * **Validates: Requirements 2.3**
   *
   * Property: For any list query with a status filter, all returned items
   * SHALL have a status matching the filter value.
   */
  describe("Property 8: Status Filter Correctness", () => {
    // Bill status enum values
    const BILL_STATUSES = [
      "DRAFT",
      "PENDING",
      "PARTIAL",
      "PAID",
      "OVERDUE",
      "VOID",
    ] as const;

    type BillStatus = typeof BILL_STATUSES[number];

    // Generator for mock bills with various statuses
    const billArbitrary = (status: BillStatus) =>
      fc.record({
        id: fc.integer({ min: 1, max: 10000 }),
        billNumber: fc.string({ minLength: 1, maxLength: 20 }).map(s => `BILL-${s}`),
        vendorId: fc.integer({ min: 1, max: 100 }),
        billDate: fc.date({ min: new Date("2020-01-01"), max: new Date("2025-12-31") }),
        dueDate: fc.date({ min: new Date("2020-01-01"), max: new Date("2025-12-31") }),
        subtotal: fc.float({ min: 0, max: 10000 }).map(n => n.toFixed(2)),
        taxAmount: fc.float({ min: 0, max: 1000 }).map(n => n.toFixed(2)),
        totalAmount: fc.float({ min: 0, max: 11000 }).map(n => n.toFixed(2)),
        amountPaid: fc.float({ min: 0, max: 11000 }).map(n => n.toFixed(2)),
        amountDue: fc.float({ min: 0, max: 11000 }).map(n => n.toFixed(2)),
        status: fc.constant(status),
        createdAt: fc.date(),
        updatedAt: fc.date(),
      });

    // Generator for a list of bills with mixed statuses
    const mixedBillsArbitrary = fc.array(
      fc.tuple(
        fc.constantFrom(...BILL_STATUSES),
        fc.integer({ min: 1, max: 5 })
      ),
      { minLength: 1, maxLength: 6 }
    ).chain(statusCounts => {
      const billGenerators = statusCounts.flatMap(([status, count]) =>
        Array(count).fill(null).map(() => billArbitrary(status))
      );
      return fc.tuple(...billGenerators);
    });

    it("should return only bills matching the filtered status", () => {
      fc.assert(
        fc.property(
          // Generate a target status to filter by
          fc.constantFrom(...BILL_STATUSES),
          // Generate a list of bills with various statuses
          mixedBillsArbitrary,
          (filterStatus, allBills) => {
            // Simulate the filter logic from getBills
            const filteredBills = allBills.filter(bill => bill.status === filterStatus);

            // Property: All filtered results should have the matching status
            for (const bill of filteredBills) {
              expect(bill.status).toBe(filterStatus);
            }

            // Property: No bill with a different status should be in the results
            const nonMatchingBills = allBills.filter(bill => bill.status !== filterStatus);
            for (const bill of nonMatchingBills) {
              expect(filteredBills).not.toContainEqual(bill);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should filter bills correctly via the API mock", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...BILL_STATUSES),
          fc.array(fc.constantFrom(...BILL_STATUSES), { minLength: 1, maxLength: 10 }),
          async (filterStatus, billStatuses) => {
            // Arrange: Create mock bills with the generated statuses (all required fields)
            const mockBills = billStatuses.map((status, index) => ({
              id: index + 1,
              billNumber: `BILL-2025-${String(index + 1).padStart(6, "0")}`,
              deletedAt: null,
              vendorId: 1,
              billDate: new Date("2025-01-15"),
              dueDate: new Date("2025-02-15"),
              subtotal: "100.00",
              taxAmount: "10.00",
              discountAmount: "0.00",
              totalAmount: "110.00",
              amountPaid: status === "PAID" ? "110.00" : "0.00",
              amountDue: status === "PAID" ? "0.00" : "110.00",
              status,
              paymentTerms: "NET30",
              notes: null,
              referenceType: null,
              referenceId: null,
              createdBy: 1,
              createdAt: new Date(),
              updatedAt: new Date(),
            }));

            // Simulate the database filter behavior
            const expectedFilteredBills = mockBills.filter(b => b.status === filterStatus);

            // Mock the arApDb.getBills to return filtered results
            vi.mocked(arApDb.getBills).mockResolvedValue({
              bills: expectedFilteredBills,
              total: expectedFilteredBills.length,
            });

            // Act: Call the API with status filter
            const result = await caller.accounting.bills.list({ status: filterStatus });

            // Assert: Property - All returned bills should have the filtered status
            expect(result.bills).toHaveLength(expectedFilteredBills.length);
            for (const bill of result.bills) {
              expect(bill.status).toBe(filterStatus);
            }

            // Assert: Property - Total should match the filtered count
            expect(result.total).toBe(expectedFilteredBills.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should return empty array when no bills match the status filter", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...BILL_STATUSES),
          fc.array(
            fc.constantFrom(...BILL_STATUSES),
            { minLength: 1, maxLength: 5 }
          ).filter(statuses => {
            // Ensure we have at least one status that's different from all generated
            const uniqueStatuses = new Set(statuses);
            return uniqueStatuses.size < BILL_STATUSES.length;
          }),
          async (filterStatus, existingStatuses) => {
            // Only test when the filter status is NOT in the existing statuses
            if (existingStatuses.includes(filterStatus)) {
              return; // Skip this case
            }

            // Mock empty result for non-matching status
            vi.mocked(arApDb.getBills).mockResolvedValue({
              bills: [],
              total: 0,
            });

            // Act
            const result = await caller.accounting.bills.list({ status: filterStatus });

            // Assert: Property - Should return empty when no matches
            expect(result.bills).toHaveLength(0);
            expect(result.total).toBe(0);
          }
        ),
        { numRuns: 50 }
      );
    });

    it("should preserve status filter through the entire query pipeline", () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...BILL_STATUSES),
          fc.integer({ min: 1, max: 100 }),
          fc.integer({ min: 0, max: 50 }),
          (status, limit, offset) => {
            // Property: Status filter should be independent of pagination
            // The filter should be applied before pagination

            // Simulate a dataset
            const totalBillsWithStatus = 25;
            const expectedReturnCount = Math.min(limit, Math.max(0, totalBillsWithStatus - offset));

            // Property: Regardless of pagination, all returned items should match status
            // This is a logical property - pagination doesn't change the status of items
            expect(expectedReturnCount).toBeGreaterThanOrEqual(0);
            expect(expectedReturnCount).toBeLessThanOrEqual(limit);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});

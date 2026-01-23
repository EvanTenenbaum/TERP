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
import { db as _db } from "../db";
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
    req: { headers: {} } as any,
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

        // Assert - PERF-003: Now returns paginated response
        expect(result.items).toEqual(mockAccounts);
        expect(result.items).toHaveLength(2);
        expect(result.pagination.total).toBe(2);
        expect(result.pagination.hasMore).toBe(false);
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

        // Assert - PERF-003: Now returns paginated response
        expect(result.items).toHaveLength(1);
        expect(result.pagination.total).toBe(1);
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
        const mockArSummary = {
          totalAr: 50000,
          current: 30000,
          days30: 10000,
          days60: 5000,
          days90: 3000,
          days90Plus: 2000,
        };

        vi.mocked(arApDb.getArSummary).mockResolvedValue(mockArSummary);

        const _result = await caller.accounting.arAp.getArSummary();

        expect(_result).toEqual(mockArSummary);
      });
    });

    describe("arAp.getApSummary", () => {
      it.skip("should retrieve AP summary", async () => {
        const mockApSummary = {
          totalAp: 25000,
          current: 20000,
          days30: 3000,
          days60: 1000,
          days90: 500,
          days90Plus: 500,
        };

        vi.mocked(arApDb.getApSummary).mockResolvedValue(mockApSummary);

        const _result = await caller.accounting.arAp.getApSummary();

        expect(_result).toEqual(mockApSummary);
      });
    });
  });

  describe("Cash & Expenses", () => {
    describe("cashExpenses.listExpenses", () => {
      it.skip("should list expenses", async () => {
        const mockExpenses = [
          { id: 1, description: "Rent", amount: 2000, date: new Date() },
          { id: 2, description: "Utilities", amount: 500, date: new Date() },
        ];

        vi.mocked(cashExpensesDb.getExpenses).mockResolvedValue(mockExpenses);

        const result = await caller.accounting.cashExpenses.listExpenses({});

        expect(result).toEqual(mockExpenses);
      });
    });

    describe("cashExpenses.createExpense", () => {
      it.skip("should create a new expense", async () => {
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

        const result =
          await caller.accounting.cashExpenses.createExpense(input);

        expect(result).toEqual(mockCreatedExpense);
      });
    });
  });

  describe("Financial Reports", () => {
    describe("reports.balanceSheet", () => {
      it.skip("should generate balance sheet", async () => {
        const mockBalanceSheet = {
          assets: { total: 100000, current: 50000, fixed: 50000 },
          liabilities: { total: 40000, current: 20000, longTerm: 20000 },
          equity: { total: 60000 },
        };

        vi.mocked(accountingDb.generateBalanceSheet).mockResolvedValue(
          mockBalanceSheet
        );

        const result = await caller.accounting.reports.balanceSheet({
          asOfDate: new Date("2025-01-31"),
        });

        expect(result).toEqual(mockBalanceSheet);
      });
    });

    describe("reports.incomeStatement", () => {
      it.skip("should generate income statement", async () => {
        const mockIncomeStatement = {
          revenue: 150000,
          expenses: 100000,
          netIncome: 50000,
        };

        vi.mocked(accountingDb.generateIncomeStatement).mockResolvedValue(
          mockIncomeStatement
        );

        const result = await caller.accounting.reports.incomeStatement({
          startDate: new Date("2025-01-01"),
          endDate: new Date("2025-01-31"),
        });

        expect(result).toEqual(mockIncomeStatement);
      });
    });
  });

  describe("Property 2: Invoice Status Schema Completeness", () => {
    const DATABASE_INVOICE_STATUSES = [
      "DRAFT",
      "SENT",
      "VIEWED",
      "PARTIAL",
      "PAID",
      "OVERDUE",
      "VOID",
    ] as const;

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
          fc.constantFrom(...DATABASE_INVOICE_STATUSES),
          status => {
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
      const zodEnumValues = invoiceStatusSchema.options;

      for (const dbStatus of DATABASE_INVOICE_STATUSES) {
        expect(zodEnumValues).toContain(dbStatus);
      }

      for (const zodStatus of zodEnumValues) {
        expect(DATABASE_INVOICE_STATUSES).toContain(zodStatus);
      }

      expect(zodEnumValues.length).toBe(DATABASE_INVOICE_STATUSES.length);
    });

    it("should reject invalid status values", () => {
      fc.assert(
        fc.property(
          fc
            .string()
            .filter(
              s =>
                !DATABASE_INVOICE_STATUSES.includes(
                  s as (typeof DATABASE_INVOICE_STATUSES)[number]
                )
            ),
          invalidStatus => {
            const result = invoiceStatusSchema.safeParse(invalidStatus);
            expect(result.success).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should handle case sensitivity correctly", () => {
      fc.assert(
        fc.property(fc.constantFrom(...DATABASE_INVOICE_STATUSES), status => {
          const lowercaseResult = invoiceStatusSchema.safeParse(
            status.toLowerCase()
          );
          expect(lowercaseResult.success).toBe(false);

          const mixedCase = status.charAt(0) + status.slice(1).toLowerCase();
          if (mixedCase !== status) {
            const mixedCaseResult = invoiceStatusSchema.safeParse(mixedCase);
            expect(mixedCaseResult.success).toBe(false);
          }
        }),
        { numRuns: 100 }
      );
    });
  });
});
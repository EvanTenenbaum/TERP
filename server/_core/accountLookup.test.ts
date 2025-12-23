import { describe, it, expect, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";

// Mock the db module before importing the functions
vi.mock("../db", () => ({
  db: {
    query: {
      accounts: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
    },
  },
}));

import {
  getAccountIdByName,
  getAccountIdByCode,
  getAccountIdsByNames,
  ACCOUNT_NAMES,
} from "./accountLookup";
import { db } from "../db";

// Type assertion for mocked db
const mockedDb = db as unknown as {
  query: {
    accounts: {
      findFirst: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
    };
  };
};

// Helper to create mock account
function createMockAccount(overrides: {
  id: number;
  accountNumber: string;
  accountName: string;
  accountType: "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE";
  normalBalance: "DEBIT" | "CREDIT";
}) {
  return {
    ...overrides,
    isActive: true,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    description: null,
    parentAccountId: null,
  };
}

describe("accountLookup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("ACCOUNT_NAMES", () => {
    it("should have all expected account name constants", () => {
      expect(ACCOUNT_NAMES.ACCOUNTS_RECEIVABLE).toBe("Accounts Receivable");
      expect(ACCOUNT_NAMES.ACCOUNTS_PAYABLE).toBe("Accounts Payable");
      expect(ACCOUNT_NAMES.BAD_DEBT_EXPENSE).toBe("Bad Debt Expense");
      expect(ACCOUNT_NAMES.SALES_REVENUE).toBe("Sales Revenue");
      expect(ACCOUNT_NAMES.COST_OF_GOODS_SOLD).toBe("Cost of Goods Sold");
      expect(ACCOUNT_NAMES.INVENTORY).toBe("Inventory");
      expect(ACCOUNT_NAMES.CASH).toBe("Cash");
    });
  });

  describe("getAccountIdByName", () => {
    it("should return account ID for existing account", async () => {
      mockedDb.query.accounts.findFirst.mockResolvedValue(
        createMockAccount({
          id: 10,
          accountNumber: "1100",
          accountName: "Accounts Receivable",
          accountType: "ASSET",
          normalBalance: "DEBIT",
        })
      );

      const result = await getAccountIdByName("Accounts Receivable");
      expect(result).toBe(10);
    });

    it("should throw NOT_FOUND for non-existent account", async () => {
      mockedDb.query.accounts.findFirst.mockResolvedValue(undefined);

      await expect(getAccountIdByName("Non-Existent Account")).rejects.toThrow(
        TRPCError
      );
      await expect(getAccountIdByName("Non-Existent Account")).rejects.toThrow(
        'Account "Non-Existent Account" not found in chart of accounts'
      );
    });

    it("should exclude soft-deleted accounts", async () => {
      // The mock returns undefined because the query filters out deleted accounts
      mockedDb.query.accounts.findFirst.mockResolvedValue(undefined);

      await expect(getAccountIdByName("Deleted Account")).rejects.toThrow(
        TRPCError
      );
    });
  });

  describe("getAccountIdByCode", () => {
    it("should return account ID for existing account code", async () => {
      mockedDb.query.accounts.findFirst.mockResolvedValue(
        createMockAccount({
          id: 20,
          accountNumber: "2000",
          accountName: "Accounts Payable",
          accountType: "LIABILITY",
          normalBalance: "CREDIT",
        })
      );

      const result = await getAccountIdByCode("2000");
      expect(result).toBe(20);
    });

    it("should throw NOT_FOUND for non-existent account code", async () => {
      mockedDb.query.accounts.findFirst.mockResolvedValue(undefined);

      await expect(getAccountIdByCode("9999")).rejects.toThrow(TRPCError);
      await expect(getAccountIdByCode("9999")).rejects.toThrow(
        'Account with code "9999" not found'
      );
    });

    it("should handle account codes with leading zeros", async () => {
      mockedDb.query.accounts.findFirst.mockResolvedValue(
        createMockAccount({
          id: 1,
          accountNumber: "0100",
          accountName: "Cash",
          accountType: "ASSET",
          normalBalance: "DEBIT",
        })
      );

      const result = await getAccountIdByCode("0100");
      expect(result).toBe(1);
    });
  });

  describe("getAccountIdsByNames", () => {
    it("should return map of account names to IDs", async () => {
      mockedDb.query.accounts.findMany.mockResolvedValue([
        createMockAccount({
          id: 10,
          accountNumber: "1100",
          accountName: "Accounts Receivable",
          accountType: "ASSET",
          normalBalance: "DEBIT",
        }),
        createMockAccount({
          id: 20,
          accountNumber: "2000",
          accountName: "Accounts Payable",
          accountType: "LIABILITY",
          normalBalance: "CREDIT",
        }),
        createMockAccount({
          id: 30,
          accountNumber: "4000",
          accountName: "Sales Revenue",
          accountType: "REVENUE",
          normalBalance: "CREDIT",
        }),
      ]);

      const result = await getAccountIdsByNames([
        "Accounts Receivable",
        "Accounts Payable",
        "Sales Revenue",
      ]);

      expect(result.size).toBe(3);
      expect(result.get("Accounts Receivable")).toBe(10);
      expect(result.get("Accounts Payable")).toBe(20);
      expect(result.get("Sales Revenue")).toBe(30);
    });

    it("should skip missing accounts silently", async () => {
      mockedDb.query.accounts.findMany.mockResolvedValue([
        createMockAccount({
          id: 10,
          accountNumber: "1100",
          accountName: "Accounts Receivable",
          accountType: "ASSET",
          normalBalance: "DEBIT",
        }),
      ]);

      const result = await getAccountIdsByNames([
        "Accounts Receivable",
        "Non-Existent Account",
      ]);

      expect(result.size).toBe(1);
      expect(result.get("Accounts Receivable")).toBe(10);
      expect(result.has("Non-Existent Account")).toBe(false);
    });

    it("should return empty map when no accounts found", async () => {
      mockedDb.query.accounts.findMany.mockResolvedValue([]);

      const result = await getAccountIdsByNames([
        "Accounts Receivable",
        "Accounts Payable",
      ]);

      expect(result.size).toBe(0);
    });

    it("should handle empty input array", async () => {
      mockedDb.query.accounts.findMany.mockResolvedValue([]);

      const result = await getAccountIdsByNames([]);

      expect(result.size).toBe(0);
    });

    it("should exclude soft-deleted accounts from results", async () => {
      // The mock returns only non-deleted accounts because the query filters them
      mockedDb.query.accounts.findMany.mockResolvedValue([
        createMockAccount({
          id: 10,
          accountNumber: "1100",
          accountName: "Accounts Receivable",
          accountType: "ASSET",
          normalBalance: "DEBIT",
        }),
      ]);

      const result = await getAccountIdsByNames([
        "Accounts Receivable",
        "Deleted Account",
      ]);

      expect(result.size).toBe(1);
      expect(result.has("Deleted Account")).toBe(false);
    });
  });
});

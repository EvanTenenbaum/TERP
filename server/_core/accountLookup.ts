import { db } from "../db";
import { accounts } from "../../drizzle/schema";
import { eq, isNull, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

/**
 * Common account names used throughout the system.
 * Use these constants to ensure consistent account lookups.
 */
export const ACCOUNT_NAMES = {
  ACCOUNTS_RECEIVABLE: "Accounts Receivable",
  ACCOUNTS_PAYABLE: "Accounts Payable",
  BAD_DEBT_EXPENSE: "Bad Debt Expense",
  SALES_REVENUE: "Sales Revenue",
  COST_OF_GOODS_SOLD: "Cost of Goods Sold",
  INVENTORY: "Inventory",
  CASH: "Cash",
} as const;

/**
 * Get account ID by name.
 * Throws if account not found.
 *
 * @param name - The account name to look up
 * @returns The account ID
 * @throws TRPCError with code NOT_FOUND if account doesn't exist
 */
export async function getAccountIdByName(name: string): Promise<number> {
  if (!db) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Database not available",
    });
  }

  const account = await db.query.accounts.findFirst({
    where: and(
      eq(accounts.accountName, name),
      isNull(accounts.deletedAt)
    ),
  });

  if (!account) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: `Account "${name}" not found in chart of accounts`,
    });
  }

  return account.id;
}

/**
 * Get account ID by code (e.g., "1100" for AR).
 *
 * @param code - The account number/code to look up
 * @returns The account ID
 * @throws TRPCError with code NOT_FOUND if account doesn't exist
 */
export async function getAccountIdByCode(code: string): Promise<number> {
  if (!db) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Database not available",
    });
  }

  const account = await db.query.accounts.findFirst({
    where: and(
      eq(accounts.accountNumber, code),
      isNull(accounts.deletedAt)
    ),
  });

  if (!account) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: `Account with code "${code}" not found`,
    });
  }

  return account.id;
}

/**
 * Get multiple account IDs by names.
 * Returns a map of name -> id.
 * Missing accounts are silently skipped (not included in result).
 *
 * @param names - Array of account names to look up
 * @returns Map of account name to account ID
 */
export async function getAccountIdsByNames(
  names: string[]
): Promise<Map<string, number>> {
  if (!db) {
    return new Map();
  }

  const allAccounts = await db.query.accounts.findMany({
    where: isNull(accounts.deletedAt),
  });

  const result = new Map<string, number>();
  for (const name of names) {
    const account = allAccounts.find((a) => a.accountName === name);
    if (account) {
      result.set(name, account.id);
    }
  }

  return result;
}

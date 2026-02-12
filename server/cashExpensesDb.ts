import { eq, and, desc, asc, sql, or, like } from "drizzle-orm";
import { getDb } from "./db";
import {
  bankAccounts,
  bankTransactions,
  expenses,
  expenseCategories,
  InsertBankAccount,
  InsertBankTransaction,
  InsertExpense,
  InsertExpenseCategory,
} from "../drizzle/schema";

// ============================================================================
// BANK ACCOUNTS
// ============================================================================

/**
 * Get all bank accounts with optional filtering
 */
export async function getBankAccounts(filters?: {
  accountType?: "CHECKING" | "SAVINGS" | "MONEY_MARKET" | "CREDIT_CARD";
  isActive?: boolean;
}) {
  const db = await getDb();
  if (!db) return [];

  let query = db.select().from(bankAccounts);

  const conditions = [];
  if (filters?.accountType) {
    conditions.push(eq(bankAccounts.accountType, filters.accountType));
  }
  if (filters?.isActive !== undefined) {
    conditions.push(eq(bankAccounts.isActive, filters.isActive));
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as typeof query;
  }

  return query.orderBy(asc(bankAccounts.accountName));
}

/**
 * Get bank account by ID
 */
export async function getBankAccountById(id: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(bankAccounts).where(eq(bankAccounts.id, id)).limit(1);
  return result[0] || null;
}

/**
 * Create bank account
 */
export async function createBankAccount(data: InsertBankAccount) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(bankAccounts).values(data);
  return Number(result[0].insertId);
}

/**
 * Update bank account
 */
export async function updateBankAccount(id: number, data: Partial<InsertBankAccount>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(bankAccounts).set(data).where(eq(bankAccounts.id, id));
}

/**
 * Update bank account balance
 */
export async function updateBankAccountBalance(id: number, newBalance: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(bankAccounts)
    .set({
      currentBalance: newBalance.toFixed(2),
    })
    .where(eq(bankAccounts.id, id));
}

/**
 * Get total cash balance across all active accounts
 */
export async function getTotalCashBalance() {
  const db = await getDb();
  if (!db) return 0;

  const result = await db
    .select({
      total: sql<number>`COALESCE(SUM(${bankAccounts.currentBalance}), 0)`,
    })
    .from(bankAccounts)
    .where(eq(bankAccounts.isActive, true));

  return Number(result[0]?.total || 0);
}

// ============================================================================
// BANK TRANSACTIONS
// ============================================================================

/**
 * Get bank transactions with filtering
 */
export async function getBankTransactions(filters?: {
  bankAccountId?: number;
  transactionType?: "DEPOSIT" | "WITHDRAWAL" | "TRANSFER" | "FEE" | "INTEREST";
  startDate?: Date;
  endDate?: Date;
  isReconciled?: boolean;
  limit?: number;
  offset?: number;
  searchTerm?: string;
}) {
  const db = await getDb();
  if (!db) return { transactions: [], total: 0 };

  const conditions = [];

  if (filters?.bankAccountId) {
    conditions.push(eq(bankTransactions.bankAccountId, filters.bankAccountId));
  }
  if (filters?.transactionType) {
    conditions.push(eq(bankTransactions.transactionType, filters.transactionType));
  }
  if (filters?.startDate) {
    const startDateStr = filters.startDate.toISOString().split("T")[0];
    conditions.push(sql`${bankTransactions.transactionDate} >= ${startDateStr}`);
  }
  if (filters?.endDate) {
    const endDateStr = filters.endDate.toISOString().split("T")[0];
    conditions.push(sql`${bankTransactions.transactionDate} <= ${endDateStr}`);
  }
  if (filters?.isReconciled !== undefined) {
    conditions.push(eq(bankTransactions.isReconciled, filters.isReconciled));
  }
  if (filters?.searchTerm) {
    conditions.push(
      or(
        like(bankTransactions.description, `%${filters.searchTerm}%`),
        like(bankTransactions.referenceNumber, `%${filters.searchTerm}%`)
      ) ?? undefined
    );
  }

  let query = db.select().from(bankTransactions);

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as typeof query;
  }

  // Get total count
  const countQuery = db
    .select({ count: sql<number>`COUNT(*)` })
    .from(bankTransactions)
    .where(conditions.length > 0 ? and(...conditions) : undefined);

  const countResult = await countQuery;
  const total = Number(countResult[0]?.count || 0);

  // Apply pagination and sorting
  query = query.orderBy(desc(bankTransactions.transactionDate), desc(bankTransactions.id)) as typeof query;

  if (filters?.limit) {
    query = query.limit(filters.limit) as typeof query;
  }
  if (filters?.offset) {
    query = query.offset(filters.offset) as typeof query;
  }

  const transactions = await query;

  return { transactions, total };
}

/**
 * Get bank transaction by ID
 */
export async function getBankTransactionById(id: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(bankTransactions)
    .where(eq(bankTransactions.id, id))
    .limit(1);
  return result[0] || null;
}

/**
 * Create bank transaction
 */
export async function createBankTransaction(data: InsertBankTransaction) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(bankTransactions).values(data);
  return Number(result[0].insertId);
}

/**
 * Reconcile bank transaction
 */
export async function reconcileBankTransaction(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(bankTransactions)
    .set({
      isReconciled: true,
      reconciledAt: new Date(),
    })
    .where(eq(bankTransactions.id, id));
}

/**
 * Get unreconciled transactions for a bank account
 */
export async function getUnreconciledTransactions(bankAccountId: number) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(bankTransactions)
    .where(
      and(
        eq(bankTransactions.bankAccountId, bankAccountId),
        eq(bankTransactions.isReconciled, false)
      )
    )
    .orderBy(asc(bankTransactions.transactionDate));
}

/**
 * Get bank account balance at a specific date
 */
export async function getBankAccountBalanceAtDate(bankAccountId: number, asOfDate: Date) {
  const db = await getDb();
  if (!db) return 0;

  const asOfDateStr = asOfDate.toISOString().split("T")[0];

  const result = await db
    .select({
      deposits: sql<number>`COALESCE(SUM(CASE WHEN ${bankTransactions.transactionType} IN ('DEPOSIT', 'INTEREST') THEN ${bankTransactions.amount} ELSE 0 END), 0)`,
      withdrawals: sql<number>`COALESCE(SUM(CASE WHEN ${bankTransactions.transactionType} IN ('WITHDRAWAL', 'FEE') THEN ${bankTransactions.amount} ELSE 0 END), 0)`,
    })
    .from(bankTransactions)
    .where(
      and(
        eq(bankTransactions.bankAccountId, bankAccountId),
        sql`${bankTransactions.transactionDate} <= ${asOfDateStr}`
      )
    );

  const deposits = Number(result[0]?.deposits || 0);
  const withdrawals = Number(result[0]?.withdrawals || 0);

  // Calculate balance from transactions only (assumes account started at 0)
  // If you need to support opening balances, add an 'openingBalance' field to bankAccounts schema
  return deposits - withdrawals;
}

// ============================================================================
// EXPENSE CATEGORIES
// ============================================================================

/**
 * Get all expense categories
 */
export async function getExpenseCategories(filters?: { isActive?: boolean }) {
  const db = await getDb();
  if (!db) return [];

  let query = db.select().from(expenseCategories);

  if (filters?.isActive !== undefined) {
    query = query.where(eq(expenseCategories.isActive, filters.isActive)) as typeof query;
  }

  return query.orderBy(asc(expenseCategories.categoryName));
}

/**
 * Get expense category by ID
 */
export async function getExpenseCategoryById(id: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(expenseCategories)
    .where(eq(expenseCategories.id, id))
    .limit(1);
  return result[0] || null;
}

/**
 * Create expense category
 */
export async function createExpenseCategory(data: InsertExpenseCategory) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(expenseCategories).values(data);
  return Number(result[0].insertId);
}

/**
 * Update expense category
 */
export async function updateExpenseCategory(id: number, data: Partial<InsertExpenseCategory>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(expenseCategories).set(data).where(eq(expenseCategories.id, id));
}

// ============================================================================
// EXPENSES
// ============================================================================

/**
 * Get all expenses with optional filtering
 */
export async function getExpenses(filters?: {
  categoryId?: number;
  vendorId?: number;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
  searchTerm?: string;
}) {
  const db = await getDb();
  if (!db) return { expenses: [], total: 0 };

  const conditions = [];

  if (filters?.categoryId) {
    conditions.push(eq(expenses.categoryId, filters.categoryId));
  }
  if (filters?.vendorId) {
    conditions.push(eq(expenses.vendorId, filters.vendorId));
  }
  if (filters?.startDate) {
    const startDateStr = filters.startDate.toISOString().split("T")[0];
    conditions.push(sql`${expenses.expenseDate} >= ${startDateStr}`);
  }
  if (filters?.endDate) {
    const endDateStr = filters.endDate.toISOString().split("T")[0];
    conditions.push(sql`${expenses.expenseDate} <= ${endDateStr}`);
  }
  if (filters?.searchTerm) {
    conditions.push(
      or(
        like(expenses.expenseNumber, `%${filters.searchTerm}%`),
        like(expenses.description, `%${filters.searchTerm}%`)
      ) ?? undefined
    );
  }

  let query = db.select().from(expenses);

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as typeof query;
  }

  // Get total count
  const countQuery = db
    .select({ count: sql<number>`COUNT(*)` })
    .from(expenses)
    .where(conditions.length > 0 ? and(...conditions) : undefined);

  const countResult = await countQuery;
  const total = Number(countResult[0]?.count || 0);

  // Apply pagination and sorting
  query = query.orderBy(desc(expenses.expenseDate), desc(expenses.id)) as typeof query;

  if (filters?.limit) {
    query = query.limit(filters.limit) as typeof query;
  }
  if (filters?.offset) {
    query = query.offset(filters.offset) as typeof query;
  }

  const expenseList = await query;

  return { expenses: expenseList, total };
}

/**
 * Get expense by ID
 */
export async function getExpenseById(id: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(expenses).where(eq(expenses.id, id)).limit(1);
  return result[0] || null;
}

/**
 * Create expense
 */
export async function createExpense(data: InsertExpense) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(expenses).values(data);
  return Number(result[0].insertId);
}

/**
 * Update expense
 */
export async function updateExpense(id: number, data: Partial<InsertExpense>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.update(expenses).set(data).where(eq(expenses.id, id));
  return result;
}

/**
 * Mark expense as reimbursed
 */
export async function markExpenseReimbursed(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(expenses)
    .set({
      isReimbursed: true,
      reimbursedAt: new Date(),
    })
    .where(eq(expenses.id, id));
}

/**
 * Get reimbursable expenses that haven't been reimbursed
 */
export async function getPendingReimbursements() {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(expenses)
    .where(
      and(
        eq(expenses.isReimbursable, true),
        eq(expenses.isReimbursed, false)
      )
    )
    .orderBy(asc(expenses.expenseDate));
}

/**
 * Get expense breakdown by category
 */
export async function getExpenseBreakdownByCategory(startDate?: Date, endDate?: Date) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [];

  if (startDate) {
    const startDateStr = startDate.toISOString().split("T")[0];
    conditions.push(sql`${expenses.expenseDate} >= ${startDateStr}`);
  }
  if (endDate) {
    const endDateStr = endDate.toISOString().split("T")[0];
    conditions.push(sql`${expenses.expenseDate} <= ${endDateStr}`);
  }

  const result = await db
    .select({
      categoryId: expenses.categoryId,
      categoryName: expenseCategories.categoryName,
      totalAmount: sql<number>`COALESCE(SUM(${expenses.amount}), 0)`,
      expenseCount: sql<number>`COUNT(${expenses.id})`,
    })
    .from(expenses)
    .innerJoin(expenseCategories, eq(expenses.categoryId, expenseCategories.id))
    .where(and(...conditions))
    .groupBy(expenses.categoryId, expenseCategories.categoryName)
    .orderBy(desc(sql`SUM(${expenses.amount})`));

  return result.map((row) => ({
    ...row,
    totalAmount: Number(row.totalAmount),
    expenseCount: Number(row.expenseCount),
  }));
}

/**
 * Get total expenses for a period
 */
export async function getTotalExpenses(startDate?: Date, endDate?: Date) {
  const db = await getDb();
  if (!db) return 0;

  const conditions = [];

  if (startDate) {
    const startDateStr = startDate.toISOString().split("T")[0];
    conditions.push(sql`${expenses.expenseDate} >= ${startDateStr}`);
  }
  if (endDate) {
    const endDateStr = endDate.toISOString().split("T")[0];
    conditions.push(sql`${expenses.expenseDate} <= ${endDateStr}`);
  }

  const result = await db
    .select({
      total: sql<number>`COALESCE(SUM(${expenses.amount}), 0)`,
    })
    .from(expenses)
    .where(and(...conditions));

  return Number(result[0]?.total || 0);
}

/**
 * Generate unique expense number
 */
export async function generateExpenseNumber(): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select({ maxId: sql<number>`COALESCE(MAX(id), 0)` })
    .from(expenses);

  const nextId = (Number(result[0]?.maxId) || 0) + 1;
  const year = new Date().getFullYear();
  return `EXP-${year}-${String(nextId).padStart(6, "0")}`;
}


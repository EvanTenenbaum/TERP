import { eq, and, gte, lte, desc, asc, sql, or, like } from "drizzle-orm";
import { getDb } from "./db";
import {
  accounts,
  ledgerEntries,
  fiscalPeriods,
  InsertAccount,
  Account,
  InsertLedgerEntry,
  LedgerEntry,
  InsertFiscalPeriod,
  FiscalPeriod,
} from "../drizzle/schema";
import { isFiscalPeriodLocked } from "./_core/fiscalPeriod";

// ============================================================================
// CHART OF ACCOUNTS
// ============================================================================

/**
 * Get all accounts with optional filtering
 */
export async function getAccounts(filters?: {
  accountType?: "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE";
  isActive?: boolean;
  parentAccountId?: number | null;
}) {
  const db = await getDb();
  if (!db) return [];

  let query = db.select().from(accounts);

  const conditions = [];
  if (filters?.accountType) {
    conditions.push(eq(accounts.accountType, filters.accountType));
  }
  if (filters?.isActive !== undefined) {
    conditions.push(eq(accounts.isActive, filters.isActive));
  }
  if (filters?.parentAccountId !== undefined) {
    if (filters.parentAccountId === null) {
      conditions.push(sql`${accounts.parentAccountId} IS NULL`);
    } else {
      conditions.push(eq(accounts.parentAccountId, filters.parentAccountId));
    }
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }

  return query.orderBy(asc(accounts.accountNumber));
}

/**
 * Get account by ID
 */
export async function getAccountById(id: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(accounts).where(eq(accounts.id, id)).limit(1);
  return result[0] || null;
}

/**
 * Get account by account number
 */
export async function getAccountByNumber(accountNumber: string) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(accounts)
    .where(eq(accounts.accountNumber, accountNumber))
    .limit(1);
  return result[0] || null;
}

/**
 * Create new account
 */
export async function createAccount(data: InsertAccount) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(accounts).values(data);
  return result;
}

/**
 * Update account
 */
export async function updateAccount(id: number, data: Partial<InsertAccount>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(accounts).set(data).where(eq(accounts.id, id));
}

/**
 * Get account balance at a specific date
 */
export async function getAccountBalance(accountId: number, asOfDate: Date) {
  const db = await getDb();
  if (!db) return { debit: 0, credit: 0, balance: 0 };

  const asOfDateStr = asOfDate.toISOString().split("T")[0];

  const result = await db
    .select({
      totalDebit: sql<number>`COALESCE(SUM(${ledgerEntries.debit}), 0)`,
      totalCredit: sql<number>`COALESCE(SUM(${ledgerEntries.credit}), 0)`,
    })
    .from(ledgerEntries)
    .where(
      and(
        eq(ledgerEntries.accountId, accountId),
        sql`${ledgerEntries.entryDate} <= ${asOfDateStr}`,
        eq(ledgerEntries.isPosted, true)
      )
    );

  const debit = Number(result[0]?.totalDebit || 0);
  const credit = Number(result[0]?.totalCredit || 0);

  // Get account to determine normal balance
  const account = await getAccountById(accountId);
  const normalBalance = account?.normalBalance || "DEBIT";

  // Calculate balance based on normal balance
  const balance = normalBalance === "DEBIT" ? debit - credit : credit - debit;

  return { debit, credit, balance };
}

/**
 * Get hierarchical chart of accounts
 */
export async function getChartOfAccounts() {
  const db = await getDb();
  if (!db) return [];

  const allAccounts = await db
    .select()
    .from(accounts)
    .where(eq(accounts.isActive, true))
    .orderBy(asc(accounts.accountNumber));

  // Build hierarchy
  const accountMap = new Map<number, Account & { children: Account[] }>();
  const rootAccounts: (Account & { children: Account[] })[] = [];

  // First pass: create map
  allAccounts.forEach((account) => {
    accountMap.set(account.id, { ...account, children: [] });
  });

  // Second pass: build hierarchy
  allAccounts.forEach((account) => {
    const accountWithChildren = accountMap.get(account.id)!;
    if (account.parentAccountId === null) {
      rootAccounts.push(accountWithChildren);
    } else {
      const parent = accountMap.get(account.parentAccountId);
      if (parent) {
        parent.children.push(accountWithChildren);
      }
    }
  });

  return rootAccounts;
}

// ============================================================================
// GENERAL LEDGER
// ============================================================================

/**
 * Get ledger entries with filtering
 */
export async function getLedgerEntries(filters?: {
  accountId?: number;
  startDate?: Date;
  endDate?: Date;
  fiscalPeriodId?: number;
  isPosted?: boolean;
  referenceType?: string;
  referenceId?: number;
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) return { entries: [], total: 0 };

  const conditions = [];

  if (filters?.accountId) {
    conditions.push(eq(ledgerEntries.accountId, filters.accountId));
  }
  if (filters?.startDate) {
    const startDateStr = filters.startDate.toISOString().split("T")[0];
    conditions.push(sql`${ledgerEntries.entryDate} >= ${startDateStr}`);
  }
  if (filters?.endDate) {
    const endDateStr = filters.endDate.toISOString().split("T")[0];
    conditions.push(sql`${ledgerEntries.entryDate} <= ${endDateStr}`);
  }
  if (filters?.fiscalPeriodId) {
    conditions.push(eq(ledgerEntries.fiscalPeriodId, filters.fiscalPeriodId));
  }
  if (filters?.isPosted !== undefined) {
    conditions.push(eq(ledgerEntries.isPosted, filters.isPosted));
  }
  if (filters?.referenceType) {
    conditions.push(eq(ledgerEntries.referenceType, filters.referenceType));
  }
  if (filters?.referenceId) {
    conditions.push(eq(ledgerEntries.referenceId, filters.referenceId));
  }

  let query = db.select().from(ledgerEntries);

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }

  // Get total count
  const countQuery = db
    .select({ count: sql<number>`COUNT(*)` })
    .from(ledgerEntries)
    .where(conditions.length > 0 ? and(...conditions) : undefined);

  const countResult = await countQuery;
  const total = Number(countResult[0]?.count || 0);

  // Apply pagination
  query = query.orderBy(desc(ledgerEntries.entryDate), desc(ledgerEntries.id)) as any;

  if (filters?.limit) {
    query = query.limit(filters.limit) as any;
  }
  if (filters?.offset) {
    query = query.offset(filters.offset) as any;
  }

  const entries = await query;

  return { entries, total };
}

/**
 * Get ledger entry by ID
 */
export async function getLedgerEntryById(id: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(ledgerEntries).where(eq(ledgerEntries.id, id)).limit(1);
  return result[0] || null;
}

/**
 * Create ledger entry
 * ACC-005: Validates fiscal period is OPEN before posting
 */
export async function createLedgerEntry(data: InsertLedgerEntry) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // ACC-005: Validate fiscal period is open for posting
  if (data.fiscalPeriodId) {
    const isLocked = await isFiscalPeriodLocked(data.fiscalPeriodId);
    if (isLocked) {
      throw new Error(
        `Cannot post to fiscal period ${data.fiscalPeriodId}. The period is locked or closed.`
      );
    }
  }

  const result = await db.insert(ledgerEntries).values(data);
  return result;
}

/**
 * Post journal entry (double-entry transaction)
 * Creates two ledger entries: one debit and one credit
 * ACC-005: Validates fiscal period is OPEN before posting
 */
export async function postJournalEntry(params: {
  entryDate: Date;
  debitAccountId: number;
  creditAccountId: number;
  amount: number;
  description: string;
  fiscalPeriodId: number;
  referenceType?: string;
  referenceId?: number;
  createdBy: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // ACC-005: Validate fiscal period is open for posting
  const isLocked = await isFiscalPeriodLocked(params.fiscalPeriodId);
  if (isLocked) {
    throw new Error(
      `Cannot post to fiscal period ${params.fiscalPeriodId}. The period is locked or closed.`
    );
  }

  // Use transaction to ensure debit and credit are created atomically
  return await db.transaction(async (tx) => {
    // Generate entry number
    const entryNumber = await generateEntryNumber();

    const entryDateStr = params.entryDate.toISOString().split("T")[0];
    const postedAtTimestamp = new Date();

    // Create debit entry
    await tx.insert(ledgerEntries).values({
      entryNumber,
      entryDate: entryDateStr as any,
      accountId: params.debitAccountId,
      debit: params.amount.toFixed(2),
      credit: "0.00",
      description: params.description,
      fiscalPeriodId: params.fiscalPeriodId,
      referenceType: params.referenceType,
      referenceId: params.referenceId,
      isManual: true,
      isPosted: true,
      postedAt: postedAtTimestamp,
      postedBy: params.createdBy,
      createdBy: params.createdBy,
    });

    // Create credit entry
    await tx.insert(ledgerEntries).values({
      entryNumber,
      entryDate: entryDateStr as any,
      accountId: params.creditAccountId,
      debit: "0.00",
      credit: params.amount.toFixed(2),
      description: params.description,
      fiscalPeriodId: params.fiscalPeriodId,
      referenceType: params.referenceType,
      referenceId: params.referenceId,
      isManual: true,
      isPosted: true,
      postedAt: postedAtTimestamp,
      postedBy: params.createdBy,
      createdBy: params.createdBy,
    });

    return entryNumber;
  });
}

/**
 * Generate unique entry number
 */
async function generateEntryNumber(): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select({ maxId: sql<number>`COALESCE(MAX(id), 0)` })
    .from(ledgerEntries);

  const nextId = (Number(result[0]?.maxId) || 0) + 1;
  const year = new Date().getFullYear();
  return `JE-${year}-${String(nextId).padStart(6, "0")}`;
}

/**
 * Validate journal entry balance (debits = credits)
 */
export async function validateJournalBalance(entryNumber: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  const result = await db
    .select({
      totalDebit: sql<number>`COALESCE(SUM(${ledgerEntries.debit}), 0)`,
      totalCredit: sql<number>`COALESCE(SUM(${ledgerEntries.credit}), 0)`,
    })
    .from(ledgerEntries)
    .where(eq(ledgerEntries.entryNumber, entryNumber));

  const debit = Number(result[0]?.totalDebit || 0);
  const credit = Number(result[0]?.totalCredit || 0);

  return Math.abs(debit - credit) < 0.01; // Allow for rounding errors
}

/**
 * Get trial balance for a fiscal period
 */
export async function getTrialBalance(fiscalPeriodId: number) {
  const db = await getDb();
  if (!db) return [];

  const result = await db
    .select({
      accountId: ledgerEntries.accountId,
      accountNumber: accounts.accountNumber,
      accountName: accounts.accountName,
      accountType: accounts.accountType,
      totalDebit: sql<number>`COALESCE(SUM(${ledgerEntries.debit}), 0)`,
      totalCredit: sql<number>`COALESCE(SUM(${ledgerEntries.credit}), 0)`,
    })
    .from(ledgerEntries)
    .innerJoin(accounts, eq(ledgerEntries.accountId, accounts.id))
    .where(
      and(eq(ledgerEntries.fiscalPeriodId, fiscalPeriodId), eq(ledgerEntries.isPosted, true))
    )
    .groupBy(
      ledgerEntries.accountId,
      accounts.accountNumber,
      accounts.accountName,
      accounts.accountType
    )
    .orderBy(asc(accounts.accountNumber));

  return result.map((row) => ({
    ...row,
    totalDebit: Number(row.totalDebit),
    totalCredit: Number(row.totalCredit),
    balance: Number(row.totalDebit) - Number(row.totalCredit),
  }));
}

// ============================================================================
// FISCAL PERIODS
// ============================================================================

/**
 * Get all fiscal periods
 */
export async function getFiscalPeriods(filters?: {
  fiscalYear?: number;
  status?: "OPEN" | "CLOSED" | "LOCKED";
}) {
  const db = await getDb();
  if (!db) return [];

  let query = db.select().from(fiscalPeriods);

  const conditions = [];
  if (filters?.fiscalYear) {
    conditions.push(eq(fiscalPeriods.fiscalYear, filters.fiscalYear));
  }
  if (filters?.status) {
    conditions.push(eq(fiscalPeriods.status, filters.status));
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }

  return query.orderBy(desc(fiscalPeriods.startDate));
}

/**
 * Get fiscal period by ID
 */
export async function getFiscalPeriodById(id: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(fiscalPeriods)
    .where(eq(fiscalPeriods.id, id))
    .limit(1);
  return result[0] || null;
}

/**
 * Get current open fiscal period
 */
export async function getCurrentFiscalPeriod() {
  const db = await getDb();
  if (!db) return null;

  const today = new Date().toISOString().split("T")[0];

  const result = await db
    .select()
    .from(fiscalPeriods)
    .where(
      and(
        eq(fiscalPeriods.status, "OPEN"),
        sql`${fiscalPeriods.startDate} <= ${today}`,
        sql`${fiscalPeriods.endDate} >= ${today}`
      )
    )
    .limit(1);

  return result[0] || null;
}

/**
 * Create fiscal period
 */
export async function createFiscalPeriod(data: InsertFiscalPeriod) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(fiscalPeriods).values(data);
  return result;
}

/**
 * Close fiscal period
 */
export async function closeFiscalPeriod(id: number, closedBy: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(fiscalPeriods)
    .set({
      status: "CLOSED",
      closedAt: new Date(),
      closedBy,
    })
    .where(eq(fiscalPeriods.id, id));
}

/**
 * Lock fiscal period (prevents any modifications)
 */
export async function lockFiscalPeriod(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(fiscalPeriods)
    .set({
      status: "LOCKED",
    })
    .where(eq(fiscalPeriods.id, id));
}

/**
 * Reopen fiscal period
 */
export async function reopenFiscalPeriod(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(fiscalPeriods)
    .set({
      status: "OPEN",
      closedAt: null,
      closedBy: null,
    })
    .where(eq(fiscalPeriods.id, id));
}


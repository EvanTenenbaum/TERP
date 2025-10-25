/**
 * Clients Data Access Layer
 * Handles all database operations for the Client Management System
 */

import { eq, and, desc, like, or, sql, inArray } from "drizzle-orm";
import { getDb } from "./db";
import {
  clients,
  clientTransactions,
  clientActivity,
  clientNotes,
  InsertClient,
  InsertClientTransaction,
  InsertClientActivity,
  InsertClientNote,
  users,
} from "../drizzle/schema";

// ============================================================================
// CLIENTS CRUD
// ============================================================================

/**
 * Get all clients (with pagination and filters)
 */
export async function getClients(options: {
  limit?: number;
  offset?: number;
  search?: string;
  clientTypes?: ("buyer" | "seller" | "brand" | "referee" | "contractor")[];
  tags?: string[];
  hasDebt?: boolean;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const {
    limit = 50,
    offset = 0,
    search,
    clientTypes,
    tags,
    hasDebt,
  } = options;

  let query = db.select().from(clients);

  // Build WHERE conditions
  const conditions: any[] = [];

  // Search by TERI code
  if (search) {
    conditions.push(like(clients.teriCode, `%${search}%`));
  }

  // Filter by client types
  if (clientTypes && clientTypes.length > 0) {
    const typeConditions: any[] = [];
    if (clientTypes.includes("buyer")) typeConditions.push(eq(clients.isBuyer, true));
    if (clientTypes.includes("seller")) typeConditions.push(eq(clients.isSeller, true));
    if (clientTypes.includes("brand")) typeConditions.push(eq(clients.isBrand, true));
    if (clientTypes.includes("referee")) typeConditions.push(eq(clients.isReferee, true));
    if (clientTypes.includes("contractor")) typeConditions.push(eq(clients.isContractor, true));
    if (typeConditions.length > 0) {
      conditions.push(or(...typeConditions));
    }
  }

  // Filter by debt
  if (hasDebt !== undefined) {
    if (hasDebt) {
      conditions.push(sql`${clients.totalOwed} > 0`);
    } else {
      conditions.push(sql`${clients.totalOwed} = 0`);
    }
  }

  // Filter by tags (JSON search)
  if (tags && tags.length > 0) {
    for (const tag of tags) {
      conditions.push(sql`JSON_CONTAINS(${clients.tags}, ${JSON.stringify([tag])})`);
    }
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }

  const results = await query
    .orderBy(desc(clients.createdAt))
    .limit(limit)
    .offset(offset);

  return results;
}

/**
 * Get total client count (for pagination)
 */
export async function getClientCount(options: {
  search?: string;
  clientTypes?: ("buyer" | "seller" | "brand" | "referee" | "contractor")[];
  tags?: string[];
  hasDebt?: boolean;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { search, clientTypes, tags, hasDebt } = options;

  let query = db.select({ count: sql<number>`count(*)` }).from(clients);

  // Build WHERE conditions (same as getClients)
  const conditions: any[] = [];

  if (search) {
    conditions.push(like(clients.teriCode, `%${search}%`));
  }

  if (clientTypes && clientTypes.length > 0) {
    const typeConditions: any[] = [];
    if (clientTypes.includes("buyer")) typeConditions.push(eq(clients.isBuyer, true));
    if (clientTypes.includes("seller")) typeConditions.push(eq(clients.isSeller, true));
    if (clientTypes.includes("brand")) typeConditions.push(eq(clients.isBrand, true));
    if (clientTypes.includes("referee")) typeConditions.push(eq(clients.isReferee, true));
    if (clientTypes.includes("contractor")) typeConditions.push(eq(clients.isContractor, true));
    if (typeConditions.length > 0) {
      conditions.push(or(...typeConditions));
    }
  }

  if (hasDebt !== undefined) {
    if (hasDebt) {
      conditions.push(sql`${clients.totalOwed} > 0`);
    } else {
      conditions.push(sql`${clients.totalOwed} = 0`);
    }
  }

  if (tags && tags.length > 0) {
    for (const tag of tags) {
      conditions.push(sql`JSON_CONTAINS(${clients.tags}, ${JSON.stringify([tag])})`);
    }
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }

  const result = await query;
  return result[0]?.count || 0;
}

/**
 * Get single client by ID
 */
export async function getClientById(clientId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select()
    .from(clients)
    .where(eq(clients.id, clientId))
    .limit(1);

  return result[0] || null;
}

/**
 * Get client by TERI code
 */
export async function getClientByTeriCode(teriCode: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select()
    .from(clients)
    .where(eq(clients.teriCode, teriCode))
    .limit(1);

  return result[0] || null;
}

/**
 * Create new client
 */
export async function createClient(userId: number, data: {
  teriCode: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  isBuyer?: boolean;
  isSeller?: boolean;
  isBrand?: boolean;
  isReferee?: boolean;
  isContractor?: boolean;
  tags?: string[];
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Check if TERI code already exists
  const existing = await getClientByTeriCode(data.teriCode);
  if (existing) {
    throw new Error("TERI code already exists");
  }

  const clientData: InsertClient = {
    teriCode: data.teriCode,
    name: data.name,
    email: data.email || null,
    phone: data.phone || null,
    address: data.address || null,
    isBuyer: data.isBuyer || false,
    isSeller: data.isSeller || false,
    isBrand: data.isBrand || false,
    isReferee: data.isReferee || false,
    isContractor: data.isContractor || false,
    tags: data.tags || null,
  };

  const result = await db.insert(clients).values(clientData);
  const clientId = Number(result[0].insertId);

  // Log activity
  await logActivity(clientId, userId, "CREATED", null);

  return clientId;
}

/**
 * Update client
 */
export async function updateClient(
  clientId: number,
  userId: number,
  data: {
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
    isBuyer?: boolean;
    isSeller?: boolean;
    isBrand?: boolean;
    isReferee?: boolean;
    isContractor?: boolean;
    tags?: string[];
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const updateData: any = {};

  if (data.name !== undefined) updateData.name = data.name;
  if (data.email !== undefined) updateData.email = data.email;
  if (data.phone !== undefined) updateData.phone = data.phone;
  if (data.address !== undefined) updateData.address = data.address;
  if (data.isBuyer !== undefined) updateData.isBuyer = data.isBuyer;
  if (data.isSeller !== undefined) updateData.isSeller = data.isSeller;
  if (data.isBrand !== undefined) updateData.isBrand = data.isBrand;
  if (data.isReferee !== undefined) updateData.isReferee = data.isReferee;
  if (data.isContractor !== undefined) updateData.isContractor = data.isContractor;
  if (data.tags !== undefined) updateData.tags = data.tags;

  await db
    .update(clients)
    .set(updateData)
    .where(eq(clients.id, clientId));

  // Log activity
  await logActivity(clientId, userId, "UPDATED", { fields: Object.keys(updateData) });

  return true;
}

/**
 * Delete client (soft delete by marking as inactive)
 */
export async function deleteClient(clientId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(clients).where(eq(clients.id, clientId));

  return true;
}

/**
 * Update client stats (total spent, profit, debt)
 */
export async function updateClientStats(clientId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Calculate stats from transactions
  const transactions = await db
    .select()
    .from(clientTransactions)
    .where(eq(clientTransactions.clientId, clientId));

  let totalSpent = 0;
  let totalProfit = 0;
  let totalOwed = 0;
  let oldestDebtDays = 0;

  for (const txn of transactions) {
    const amount = Number(txn.amount);

    if (txn.transactionType === "INVOICE" || txn.transactionType === "ORDER") {
      totalSpent += amount;

      if (txn.paymentStatus !== "PAID") {
        totalOwed += amount;

        // Calculate days since transaction date
        const daysSince = Math.floor(
          (new Date().getTime() - new Date(txn.transactionDate).getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysSince > oldestDebtDays) {
          oldestDebtDays = daysSince;
        }
      }
    }
  }

  const avgProfitMargin = totalSpent > 0 ? (totalProfit / totalSpent) * 100 : 0;

  await db
    .update(clients)
    .set({
      totalSpent: totalSpent.toFixed(2),
      totalProfit: totalProfit.toFixed(2),
      avgProfitMargin: avgProfitMargin.toFixed(2),
      totalOwed: totalOwed.toFixed(2),
      oldestDebtDays,
    })
    .where(eq(clients.id, clientId));

  return true;
}

// ============================================================================
// CLIENT TRANSACTIONS
// ============================================================================

/**
 * Get all transactions for a client
 */
export async function getClientTransactions(
  clientId: number,
  options: {
    limit?: number;
    offset?: number;
    search?: string;
    transactionType?: string;
    paymentStatus?: string;
    startDate?: Date;
    endDate?: Date;
  } = {}
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const {
    limit = 50,
    offset = 0,
    search,
    transactionType,
    paymentStatus,
    startDate,
    endDate,
  } = options;

  const conditions: any[] = [eq(clientTransactions.clientId, clientId)];

  if (search) {
    conditions.push(like(clientTransactions.transactionNumber, `%${search}%`));
  }

  if (transactionType) {
    conditions.push(eq(clientTransactions.transactionType, transactionType as any));
  }

  if (paymentStatus) {
    conditions.push(eq(clientTransactions.paymentStatus, paymentStatus as any));
  }

  if (startDate) {
    conditions.push(sql`${clientTransactions.transactionDate} >= ${startDate.toISOString().split('T')[0]}`);
  }

  if (endDate) {
    conditions.push(sql`${clientTransactions.transactionDate} <= ${endDate.toISOString().split('T')[0]}`);
  }

  const query = db
    .select()
    .from(clientTransactions)
    .where(and(...conditions))

  const results = await query
    .orderBy(desc(clientTransactions.transactionDate))
    .limit(limit)
    .offset(offset);

  return results;
}

/**
 * Get single transaction by ID
 */
export async function getTransactionById(transactionId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select()
    .from(clientTransactions)
    .where(eq(clientTransactions.id, transactionId))
    .limit(1);

  return result[0] || null;
}

/**
 * Create new transaction
 */
export async function createTransaction(
  userId: number,
  data: {
    clientId: number;
    transactionType: "INVOICE" | "PAYMENT" | "QUOTE" | "ORDER" | "REFUND" | "CREDIT";
    transactionNumber?: string;
    transactionDate: Date;
    amount: number;
    paymentStatus?: "PAID" | "PENDING" | "OVERDUE" | "PARTIAL";
    paymentDate?: Date;
    paymentAmount?: number;
    notes?: string;
    metadata?: any;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const txnData: InsertClientTransaction = {
    clientId: data.clientId,
    transactionType: data.transactionType,
    transactionNumber: data.transactionNumber || null,
    transactionDate: data.transactionDate.toISOString().split('T')[0] as any,
    amount: data.amount.toFixed(2),
    paymentStatus: data.paymentStatus || "PENDING",
    paymentDate: data.paymentDate ? data.paymentDate.toISOString().split('T')[0] as any : null,
    paymentAmount: data.paymentAmount ? data.paymentAmount.toFixed(2) : null,
    notes: data.notes || null,
    metadata: data.metadata || null,
  };

  const result = await db.insert(clientTransactions).values(txnData);
  const transactionId = Number(result[0].insertId);

  // Update client stats
  await updateClientStats(data.clientId);

  // Log activity
  await logActivity(data.clientId, userId, "TRANSACTION_ADDED", { transactionId });

  return transactionId;
}

/**
 * Update transaction
 */
export async function updateTransaction(
  transactionId: number,
  userId: number,
  data: {
    transactionDate?: Date;
    amount?: number;
    paymentStatus?: "PAID" | "PENDING" | "OVERDUE" | "PARTIAL";
    paymentDate?: Date;
    paymentAmount?: number;
    notes?: string;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const updateData: any = {};

  if (data.transactionDate !== undefined) {
    updateData.transactionDate = data.transactionDate.toISOString().split('T')[0];
  }
  if (data.amount !== undefined) updateData.amount = data.amount.toFixed(2);
  if (data.paymentStatus !== undefined) updateData.paymentStatus = data.paymentStatus;
  if (data.paymentDate !== undefined) {
    updateData.paymentDate = data.paymentDate.toISOString().split('T')[0];
  }
  if (data.paymentAmount !== undefined) {
    updateData.paymentAmount = data.paymentAmount.toFixed(2);
  }
  if (data.notes !== undefined) updateData.notes = data.notes;

  await db
    .update(clientTransactions)
    .set(updateData)
    .where(eq(clientTransactions.id, transactionId));

  // Get client ID to update stats
  const txn = await getTransactionById(transactionId);
  if (txn) {
    await updateClientStats(txn.clientId);
  }

  return true;
}

/**
 * Record payment for a transaction
 */
export async function recordPayment(
  transactionId: number,
  userId: number,
  paymentDate: Date,
  paymentAmount: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const txn = await getTransactionById(transactionId);
  if (!txn) throw new Error("Transaction not found");

  const totalAmount = Number(txn.amount);
  const newPaymentStatus =
    paymentAmount >= totalAmount ? "PAID" : "PARTIAL";

  await db
    .update(clientTransactions)
    .set({
      paymentStatus: newPaymentStatus,
      paymentDate: paymentDate.toISOString().split('T')[0] as any,
      paymentAmount: paymentAmount.toFixed(2),
    })
    .where(eq(clientTransactions.id, transactionId));

  // Update client stats
  await updateClientStats(txn.clientId);

  // Log activity
  await logActivity(txn.clientId, userId, "PAYMENT_RECORDED", {
    transactionId,
    paymentAmount,
  });

  return true;
}

/**
 * Delete transaction
 */
export async function deleteTransaction(transactionId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const txn = await getTransactionById(transactionId);
  if (!txn) throw new Error("Transaction not found");

  await db.delete(clientTransactions).where(eq(clientTransactions.id, transactionId));

  // Update client stats
  await updateClientStats(txn.clientId);

  return true;
}

// ============================================================================
// CLIENT ACTIVITY
// ============================================================================

/**
 * Log activity
 */
export async function logActivity(
  clientId: number,
  userId: number,
  activityType: "CREATED" | "UPDATED" | "TRANSACTION_ADDED" | "PAYMENT_RECORDED" | "NOTE_ADDED" | "TAG_ADDED" | "TAG_REMOVED",
  metadata: any
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const activityData: InsertClientActivity = {
    clientId,
    userId,
    activityType,
    metadata: metadata || null,
  };

  await db.insert(clientActivity).values(activityData);

  return true;
}

/**
 * Get activity log for a client
 */
export async function getClientActivity(clientId: number, limit: number = 50) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const activities = await db
    .select({
      id: clientActivity.id,
      clientId: clientActivity.clientId,
      userId: clientActivity.userId,
      userName: users.name,
      activityType: clientActivity.activityType,
      metadata: clientActivity.metadata,
      createdAt: clientActivity.createdAt,
    })
    .from(clientActivity)
    .leftJoin(users, eq(clientActivity.userId, users.id))
    .where(eq(clientActivity.clientId, clientId))
    .orderBy(desc(clientActivity.createdAt))
    .limit(limit);

  return activities;
}

// ============================================================================
// TAGS
// ============================================================================

/**
 * Get all unique tags across all clients
 */
export async function getAllTags() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const allClients = await db.select({ tags: clients.tags }).from(clients);

  const tagsSet = new Set<string>();
  for (const client of allClients) {
    if (client.tags && Array.isArray(client.tags)) {
      for (const tag of client.tags) {
        tagsSet.add(tag);
      }
    }
  }

  return Array.from(tagsSet).sort();
}

/**
 * Add tag to client
 */
export async function addTag(clientId: number, userId: number, tag: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const client = await getClientById(clientId);
  if (!client) throw new Error("Client not found");

  const currentTags = (client.tags as string[]) || [];
  if (currentTags.includes(tag)) {
    return true; // Tag already exists
  }

  const newTags = [...currentTags, tag];

  await db
    .update(clients)
    .set({ tags: newTags })
    .where(eq(clients.id, clientId));

  // Log activity
  await logActivity(clientId, userId, "TAG_ADDED", { tag });

  return true;
}

/**
 * Remove tag from client
 */
export async function removeTag(clientId: number, userId: number, tag: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const client = await getClientById(clientId);
  if (!client) throw new Error("Client not found");

  const currentTags = (client.tags as string[]) || [];
  const newTags = currentTags.filter((t) => t !== tag);

  await db
    .update(clients)
    .set({ tags: newTags })
    .where(eq(clients.id, clientId));

  // Log activity
  await logActivity(clientId, userId, "TAG_REMOVED", { tag });

  return true;
}

// ============================================================================
// CLIENT NOTES
// ============================================================================

/**
 * Link a freeform note to a client
 */
export async function linkNoteToClient(clientId: number, noteId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const linkData: InsertClientNote = {
    clientId,
    noteId,
  };

  await db.insert(clientNotes).values(linkData);

  return true;
}

/**
 * Get note ID for a client
 */
export async function getClientNoteId(clientId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select()
    .from(clientNotes)
    .where(eq(clientNotes.clientId, clientId))
    .limit(1);

  return result[0]?.noteId || null;
}


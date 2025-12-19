/**
 * Clients Data Access Layer
 * Handles all database operations for the Client Management System
 */

import { eq, and, desc, like, or, sql, SQL, gt } from "drizzle-orm";
import { getDb } from "./db";
import {
  PaginatedResult,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
} from "./_core/pagination";
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
 * Client type from schema
 */
type Client = typeof clients.$inferSelect;

/**
 * Get all clients (with pagination and filters)
 * BUG-034: Returns PaginatedResult with cursor-based pagination
 */
export async function getClients(options: {
  limit?: number;
  cursor?: string | null;
  search?: string;
  clientTypes?: ("buyer" | "seller" | "brand" | "referee" | "contractor")[];
  tags?: string[];
  hasDebt?: boolean;
}): Promise<PaginatedResult<Client>> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const limit = Math.min(options.limit || DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
  const { search, clientTypes, tags, hasDebt, cursor } = options;

  // Build WHERE conditions
  const conditions: (SQL<unknown> | undefined)[] = [];

  // Enhanced multi-field search (TERI code, name, email, phone, address)
  if (search) {
    conditions.push(
      or(
        like(clients.teriCode, `%${search}%`),
        like(clients.name, `%${search}%`),
        like(clients.email, `%${search}%`),
        like(clients.phone, `%${search}%`),
        like(clients.address, `%${search}%`)
      )
    );
  }

  // Filter by client types
  if (clientTypes && clientTypes.length > 0) {
    const typeConditions: SQL<unknown>[] = [];
    if (clientTypes.includes("buyer")) typeConditions.push(eq(clients.isBuyer, true));
    if (clientTypes.includes("seller")) typeConditions.push(eq(clients.isSeller, true));
    if (clientTypes.includes("brand")) typeConditions.push(eq(clients.isBrand, true));
    if (clientTypes.includes("referee")) typeConditions.push(eq(clients.isReferee, true));
    if (clientTypes.includes("contractor")) typeConditions.push(eq(clients.isContractor, true));
    if (typeConditions.length > 0) {
      const orCondition = or(...typeConditions);
      if (orCondition) conditions.push(orCondition);
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

  // Apply cursor for pagination
  if (cursor) {
    const cursorId = parseInt(cursor, 10);
    if (!isNaN(cursorId)) {
      conditions.push(sql`${clients.id} < ${cursorId}`);
    }
  }

  // Get total count (without cursor filter)
  const countConditions = conditions.filter(c => c !== conditions[conditions.length - 1] || !cursor);
  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(clients)
    .where(countConditions.length > 0 ? and(...countConditions.filter(Boolean)) : undefined);
  const total = Number(countResult?.count ?? 0);

  // Build and execute query
  let query = db.select().from(clients);
  if (conditions.length > 0) {
    query = query.where(and(...conditions.filter(Boolean))) as typeof query;
  }

  const results = await query
    .orderBy(desc(clients.id))
    .limit(limit + 1);

  const hasMore = results.length > limit;
  const items = hasMore ? results.slice(0, limit) : results;
  const lastItem = items[items.length - 1];
  const nextCursor = hasMore && lastItem ? String(lastItem.id) : null;

  return {
    items,
    nextCursor,
    hasMore,
    total,
  };
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
  const conditions: (SQL<unknown> | undefined)[] = [];

  // Enhanced multi-field search (same as getClients)
  if (search) {
    conditions.push(
      or(
        like(clients.teriCode, `%${search}%`),
        like(clients.name, `%${search}%`),
        like(clients.email, `%${search}%`),
        like(clients.phone, `%${search}%`),
        like(clients.address, `%${search}%`)
      )
    );
  }

  if (clientTypes && clientTypes.length > 0) {
    const typeConditions: SQL<unknown>[] = [];
    if (clientTypes.includes("buyer")) typeConditions.push(eq(clients.isBuyer, true));
    if (clientTypes.includes("seller")) typeConditions.push(eq(clients.isSeller, true));
    if (clientTypes.includes("brand")) typeConditions.push(eq(clients.isBrand, true));
    if (clientTypes.includes("referee")) typeConditions.push(eq(clients.isReferee, true));
    if (clientTypes.includes("contractor")) typeConditions.push(eq(clients.isContractor, true));
    if (typeConditions.length > 0) {
      const orCondition = or(...typeConditions);
      if (orCondition) conditions.push(orCondition);
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
 * Update client (with optimistic locking support - DATA-005)
 * @param clientId - Client ID to update
 * @param userId - User performing the update
 * @param data - Fields to update
 * @param expectedVersion - Optional version for optimistic locking. If provided, update will fail if version doesn't match.
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
  },
  expectedVersion?: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const updateData: Record<string, unknown> = {};

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

  // If version is provided, use optimistic locking
  if (expectedVersion !== undefined) {
    // Import optimistic locking utilities
    const { updateWithVersion } = await import("./_core/optimisticLocking");
    await updateWithVersion(db, clients, "Client", clientId, expectedVersion, updateData);
  } else {
    // Legacy update without version check (for backward compatibility)
    await db
      .update(clients)
      .set(updateData)
      .where(eq(clients.id, clientId));
  }

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

  // Use transaction to ensure payment update, stats update, and activity log are atomic
  return await db.transaction(async (tx) => {
    await tx
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
  });
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


// ============================================================================
// CLIENT COMMUNICATIONS
// ============================================================================

/**
 * Get all communications for a client
 */
export async function getClientCommunications(
  clientId: number,
  type?: 'CALL' | 'EMAIL' | 'MEETING' | 'NOTE'
) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  const { clientCommunications, users } = await import('../drizzle/schema');
  
  // Build where conditions
  const conditions = [eq(clientCommunications.clientId, clientId)];
  if (type) {
    conditions.push(eq(clientCommunications.communicationType, type));
  }
  
  const query = db
    .select({
      id: clientCommunications.id,
      clientId: clientCommunications.clientId,
      communicationType: clientCommunications.communicationType,
      subject: clientCommunications.subject,
      notes: clientCommunications.notes,
      communicatedAt: clientCommunications.communicatedAt,
      loggedBy: clientCommunications.loggedBy,
      loggedByName: users.name,
      createdAt: clientCommunications.createdAt,
    })
    .from(clientCommunications)
    .leftJoin(users, eq(clientCommunications.loggedBy, users.id))
    .where(and(...conditions))
    .orderBy(desc(clientCommunications.communicatedAt));
  
  return await query;
}

/**
 * Add a communication log entry
 */
export async function addCommunication(input: {
  clientId: number;
  type: 'CALL' | 'EMAIL' | 'MEETING' | 'NOTE';
  subject: string;
  notes?: string;
  communicatedAt: string;
  loggedBy: number;
}) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  // Sanitize inputs
  const sanitizedSubject = input.subject.trim().substring(0, 255);
  const sanitizedNotes = input.notes ? input.notes.trim().substring(0, 5000) : undefined;
  
  const { clientCommunications } = await import('../drizzle/schema');
  
  const [result] = await db.insert(clientCommunications).values({
    clientId: input.clientId,
    communicationType: input.type,
    subject: sanitizedSubject,
    notes: sanitizedNotes,
    communicatedAt: new Date(input.communicatedAt),
    loggedBy: input.loggedBy,
  }).$returningId();
  
  return { success: true, id: result.id };
}


// ============================================================================
// SUPPLIER PROFILE FUNCTIONS
// Part of Canonical Model Unification - replaces vendor profile functionality
// ============================================================================

/**
 * Get supplier profile for a client with isSeller=true
 */
export async function getSupplierProfile(clientId: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  const { supplierProfiles } = await import('../drizzle/schema');
  
  const [profile] = await db
    .select()
    .from(supplierProfiles)
    .where(eq(supplierProfiles.clientId, clientId))
    .limit(1);
  
  return profile || null;
}

/**
 * Update or create supplier profile for a client
 */
export async function updateSupplierProfile(
  clientId: number,
  data: {
    contactName?: string;
    contactEmail?: string;
    contactPhone?: string;
    licenseNumber?: string;
    taxId?: string;
    paymentTerms?: string;
    preferredPaymentMethod?: string;
    supplierNotes?: string;
  }
) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  const { supplierProfiles } = await import('../drizzle/schema');
  
  // Check if profile exists
  const [existingProfile] = await db
    .select()
    .from(supplierProfiles)
    .where(eq(supplierProfiles.clientId, clientId))
    .limit(1);
  
  // Build update object, filtering out empty strings
  const updateData: Record<string, string | null> = {};
  if (data.contactName !== undefined) updateData.contactName = data.contactName || null;
  if (data.contactEmail !== undefined) updateData.contactEmail = data.contactEmail || null;
  if (data.contactPhone !== undefined) updateData.contactPhone = data.contactPhone || null;
  if (data.licenseNumber !== undefined) updateData.licenseNumber = data.licenseNumber || null;
  if (data.taxId !== undefined) updateData.taxId = data.taxId || null;
  if (data.paymentTerms !== undefined) updateData.paymentTerms = data.paymentTerms || null;
  if (data.preferredPaymentMethod !== undefined) updateData.preferredPaymentMethod = data.preferredPaymentMethod || null;
  if (data.supplierNotes !== undefined) updateData.supplierNotes = data.supplierNotes || null;
  
  if (existingProfile) {
    // Update existing profile
    await db
      .update(supplierProfiles)
      .set(updateData)
      .where(eq(supplierProfiles.clientId, clientId));
  } else {
    // Create new profile
    await db.insert(supplierProfiles).values({
      clientId,
      ...updateData,
    });
  }
  
  return { success: true };
}

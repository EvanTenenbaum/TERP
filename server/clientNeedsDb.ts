import { eq, and, desc, sql } from "drizzle-orm";
import { getDb } from "./db";
import { clientNeeds, clients } from "../drizzle/schema";
import type { ClientNeed, InsertClientNeed } from "../drizzle/schema";
import { logger } from "./_core/logger";

/**
 * Create a new client need
 * @param need - The client need data to insert
 * @returns The created client need with full details
 */
export async function createClientNeed(need: InsertClientNeed): Promise<ClientNeed> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    const [inserted] = await db.insert(clientNeeds).values(need);
    const [created] = await db
      .select()
      .from(clientNeeds)
      .where(eq(clientNeeds.id, inserted.insertId as number));
    
    return created;
  } catch (error) {
    logger.error({
      msg: "Error creating client need",
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw new Error(`Failed to create client need: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Get a client need by ID
 * @param id - The client need ID
 * @returns The client need or null if not found
 */
export async function getClientNeedById(id: number): Promise<ClientNeed | null> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    const [need] = await db
      .select()
      .from(clientNeeds)
      .where(eq(clientNeeds.id, id));
    
    return need || null;
  } catch (error) {
    logger.error({
      msg: "Error fetching client need",
      clientNeedId: id,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw new Error(`Failed to fetch client need: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Get all client needs with optional filters
 * @param filters - Optional filters for status, clientId, priority
 * @returns Array of client needs
 */
export async function getClientNeeds(filters?: {
  status?: "ACTIVE" | "FULFILLED" | "EXPIRED" | "CANCELLED";
  clientId?: number;
  priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  strain?: string;
  category?: string;
}): Promise<ClientNeed[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    let query = db.select().from(clientNeeds);
    
    const conditions = [];
    if (filters?.status) {
      conditions.push(eq(clientNeeds.status, filters.status));
    }
    if (filters?.clientId) {
      conditions.push(eq(clientNeeds.clientId, filters.clientId));
    }
    if (filters?.priority) {
      conditions.push(eq(clientNeeds.priority, filters.priority));
    }
    if (filters?.strain) {
      conditions.push(eq(clientNeeds.strain, filters.strain));
    }
    if (filters?.category) {
      conditions.push(eq(clientNeeds.category, filters.category));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as typeof query;
    }

    const needs = await query.orderBy(desc(clientNeeds.createdAt));
    return needs;
  } catch (error) {
    logger.error({
      msg: "Error fetching client needs",
      filters,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw new Error(`Failed to fetch client needs: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Get active client needs for a specific client
 * @param clientId - The client ID
 * @returns Array of active client needs
 */
export async function getActiveClientNeeds(clientId: number): Promise<ClientNeed[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    const needs = await db
      .select()
      .from(clientNeeds)
      .where(
        and(
          eq(clientNeeds.clientId, clientId),
          eq(clientNeeds.status, "ACTIVE")
        )
      )
      .orderBy(desc(clientNeeds.priority), desc(clientNeeds.createdAt));
    
    return needs;
  } catch (error) {
    logger.error({
      msg: "Error fetching active client needs",
      clientId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw new Error(`Failed to fetch active client needs: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Update a client need
 * @param id - The client need ID
 * @param updates - Partial client need data to update
 * @returns The updated client need
 */
export async function updateClientNeed(
  id: number,
  updates: Partial<Omit<ClientNeed, "id" | "createdAt" | "updatedAt">>
): Promise<ClientNeed> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    await db
      .update(clientNeeds)
      .set(updates)
      .where(eq(clientNeeds.id, id));
    
    const [updated] = await db
      .select()
      .from(clientNeeds)
      .where(eq(clientNeeds.id, id));
    
    if (!updated) {
      throw new Error("Client need not found after update");
    }
    
    return updated;
  } catch (error) {
    logger.error({
      msg: "Error updating client need",
      clientNeedId: id,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw new Error(`Failed to update client need: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Mark a client need as fulfilled
 * @param id - The client need ID
 * @returns The updated client need
 */
export async function fulfillClientNeed(id: number): Promise<ClientNeed> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    return await updateClientNeed(id, {
      status: "FULFILLED",
      fulfilledAt: new Date(),
    });
  } catch (error) {
    logger.error({
      msg: "Error fulfilling client need",
      clientNeedId: id,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw new Error(`Failed to fulfill client need: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Cancel a client need
 * @param id - The client need ID
 * @returns The updated client need
 */
export async function cancelClientNeed(id: number): Promise<ClientNeed> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    return await updateClientNeed(id, {
      status: "CANCELLED",
    });
  } catch (error) {
    logger.error({
      msg: "Error cancelling client need",
      clientNeedId: id,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw new Error(`Failed to cancel client need: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Delete a client need
 * @param id - The client need ID
 * @returns True if deleted successfully
 */
export async function deleteClientNeed(id: number): Promise<boolean> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    await db.delete(clientNeeds).where(eq(clientNeeds.id, id));
    return true;
  } catch (error) {
    logger.error({
      msg: "Error deleting client need",
      clientNeedId: id,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw new Error(`Failed to delete client need: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Get client needs with match indicators
 * @param filters - Optional filters
 * @returns Array of client needs with match counts and client names
 */
export async function getClientNeedsWithMatches(filters?: {
  status?: "ACTIVE" | "FULFILLED" | "EXPIRED" | "CANCELLED";
  clientId?: number;
}): Promise<Array<ClientNeed & { matchCount: number; clientName?: string }>> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    const needs = await getClientNeeds(filters);

    // DATA-003 FIX: Fetch client names for the needs
    const clientIds = [...new Set(needs.map(n => n.clientId))];
    const clientNameMap = new Map<number, string>();

    if (clientIds.length > 0) {
      const clientRecords = await db
        .select({ id: clients.id, name: clients.name })
        .from(clients)
        .where(sql`${clients.id} IN (${sql.raw(clientIds.join(","))})`);

      for (const client of clientRecords) {
        clientNameMap.set(client.id, client.name || "");
      }
    }

    // Return needs with matchCount = 0 and clientName
    return needs.map(need => ({
      ...need,
      matchCount: 0,
      clientName: clientNameMap.get(need.clientId) || undefined,
    }));
  } catch (error) {
    logger.error({
      msg: "Error fetching client needs with matches",
      filters,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw new Error(`Failed to fetch client needs with matches: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Expire old client needs based on expiresAt date
 * @returns Number of needs expired
 */
export async function expireOldClientNeeds(): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    const result = await db
      .update(clientNeeds)
      .set({ status: "EXPIRED" })
      .where(
        and(
          eq(clientNeeds.status, "ACTIVE"),
          sql`${clientNeeds.expiresAt} < NOW()`
        )
      );
    
    return result[0].affectedRows || 0;
  } catch (error) {
    logger.error({
      msg: "Error expiring old client needs",
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw new Error(`Failed to expire old client needs: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}


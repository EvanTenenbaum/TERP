import { eq, and, desc, sql } from "drizzle-orm";
import { getDb } from "./db";
import { clientNeeds } from "../drizzle/schema";
import type { ClientNeed, InsertClientNeed } from "../drizzle/schema";
import { logger } from "./_core/logger";

/**
 * Check for duplicate or similar active needs
 * @param need - Need data to check
 * @returns Existing similar need or null
 */
export async function findSimilarActiveNeed(need: {
  clientId: number;
  strain?: string;
  category?: string;
  subcategory?: string;
  grade?: string;
}): Promise<ClientNeed | null> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    // Build conditions for similarity check
    const conditions = [
      eq(clientNeeds.clientId, need.clientId),
      eq(clientNeeds.status, "ACTIVE"),
    ];

    // Check for exact match on key fields
    if (need.strain) {
      conditions.push(eq(clientNeeds.strain, need.strain));
    }
    if (need.category) {
      conditions.push(eq(clientNeeds.category, need.category));
    }
    if (need.subcategory) {
      conditions.push(eq(clientNeeds.subcategory, need.subcategory));
    }
    if (need.grade) {
      conditions.push(eq(clientNeeds.grade, need.grade));
    }

    const [existing] = await db
      .select()
      .from(clientNeeds)
      .where(and(...conditions))
      .limit(1);

    return existing || null;
  } catch (error) {
    logger.error({
      msg: "Error finding similar need",
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return null;
  }
}

/**
 * Create a new client need with duplicate prevention
 * @param need - The client need data to insert
 * @returns The created client need with full details, or existing if duplicate found
 */
export async function createClientNeed(need: InsertClientNeed): Promise<{
  need: ClientNeed;
  isDuplicate: boolean;
  message?: string;
}> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    // Check for duplicates
    const existing = await findSimilarActiveNeed({
      clientId: need.clientId,
      strain: need.strain || undefined,
      category: need.category || undefined,
      subcategory: need.subcategory || undefined,
      grade: need.grade || undefined,
    });

    if (existing) {
      return {
        need: existing,
        isDuplicate: true,
        message: "A similar active need already exists for this client",
      };
    }

    // Validate dates
    if (need.neededBy && need.expiresAt) {
      const neededByDate = new Date(need.neededBy);
      const expiresAtDate = new Date(need.expiresAt);

      if (expiresAtDate <= neededByDate) {
        throw new Error("Expiration date must be after needed by date");
      }
    }

    // Validate quantities
    if (need.quantityMin && need.quantityMax) {
      const minQty = parseFloat(need.quantityMin);
      const maxQty = parseFloat(need.quantityMax);

      if (maxQty < minQty) {
        throw new Error(
          "Maximum quantity must be greater than or equal to minimum quantity"
        );
      }
    }

    // Create the need
    const [inserted] = await db.insert(clientNeeds).values(need);
    const [created] = await db
      .select()
      .from(clientNeeds)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .where(eq(clientNeeds.id, inserted.insertId as any));

    return {
      need: created,
      isDuplicate: false,
    };
  } catch (error) {
    logger.error({
      msg: "Error creating client need",
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw new Error(
      `Failed to create client need: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Get a client need by ID
 * @param id - The client need ID
 * @returns The client need or null if not found
 */
export async function getClientNeedById(
  id: number
): Promise<ClientNeed | null> {
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
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw new Error(
      `Failed to fetch client need: ${error instanceof Error ? error.message : "Unknown error"}`
    );
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      query = query.where(and(...conditions)) as any;
    }

    const needs = await query.orderBy(desc(clientNeeds.createdAt));
    return needs;
  } catch (error) {
    logger.error({
      msg: "Error fetching client needs",
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw new Error(
      `Failed to fetch client needs: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Get active client needs for a specific client
 * @param clientId - The client ID
 * @returns Array of active client needs
 */
export async function getActiveClientNeeds(
  clientId: number
): Promise<ClientNeed[]> {
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
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw new Error(
      `Failed to fetch active client needs: ${error instanceof Error ? error.message : "Unknown error"}`
    );
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
    // Validate quantities if both are being updated
    if (updates.quantityMin && updates.quantityMax) {
      const minQty = parseFloat(updates.quantityMin);
      const maxQty = parseFloat(updates.quantityMax);

      if (maxQty < minQty) {
        throw new Error(
          "Maximum quantity must be greater than or equal to minimum quantity"
        );
      }
    }

    await db.update(clientNeeds).set(updates).where(eq(clientNeeds.id, id));

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
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw new Error(
      `Failed to update client need: ${error instanceof Error ? error.message : "Unknown error"}`
    );
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
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw new Error(
      `Failed to fulfill client need: ${error instanceof Error ? error.message : "Unknown error"}`
    );
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
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw new Error(
      `Failed to cancel client need: ${error instanceof Error ? error.message : "Unknown error"}`
    );
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
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw new Error(
      `Failed to delete client need: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Get client needs with match indicators
 * @param filters - Optional filters
 * @returns Array of client needs with match counts
 */
export async function getClientNeedsWithMatches(filters?: {
  status?: "ACTIVE" | "FULFILLED" | "EXPIRED" | "CANCELLED";
  clientId?: number;
}): Promise<Array<ClientNeed & { matchCount: number }>> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    const needs = await getClientNeeds(filters);

    // FE-BUG-005: Calculate actual matchCount using matching engine
    const { findMatchesForNeed } = await import("./matchingEngineEnhanced");

    const needsWithCounts = await Promise.all(
      needs.map(async need => {
        try {
          // Only calculate matches for ACTIVE needs
          if (need.status === "ACTIVE") {
            const result = await findMatchesForNeed(need.id);
            return {
              ...need,
              matchCount: result.matches.length,
            };
          }
          return {
            ...need,
            matchCount: 0,
          };
        } catch (matchError) {
          // Log but don't fail - return 0 if matching fails for one need
          logger.warn(
            { needId: need.id, error: matchError },
            "Failed to find matches for need"
          );
          return {
            ...need,
            matchCount: 0,
          };
        }
      })
    );

    return needsWithCounts;
  } catch (error) {
    logger.error({
      msg: "Error fetching client needs with matches",
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw new Error(
      `Failed to fetch client needs with matches: ${error instanceof Error ? error.message : "Unknown error"}`
    );
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
    throw new Error(
      `Failed to expire old client needs: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

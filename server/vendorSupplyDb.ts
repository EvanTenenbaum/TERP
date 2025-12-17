import { eq, and, desc, sql } from "drizzle-orm";
import { getDb } from "./db";
import { vendorSupply, vendors } from "../drizzle/schema";
import { logger } from "./_core/logger";
import type { VendorSupply, InsertVendorSupply } from "../drizzle/schema";

/**
 * Create a new vendor supply item
 * @param supply - The vendor supply data to insert
 * @returns The created vendor supply with full details
 */
export async function createVendorSupply(supply: InsertVendorSupply): Promise<VendorSupply> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    const [inserted] = await db.insert(vendorSupply).values(supply);
    const [created] = await db
      .select()
      .from(vendorSupply)
      .where(eq(vendorSupply.id, inserted.insertId as any));
    
    return created;
  } catch (error) {
    logger.error("Error creating vendor supply", { error });
    throw new Error(`Failed to create vendor supply: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Get a vendor supply item by ID
 * @param id - The vendor supply ID
 * @returns The vendor supply or null if not found
 */
export async function getVendorSupplyById(id: number): Promise<VendorSupply | null> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    const [supply] = await db
      .select()
      .from(vendorSupply)
      .where(eq(vendorSupply.id, id));
    
    return supply || null;
  } catch (error) {
    logger.error("Error fetching vendor supply", { error });
    throw new Error(`Failed to fetch vendor supply: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Get all vendor supply items with optional filters
 * @param filters - Optional filters for status, vendorId, strain, category
 * @returns Array of vendor supply items
 */
export async function getVendorSupply(filters?: {
  status?: "AVAILABLE" | "RESERVED" | "PURCHASED" | "EXPIRED";
  vendorId?: number;
  strain?: string;
  category?: string;
}): Promise<VendorSupply[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    let query = db.select().from(vendorSupply);
    
    const conditions = [];
    if (filters?.status) {
      conditions.push(eq(vendorSupply.status, filters.status));
    }
    if (filters?.vendorId) {
      conditions.push(eq(vendorSupply.vendorId, filters.vendorId));
    }
    if (filters?.strain) {
      conditions.push(eq(vendorSupply.strain, filters.strain));
    }
    if (filters?.category) {
      conditions.push(eq(vendorSupply.category, filters.category));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    const supplies = await query.orderBy(desc(vendorSupply.createdAt));
    return supplies;
  } catch (error) {
    logger.error("Error fetching vendor supply list", { error });
    throw new Error(`Failed to fetch vendor supply: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Get available vendor supply items
 * @param vendorId - Optional vendor ID filter
 * @returns Array of available vendor supply items
 */
export async function getAvailableVendorSupply(vendorId?: number): Promise<VendorSupply[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    const conditions = [eq(vendorSupply.status, "AVAILABLE")];
    
    if (vendorId) {
      conditions.push(eq(vendorSupply.vendorId, vendorId));
    }

    const supplies = await db
      .select()
      .from(vendorSupply)
      .where(and(...conditions))
      .orderBy(desc(vendorSupply.createdAt));
    
    return supplies;
  } catch (error) {
    logger.error("Error fetching available vendor supply", { error });
    throw new Error(`Failed to fetch available vendor supply: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Update a vendor supply item
 * @param id - The vendor supply ID
 * @param updates - Partial vendor supply data to update
 * @returns The updated vendor supply
 */
export async function updateVendorSupply(
  id: number,
  updates: Partial<Omit<VendorSupply, "id" | "createdAt" | "updatedAt">>
): Promise<VendorSupply> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    await db
      .update(vendorSupply)
      .set(updates)
      .where(eq(vendorSupply.id, id));
    
    const [updated] = await db
      .select()
      .from(vendorSupply)
      .where(eq(vendorSupply.id, id));
    
    if (!updated) {
      throw new Error("Vendor supply not found after update");
    }
    
    return updated;
  } catch (error) {
    logger.error("Error updating vendor supply", { error });
    throw new Error(`Failed to update vendor supply: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Mark a vendor supply item as reserved
 * @param id - The vendor supply ID
 * @returns The updated vendor supply
 */
export async function reserveVendorSupply(id: number): Promise<VendorSupply> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    return await updateVendorSupply(id, {
      status: "RESERVED",
      reservedAt: new Date(),
    });
  } catch (error) {
    logger.error("Error reserving vendor supply", { error });
    throw new Error(`Failed to reserve vendor supply: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Mark a vendor supply item as purchased
 * @param id - The vendor supply ID
 * @returns The updated vendor supply
 */
export async function purchaseVendorSupply(id: number): Promise<VendorSupply> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    return await updateVendorSupply(id, {
      status: "PURCHASED",
      purchasedAt: new Date(),
    });
  } catch (error) {
    logger.error("Error purchasing vendor supply", { error });
    throw new Error(`Failed to purchase vendor supply: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Delete a vendor supply item
 * @param id - The vendor supply ID
 * @returns True if deleted successfully
 */
export async function deleteVendorSupply(id: number): Promise<boolean> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    await db.delete(vendorSupply).where(eq(vendorSupply.id, id));
    return true;
  } catch (error) {
    logger.error("Error deleting vendor supply", { error });
    throw new Error(`Failed to delete vendor supply: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Get vendor supply with match indicators
 * @param filters - Optional filters
 * @returns Array of vendor supply items with match counts
 */
export async function getVendorSupplyWithMatches(filters?: {
  status?: "AVAILABLE" | "RESERVED" | "PURCHASED" | "EXPIRED";
  vendorId?: number;
}): Promise<Array<VendorSupply & { matchCount: number }>> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    const supplies = await getVendorSupply(filters);
    
    // For now, return supplies with matchCount = 0
    // This will be enhanced when matching engine is implemented
    return supplies.map(supply => ({
      ...supply,
      matchCount: 0,
    }));
  } catch (error) {
    logger.error("Error fetching vendor supply with matches", { error });
    throw new Error(`Failed to fetch vendor supply with matches: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Expire old vendor supply items based on availableUntil date
 * @returns Number of supplies expired
 */
export async function expireOldVendorSupply(): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    const result = await db
      .update(vendorSupply)
      .set({ status: "EXPIRED" })
      .where(
        and(
          eq(vendorSupply.status, "AVAILABLE"),
          sql`${vendorSupply.availableUntil} < NOW()`
        )
      );
    
    return result[0].affectedRows || 0;
  } catch (error) {
    logger.error("Error expiring old vendor supply", { error });
    throw new Error(`Failed to expire old vendor supply: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}


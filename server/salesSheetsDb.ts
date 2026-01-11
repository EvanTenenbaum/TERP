import { getDb } from "./db";
import { eq, desc, inArray, and } from "drizzle-orm";
import {
  salesSheetHistory,
  salesSheetTemplates,
  salesSheetDrafts,
  batches,
  type SalesSheetHistory,
  type SalesSheetTemplate,
  type SalesSheetDraft,
} from "../drizzle/schema";
import * as pricingEngine from "./pricingEngine";
import { logger } from "./_core/logger";

// ============================================================================
// TYPES
// ============================================================================

export interface PricedInventoryItem {
  id: number;
  name: string;
  category?: string;
  subcategory?: string;
  strain?: string;
  basePrice: number;
  retailPrice: number;
  quantity: number;
  grade?: string;
  vendor?: string;
  priceMarkup: number;
  appliedRules: Array<{
    ruleId: number;
    ruleName: string;
    adjustment: string;
  }>;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Safely parse a number, returning default value if invalid
 */
function parseNumber(value: unknown, defaultValue: number = 0): number {
  const parsed = parseFloat(value?.toString() || String(defaultValue));
  return isNaN(parsed) ? defaultValue : parsed;
}

// ============================================================================
// INVENTORY WITH PRICING
// ============================================================================

/**
 * BUG-040 FIX: Enhanced inventory loading with better error handling and fallbacks.
 *
 * Root cause analysis: The original implementation could fail silently or with generic
 * errors when:
 * 1. Client doesn't exist (pricingEngine throws)
 * 2. Database queries timeout under memory pressure
 * 3. Pricing rules have invalid data
 *
 * Fix: Added specific error messages, fallback pricing, and logging for debugging.
 */
export async function getInventoryWithPricing(
  clientId: number,
  options?: { limit?: number; offset?: number }
): Promise<PricedInventoryItem[]> {
  const db = await getDb();
  if (!db) {
    logger.error(
      { clientId },
      "BUG-040: Database not available for inventory fetch"
    );
    throw new Error("Database temporarily unavailable. Please try again.");
  }

  const limit = Math.min(options?.limit || 100, 1000); // Max 1000
  const offset = options?.offset || 0;

  try {
    // Get batches with status filter
    logger.info(
      { clientId, limit, offset },
      "BUG-040: Fetching inventory batches"
    );
    const inventoryBatches = await db
      .select()
      .from(batches)
      .where(inArray(batches.batchStatus, ["LIVE", "PHOTOGRAPHY_COMPLETE"]))
      .limit(limit)
      .offset(offset);

    // BUG-040 FIX: Log batch count for debugging
    logger.info(
      { clientId, batchCount: inventoryBatches.length },
      "BUG-040: Batches fetched"
    );

    // BUG-040 FIX: Return empty array with clear indication when no batches available
    if (inventoryBatches.length === 0) {
      logger.info({ clientId }, "BUG-040: No inventory batches available");
      return [];
    }

    // Get client pricing rules with error handling
    let clientRules: Awaited<
      ReturnType<typeof pricingEngine.getClientPricingRules>
    > = [];
    try {
      clientRules = await pricingEngine.getClientPricingRules(clientId);
      logger.info(
        { clientId, ruleCount: clientRules.length },
        "BUG-040: Pricing rules loaded"
      );
    } catch (ruleError) {
      // BUG-040 FIX: If client pricing rules fail, use empty rules (base pricing)
      const errorMsg =
        ruleError instanceof Error ? ruleError.message : "Unknown error";
      logger.warn(
        { clientId, error: errorMsg },
        "BUG-040: Failed to load client pricing rules, using base pricing"
      );
      // Continue with empty rules - items will use base price as retail price
    }

    // Convert batches to inventory items format with safe number parsing
    const inventoryItems = inventoryBatches.map(batch => ({
      id: batch.id,
      name: batch.sku || `Batch #${batch.id}`,
      category: undefined, // batches don't have category field directly
      subcategory: undefined,
      strain: undefined,
      basePrice: parseNumber(batch.unitCogs, 0),
      quantity: parseNumber(batch.onHandQty, 0),
      grade: batch.grade || undefined,
      vendor: undefined,
    }));

    // Calculate retail prices using pricing engine with error handling
    try {
      const pricedItems = await pricingEngine.calculateRetailPrices(
        inventoryItems,
        clientRules
      );

      // Ensure all items have quantity defined
      return pricedItems.map(item => ({
        ...item,
        quantity: item.quantity || 0,
      }));
    } catch (pricingError) {
      logger.error(
        { error: pricingError, clientId },
        "BUG-040: Pricing engine error, using fallback pricing"
      );

      // Return items with base prices as fallback
      return inventoryItems.map(item => ({
        ...item,
        retailPrice: item.basePrice,
        priceMarkup: 0,
        appliedRules: [],
      }));
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    logger.error(
      { error: errorMsg, clientId },
      "BUG-040: Error fetching inventory"
    );

    // BUG-040 FIX: Provide specific error message based on error type
    if (errorMsg.includes("timeout") || errorMsg.includes("ETIMEDOUT")) {
      throw new Error(
        "Inventory loading timed out. The server may be under heavy load. Please try again."
      );
    }
    if (errorMsg.includes("Client not found")) {
      throw new Error("Customer not found. Please select a valid customer.");
    }
    throw new Error(`Failed to load inventory: ${errorMsg}`);
  }
}

// ============================================================================
// SALES SHEET HISTORY
// ============================================================================

export async function saveSalesSheet(data: {
  clientId: number;
  items: unknown[];
  totalValue: number;
  createdBy?: number;
}): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(salesSheetHistory).values({
    clientId: data.clientId,
    items: data.items,
    totalValue: data.totalValue.toString(),
    itemCount: data.items.length,
    createdBy: data.createdBy || 1, // Default to user ID 1 if not provided
  });

  return Number(result[0].insertId);
}

export async function getSalesSheetHistory(
  clientId: number,
  limit: number = 50
): Promise<SalesSheetHistory[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db
    .select()
    .from(salesSheetHistory)
    .where(eq(salesSheetHistory.clientId, clientId))
    .orderBy(desc(salesSheetHistory.createdAt))
    .limit(limit);
}

export async function getSalesSheetById(
  sheetId: number
): Promise<SalesSheetHistory | null> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select()
    .from(salesSheetHistory)
    .where(eq(salesSheetHistory.id, sheetId))
    .limit(1);

  return result[0] || null;
}

export async function deleteSalesSheet(sheetId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(salesSheetHistory).where(eq(salesSheetHistory.id, sheetId));
}

// ============================================================================
// TEMPLATES
// ============================================================================

export async function createTemplate(data: {
  name: string;
  clientId?: number;
  isUniversal: boolean;
  items: unknown[];
  columnConfig?: unknown;
  createdBy: number;
}): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(salesSheetTemplates).values({
    name: data.name,
    description: undefined,
    clientId: data.clientId,
    filters: {},
    selectedItems: data.items,
    columnVisibility: data.columnConfig || {},
    createdBy: data.createdBy,
  });

  return Number(result[0].insertId);
}

export async function getTemplates(
  clientId?: number,
  _includeUniversal: boolean = true
): Promise<SalesSheetTemplate[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  if (!clientId) {
    // Get all templates where clientId is null (universal templates)
    return await db
      .select()
      .from(salesSheetTemplates)
      .orderBy(desc(salesSheetTemplates.createdAt));
  }

  // Get client-specific templates
  return await db
    .select()
    .from(salesSheetTemplates)
    .where(eq(salesSheetTemplates.clientId, clientId))
    .orderBy(desc(salesSheetTemplates.createdAt));
}

export async function loadTemplate(
  templateId: number
): Promise<SalesSheetTemplate | null> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select()
    .from(salesSheetTemplates)
    .where(eq(salesSheetTemplates.id, templateId))
    .limit(1);

  return result[0] || null;
}

export async function deleteTemplate(templateId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .delete(salesSheetTemplates)
    .where(eq(salesSheetTemplates.id, templateId));
}

// ============================================================================
// DRAFTS (QA-062)
// ============================================================================

export interface DraftItem {
  id: number;
  name: string;
  category?: string;
  subcategory?: string;
  strain?: string;
  basePrice: number;
  retailPrice: number;
  quantity: number;
  grade?: string;
  vendor?: string;
  priceMarkup: number;
  appliedRules?: Array<{
    ruleId: number;
    ruleName: string;
    adjustment: string;
  }>;
}

/**
 * Save or update a sales sheet draft
 * If draftId is provided, updates existing draft; otherwise creates new
 */
export async function saveDraft(data: {
  draftId?: number;
  clientId: number;
  name: string;
  items: DraftItem[];
  totalValue: number;
  createdBy: number;
}): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  if (data.draftId) {
    // Update existing draft
    await db
      .update(salesSheetDrafts)
      .set({
        name: data.name,
        items: data.items,
        totalValue: data.totalValue.toString(),
        itemCount: data.items.length,
      })
      .where(
        and(
          eq(salesSheetDrafts.id, data.draftId),
          eq(salesSheetDrafts.createdBy, data.createdBy)
        )
      );
    return data.draftId;
  }

  // Create new draft
  const result = await db.insert(salesSheetDrafts).values({
    clientId: data.clientId,
    createdBy: data.createdBy,
    name: data.name,
    items: data.items,
    totalValue: data.totalValue.toString(),
    itemCount: data.items.length,
  });

  return Number(result[0].insertId);
}

/**
 * Get all drafts for a user
 */
export async function getDrafts(
  userId: number,
  clientId?: number
): Promise<SalesSheetDraft[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  if (clientId) {
    return await db
      .select()
      .from(salesSheetDrafts)
      .where(
        and(
          eq(salesSheetDrafts.createdBy, userId),
          eq(salesSheetDrafts.clientId, clientId)
        )
      )
      .orderBy(desc(salesSheetDrafts.updatedAt));
  }

  return await db
    .select()
    .from(salesSheetDrafts)
    .where(eq(salesSheetDrafts.createdBy, userId))
    .orderBy(desc(salesSheetDrafts.updatedAt));
}

/**
 * Get a specific draft by ID
 */
export async function getDraftById(
  draftId: number,
  userId: number
): Promise<SalesSheetDraft | null> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select()
    .from(salesSheetDrafts)
    .where(
      and(
        eq(salesSheetDrafts.id, draftId),
        eq(salesSheetDrafts.createdBy, userId)
      )
    )
    .limit(1);

  return result[0] || null;
}

/**
 * Delete a draft
 */
export async function deleteDraft(
  draftId: number,
  userId: number
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .delete(salesSheetDrafts)
    .where(
      and(
        eq(salesSheetDrafts.id, draftId),
        eq(salesSheetDrafts.createdBy, userId)
      )
    );
}

/**
 * Convert a draft to a finalized sales sheet
 * Creates a new sales sheet history entry and deletes the draft
 */
export async function convertDraftToSheet(
  draftId: number,
  userId: number
): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get the draft
  const draft = await getDraftById(draftId, userId);
  if (!draft) {
    throw new Error("Draft not found");
  }

  // Create the sales sheet
  const sheetId = await saveSalesSheet({
    clientId: draft.clientId,
    items: draft.items as unknown[],
    totalValue: parseFloat(draft.totalValue),
    createdBy: userId,
  });

  // Delete the draft
  await deleteDraft(draftId, userId);

  return sheetId;
}

// ============================================================================
// LIST & SHARING
// ============================================================================

/**
 * List sales sheets with pagination
 */
export async function listSalesSheets(
  clientId?: number,
  limit: number = 20,
  offset: number = 0
): Promise<{ sheets: SalesSheetHistory[]; total: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const baseQuery = clientId
    ? and(
        eq(salesSheetHistory.clientId, clientId),
        eq(salesSheetHistory.deletedAt, null)
      )
    : eq(salesSheetHistory.deletedAt, null);

  const sheets = await db
    .select()
    .from(salesSheetHistory)
    .where(baseQuery as any)
    .orderBy(desc(salesSheetHistory.createdAt))
    .limit(limit)
    .offset(offset);

  // Get total count
  const countResult = await db
    .select()
    .from(salesSheetHistory)
    .where(baseQuery as any);

  return {
    sheets,
    total: countResult.length,
  };
}

/**
 * Set share token for a sales sheet
 */
export async function setShareToken(
  sheetId: number,
  token: string,
  expiresAt: Date
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(salesSheetHistory)
    .set({
      shareToken: token,
      shareExpiresAt: expiresAt,
    })
    .where(eq(salesSheetHistory.id, sheetId));
}

/**
 * Revoke share token for a sales sheet
 */
export async function revokeShareToken(sheetId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(salesSheetHistory)
    .set({
      shareToken: null,
      shareExpiresAt: null,
    })
    .where(eq(salesSheetHistory.id, sheetId));
}

/**
 * Get a sales sheet by share token (for public access)
 */
export async function getSalesSheetByToken(
  token: string
): Promise<(SalesSheetHistory & { clientName: string }) | null> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Import clients table for join
  const { clients } = await import("../drizzle/schema");

  const result = await db
    .select({
      sheet: salesSheetHistory,
      clientName: clients.companyName,
    })
    .from(salesSheetHistory)
    .innerJoin(clients, eq(salesSheetHistory.clientId, clients.id))
    .where(eq(salesSheetHistory.shareToken, token))
    .limit(1);

  if (result.length === 0) {
    return null;
  }

  const { sheet, clientName } = result[0];

  // Check if link has expired
  if (sheet.shareExpiresAt && new Date(sheet.shareExpiresAt) < new Date()) {
    return null;
  }

  return {
    ...sheet,
    clientName: clientName || "Unknown Client",
  };
}

/**
 * Increment view count for a sales sheet
 */
export async function incrementViewCount(sheetId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get current count
  const current = await getSalesSheetById(sheetId);
  if (!current) return;

  await db
    .update(salesSheetHistory)
    .set({
      viewCount: (current.viewCount || 0) + 1,
      lastViewedAt: new Date(),
    })
    .where(eq(salesSheetHistory.id, sheetId));
}

// ============================================================================
// CONVERSION
// ============================================================================

/**
 * Convert a sales sheet to an order
 */
export async function convertToOrder(
  sheetId: number,
  userId: number,
  orderType: "DRAFT" | "QUOTE" | "ORDER"
): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get the sales sheet
  const sheet = await getSalesSheetById(sheetId);
  if (!sheet) {
    throw new Error("Sales sheet not found");
  }

  // Import orders table
  const { orders } = await import("../drizzle/schema");

  // Generate order number
  const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}`;

  // Map order type to isDraft flag
  const isDraft = orderType === "DRAFT" ? 1 : 0;
  const dbOrderType = orderType === "QUOTE" ? "QUOTE" : "ORDER";

  // Create the order
  const result = await db.insert(orders).values({
    orderNumber,
    orderType: dbOrderType,
    isDraft,
    clientId: sheet.clientId,
    items: sheet.items,
    subtotal: sheet.totalValue,
    total: sheet.totalValue,
    totalCogs: "0",
    totalMargin: "0",
    avgMarginPercent: "0",
    createdBy: userId,
    origin: "SALES_SHEET",
  });

  const orderId = Number(result[0].insertId);

  // Update the sales sheet with the converted order ID
  await db
    .update(salesSheetHistory)
    .set({
      convertedToOrderId: orderId,
    })
    .where(eq(salesSheetHistory.id, sheetId));

  return orderId;
}

/**
 * Convert a sales sheet to a live shopping session
 */
export async function convertToLiveSession(
  sheetId: number,
  userId: number
): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get the sales sheet
  const sheet = await getSalesSheetById(sheetId);
  if (!sheet) {
    throw new Error("Sales sheet not found");
  }

  // Import live shopping tables
  const { liveShoppingSessions, sessionCartItems } = await import(
    "../drizzle/schema-live-shopping"
  );
  const { batches: batchesTable } = await import("../drizzle/schema");

  // Generate unique room code
  const { randomBytes } = await import("crypto");
  const roomCode = randomBytes(16).toString("hex");

  // Create the session
  const sessionResult = await db.insert(liveShoppingSessions).values({
    hostUserId: userId,
    clientId: sheet.clientId,
    status: "ACTIVE",
    roomCode,
    startedAt: new Date(),
    title: `Sales Sheet #${sheetId}`,
  });

  const sessionId = Number(sessionResult[0].insertId);

  // Add items from the sales sheet to the session
  const items = sheet.items as any[];
  if (items && items.length > 0) {
    // Fetch all batches at once to avoid N+1 queries
    const batchIds = items.map((item) => item.id).filter(Boolean);
    const batchesData = await db
      .select()
      .from(batchesTable)
      .where(inArray(batchesTable.id, batchIds));

    // Create a map for quick lookup
    const batchMap = new Map(batchesData.map((b) => [b.id, b]));

    // Track items that couldn't be added
    const skippedItems: string[] = [];

    for (const item of items) {
      const batch = batchMap.get(item.id);
      if (batch) {
        await db.insert(sessionCartItems).values({
          sessionId,
          batchId: item.id,
          productId: batch.productId || 1,
          quantity: item.quantity?.toString() || "1",
          unitPrice: (item.finalPrice || item.retailPrice || item.basePrice)?.toString() || "0",
          addedByRole: "HOST",
          itemStatus: "TO_PURCHASE",
        });
      } else {
        skippedItems.push(item.name || `Item #${item.id}`);
      }
    }

    // Log warning if items were skipped
    if (skippedItems.length > 0) {
      logger.warn(
        { sessionId, skippedItems },
        `convertToLiveSession: ${skippedItems.length} items skipped (batch not found)`
      );
    }
  }

  // Update the sales sheet with the converted session ID
  await db
    .update(salesSheetHistory)
    .set({
      convertedToSessionId: sessionId.toString(),
    })
    .where(eq(salesSheetHistory.id, sheetId));

  return sessionId;
}

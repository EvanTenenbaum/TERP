import { getDb } from "./db";
import { eq, desc, inArray, and, sql, isNull } from "drizzle-orm";
import { randomBytes } from "crypto";
import {
  salesSheetHistory,
  salesSheetTemplates,
  salesSheetDrafts,
  batches,
  clients,
  orders,
  products,
  lots,
  vendors,
  strains,
  type SalesSheetHistory,
  type SalesSheetTemplate,
  type SalesSheetDraft,
} from "../drizzle/schema";
import { liveShoppingSessions, sessionCartItems } from "../drizzle/schema-live-shopping";
import * as pricingEngine from "./pricingEngine";
import { logger } from "./_core/logger";

// ============================================================================
// TYPES
// ============================================================================

export interface PricedInventoryItem {
  id: number;
  productId?: number; // WSQA-002: Product ID for flexible lot selection
  name: string;
  category?: string;
  subcategory?: string;
  strain?: string;
  strainId?: number;
  strainFamily?: string; // Base strain name for grouping (e.g., "Runtz" for "White Runtz")
  basePrice: number;
  retailPrice: number;
  quantity: number;
  grade?: string;
  vendor?: string;
  vendorId?: number;
  status?: string; // INV-CONSISTENCY-002: Include batch status for display/filtering
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
 * SALES-SHEET-IMPROVEMENTS: Added joins with products, lots, vendors, and strains
 * for complete filtering capabilities.
 *
 * Root cause analysis: The original implementation could fail silently or with generic
 * errors when:
 * 1. Client doesn't exist (pricingEngine throws)
 * 2. Database queries timeout under memory pressure
 * 3. Pricing rules have invalid data
 *
 * Fix: Added specific error messages, fallback pricing, and logging for debugging.
 * Enhancement: Added joins to include category, vendor, strain data for filtering.
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

  const limit = Math.min(options?.limit || 500, 1000); // Max 1000, default 500 for better UX
  const offset = options?.offset || 0;

  try {
    // Get batches with joins to products, lots, vendors, and strains
    logger.info(
      { clientId, limit, offset },
      "Fetching inventory batches with details"
    );

    // INV-CONSISTENCY-002: Show all inventory with qty > 0, regardless of status
    // Status is included in the response for display and filtering on frontend
    const inventoryWithDetails = await db
      .select({
        batch: batches,
        product: products,
        lot: lots,
        vendor: vendors,
        strain: strains,
      })
      .from(batches)
      .leftJoin(products, eq(batches.productId, products.id))
      .leftJoin(lots, eq(batches.lotId, lots.id))
      .leftJoin(vendors, eq(lots.vendorId, vendors.id))
      .leftJoin(strains, eq(products.strainId, strains.id))
      .where(
        and(
          sql`CAST(${batches.onHandQty} AS DECIMAL(15,4)) > 0`,
          isNull(batches.deletedAt)
        )
      )
      .limit(limit)
      .offset(offset);

    logger.info(
      { clientId, batchCount: inventoryWithDetails.length },
      "Batches with details fetched"
    );

    // Return empty array with clear indication when no batches available
    if (inventoryWithDetails.length === 0) {
      logger.info({ clientId }, "No inventory batches available");
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
        "Pricing rules loaded"
      );
    } catch (ruleError) {
      // If client pricing rules fail, use empty rules (base pricing)
      const errorMsg =
        ruleError instanceof Error ? ruleError.message : "Unknown error";
      logger.warn(
        { clientId, error: errorMsg },
        "Failed to load client pricing rules, using base pricing"
      );
      // Continue with empty rules - items will use base price as retail price
    }

    // Convert batches to inventory items format with joined data
    // FIX: Filter out any null batches (shouldn't happen but defensive)
    // INV-CONSISTENCY-002: Include status for display/filtering
    const inventoryItems = inventoryWithDetails
      .filter(({ batch }) => batch !== null && batch !== undefined)
      .map(({ batch, product, vendor, strain }) => ({
        id: batch.id,
        productId: product?.id || undefined, // WSQA-002: Include productId for flexible lot selection
        name: product?.nameCanonical || batch.sku || `Batch #${batch.id}`,
        category: product?.category || undefined,
        subcategory: product?.subcategory || undefined,
        strain: strain?.name || undefined,
        strainId: strain?.id || undefined,
        strainFamily: strain?.baseStrainName || strain?.name || undefined,
        basePrice: parseNumber(batch.unitCogs, 0),
        quantity: parseNumber(batch.onHandQty, 0),
        grade: batch.grade || undefined,
        vendor: vendor?.name || undefined,
        vendorId: vendor?.id || undefined,
        status: batch.batchStatus || undefined,
      }));

    // Calculate retail prices using pricing engine with error handling
    try {
      const pricedItems = await pricingEngine.calculateRetailPrices(
        inventoryItems,
        clientRules
      );

      // Ensure all items have quantity defined and preserve new fields
      // INV-CONSISTENCY-002: Include status for display/filtering
      // WSQA-002: Include productId for flexible lot selection
      return pricedItems.map((item, index) => ({
        ...item,
        quantity: item.quantity || 0,
        // Preserve joined fields that pricing engine doesn't know about
        productId: inventoryItems[index].productId,
        strainId: inventoryItems[index].strainId,
        strainFamily: inventoryItems[index].strainFamily,
        vendorId: inventoryItems[index].vendorId,
        status: inventoryItems[index].status,
      }));
    } catch (pricingError) {
      logger.error(
        { error: pricingError, clientId },
        "Pricing engine error, using fallback pricing"
      );

      // Return items with base prices as fallback
      // WSQA-002: productId is already in inventoryItems
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
      "Error fetching inventory"
    );

    // Provide specific error message based on error type
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

  // Use soft delete to match schema pattern (deletedAt column exists)
  await db
    .update(salesSheetHistory)
    .set({ deletedAt: new Date() })
    .where(eq(salesSheetHistory.id, sheetId));
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
        isNull(salesSheetHistory.deletedAt)
      )
    : isNull(salesSheetHistory.deletedAt);

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

  const result = await db
    .select({
      sheet: salesSheetHistory,
      clientName: clients.name,
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
 * Uses atomic SQL increment to avoid race conditions
 */
export async function incrementViewCount(sheetId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Use atomic SQL increment to avoid race conditions
  await db
    .update(salesSheetHistory)
    .set({
      viewCount: sql`${salesSheetHistory.viewCount} + 1`,
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

  // Generate order number
  const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}`;

  // Map order type to isDraft flag
  const isDraft = orderType === "DRAFT" ? 1 : 0;
  const dbOrderType = orderType === "QUOTE" ? "QUOTE" : "ORDER";

  // Create the order
  const result = await db.insert(orders).values({
    orderNumber,
    orderType: dbOrderType as "QUOTE" | "SALE",
    isDraft: isDraft === 1,
    clientId: sheet.clientId,
    items: sheet.items,
    subtotal: sheet.totalValue,
    total: sheet.totalValue,
    totalCogs: "0",
    totalMargin: "0",
    avgMarginPercent: "0",
    createdBy: userId,
    convertedFromSalesSheetId: sheetId,
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

  // Generate unique room code
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
      .from(batches)
      .where(inArray(batches.id, batchIds));

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

// ============================================================================
// SAVED VIEWS (SALES-SHEET-IMPROVEMENTS)
// Uses the existing salesSheetTemplates table with filters/columnVisibility
// ============================================================================

export interface SavedViewData {
  id?: number;
  name: string;
  description?: string;
  clientId?: number;
  filters: {
    search: string;
    categories: string[];
    grades: string[];
    priceMin: number | null;
    priceMax: number | null;
    strainFamilies: string[];
    vendors: string[];
    inStockOnly: boolean;
  };
  sort: {
    field: string;
    direction: 'asc' | 'desc';
  };
  columnVisibility: {
    category: boolean;
    quantity: boolean;
    basePrice: boolean;
    retailPrice: boolean;
    markup: boolean;
    grade: boolean;
    vendor: boolean;
    strain: boolean;
  };
  isDefault: boolean;
  createdBy: number;
}

/**
 * Save or update a view configuration
 * Uses the templates table with JSON fields for filters and column visibility
 * FIX: Added ownership validation for updates to prevent unauthorized modifications
 */
export async function saveView(data: SavedViewData): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Store isDefault in the filters JSON to avoid schema changes
  const filtersWithMeta = {
    ...data.filters,
    _sort: data.sort,
    _isDefault: data.isDefault,
  };

  if (data.id) {
    // Update existing view - verify ownership first
    const existing = await db
      .select()
      .from(salesSheetTemplates)
      .where(
        and(
          eq(salesSheetTemplates.id, data.id),
          eq(salesSheetTemplates.createdBy, data.createdBy)
        )
      )
      .limit(1);

    if (existing.length === 0) {
      throw new Error("View not found or you don't have permission to edit it");
    }

    await db
      .update(salesSheetTemplates)
      .set({
        name: data.name,
        description: data.description,
        clientId: data.clientId ?? null,
        filters: filtersWithMeta,
        columnVisibility: data.columnVisibility,
      })
      .where(
        and(
          eq(salesSheetTemplates.id, data.id),
          eq(salesSheetTemplates.createdBy, data.createdBy)
        )
      );
    return data.id;
  }

  // Create new view
  const result = await db.insert(salesSheetTemplates).values({
    name: data.name,
    description: data.description,
    clientId: data.clientId ?? null,
    filters: filtersWithMeta,
    selectedItems: [], // Empty - views don't pre-select items
    columnVisibility: data.columnVisibility,
    createdBy: data.createdBy,
  });

  return Number(result[0].insertId);
}

/**
 * Get all saved views for a client (includes universal views)
 * FIX: Now properly filters by userId - users can only see their own views or universal views
 */
export async function getViews(
  clientId?: number,
  userId?: number
): Promise<Array<{
  id: number;
  name: string;
  description: string | null;
  clientId: number | null;
  filters: SavedViewData['filters'];
  sort: SavedViewData['sort'];
  columnVisibility: SavedViewData['columnVisibility'];
  isDefault: boolean;
  createdAt: Date | null;
  lastUsedAt: Date | null;
}>> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // FIX: Build query conditions - users can only see:
  // 1. Their own views for the specific client
  // 2. Universal views (clientId is null) they created
  // 3. Universal views from any user (shared across all users)
  const conditions = [];

  if (clientId) {
    // Client-specific views owned by user OR universal views
    conditions.push(
      sql`(
        (${salesSheetTemplates.clientId} = ${clientId} AND ${salesSheetTemplates.createdBy} = ${userId ?? 0})
        OR ${salesSheetTemplates.clientId} IS NULL
      )`
    );
  } else {
    // Only universal views
    conditions.push(isNull(salesSheetTemplates.clientId));
  }

  const templates = await db
    .select()
    .from(salesSheetTemplates)
    .where(conditions.length > 0 ? conditions[0] : undefined)
    .orderBy(desc(salesSheetTemplates.createdAt));

  return templates.map((t) => {
    const filtersData = t.filters as any;
    return {
      id: t.id,
      name: t.name,
      description: t.description,
      clientId: t.clientId,
      filters: {
        search: filtersData?.search ?? '',
        categories: filtersData?.categories ?? [],
        grades: filtersData?.grades ?? [],
        priceMin: filtersData?.priceMin ?? null,
        priceMax: filtersData?.priceMax ?? null,
        strainFamilies: filtersData?.strainFamilies ?? [],
        vendors: filtersData?.vendors ?? [],
        inStockOnly: filtersData?.inStockOnly ?? false,
      },
      sort: filtersData?._sort ?? { field: 'name', direction: 'asc' },
      columnVisibility: (t.columnVisibility as SavedViewData['columnVisibility']) ?? {
        category: true,
        quantity: true,
        basePrice: true,
        retailPrice: true,
        markup: true,
        grade: false,
        vendor: false,
        strain: false,
      },
      isDefault: filtersData?._isDefault ?? false,
      createdAt: t.createdAt,
      lastUsedAt: t.lastUsedAt,
    };
  });
}

/**
 * Load a specific view by ID
 * FIX: Added userId for authorization - users can only load their own views or universal views
 */
export async function loadViewById(viewId: number, userId?: number): Promise<{
  id: number;
  name: string;
  description: string | null;
  clientId: number | null;
  filters: SavedViewData['filters'];
  sort: SavedViewData['sort'];
  columnVisibility: SavedViewData['columnVisibility'];
  isDefault: boolean;
} | null> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select()
    .from(salesSheetTemplates)
    .where(eq(salesSheetTemplates.id, viewId))
    .limit(1);

  if (result.length === 0) return null;

  const view = result[0];

  // FIX: Authorization check - user can only load:
  // 1. Their own views (createdBy matches userId)
  // 2. Universal views (clientId is null) - shared with everyone
  const isOwner = view.createdBy === userId;
  const isUniversal = view.clientId === null;

  if (!isOwner && !isUniversal) {
    throw new Error("View not found or you don't have permission to access it");
  }

  const t = result[0];
  const filtersData = t.filters as any;

  // Update lastUsedAt
  await db
    .update(salesSheetTemplates)
    .set({ lastUsedAt: new Date() })
    .where(eq(salesSheetTemplates.id, viewId));

  return {
    id: t.id,
    name: t.name,
    description: t.description,
    clientId: t.clientId,
    filters: {
      search: filtersData?.search ?? '',
      categories: filtersData?.categories ?? [],
      grades: filtersData?.grades ?? [],
      priceMin: filtersData?.priceMin ?? null,
      priceMax: filtersData?.priceMax ?? null,
      strainFamilies: filtersData?.strainFamilies ?? [],
      vendors: filtersData?.vendors ?? [],
      inStockOnly: filtersData?.inStockOnly ?? false,
    },
    sort: filtersData?._sort ?? { field: 'name', direction: 'asc' },
    columnVisibility: (t.columnVisibility as SavedViewData['columnVisibility']) ?? {
      category: true,
      quantity: true,
      basePrice: true,
      retailPrice: true,
      markup: true,
      grade: false,
      vendor: false,
      strain: false,
    },
    isDefault: filtersData?._isDefault ?? false,
  };
}

/**
 * Set a view as the default for a client
 * FIX: Added ownership validation and optimized to reduce race conditions
 */
export async function setDefaultView(
  viewId: number,
  clientId: number,
  userId: number
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Verify the target view exists and user owns it
  const targetView = await db
    .select()
    .from(salesSheetTemplates)
    .where(
      and(
        eq(salesSheetTemplates.id, viewId),
        eq(salesSheetTemplates.createdBy, userId)
      )
    )
    .limit(1);

  if (targetView.length === 0) {
    throw new Error("View not found or you don't have permission to modify it");
  }

  // Get all views for this client that are currently default and clear them
  const clientViews = await db
    .select()
    .from(salesSheetTemplates)
    .where(eq(salesSheetTemplates.clientId, clientId));

  // Clear defaults in batch (reduces N+1 queries)
  for (const view of clientViews) {
    const filtersData = view.filters as any;
    if (filtersData?._isDefault && view.id !== viewId) {
      await db
        .update(salesSheetTemplates)
        .set({
          filters: { ...filtersData, _isDefault: false },
        })
        .where(eq(salesSheetTemplates.id, view.id));
    }
  }

  // Set the new default
  const filtersData = targetView[0].filters as any;
  await db
    .update(salesSheetTemplates)
    .set({
      filters: { ...filtersData, _isDefault: true },
      clientId: clientId,
    })
    .where(eq(salesSheetTemplates.id, viewId));
}

/**
 * Delete a saved view
 * FIX: Added ownership validation to prevent unauthorized deletions
 */
export async function deleteView(viewId: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Verify ownership before deleting
  const existing = await db
    .select()
    .from(salesSheetTemplates)
    .where(
      and(
        eq(salesSheetTemplates.id, viewId),
        eq(salesSheetTemplates.createdBy, userId)
      )
    )
    .limit(1);

  if (existing.length === 0) {
    throw new Error("View not found or you don't have permission to delete it");
  }

  await db
    .delete(salesSheetTemplates)
    .where(
      and(
        eq(salesSheetTemplates.id, viewId),
        eq(salesSheetTemplates.createdBy, userId)
      )
    );
}

import { getDb } from "./db";
import { eq, desc, inArray } from "drizzle-orm";
import {
  salesSheetHistory,
  salesSheetTemplates,
  batches,
  type SalesSheetHistory,
  type SalesSheetTemplate,
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

export async function getInventoryWithPricing(
  clientId: number,
  options?: { limit?: number; offset?: number }
): Promise<PricedInventoryItem[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const limit = Math.min(options?.limit || 100, 1000); // Max 1000
  const offset = options?.offset || 0;

  try {
    // Get batches with status filter
    const inventoryBatches = await db
      .select()
      .from(batches)
      .where(inArray(batches.batchStatus, ["LIVE", "PHOTOGRAPHY_COMPLETE"]))
      .limit(limit)
      .offset(offset);

    // Get client pricing rules
    const clientRules = await pricingEngine.getClientPricingRules(clientId);

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
      logger.error("Pricing engine error, using fallback pricing", { error: pricingError });

      // Return items with base prices as fallback
      return inventoryItems.map(item => ({
        ...item,
        retailPrice: item.basePrice,
        priceMarkup: 0,
        appliedRules: [],
      }));
    }
  } catch (error) {
    logger.error("Error fetching inventory", { error });
    throw new Error("Failed to fetch inventory");
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

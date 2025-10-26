import { getDb } from "./db";
import { eq, and, desc } from "drizzle-orm";
import {
  salesSheetHistory,
  salesSheetTemplates,
  batches,
  clients,
  type SalesSheetHistory,
  type SalesSheetTemplate,
} from "../drizzle/schema";
import * as pricingEngine from "./pricingEngine";

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
// INVENTORY WITH PRICING
// ============================================================================

export async function getInventoryWithPricing(clientId: number): Promise<PricedInventoryItem[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get all batches (inventory) - only get batches with status AVAILABLE or IN_STOCK
  const inventoryBatches = await db
    .select()
    .from(batches)
    .limit(100);

  // Get client pricing rules
  const clientRules = await pricingEngine.getClientPricingRules(clientId);

  // Convert batches to inventory items format
  const inventoryItems = inventoryBatches.map((batch: any) => ({
    id: batch.id,
    name: batch.sku || `Batch #${batch.id}`,
    category: undefined, // batches don't have category field directly
    subcategory: undefined,
    strain: undefined,
    basePrice: parseFloat(batch.unitCogs?.toString() || "0"),
    quantity: parseFloat(batch.onHandQty?.toString() || "0"),
    grade: batch.grade || undefined,
    vendor: undefined,
  }));

  // Calculate retail prices using pricing engine
  const pricedItems = await pricingEngine.calculateRetailPrices(inventoryItems, clientRules);

  // Ensure all items have quantity defined
  return pricedItems.map(item => ({
    ...item,
    quantity: item.quantity || 0,
  }));
}

// ============================================================================
// SALES SHEET HISTORY
// ============================================================================

export async function saveSalesSheet(data: {
  clientId: number;
  items: any[];
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

export async function getSalesSheetById(sheetId: number): Promise<SalesSheetHistory | null> {
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
  items: any[];
  columnConfig?: any;
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
  includeUniversal: boolean = true
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

export async function loadTemplate(templateId: number): Promise<SalesSheetTemplate | null> {
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

  await db.delete(salesSheetTemplates).where(eq(salesSheetTemplates.id, templateId));
}


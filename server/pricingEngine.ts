import { getDb } from "./db";
import { eq, and, sql, desc } from "drizzle-orm";
import {
  pricingRules,
  pricingProfiles,
  clients,
  type PricingRule,
  type PricingProfile,
} from "../drizzle/schema";

// ============================================================================
// TYPES
// ============================================================================

export interface PricingConditions {
  category?: string;
  subcategory?: string;
  strain?: string;
  tag?: string;
  priceMin?: number;
  priceMax?: number;
  grade?: string;
  vendor?: string;
  [key: string]: any; // Allow custom metadata fields
}

export interface InventoryItem {
  id: number;
  name: string;
  category?: string;
  subcategory?: string;
  strain?: string;
  tags?: string[];
  basePrice: number;
  grade?: string;
  vendor?: string;
  quantity?: number;
  [key: string]: any; // Allow custom metadata
}

export interface PricedInventoryItem extends InventoryItem {
  retailPrice: number;
  appliedRules: Array<{
    ruleId: number;
    ruleName: string;
    adjustment: string;
  }>;
  priceMarkup: number; // Percentage or dollar amount
}

// ============================================================================
// PRICING RULES CRUD
// ============================================================================

export async function getPricingRules() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.select().from(pricingRules).where(eq(pricingRules.isActive, true)).orderBy(desc(pricingRules.priority));
}

export async function getPricingRuleById(ruleId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.select().from(pricingRules).where(eq(pricingRules.id, ruleId)).limit(1);
  return result[0] || null;
}

export async function createPricingRule(data: {
  name: string;
  description?: string;
  adjustmentType: "PERCENT_MARKUP" | "PERCENT_MARKDOWN" | "DOLLAR_MARKUP" | "DOLLAR_MARKDOWN";
  adjustmentValue: number;
  conditions: PricingConditions;
  logicType?: "AND" | "OR";
  priority?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(pricingRules).values({
    name: data.name,
    description: data.description,
    adjustmentType: data.adjustmentType,
    adjustmentValue: data.adjustmentValue.toString(),
    conditions: data.conditions,
    logicType: data.logicType || "AND",
    priority: data.priority || 0,
  });
  
  return Number(result[0].insertId);
}

export async function updatePricingRule(ruleId: number, data: Partial<{
  name: string;
  description: string;
  adjustmentType: "PERCENT_MARKUP" | "PERCENT_MARKDOWN" | "DOLLAR_MARKUP" | "DOLLAR_MARKDOWN";
  adjustmentValue: number;
  conditions: PricingConditions;
  logicType: "AND" | "OR";
  priority: number;
  isActive: boolean;
}>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const updateData: any = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.adjustmentType !== undefined) updateData.adjustmentType = data.adjustmentType;
  if (data.adjustmentValue !== undefined) updateData.adjustmentValue = data.adjustmentValue.toString();
  if (data.conditions !== undefined) updateData.conditions = data.conditions;
  if (data.logicType !== undefined) updateData.logicType = data.logicType;
  if (data.priority !== undefined) updateData.priority = data.priority;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;
  
  await db.update(pricingRules).set(updateData).where(eq(pricingRules.id, ruleId));
}

export async function deletePricingRule(ruleId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(pricingRules).where(eq(pricingRules.id, ruleId));
}

// ============================================================================
// PRICING PROFILES CRUD
// ============================================================================

export async function getPricingProfiles() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.select().from(pricingProfiles).orderBy(desc(pricingProfiles.createdAt));
}

export async function getPricingProfileById(profileId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.select().from(pricingProfiles).where(eq(pricingProfiles.id, profileId)).limit(1);
  return result[0] || null;
}

export async function createPricingProfile(data: {
  name: string;
  description?: string;
  rules: Array<{ ruleId: number; priority: number }>;
  createdBy?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(pricingProfiles).values({
    name: data.name,
    description: data.description,
    rules: data.rules,
    createdBy: data.createdBy,
  });
  
  return Number(result[0].insertId);
}

export async function updatePricingProfile(profileId: number, data: Partial<{
  name: string;
  description: string;
  rules: Array<{ ruleId: number; priority: number }>;
}>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const updateData: any = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.rules !== undefined) updateData.rules = data.rules;
  
  await db.update(pricingProfiles).set(updateData).where(eq(pricingProfiles.id, profileId));
}

export async function deletePricingProfile(profileId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(pricingProfiles).where(eq(pricingProfiles.id, profileId));
}

export async function applyProfileToClient(clientId: number, profileId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(clients).set({ pricingProfileId: profileId }).where(eq(clients.id, clientId));
}

// ============================================================================
// PRICING CALCULATION ENGINE
// ============================================================================

/**
 * Check if an inventory item matches a pricing rule's conditions
 */
function matchesConditions(item: InventoryItem, conditions: PricingConditions, logicType: "AND" | "OR"): boolean {
  const checks: boolean[] = [];
  
  // Category check
  if (conditions.category !== undefined) {
    checks.push(item.category === conditions.category);
  }
  
  // Subcategory check
  if (conditions.subcategory !== undefined) {
    checks.push(item.subcategory === conditions.subcategory);
  }
  
  // Strain check
  if (conditions.strain !== undefined) {
    checks.push(item.strain === conditions.strain);
  }
  
  // Tag check (item can have multiple tags)
  if (conditions.tag !== undefined) {
    const itemTags = item.tags || [];
    checks.push(itemTags.includes(conditions.tag));
  }
  
  // Price range check
  if (conditions.priceMin !== undefined || conditions.priceMax !== undefined) {
    const price = item.basePrice;
    const minCheck = conditions.priceMin !== undefined ? price >= conditions.priceMin : true;
    const maxCheck = conditions.priceMax !== undefined ? price <= conditions.priceMax : true;
    checks.push(minCheck && maxCheck);
  }
  
  // Grade check
  if (conditions.grade !== undefined) {
    checks.push(item.grade === conditions.grade);
  }
  
  // Vendor check
  if (conditions.vendor !== undefined) {
    checks.push(item.vendor === conditions.vendor);
  }
  
  // Custom metadata checks
  for (const key in conditions) {
    if (!["category", "subcategory", "strain", "tag", "priceMin", "priceMax", "grade", "vendor"].includes(key)) {
      checks.push(item[key] === conditions[key]);
    }
  }
  
  // Apply logic type
  if (checks.length === 0) return false;
  
  return logicType === "AND" ? checks.every(c => c) : checks.some(c => c);
}

/**
 * Calculate retail price for a single inventory item based on pricing rules
 */
export async function calculateRetailPrice(
  item: InventoryItem,
  rules: PricingRule[]
): Promise<PricedInventoryItem> {
  let currentPrice = item.basePrice;
  const appliedRules: Array<{ ruleId: number; ruleName: string; adjustment: string }> = [];
  
  // Sort rules by priority (highest first)
  const sortedRules = [...rules].sort((a, b) => (b.priority || 0) - (a.priority || 0));
  
  for (const rule of sortedRules) {
    const conditions = rule.conditions as PricingConditions;
    const logicType = rule.logicType || "AND";
    
    if (matchesConditions(item, conditions, logicType)) {
      const adjustmentValue = parseFloat(rule.adjustmentValue.toString());
      let adjustmentText = "";
      
      switch (rule.adjustmentType) {
        case "PERCENT_MARKUP":
          currentPrice = currentPrice * (1 + adjustmentValue / 100);
          adjustmentText = `+${adjustmentValue}%`;
          break;
        case "PERCENT_MARKDOWN":
          currentPrice = currentPrice * (1 - adjustmentValue / 100);
          adjustmentText = `-${adjustmentValue}%`;
          break;
        case "DOLLAR_MARKUP":
          currentPrice = currentPrice + adjustmentValue;
          adjustmentText = `+$${adjustmentValue}`;
          break;
        case "DOLLAR_MARKDOWN":
          currentPrice = currentPrice - adjustmentValue;
          adjustmentText = `-$${adjustmentValue}`;
          break;
      }
      
      appliedRules.push({
        ruleId: rule.id,
        ruleName: rule.name,
        adjustment: adjustmentText,
      });
    }
  }
  
  // Ensure price doesn't go negative
  currentPrice = Math.max(0, currentPrice);
  
  const priceMarkup = ((currentPrice - item.basePrice) / item.basePrice) * 100;
  
  return {
    ...item,
    retailPrice: Math.round(currentPrice * 100) / 100, // Round to 2 decimals
    appliedRules,
    priceMarkup: Math.round(priceMarkup * 100) / 100,
  };
}

/**
 * Calculate retail prices for multiple inventory items
 */
export async function calculateRetailPrices(
  items: InventoryItem[],
  rules: PricingRule[]
): Promise<PricedInventoryItem[]> {
  return Promise.all(items.map(item => calculateRetailPrice(item, rules)));
}

/**
 * Get pricing rules for a client (from profile or custom rules)
 */
export async function getClientPricingRules(clientId: number): Promise<PricingRule[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Get client
  const clientResult = await db.select().from(clients).where(eq(clients.id, clientId)).limit(1);
  if (!clientResult[0]) throw new Error("Client not found");
  
  const client = clientResult[0];
  
  // If client has a pricing profile, use that
  if (client.pricingProfileId) {
    const profile = await getPricingProfileById(client.pricingProfileId);
    if (profile && profile.rules) {
      const ruleIds = (profile.rules as Array<{ ruleId: number; priority: number }>).map(r => r.ruleId);
      const rules = await db.select().from(pricingRules).where(sql`${pricingRules.id} IN (${sql.raw(ruleIds.join(","))})`);
      return rules;
    }
  }
  
  // If client has custom pricing rules, use those
  if (client.customPricingRules) {
    const customRules = client.customPricingRules as Array<{ ruleId: number; priority: number }>;
    const ruleIds = customRules.map(r => r.ruleId);
    const rules = await db.select().from(pricingRules).where(sql`${pricingRules.id} IN (${sql.raw(ruleIds.join(","))})`);
    return rules;
  }
  
  // No pricing rules configured for this client
  return [];
}

/**
 * Calculate retail prices for inventory items for a specific client
 */
export async function calculateClientPrices(
  clientId: number,
  items: InventoryItem[]
): Promise<PricedInventoryItem[]> {
  const rules = await getClientPricingRules(clientId);
  return calculateRetailPrices(items, rules);
}


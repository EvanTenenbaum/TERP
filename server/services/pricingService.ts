/**
 * Pricing Service
 * Handles customer-specific and default margin lookups with fallback logic
 * v2.0 Sales Order Enhancements
 * 
 * Note: Client-specific margins are now handled via pricingProfileId and customPricingRules
 * on the clients table, not a defaultMarginPercent column.
 */

import { getDb } from "../db";
import { clients, pricingDefaults } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

export interface MarginResult {
  marginPercent: number | null;
  source: "CUSTOMER_PROFILE" | "DEFAULT" | "MANUAL";
  customerId?: number;
  productCategory?: string;
}

export const pricingService = {
  /**
   * Get margin for a customer and product category with fallback logic:
   * 1. Customer-specific margin from customPricingRules (if exists)
   * 2. Default margin by exact category (if exists)
   * 3. Default margin by "OTHER" category (fallback)
   * 4. Default margin by "DEFAULT" category (global fallback)
   * 5. null (manual input required)
   */
  async getMarginWithFallback(
    customerId: number,
    productCategory: string
  ): Promise<MarginResult> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Step 1: Try customer-specific margin from customPricingRules
    const customer = await db
      .select()
      .from(clients)
      .where(eq(clients.id, customerId))
      .limit(1);

    if (customer.length > 0 && customer[0].customPricingRules) {
      const rules = customer[0].customPricingRules as Record<string, number>;
      if (rules.defaultMarginPercent !== undefined) {
        return {
          marginPercent: rules.defaultMarginPercent,
          source: "CUSTOMER_PROFILE",
          customerId,
        };
      }
    }

    // Step 2: Try default margin by exact category
    const defaultMargin = await db
      .select()
      .from(pricingDefaults)
      .where(eq(pricingDefaults.productCategory, productCategory))
      .limit(1);

    if (defaultMargin.length > 0) {
      return {
        marginPercent: parseFloat(defaultMargin[0].defaultMarginPercent),
        source: "DEFAULT",
        productCategory,
      };
    }

    // Step 3: Fallback to "OTHER" category (used when product category is unknown)
    if (productCategory !== "OTHER") {
      const otherMargin = await db
        .select()
        .from(pricingDefaults)
        .where(eq(pricingDefaults.productCategory, "OTHER"))
        .limit(1);

      if (otherMargin.length > 0) {
        return {
          marginPercent: parseFloat(otherMargin[0].defaultMarginPercent),
          source: "DEFAULT",
          productCategory: "OTHER",
        };
      }
    }

    // Step 4: Fallback to "DEFAULT" category (global fallback)
    if (productCategory !== "DEFAULT") {
      const globalDefault = await db
        .select()
        .from(pricingDefaults)
        .where(eq(pricingDefaults.productCategory, "DEFAULT"))
        .limit(1);

      if (globalDefault.length > 0) {
        return {
          marginPercent: parseFloat(globalDefault[0].defaultMarginPercent),
          source: "DEFAULT",
          productCategory: "DEFAULT",
        };
      }
    }

    // Step 5: No margin found - manual input required
    return {
      marginPercent: null,
      source: "MANUAL",
    };
  },

  /**
   * Get customer-specific margin only (no fallback)
   * Reads from customPricingRules JSON field
   */
  async getCustomerMargin(customerId: number): Promise<number | null> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const customer = await db
      .select()
      .from(clients)
      .where(eq(clients.id, customerId))
      .limit(1);

    if (customer.length > 0 && customer[0].customPricingRules) {
      const rules = customer[0].customPricingRules as Record<string, number>;
      return rules.defaultMarginPercent ?? null;
    }

    return null;
  },

  /**
   * Get default margin by product category only (no fallback)
   */
  async getDefaultMarginByCategory(
    productCategory: string
  ): Promise<number | null> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const defaultMargin = await db
      .select()
      .from(pricingDefaults)
      .where(eq(pricingDefaults.productCategory, productCategory))
      .limit(1);

    return defaultMargin.length > 0
      ? parseFloat(defaultMargin[0].defaultMarginPercent)
      : null;
  },

  /**
   * Set customer-specific default margin
   * Stores in customPricingRules JSON field
   */
  async setCustomerMargin(
    customerId: number,
    marginPercent: number
  ): Promise<void> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Get existing rules
    const customer = await db
      .select()
      .from(clients)
      .where(eq(clients.id, customerId))
      .limit(1);

    const existingRules = (customer[0]?.customPricingRules as Record<string, unknown>) || {};
    const updatedRules = { ...existingRules, defaultMarginPercent: marginPercent };

    await db
      .update(clients)
      .set({ customPricingRules: updatedRules })
      .where(eq(clients.id, customerId));
  },

  /**
   * Set default margin by product category
   */
  async setDefaultMarginByCategory(
    productCategory: string,
    marginPercent: number
  ): Promise<void> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Check if default already exists
    const existing = await db
      .select()
      .from(pricingDefaults)
      .where(eq(pricingDefaults.productCategory, productCategory))
      .limit(1);

    if (existing.length > 0) {
      // Update existing
      await db
        .update(pricingDefaults)
        .set({
          defaultMarginPercent: String(marginPercent),
        })
        .where(eq(pricingDefaults.productCategory, productCategory));
    } else {
      // Insert new
      await db.insert(pricingDefaults).values({
        productCategory,
        defaultMarginPercent: String(marginPercent),
      });
    }
  },

  /**
   * Get all default margins
   */
  async getAllDefaultMargins(): Promise<
    Array<{ productCategory: string; defaultMarginPercent: number }>
  > {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const results = await db.select().from(pricingDefaults);
    return results.map(r => ({
      productCategory: r.productCategory,
      defaultMarginPercent: parseFloat(r.defaultMarginPercent),
    }));
  },
};

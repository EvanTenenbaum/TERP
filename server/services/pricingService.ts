/**
 * Pricing Service
 * Handles customer-specific and default margin lookups with fallback logic
 * v2.0 Sales Order Enhancements
 */

import { getDb } from "../db";
import { clients, pricingDefaults } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

export interface MarginResult {
  marginPercent: number | null;
  source: "customer" | "default" | "none";
  customerId?: number;
  productCategory?: string;
}

export const pricingService = {
  /**
   * Get margin for a customer and product category with fallback logic:
   * 1. Customer-specific margin (if exists)
   * 2. Default margin by category (if exists)
   * 3. null (manual input required)
   */
  async getMarginWithFallback(
    customerId: number,
    productCategory: string
  ): Promise<MarginResult> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Step 1: Try customer-specific margin
    const customer = await db
      .select()
      .from(clients)
      .where(eq(clients.id, customerId))
      .limit(1);

    if (customer.length > 0 && customer[0].defaultMarginPercent !== null) {
      return {
        marginPercent: customer[0].defaultMarginPercent,
        source: "customer",
        customerId,
      };
    }

    // Step 2: Try default margin by category
    const defaultMargin = await db
      .select()
      .from(pricingDefaults)
      .where(eq(pricingDefaults.productCategory, productCategory))
      .limit(1);

    if (defaultMargin.length > 0) {
      return {
        marginPercent: defaultMargin[0].defaultMarginPercent,
        source: "default",
        productCategory,
      };
    }

    // Step 3: No margin found - manual input required
    return {
      marginPercent: null,
      source: "none",
    };
  },

  /**
   * Get customer-specific margin only (no fallback)
   */
  async getCustomerMargin(customerId: number): Promise<number | null> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const customer = await db
      .select()
      .from(clients)
      .where(eq(clients.id, customerId))
      .limit(1);

    return customer.length > 0 ? customer[0].defaultMarginPercent : null;
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
      ? defaultMargin[0].defaultMarginPercent
      : null;
  },

  /**
   * Set customer-specific default margin
   */
  async setCustomerMargin(
    customerId: number,
    marginPercent: number
  ): Promise<void> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    await db
      .update(clients)
      .set({ defaultMarginPercent: marginPercent })
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
          defaultMarginPercent: marginPercent,
          updatedAt: new Date(),
        })
        .where(eq(pricingDefaults.productCategory, productCategory));
    } else {
      // Insert new
      await db.insert(pricingDefaults).values({
        productCategory,
        defaultMarginPercent: marginPercent,
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

    return await db.select().from(pricingDefaults);
  },
};

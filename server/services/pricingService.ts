/**
 * Pricing Service
 * Handles customer-specific and default margin lookups with fallback logic
 * v2.0 Sales Order Enhancements
 *
 * Note: Client-specific margins are now handled via pricingProfileId and customPricingRules
 * on the clients table, not a defaultMarginPercent column.
 */

import { getDb } from "../db";
import {
  clients,
  pricingDefaults,
  rangePricingChannelSettings,
} from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import {
  calculateRetailPrice,
  getClientPricingRules,
  type InventoryItem,
} from "../pricingEngine";
import type { CogsRangeBasis, PricingChannel } from "../cogsCalculator";

export interface MarginResult {
  marginPercent: number | null;
  source: "CUSTOMER_PROFILE" | "DEFAULT" | "MANUAL";
  customerId?: number;
  productCategory?: string;
}

export interface MarginLookupOptions {
  basePrice?: number;
  itemName?: string;
  subcategory?: string;
  strain?: string;
  tags?: string[];
  grade?: string;
  vendor?: string;
}

export interface RangePricingChannelSettingResult {
  channel: PricingChannel;
  defaultBasis: Exclude<CogsRangeBasis, "MANUAL">;
}

const RANGE_PRICING_CHANNELS: PricingChannel[] = [
  "SALES_SHEET",
  "LIVE_SHOPPING",
  "VIP_SHOPPING",
];

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
    productCategory: string,
    options: MarginLookupOptions = {}
  ): Promise<MarginResult> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Step 1: Load customer once for both profile-aware and legacy fallback paths.
    const customer = await db
      .select()
      .from(clients)
      .where(eq(clients.id, customerId))
      .limit(1);

    const customerRecord = customer[0];

    // Step 2: If we have a real cost basis, let pricing profiles/rules decide
    // the price first so order save matches the profile-driven browser preview.
    if (
      customerRecord &&
      Number.isFinite(options.basePrice) &&
      (customerRecord.pricingProfileId || customerRecord.customPricingRules)
    ) {
      const basePrice = Number(options.basePrice);
      const rules = await getClientPricingRules(customerId);

      if (rules.length > 0) {
        const pricedItem = await calculateRetailPrice(
          {
            id: 0,
            name: options.itemName ?? productCategory,
            category: productCategory,
            subcategory: options.subcategory,
            strain: options.strain,
            tags: options.tags,
            basePrice,
            grade: options.grade,
            vendor: options.vendor,
          } satisfies InventoryItem,
          rules
        );

        if (basePrice > 0) {
          return {
            marginPercent:
              ((pricedItem.retailPrice - basePrice) / basePrice) * 100,
            source: "CUSTOMER_PROFILE",
            customerId,
            productCategory,
          };
        }
      }
    }

    // Step 3: Legacy client-level margin fallback from customPricingRules
    if (customerRecord?.customPricingRules) {
      const rules = customer[0].customPricingRules as Record<string, number>;
      if (rules.defaultMarginPercent !== undefined) {
        return {
          marginPercent: rules.defaultMarginPercent,
          source: "CUSTOMER_PROFILE",
          customerId,
        };
      }
    }

    // Step 4: Try default margin by exact category
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

    // Step 5: Fallback to "OTHER" category (used when product category is unknown)
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

    // Step 6: Fallback to "DEFAULT" category (global fallback)
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

    // Step 7: No margin found - manual input required
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

    const existingRules =
      (customer[0]?.customPricingRules as Record<string, unknown>) || {};
    const updatedRules = {
      ...existingRules,
      defaultMarginPercent: marginPercent,
    };

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

  async getRangePricingDefaults(): Promise<RangePricingChannelSettingResult[]> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const rows = await db.select().from(rangePricingChannelSettings);
    const byChannel = new Map(rows.map(row => [row.channel, row]));

    return RANGE_PRICING_CHANNELS.map(channel => ({
      channel,
      defaultBasis:
        (byChannel.get(channel)?.defaultBasis as Exclude<
          CogsRangeBasis,
          "MANUAL"
        > | null) ?? "MID",
    }));
  },

  async getRangePricingDefaultForChannel(
    channel: PricingChannel
  ): Promise<Exclude<CogsRangeBasis, "MANUAL">> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const [row] = await db
      .select()
      .from(rangePricingChannelSettings)
      .where(eq(rangePricingChannelSettings.channel, channel))
      .limit(1);

    return (
      (row?.defaultBasis as Exclude<CogsRangeBasis, "MANUAL"> | undefined) ??
      "MID"
    );
  },

  async setRangePricingDefault(
    channel: PricingChannel,
    defaultBasis: Exclude<CogsRangeBasis, "MANUAL">
  ): Promise<void> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const [existing] = await db
      .select()
      .from(rangePricingChannelSettings)
      .where(eq(rangePricingChannelSettings.channel, channel))
      .limit(1);

    if (existing) {
      await db
        .update(rangePricingChannelSettings)
        .set({ defaultBasis, deletedAt: null })
        .where(eq(rangePricingChannelSettings.id, existing.id));
      return;
    }

    await db.insert(rangePricingChannelSettings).values({
      channel,
      defaultBasis,
    });
  },
};

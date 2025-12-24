import { getDb } from "../../db";
import { eq, and } from "drizzle-orm";
import { 
  products, 
  batches 
} from "../../../drizzle/schema";
import { sessionPriceOverrides } from "../../../drizzle/schema-live-shopping";
import { pricingService } from "../pricingService";
import { financialMath } from "../../utils/financialMath";

export interface CalculatedPrice {
  finalPrice: string;
  source: "OVERRIDE" | "MARGIN_CALC" | "COST_FALLBACK";
  isOverride: boolean;
  baseCost: string;
  appliedMargin?: number;
}

export const sessionPricingService = {
  /**
   * Calculate the effective price for a specific batch within a live session.
   * Hierarchy:
   * 1. Session-specific Override (Highest priority)
   * 2. Customer-specific Margin Profile
   * 3. Category Default Margin
   * 4. Cost Price (Fallback)
   */
  async calculateEffectivePrice(
    sessionId: number,
    batchId: number,
    clientId: number
  ): Promise<CalculatedPrice> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // 1. Fetch Batch and Product Details
    const batchResult = await db
      .select({
        cost: batches.unitCogs,
        productId: batches.productId,
        productCategory: products.category, // Assuming category exists on products table
      })
      .from(batches)
      .innerJoin(products, eq(batches.productId, products.id))
      .where(eq(batches.id, batchId))
      .limit(1);

    if (!batchResult.length) {
      throw new Error(`Batch ID ${batchId} not found`);
    }

    const { cost, productId, productCategory } = batchResult[0];
    const costStr = String(cost);

    // 2. Check for Session Override
    const override = await db
      .select()
      .from(sessionPriceOverrides)
      .where(
        and(
          eq(sessionPriceOverrides.sessionId, sessionId),
          eq(sessionPriceOverrides.productId, productId)
        )
      )
      .limit(1);

    if (override.length > 0) {
      return {
        finalPrice: financialMath.toFixed(override[0].overridePrice),
        source: "OVERRIDE",
        isOverride: true,
        baseCost: costStr,
      };
    }

    // 3. Calculate based on Margin Logic
    // We treat null category as generic if missing
    const categoryToUse = productCategory || "UNCATEGORIZED";
    
    const marginResult = await pricingService.getMarginWithFallback(
      clientId,
      categoryToUse
    );

    if (marginResult.marginPercent !== null) {
      const calculatedPrice = financialMath.calculateMarginPrice(
        costStr,
        marginResult.marginPercent
      );

      return {
        finalPrice: calculatedPrice,
        source: "MARGIN_CALC",
        isOverride: false,
        baseCost: costStr,
        appliedMargin: marginResult.marginPercent,
      };
    }

    // 4. Fallback to Cost (Safety Net)
    // If no margin rules exist, we default to cost to prevent error, 
    // but this should ideally be flagged in UI.
    return {
      finalPrice: financialMath.toFixed(costStr),
      source: "COST_FALLBACK",
      isOverride: false,
      baseCost: costStr,
      appliedMargin: 0,
    };
  },

  /**
   * Set a manual price override for a product in a session
   */
  async setSessionOverride(
    sessionId: number,
    productId: number,
    price: number
  ): Promise<void> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const priceStr = financialMath.toFixed(price);

    // Upsert logic
    const existing = await db
      .select()
      .from(sessionPriceOverrides)
      .where(
        and(
          eq(sessionPriceOverrides.sessionId, sessionId),
          eq(sessionPriceOverrides.productId, productId)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(sessionPriceOverrides)
        .set({ overridePrice: priceStr })
        .where(eq(sessionPriceOverrides.id, existing[0].id));
    } else {
      await db.insert(sessionPriceOverrides).values({
        sessionId,
        productId,
        overridePrice: priceStr,
      });
    }
  },

  /**
   * Remove an override
   */
  async removeSessionOverride(
    sessionId: number,
    productId: number
  ): Promise<void> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    await db
      .delete(sessionPriceOverrides)
      .where(
        and(
          eq(sessionPriceOverrides.sessionId, sessionId),
          eq(sessionPriceOverrides.productId, productId)
        )
      );
  }
};

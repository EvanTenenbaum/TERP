/**
 * Pricing Defaults Seeder
 *
 * Seeds the pricing_defaults table with default margin percentages per product category.
 * This table is CRITICAL for order creation and finalization.
 *
 * BUG-084: Seed pricing_defaults table
 * Related: BUG-086 (Cannot finalize sales order due to missing pricing defaults)
 */

import { db } from "../../db-sync";
import { pricingDefaults } from "../../../drizzle/schema";
import type { SchemaValidator } from "../lib/validation";
import type { PIIMasker } from "../lib/data-masking";
import { seedLogger } from "../lib/logging";
import { createSeederResult, type SeederResult } from "./index";
import { eq } from "drizzle-orm";

// ============================================================================
// Default Pricing Categories
// ============================================================================

/**
 * Default margin percentages by product category
 * These are industry-standard margins for cannabis products
 */
const PRICING_DEFAULTS = [
  { productCategory: "Flower", margin: 35.0 },
  { productCategory: "Edibles", margin: 40.0 },
  { productCategory: "Concentrates", margin: 45.0 },
  { productCategory: "Vapes", margin: 38.0 },
  { productCategory: "Pre-Rolls", margin: 35.0 },
  { productCategory: "Accessories", margin: 50.0 },
  { productCategory: "Topicals", margin: 42.0 },
  { productCategory: "Tinctures", margin: 40.0 },
  // CRITICAL: "OTHER" is used by orders.ts as fallback category
  { productCategory: "OTHER", margin: 30.0 },
  // Additional common categories
  { productCategory: "Seeds", margin: 45.0 },
  { productCategory: "Beverages", margin: 35.0 },
  // Global fallback
  { productCategory: "DEFAULT", margin: 30.0 },
] as const;

// ============================================================================
// Seeder Function
// ============================================================================

/**
 * Seed pricing defaults table
 *
 * @param _count - Ignored (fixed number of defaults)
 * @param validator - Schema validator instance
 * @param _masker - PII masker instance (not needed for this table)
 * @returns SeederResult with statistics
 */
export async function seedPricingDefaults(
  _count: number,
  validator: SchemaValidator,
  _masker: PIIMasker
): Promise<SeederResult> {
  const startTime = Date.now();
  const result = createSeederResult("pricing_defaults");

  try {
    seedLogger.tableSeeding("pricing_defaults", PRICING_DEFAULTS.length);

    // Validate table exists
    const tableExists = await validator.validateTableExists("pricing_defaults");
    if (!tableExists) {
      result.errors.push("pricing_defaults table does not exist - run migrations first");
      result.duration = Date.now() - startTime;
      return result;
    }

    // Insert or update each pricing default using upsert
    for (const pricing of PRICING_DEFAULTS) {
      try {
        // Check if record exists
        const existing = await db
          .select()
          .from(pricingDefaults)
          .where(eq(pricingDefaults.productCategory, pricing.productCategory))
          .limit(1);

        if (existing.length > 0) {
          // Update existing
          await db
            .update(pricingDefaults)
            .set({
              defaultMarginPercent: String(pricing.margin),
            })
            .where(eq(pricingDefaults.productCategory, pricing.productCategory));

          seedLogger.recordInserted("pricing_defaults", existing[0].id);
        } else {
          // Insert new
          const insertResult = await db.insert(pricingDefaults).values({
            productCategory: pricing.productCategory,
            defaultMarginPercent: String(pricing.margin),
          });

          seedLogger.recordInserted("pricing_defaults", Number(insertResult.insertId));
        }

        result.inserted++;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        result.errors.push(`Failed to seed ${pricing.productCategory}: ${errorMessage}`);
        result.skipped++;
      }
    }

    seedLogger.tableComplete("pricing_defaults", result.inserted, 0);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    result.errors.push(errorMessage);
    seedLogger.operationFailure(
      "seed:pricing_defaults",
      error instanceof Error ? error : new Error(errorMessage),
      {}
    );
  }

  result.duration = Date.now() - startTime;
  return result;
}

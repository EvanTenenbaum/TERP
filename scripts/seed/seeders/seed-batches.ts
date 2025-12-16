/**
 * Batch Seeder
 *
 * Seeds the batches table with realistic inventory batch data.
 * Depends on: products, lots, vendors
 */

import { db } from "../../db-sync";
import { batches, products, lots, vendors } from "../../../drizzle/schema";
import type { SchemaValidator } from "../lib/validation";
import type { PIIMasker } from "../lib/data-masking";
import { seedLogger, withPerformanceLogging } from "../lib/logging";
import { createSeederResult, type SeederResult } from "./index";
import { faker } from "@faker-js/faker";

// ============================================================================
// Batch Generation Utilities
// ============================================================================

type PaymentTerm = PaymentTerm;
const _PAYMENT_TERMS = ["COD", "NET_7", "NET_15", "NET_30", "CONSIGNMENT"] as const;
type BatchStatus = BatchStatus;
const _BATCH_STATUSES = ["AWAITING_INTAKE", "LIVE", "ON_HOLD", "SOLD_OUT"] as const;
const GRADES = ["AAA", "AA", "A", null];

interface BatchData {
  code: string;
  sku: string;
  productId: number;
  lotId: number;
  batchStatus: BatchStatus;
  grade: string | null;
  isSample: number;
  sampleOnly: number;
  sampleAvailable: number;
  cogsMode: "FIXED" | "RANGE";
  unitCogs: string;
  unitCogsMin: string | null;
  unitCogsMax: string | null;
  paymentTerms: PaymentTerm;
  amountPaid: string;
  metadata: string | null;
  onHandQty: string;
  sampleQty: string;
  reservedQty: string;
  quarantineQty: string;
  holdQty: string;
  defectiveQty: string;
  publishEcom: number;
  publishB2b: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Generate a batch record
 */
function generateBatch(
  index: number,
  productId: number,
  lotId: number,
  isFlower: boolean
): BatchData {
  // 90% consignment, 10% COD
  const isConsignment = Math.random() < 0.9;
  const paymentTerms = isConsignment ? "CONSIGNMENT" : faker.helpers.arrayElement(["COD", "NET_7", "NET_15", "NET_30"]);

  // Pricing based on product type
  let unitCogs: number;
  if (isFlower) {
    // Flower pricing: $800-$1800 per lb based on grow type
    unitCogs = faker.number.float({ min: 800, max: 1800, fractionDigits: 2 });
  } else {
    // Non-flower: $20-$100 per unit
    unitCogs = faker.number.float({ min: 20, max: 100, fractionDigits: 2 });
  }

  // Quantities
  const onHandQty = isFlower
    ? faker.number.float({ min: 10, max: 500, fractionDigits: 2 })
    : faker.number.int({ min: 50, max: 1000 });

  const amountPaid = isConsignment ? 0 : unitCogs * onHandQty;

  return {
    code: `BATCH-${String(index + 1).padStart(6, "0")}`,
    sku: `SKU-${String(productId).padStart(4, "0")}-${String(lotId).padStart(4, "0")}-${String(index + 1).padStart(3, "0")}`,
    productId,
    lotId,
    batchStatus: faker.helpers.weightedArrayElement([
      { value: "LIVE", weight: 70 },
      { value: "AWAITING_INTAKE", weight: 10 },
      { value: "ON_HOLD", weight: 10 },
      { value: "SOLD_OUT", weight: 10 },
    ]),
    grade: isFlower ? faker.helpers.arrayElement(GRADES) : null,
    isSample: 0,
    sampleOnly: 0,
    sampleAvailable: faker.number.int({ min: 0, max: 1 }),
    cogsMode: "FIXED",
    unitCogs: unitCogs.toFixed(2),
    unitCogsMin: null,
    unitCogsMax: null,
    paymentTerms,
    amountPaid: amountPaid.toFixed(2),
    metadata: null,
    onHandQty: String(onHandQty),
    sampleQty: "0",
    reservedQty: "0",
    quarantineQty: "0",
    holdQty: "0",
    defectiveQty: "0",
    publishEcom: 0,
    publishB2b: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

// ============================================================================
// Seeder Implementation
// ============================================================================

/**
 * Seed batches table
 */
export async function seedBatches(
  count: number,
  validator: SchemaValidator,
  _masker: PIIMasker
): Promise<SeederResult> {
  const result = createSeederResult("batches");
  const startTime = Date.now();

  return withPerformanceLogging("seed:batches", async () => {
    try {
      seedLogger.tableSeeding("batches", count);

      // Get existing products
      const existingProducts = await db
        .select({ id: products.id, category: products.category })
        .from(products);

      if (existingProducts.length === 0) {
        result.errors.push("No products found. Seed products first.");
        return result;
      }

      // Get existing vendors
      const existingVendors = await db.select({ id: vendors.id }).from(vendors);
      if (existingVendors.length === 0) {
        result.errors.push("No vendors found. Seed vendors first.");
        return result;
      }

      const vendorIds = existingVendors.map((v) => v.id);

      // Create lots if needed
      const existingLots = await db.select({ id: lots.id }).from(lots);
      let lotIds: number[] = existingLots.map((l) => l.id);

      if (lotIds.length === 0) {
        // Create lots (roughly 1 lot per 5 batches)
        const lotsNeeded = Math.max(1, Math.ceil(count / 5));
        for (let i = 0; i < lotsNeeded; i++) {
          const lotDate = faker.date.between({
            from: new Date(2024, 0, 1),
            to: new Date(),
          });
          const vendorId = vendorIds[i % vendorIds.length];

          const now = new Date();
          const [inserted] = await db.insert(lots).values({
            code: `LOT-${String(i + 1).padStart(5, "0")}`,
            vendorId,
            date: lotDate,
            notes: faker.lorem.sentence(),
            createdAt: now,
            updatedAt: now,
          });
          lotIds.push(inserted.insertId);
        }
        seedLogger.foreignKeyResolved("batches", "lotId", "lots", lotIds.length);
      }

      const flowerProducts = existingProducts.filter((p) => p.category === "Flower");
      const nonFlowerProducts = existingProducts.filter((p) => p.category !== "Flower");

      const records: BatchData[] = [];
      const batchSize = 50;

      // Generate batches
      for (let i = 0; i < count; i++) {
        // 90% flower batches, 10% non-flower
        const isFlower = Math.random() < 0.9;
        const productPool = isFlower && flowerProducts.length > 0 ? flowerProducts : nonFlowerProducts.length > 0 ? nonFlowerProducts : existingProducts;
        const product = productPool[i % productPool.length];
        const lotId = lotIds[i % lotIds.length];

        const batch = generateBatch(i, product.id, lotId, isFlower || product.category === "Flower");

        const validation = await validator.validateColumns("batches", batch);
        if (!validation.valid) {
          result.errors.push(
            `Batch ${i}: ${validation.errors.map((e) => e.message).join(", ")}`
          );
          result.skipped++;
          continue;
        }

        records.push(batch);
      }

      // Insert in batches
      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);
        await db.insert(batches).values(batch);
        result.inserted += batch.length;

        if (count > 100 && (i + batchSize) % 100 === 0) {
          seedLogger.operationProgress(
            "seed:batches",
            Math.min(i + batchSize, records.length),
            records.length
          );
        }
      }

      result.duration = Date.now() - startTime;
      seedLogger.tableSeeded("batches", result.inserted, result.duration);

      return result;
    } catch (error) {
      result.duration = Date.now() - startTime;
      result.errors.push(error instanceof Error ? error.message : String(error));
      seedLogger.operationFailure(
        "seed:batches",
        error instanceof Error ? error : new Error(String(error)),
        { inserted: result.inserted }
      );
      return result;
    }
  });
}



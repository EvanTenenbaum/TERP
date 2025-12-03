/**
 * Augment Inventory Movements
 * 
 * Links inventory movements to actual batches and ensures movements reference valid inventory records.
 * Part of DATA-002-AUGMENT: Augment Seeded Data for Realistic Relationships
 * 
 * Usage: pnpm tsx scripts/augment-inventory-movements.ts
 */

import { config } from "dotenv";
config();
if (!process.env.DATABASE_URL) {
  config({ path: ".env.production" });
}

import { db } from "./db-sync.js";
import { inventoryMovements, batches } from "../drizzle/schema.js";
import { sql, eq, isNull } from "drizzle-orm";

/**
 * Get inventory movements with invalid batch_id
 */
async function getInvalidMovements(): Promise<Array<{ id: number; batchId: number | null }>> {
  const result = await db.execute(sql`
    SELECT im.id, im.batchId
    FROM inventoryMovements im
    LEFT JOIN batches b ON im.batchId = b.id
    WHERE b.id IS NULL
    LIMIT 100
  `);

  const rows = Array.isArray(result) && result.length > 0 ? result[0] : result;
  return (rows as Array<{ id: number; batchId: number | null }>) || [];
}

/**
 * Get a random valid batch ID
 */
async function getRandomBatchId(): Promise<number | null> {
  const result = await db.execute(sql`
    SELECT id FROM batches
    WHERE batchStatus = 'LIVE' AND deletedAt IS NULL
    ORDER BY RAND()
    LIMIT 1
  `);

  const rows = Array.isArray(result) && result.length > 0 ? result[0] : result;
  const batch = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
  return batch ? (batch as { id: number }).id : null;
}

/**
 * Fix invalid movements by linking them to valid batches
 */
async function fixInvalidMovements(): Promise<void> {
  console.log("🔧 Augmenting Inventory Movements...\n");

  try {
    const invalidMovements = await getInvalidMovements();
    
    console.log(`📊 Found ${invalidMovements.length} movements with invalid batch_id\n`);

    if (invalidMovements.length === 0) {
      console.log("✅ All inventory movements have valid batch references!");
      return;
    }

    let successCount = 0;
    let errorCount = 0;

    for (const movement of invalidMovements) {
      try {
        const batchId = await getRandomBatchId();
        
        if (!batchId) {
          console.log(`  ⚠️  No valid batches available for movement ${movement.id}`);
          errorCount++;
          continue;
        }

        await db.execute(sql`
          UPDATE inventoryMovements
          SET batchId = ${batchId},
              updatedAt = NOW()
          WHERE id = ${movement.id}
        `);

        successCount++;
        console.log(`  ✅ Movement ${movement.id} linked to batch ${batchId}`);
      } catch (error) {
        errorCount++;
        console.error(`  ❌ Error fixing movement ${movement.id}:`, error);
      }
    }

    console.log("\n" + "=".repeat(60));
    console.log(`✅ Augmentation complete!`);
    console.log(`   Success: ${successCount}`);
    console.log(`   Errors: ${errorCount}`);
    console.log("=".repeat(60));
  } catch (error) {
    console.error("❌ Augmentation failed:", error);
    process.exit(1);
  }
}

// Main execution
fixInvalidMovements()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });

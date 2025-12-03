/**
 * Fix Temporal Coherence
 * 
 * Ensures dates make chronological sense across related records.
 * Part of DATA-002-AUGMENT: Augment Seeded Data for Realistic Relationships
 * 
 * Usage: pnpm tsx scripts/fix-temporal-coherence.ts
 */

import { config } from "dotenv";
config();
if (!process.env.DATABASE_URL) {
  config({ path: ".env.production" });
}

import { db } from "./db-sync.js";
import { sql } from "drizzle-orm";

/**
 * Fix order → invoice → payment date sequence
 */
async function fixOrderInvoicePaymentDates(): Promise<void> {
  console.log("🔧 Fixing order → invoice → payment date sequence...\n");

  try {
    // Fix invoices that are dated before their orders
    await db.execute(sql`
      UPDATE invoices i
      INNER JOIN orders o ON i.referenceId = o.id AND i.referenceType = 'ORDER'
      SET i.invoiceDate = o.created_at,
          i.dueDate = DATE_ADD(o.created_at, INTERVAL 30 DAY),
          i.updatedAt = NOW()
      WHERE i.invoiceDate < o.created_at
    `);

    // Fix payments that are dated before their invoices
    await db.execute(sql`
      UPDATE payments p
      INNER JOIN invoices i ON p.invoiceId = i.id
      SET p.paymentDate = i.invoiceDate,
          p.updatedAt = NOW()
      WHERE p.paymentDate < i.invoiceDate
    `);

    console.log("  ✅ Fixed order → invoice → payment date sequence\n");
  } catch (error) {
    console.error("  ❌ Error fixing date sequence:", error);
  }
}

/**
 * Fix batch → inventory movement date sequence
 */
async function fixBatchMovementDates(): Promise<void> {
  console.log("🔧 Fixing batch → inventory movement date sequence...\n");

  try {
    // Fix movements that are dated before their batches
    await db.execute(sql`
      UPDATE inventoryMovements im
      INNER JOIN batches b ON im.batchId = b.id
      SET im.createdAt = b.createdAt,
          im.updatedAt = NOW()
      WHERE im.createdAt < b.createdAt
    `);

    console.log("  ✅ Fixed batch → inventory movement date sequence\n");
  } catch (error) {
    console.error("  ❌ Error fixing movement dates:", error);
  }
}

/**
 * Main function
 */
async function fixTemporalCoherence(): Promise<void> {
  console.log("🔧 Fixing Temporal Coherence...\n");

  try {
    await fixOrderInvoicePaymentDates();
    await fixBatchMovementDates();

    console.log("=".repeat(60));
    console.log(`✅ Temporal coherence fixes complete!`);
    console.log("=".repeat(60));
  } catch (error) {
    console.error("❌ Fix failed:", error);
    process.exit(1);
  }
}

// Main execution
fixTemporalCoherence()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });

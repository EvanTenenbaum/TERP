/**
 * TER-261: Fix Script — LIVE Batches with Bad Quantity Fields
 *
 * MODE: RED (PRODUCTION DATABASE WRITE)
 * ⚠️  REQUIRES HUMAN APPROVAL BEFORE RUNNING IN PRODUCTION
 *
 * Purpose: Fix batches with batchStatus = 'LIVE' that have inconsistent
 * quantity fields. For each bad batch:
 *   1. Logs the current state (full audit trail)
 *   2. Applies conservative fix (clamp negatives to 0, fix reservedQty)
 *   3. Logs the new state
 *
 * Fix strategy:
 *   - Negative onHandQty → clamp to 0 (conservative; flag for manual review)
 *   - Negative sampleQty → clamp to 0
 *   - Negative reservedQty → clamp to 0
 *   - reservedQty > onHandQty → set reservedQty = onHandQty
 *   - onHandQty = 0 AND reservedQty > 0 → set reservedQty = 0
 *
 * Idempotent: Safe to run twice (all operations are idempotent).
 *
 * Rollback: Original values are logged to stdout. To rollback manually:
 *   UPDATE batches SET onHandQty=<orig>, sampleQty=<orig>, reservedQty=<orig>
 *   WHERE id=<batch_id>;
 *
 * Usage (via DO App Platform job):
 *   DATABASE_URL=<url> npx ts-node scripts/migrations/ter-261-fix-live-batch-qty.ts
 */

import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { sql, eq, and, isNull } from "drizzle-orm";
import { batches } from "../../drizzle/schema";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("ERROR: DATABASE_URL is required");
    process.exit(1);
  }

  const connection = await mysql.createConnection(databaseUrl);
  const db = drizzle(connection);

  console.info("=== TER-261 FIX: LIVE Batches with Bad Qty ===");
  console.info(`Timestamp: ${new Date().toISOString()}`);
  console.warn("RED MODE: Writing to production database");

  // Find all LIVE batches with qty issues
  const liveBatches = await db
    .select({
      id: batches.id,
      code: batches.code,
      sku: batches.sku,
      batchStatus: batches.batchStatus,
      onHandQty: batches.onHandQty,
      sampleQty: batches.sampleQty,
      reservedQty: batches.reservedQty,
    })
    .from(batches)
    .where(
      sql`${batches.batchStatus} = 'LIVE' AND ${batches.deletedAt} IS NULL`
    );

  const badBatches = liveBatches.filter(batch => {
    const onHand = parseFloat(batch.onHandQty ?? "0");
    const sample = parseFloat(batch.sampleQty ?? "0");
    const reserved = parseFloat(batch.reservedQty ?? "0");
    return (
      onHand < 0 ||
      sample < 0 ||
      reserved < 0 ||
      reserved > onHand ||
      (onHand === 0 && reserved > 0)
    );
  });

  if (badBatches.length === 0) {
    console.info("No batches need fixing. Exiting.");
    await connection.end();
    process.exit(0);
  }

  console.info(`Found ${badBatches.length} batch(es) to fix:`);

  let fixCount = 0;
  let errorCount = 0;

  for (const batch of badBatches) {
    const origOnHand = parseFloat(batch.onHandQty ?? "0");
    const origSample = parseFloat(batch.sampleQty ?? "0");
    const origReserved = parseFloat(batch.reservedQty ?? "0");

    // Calculate corrected values
    const newOnHand = Math.max(0, origOnHand);
    const newSample = Math.max(0, origSample);
    let newReserved = Math.max(0, origReserved);

    // reservedQty cannot exceed onHandQty
    if (newReserved > newOnHand) {
      newReserved = newOnHand;
    }

    // Log BEFORE state for audit trail / rollback reference
    console.info(
      `--- Batch ID: ${batch.id} | Code: ${batch.code} | SKU: ${batch.sku ?? "N/A"} ---`
    );
    console.info(
      `  BEFORE: onHandQty=${batch.onHandQty} sampleQty=${batch.sampleQty} reservedQty=${batch.reservedQty}`
    );
    console.info(
      `  AFTER:  onHandQty=${newOnHand.toFixed(4)} sampleQty=${newSample.toFixed(4)} reservedQty=${newReserved.toFixed(4)}`
    );
    console.info(
      `  ROLLBACK SQL: UPDATE batches SET onHandQty='${batch.onHandQty}', sampleQty='${batch.sampleQty}', reservedQty='${batch.reservedQty}' WHERE id=${batch.id};`
    );

    try {
      // Guard against concurrent soft-delete between SELECT and UPDATE
      await db
        .update(batches)
        .set({
          onHandQty: newOnHand.toFixed(4),
          sampleQty: newSample.toFixed(4),
          reservedQty: newReserved.toFixed(4),
        })
        .where(and(eq(batches.id, batch.id), isNull(batches.deletedAt)));

      console.info(`  Fixed batch ${batch.id} successfully`);
      fixCount++;
    } catch (err) {
      console.error(`  ERROR fixing batch ${batch.id}:`, err);
      errorCount++;
    }
  }

  console.info("=== SUMMARY ===");
  console.info(`Total batches processed: ${badBatches.length}`);
  console.info(`Successfully fixed: ${fixCount}`);
  console.info(`Errors: ${errorCount}`);
  console.info(`Timestamp: ${new Date().toISOString()}`);

  await connection.end();

  if (errorCount > 0) {
    console.error(
      `FAILED: ${errorCount} error(s) occurred. Review logs above.`
    );
    process.exit(1);
  }

  console.info("All fixes applied successfully.");
  process.exit(0);
}

main().catch(err => {
  console.error("FATAL ERROR:", err);
  process.exit(1);
});

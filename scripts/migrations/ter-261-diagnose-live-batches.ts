/**
 * TER-261: Diagnostic Script — LIVE Batches with Bad Quantity Fields
 *
 * MODE: READ-ONLY — no data is modified
 *
 * Purpose: Identify batches with batchStatus = 'LIVE' that have inconsistent
 * or invalid quantity fields (onHandQty, reservedQty, sampleQty).
 *
 * Inconsistency patterns checked:
 *   1. onHandQty < 0 (violates non-negative constraint)
 *   2. sampleQty < 0
 *   3. reservedQty < 0
 *   4. reservedQty > onHandQty (reserved more than on hand)
 *   5. onHandQty = 0 AND reservedQty > 0 (reserved with no inventory)
 *
 * Usage (via DO App Platform job):
 *   DATABASE_URL=<url> npx ts-node scripts/migrations/ter-261-diagnose-live-batches.ts
 */

import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { sql } from "drizzle-orm";
import { batches } from "../../drizzle/schema";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("ERROR: DATABASE_URL is required");
    process.exit(1);
  }

  const connection = await mysql.createConnection(databaseUrl);
  const db = drizzle(connection);

  console.info("=== TER-261 DIAGNOSTIC: LIVE Batches with Bad Qty ===");
  console.info(`Timestamp: ${new Date().toISOString()}`);
  console.info("");

  // Find all LIVE batches
  const liveBatches = await db
    .select({
      id: batches.id,
      code: batches.code,
      sku: batches.sku,
      batchStatus: batches.batchStatus,
      onHandQty: batches.onHandQty,
      sampleQty: batches.sampleQty,
      reservedQty: batches.reservedQty,
      deletedAt: batches.deletedAt,
    })
    .from(batches)
    .where(
      sql`${batches.batchStatus} = 'LIVE' AND ${batches.deletedAt} IS NULL`
    );

  console.info(`Total LIVE batches found: ${liveBatches.length}`);
  console.info("");

  const badBatches: Array<{
    id: number;
    code: string;
    sku: string | null;
    onHandQty: string | null;
    sampleQty: string | null;
    reservedQty: string | null;
    issues: string[];
  }> = [];

  for (const batch of liveBatches) {
    const issues: string[] = [];
    const onHand = parseFloat(batch.onHandQty ?? "0");
    const sample = parseFloat(batch.sampleQty ?? "0");
    const reserved = parseFloat(batch.reservedQty ?? "0");

    if (onHand < 0) issues.push(`onHandQty is negative: ${onHand}`);
    if (sample < 0) issues.push(`sampleQty is negative: ${sample}`);
    if (reserved < 0) issues.push(`reservedQty is negative: ${reserved}`);
    if (reserved > onHand)
      issues.push(`reservedQty (${reserved}) exceeds onHandQty (${onHand})`);
    if (onHand === 0 && reserved > 0)
      issues.push(`reservedQty (${reserved}) > 0 but onHandQty is 0`);

    if (issues.length > 0) {
      badBatches.push({
        id: batch.id,
        code: batch.code ?? "UNKNOWN",
        sku: batch.sku,
        onHandQty: batch.onHandQty,
        sampleQty: batch.sampleQty,
        reservedQty: batch.reservedQty,
        issues,
      });
    }
  }

  if (badBatches.length === 0) {
    console.info("No batches with bad qty found.");
  } else {
    console.warn(`Found ${badBatches.length} batch(es) with bad qty:`);
    console.info("");

    for (const b of badBatches) {
      console.info(
        `  Batch ID: ${b.id} | Code: ${b.code} | SKU: ${b.sku ?? "N/A"}`
      );
      console.info(
        `    onHandQty: ${b.onHandQty} | sampleQty: ${b.sampleQty} | reservedQty: ${b.reservedQty}`
      );
      for (const issue of b.issues) {
        console.warn(`    ISSUE: ${issue}`);
      }
    }

    console.info("=== SUMMARY ===");
    console.info(
      `Batch IDs with issues: ${badBatches.map(b => b.id).join(", ")}`
    );
    console.info("To fix, run: ter-261-fix-live-batch-qty.ts");
    console.warn(
      "RED MODE: Requires human approval before running fix script in production."
    );
  }

  await connection.end();
}

main().catch(err => {
  console.error("FATAL ERROR:", err);
  process.exit(1);
});

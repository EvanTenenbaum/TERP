#!/usr/bin/env npx tsx
/**
 * TER-261: Data cleanup — LIVE batches with bad (negative or zero) onHandQty
 *
 * Background: A double-counting bug in totalQty computation (fixed in Wave 8
 * commit 5e4b3c4) may have left batches with inconsistent quantity state.
 * This script finds LIVE batches where onHandQty <= 0 and either:
 *   - Sets status to SOLD_OUT (if qty is zero/negative and no reserved qty)
 *   - Zeroes out negative onHandQty (floor at 0) if reserved qty is present
 *
 * Usage:
 *   npx tsx scripts/fix-ter261-bad-qty-batches.ts --dry-run
 *   npx tsx scripts/fix-ter261-bad-qty-batches.ts --confirm-production
 *
 * Run via DO temporary job per docs/runbooks/PRODUCTION_MIGRATION_RUNBOOK.md
 *
 * DB column mapping (from drizzle/schema.ts):
 *   code        → varchar("code")       (NOT "batchCode")
 *   batchStatus → mysqlEnum("batchStatus") (NOT "status")
 *   onHandQty   → decimal("onHandQty")
 *   reservedQty → decimal("reservedQty")
 *   quarantineQty → decimal("quarantineQty")
 *   productId   → int("productId")
 */

import mysql from "mysql2/promise";
import { config } from "dotenv";

config({ path: ".env.production" });

const DATABASE_URL = process.env.DATABASE_URL ?? "";
const DRY_RUN = !process.argv.includes("--confirm-production");

interface BadBatch {
  id: number;
  code: string;
  batchStatus: string;
  onHandQty: string;
  reservedQty: string;
  quarantineQty: string;
  productId: number;
}

async function main() {
  if (!DATABASE_URL) {
    console.error("❌ DATABASE_URL not set");
    process.exit(1);
  }

  const connection = await mysql.createConnection(DATABASE_URL);

  try {
    console.log(DRY_RUN ? "🔍 DRY RUN — no changes will be made" : "⚠️  PRODUCTION MODE — applying fixes");
    console.log("");

    // Step 1: Diagnose — find LIVE batches with bad qty
    const [badBatches] = await connection.execute<mysql.RowDataPacket[]>(`
      SELECT
        id,
        code,
        batchStatus,
        onHandQty,
        reservedQty,
        quarantineQty,
        productId
      FROM batches
      WHERE batchStatus = 'LIVE'
        AND CAST(onHandQty AS DECIMAL(15,4)) <= 0
      ORDER BY id
    `);

    console.log(`Found ${badBatches.length} LIVE batch(es) with onHandQty <= 0:`);
    console.log("");

    if (badBatches.length === 0) {
      console.log("✅ No bad qty batches found — nothing to do.");
      return;
    }

    // Print diagnostic table
    console.log("  ID   | code                | onHandQty | reservedQty | quarantineQty | Action");
    console.log("  -----|---------------------|-----------|-------------|---------------|--------");

    const toSoldOut: number[] = [];
    const toZero: number[] = [];

    for (const batch of badBatches as BadBatch[]) {
      const onHand = parseFloat(batch.onHandQty || "0");
      const reserved = parseFloat(batch.reservedQty || "0");
      const quarantine = parseFloat(batch.quarantineQty || "0");

      let action: string;
      if (reserved > 0 || quarantine > 0) {
        // Can't mark SOLD_OUT if there's reserved/quarantine qty — floor to 0
        toZero.push(batch.id);
        action = "ZERO onHandQty (has reserved/quarantine)";
      } else {
        // No activity — mark as SOLD_OUT
        toSoldOut.push(batch.id);
        action = "→ SOLD_OUT";
      }

      console.log(
        `  ${String(batch.id).padEnd(5)}| ${String(batch.code).padEnd(20)}| ${String(onHand).padEnd(10)}| ${String(reserved).padEnd(12)}| ${String(quarantine).padEnd(14)}| ${action}`
      );
    }

    console.log("");
    console.log(`Plan: ${toSoldOut.length} → SOLD_OUT, ${toZero.length} onHandQty floored to 0`);

    if (DRY_RUN) {
      console.log("\n🔍 DRY RUN complete — run with --confirm-production to apply");
      return;
    }

    // Step 2: Apply fixes
    if (toSoldOut.length > 0) {
      await connection.execute(
        `UPDATE batches
         SET batchStatus = 'SOLD_OUT', onHandQty = '0.0000', updatedAt = NOW()
         WHERE id IN (${toSoldOut.map(() => "?").join(",")})`,
        toSoldOut
      );
      console.log(`✅ Marked ${toSoldOut.length} batch(es) as SOLD_OUT`);
    }

    if (toZero.length > 0) {
      await connection.execute(
        `UPDATE batches
         SET onHandQty = '0.0000', updatedAt = NOW()
         WHERE id IN (${toZero.map(() => "?").join(",")})`,
        toZero
      );
      console.log(`✅ Floored onHandQty to 0 for ${toZero.length} batch(es) with reserved/quarantine qty`);
    }

    // Step 3: Verify
    const [afterFix] = await connection.execute<mysql.RowDataPacket[]>(`
      SELECT COUNT(*) AS cnt
      FROM batches
      WHERE batchStatus = 'LIVE'
        AND CAST(onHandQty AS DECIMAL(15,4)) <= 0
    `);
    const remaining = (afterFix[0] as { cnt: number }).cnt;
    if (remaining === 0) {
      console.log("\n✅ Verification passed — no more LIVE batches with bad qty");
    } else {
      console.log(`\n⚠️  ${remaining} LIVE batch(es) still have bad qty after fix — manual review needed`);
      process.exit(1);
    }
  } finally {
    await connection.end();
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});

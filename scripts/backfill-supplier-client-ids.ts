#!/usr/bin/env npx tsx
/* eslint-disable no-console */
/**
 * Backfill Supplier Client IDs
 *
 * Updates the lots table to reference migrated client IDs via supplier_client_id.
 * Uses the supplier_profiles.legacy_vendor_id mapping.
 *
 * Usage:
 *   npx tsx scripts/backfill-supplier-client-ids.ts --dry-run
 *   npx tsx scripts/backfill-supplier-client-ids.ts --confirm-production
 */

import mysql from "mysql2/promise";
import { config } from "dotenv";

config({ path: ".env.production" });

const PROD_DATABASE_URL = process.env.DATABASE_URL || "";

interface ColumnRow {
  COLUMN_NAME: string;
}

interface VendorMapping {
  legacy_vendor_id: number;
  client_id: number;
}

interface LotRow {
  id: number;
  vendorId: number;
}

interface VerificationRow {
  total: number;
  with_client_id: number;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const confirmProduction = args.includes("--confirm-production");

  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║     BACKFILL SUPPLIER CLIENT IDS                           ║");
  console.log(
    "╚════════════════════════════════════════════════════════════╝\n"
  );

  if (!confirmProduction && !dryRun) {
    console.error("❌ ERROR: Must specify --dry-run or --confirm-production");
    process.exit(1);
  }

  const connection = await mysql.createConnection({
    uri: PROD_DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    // Step 1: Check if supplier_client_id column exists on lots
    const [lotsColumns] = (await connection.query(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'defaultdb' AND TABLE_NAME = 'lots' AND COLUMN_NAME = 'supplier_client_id'"
    )) as [ColumnRow[], unknown];

    if (lotsColumns.length === 0) {
      console.log("Adding supplier_client_id column to lots table...");
      if (!dryRun) {
        await connection.query(
          "ALTER TABLE lots ADD COLUMN supplier_client_id INT NULL AFTER vendorId"
        );
        await connection.query(
          "CREATE INDEX idx_lots_supplier_client_id ON lots (supplier_client_id)"
        );
        console.log("✅ Column added");
      } else {
        console.log("[DRY RUN] Would add supplier_client_id column to lots");
      }
    } else {
      console.log("✅ supplier_client_id column already exists on lots");
    }

    // Step 2: Get vendor to client mapping
    const [mappings] = (await connection.query(`
      SELECT sp.legacy_vendor_id, sp.client_id
      FROM supplier_profiles sp
      WHERE sp.legacy_vendor_id IS NOT NULL
    `)) as [VendorMapping[], unknown];

    console.log(`\nFound ${mappings.length} vendor-to-client mappings`);

    // Step 3: Update lots table (exclude soft-deleted rows)
    let lotsQuery = `SELECT l.id, l.vendorId FROM lots l WHERE l.vendorId IS NOT NULL AND l.deleted_at IS NULL`;
    if (lotsColumns.length > 0) {
      lotsQuery += ` AND (l.supplier_client_id IS NULL OR l.supplier_client_id = 0)`;
    }
    const [lotsToUpdate] = (await connection.query(lotsQuery)) as [
      LotRow[],
      unknown,
    ];

    console.log(`\nLots to update: ${lotsToUpdate.length}`);

    if (lotsToUpdate.length > 0) {
      const mappingMap = new Map<number, number>(
        mappings.map(m => [m.legacy_vendor_id, m.client_id])
      );

      let updated = 0;
      let notFound = 0;

      for (const lot of lotsToUpdate) {
        const clientId = mappingMap.get(lot.vendorId);
        if (clientId) {
          if (!dryRun) {
            await connection.query(
              "UPDATE lots SET supplier_client_id = ? WHERE id = ?",
              [clientId, lot.id]
            );
          }
          updated++;
        } else {
          notFound++;
          console.log(
            `  ⚠️ No mapping for vendor_id=${lot.vendorId} (lot_id=${lot.id})`
          );
        }
      }

      console.log(
        `\n${dryRun ? "[DRY RUN] Would update" : "Updated"}: ${updated} lots`
      );
      if (notFound > 0) {
        console.log(`⚠️ ${notFound} lots have unmapped vendor IDs`);
      }
    }

    // Step 4: Verify
    if (!dryRun) {
      const [verification] = (await connection.query(`
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN supplier_client_id IS NOT NULL THEN 1 ELSE 0 END) as with_client_id
        FROM lots
      `)) as [VerificationRow[], unknown];

      console.log(
        `\n✅ Verification: ${verification[0].with_client_id}/${verification[0].total} lots have supplier_client_id`
      );
    }

    console.log("\n✅ Backfill complete!");
  } catch (error: unknown) {
    console.error(
      "❌ Error:",
      error instanceof Error ? error.message : String(error)
    );
    process.exit(1);
  } finally {
    await connection.end();
  }
}

main();

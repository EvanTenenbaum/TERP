#!/usr/bin/env npx tsx
/**
 * TER-235: Backfill supplier_client_id columns
 *
 * Populates the new supplierClientId / clientId columns using the
 * supplierProfiles.legacyVendorId -> clientId mapping.
 *
 * Usage:
 *   npx tsx scripts/backfill-ter235-supplier-client-ids.ts --dry-run
 *   npx tsx scripts/backfill-ter235-supplier-client-ids.ts --confirm-production
 *
 * Tables backfilled:
 *   - purchaseOrderItems.supplier_client_id (via parent PO's vendorId)
 *   - vendorNotes.client_id (via vendorNotes.vendorId)
 *
 * NOTE: products table never had a vendorId column, so no backfill needed.
 * Products get supplierClientId set at creation time going forward.
 */

import mysql from "mysql2/promise";
import { config } from "dotenv";

config({ path: ".env.production" });

const DATABASE_URL = process.env.DATABASE_URL ?? "";

interface VendorMapping {
  legacyVendorId: number;
  clientId: number;
}

interface RowWithId {
  id: number;
  vendorId: number;
}

interface CoverageRow {
  total: number;
  with_supplier_client_id: number;
  still_missing: number;
}

interface VendorNotesCoverageRow {
  total: number;
  with_client_id: number;
  still_missing: number;
}

async function backfillPurchaseOrderItems(
  connection: mysql.Connection,
  mappingMap: Map<number, number>,
  dryRun: boolean
): Promise<void> {
  console.log("\n--- purchaseOrderItems.supplier_client_id ---");

  // Select items where supplier_client_id is NULL but parent PO has a vendorId
  const [rows] = (await connection.query(`
    SELECT poi.id, po.vendorId
    FROM purchaseOrderItems poi
    JOIN purchaseOrders po ON poi.purchaseOrderId = po.id
    WHERE poi.supplier_client_id IS NULL
      AND po.vendorId IS NOT NULL
      AND poi.deletedAt IS NULL
  `)) as [RowWithId[], unknown];

  console.log(`  Rows needing backfill: ${rows.length}`);

  let updated = 0;
  let noMappingFound = 0;

  for (const row of rows) {
    const clientId = mappingMap.get(row.vendorId);
    if (clientId !== undefined) {
      if (!dryRun) {
        await connection.query(
          "UPDATE purchaseOrderItems SET supplier_client_id = ? WHERE id = ?",
          [clientId, row.id]
        );
      }
      updated++;
    } else {
      console.warn(
        `  ⚠️  No mapping for vendorId=${row.vendorId} (purchaseOrderItem id=${row.id})`
      );
      noMappingFound++;
    }
  }

  console.log(
    `  ${dryRun ? "[DRY RUN] Would update" : "Updated"}: ${updated} rows`
  );
  if (noMappingFound > 0) {
    console.log(
      `  ⚠️  ${noMappingFound} rows have unmapped vendorId (pre-existing data gap)`
    );
  }
}

async function backfillVendorNotes(
  connection: mysql.Connection,
  mappingMap: Map<number, number>,
  dryRun: boolean
): Promise<void> {
  console.log("\n--- vendorNotes.client_id ---");

  const [rows] = (await connection.query(`
    SELECT id, vendorId
    FROM vendorNotes
    WHERE client_id IS NULL
      AND vendorId IS NOT NULL
      AND deleted_at IS NULL
  `)) as [RowWithId[], unknown];

  console.log(`  Rows needing backfill: ${rows.length}`);

  let updated = 0;
  let noMappingFound = 0;

  for (const row of rows) {
    const clientId = mappingMap.get(row.vendorId);
    if (clientId !== undefined) {
      if (!dryRun) {
        await connection.query(
          "UPDATE vendorNotes SET client_id = ? WHERE id = ?",
          [clientId, row.id]
        );
      }
      updated++;
    } else {
      console.warn(
        `  ⚠️  No mapping for vendorId=${row.vendorId} (vendorNote id=${row.id})`
      );
      noMappingFound++;
    }
  }

  console.log(
    `  ${dryRun ? "[DRY RUN] Would update" : "Updated"}: ${updated} rows`
  );
  if (noMappingFound > 0) {
    console.log(
      `  ⚠️  ${noMappingFound} rows have unmapped vendorId (pre-existing data gap)`
    );
  }
}

async function printVerificationReport(
  connection: mysql.Connection
): Promise<void> {
  console.log("\n=== Verification Report ===");

  // purchaseOrderItems coverage
  const [poiRows] = (await connection.query(`
    SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN supplier_client_id IS NOT NULL THEN 1 ELSE 0 END) AS with_supplier_client_id,
      SUM(CASE WHEN supplier_client_id IS NULL AND purchaseOrderId IN (
        SELECT id FROM purchaseOrders WHERE vendorId IS NOT NULL
      ) THEN 1 ELSE 0 END) AS still_missing
    FROM purchaseOrderItems
  `)) as [CoverageRow[], unknown];
  const poi = poiRows[0];
  console.log(
    `purchaseOrderItems: total=${poi.total}, with_supplier_client_id=${poi.with_supplier_client_id}, still_missing=${poi.still_missing}`
  );

  // vendorNotes coverage
  const [notesRows] = (await connection.query(`
    SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN client_id IS NOT NULL THEN 1 ELSE 0 END) AS with_client_id,
      SUM(CASE WHEN client_id IS NULL THEN 1 ELSE 0 END) AS still_missing
    FROM vendorNotes WHERE deleted_at IS NULL
  `)) as [VendorNotesCoverageRow[], unknown];
  const notes = notesRows[0];
  console.log(
    `vendorNotes: total=${notes.total}, with_client_id=${notes.with_client_id}, still_missing=${notes.still_missing}`
  );
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const confirmProduction = args.includes("--confirm-production");

  if (!dryRun && !confirmProduction) {
    console.error("ERROR: Must specify --dry-run or --confirm-production");
    process.exit(1);
  }

  console.log("TER-235: Backfill supplier_client_id columns");
  console.log(`Mode: ${dryRun ? "DRY RUN" : "PRODUCTION"}\n`);

  if (!DATABASE_URL) {
    console.error(
      "ERROR: DATABASE_URL is not set. Check .env.production or environment."
    );
    process.exit(1);
  }

  const connection = await mysql.createConnection({
    uri: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    // Load vendor -> client mapping from supplier_profiles
    const [rows] = (await connection.query(
      "SELECT legacy_vendor_id AS legacyVendorId, client_id AS clientId FROM supplier_profiles WHERE legacy_vendor_id IS NOT NULL"
    )) as [VendorMapping[], unknown];

    const mappingMap = new Map<number, number>(
      rows.map(r => [r.legacyVendorId, r.clientId])
    );
    console.log(`Loaded ${mappingMap.size} vendor-to-client mappings`);

    // Table 1: purchaseOrderItems
    await backfillPurchaseOrderItems(connection, mappingMap, dryRun);

    // Table 2: vendorNotes
    await backfillVendorNotes(connection, mappingMap, dryRun);

    // NOTE: products table has no vendorId column — no backfill needed

    // Verification report
    await printVerificationReport(connection);

    console.log("\nBackfill complete.");
  } finally {
    await connection.end();
  }
}

main().catch((error: unknown) => {
  console.error(
    "Fatal error:",
    error instanceof Error ? error.message : String(error)
  );
  process.exit(1);
});

#!/usr/bin/env npx tsx
/* eslint-disable no-console */
/**
 * TER-235: Add missing columns for vendor→client migration
 *
 * Adds columns that exist in the Drizzle schema but are missing from the database:
 *   - purchaseOrderItems.supplier_client_id (INT NULL, FK → clients.id)
 *   - vendorNotes.client_id (INT NULL, FK → clients.id)
 *
 * These columns are required before running backfill-ter235-supplier-client-ids.ts.
 *
 * Usage:
 *   npx tsx scripts/apply-ter235-column-migrations.ts --dry-run
 *   npx tsx scripts/apply-ter235-column-migrations.ts --confirm-production
 */

import mysql from "mysql2/promise";
import { config } from "dotenv";

config({ path: ".env.production" });

const DATABASE_URL = process.env.DATABASE_URL ?? "";

interface ColumnCheck {
  table: string;
  column: string;
  addColumnSql: string;
  addIndexSql: string;
  addFkSql: string;
}

const MIGRATIONS: ColumnCheck[] = [
  {
    table: "purchaseOrderItems",
    column: "supplier_client_id",
    addColumnSql:
      "ALTER TABLE purchaseOrderItems ADD COLUMN supplier_client_id INT NULL",
    addIndexSql:
      "CREATE INDEX idx_poi_supplier_client_id ON purchaseOrderItems (supplier_client_id)",
    addFkSql:
      "ALTER TABLE purchaseOrderItems ADD CONSTRAINT fk_poi_supplier_client_id FOREIGN KEY (supplier_client_id) REFERENCES clients(id) ON DELETE RESTRICT",
  },
  {
    table: "vendorNotes",
    column: "client_id",
    addColumnSql: "ALTER TABLE vendorNotes ADD COLUMN client_id INT NULL",
    addIndexSql:
      "CREATE INDEX idx_vendor_notes_client_id ON vendorNotes (client_id)",
    addFkSql:
      "ALTER TABLE vendorNotes ADD CONSTRAINT fk_vendor_notes_client_id FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE",
  },
];

async function columnExists(
  connection: mysql.Connection,
  table: string,
  column: string
): Promise<boolean> {
  const [rows] = (await connection.query(
    "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?",
    [table, column]
  )) as [Array<Record<string, unknown>>, unknown];
  return rows.length > 0;
}

async function indexExists(
  connection: mysql.Connection,
  table: string,
  indexName: string
): Promise<boolean> {
  const [rows] = (await connection.query(
    "SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?",
    [table, indexName]
  )) as [Array<Record<string, unknown>>, unknown];
  return rows.length > 0;
}

async function fkExists(
  connection: mysql.Connection,
  constraintName: string
): Promise<boolean> {
  const [rows] = (await connection.query(
    "SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND CONSTRAINT_NAME = ? AND CONSTRAINT_TYPE = 'FOREIGN KEY'",
    [constraintName]
  )) as [Array<Record<string, unknown>>, unknown];
  return rows.length > 0;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const confirmProduction = args.includes("--confirm-production");

  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║     TER-235: ADD MISSING COLUMNS FOR VENDOR MIGRATION     ║");
  console.log("╚════════════════════════════════════════════════════════════╝");
  console.log();

  if (!dryRun && !confirmProduction) {
    console.error("ERROR: Must specify --dry-run or --confirm-production");
    process.exit(1);
  }

  if (!DATABASE_URL) {
    console.error(
      "ERROR: DATABASE_URL is not set. Check .env.production or environment."
    );
    process.exit(1);
  }

  console.log(`Mode: ${dryRun ? "DRY RUN" : "PRODUCTION"}\n`);

  const connection = await mysql.createConnection({
    uri: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    for (const migration of MIGRATIONS) {
      console.log(`--- ${migration.table}.${migration.column} ---`);

      // Check column
      const hasColumn = await columnExists(
        connection,
        migration.table,
        migration.column
      );

      if (hasColumn) {
        console.log(`  Column already exists.`);
      } else {
        // Add column
        console.log(`  Adding column...`);
        if (dryRun) {
          console.log(`  [DRY RUN] ${migration.addColumnSql}`);
        } else {
          await connection.query(migration.addColumnSql);
          console.log(`  Column added.`);
        }
      }

      // Add index (extract index name from SQL for idempotency check)
      const indexName = migration.addIndexSql.match(/CREATE INDEX (\S+)/)?.[1];
      if (indexName) {
        const hasIndex = await indexExists(
          connection,
          migration.table,
          indexName
        );
        if (hasIndex) {
          console.log(`  Index ${indexName} already exists, skipping.`);
        } else {
          console.log(`  Adding index...`);
          if (dryRun) {
            console.log(`  [DRY RUN] ${migration.addIndexSql}`);
          } else {
            await connection.query(migration.addIndexSql);
            console.log(`  Index added.`);
          }
        }
      }

      // Add FK constraint (extract constraint name for idempotency check)
      const fkName = migration.addFkSql.match(/ADD CONSTRAINT (\S+)/)?.[1];
      if (fkName) {
        const hasFk = await fkExists(connection, fkName);
        if (hasFk) {
          console.log(`  FK ${fkName} already exists, skipping.`);
        } else {
          console.log(`  Adding foreign key constraint...`);
          if (dryRun) {
            console.log(`  [DRY RUN] ${migration.addFkSql}`);
          } else {
            await connection.query(migration.addFkSql);
            console.log(`  FK constraint added.`);
          }
        }
      }

      console.log();
    }

    // Verification
    if (!dryRun) {
      console.log("=== Verification ===");
      for (const migration of MIGRATIONS) {
        const hasColumn = await columnExists(
          connection,
          migration.table,
          migration.column
        );
        console.log(
          `  ${migration.table}.${migration.column}: ${hasColumn ? "EXISTS" : "MISSING"}`
        );
      }
    }

    console.log("\nDone.");
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

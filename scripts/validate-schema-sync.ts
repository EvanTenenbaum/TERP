/**
 * DEPRECATED: This script only checks 2-3 specific known issues.
 * Use scripts/validate-schema-comprehensive.ts for full schema validation.
 *
 * This script is kept for backwards compatibility and quick checks.
 * Run: pnpm validate:schema for comprehensive validation.
 */

import { db } from "./db-sync.js";
import { sql } from "drizzle-orm";

async function validateSchemaSync() {
  console.warn(
    "⚠️  This is a basic validation script. For comprehensive validation, run: pnpm validate:schema\n"
  );
  console.log("🔍 Validating schema sync...\n");

  const issues: string[] = [];

  // Get all tables from database
  const tablesResult = await db.execute(sql`
    SELECT TABLE_NAME 
    FROM information_schema.TABLES 
    WHERE TABLE_SCHEMA = DATABASE()
  `);
  const dbTables = (tablesResult[0] as Array<{ TABLE_NAME: string }>).map(
    t => t.TABLE_NAME
  );

  console.log(`Found ${dbTables.length} tables in database\n`);

  // Check for known issues
  console.log("🔍 Checking known issues...\n");

  // Issue 1: inventoryMovements.notes (renamed from reason per migration 0030)
  const invMovColumns = await db.execute(sql`
    SELECT COLUMN_NAME
    FROM information_schema.COLUMNS
    WHERE TABLE_NAME = 'inventoryMovements'
  `);
  const invMovColumnNames = (
    invMovColumns[0] as Array<{ COLUMN_NAME: string }>
  ).map(c => c.COLUMN_NAME);

  if (!invMovColumnNames.includes("notes")) {
    issues.push("❌ inventoryMovements missing notes column (renamed from reason per migration 0030)");
  } else {
    console.log("✅ inventoryMovements.notes exists");
  }

  // Also check for adjustmentReason column (added per migration 0030)
  if (!invMovColumnNames.includes("adjustmentReason")) {
    issues.push("❌ inventoryMovements missing adjustmentReason column (added per migration 0030)");
  } else {
    console.log("✅ inventoryMovements.adjustmentReason exists");
  }

  // Check for inventoryMovementType column
  if (!invMovColumnNames.includes("inventoryMovementType")) {
    issues.push("❌ inventoryMovements missing inventoryMovementType column");
  } else {
    console.log("✅ inventoryMovements.inventoryMovementType exists");
  }

  // Issue 2: orderStatusHistory columns
  const oshColumns = await db.execute(sql`
    SELECT COLUMN_NAME
    FROM information_schema.COLUMNS
    WHERE TABLE_NAME = 'orderStatusHistory'
  `);
  const oshColumnNames = (oshColumns[0] as Array<{ COLUMN_NAME: string }>).map(
    c => c.COLUMN_NAME
  );
  console.log(`✅ orderStatusHistory columns: ${oshColumnNames.join(", ")}`);

  if (issues.length === 0) {
    console.log("\n✅ Schema is in sync!");
    return true;
  } else {
    console.log(`\n❌ Found ${issues.length} schema issues:\n`);
    issues.forEach(issue => console.log(issue));
    return false;
  }
}

validateSchemaSync()
  .then(success => process.exit(success ? 0 : 1))
  .catch(err => {
    console.error("Error:", err);
    process.exit(1);
  });

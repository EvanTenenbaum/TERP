import { db } from "./db-sync.js";
import { sql } from "drizzle-orm";

async function validateSchemaSync() {
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

  // Issue 1: inventoryMovements.reason
  const invMovColumns = await db.execute(sql`
    SELECT COLUMN_NAME
    FROM information_schema.COLUMNS
    WHERE TABLE_NAME = 'inventoryMovements'
  `);
  const invMovColumnNames = (invMovColumns[0] as Array<{ COLUMN_NAME: string }>).map(c => c.COLUMN_NAME);
  
  if (!invMovColumnNames.includes('reason')) {
    issues.push("❌ inventoryMovements missing reason column");
  } else {
    console.log("✅ inventoryMovements.reason exists");
  }
  
  // Check for inventoryMovementType column
  if (!invMovColumnNames.includes('inventoryMovementType')) {
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

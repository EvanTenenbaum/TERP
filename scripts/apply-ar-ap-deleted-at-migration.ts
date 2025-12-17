/**
 * Apply AR/AP deleted_at migration to production
 * 
 * This script adds the deleted_at columns to invoices, payments, and bills tables
 * to fix the schema drift that's causing dashboard data to not display.
 * 
 * APPLIED: 2025-12-17
 * 
 * Usage: npx tsx scripts/apply-ar-ap-deleted-at-migration.ts
 */

import "dotenv/config";
import mysql from "mysql2/promise";

async function applyMigration() {
  console.log("🔧 Applying AR/AP deleted_at migration...\n");

  // Use production database URL
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  // Remove ssl-mode from URL to avoid warning
  const cleanUrl = databaseUrl.replace(/[?&]ssl-mode=[^&]*/g, '');
  const connection = await mysql.createConnection(cleanUrl);

  const alterStatements = [
    { table: "invoices", sql: "ALTER TABLE invoices ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL" },
    { table: "payments", sql: "ALTER TABLE payments ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL" },
    { table: "bills", sql: "ALTER TABLE bills ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL" },
    { table: "invoiceLineItems", sql: "ALTER TABLE invoiceLineItems ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL" },
    { table: "billLineItems", sql: "ALTER TABLE billLineItems ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL" },
  ];

  for (const stmt of alterStatements) {
    try {
      // Check if column exists
      const [rows] = await connection.execute(
        `SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'defaultdb' AND TABLE_NAME = ? AND COLUMN_NAME = 'deleted_at'`,
        [stmt.table]
      );
      
      if (Array.isArray(rows) && rows.length > 0) {
        console.log(`⏭️  ${stmt.table}.deleted_at already exists`);
      } else {
        await connection.execute(stmt.sql);
        console.log(`✅ Added deleted_at to ${stmt.table}`);
      }
    } catch (error: unknown) {
      const err = error as { code?: string };
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log(`⏭️  ${stmt.table}.deleted_at already exists`);
      } else {
        throw error;
      }
    }
  }

  // Add indexes
  const indexes = [
    { table: "invoices", sql: "CREATE INDEX idx_invoices_deleted_at ON invoices(deleted_at)" },
    { table: "payments", sql: "CREATE INDEX idx_payments_deleted_at ON payments(deleted_at)" },
    { table: "bills", sql: "CREATE INDEX idx_bills_deleted_at ON bills(deleted_at)" },
  ];

  for (const idx of indexes) {
    try {
      await connection.execute(idx.sql);
      console.log(`✅ Created index on ${idx.table}.deleted_at`);
    } catch (error: unknown) {
      const err = error as { code?: string };
      if (err.code === 'ER_DUP_KEYNAME') {
        console.log(`⏭️  Index on ${idx.table}.deleted_at already exists`);
      } else {
        throw error;
      }
    }
  }

  // Verify
  console.log("\n🔍 Verification:");
  const [result] = await connection.execute(`
    SELECT 
      (SELECT COUNT(*) FROM invoices WHERE deleted_at IS NULL) as invoices,
      (SELECT COUNT(*) FROM payments WHERE deleted_at IS NULL) as payments,
      (SELECT COUNT(*) FROM bills WHERE deleted_at IS NULL) as bills
  `);
  console.log("Records with deleted_at IS NULL:", result);

  await connection.end();
  console.log("\n✅ Migration complete!");
}

applyMigration().catch((error) => {
  console.error("Migration failed:", error);
  process.exit(1);
});

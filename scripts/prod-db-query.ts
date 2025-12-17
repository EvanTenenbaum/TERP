#!/usr/bin/env npx tsx
/**
 * Production Database Query Tool
 * 
 * Usage:
 *   npx tsx scripts/prod-db-query.ts "SELECT * FROM users LIMIT 5"
 *   npx tsx scripts/prod-db-query.ts tables
 *   npx tsx scripts/prod-db-query.ts counts
 */

import mysql from "mysql2/promise";
import { config } from "dotenv";

// Load environment variables
config({ path: ".env.production" });

const PROD_DATABASE_URL = process.env.DATABASE_URL || "";

async function main() {
  const query = process.argv[2];
  
  if (!query) {
    console.log("Usage:");
    console.log("  npx tsx scripts/prod-db-query.ts \"SELECT * FROM users LIMIT 5\"");
    console.log("  npx tsx scripts/prod-db-query.ts tables");
    console.log("  npx tsx scripts/prod-db-query.ts counts");
    process.exit(1);
  }

  const connection = await mysql.createConnection({
    uri: PROD_DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    let sql: string;
    
    if (query === "tables") {
      sql = "SHOW TABLES";
    } else if (query === "counts") {
      // Get row counts for all tables
      const [tables] = await connection.query("SHOW TABLES") as any;
      console.log("\n📊 Table Row Counts:\n");
      for (const row of tables) {
        const tableName = Object.values(row)[0] as string;
        const [countResult] = await connection.query(`SELECT COUNT(*) as count FROM \`${tableName}\``) as any;
        const count = countResult[0].count;
        console.log(`  ${tableName.padEnd(30)} ${count.toLocaleString()}`);
      }
      await connection.end();
      return;
    } else {
      sql = query;
    }

    const [rows] = await connection.query(sql);
    console.log(JSON.stringify(rows, null, 2));
  } catch (error: any) {
    console.error("Query failed:", error.message);
  } finally {
    await connection.end();
  }
}

main();

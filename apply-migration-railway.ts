#!/usr/bin/env tsx
/**
 * DEPRECATED - Apply RBAC migration to database
 * 
 * NOTE: TERP is NO LONGER deployed on Railway. We use DigitalOcean App Platform.
 * This script is kept for historical reference only.
 * 
 * Current Platform: DigitalOcean App Platform
 * Production URL: https://terp-app-b9s35.ondigitalocean.app
 * 
 * For DigitalOcean, use: pnpm db:migrate
 */

import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as fs from "fs";

async function applyMigration() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error("❌ DATABASE_URL not found");
    process.exit(1);
  }

  console.log("🔧 Connecting to Railway database...");
  
  const connection = await mysql.createConnection(databaseUrl);
  const db = drizzle(connection);

  console.log("✅ Connected");
  console.log("📝 Reading migration SQL...");

  const migrationSQL = fs.readFileSync("drizzle/0022_create_rbac_tables.sql", "utf-8");
  
  // Split by statement breakpoint
  const statements = migrationSQL
    .split("--> statement-breakpoint")
    .map(s => s.trim())
    .filter(s => s.length > 0);

  console.log(`📊 Found ${statements.length} SQL statements`);

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    console.log(`\n⚙️  Executing statement ${i + 1}/${statements.length}...`);
    console.log(`   ${statement.substring(0, 60)}...`);
    
    try {
      await connection.query(statement);
      console.log(`   ✅ Success`);
    } catch (error: any) {
      // Ignore "already exists" errors
      if (error.code === "ER_TABLE_EXISTS_ERROR" || error.code === "ER_DUP_KEYNAME") {
        console.log(`   ⚠️  Already exists, skipping`);
      } else {
        console.error(`   ❌ Error:`, error.message);
        throw error;
      }
    }
  }

  await connection.end();
  console.log("\n✅ Migration complete!");
}

applyMigration().catch((error) => {
  console.error("❌ Migration failed:", error);
  process.exit(1);
});

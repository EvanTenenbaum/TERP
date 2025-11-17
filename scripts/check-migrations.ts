import { db } from "./db-sync.js";
import { sql } from "drizzle-orm";

async function checkMigrations() {
  console.log("\n=== APPLIED MIGRATIONS ===\n");
  
  try {
    const migrations = await db.execute(sql`
      SELECT * FROM __drizzle_migrations 
      ORDER BY created_at DESC
    `);
    
    console.log(`Total migrations applied: ${migrations[0].length}\n`);
    
    for (const migration of migrations[0] as any[]) {
      console.log(`${migration.hash.substring(0, 10)}... ${migration.created_at}`);
    }
  } catch (error: any) {
    console.error("Error:", error.message);
  }
  
  process.exit(0);
}

checkMigrations();

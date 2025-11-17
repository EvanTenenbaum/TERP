import { db } from "./db-sync.js";
import { sql } from "drizzle-orm";

async function findTables() {
  const allTables = await db.execute(sql`
    SELECT TABLE_NAME 
    FROM information_schema.TABLES 
    WHERE TABLE_SCHEMA = DATABASE()
    ORDER BY TABLE_NAME
  `);
  
  const tableNames = (allTables[0] as any[]).map((t: any) => t.TABLE_NAME);
  
  console.log("\n=== SEARCHING FOR MISSING TABLES ===\n");
  
  const searchTerms = ['dashboard', 'todo', 'list', 'event_attendees', 'event_invitations', 'pricing'];
  
  for (const term of searchTerms) {
    console.log(`\nTables matching "${term}":`);
    const matches = tableNames.filter((name: string) => name.toLowerCase().includes(term));
    if (matches.length > 0) {
      matches.forEach((name: string) => console.log(`  - ${name}`));
    } else {
      console.log(`  (none found)`);
    }
  }
  
  process.exit(0);
}

findTables();

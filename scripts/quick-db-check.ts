import { db } from "./db-sync.js";
import { sql } from "drizzle-orm";

const tables = await db.execute(sql`
  SELECT TABLE_NAME, TABLE_ROWS 
  FROM information_schema.TABLES 
  WHERE TABLE_SCHEMA = DATABASE()
  ORDER BY TABLE_ROWS DESC
`);

console.log("\n=== DATABASE CURRENT STATE ===\n");
let total = 0, withData = 0;

for (const t of tables[0] as any[]) {
  total++;
  if (t.TABLE_ROWS > 0) {
    withData++;
    console.log(`${t.TABLE_NAME.padEnd(40)} ${String(t.TABLE_ROWS).padStart(10)} rows`);
  }
}

console.log(`\nTotal: ${total} tables, ${withData} with data, ${total - withData} empty`);
process.exit(0);

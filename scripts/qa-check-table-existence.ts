import { db } from "./db-sync.js";
import { sql } from "drizzle-orm";

const highValueTables = [
  'comments', 'comment_mentions', 'comment_reactions',
  'lists', 'list_items',
  'dashboard_layouts', 'dashboard_widgets',
  'event_attendees', 'event_invitations', 'event_reminders',
  'pricing_rules', 'pricing_tiers'
];

async function checkExistence() {
  console.log('\n=== QA: Checking if High-Value Tables Exist ===\n');

  const allTables = await db.execute(sql`
    SELECT TABLE_NAME 
    FROM information_schema.TABLES 
    WHERE TABLE_SCHEMA = DATABASE()
  `);
  
  const tableNames = (allTables[0] as any[]).map((t: any) => t.TABLE_NAME);
  
  for (const table of highValueTables) {
    const exists = tableNames.includes(table);
    console.log(`${table.padEnd(30)} ${exists ? '✅ EXISTS' : '❌ MISSING'}`);
  }
  
  process.exit(0);
}

checkExistence();

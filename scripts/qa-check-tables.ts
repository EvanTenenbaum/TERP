import { db } from "./db-sync.js";
import { sql } from "drizzle-orm";

const highValueTables = [
  'comments', 'comment_mentions', 'comment_reactions',
  'lists', 'list_items',
  'dashboard_layouts', 'dashboard_widgets',
  'event_attendees', 'event_invitations', 'event_reminders',
  'pricing_rules', 'pricing_tiers'
];

async function checkTables() {
  console.log('\n=== QA: Checking High-Value Tables ===\n');

  for (const table of highValueTables) {
    try {
      const result = await db.execute(sql.raw(`SELECT COUNT(*) as count FROM ${table}`));
      const count = (result[0] as any)[0].count;
      console.log(`${table.padEnd(30)} ${count} rows`);
    } catch (error: any) {
      console.log(`${table.padEnd(30)} ERROR: ${error.message}`);
    }
  }
  process.exit(0);
}

checkTables();

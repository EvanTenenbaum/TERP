/**
 * Migration script to add calendar_id column to calendar_events table
 * This fixes the Calendar page database error in production
 */

import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function migrateCalendarId() {
  console.info("Starting calendar_id migration...");
  
  try {
    // Check if column already exists
    const [result] = await db.execute(sql`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'calendar_events' 
      AND COLUMN_NAME = 'calendar_id'
    `);
    
    if (result && (result as unknown[]).length > 0) {
      console.info("calendar_id column already exists. Skipping migration.");
      return;
    }
    
    // Add the calendar_id column
    console.info("Adding calendar_id column to calendar_events table...");
    await db.execute(sql`
      ALTER TABLE calendar_events 
      ADD COLUMN calendar_id INT NULL
    `);
    
    // Add index for the column
    console.info("Adding index on calendar_id...");
    await db.execute(sql`
      CREATE INDEX idx_calendar_events_calendar_id 
      ON calendar_events (calendar_id)
    `);
    
    console.info("Migration completed successfully!");
  } catch (error) {
    console.error("Migration failed:", error);
    throw error;
  }
}

migrateCalendarId()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));

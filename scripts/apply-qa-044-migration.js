#!/usr/bin/env node
/**
 * Apply QA-044 Event Invitations Migration
 * 
 * This script applies the database migration for QA-044 (Event Invitation Workflow).
 * It creates the three required tables: calendar_event_invitations, calendar_invitation_settings, calendar_invitation_history
 * 
 * Usage:
 *   node scripts/apply-qa-044-migration.js
 * 
 * Environment Variables:
 *   DATABASE_URL - Full MySQL connection string
 *   Or individual: DB_HOST, DB_PORT, DB_USER, DB_PASS, DB_NAME
 */

import { createConnection } from 'mysql2/promise';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function applyMigration() {
  // Get database connection string
  let connectionString = process.env.DATABASE_URL;
  
  // If DATABASE_URL not set, try individual env vars
  if (!connectionString) {
    const DB_HOST = process.env.DB_HOST || 'localhost';
    const DB_PORT = process.env.DB_PORT || '3306';
    const DB_USER = process.env.DB_USER || 'root';
    const DB_PASS = process.env.DB_PASS || '';
    const DB_NAME = process.env.DB_NAME || 'defaultdb';
    
    connectionString = `mysql://${DB_USER}:${DB_PASS}@${DB_HOST}:${DB_PORT}/${DB_NAME}`;
  }
  
  console.log('🔄 Applying QA-044 Event Invitations Migration...');
  console.log(`   Database: ${connectionString.replace(/:[^:@]+@/, ':****@')}`); // Hide password
  
  let connection;
  try {
    // Create connection
    connection = await createConnection(connectionString);
    console.log('✅ Connected to database');
    
    // Read migration SQL
    const migrationPath = join(__dirname, '..', 'drizzle', '0036_add_event_invitations.sql');
    const sql = readFileSync(migrationPath, 'utf8');
    
    // Split by semicolons and run each statement
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('/*'));
    
    console.log(`   Found ${statements.length} SQL statements to execute`);
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.length === 0) continue;
      
      try {
        await connection.query(statement);
        console.log(`   ✅ Statement ${i + 1}/${statements.length} executed`);
      } catch (error) {
        // Ignore "table already exists" errors
        if (error.code === 'ER_TABLE_EXISTS_ERROR' || 
            error.message?.includes('already exists') ||
            error.message?.includes('Duplicate')) {
          console.log(`   ⏭️  Statement ${i + 1}/${statements.length} skipped (already exists)`);
        } else {
          throw error;
        }
      }
    }
    
    // Verify tables were created
    console.log('\n🔍 Verifying tables...');
    const [tables] = await connection.query(`
      SELECT TABLE_NAME 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME IN ('calendar_event_invitations', 'calendar_invitation_settings', 'calendar_invitation_history')
      ORDER BY TABLE_NAME
    `);
    
    const tableNames = tables.map((t: any) => t.TABLE_NAME);
    const expectedTables = ['calendar_event_invitations', 'calendar_invitation_settings', 'calendar_invitation_history'];
    const missingTables = expectedTables.filter(t => !tableNames.includes(t));
    
    if (missingTables.length > 0) {
      console.error(`❌ Missing tables: ${missingTables.join(', ')}`);
      process.exit(1);
    }
    
    console.log('✅ All tables verified:');
    tableNames.forEach((name: string) => {
      console.log(`   - ${name}`);
    });
    
    console.log('\n✅ Migration completed successfully!');
    console.log('   QA-044 Event Invitation Workflow is now functional.');
    await connection.end();
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    if (error.code) {
      console.error(`   Error code: ${error.code}`);
    }
    if (connection) await connection.end();
    process.exit(1);
  }
}

applyMigration();


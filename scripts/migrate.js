#!/usr/bin/env node
/**
 * Simple migration script for Railway deployment
 * Runs the Needs & Matching module SQL migration
 */

import { createConnection } from 'mysql2/promise';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runMigration() {
  const DATABASE_URL = process.env.DATABASE_URL;
  
  if (!DATABASE_URL) {
    console.log('⚠️  DATABASE_URL not set, skipping migration');
    process.exit(0);
  }

  console.log('🔄 Running database migrations...');

  let connection;
  try {
    // Create connection
    connection = await createConnection(DATABASE_URL);
    console.log('✅ Connected to database');

    // Read migration SQL
    const migrationPath = join(__dirname, '..', 'migrations', '001_needs_and_matching_module.sql');
    const sql = readFileSync(migrationPath, 'utf8');

    // Split by semicolons and run each statement
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      try {
        await connection.query(statement);
      } catch (error) {
        // Ignore "table already exists" errors
        if (error.code === 'ER_TABLE_EXISTS_ERROR' || error.message.includes('already exists')) {
          console.log(`⏭️  Skipping: ${error.message}`);
        } else {
          throw error;
        }
      }
    }

    console.log('✅ Migrations completed successfully');
    await connection.end();
    process.exit(0);

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    if (connection) await connection.end();
    process.exit(1);
  }
}

runMigration();


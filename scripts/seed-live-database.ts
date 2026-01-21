/**
 * One-Time Seed Script for Live DigitalOcean Database
 * 
 * This script seeds the live DigitalOcean database with realistic test data.
 * 
 * Usage:
 *   pnpm seed:live [scenario]
 * 
 * Scenarios:
 *   - light: 10 clients, 50 orders (~30s)
 *   - full: 60 clients, 4,400 orders (~2min) [DEFAULT]
 *   - edge: 20 whale clients, 80% overdue AR (~45s)
 *   - chaos: 30 clients with random anomalies (~60s)
 * 
 * WARNING: This will DROP and RECREATE all data in the live database!
 * Only run this when you want to completely reset the live database.
 */

import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { seedRealisticData } from './seed-realistic-main';
import { execSync } from 'child_process';

// DigitalOcean Database Credentials (from The Bible)
const LIVE_DB_CONFIG = {
  host: 'terp-mysql-db-do-user-28175253-0.m.db.ondigitalocean.com',
  port: 25060,
  user: 'doadmin',
  password: '<REDACTED>',
  database: 'defaultdb',
  ssl: {
    rejectUnauthorized: true,
  },
};

async function seedLiveDatabase() {
  const scenario = process.argv[2] || 'full';
  
  console.log('\n' + '='.repeat(70));
  console.log('🚨 WARNING: SEEDING LIVE DIGITALOCEAN DATABASE 🚨');
  console.log('='.repeat(70));
  console.log(`\nScenario: ${scenario}`);
  console.log(`Database: ${LIVE_DB_CONFIG.host}`);
  console.log(`User: ${LIVE_DB_CONFIG.user}`);
  console.log('\nThis will DROP and RECREATE all data in the live database!');
  console.log('\nPress Ctrl+C within 5 seconds to cancel...\n');
  
  // 5-second countdown
  for (let i = 5; i > 0; i--) {
    process.stdout.write(`\rStarting in ${i} seconds...`);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  console.log('\n\n' + '='.repeat(70));
  console.log('🚀 Starting live database seed...');
  console.log('='.repeat(70) + '\n');

  try {
    // Connect to DigitalOcean MySQL
    console.log('📡 Step 1: Connecting to DigitalOcean database...');
    const connection = await mysql.createConnection(LIVE_DB_CONFIG);
    console.log('   ✓ Connected successfully\n');

    // Drop and recreate all tables
    console.log('🗑️  Step 2: Dropping all existing tables...');
    const [tables] = await connection.query<any[]>(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'defaultdb'"
    );
    
    if (tables.length > 0) {
      await connection.query('SET FOREIGN_KEY_CHECKS = 0');
      for (const table of tables) {
        console.log(`   - Dropping table: ${table.table_name}`);
        await connection.query(`DROP TABLE IF EXISTS \`${table.table_name}\``);
      }
      await connection.query('SET FOREIGN_KEY_CHECKS = 1');
      console.log('   ✓ All tables dropped\n');
    } else {
      console.log('   ✓ No existing tables found\n');
    }

    await connection.end();

    // Run migrations to recreate schema
    console.log('📦 Step 3: Running migrations to recreate schema...');
    console.log('   (This will use the DATABASE_URL from your .env file)\n');
    
    // Temporarily set DATABASE_URL to point to live database
    const originalDbUrl = process.env.DATABASE_URL;
    process.env.DATABASE_URL = `mysql://${LIVE_DB_CONFIG.user}:${LIVE_DB_CONFIG.password}@${LIVE_DB_CONFIG.host}:${LIVE_DB_CONFIG.port}/${LIVE_DB_CONFIG.database}?ssl={"rejectUnauthorized":true}`;
    
    try {
      execSync('pnpm drizzle-kit push:mysql', { stdio: 'inherit' });
      console.log('   ✓ Schema created successfully\n');
    } finally {
      // Restore original DATABASE_URL
      if (originalDbUrl) {
        process.env.DATABASE_URL = originalDbUrl;
      }
    }

    // Seed with realistic data
    console.log(`🌱 Step 4: Seeding database with scenario: ${scenario}...`);
    console.log('   (This may take 30s - 2min depending on scenario)\n');
    
    // Create new connection for seeding
    const seedConnection = await mysql.createConnection(LIVE_DB_CONFIG);
    const db = drizzle(seedConnection);
    
    // @ts-ignore - seedRealisticData expects a db parameter
    await seedRealisticData({ scenario, db });
    
    await seedConnection.end();
    console.log('   ✓ Database seeded successfully\n');

    console.log('='.repeat(70));
    console.log('✅ LIVE DATABASE SEED COMPLETE!');
    console.log('='.repeat(70));
    console.log(`\nYour live URL now has realistic ${scenario} data.`);
    console.log('You can now interact with, add to, and modify this data.\n');
    console.log('To re-seed in the future, run: pnpm seed:live [scenario]\n');

  } catch (error) {
    console.error('\n' + '='.repeat(70));
    console.error('❌ LIVE DATABASE SEED FAILED!');
    console.error('='.repeat(70));
    console.error('\nError:', error);
    console.error('\nThe live database may be in an inconsistent state.');
    console.error('You may need to run this script again to complete the seed.\n');
    process.exit(1);
  }
}

// Run the seed
seedLiveDatabase()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

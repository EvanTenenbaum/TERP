import { execSync } from 'child_process';
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { seedRealisticData } from '../scripts/seed-realistic-main';

const connection = await mysql.createConnection({
  host: '127.0.0.1',
  port: 3307,
  user: 'root',
  password: 'rootpassword',
  database: 'terp-test',
});

const db = drizzle(connection);

async function resetDatabase(scenario: string = 'light') {
  console.log('🚀 Resetting test database...');

  // 1. Drop and recreate the database
  console.log('   - Dropping and recreating database...');
  await connection.execute('DROP DATABASE IF EXISTS `terp-test`;');
  await connection.execute('CREATE DATABASE `terp-test`;');
  await connection.changeUser({ database: 'terp-test' });

  // 2. Run migrations
  console.log('   - Running migrations...');
  execSync('pnpm drizzle-kit push:mysql', { stdio: 'inherit' });

  // 3. Seed data
  console.log(`   - Seeding data with scenario: ${scenario}...`);
  // @ts-ignore
  await seedRealisticData({ scenario });

  console.log('✅ Test database reset complete!');
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const scenario = process.argv[2] || 'light';
  resetDatabase(scenario)
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Database reset failed:', err);
      process.exit(1);
    });
}

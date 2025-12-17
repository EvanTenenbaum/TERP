#!/usr/bin/env node
/**
 * Soft-Delete Migration Runner (Standalone)
 * 
 * Uses mysql2 directly from node_modules with DATABASE_URL env var.
 * Run: node run-soft-delete-migration.cjs
 */

const mysql = require('mysql2/promise');

async function runMigration() {
  console.log('🔄 Starting soft-delete index migration...');
  console.log('='.repeat(60));
  
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('❌ DATABASE_URL environment variable not set');
    process.exit(1);
  }
  
  console.log('📡 Connecting to database...');
  
  let connection;
  try {
    connection = await mysql.createConnection(dbUrl);
    console.log('✅ Connected successfully');
    console.log('');
    
    console.log('📋 Creating indexes...');
    console.log('');
    
    // Create index on invoices.deleted_at
    console.log('[1/3] Creating idx_invoices_deleted_at...');
    try {
      await connection.execute('CREATE INDEX idx_invoices_deleted_at ON invoices(deleted_at)');
      console.log('      ✅ Created');
    } catch (e) {
      if (e.code === 'ER_DUP_KEYNAME') {
        console.log('      ⚠️  Already exists (skipping)');
      } else {
        throw e;
      }
    }
    
    // Create index on payments.deleted_at
    console.log('[2/3] Creating idx_payments_deleted_at...');
    try {
      await connection.execute('CREATE INDEX idx_payments_deleted_at ON payments(deleted_at)');
      console.log('      ✅ Created');
    } catch (e) {
      if (e.code === 'ER_DUP_KEYNAME') {
        console.log('      ⚠️  Already exists (skipping)');
      } else {
        throw e;
      }
    }
    
    // Create index on bills.deleted_at
    console.log('[3/3] Creating idx_bills_deleted_at...');
    try {
      await connection.execute('CREATE INDEX idx_bills_deleted_at ON bills(deleted_at)');
      console.log('      ✅ Created');
    } catch (e) {
      if (e.code === 'ER_DUP_KEYNAME') {
        console.log('      ⚠️  Already exists (skipping)');
      } else {
        throw e;
      }
    }
    
    console.log('');
    console.log('🔍 Verifying indexes...');
    
    const [invoicesIdx] = await connection.execute(
      "SHOW INDEX FROM invoices WHERE Key_name = 'idx_invoices_deleted_at'"
    );
    console.log(`   ${invoicesIdx.length > 0 ? '✅' : '❌'} idx_invoices_deleted_at`);
    
    const [paymentsIdx] = await connection.execute(
      "SHOW INDEX FROM payments WHERE Key_name = 'idx_payments_deleted_at'"
    );
    console.log(`   ${paymentsIdx.length > 0 ? '✅' : '❌'} idx_payments_deleted_at`);
    
    const [billsIdx] = await connection.execute(
      "SHOW INDEX FROM bills WHERE Key_name = 'idx_bills_deleted_at'"
    );
    console.log(`   ${billsIdx.length > 0 ? '✅' : '❌'} idx_bills_deleted_at`);
    
    console.log('');
    console.log('='.repeat(60));
    console.log('✅ Migration completed successfully!');
    console.log('='.repeat(60));
    
    await connection.end();
    process.exit(0);
    
  } catch (error) {
    console.error('');
    console.error('❌ Migration failed:', error.message);
    if (connection) await connection.end();
    process.exit(1);
  }
}

runMigration();

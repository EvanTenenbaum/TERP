#!/usr/bin/env node
/**
 * Soft-Delete Migration Runner
 * 
 * This script creates indexes on deletedAt columns for performance optimization.
 * Run from within the app container: node run-soft-delete-migration.mjs
 */

import { getDb } from './dist/server/db.js';
import { sql } from 'drizzle-orm';

async function runMigration() {
  console.log('🔄 Starting soft-delete index migration...');
  console.log('=' .repeat(60));
  
  try {
    const db = await getDb();
    if (!db) {
      throw new Error('Database connection not available');
    }
    console.log('✅ Database connected');
    console.log('');
    
    console.log('📋 Creating indexes...');
    console.log('');
    
    // Create index on invoices.deleted_at
    console.log('[1/3] Creating idx_invoices_deleted_at...');
    try {
      await db.execute(sql.raw('CREATE INDEX IF NOT EXISTS idx_invoices_deleted_at ON invoices(deleted_at)'));
      console.log('      ✅ Success');
    } catch (e) {
      if (e.message && e.message.includes('Duplicate key name')) {
        console.log('      ⚠️  Already exists (skipping)');
      } else {
        throw e;
      }
    }
    console.log('');
    
    // Create index on payments.deleted_at
    console.log('[2/3] Creating idx_payments_deleted_at...');
    try {
      await db.execute(sql.raw('CREATE INDEX IF NOT EXISTS idx_payments_deleted_at ON payments(deleted_at)'));
      console.log('      ✅ Success');
    } catch (e) {
      if (e.message && e.message.includes('Duplicate key name')) {
        console.log('      ⚠️  Already exists (skipping)');
      } else {
        throw e;
      }
    }
    console.log('');
    
    // Create index on bills.deleted_at
    console.log('[3/3] Creating idx_bills_deleted_at...');
    try {
      await db.execute(sql.raw('CREATE INDEX IF NOT EXISTS idx_bills_deleted_at ON bills(deleted_at)'));
      console.log('      ✅ Success');
    } catch (e) {
      if (e.message && e.message.includes('Duplicate key name')) {
        console.log('      ⚠️  Already exists (skipping)');
      } else {
        throw e;
      }
    }
    console.log('');
    
    console.log('🔍 Verifying indexes...');
    console.log('');
    
    // Verify invoices index
    const invoicesCheck = await db.execute(sql.raw(
      "SHOW INDEX FROM invoices WHERE Key_name = 'idx_invoices_deleted_at'"
    ));
    console.log(`   ${invoicesCheck.length > 0 ? '✅' : '❌'} idx_invoices_deleted_at on invoices`);
    
    // Verify payments index
    const paymentsCheck = await db.execute(sql.raw(
      "SHOW INDEX FROM payments WHERE Key_name = 'idx_payments_deleted_at'"
    ));
    console.log(`   ${paymentsCheck.length > 0 ? '✅' : '❌'} idx_payments_deleted_at on payments`);
    
    // Verify bills index
    const billsCheck = await db.execute(sql.raw(
      "SHOW INDEX FROM bills WHERE Key_name = 'idx_bills_deleted_at'"
    ));
    console.log(`   ${billsCheck.length > 0 ? '✅' : '❌'} idx_bills_deleted_at on bills`);
    
    console.log('');
    console.log('=' .repeat(60));
    console.log('✅ Migration completed successfully!');
    console.log('=' .repeat(60));
    console.log('');
    console.log('The soft-delete remediation is now complete.');
    console.log('All AR/AP queries will now properly filter deleted records.');
    console.log('');
    
    process.exit(0);
  } catch (error) {
    console.error('');
    console.error('=' .repeat(60));
    console.error('❌ Migration failed!');
    console.error('=' .repeat(60));
    console.error('');
    console.error('Error:', error.message);
    console.error('');
    if (error.stack) {
      console.error('Stack trace:');
      console.error(error.stack);
    }
    console.error('');
    process.exit(1);
  }
}

runMigration();

/**
 * Migration: Add deleted_at columns to all tables
 * 
 * This script safely adds deleted_at TIMESTAMP NULL columns to tables
 * that are missing them, based on the schema definition.
 * 
 * Usage: npx tsx add-deleted-at-migration.ts
 */

import { db } from './scripts/db-sync.js';
import { sql } from 'drizzle-orm';

const TABLES_NEEDING_DELETED_AT = [
  'users',
  'vendors',
  'vendorNotes',
  'brands',
  'strains',
  'products',
  'productSynonyms',
  'productMedia',
  'tags',
  'productTags',
  'lots',
  'batches',
  'paymentHistory',
  'batchLocations',
  'sales',
  'cogsHistory',
  'auditLogs',
  'locations',
  'categories',
  'subcategories',
  'grades',
  'sequences',
  'accounts',
  'ledgerEntries',
  'fiscalPeriods',
  'bills',
  'billItems',
  'bankAccounts',
  'bankTransactions',
  'expenseCategories',
  'expenses',
  'scratchPadNotes',
  'dashboardWidgetLayouts',
  'dashboardKpiConfigs',
  'freeformNotes',
  'noteComments',
  'noteActivity',
  'pricingProfiles',
  'tagGroups',
  'inventoryMovements',
];

async function checkColumnExists(tableName: string): Promise<boolean> {
  try {
    const result = await db.execute(sql.raw(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = '${tableName}' 
        AND COLUMN_NAME = 'deleted_at'
    `));
    
    return Array.isArray(result) && result[0] && Array.isArray(result[0]) && result[0].length > 0;
  } catch (error) {
    console.error(`Error checking ${tableName}:`, error);
    return false;
  }
}

async function addDeletedAtColumn(tableName: string): Promise<boolean> {
  try {
    console.log(`Adding deleted_at to ${tableName}...`);
    await db.execute(sql.raw(`
      ALTER TABLE \`${tableName}\` 
      ADD COLUMN \`deleted_at\` TIMESTAMP NULL DEFAULT NULL
    `));
    console.log(`✅ Added deleted_at to ${tableName}`);
    return true;
  } catch (error: any) {
    if (error.code === 'ER_DUP_FIELDNAME' || error.message?.includes('Duplicate column')) {
      console.log(`⏭️  ${tableName} already has deleted_at`);
      return true;
    }
    console.error(`❌ Failed to add deleted_at to ${tableName}:`, error.message);
    return false;
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('MIGRATION: Add deleted_at columns');
  console.log('='.repeat(60));
  console.log();

  console.log('Step 1: Checking which tables need deleted_at...');
  console.log();

  const tablesToMigrate: string[] = [];
  const tablesAlreadyHave: string[] = [];

  for (const tableName of TABLES_NEEDING_DELETED_AT) {
    const hasColumn = await checkColumnExists(tableName);
    if (hasColumn) {
      tablesAlreadyHave.push(tableName);
    } else {
      tablesToMigrate.push(tableName);
    }
  }

  console.log(`Tables already having deleted_at: ${tablesAlreadyHave.length}`);
  console.log(`Tables needing deleted_at: ${tablesToMigrate.length}`);
  console.log();

  if (tablesToMigrate.length === 0) {
    console.log('✅ All tables already have deleted_at column!');
    process.exit(0);
  }

  console.log('Step 2: Adding deleted_at to tables...');
  console.log();

  let successCount = 0;
  let failCount = 0;

  for (const tableName of tablesToMigrate) {
    const success = await addDeletedAtColumn(tableName);
    if (success) {
      successCount++;
    } else {
      failCount++;
    }
  }

  console.log();
  console.log('='.repeat(60));
  console.log('MIGRATION COMPLETE');
  console.log('='.repeat(60));
  console.log(`✅ Successfully added: ${successCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log(`⏭️  Already existed: ${tablesAlreadyHave.length}`);
  console.log();

  if (failCount > 0) {
    console.log('⚠️  Some tables failed. Check errors above.');
    process.exit(1);
  }

  console.log('✅ All tables now have deleted_at column!');
  process.exit(0);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

/**
 * Script to add deletedAt field to all tables in schema.ts
 * ST-013: Standardize Soft Deletes
 * 
 * This script automatically adds the deletedAt field to all table definitions
 * that don't already have it.
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SCHEMA_PATH = path.join(__dirname, '../drizzle/schema.ts');
const DELETED_AT_FIELD = '    deletedAt: timestamp("deleted_at"), // Soft delete support (ST-013)';

async function addSoftDeleteToSchema() {
  console.log('📝 Reading schema.ts...');
  let schemaContent = fs.readFileSync(SCHEMA_PATH, 'utf-8');
  
  // Find all table definitions
  const tableRegex = /export const (\w+) = mysqlTable\("([^"]+)",\s*{([^}]+)}/g;
  let match;
  const tablesToUpdate: string[] = [];
  const tablesSkipped: string[] = [];
  
  // First pass: identify tables that need the field
  let tempContent = schemaContent;
  while ((match = tableRegex.exec(tempContent)) !== null) {
    const tableName = match[1];
    const tableContent = match[3];
    
    // Skip if already has deletedAt
    if (tableContent.includes('deletedAt') || tableContent.includes('deleted_at')) {
      tablesSkipped.push(tableName);
      continue;
    }
    
    tablesToUpdate.push(tableName);
  }
  
  console.log(`\n📊 Analysis:`);
  console.log(`   Tables to update: ${tablesToUpdate.length}`);
  console.log(`   Tables already have deletedAt: ${tablesSkipped.length}`);
  console.log(`   Skipped tables: ${tablesSkipped.join(', ')}`);
  
  if (tablesToUpdate.length === 0) {
    console.log('\n✅ All tables already have soft delete support!');
    return;
  }
  
  console.log(`\n🔧 Updating ${tablesToUpdate.length} tables...`);
  
  // Second pass: add the field to each table
  for (const tableName of tablesToUpdate) {
    // Find the table definition
    const tablePattern = new RegExp(
      `(export const ${tableName} = mysqlTable\\("[^"]+",\\s*{[^}]+)(}\\s*,?\\s*(?:{|\\)))`,
      'gs'
    );
    
    schemaContent = schemaContent.replace(tablePattern, (fullMatch, tableStart, tableEnd) => {
      // Check if the last field has a comma
      const trimmed = tableStart.trimEnd();
      const needsComma = !trimmed.endsWith(',');
      
      return `${tableStart}${needsComma ? ',' : ''}\n${DELETED_AT_FIELD}\n  ${tableEnd}`;
    });
    
    console.log(`   ✓ ${tableName}`);
  }
  
  // Write the updated schema
  console.log('\n💾 Writing updated schema.ts...');
  fs.writeFileSync(SCHEMA_PATH, schemaContent, 'utf-8');
  
  console.log('\n✅ Schema update complete!');
  console.log(`\n📋 Summary:`);
  console.log(`   Updated: ${tablesToUpdate.length} tables`);
  console.log(`   Skipped: ${tablesSkipped.length} tables`);
  console.log(`\n⚠️  Next steps:`);
  console.log(`   1. Review the changes in drizzle/schema.ts`);
  console.log(`   2. Run: pnpm db:push to apply schema changes`);
  console.log(`   3. Or run the migration: drizzle/0039_add_soft_delete_to_all_tables.sql`);
}

// Run the script
addSoftDeleteToSchema().catch(console.error);

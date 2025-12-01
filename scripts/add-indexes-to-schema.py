#!/usr/bin/env python3
"""
Add database indexes to schema.ts using Gemini API.
Part of PERF-001: Add Missing Database Indexes
"""

import os
import sys
import re
from google import genai

# Top 10 priority tables and their indexes
PRIORITY_INDEXES = [
    {
        "table": "batchLocations",
        "indexes": [
            {"name": "batchLocations_batchId_idx", "columns": ["batchId"]}
        ]
    },
    {
        "table": "productTags",
        "indexes": [
            {"name": "productTags_productId_idx", "columns": ["productId"]}
        ]
    },
    {
        "table": "sales",
        "indexes": [
            {"name": "sales_batchId_idx", "columns": ["batchId"]}
        ]
    },
    {
        "table": "ledgerEntries",
        "indexes": [
            {"name": "ledgerEntries_accountId_idx", "columns": ["accountId"]}
        ]
    },
    {
        "table": "orderLineItems",
        "indexes": [
            {"name": "orderLineItems_orderId_idx", "columns": ["orderId"]}
        ]
    },
    {
        "table": "invoices",
        "indexes": [
            {"name": "invoices_customerId_idx", "columns": ["customerId"]}
        ]
    },
    {
        "table": "batches",
        "indexes": [
            {"name": "batches_productId_idx", "columns": ["productId"]}
        ]
    },
    {
        "table": "recurringOrders",
        "indexes": [
            {"name": "recurringOrders_status_nextGenerationDate_idx", "columns": ["status", "nextGenerationDate"]}
        ]
    },
    {
        "table": "sampleRequests",
        "indexes": [
            {"name": "sampleRequests_clientId_idx", "columns": ["clientId"]}
        ]
    },
    {
        "table": "transactions",
        "indexes": [
            {"name": "transactions_clientId_transactionDate_idx", "columns": ["clientId", "transactionDate"]}
        ]
    },
]

def find_table_definition(schema_content, table_name):
    """Find the line number and content of a table definition."""
    pattern = rf'export const {table_name} = mysqlTable\("{table_name}"'
    match = re.search(pattern, schema_content)
    if match:
        start = match.start()
        # Find the closing of the table definition
        # Look for the pattern );
        lines = schema_content[:start].count('\n')
        return lines + 1, match.group()
    return None, None

def add_indexes_to_table(schema_path, table_name, indexes):
    """Add indexes to a specific table in the schema."""
    
    print(f"\n{'='*80}")
    print(f"Adding indexes to table: {table_name}")
    print(f"{'='*80}")
    
    with open(schema_path, 'r') as f:
        schema_content = f.read()
    
    # Find table definition
    line_num, _ = find_table_definition(schema_content, table_name)
    if not line_num:
        print(f"❌ Could not find table definition for {table_name}")
        return False
    
    print(f"Found table at line {line_num}")
    
    # Check if table already has index definitions
    table_pattern = rf'export const {table_name} = mysqlTable\("{table_name}"[^)]+\)(?:,\s*\(table\) => \(\{{[^}}]+\}}\))?;'
    table_match = re.search(table_pattern, schema_content, re.DOTALL)
    
    if not table_match:
        print(f"❌ Could not match table structure for {table_name}")
        return False
    
    table_def = table_match.group()
    
    # Check if it already has index definitions
    has_indexes = '(table) => ({' in table_def
    
    if has_indexes:
        print(f"⚠️  Table {table_name} already has index definitions")
        # We need to add to existing indexes
        # Find the closing of the index object
        index_section_pattern = r'\(table\) => \(\{([^}]+)\}\)'
        index_match = re.search(index_section_pattern, table_def, re.DOTALL)
        if index_match:
            existing_indexes = index_match.group(1)
            print(f"Existing indexes:\n{existing_indexes}")
            
            # Generate new index definitions
            new_indexes = []
            for idx in indexes:
                cols = ', '.join([f'table.{col}' for col in idx['columns']])
                new_indexes.append(f'    {idx["name"]}: index("{idx["name"]}").on({cols}),')
            
            # Add to existing
            updated_indexes = existing_indexes.rstrip() + '\n' + '\n'.join(new_indexes)
            new_index_section = f'(table) => ({{\n{updated_indexes}\n  }})'
            
            new_table_def = table_def.replace(index_match.group(), new_index_section)
    else:
        print(f"✓ Table {table_name} has no index definitions yet")
        
        # Generate index definitions
        index_defs = []
        for idx in indexes:
            cols = ', '.join([f'table.{col}' for col in idx['columns']])
            index_defs.append(f'    {idx["name"]}: index("{idx["name"]}").on({cols}),')
        
        index_section = ',\n  (table) => ({\n' + '\n'.join(index_defs) + '\n  })'
        
        # Find the closing ); of the table definition
        closing_pattern = r'\);$'
        new_table_def = re.sub(closing_pattern, index_section + '\n);', table_def)
    
    # Replace in schema
    updated_schema = schema_content.replace(table_def, new_table_def)
    
    # Write back
    with open(schema_path, 'w') as f:
        f.write(updated_schema)
    
    print(f"✅ Added {len(indexes)} index(es) to {table_name}")
    for idx in indexes:
        print(f"   - {idx['name']}: {', '.join(idx['columns'])}")
    
    return True

def main():
    schema_path = "drizzle/schema.ts"
    
    print("="*80)
    print("ADDING DATABASE INDEXES TO SCHEMA")
    print("="*80)
    print(f"\nSchema file: {schema_path}")
    print(f"Tables to update: {len(PRIORITY_INDEXES)}")
    print(f"Total indexes to add: {sum(len(t['indexes']) for t in PRIORITY_INDEXES)}\n")
    
    success_count = 0
    fail_count = 0
    
    for table_info in PRIORITY_INDEXES:
        try:
            if add_indexes_to_table(schema_path, table_info['table'], table_info['indexes']):
                success_count += 1
            else:
                fail_count += 1
        except Exception as e:
            print(f"❌ Error processing {table_info['table']}: {e}")
            fail_count += 1
    
    print(f"\n{'='*80}")
    print("SUMMARY")
    print(f"{'='*80}")
    print(f"✅ Successfully updated: {success_count} tables")
    print(f"❌ Failed: {fail_count} tables")
    print(f"\nNext steps:")
    print(f"1. Review changes: git diff drizzle/schema.ts")
    print(f"2. Generate migration: pnpm drizzle-kit generate:mysql")
    print(f"3. Run tests: pnpm test")
    print(f"4. Type check: pnpm check")

if __name__ == "__main__":
    main()

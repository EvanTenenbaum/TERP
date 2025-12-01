#!/usr/bin/env python3
"""
Add all priority database indexes to schema.ts
Uses direct string replacement for reliability
"""

import re

# Remaining tables to update (batchLocations and productTags already done)
UPDATES = [
    {
        "table": "sales",
        "line": 577,
        "find_pattern": r'(export const sales = mysqlTable\("sales", \{[^}]+\}\);)',
        "index_code": """, (table) => ({
  batchIdIdx: index("sales_batchId_idx").on(table.batchId),
}));"""
    },
    {
        "table": "ledgerEntries",
        "line": 828,
        "find_pattern": r'(export const ledgerEntries = mysqlTable\("ledgerEntries", \{[^}]+\}\);)',
        "index_code": """, (table) => ({
  accountIdIdx: index("ledgerEntries_accountId_idx").on(table.accountId),
}));"""
    },
    {
        "table": "invoices",
        "line": 888,
        "find_pattern": r'(export const invoices = mysqlTable\("invoices", \{[^}]+\}\);)',
        "index_code": """, (table) => ({
  customerIdIdx: index("invoices_customerId_idx").on(table.customerId),
}));"""
    },
    {
        "table": "batches",
        "line": 484,
        "find_pattern": r'(export const batches = mysqlTable\("batches", \{[^}]+\}\);)',
        "index_code": """, (table) => ({
  productIdIdx: index("batches_productId_idx").on(table.productId),
}));"""
    },
]

def add_indexes_simple():
    """Add indexes using simple line-based approach."""
    
    schema_path = "drizzle/schema.ts"
    
    with open(schema_path, 'r') as f:
        lines = f.readlines()
    
    print("Adding indexes to remaining 8 tables...")
    print("=" * 80)
    
    # Process each update
    for update in UPDATES:
        table = update["table"]
        line_num = update["line"] - 1  # Convert to 0-indexed
        
        print(f"\nProcessing {table} at line {update['line']}...")
        
        # Find the closing }); for this table
        found_closing = False
        for i in range(line_num, min(line_num + 100, len(lines))):
            if '});' in lines[i] and 'mysqlTable' not in lines[i]:
                # This is the closing of the table definition
                # Replace }); with the index code
                lines[i] = lines[i].replace('});', update['index_code'])
                found_closing = True
                print(f"✅ Added index to {table}")
                break
        
        if not found_closing:
            print(f"❌ Could not find closing for {table}")
    
    # Write back
    with open(schema_path, 'w') as f:
        f.writelines(lines)
    
    print("\n" + "=" * 80)
    print("✅ Index addition complete!")
    print("\nRemaining tables (need manual check):")
    print("- orderLineItems")
    print("- recurringOrders")
    print("- sampleRequests")
    print("- transactions")

if __name__ == "__main__":
    add_indexes_simple()

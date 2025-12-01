#!/usr/bin/env python3
"""
Final correct index addition - handles syntax properly
"""

import re

# Only 6 tables need indexes (the other 4 already have them)
TABLES_TO_UPDATE = {
    "batchLocations": 'batchIdIdx: index("idx_batch_locations_batch_id").on(table.batchId),',
    "productTags": 'productIdIdx: index("idx_product_tags_product_id").on(table.productId),',
    "sales": 'batchIdIdx: index("idx_sales_batch_id").on(table.batchId),',
    "ledgerEntries": 'accountIdIdx: index("idx_ledger_entries_account_id").on(table.accountId),',
    "invoices": 'customerIdIdx: index("idx_invoices_customer_id").on(table.customerId),',
    "batches": 'productIdIdx: index("idx_batches_product_id").on(table.productId),',
}

def add_indexes():
    schema_path = "drizzle/schema.ts"
    
    with open(schema_path, 'r') as f:
        content = f.read()
    
    print("="*80)
    print("ADDING INDEXES TO 6 TABLES")
    print("="*80 + "\n")
    
    for table_name, index_def in TABLES_TO_UPDATE.items():
        print(f"Processing: {table_name}")
        
        # Find table definition
        pattern = rf'export const {table_name} = mysqlTable\("{table_name}", \{{'
        match = re.search(pattern, content)
        
        if not match:
            print(f"  ❌ Could not find table")
            continue
        
        start = match.start()
        
        # Find the closing }); of this table
        # Count braces from the start
        brace_count = 0
        paren_count = 0
        i = start
        found_opening = False
        
        while i < len(content):
            if content[i:i+2] == '({':
                if not found_opening:
                    found_opening = True
                brace_count += 1
                i += 2
                continue
            elif content[i] == '{':
                brace_count += 1
            elif content[i] == '}':
                brace_count -= 1
                if found_opening and brace_count == 0:
                    # Found the closing brace of the column definitions
                    # Now look for });
                    if content[i:i+3] == '});':
                        # This is where we insert the index
                        before = content[:i+1]
                        after = content[i+1:]
                        
                        # Insert index section
                        index_section = f', (table) => ({{\n    {index_def}\n  }})'
                        
                        content = before + index_section + after
                        print(f"  ✅ Added index")
                        break
            i += 1
    
    # Write back
    with open(schema_path, 'w') as f:
        f.write(content)
    
    print(f"\n{'='*80}")
    print("COMPLETE!")
    print(f"{'='*80}\n")

if __name__ == "__main__":
    add_indexes()

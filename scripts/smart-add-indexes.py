#!/usr/bin/env python3
"""
Smart index addition using AST-like parsing
Adds indexes to the 10 priority tables
"""

import re

# Priority tables with their indexes
TABLES_TO_UPDATE = {
    "batchLocations": {
        "indexes": [
            'batchIdIdx: index("idx_batch_locations_batch_id").on(table.batchId)',
        ]
    },
    "productTags": {
        "indexes": [
            'productIdIdx: index("idx_product_tags_product_id").on(table.productId)',
        ]
    },
    "sales": {
        "indexes": [
            'batchIdIdx: index("idx_sales_batch_id").on(table.batchId)',
        ]
    },
    "ledgerEntries": {
        "indexes": [
            'accountIdIdx: index("idx_ledger_entries_account_id").on(table.accountId)',
        ]
    },
    "orderLineItems": {
        "indexes": [
            'orderIdIdx: index("idx_order_line_items_order_id").on(table.orderId)',
        ]
    },
    "invoices": {
        "indexes": [
            'customerIdIdx: index("idx_invoices_customer_id").on(table.customerId)',
        ]
    },
    "batches": {
        "indexes": [
            'productIdIdx: index("idx_batches_product_id").on(table.productId)',
        ]
    },
    "recurringOrders": {
        "indexes": [
            'statusNextGenIdx: index("idx_recurring_orders_status_next_gen").on(table.status, table.nextGenerationDate)',
        ]
    },
    "sampleRequests": {
        "indexes": [
            'clientIdIdx: index("idx_sample_requests_client_id").on(table.clientId)',
        ]
    },
    "transactions": {
        "indexes": [
            'clientIdDateIdx: index("idx_transactions_client_id_date").on(table.clientId, table.transactionDate)',
        ]
    },
}

def add_indexes_to_schema():
    """Add indexes to all priority tables."""
    
    schema_path = "drizzle/schema.ts"
    
    with open(schema_path, 'r') as f:
        content = f.read()
    
    print("="*80)
    print("SMART INDEX ADDITION")
    print("="*80)
    print(f"\nProcessing {len(TABLES_TO_UPDATE)} tables...\n")
    
    modified_content = content
    success_count = 0
    
    for table_name, table_info in TABLES_TO_UPDATE.items():
        print(f"Processing: {table_name}")
        
        # Pattern to match the table definition
        # Matches: export const tableName = mysqlTable("tableName", { ... });
        # OR: export const tableName = mysqlTable("tableName", { ... }, (table) => ({ ... }));
        
        # First, find the table declaration
        table_pattern = rf'export const {table_name} = mysqlTable\(\s*["\']'
        table_match = re.search(table_pattern, modified_content)
        
        if not table_match:
            print(f"  ❌ Could not find table declaration")
            continue
        
        start_pos = table_match.start()
        
        # Find the end of this table definition
        # Look for ); that closes the mysqlTable call
        # We need to count braces to find the matching closing
        
        brace_count = 0
        paren_count = 0
        in_table = False
        end_pos = start_pos
        
        for i in range(start_pos, len(modified_content)):
            char = modified_content[i]
            
            if char == '(':
                paren_count += 1
                in_table = True
            elif char == ')':
                paren_count -= 1
                if in_table and paren_count == 0:
                    # Check if next char is ;
                    if i + 1 < len(modified_content) and modified_content[i + 1] == ';':
                        end_pos = i + 1
                        break
            elif char == '{':
                brace_count += 1
            elif char == '}':
                brace_count -= 1
        
        if end_pos == start_pos:
            print(f"  ❌ Could not find table end")
            continue
        
        table_def = modified_content[start_pos:end_pos + 1]
        
        # Check if it already has indexes
        if '(table) => ({' in table_def and 'index(' in table_def:
            print(f"  ⚠️  Table already has indexes, skipping")
            continue
        
        # Check if it has the index parameter but no indexes
        if '(table) => ({' in table_def and 'index(' not in table_def:
            # Add to existing index section
            # Find the closing })
            index_section_match = re.search(r'\(table\) => \(\{([^}]*)\}\)', table_def, re.DOTALL)
            if index_section_match:
                existing_content = index_section_match.group(1)
                new_indexes = '\n    ' + ',\n    '.join(table_info['indexes'])
                new_index_section = f'(table) => ({{{existing_content}{new_indexes}\n  }})'
                new_table_def = table_def.replace(index_section_match.group(), new_index_section)
                modified_content = modified_content.replace(table_def, new_table_def)
                print(f"  ✅ Added {len(table_info['indexes'])} index(es) to existing section")
                success_count += 1
                continue
        
        # No indexes at all - add new index section
        # Find the closing }); and insert before it
        # The pattern is: }, \n);  or just });
        
        closing_pattern = r'(\s*}\s*,?\s*)\);'
        closing_match = re.search(closing_pattern, table_def)
        
        if not closing_match:
            print(f"  ❌ Could not find closing pattern")
            continue
        
        # Build the index section
        index_lines = ',\n    '.join(table_info['indexes'])
        index_section = f'}},\n  (table) => ({{\n    {index_lines}\n  }}\n);'
        
        # Replace the closing
        new_table_def = re.sub(closing_pattern, index_section, table_def)
        
        # Replace in content
        modified_content = modified_content.replace(table_def, new_table_def)
        
        print(f"  ✅ Added {len(table_info['indexes'])} index(es)")
        success_count += 1
    
    # Write back
    with open(schema_path, 'w') as f:
        f.write(modified_content)
    
    print(f"\n{'='*80}")
    print(f"COMPLETE: Successfully updated {success_count}/{len(TABLES_TO_UPDATE)} tables")
    print(f"{'='*80}\n")
    
    return success_count == len(TABLES_TO_UPDATE)

if __name__ == "__main__":
    success = add_indexes_to_schema()
    exit(0 if success else 1)

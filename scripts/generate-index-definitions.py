#!/usr/bin/env python3
"""
Generate Drizzle ORM index definitions for top priority indexes.
Part of PERF-001: Add Missing Database Indexes
"""

import os
import sys
from google import genai

def main():
    # Initialize Gemini client
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("ERROR: GEMINI_API_KEY environment variable not set")
        sys.exit(1)
    
    client = genai.Client(api_key=api_key)
    
    # Top 10 priority indexes from audit
    priority_indexes = [
        {"table": "batchLocations", "column": "batchId", "type": "single"},
        {"table": "productTags", "column": "productId", "type": "single"},
        {"table": "sales", "column": "batchId", "type": "single"},
        {"table": "ledgerEntries", "column": "accountId", "type": "single"},
        {"table": "orderLineItems", "column": "orderId", "type": "single"},
        {"table": "invoices", "column": "customerId", "type": "single"},
        {"table": "batches", "column": "productId", "type": "single"},
        {"table": "recurringOrders", "columns": ["status", "nextGenerationDate"], "type": "composite"},
        {"table": "sampleRequests", "column": "clientId", "type": "single"},
        {"table": "transactions", "columns": ["clientId", "transactionDate"], "type": "composite"},
    ]
    
    print("Generating index definitions for top 10 priority indexes...")
    print(f"Total indexes to generate: {len(priority_indexes)}\n")
    
    # Generate index definitions
    prompt = """Generate Drizzle ORM index definitions for these database indexes.

Priority Indexes:
"""
    for idx in priority_indexes:
        if idx["type"] == "single":
            prompt += f"- Table: {idx['table']}, Column: {idx['column']}\n"
        else:
            prompt += f"- Table: {idx['table']}, Columns: {', '.join(idx['columns'])} (composite)\n"
    
    prompt += """

Requirements:
1. Use Drizzle ORM syntax with `index()` function
2. Follow naming convention: {table}_{column}_idx for single column, {table}_{col1}_{col2}_idx for composite
3. Generate complete table definitions with index configurations
4. Include the index in the second parameter of pgTable() function

Example format:
```typescript
export const tableName = pgTable('table_name', {
  // column definitions
}, (table) => ({
  columnIdx: index('table_column_idx').on(table.column),
  compositeIdx: index('table_col1_col2_idx').on(table.col1, table.col2),
}));
```

Generate ONLY the index definitions (the second parameter function), not the full table.
Output each table's indexes separately with clear labels.
"""
    
    try:
        response = client.models.generate_content(
            model='gemini-2.0-flash-exp',
            contents=prompt
        )
        
        print("\n" + "="*80)
        print("GENERATED INDEX DEFINITIONS")
        print("="*80 + "\n")
        print(response.text)
        print("\n" + "="*80)
        
        # Save results to file
        output_path = "docs/PERF-001-INDEX-DEFINITIONS.md"
        with open(output_path, 'w') as f:
            f.write("# PERF-001: Generated Index Definitions\n\n")
            f.write("**Generated:** 2025-11-30\n")
            f.write("**Tool:** Gemini API (gemini-2.0-flash-exp)\n\n")
            f.write("---\n\n")
            f.write("## Top 10 Priority Indexes\n\n")
            f.write(response.text)
        
        print(f"\nIndex definitions saved to: {output_path}")
        
    except Exception as e:
        print(f"ERROR: Failed to generate index definitions: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()

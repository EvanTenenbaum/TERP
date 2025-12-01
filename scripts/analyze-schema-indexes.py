#!/usr/bin/env python3
"""
Analyze Drizzle schema for missing database indexes using Gemini API.
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
    
    # Read schema file
    schema_path = "drizzle/schema.ts"
    print(f"Reading schema from {schema_path}...")
    
    with open(schema_path, 'r') as f:
        schema_content = f.read()
    
    print(f"Schema size: {len(schema_content)} characters, {len(schema_content.splitlines())} lines")
    print("\nAnalyzing schema with Gemini API...")
    
    # Analyze with Gemini
    prompt = """Analyze this Drizzle ORM schema file and identify missing database indexes.

Your task:
1. Identify ALL foreign key relationships (columns ending in 'Id' or explicitly defined as foreign keys)
2. Check if each foreign key has a corresponding index definition
3. Identify common query patterns that would benefit from composite indexes
4. Prioritize indexes by impact (high-traffic tables first)

Schema file content:
```typescript
""" + schema_content + """
```

Output format (be specific and actionable):

## Missing Foreign Key Indexes

List each foreign key that lacks an index in this format:
- Table: `tableName`, Column: `columnName`, Reason: [why this index is important]

## Recommended Composite Indexes

List composite indexes that would improve common queries:
- Table: `tableName`, Columns: `(col1, col2)`, Use Case: [what query pattern this optimizes]

## Priority Ranking

Rank the top 10 most important indexes to add first based on:
- Query frequency
- Table size
- Performance impact

Be thorough and specific. Include table names and column names exactly as they appear in the schema.
"""
    
    try:
        response = client.models.generate_content(
            model='gemini-2.0-flash-exp',
            contents=prompt
        )
        
        print("\n" + "="*80)
        print("GEMINI ANALYSIS RESULTS")
        print("="*80 + "\n")
        print(response.text)
        print("\n" + "="*80)
        
        # Save results to file
        output_path = "docs/PERF-001-SCHEMA-AUDIT.md"
        with open(output_path, 'w') as f:
            f.write("# PERF-001: Database Schema Index Audit\n\n")
            f.write("**Generated:** 2025-11-30\n")
            f.write("**Tool:** Gemini API (gemini-2.0-flash-exp)\n")
            f.write("**Schema:** drizzle/schema.ts\n\n")
            f.write("---\n\n")
            f.write(response.text)
        
        print(f"\nResults saved to: {output_path}")
        
    except Exception as e:
        print(f"ERROR: Failed to analyze schema with Gemini API: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()

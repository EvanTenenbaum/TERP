#!/usr/bin/env python3.11
import re

# Read the schema file
with open('drizzle/schema.ts', 'r') as f:
    lines = f.readlines()

# Track current table and its foreign keys and indexes
current_table = None
tables = {}

for i, line in enumerate(lines):
    # Detect table definition
    table_match = re.search(r'export const (\w+) = mysqlTable\(["\'](\w+)["\']', line)
    if table_match:
        current_table = table_match.group(1)
        tables[current_table] = {'foreign_keys': [], 'indexes': [], 'line': i+1}
        continue
    
    # Detect foreign key
    if current_table and '.references(' in line:
        fk_match = re.search(r'(\w+):\s+int\(["\']?(\w+)["\']?\).*?\.references\(\(\)\s*=>\s*(\w+)\.id', line)
        if fk_match:
            field_name = fk_match.group(1)
            ref_table = fk_match.group(3)
            tables[current_table]['foreign_keys'].append({
                'field': field_name,
                'ref_table': ref_table,
                'line': i+1
            })
    
    # Detect index definition
    if current_table and 'index(' in line and '.on(table.' in line:
        idx_match = re.search(r'\.on\(table\.(\w+)', line)
        if idx_match:
            indexed_field = idx_match.group(1)
            tables[current_table]['indexes'].append(indexed_field)

# Find missing indexes
print("=" * 80)
print("MISSING INDEXES ANALYSIS")
print("=" * 80)
print()

total_fks = 0
total_missing = 0

for table_name, data in sorted(tables.items()):
    if not data['foreign_keys']:
        continue
    
    missing = []
    for fk in data['foreign_keys']:
        total_fks += 1
        if fk['field'] not in data['indexes']:
            missing.append(fk)
            total_missing += 1
    
    if missing:
        print(f"Table: {table_name} (line {data['line']})")
        print(f"  Missing indexes on foreign keys:")
        for fk in missing:
            print(f"    - {fk['field']} -> {fk['ref_table']}.id (line {fk['line']})")
        print()

print("=" * 80)
print(f"Summary: {total_missing} missing indexes out of {total_fks} foreign keys")
print("=" * 80)

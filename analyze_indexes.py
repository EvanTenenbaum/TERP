import re

# Read the schema file
with open('drizzle/schema.ts', 'r') as f:
    content = f.read()

# Find all foreign key references
fk_pattern = r'(\w+):\s+int\(["\'](\w+)["\'].*?\.references\(\(\)\s*=>\s*(\w+)\.id'
fk_matches = re.findall(fk_pattern, content, re.MULTILINE | re.DOTALL)

# Find all index definitions
index_pattern = r'(\w+Idx):\s+index\(["\']([^"\']+)["\']\)\.on\(table\.(\w+)'
index_matches = re.findall(index_pattern, content)

# Create a set of indexed columns
indexed_columns = set()
for idx_name, idx_db_name, column_name in index_matches:
    indexed_columns.add(column_name)

# Find foreign keys without indexes
missing_indexes = []
for field_name, db_column, ref_table in fk_matches:
    if field_name not in indexed_columns:
        missing_indexes.append((field_name, db_column, ref_table))

print(f"Total foreign keys found: {len(fk_matches)}")
print(f"Total indexes found: {len(index_matches)}")
print(f"Foreign keys without indexes: {len(missing_indexes)}")
print("\nMissing indexes:")
for field_name, db_column, ref_table in sorted(set(missing_indexes)):
    print(f"  - {field_name} (references {ref_table}.id)")

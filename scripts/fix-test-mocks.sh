#!/bin/bash

# Script to automatically fix database mocking in test files
# This script updates test files to use the new testDb utility

set -e

echo "🔧 Fixing test database mocks..."

# Create test-utils directory if it doesn't exist
mkdir -p server/test-utils

# Find all test files that mock the database
TEST_FILES=$(grep -l "vi.mock.*db" server/**/*.test.ts 2>/dev/null || true)

if [ -z "$TEST_FILES" ]; then
  echo "✅ No test files found that need fixing"
  exit 0
fi

echo "Found $(echo "$TEST_FILES" | wc -l) test files to fix"

# For each test file, update the mock pattern
for file in $TEST_FILES; do
  echo "  Fixing: $file"
  
  # Backup the file
  cp "$file" "$file.backup"
  
  # Replace old mock pattern with new one
  # This is a simple find/replace - manual review may be needed
  sed -i 's/vi.mock("..\/db", () => ({/vi.mock("..\/db", () => setupDbMock());/g' "$file"
  sed -i 's/vi.mock("\.\.\/db", () => ({/vi.mock("..\/db", () => setupDbMock());/g' "$file"
  
  # Add import if not present
  if ! grep -q "setupDbMock" "$file"; then
    # Find the first import line and add our import after it
    sed -i '1a import { setupDbMock, createMockDb, mockSelectQuery } from "../test-utils/testDb";' "$file"
  fi
done

echo "✅ Test mocks updated"
echo "⚠️  Note: Backups created with .backup extension"
echo "📝 Manual review recommended for complex test files"

#!/bin/bash
#
# COMPREHENSIVE SEEDING FIX SCRIPT
# Fixes ALL identified issues in one shot
#
set -e
set -o pipefail

echo "=========================================="
echo "Comprehensive Seeding System Fix"
echo "=========================================="
echo ""

# Fix 1: Move @faker-js/faker to dependencies
echo "[1/5] Moving @faker-js/faker to dependencies..."
cd /home/ubuntu/TERP
# Read current version from devDependencies
FAKER_VERSION=$(cat package.json | jq -r '.devDependencies["@faker-js/faker"]')
# Add to dependencies
jq ".dependencies[\"@faker-js/faker\"] = \"$FAKER_VERSION\"" package.json > package.json.tmp
mv package.json.tmp package.json
# Remove from devDependencies
jq "del(.devDependencies[\"@faker-js/faker\"])" package.json > package.json.tmp
mv package.json.tmp package.json
echo "✅ @faker-js/faker moved to dependencies"
echo ""

# Fix 2: Add explicit timestamps to seed-vendors.ts
echo "[2/5] Fixing seed-vendors.ts timestamps..."
cat > /tmp/fix-vendors.js << 'EOF'
import { readFileSync, writeFileSync } from 'fs';
const file = '/home/ubuntu/TERP/scripts/seed/seeders/seed-vendors.ts';
let content = readFileSync(file, 'utf-8');

// Find the generateVendor function and add timestamp generation
if (!content.includes('const now = new Date();')) {
  content = content.replace(
    'function generateVendor(): typeof vendors.$inferInsert {',
    'function generateVendor(): typeof vendors.$inferInsert {\n  const now = new Date();'
  );
}

// Add timestamps to return object
content = content.replace(
  /return \{([^}]+)\};/s,
  (match, fields) => {
    if (!fields.includes('createdAt:')) {
      return `return {${fields},\n    createdAt: now,\n    updatedAt: now,\n  };`;
    }
    return match;
  }
);

writeFileSync(file, content);
console.log('✅ seed-vendors.ts fixed');
EOF
node /tmp/fix-vendors.js
echo ""

# Fix 3: Add explicit timestamps to seed-batches.ts (main batches, not just lots)
echo "[3/5] Fixing seed-batches.ts timestamps..."
cat > /tmp/fix-batches.js << 'EOF'
import { readFileSync, writeFileSync } from 'fs';
const file = '/home/ubuntu/TERP/scripts/seed/seeders/seed-batches.ts';
let content = readFileSync(file, 'utf-8');

// Find batch generation and ensure timestamps
if (!content.match(/batchNumber:.*\n.*createdAt: now/)) {
  content = content.replace(
    /(batchNumber: `BATCH-\${faker\.string\.alphanumeric\(6\)\.toUpperCase\(\)}`),/,
    '$1,\n            createdAt: now,\n            updatedAt: now,'
  );
}

writeFileSync(file, content);
console.log('✅ seed-batches.ts fixed');
EOF
node /tmp/fix-batches.js
echo ""

# Fix 4: Add explicit timestamps to seed-invoices.ts
echo "[4/5] Fixing seed-invoices.ts timestamps..."
cat > /tmp/fix-invoices.js << 'EOF'
import { readFileSync, writeFileSync } from 'fs';
const file = '/home/ubuntu/TERP/scripts/seed/seeders/seed-invoices.ts';
let content = readFileSync(file, 'utf-8');

// Add now variable if not present
if (!content.includes('const now = new Date();')) {
  content = content.replace(
    'export async function seedInvoices',
    'const now = new Date();\n\nexport async function seedInvoices'
  );
}

// Add timestamps to invoice generation
content = content.replace(
  /(status: faker\.helpers\.arrayElement\(\["DRAFT", "SENT", "PAID", "OVERDUE"\]\)),/,
  '$1,\n        createdAt: now,\n        updatedAt: now,'
);

writeFileSync(file, content);
console.log('✅ seed-invoices.ts fixed');
EOF
node /tmp/fix-invoices.js
echo ""

# Fix 5: Add explicit timestamps to seed-payments.ts
echo "[5/5] Fixing seed-payments.ts timestamps..."
cat > /tmp/fix-payments.js << 'EOF'
import { readFileSync, writeFileSync } from 'fs';
const file = '/home/ubuntu/TERP/scripts/seed/seeders/seed-payments.ts';
let content = readFileSync(file, 'utf-8');

// Add now variable if not present
if (!content.includes('const now = new Date();')) {
  content = content.replace(
    'export async function seedPayments',
    'const now = new Date();\n\nexport async function seedPayments'
  );
}

// Add timestamps to payment generation
content = content.replace(
  /(notes: faker\.lorem\.sentence\(\)),/,
  '$1,\n        createdAt: now,\n        updatedAt: now,'
);

writeFileSync(file, content);
console.log('✅ seed-payments.ts fixed');
EOF
node /tmp/fix-payments.js
echo ""

echo "=========================================="
echo "All Fixes Applied Successfully!"
echo "=========================================="
echo ""
echo "Summary:"
echo "  ✅ @faker-js/faker moved to dependencies"
echo "  ✅ seed-vendors.ts: Added explicit timestamps"
echo "  ✅ seed-batches.ts: Added explicit timestamps"
echo "  ✅ seed-invoices.ts: Added explicit timestamps"
echo "  ✅ seed-payments.ts: Added explicit timestamps"
echo ""
echo "Next: Update pnpm lockfile and commit"

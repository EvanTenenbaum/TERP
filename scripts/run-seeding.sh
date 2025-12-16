#!/bin/bash
#
# SIMPLIFIED SEEDING SCRIPT
# Uses Node.js for schema sync, then runs seeding
#
set -e
set -o pipefail

echo "=========================================="
echo "TERP Database Seeding"
echo "=========================================="
echo ""

# Step 1: Add missing column using Node.js
echo "[1/2] Adding missing paymentTerms column..."
echo ""
node /app/scripts/add-payment-terms-column.js
echo ""

# Step 2: Run seeding
echo "[2/2] Running seeding..."
echo ""
pnpm seed:new --clean --size=small --force

echo ""
echo "=========================================="
echo "Seeding Complete!"
echo "=========================================="
echo ""

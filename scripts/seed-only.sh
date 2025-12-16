#!/bin/bash
#
# SEED-ONLY SCRIPT
# Run this to seed the database without running migrations
# (Use when schema is already synced)
#
set -e
set -o pipefail

echo "=========================================="
echo "TERP Database Seeding"
echo "=========================================="
echo ""
echo "This will seed the database with realistic mock data"
echo ""
echo "⚠️  WARNING: This will DELETE all existing data!"
echo ""
read -p "Continue? (yes/no): " response

if [ "$response" != "yes" ]; then
  echo "Aborted."
  exit 1
fi

echo ""
echo "=========================================="
echo "Seeding Mock Data"
echo "=========================================="
echo ""

# Set memory limit for seeding process
export NODE_OPTIONS="--max-old-space-size=512"

echo "✓ Node memory limit set to 512MB for seeding"
echo ""
echo "Running seeding command..."
echo "Command: pnpm seed:new --clean --size=small --force"
echo ""

# Run seeding
if pnpm seed:new --clean --size=small --force 2>&1 | tee /tmp/seed.log; then
  echo ""
  echo "✅ Mock data seeded successfully"
  echo ""
  echo "=========================================="
  echo "Seeding Complete!"
  echo "=========================================="
  echo ""
  echo "Your database now has realistic mock data for testing"
  echo ""
  echo "Visit your app to see the data:"
  echo "https://terp-app-b9s35.ondigitalocean.app"
  echo ""
else
  echo ""
  echo "❌ Seeding failed"
  echo "Check /tmp/seed.log for details"
  exit 1
fi

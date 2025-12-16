#!/bin/bash
#
# ONE-TIME SETUP SCRIPT
# Run this ONCE to initialize the database with schema and mock data
#
# Usage: bash /app/scripts/one-time-setup.sh
#

set -e
set -o pipefail

echo "=========================================="
echo "TERP Database One-Time Setup"
echo "=========================================="
echo ""
echo "This script will:"
echo "  1. Sync database schema with code"
echo "  2. Seed database with realistic mock data"
echo ""
echo "⚠️  WARNING: This will DELETE all existing data!"
echo ""
read -p "Continue? (yes/no): " -r
echo ""

if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo "Setup cancelled."
    exit 0
fi

echo "=========================================="
echo "Step 1: Database Schema Sync"
echo "=========================================="
echo ""

# Check DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
    echo "❌ ERROR: DATABASE_URL not set"
    exit 1
fi

echo "✓ DATABASE_URL configured"
echo ""

# Set memory limit for migration
export NODE_OPTIONS="--max-old-space-size=512"

# Apply schema migrations
echo "Applying schema migrations..."
if ! pnpm drizzle-kit migrate 2>&1 | tee /tmp/migrate.log; then
    echo ""
    echo "❌ Schema migration failed"
    echo "Check /tmp/migrate.log for details"
    exit 1
fi

echo ""
echo "✅ Schema synced successfully"
echo ""

echo "=========================================="
echo "Step 2: Seed Mock Data"
echo "=========================================="
echo ""

# Run seeding with clean flag
echo "Seeding database with mock data..."
echo "Command: pnpm seed:new --clean --size=small --force"
echo ""

if ! pnpm seed:new --clean --size=small --force 2>&1 | tee /tmp/seed.log; then
    echo ""
    echo "❌ Seeding failed"
    echo "Check /tmp/seed.log for details"
    exit 1
fi

echo ""
echo "✅ Mock data seeded successfully"
echo ""

echo "=========================================="
echo "Setup Complete!"
echo "=========================================="
echo ""
echo "Your database now has:"
echo "  - All tables and schema"
echo "  - Realistic mock data for testing"
echo ""
echo "You can now:"
echo "  - Browse the app UI"
echo "  - Test all features"
echo "  - Make API calls"
echo ""
echo "⚠️  DO NOT run this script again unless you want to reset all data!"
echo ""

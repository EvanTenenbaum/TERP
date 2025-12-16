#!/bin/bash
#
# Post-Deploy Migration Script
# Automatically runs database migrations after deployment
#
# This script is called from the Dockerfile CMD to ensure the database
# schema is always in sync with the code before the server starts.
#

set -e  # Exit immediately on any error
set -o pipefail  # Catch errors in pipes

echo "=========================================="
echo "Post-Deploy Database Migration"
echo "=========================================="
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ ERROR: DATABASE_URL environment variable is not set"
    exit 1
fi

echo "✓ DATABASE_URL is configured"
echo ""

# Set Node.js memory limit for migration processes
export NODE_OPTIONS="--max-old-space-size=512"
echo "✓ Node memory limit set to 512MB for migrations"
echo ""

# Generate migration files
echo "Step 1: Generating migration files..."
echo "Command: pnpm drizzle-kit generate"
echo ""

if ! pnpm drizzle-kit generate 2>&1 | tee /tmp/drizzle-generate.log; then
    echo ""
    echo "❌ ERROR: Migration generation failed"
    echo "See logs above for details"
    exit 1
fi

echo ""
echo "✅ Migration files generated successfully"
echo ""

# Apply migrations
echo "Step 2: Applying migrations to database..."
echo "Command: pnpm drizzle-kit migrate"
echo ""

if ! pnpm drizzle-kit migrate 2>&1 | tee /tmp/drizzle-migrate.log; then
    echo ""
    echo "❌ ERROR: Migration application failed"
    echo "See logs above for details"
    exit 1
fi

echo ""
echo "✅ Migrations applied successfully"
echo ""
echo "=========================================="
echo "Database schema is now in sync"
echo "=========================================="
echo ""

exit 0

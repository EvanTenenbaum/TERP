#!/bin/bash
#
# Post-Deploy Migration Script
# Automatically runs database migrations after deployment
#
# This script should be called from the Dockerfile or as a post-deploy hook
# to ensure the database schema is always in sync with the code.
#

set -e  # Exit on error

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

# Run Drizzle migrations
echo "Running database migrations..."
echo "Command: pnpm drizzle-kit push"
echo ""

# Run the migration (generate creates migration files, migrate applies them)
echo "Generating migration files..."
if pnpm drizzle-kit generate 2>&1; then
    echo "Applying migrations..."
    if pnpm drizzle-kit migrate 2>&1; then
        echo "Migrations applied successfully"
    else
        echo "Migration application failed"
        exit 1
    fi
    echo ""
    echo "✅ Database migrations completed successfully"
    exit 0
else
    echo ""
    echo "❌ Database migrations failed"
    exit 1
fi

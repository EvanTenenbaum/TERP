#!/bin/bash
#
# Post-Deploy Migration Script
# Automatically runs database migrations after deployment
#
# This script applies existing migration files to the database.
# It does NOT generate new migrations - those should be created
# during development and committed to the repository.
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

# Apply migrations (do NOT generate - use committed migration files)
echo "Applying database migrations..."
echo "Command: pnpm drizzle-kit migrate"
echo ""
echo "NOTE: This applies existing migration files from drizzle/ directory."
echo "New migrations should be generated during development, not deployment."
echo ""

if ! pnpm drizzle-kit migrate 2>&1 | tee /tmp/drizzle-migrate.log; then
    echo ""
    echo "❌ ERROR: Migration application failed"
    echo "See logs above for details"
    echo ""
    echo "Common causes:"
    echo "  - Database connection issues"
    echo "  - Schema conflicts (table already exists)"
    echo "  - Permission issues"
    echo ""
    echo "Troubleshooting:"
    echo "  1. Check DATABASE_URL is correct"
    echo "  2. Verify database is accessible"
    echo "  3. Check migration files in drizzle/ directory"
    echo "  4. Review /tmp/drizzle-migrate.log for details"
    echo ""
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

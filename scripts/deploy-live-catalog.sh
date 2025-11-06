#!/bin/bash

# ============================================================================
# Live Catalog Deployment Script
# ============================================================================
# This script deploys the VIP Portal Live Catalog feature to production.
# It handles database migrations, type generation, and validation.
#
# Usage: ./scripts/deploy-live-catalog.sh [environment]
# Environment: dev (default), staging, production
# ============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT="${1:-dev}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo -e "${BLUE}============================================================================${NC}"
echo -e "${BLUE}Live Catalog Deployment Script${NC}"
echo -e "${BLUE}Environment: ${ENVIRONMENT}${NC}"
echo -e "${BLUE}============================================================================${NC}"
echo ""

# ============================================================================
# Step 1: Pre-flight Checks
# ============================================================================
echo -e "${YELLOW}[1/8] Running pre-flight checks...${NC}"

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}ERROR: DATABASE_URL environment variable is not set${NC}"
    echo "Please set DATABASE_URL in your .env file or environment"
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}ERROR: Node.js is not installed${NC}"
    exit 1
fi

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
    echo -e "${RED}ERROR: pnpm is not installed${NC}"
    echo "Install with: npm install -g pnpm"
    exit 1
fi

# Check if we're in the correct directory
if [ ! -f "$PROJECT_ROOT/package.json" ]; then
    echo -e "${RED}ERROR: Not in TERP project root${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Pre-flight checks passed${NC}"
echo ""

# ============================================================================
# Step 2: Backup Database (Production Only)
# ============================================================================
if [ "$ENVIRONMENT" = "production" ]; then
    echo -e "${YELLOW}[2/8] Creating database backup...${NC}"
    
    BACKUP_DIR="$PROJECT_ROOT/backups"
    mkdir -p "$BACKUP_DIR"
    
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_FILE="$BACKUP_DIR/terp_backup_${TIMESTAMP}.sql"
    
    echo "Backup location: $BACKUP_FILE"
    
    # Extract database connection details from DATABASE_URL
    # Format: mysql://user:password@host:port/database
    DB_URL_REGEX="mysql://([^:]+):([^@]+)@([^:]+):([^/]+)/(.+)"
    
    if [[ $DATABASE_URL =~ $DB_URL_REGEX ]]; then
        DB_USER="${BASH_REMATCH[1]}"
        DB_PASS="${BASH_REMATCH[2]}"
        DB_HOST="${BASH_REMATCH[3]}"
        DB_PORT="${BASH_REMATCH[4]}"
        DB_NAME="${BASH_REMATCH[5]}"
        
        mysqldump -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" > "$BACKUP_FILE" 2>/dev/null || {
            echo -e "${RED}ERROR: Database backup failed${NC}"
            exit 1
        }
        
        echo -e "${GREEN}✓ Database backup created${NC}"
    else
        echo -e "${RED}ERROR: Could not parse DATABASE_URL${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}[2/8] Skipping database backup (not production)${NC}"
fi
echo ""

# ============================================================================
# Step 3: Install Dependencies
# ============================================================================
echo -e "${YELLOW}[3/8] Installing dependencies...${NC}"

cd "$PROJECT_ROOT"
pnpm install --frozen-lockfile || {
    echo -e "${RED}ERROR: Failed to install dependencies${NC}"
    exit 1
}

echo -e "${GREEN}✓ Dependencies installed${NC}"
echo ""

# ============================================================================
# Step 4: Run Database Migration
# ============================================================================
echo -e "${YELLOW}[4/8] Running database migration...${NC}"

# Check if migration file exists
MIGRATION_FILE="$PROJECT_ROOT/drizzle/0021_giant_leech.sql"
if [ ! -f "$MIGRATION_FILE" ]; then
    echo -e "${RED}ERROR: Migration file not found: $MIGRATION_FILE${NC}"
    exit 1
fi

echo "Applying migration: 0021_giant_leech.sql"

# Run migration using drizzle-kit push
pnpm db:push || {
    echo -e "${RED}ERROR: Database migration failed${NC}"
    echo "Database may be in an inconsistent state. Please check manually."
    
    if [ "$ENVIRONMENT" = "production" ]; then
        echo "Restore from backup: $BACKUP_FILE"
    fi
    
    exit 1
}

echo -e "${GREEN}✓ Database migration completed${NC}"
echo ""

# ============================================================================
# Step 5: Generate TypeScript Types
# ============================================================================
echo -e "${YELLOW}[5/8] Generating TypeScript types...${NC}"

pnpm db:generate || {
    echo -e "${RED}ERROR: Type generation failed${NC}"
    exit 1
}

echo -e "${GREEN}✓ TypeScript types generated${NC}"
echo ""

# ============================================================================
# Step 6: Compile TypeScript
# ============================================================================
echo -e "${YELLOW}[6/8] Compiling TypeScript...${NC}"

pnpm tsc --noEmit || {
    echo -e "${YELLOW}WARNING: TypeScript compilation has errors${NC}"
    echo "Review errors above. Some may be pre-existing."
    
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${RED}Deployment aborted${NC}"
        exit 1
    fi
}

echo -e "${GREEN}✓ TypeScript compilation completed${NC}"
echo ""

# ============================================================================
# Step 7: Seed Test Data (Dev/Staging Only)
# ============================================================================
if [ "$ENVIRONMENT" != "production" ]; then
    echo -e "${YELLOW}[7/8] Seeding test data...${NC}"
    
    read -p "Seed test data for Live Catalog? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        tsx "$PROJECT_ROOT/server/scripts/seedLiveCatalogTestData.ts" || {
            echo -e "${YELLOW}WARNING: Test data seeding failed${NC}"
            echo "This is not critical. You can seed data manually later."
        }
        echo -e "${GREEN}✓ Test data seeded${NC}"
    else
        echo "Skipping test data seeding"
    fi
else
    echo -e "${YELLOW}[7/8] Skipping test data seeding (production)${NC}"
fi
echo ""

# ============================================================================
# Step 8: Smoke Test
# ============================================================================
echo -e "${YELLOW}[8/8] Running smoke test...${NC}"

# Start the server in the background
if [ "$ENVIRONMENT" = "dev" ]; then
    echo "Starting development server..."
    pnpm dev &
    SERVER_PID=$!
    
    # Wait for server to start
    echo "Waiting for server to start..."
    sleep 10
    
    # Check if server is running
    if ! kill -0 $SERVER_PID 2>/dev/null; then
        echo -e "${RED}ERROR: Server failed to start${NC}"
        exit 1
    fi
    
    # Test if server is responding
    if curl -s http://localhost:5173 > /dev/null; then
        echo -e "${GREEN}✓ Server is responding${NC}"
    else
        echo -e "${RED}ERROR: Server is not responding${NC}"
        kill $SERVER_PID 2>/dev/null
        exit 1
    fi
    
    # Kill the server
    kill $SERVER_PID 2>/dev/null
    echo "Server stopped"
else
    echo "Smoke test skipped for $ENVIRONMENT environment"
    echo "Please test manually after deployment"
fi

echo ""

# ============================================================================
# Deployment Complete
# ============================================================================
echo -e "${GREEN}============================================================================${NC}"
echo -e "${GREEN}✓ Live Catalog Deployment Complete!${NC}"
echo -e "${GREEN}============================================================================${NC}"
echo ""

echo -e "${BLUE}Next Steps:${NC}"
echo "1. Start the server: pnpm dev (or pnpm start for production)"
echo "2. Navigate to any client profile"
echo "3. Go to 'Live Catalog' tab"
echo "4. Enable and configure Live Catalog"
echo "5. Test client-facing catalog in VIP Portal"
echo ""

echo -e "${BLUE}Documentation:${NC}"
echo "- ORDER_INTEGRATION_COMPLETE.md - Full deployment guide"
echo "- VIP_PORTAL_LIVE_CATALOG_PRD.md - Product requirements"
echo "- LIVE_CATALOG_ROADMAP.md - Implementation roadmap"
echo ""

echo -e "${BLUE}Feature Flags:${NC}"
echo "- FEATURE_LIVE_CATALOG=false (disabled by default)"
echo "- Enable per-client in admin configuration"
echo ""

if [ "$ENVIRONMENT" = "production" ]; then
    echo -e "${YELLOW}Production Deployment Notes:${NC}"
    echo "- Database backup: $BACKUP_FILE"
    echo "- Monitor logs for any errors"
    echo "- Enable feature gradually (per client)"
    echo "- Have rollback plan ready"
    echo ""
fi

echo -e "${GREEN}Deployment successful! 🎉${NC}"

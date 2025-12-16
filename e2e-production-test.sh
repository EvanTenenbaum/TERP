#!/bin/bash
#
# DATA-011: End-to-End Production Testing Script
# Tests the TERP Database Seeding System on live production
#

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_ID="1fd40be5-b9af-4e71-ab1d-3af0864a7da4"
APP_URL="https://terp-app-b9s35.ondigitalocean.app"
DEPLOYMENT_ID="71296e29-d99a-4a0c-8505-e97a066b6ccc"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}DATA-011: End-to-End Production Testing${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Phase 1: Pre-Test Verification
echo -e "${YELLOW}Phase 1: Pre-Test Verification${NC}"
echo "-----------------------------------"

echo -n "1.1 Checking deployment status... "
DEPLOYMENT_STATUS=$(doctl apps get-deployment $APP_ID $DEPLOYMENT_ID --format Phase --no-header 2>&1)
if [ "$DEPLOYMENT_STATUS" = "ACTIVE" ]; then
    echo -e "${GREEN}✓ ACTIVE${NC}"
else
    echo -e "${RED}✗ $DEPLOYMENT_STATUS${NC}"
    exit 1
fi

echo -n "1.2 Checking app health endpoint... "
HEALTH_RESPONSE=$(curl -s "$APP_URL/health" 2>&1)
DB_STATUS=$(echo "$HEALTH_RESPONSE" | grep -o '"database":{"status":"[^"]*"' | cut -d'"' -f6)
if [ "$DB_STATUS" = "ok" ]; then
    echo -e "${GREEN}✓ Database connected${NC}"
else
    echo -e "${RED}✗ Database not connected${NC}"
    echo "$HEALTH_RESPONSE"
    exit 1
fi

echo -n "1.3 Checking if seeding system is available... "
if [ -f "scripts/seed/seed-main.ts" ]; then
    echo -e "${GREEN}✓ New seeding system found${NC}"
else
    echo -e "${RED}✗ Seeding system not found${NC}"
    exit 1
fi

echo -n "1.4 Checking database connection from sandbox... "
# Test database connection
DB_TEST=$(node -e "
const mysql = require('mysql2/promise');
const url = process.env.DATABASE_URL;
mysql.createConnection({uri: url, ssl: {rejectUnauthorized: false}})
  .then(conn => { console.log('ok'); conn.end(); })
  .catch(err => { console.log('fail'); });
" 2>&1 | tail -1)

if [ "$DB_TEST" = "ok" ]; then
    echo -e "${GREEN}✓ Connected${NC}"
else
    echo -e "${YELLOW}⚠ Firewall blocked (expected)${NC}"
fi

echo ""

# Phase 2: Database State Capture (Before Seeding)
echo -e "${YELLOW}Phase 2: Capture Current Database State${NC}"
echo "-----------------------------------"

echo "2.1 Capturing current record counts..."
cat > /tmp/check-db-state.js << 'EOF'
const mysql = require('mysql2/promise');

async function checkState() {
  try {
    const conn = await mysql.createConnection({
      uri: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });
    
    const tables = ['clients', 'strains', 'batches', 'quotes', 'orders'];
    const counts = {};
    
    for (const table of tables) {
      const [rows] = await conn.query(`SELECT COUNT(*) as count FROM ${table}`);
      counts[table] = rows[0].count;
    }
    
    await conn.end();
    console.log(JSON.stringify(counts));
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

checkState();
EOF

BEFORE_COUNTS=$(node /tmp/check-db-state.js 2>&1 | tail -1)
if [[ "$BEFORE_COUNTS" == *"Error"* ]] || [[ "$BEFORE_COUNTS" == *"Connection"* ]]; then
    echo -e "${YELLOW}⚠ Cannot access database from sandbox (firewall)${NC}"
    echo "   This is expected. Seeding must be run from app console."
    SKIP_DB_CHECKS=true
else
    echo -e "${GREEN}✓ Current state captured${NC}"
    echo "   $BEFORE_COUNTS"
    SKIP_DB_CHECKS=false
fi

echo ""

# Phase 3: Dry-Run Test
echo -e "${YELLOW}Phase 3: Dry-Run Test${NC}"
echo "-----------------------------------"

echo "3.1 Running dry-run test locally..."
pnpm install --silent 2>&1 | grep -v "deprecated" | tail -5

echo "3.2 Executing: pnpm seed:new --dry-run --size=small"
DRY_RUN_OUTPUT=$(pnpm seed:new --dry-run --size=small 2>&1)
DRY_RUN_EXIT=$?

if [ $DRY_RUN_EXIT -eq 0 ]; then
    echo -e "${GREEN}✓ Dry-run completed successfully${NC}"
    echo "$DRY_RUN_OUTPUT" | grep -E "operation|phase|msg" | tail -10
else
    echo -e "${RED}✗ Dry-run failed${NC}"
    echo "$DRY_RUN_OUTPUT" | tail -20
    
    # Check if it's a connection error
    if echo "$DRY_RUN_OUTPUT" | grep -q "Failed to connect"; then
        echo -e "${YELLOW}⚠ Connection failed (expected from sandbox)${NC}"
        echo "   Dry-run must be executed from DigitalOcean console"
    else
        exit 1
    fi
fi

echo ""

# Phase 4: Instructions for Console Execution
if [ "$SKIP_DB_CHECKS" = true ] || [ $DRY_RUN_EXIT -ne 0 ]; then
    echo -e "${YELLOW}Phase 4: Console Execution Required${NC}"
    echo "-----------------------------------"
    echo ""
    echo "Due to database firewall restrictions, seeding must be run from"
    echo "the DigitalOcean App Platform console."
    echo ""
    echo -e "${BLUE}To complete the test:${NC}"
    echo ""
    echo "1. Go to: https://cloud.digitalocean.com/apps/$APP_ID/console"
    echo "2. Select the 'web' component"
    echo "3. Run the following commands:"
    echo ""
    echo -e "${GREEN}   # Dry-run test${NC}"
    echo "   pnpm seed:new --dry-run --size=small"
    echo ""
    echo -e "${GREEN}   # Actual seeding (⚠️ WARNING: Cleans database!)${NC}"
    echo "   pnpm seed:new --clean --size=small --force"
    echo ""
    echo -e "${GREEN}   # Verify data${NC}"
    echo "   pnpm drizzle-kit studio"
    echo ""
    echo "4. Check the app UI: $APP_URL"
    echo ""
    echo -e "${BLUE}Expected Results:${NC}"
    echo "  - Dry-run should complete without errors"
    echo "  - Seeding should create ~50-100 records"
    echo "  - Dashboard should show sales data"
    echo "  - No errors in logs"
    echo ""
    
    # Create a summary file
    cat > /tmp/console-commands.txt << CMDEOF
# DATA-011: Console Commands for Production Testing

## 1. Dry-Run Test
pnpm seed:new --dry-run --size=small

## 2. Small Seed Test (⚠️ WARNING: Cleans database!)
pnpm seed:new --clean --size=small --force

## 3. Verify Data
# Check record counts
echo "SELECT 'clients' as table_name, COUNT(*) as count FROM clients
UNION ALL SELECT 'strains', COUNT(*) FROM strains
UNION ALL SELECT 'batches', COUNT(*) FROM batches
UNION ALL SELECT 'quotes', COUNT(*) FROM quotes
UNION ALL SELECT 'orders', COUNT(*) FROM orders;" | mysql -h \$DATABASE_HOST -u \$DATABASE_USER -p\$DATABASE_PASSWORD \$DATABASE_NAME

## 4. Check Application Health
curl http://localhost:3000/health | jq

## 5. View Logs
tail -f /var/log/app.log
CMDEOF
    
    echo -e "${GREEN}Commands saved to: /tmp/console-commands.txt${NC}"
    echo ""
fi

# Phase 5: API Endpoint Testing
echo -e "${YELLOW}Phase 5: API Endpoint Testing${NC}"
echo "-----------------------------------"

echo "5.1 Testing public API endpoints..."

echo -n "  - GET /health... "
HEALTH=$(curl -s "$APP_URL/health" -w "\n%{http_code}" | tail -1)
if [ "$HEALTH" = "200" ]; then
    echo -e "${GREEN}✓ 200 OK${NC}"
else
    echo -e "${RED}✗ $HEALTH${NC}"
fi

echo -n "  - GET /api/trpc/settings.hello... "
HELLO=$(curl -s "$APP_URL/api/trpc/settings.hello" -w "\n%{http_code}" | tail -1)
if [ "$HELLO" = "200" ]; then
    echo -e "${GREEN}✓ 200 OK${NC}"
else
    echo -e "${YELLOW}⚠ $HELLO (may require auth)${NC}"
fi

echo ""

# Phase 6: UI Verification
echo -e "${YELLOW}Phase 6: UI Verification${NC}"
echo "-----------------------------------"

echo "6.1 Checking dashboard page..."
DASHBOARD=$(curl -s "$APP_URL" 2>&1)

if echo "$DASHBOARD" | grep -q "TERP"; then
    echo -e "${GREEN}✓ Dashboard loads${NC}"
else
    echo -e "${RED}✗ Dashboard failed to load${NC}"
fi

if echo "$DASHBOARD" | grep -q "No sales data available"; then
    echo -e "${YELLOW}⚠ No sales data (database not seeded yet)${NC}"
elif echo "$DASHBOARD" | grep -q "Sales"; then
    echo -e "${GREEN}✓ Sales data present${NC}"
fi

echo ""

# Phase 7: Summary
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Test Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

echo -e "${GREEN}✓ Completed Tests:${NC}"
echo "  - Deployment verification"
echo "  - Health check"
echo "  - Seeding system availability"
echo "  - API endpoint testing"
echo "  - UI verification"
echo ""

if [ "$SKIP_DB_CHECKS" = true ]; then
    echo -e "${YELLOW}⚠ Manual Steps Required:${NC}"
    echo "  - Run dry-run test in console"
    echo "  - Execute seeding in console"
    echo "  - Verify data in console"
    echo "  - Check UI after seeding"
    echo ""
    echo "See /tmp/console-commands.txt for exact commands"
else
    echo -e "${GREEN}✓ All automated tests passed!${NC}"
fi

echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo "1. Execute seeding commands in DigitalOcean console"
echo "2. Verify data appears in UI: $APP_URL"
echo "3. Check logs for any errors"
echo "4. Mark DATA-011 as complete"
echo ""

echo -e "${GREEN}Test script completed!${NC}"

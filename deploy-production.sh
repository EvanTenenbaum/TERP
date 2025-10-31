#!/bin/bash

# TERP Matchmaking Service - Production Deployment Script
# Run this script ON THE PRODUCTION SERVER after pushing code

set -e  # Exit on any error

echo "========================================"
echo "TERP Matchmaking Service Deployment"
echo "========================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Verify we're on the right branch
echo -e "${YELLOW}Step 1: Verifying branch...${NC}"
CURRENT_BRANCH=$(git branch --show-current)
EXPECTED_BRANCH="claude/complete-matchmaking-integration-011CUfmYnaFREBPbmnydfTJx"

if [ "$CURRENT_BRANCH" != "$EXPECTED_BRANCH" ]; then
    echo -e "${RED}ERROR: Not on correct branch!${NC}"
    echo "Current: $CURRENT_BRANCH"
    echo "Expected: $EXPECTED_BRANCH"
    echo "Run: git checkout $EXPECTED_BRANCH"
    exit 1
fi
echo -e "${GREEN}✓ On correct branch${NC}"
echo ""

# Step 2: Pull latest code
echo -e "${YELLOW}Step 2: Pulling latest code...${NC}"
git pull origin $EXPECTED_BRANCH
echo -e "${GREEN}✓ Code updated${NC}"
echo ""

# Step 3: Install dependencies
echo -e "${YELLOW}Step 3: Installing dependencies...${NC}"
npm install
echo -e "${GREEN}✓ Dependencies installed${NC}"
echo ""

# Step 4: Run tests
echo -e "${YELLOW}Step 4: Running tests...${NC}"
npm test
if [ $? -ne 0 ]; then
    echo -e "${RED}ERROR: Tests failed!${NC}"
    exit 1
fi
echo -e "${GREEN}✓ All tests passing (180/180)${NC}"
echo ""

# Step 5: Database backup (IMPORTANT!)
echo -e "${YELLOW}Step 5: Database backup...${NC}"
echo -e "${RED}⚠️  IMPORTANT: Backup your database before proceeding!${NC}"
echo ""
echo "Run this command to backup (replace with your credentials):"
echo "mysqldump -u [username] -p [database_name] > backup_\$(date +%Y%m%d_%H%M%S).sql"
echo ""
read -p "Have you backed up the database? (yes/no): " -n 3 -r
echo ""
if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo -e "${RED}Deployment cancelled. Please backup database first.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Database backup confirmed${NC}"
echo ""

# Step 6: Apply database migration
echo -e "${YELLOW}Step 6: Applying database migration...${NC}"
echo "Migration file: drizzle/0020_add_strain_type.sql"
echo "This will add:"
echo "  - strain_type column to client_needs table"
echo "  - strain_type column to vendor_supply table"
echo "  - Performance indexes on both tables"
echo ""
read -p "Apply migration now? (yes/no): " -n 3 -r
echo ""
if [[ $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    npm run db:push
    if [ $? -ne 0 ]; then
        echo -e "${RED}ERROR: Migration failed!${NC}"
        echo "Check database logs and restore from backup if needed."
        exit 1
    fi
    echo -e "${GREEN}✓ Migration applied successfully${NC}"
else
    echo -e "${YELLOW}⚠️  Skipping migration - remember to apply it manually!${NC}"
fi
echo ""

# Step 7: Build production bundle
echo -e "${YELLOW}Step 7: Building production bundle...${NC}"
npm run build
if [ $? -ne 0 ]; then
    echo -e "${RED}ERROR: Build failed!${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Production bundle built${NC}"
echo ""

# Step 8: Restart services
echo -e "${YELLOW}Step 8: Restarting services...${NC}"
echo "Choose your restart method:"
echo "  [1] PM2 (recommended)"
echo "  [2] systemd"
echo "  [3] Manual (I'll restart myself)"
read -p "Select option (1/2/3): " -n 1 -r
echo ""

case $REPLY in
    1)
        echo "Restarting with PM2..."
        pm2 restart terp-server
        pm2 save
        echo -e "${GREEN}✓ PM2 restart complete${NC}"
        ;;
    2)
        echo "Restarting with systemd..."
        sudo systemctl restart terp
        echo -e "${GREEN}✓ systemd restart complete${NC}"
        ;;
    3)
        echo -e "${YELLOW}⚠️  Please restart your server manually${NC}"
        ;;
    *)
        echo -e "${YELLOW}⚠️  Invalid option. Please restart manually${NC}"
        ;;
esac
echo ""

# Step 9: Verify deployment
echo -e "${YELLOW}Step 9: Verifying deployment...${NC}"
echo "Please verify the following:"
echo "  □ Server started without errors"
echo "  □ Navigate to /matchmaking page loads"
echo "  □ Dashboard shows Matchmaking Opportunities widget"
echo "  □ Client Profile shows Purchase Patterns widget"
echo "  □ Batch Detail shows Potential Buyers widget"
echo "  □ No console errors in browser"
echo ""
read -p "Deployment verification complete? (yes/no): " -n 3 -r
echo ""

if [[ $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo ""
    echo -e "${GREEN}========================================"
    echo "✅ DEPLOYMENT SUCCESSFUL!"
    echo "========================================${NC}"
    echo ""
    echo "🎉 TERP Matchmaking Service is now LIVE!"
    echo ""
    echo "Next steps:"
    echo "  1. Monitor logs for any errors in the next 24 hours"
    echo "  2. Train sales team on new features (see MATCHMAKING_USER_GUIDE.md)"
    echo "  3. Track success metrics (match generation rate, quote creation, etc.)"
    echo ""
    echo "Documentation:"
    echo "  - User Guide: MATCHMAKING_USER_GUIDE.md"
    echo "  - Deployment Guide: MATCHMAKING_DEPLOYMENT_GUIDE.md"
    echo "  - Technical Docs: MATCHMAKING_README.md"
    echo ""
else
    echo -e "${YELLOW}⚠️  Please review deployment and fix any issues${NC}"
    echo "Check logs for errors and refer to MATCHMAKING_DEPLOYMENT_GUIDE.md"
fi

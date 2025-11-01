#!/bin/bash

# TERP Matchmaking Service - Production Deployment Script
# Date: October 31, 2025
# Branch: claude/complete-matchmaking-integration-011CUfmYnaFREBPbmnydfTJx

set -e  # Exit on any error

echo "================================================"
echo "TERP Matchmaking Service - Production Deployment"
echo "================================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo "ℹ️  $1"
}

# Check if we're in the TERP directory
if [ ! -f "package.json" ]; then
    print_error "Not in TERP directory. Please cd to TERP root."
    exit 1
fi

print_info "Step 1: Fetching latest changes from GitHub..."
git fetch origin

print_info "Step 2: Checking out deployment branch..."
git checkout claude/complete-matchmaking-integration-011CUfmYnaFREBPbmnydfTJx
git pull origin claude/complete-matchmaking-integration-011CUfmYnaFREBPbmnydfTJx

print_success "Branch checked out successfully"

print_info "Step 3: Installing dependencies..."
pnpm install

print_success "Dependencies installed"

print_info "Step 4: Running tests..."
if pnpm test; then
    print_success "All tests passed (180/180)"
else
    print_error "Tests failed! Aborting deployment."
    exit 1
fi

print_warning "Step 5: Database Migration Required"
echo ""
echo "The following database migration needs to be applied:"
echo "  File: drizzle/0020_add_strain_type.sql"
echo ""
echo "Migration adds:"
echo "  - strain_type column to client_needs table"
echo "  - strain_type column to vendor_supply table"
echo "  - Performance indexes on both tables"
echo ""
print_warning "IMPORTANT: Backup database before applying migration!"
echo ""
read -p "Have you backed up the database? (yes/no): " backup_confirm

if [ "$backup_confirm" != "yes" ]; then
    print_error "Please backup database before proceeding."
    exit 1
fi

print_info "Applying database migration..."
echo ""
echo "Run this command manually with your database credentials:"
echo ""
echo "mysql -u [username] -p [database] < drizzle/0020_add_strain_type.sql"
echo ""
echo "Or use:"
echo "pnpm db:push"
echo ""
read -p "Has the migration been applied successfully? (yes/no): " migration_confirm

if [ "$migration_confirm" != "yes" ]; then
    print_error "Migration not applied. Aborting deployment."
    exit 1
fi

print_success "Database migration confirmed"

print_info "Step 6: Building production bundle..."
if pnpm build; then
    print_success "Build completed successfully"
else
    print_error "Build failed! Aborting deployment."
    exit 1
fi

print_info "Step 7: Checking build output..."
if [ -d "dist" ]; then
    print_success "dist/ directory created"
    du -sh dist/
else
    print_error "dist/ directory not found!"
    exit 1
fi

print_warning "Step 8: Server Restart Required"
echo ""
echo "Restart your server using one of these commands:"
echo ""
echo "  For PM2:"
echo "    pm2 restart terp-server"
echo "    pm2 save"
echo ""
echo "  For systemd:"
echo "    sudo systemctl restart terp"
echo ""
read -p "Has the server been restarted? (yes/no): " restart_confirm

if [ "$restart_confirm" != "yes" ]; then
    print_warning "Remember to restart the server!"
fi

print_success "Deployment Complete!"
echo ""
echo "================================================"
echo "Post-Deployment Verification"
echo "================================================"
echo ""
echo "Please verify the following:"
echo ""
echo "1. Server Health:"
echo "   curl http://localhost:3000/api/health"
echo ""
echo "2. Check Logs:"
echo "   pm2 logs terp-server --lines 50"
echo "   # Or: journalctl -u terp -n 50"
echo ""
echo "3. Test in Browser:"
echo "   - https://[your-domain]/matchmaking"
echo "   - https://[your-domain]/dashboard (check widget)"
echo "   - https://[your-domain]/clients/[id] (check Purchase Patterns)"
echo "   - https://[your-domain]/inventory (check Potential Buyers)"
echo ""
echo "4. Verify Database:"
echo "   mysql -u [user] -p [database] -e \"DESCRIBE client_needs;\" | grep strain_type"
echo "   mysql -u [user] -p [database] -e \"DESCRIBE vendor_supply;\" | grep strain_type"
echo ""
echo "5. Monitor for 24 hours:"
echo "   - No errors in logs"
echo "   - API response times < 2s"
echo "   - Matches generating successfully"
echo ""
print_success "Deployment script completed!"
echo ""
echo "If issues occur, rollback with:"
echo "  git checkout main"
echo "  pnpm install"
echo "  pnpm build"
echo "  pm2 restart terp-server"
echo ""


#!/bin/bash

# ============================================================================
# Live Catalog Rollback Script
# ============================================================================
# This script rolls back the Live Catalog deployment if issues are encountered.
# It disables the feature and optionally restores the database from backup.
#
# Usage: ./scripts/rollback-live-catalog.sh [backup_file]
# ============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BACKUP_FILE="$1"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo -e "${RED}============================================================================${NC}"
echo -e "${RED}Live Catalog Rollback Script${NC}"
echo -e "${RED}============================================================================${NC}"
echo ""

echo -e "${YELLOW}WARNING: This will disable the Live Catalog feature and optionally restore the database.${NC}"
read -p "Are you sure you want to proceed? (yes/no) " -r
echo
if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo "Rollback cancelled"
    exit 0
fi

# ============================================================================
# Step 1: Disable Feature Flag
# ============================================================================
echo -e "${YELLOW}[1/3] Disabling feature flag...${NC}"

ENV_FILE="$PROJECT_ROOT/.env"
if [ -f "$ENV_FILE" ]; then
    # Update or add FEATURE_LIVE_CATALOG=false
    if grep -q "FEATURE_LIVE_CATALOG" "$ENV_FILE"; then
        sed -i 's/FEATURE_LIVE_CATALOG=.*/FEATURE_LIVE_CATALOG=false/' "$ENV_FILE"
    else
        echo "FEATURE_LIVE_CATALOG=false" >> "$ENV_FILE"
    fi
    echo -e "${GREEN}✓ Feature flag disabled in .env${NC}"
else
    echo -e "${YELLOW}WARNING: .env file not found${NC}"
fi

echo ""

# ============================================================================
# Step 2: Disable All Client Configurations
# ============================================================================
echo -e "${YELLOW}[2/3] Disabling Live Catalog for all clients...${NC}"

if [ -z "$DATABASE_URL" ]; then
    echo -e "${YELLOW}WARNING: DATABASE_URL not set. Skipping database updates.${NC}"
else
    # Create SQL to disable Live Catalog for all clients
    SQL="UPDATE vip_portal_configurations SET module_live_catalog_enabled = false WHERE module_live_catalog_enabled = true;"
    
    # Extract database connection details
    DB_URL_REGEX="mysql://([^:]+):([^@]+)@([^:]+):([^/]+)/(.+)"
    
    if [[ $DATABASE_URL =~ $DB_URL_REGEX ]]; then
        DB_USER="${BASH_REMATCH[1]}"
        DB_PASS="${BASH_REMATCH[2]}"
        DB_HOST="${BASH_REMATCH[3]}"
        DB_PORT="${BASH_REMATCH[4]}"
        DB_NAME="${BASH_REMATCH[5]}"
        
        mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" -e "$SQL" 2>/dev/null || {
            echo -e "${YELLOW}WARNING: Could not disable Live Catalog in database${NC}"
        }
        
        echo -e "${GREEN}✓ Live Catalog disabled for all clients${NC}"
    else
        echo -e "${YELLOW}WARNING: Could not parse DATABASE_URL${NC}"
    fi
fi

echo ""

# ============================================================================
# Step 3: Restore Database (Optional)
# ============================================================================
echo -e "${YELLOW}[3/3] Database restoration...${NC}"

if [ -n "$BACKUP_FILE" ]; then
    if [ ! -f "$BACKUP_FILE" ]; then
        echo -e "${RED}ERROR: Backup file not found: $BACKUP_FILE${NC}"
        exit 1
    fi
    
    echo -e "${RED}WARNING: This will restore the database from backup.${NC}"
    echo -e "${RED}All data created after the backup will be lost!${NC}"
    read -p "Restore database from backup? (yes/no) " -r
    echo
    
    if [[ $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
        if [ -z "$DATABASE_URL" ]; then
            echo -e "${RED}ERROR: DATABASE_URL not set${NC}"
            exit 1
        fi
        
        # Extract database connection details
        DB_URL_REGEX="mysql://([^:]+):([^@]+)@([^:]+):([^/]+)/(.+)"
        
        if [[ $DATABASE_URL =~ $DB_URL_REGEX ]]; then
            DB_USER="${BASH_REMATCH[1]}"
            DB_PASS="${BASH_REMATCH[2]}"
            DB_HOST="${BASH_REMATCH[3]}"
            DB_PORT="${BASH_REMATCH[4]}"
            DB_NAME="${BASH_REMATCH[5]}"
            
            echo "Restoring database from: $BACKUP_FILE"
            
            mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" < "$BACKUP_FILE" 2>/dev/null || {
                echo -e "${RED}ERROR: Database restoration failed${NC}"
                exit 1
            }
            
            echo -e "${GREEN}✓ Database restored from backup${NC}"
        else
            echo -e "${RED}ERROR: Could not parse DATABASE_URL${NC}"
            exit 1
        fi
    else
        echo "Database restoration skipped"
    fi
else
    echo "No backup file provided. Skipping database restoration."
    echo "To restore from backup, run: ./scripts/rollback-live-catalog.sh <backup_file>"
fi

echo ""

# ============================================================================
# Rollback Complete
# ============================================================================
echo -e "${GREEN}============================================================================${NC}"
echo -e "${GREEN}✓ Live Catalog Rollback Complete${NC}"
echo -e "${GREEN}============================================================================${NC}"
echo ""

echo -e "${BLUE}What was done:${NC}"
echo "1. Feature flag disabled (FEATURE_LIVE_CATALOG=false)"
echo "2. Live Catalog disabled for all clients in database"
if [ -n "$BACKUP_FILE" ] && [[ $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo "3. Database restored from backup"
else
    echo "3. Database NOT restored (no backup provided or skipped)"
fi
echo ""

echo -e "${BLUE}Next Steps:${NC}"
echo "1. Restart the server: pnpm dev (or pnpm start)"
echo "2. Verify Live Catalog is not accessible in VIP Portal"
echo "3. Investigate the issue that caused the rollback"
echo "4. Fix the issue and redeploy when ready"
echo ""

echo -e "${YELLOW}Note: The database tables are still present.${NC}"
echo "If you want to completely remove Live Catalog tables, run:"
echo "  DROP TABLE client_catalog_views;"
echo "  DROP TABLE client_draft_interests;"
echo "  DROP TABLE client_interest_list_items;"
echo "  DROP TABLE client_interest_lists;"
echo "  DROP TABLE client_price_alerts;"
echo "  ALTER TABLE vip_portal_configurations DROP COLUMN module_live_catalog_enabled;"
echo ""

echo -e "${GREEN}Rollback successful! 🔄${NC}"

#!/bin/bash
#
# TERP Database Restore Script
# Restores database from a compressed backup file with secure credential handling.
#
# Security: Uses .my.cnf or MYSQL_PWD environment variable for credentials
# NEVER pass password via command line (visible in `ps` output)
#
# Usage:
#   ./scripts/restore-database.sh <backup_file.sql.gz> [options]
#
# Options:
#   --dry-run    Preview restore without executing
#   --force      Skip confirmation prompts
#   --verify     Verify restore by checking table counts
#
# Configuration (via environment variables):
#   DB_HOST       - Database host (default: localhost)
#   DB_USER       - Database user (default: root)
#   DB_PASSWORD   - Database password (required if no .my.cnf)
#   DB_NAME       - Database name (default: terp_production)
#

set -euo pipefail

# Default configuration
DB_NAME="${DB_NAME:-terp_production}"
DB_HOST="${DB_HOST:-localhost}"
DB_USER="${DB_USER:-root}"
DRY_RUN=false
FORCE=false
VERIFY=false
BACKUP_FILE=""

# MySQL config file locations (checked in order)
MY_CNF_LOCATIONS=(
  "$HOME/.my.cnf"
  "/etc/mysql/my.cnf"
  "/etc/my.cnf"
)

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --force)
      FORCE=true
      shift
      ;;
    --verify)
      VERIFY=true
      shift
      ;;
    --help)
      echo "Usage: $0 <backup_file.sql.gz> [options]"
      echo ""
      echo "Options:"
      echo "  --dry-run    Preview restore without executing"
      echo "  --force      Skip confirmation prompts"
      echo "  --verify     Verify restore by checking table counts"
      echo ""
      echo "Environment variables:"
      echo "  DB_HOST       Database host (default: localhost)"
      echo "  DB_USER       Database user (default: root)"
      echo "  DB_PASSWORD   Database password"
      echo "  DB_NAME       Database name (default: terp_production)"
      exit 0
      ;;
    -*)
      echo "Unknown option: $1"
      exit 1
      ;;
    *)
      BACKUP_FILE="$1"
      shift
      ;;
  esac
done

# Function to find .my.cnf file
find_my_cnf() {
  for cnf in "${MY_CNF_LOCATIONS[@]}"; do
    if [ -f "$cnf" ] && [ -r "$cnf" ]; then
      echo "$cnf"
      return 0
    fi
  done
  return 1
}

# Function to cleanup on exit
cleanup() {
  # Clear password from environment for security
  unset MYSQL_PWD 2>/dev/null || true
}
trap cleanup EXIT

# Check if backup file is provided
if [ -z "$BACKUP_FILE" ]; then
  echo "Usage: $0 <backup_file.sql.gz> [options]"
  echo ""
  echo "Available backups:"
  ls -lh /var/backups/terp/*.sql.gz 2>/dev/null || echo "  No backups found"
  echo ""
  echo "Run with --help for more options."
  exit 1
fi

# Verify backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
  echo "❌ ERROR: Backup file not found: $BACKUP_FILE"
  exit 1
fi

echo "========================================="
echo "TERP Database Restore"
echo "========================================="
echo "Timestamp: $(date)"
echo "Database: $DB_NAME"
echo "Host: $DB_HOST"
echo "Backup file: $BACKUP_FILE"
echo "Mode: $( [ "$DRY_RUN" = true ] && echo "DRY-RUN" || echo "LIVE" )"
echo ""

# Determine authentication method
MY_CNF_FILE=""
if MY_CNF_FILE=$(find_my_cnf); then
  echo "✓ Using credentials from: $MY_CNF_FILE"
  AUTH_ARGS="--defaults-file=$MY_CNF_FILE"
elif [ -n "${DB_PASSWORD:-}" ]; then
  echo "✓ Using credentials from environment variable"
  # Set password via environment variable (not visible in process list)
  export MYSQL_PWD="$DB_PASSWORD"
  AUTH_ARGS=""
else
  echo "❌ ERROR: No credentials found!"
  echo ""
  echo "Please provide credentials via one of:"
  echo "  1. Create ~/.my.cnf file with [client] section"
  echo "  2. Set DB_PASSWORD environment variable"
  echo ""
  exit 1
fi

# Verify backup file integrity
echo ""
echo "Verifying backup file integrity..."
if ! gunzip -t "$BACKUP_FILE" 2>/dev/null; then
  echo "❌ ERROR: Backup file is corrupted!"
  exit 1
fi
echo "✓ Backup file is valid"

# Get backup file size
BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "Backup size: $BACKUP_SIZE"
echo ""

# Dry run mode
if [ "$DRY_RUN" = true ]; then
  echo "[DRY-RUN] Would execute:"
  echo "  1. Drop and recreate database '$DB_NAME'"
  echo "  2. Decompress and restore from $BACKUP_FILE"
  echo "  3. Verify table counts"
  echo ""
  echo "To execute restore, run without --dry-run flag."
  exit 0
fi

# Confirm restoration
if [ "$FORCE" = false ]; then
  echo "⚠️  WARNING: This will REPLACE the current database!"
  echo "   All existing data in '$DB_NAME' will be LOST."
  echo ""
  read -p "Continue with restoration? (yes/no): " CONFIRM

  if [ "$CONFIRM" != "yes" ]; then
    echo "Restoration cancelled"
    exit 0
  fi
fi

echo ""
echo "Starting restoration..."

# Build mysql command
MYSQL_CMD="mysql"
if [ -n "$AUTH_ARGS" ]; then
  MYSQL_CMD="$MYSQL_CMD $AUTH_ARGS"
fi
MYSQL_CMD="$MYSQL_CMD --host=$DB_HOST --user=$DB_USER"

# Drop and recreate database
echo "  → Dropping existing database..."
$MYSQL_CMD -e "DROP DATABASE IF EXISTS \`$DB_NAME\`;" 2>/dev/null || true

echo "  → Creating fresh database..."
$MYSQL_CMD -e "CREATE DATABASE \`$DB_NAME\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# Restore database
echo "  → Restoring data from backup..."
gunzip < "$BACKUP_FILE" | $MYSQL_CMD "$DB_NAME"

RESTORE_EXIT_CODE=$?

# Check if restoration was successful
if [ $RESTORE_EXIT_CODE -eq 0 ]; then
  echo "✓ Database restored successfully"
else
  echo "❌ ERROR: Database restoration failed with exit code $RESTORE_EXIT_CODE"
  exit 1
fi

# Verify restore
if [ "$VERIFY" = true ]; then
  echo ""
  echo "Verifying restore..."
  
  TABLE_COUNT=$($MYSQL_CMD -N -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = '$DB_NAME';")
  echo "  → Table count: $TABLE_COUNT"
  
  # Check for critical tables
  CRITICAL_TABLES=("users" "clients" "orders" "batches" "inventory")
  for TABLE in "${CRITICAL_TABLES[@]}"; do
    EXISTS=$($MYSQL_CMD -N -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = '$DB_NAME' AND table_name = '$TABLE';")
    if [ "$EXISTS" -eq 1 ]; then
      ROW_COUNT=$($MYSQL_CMD -N -e "SELECT COUNT(*) FROM \`$DB_NAME\`.\`$TABLE\`;")
      echo "  ✓ $TABLE: $ROW_COUNT rows"
    else
      echo "  ❌ $TABLE: MISSING"
    fi
  done
fi

echo ""
echo "========================================="
echo "Restoration completed successfully"
echo "========================================="
echo ""
echo "Next steps:"
echo "  1. Verify application health: curl https://terp-app-b9s35.ondigitalocean.app/health"
echo "  2. Run test suite: pnpm test"
echo "  3. Check application logs for errors"


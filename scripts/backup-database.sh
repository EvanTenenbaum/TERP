#!/bin/bash

# TERP Database Backup Script
# Performs automated MySQL database backups with compression and retention
#
# Security: Uses .my.cnf or MYSQL_PWD environment variable for credentials
# NEVER pass password via command line (visible in `ps` output)
#
# Usage:
#   ./scripts/backup-database.sh
#
# Configuration (via environment variables):
#   DB_HOST       - Database host (default: localhost)
#   DB_USER       - Database user (default: root)
#   DB_PASSWORD   - Database password (required if no .my.cnf)
#   DB_NAME       - Database name (default: terp_production)
#   BACKUP_DIR    - Backup directory (default: /var/backups/terp)
#   RETENTION_DAYS - Days to keep backups (default: 30)
#   AWS_S3_BUCKET - S3 bucket for offsite backup (optional)

set -euo pipefail

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/var/backups/terp}"
DB_NAME="${DB_NAME:-terp_production}"
DB_HOST="${DB_HOST:-localhost}"
DB_USER="${DB_USER:-root}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/${DB_NAME}_${TIMESTAMP}.sql.gz"
RETENTION_DAYS="${RETENTION_DAYS:-30}"

# MySQL config file locations (checked in order)
MY_CNF_LOCATIONS=(
  "$HOME/.my.cnf"
  "/etc/mysql/my.cnf"
  "/etc/my.cnf"
)

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

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

echo "========================================="
echo "TERP Database Backup"
echo "========================================="
echo "Timestamp: $(date)"
echo "Database: $DB_NAME"
echo "Host: $DB_HOST"
echo "Backup file: $BACKUP_FILE"
echo ""

# Determine authentication method
MY_CNF_FILE=""
if MY_CNF_FILE=$(find_my_cnf); then
  echo "✓ Using credentials from: $MY_CNF_FILE"
  AUTH_ARGS="--defaults-file=$MY_CNF_FILE"
elif [ -n "${DB_PASSWORD:-}" ]; then
  echo "✓ Using credentials from environment variable"
  # Set password via environment variable (not visible in process list)
  # This is more secure than --password command line argument
  export MYSQL_PWD="$DB_PASSWORD"
  AUTH_ARGS=""
else
  echo "✗ ERROR: No credentials found!"
  echo ""
  echo "Please provide credentials via one of:"
  echo "  1. Create ~/.my.cnf file with [client] section"
  echo "  2. Set DB_PASSWORD environment variable"
  echo ""
  echo "Example ~/.my.cnf:"
  echo "  [client]"
  echo "  user=your_user"
  echo "  password=your_password"
  echo "  host=your_host"
  echo ""
  exit 1
fi

# Perform backup using mysqldump
echo ""
echo "Starting backup..."

# Build mysqldump command
MYSQLDUMP_CMD="mysqldump"
if [ -n "$AUTH_ARGS" ]; then
  MYSQLDUMP_CMD="$MYSQLDUMP_CMD $AUTH_ARGS"
fi

$MYSQLDUMP_CMD \
  --host="$DB_HOST" \
  --user="$DB_USER" \
  --single-transaction \
  --routines \
  --triggers \
  --events \
  --set-gtid-purged=OFF \
  --column-statistics=0 \
  "$DB_NAME" 2>/dev/null | gzip > "$BACKUP_FILE"

# Store exit code
BACKUP_EXIT_CODE=${PIPESTATUS[0]}

# Check if backup was successful
if [ $BACKUP_EXIT_CODE -eq 0 ] && [ -f "$BACKUP_FILE" ] && [ -s "$BACKUP_FILE" ]; then
  SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
  echo "✓ Backup completed successfully"
  echo "  File: $BACKUP_FILE"
  echo "  Size: $SIZE"
  
  # Verify backup integrity (check if gzip file is valid)
  if gzip -t "$BACKUP_FILE" 2>/dev/null; then
    echo "✓ Backup integrity verified"
  else
    echo "✗ WARNING: Backup file may be corrupted"
  fi
else
  echo "✗ ERROR: Backup failed!"
  echo "  Exit code: $BACKUP_EXIT_CODE"
  rm -f "$BACKUP_FILE" 2>/dev/null || true
  exit 1
fi

# Remove old backups
echo ""
echo "Cleaning up old backups (older than $RETENTION_DAYS days)..."
DELETED=$(find "$BACKUP_DIR" -name "${DB_NAME}_*.sql.gz" -mtime +$RETENTION_DAYS -delete -print 2>/dev/null | wc -l)
echo "✓ Removed $DELETED old backup(s)"

# Upload to S3 (optional)
if [ -n "${AWS_S3_BUCKET:-}" ]; then
  echo ""
  echo "Uploading to S3..."
  if command -v aws &> /dev/null; then
    if aws s3 cp "$BACKUP_FILE" "s3://$AWS_S3_BUCKET/backups/" 2>/dev/null; then
      echo "✓ Backup uploaded to S3"
    else
      echo "⚠ S3 upload failed (continuing anyway)"
    fi
  else
    echo "⚠ AWS CLI not installed, skipping S3 upload"
  fi
fi

echo ""
echo "========================================="
echo "Backup process completed successfully"
echo "========================================="

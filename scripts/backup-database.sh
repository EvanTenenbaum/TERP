#!/bin/bash

# TERP Database Backup Script
# Performs automated MySQL database backups with compression and retention

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/var/backups/terp}"
DB_NAME="${DB_NAME:-terp_production}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/${DB_NAME}_${TIMESTAMP}.sql.gz"
RETENTION_DAYS="${RETENTION_DAYS:-30}"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

echo "========================================="
echo "TERP Database Backup"
echo "========================================="
echo "Timestamp: $(date)"
echo "Database: $DB_NAME"
echo "Backup file: $BACKUP_FILE"
echo ""

# Perform backup using mysqldump
echo "Starting backup..."

# Set password via environment variable (not visible in process list)
# This is more secure than --password command line argument
export MYSQL_PWD="${DB_PASSWORD}"

mysqldump \
  --host="${DB_HOST:-localhost}" \
  --user="${DB_USER:-root}" \
  --single-transaction \
  --routines \
  --triggers \
  --events \
  --set-gtid-purged=OFF \
  "$DB_NAME" 2>/dev/null | gzip > "$BACKUP_FILE"

# Store exit code before clearing password
BACKUP_EXIT_CODE=$?

# Clear password from environment for security
unset MYSQL_PWD

# Check if backup was successful
if [ $BACKUP_EXIT_CODE -eq 0 ] && [ -f "$BACKUP_FILE" ]; then
  SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
  echo "✓ Backup completed successfully"
  echo "  File: $BACKUP_FILE"
  echo "  Size: $SIZE"
else
  echo "✗ ERROR: Backup failed!"
  exit 1
fi

# Remove old backups
echo ""
echo "Cleaning up old backups (older than $RETENTION_DAYS days)..."
DELETED=$(find "$BACKUP_DIR" -name "${DB_NAME}_*.sql.gz" -mtime +$RETENTION_DAYS -delete -print | wc -l)
echo "✓ Removed $DELETED old backup(s)"

# Upload to S3 (optional)
if [ -n "$AWS_S3_BUCKET" ]; then
  echo ""
  echo "Uploading to S3..."
  aws s3 cp "$BACKUP_FILE" "s3://$AWS_S3_BUCKET/backups/" 2>/dev/null
  if [ $? -eq 0 ]; then
    echo "✓ Backup uploaded to S3"
  else
    echo "⚠ S3 upload failed (continuing anyway)"
  fi
fi

echo ""
echo "========================================="
echo "Backup process completed"
echo "========================================="


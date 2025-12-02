#!/bin/bash

# Check Backup Status and Age
# REL-002: Backup monitoring script

BACKUP_DIR="${BACKUP_DIR:-/var/backups/terp}"
DB_NAME="${DB_NAME:-terp_production}"
MAX_BACKUP_AGE_HOURS="${MAX_BACKUP_AGE_HOURS:-25}"

echo "========================================="
echo "TERP Backup Status Check"
echo "========================================="
echo "Backup directory: $BACKUP_DIR"
echo "Database: $DB_NAME"
echo "Max backup age: $MAX_BACKUP_AGE_HOURS hours"
echo ""

if [ ! -d "$BACKUP_DIR" ]; then
  echo "✗ ERROR: Backup directory does not exist: $BACKUP_DIR"
  exit 1
fi

# Find most recent backup
LATEST_BACKUP=$(find "$BACKUP_DIR" -name "${DB_NAME}_*.sql.gz" -type f -printf '%T@ %p\n' 2>/dev/null | sort -n | tail -1 | cut -d' ' -f2-)

if [ -z "$LATEST_BACKUP" ]; then
  echo "✗ WARNING: No backups found!"
  echo ""
  echo "Available files in $BACKUP_DIR:"
  ls -lah "$BACKUP_DIR" 2>/dev/null || echo "  (directory is empty)"
  exit 1
fi

# Get backup age
BACKUP_TIME=$(stat -c %Y "$LATEST_BACKUP" 2>/dev/null || stat -f %m "$LATEST_BACKUP")
CURRENT_TIME=$(date +%s)
AGE_SECONDS=$((CURRENT_TIME - BACKUP_TIME))
AGE_HOURS=$((AGE_SECONDS / 3600))
AGE_DAYS=$((AGE_HOURS / 24))

BACKUP_SIZE=$(du -h "$LATEST_BACKUP" | cut -f1)
BACKUP_DATE=$(date -d "@$BACKUP_TIME" 2>/dev/null || date -r "$BACKUP_TIME" 2>/dev/null)

echo "Latest backup:"
echo "  File: $(basename "$LATEST_BACKUP")"
echo "  Size: $BACKUP_SIZE"
echo "  Created: $BACKUP_DATE"
echo "  Age: ${AGE_HOURS} hours (${AGE_DAYS} days)"
echo ""

# Check backup integrity
if gzip -t "$LATEST_BACKUP" 2>/dev/null; then
  echo "✓ Backup file integrity: OK"
else
  echo "✗ ERROR: Backup file is corrupted!"
  exit 1
fi

# Check if backup is too old
if [ "$AGE_HOURS" -gt "$MAX_BACKUP_AGE_HOURS" ]; then
  echo "✗ ALERT: Backup is older than $MAX_BACKUP_AGE_HOURS hours!"
  echo "  Current age: $AGE_HOURS hours"
  exit 1
else
  echo "✓ Backup age: OK (less than $MAX_BACKUP_AGE_HOURS hours)"
fi

# Count total backups
TOTAL_BACKUPS=$(find "$BACKUP_DIR" -name "${DB_NAME}_*.sql.gz" -type f | wc -l | tr -d ' ')
echo ""
echo "Total backups: $TOTAL_BACKUPS"
echo "========================================="
echo "✓ Backup status check passed"
exit 0


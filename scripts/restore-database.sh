#!/bin/bash

# TERP Database Restore Script
# Restores database from a compressed backup file

# Check if backup file is provided
if [ -z "$1" ]; then
  echo "Usage: $0 <backup_file.sql.gz>"
  echo ""
  echo "Available backups:"
  ls -lh /var/backups/terp/*.sql.gz 2>/dev/null || echo "  No backups found"
  exit 1
fi

BACKUP_FILE="$1"
DB_NAME="${DB_NAME:-terp_production}"

# Verify backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
  echo "ERROR: Backup file not found: $BACKUP_FILE"
  exit 1
fi

echo "========================================="
echo "TERP Database Restore"
echo "========================================="
echo "Backup file: $BACKUP_FILE"
echo "Database: $DB_NAME"
echo "Timestamp: $(date)"
echo ""

# Verify backup file integrity
echo "Verifying backup file integrity..."
gunzip -t "$BACKUP_FILE" 2>/dev/null
if [ $? -ne 0 ]; then
  echo "✗ ERROR: Backup file is corrupted!"
  exit 1
fi
echo "✓ Backup file is valid"
echo ""

# Confirm restoration
echo "⚠ WARNING: This will REPLACE the current database!"
read -p "Continue with restoration? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
  echo "Restoration cancelled"
  exit 0
fi

echo ""
echo "Starting restoration..."

# Restore database
gunzip < "$BACKUP_FILE" | mysql \
  --host="${DB_HOST:-localhost}" \
  --user="${DB_USER:-root}" \
  --password="${DB_PASSWORD}" \
  "$DB_NAME" 2>/dev/null

# Check if restoration was successful
if [ $? -eq 0 ]; then
  echo "✓ Database restored successfully"
  echo ""
  echo "========================================="
  echo "Restoration completed"
  echo "========================================="
else
  echo "✗ ERROR: Database restoration failed!"
  exit 1
fi


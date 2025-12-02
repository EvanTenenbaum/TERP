#!/bin/bash

# Setup Cron Job for Automated Database Backups
# REL-002: Automated backup scheduling

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_SCRIPT="$SCRIPT_DIR/backup-database.sh"
CRON_SCHEDULE="${CRON_SCHEDULE:-0 2 * * *}"  # Default: 2 AM daily

echo "========================================="
echo "TERP Backup Cron Job Setup"
echo "========================================="
echo "Backup script: $BACKUP_SCRIPT"
echo "Schedule: $CRON_SCHEDULE"
echo ""

# Check if backup script exists
if [ ! -f "$BACKUP_SCRIPT" ]; then
  echo "✗ ERROR: Backup script not found at $BACKUP_SCRIPT"
  exit 1
fi

# Make sure backup script is executable
chmod +x "$BACKUP_SCRIPT"

# Create cron job entry
CRON_ENTRY="$CRON_SCHEDULE $BACKUP_SCRIPT >> /var/log/terp-backup.log 2>&1"

# Check if cron job already exists
if crontab -l 2>/dev/null | grep -q "$BACKUP_SCRIPT"; then
  echo "⚠ Backup cron job already exists"
  echo ""
  echo "Current crontab entries:"
  crontab -l | grep -A 1 -B 1 "$BACKUP_SCRIPT" || true
  echo ""
  read -p "Replace existing cron job? (yes/no): " CONFIRM
  if [ "$CONFIRM" != "yes" ]; then
    echo "Setup cancelled"
    exit 0
  fi
  # Remove existing entry
  crontab -l 2>/dev/null | grep -v "$BACKUP_SCRIPT" | crontab -
fi

# Add new cron job
(crontab -l 2>/dev/null; echo "$CRON_ENTRY") | crontab -

echo "✓ Backup cron job added successfully"
echo ""
echo "Cron job details:"
crontab -l | grep "$BACKUP_SCRIPT"
echo ""
echo "Next backup will run at: $(date -d "tomorrow 02:00" 2>/dev/null || echo "next 2 AM")"
echo ""
echo "To view cron logs: tail -f /var/log/terp-backup.log"
echo "To remove cron job: crontab -e (then delete the backup line)"
echo "========================================="


#!/bin/bash
# Cleanup old deployment status files
# Usage: bash scripts/cleanup-deployment-status.sh [days-old]
# Default: Remove files older than 7 days

DAYS_OLD="${1:-7}"

# Calculate cutoff date (works on both macOS and Linux)
if date -v-${DAYS_OLD}d +%s >/dev/null 2>&1; then
  # macOS
  CUTOFF_DATE=$(date -v-${DAYS_OLD}d +%s)
elif date -d "$DAYS_OLD days ago" +%s >/dev/null 2>&1; then
  # Linux
  CUTOFF_DATE=$(date -d "$DAYS_OLD days ago" +%s)
else
  echo "❌ Error: Could not calculate cutoff date"
  exit 1
fi

if [ -z "$CUTOFF_DATE" ]; then
  echo "❌ Error: Could not calculate cutoff date"
  exit 1
fi

CLEANED=0

# Clean up status files
for file in .deployment-status-*.log .deployment-status-*.result .deployment-monitor-*.pid .deployment-monitor-*.lock; do
  if [ -f "$file" ]; then
    # Get file modification time (works on both macOS and Linux)
    if stat -f "%m" "$file" >/dev/null 2>&1; then
      # macOS
      FILE_DATE=$(stat -f "%m" "$file" 2>/dev/null)
    else
      # Linux
      FILE_DATE=$(stat -c "%Y" "$file" 2>/dev/null)
    fi

    if [ -n "$FILE_DATE" ] && [ "$FILE_DATE" -lt "$CUTOFF_DATE" ]; then
      rm -f "$file"
      CLEANED=$((CLEANED + 1))
    fi
  fi
done

if [ $CLEANED -gt 0 ]; then
  echo "✅ Cleaned up $CLEANED old deployment status file(s)"
else
  echo "ℹ️  No old files to clean up"
fi


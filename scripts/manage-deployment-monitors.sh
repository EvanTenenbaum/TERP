#!/bin/bash
# Manage deployment monitoring processes
# Usage: 
#   bash scripts/manage-deployment-monitors.sh status
#   bash scripts/manage-deployment-monitors.sh stop [commit-sha]
#   bash scripts/manage-deployment-monitors.sh cleanup

case "$1" in
  status)
    echo "📊 Active deployment monitors:"
    FOUND=0
    for pid_file in .deployment-monitor-*.pid; do
      if [ -f "$pid_file" ]; then
        FOUND=1
        PID=$(cat "$pid_file" 2>/dev/null)
        COMMIT=$(echo "$pid_file" | sed 's/.*-\(.*\)\.pid/\1/')
        if ps -p "$PID" > /dev/null 2>&1; then
          echo "  ✅ $COMMIT (PID: $PID) - Running"
        else
          echo "  ❌ $COMMIT (PID: $PID) - Stale"
          rm -f "$pid_file"
        fi
      fi
    done
    if [ $FOUND -eq 0 ]; then
      echo "  ℹ️  No active monitors found"
    fi
    ;;
  stop)
    COMMIT="${2:-$(git rev-parse HEAD | cut -c1-7)}"
    PID_FILE=".deployment-monitor-${COMMIT}.pid"
    if [ -f "$PID_FILE" ]; then
      PID=$(cat "$PID_FILE")
      if ps -p "$PID" > /dev/null 2>&1; then
        kill "$PID" 2>/dev/null
        echo "✅ Stopped monitoring for commit $COMMIT"
      else
        echo "⚠️  Process not running"
      fi
      rm -f "$PID_FILE"
    else
      echo "⚠️  No monitoring found for commit $COMMIT"
    fi
    ;;
  cleanup)
    bash scripts/cleanup-deployment-status.sh 7
    ;;
  *)
    echo "Usage: $0 {status|stop [commit]|cleanup}"
    exit 1
    ;;
esac


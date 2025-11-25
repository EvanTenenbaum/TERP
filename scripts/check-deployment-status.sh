#!/bin/bash
# Quick deployment status check
# Usage: bash scripts/check-deployment-status.sh [commit-sha]
# Returns: 0=success, 1=failed, 2=in progress, 3=not found

COMMIT_SHA="${1:-$(git rev-parse HEAD)}"
SHORT_SHA="${COMMIT_SHA:0:7}"
STATUS_FILE=".deployment-status-${SHORT_SHA}.log"
RESULT_FILE=".deployment-status-${SHORT_SHA}.result"

if [ -f "$RESULT_FILE" ]; then
  STATUS=$(cat "$RESULT_FILE")
  if [ "$STATUS" == "success" ]; then
    echo "✅ Deployment successful!"
    exit 0
  elif [ "$STATUS" == "failed" ]; then
    echo "❌ Deployment failed!"
    echo ""
    echo "Last 20 lines of log:"
    tail -20 "$STATUS_FILE" 2>/dev/null || echo "No log file found"
    exit 1
  elif [ "$STATUS" == "timeout" ]; then
    echo "⏱️  Deployment monitoring timed out"
    echo ""
    echo "Last 20 lines of log:"
    tail -20 "$STATUS_FILE" 2>/dev/null || echo "No log file found"
    exit 1
  fi
fi

# Check if still monitoring
if [ -f "$STATUS_FILE" ]; then
  echo "⏳ Deployment still in progress..."
  echo ""
  echo "Last 5 lines:"
  tail -5 "$STATUS_FILE"
  echo ""
  echo "Watch live: tail -f $STATUS_FILE"
  exit 2  # In progress
fi

echo "⚠️  No deployment status found for commit ${SHORT_SHA}"
echo "   Run: bash scripts/monitor-deployment-auto.sh $COMMIT_SHA"
exit 3


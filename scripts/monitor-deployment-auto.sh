#!/bin/bash
# Unified Deployment Monitoring Script
# Usage: bash scripts/monitor-deployment-auto.sh [commit-sha]
# Runs in background, writes status to file

set -e

COMMIT_SHA="${1:-$(git rev-parse HEAD)}"
SHORT_SHA="${COMMIT_SHA:0:7}"
STATUS_FILE=".deployment-status-${SHORT_SHA}.log"
RESULT_FILE=".deployment-status-${SHORT_SHA}.result"
PID_FILE=".deployment-monitor-${SHORT_SHA}.pid"
LOCK_FILE=".deployment-monitor-${SHORT_SHA}.lock"

MAX_WAIT=480  # 8 minutes
INITIAL_POLL=5  # 5 seconds initially
LONG_POLL=15  # 15 seconds after 2 minutes
ELAPSED=0
SWITCH_TIME=120  # Switch to longer polling after 2 minutes

# Cleanup on exit
cleanup() {
  rm -f "$PID_FILE" "$LOCK_FILE" 2>/dev/null
  exit ${1:-0}
}

trap cleanup EXIT INT TERM

# Write status to file
log_status() {
  echo "[$(date +%H:%M:%S)] $1" | tee -a "$STATUS_FILE"
}

# Set file permissions
chmod 644 "$STATUS_FILE" 2>/dev/null || true

log_status "📊 Monitoring deployment for commit: ${SHORT_SHA}"
log_status "   Started at: $(date)"

# Method 1: Database check (fastest, most reliable)
check_database() {
  if ! command -v mysql &> /dev/null; then
    return 1
  fi

  if [ -z "$DB_HOST" ] || [ -z "$DB_PASS" ]; then
    return 1
  fi

  RESULT=$(mysql --host="${DB_HOST}" \
    --port="${DB_PORT:-25060}" \
    --user="${DB_USER:-doadmin}" \
    --password="${DB_PASS}" \
    --database="${DB_NAME:-defaultdb}" \
    --ssl-mode=REQUIRED \
    --silent --skip-column-names \
    -e "SELECT status, COALESCE(errorMessage, 'none') FROM deployments WHERE commitSha='$COMMIT_SHA' ORDER BY createdAt DESC LIMIT 1;" 2>/dev/null || echo "")

  if [ -z "$RESULT" ]; then
    return 1  # No deployment found yet
  fi

  STATUS=$(echo "$RESULT" | cut -f1)
  ERROR=$(echo "$RESULT" | cut -f2)

  case "$STATUS" in
    "success")
      log_status "✅ Deployment succeeded (database check)"
      echo "success" > "$RESULT_FILE"
      chmod 644 "$RESULT_FILE" 2>/dev/null || true
      return 0
      ;;
    "failed")
      log_status "❌ Deployment failed (database check)"
      log_status "   Error: $ERROR"
      echo "failed" > "$RESULT_FILE"
      chmod 644 "$RESULT_FILE" 2>/dev/null || true
      return 2
      ;;
    "pending"|"building"|"deploying")
      log_status "⏳ Status: $STATUS (database check)"
      return 1  # Still in progress
      ;;
    *)
      log_status "⚠️  Unknown status: $STATUS"
      return 1
      ;;
  esac
}

# Method 2: DigitalOcean API (if available)
check_do_api() {
  if [ -z "$DIGITALOCEAN_TOKEN" ] || ! command -v tsx &> /dev/null; then
    return 1
  fi

  # Try to use existing TypeScript monitoring script
  if [ -f "scripts/monitor-deployment.ts" ]; then
    # This would require app ID discovery, skip for now
    # Can be enhanced later
    return 1
  fi

  return 1
}

# Method 3: Health check (fallback)
check_health() {
  APP_URL="${APP_URL:-https://terp-app-b9s35.ondigitalocean.app}"
  
  if ! command -v curl &> /dev/null; then
    return 1
  fi

  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "${APP_URL}/health" 2>/dev/null || echo "000")
  
  if [ "$HTTP_CODE" == "200" ]; then
    log_status "✅ Health check passed (HTTP 200)"
    # Don't mark as success yet - health check doesn't confirm this specific deployment
    return 1
  else
    log_status "⚠️  Health check returned HTTP $HTTP_CODE"
    return 1
  fi
}

# Main monitoring loop
log_status "🔍 Starting monitoring loop..."

while [ $ELAPSED -lt $MAX_WAIT ]; do
  # Determine polling interval (smart polling)
  if [ $ELAPSED -lt $SWITCH_TIME ]; then
    POLL_INTERVAL=$INITIAL_POLL
  else
    POLL_INTERVAL=$LONG_POLL
  fi

  # Try database check first (most reliable)
  if check_database; then
    EXIT_CODE=$?
    if [ $EXIT_CODE -eq 0 ]; then
      log_status "✅ Deployment monitoring complete (success)"
      exit 0
    elif [ $EXIT_CODE -eq 2 ]; then
      log_status "❌ Deployment monitoring complete (failed)"
      exit 1
    fi
  fi

  # Try DO API if database doesn't have deployment yet
  if [ $ELAPSED -lt 60 ]; then
    check_do_api || true
  fi

  # Health check as fallback (but don't rely on it for success)
  if [ $ELAPSED -gt 180 ]; then
    check_health || true
  fi

  # Wait before next poll
  sleep $POLL_INTERVAL
  ELAPSED=$((ELAPSED + POLL_INTERVAL))

  # Log progress every 30 seconds
  if [ $((ELAPSED % 30)) -eq 0 ]; then
    log_status "⏳ Still monitoring... (${ELAPSED}s elapsed)"
  fi
done

# Timeout
log_status "⏱️  Timeout: Deployment did not complete within $MAX_WAIT seconds"
log_status "   Last check at: $(date)"
echo "timeout" > "$RESULT_FILE"
chmod 644 "$RESULT_FILE" 2>/dev/null || true
exit 1


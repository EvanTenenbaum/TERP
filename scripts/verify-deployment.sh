#!/bin/bash
# Verify Deployment Status
# Usage: ./scripts/verify-deployment.sh [commit-sha]

set -e

COMMIT_SHA="${1:-$(git rev-parse HEAD)}"
MAX_WAIT=600  # 10 minutes
POLL_INTERVAL=30  # 30 seconds
ELAPSED=0

echo "🚀 Verifying deployment for commit: $COMMIT_SHA"
echo "⏱️  Max wait time: $MAX_WAIT seconds"
echo ""

# Database credentials (from DEVELOPMENT_PROTOCOLS.md)
DB_HOST="terp-mysql-db-do-user-28175253-0.m.db.ondigitalocean.com"
DB_PORT="25060"
DB_USER="doadmin"
DB_PASS="<REDACTED>"
DB_NAME="defaultdb"

# Function to query deployment status
check_deployment() {
    mysql --host="$DB_HOST" \
          --port="$DB_PORT" \
          --user="$DB_USER" \
          --password="$DB_PASS" \
          --database="$DB_NAME" \
          --ssl-mode=REQUIRED \
          --silent \
          --skip-column-names \
          -e "SELECT status, COALESCE(errorMessage, 'none') FROM deployments WHERE commitSha='$COMMIT_SHA' ORDER BY createdAt DESC LIMIT 1;"
}

# Poll for deployment status
while [ $ELAPSED -lt $MAX_WAIT ]; do
    RESULT=$(check_deployment 2>&1 || echo "error query_failed")

    if [ "$RESULT" == "error query_failed" ]; then
        echo "⚠️  Database query failed, retrying..."
        sleep 5
        continue
    fi

    if [ -z "$RESULT" ]; then
        echo "⏳ [$ELAPSED s] No deployment found yet..."
    else
        STATUS=$(echo "$RESULT" | cut -f1)
        ERROR=$(echo "$RESULT" | cut -f2)

        case "$STATUS" in
            "success")
                echo "✅ Deployment succeeded!"
                echo ""
                echo "📊 Deployment Details:"
                mysql --host="$DB_HOST" \
                      --port="$DB_PORT" \
                      --user="$DB_USER" \
                      --password="$DB_PASS" \
                      --database="$DB_NAME" \
                      --ssl-mode=REQUIRED \
                      -e "SELECT id, commitSha, status, startedAt, completedAt, duration FROM deployments WHERE commitSha='$COMMIT_SHA' ORDER BY createdAt DESC LIMIT 1;"
                exit 0
                ;;
            "failed")
                echo "❌ Deployment failed!"
                echo "Error: $ERROR"
                echo ""
                echo "📊 Deployment Details:"
                mysql --host="$DB_HOST" \
                      --port="$DB_PORT" \
                      --user="$DB_USER" \
                      --password="$DB_PASS" \
                      --database="$DB_NAME" \
                      --ssl-mode=REQUIRED \
                      -e "SELECT id, commitSha, status, startedAt, completedAt, errorMessage FROM deployments WHERE commitSha='$COMMIT_SHA' ORDER BY createdAt DESC LIMIT 1;"
                exit 1
                ;;
            "pending"|"building"|"deploying")
                echo "⏳ [$ELAPSED s] Status: $STATUS"
                ;;
            *)
                echo "⚠️  Unknown status: $STATUS"
                ;;
        esac
    fi

    sleep $POLL_INTERVAL
    ELAPSED=$((ELAPSED + POLL_INTERVAL))
done

echo "⏱️  Timeout: Deployment did not complete within $MAX_WAIT seconds"
echo "Last known status:"
check_deployment
exit 1

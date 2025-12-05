#!/bin/bash

# Monitor Railway Deployment for SKIP_SEEDING Bypass
# Usage: ./scripts/monitor-railway-deploy.sh

set -e

APP_URL="https://terp-app-production.up.railway.app"
HEALTH_ENDPOINT="${APP_URL}/health"
MAX_ATTEMPTS=30
ATTEMPT=0
INTERVAL=10

echo "🚂 Monitoring Railway Deployment"
echo "=================================="
echo "App URL: ${APP_URL}"
echo "Health Endpoint: ${HEALTH_ENDPOINT}"
echo "Max Attempts: ${MAX_ATTEMPTS} (${MAX_ATTEMPTS} * ${INTERVAL}s = $((MAX_ATTEMPTS * INTERVAL))s total)"
echo ""

while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
  ATTEMPT=$((ATTEMPT + 1))
  TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
  
  echo "[${TIMESTAMP}] Attempt ${ATTEMPT}/${MAX_ATTEMPTS}..."
  
  # Check health endpoint
  HTTP_CODE=$(curl -s -o /tmp/health_response.json -w "%{http_code}" "${HEALTH_ENDPOINT}" 2>&1 || echo "000")
  
  if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ SUCCESS! Health endpoint returned 200"
    echo "Response:"
    cat /tmp/health_response.json | jq '.' 2>/dev/null || cat /tmp/health_response.json
    echo ""
    echo "🎉 Deployment successful! App is running."
    exit 0
  elif [ "$HTTP_CODE" = "502" ]; then
    echo "⚠️  Health endpoint returned 502 (Bad Gateway)"
    echo "   This usually means:"
    echo "   - App is still deploying"
    echo "   - App crashed during startup"
    echo "   - SKIP_SEEDING may not be set"
  elif [ "$HTTP_CODE" = "503" ]; then
    echo "⚠️  Health endpoint returned 503 (Service Unavailable)"
    echo "   App may be starting up..."
  elif [ "$HTTP_CODE" = "000" ]; then
    echo "❌ Connection failed (endpoint not reachable)"
  else
    echo "⚠️  Health endpoint returned ${HTTP_CODE}"
  fi
  
  # Check homepage
  HOME_CODE=$(curl -s -o /dev/null -w "%{http_code}" "${APP_URL}/" 2>&1 || echo "000")
  if [ "$HOME_CODE" = "200" ]; then
    echo "✅ Homepage is accessible (200)"
  else
    echo "⚠️  Homepage returned ${HOME_CODE}"
  fi
  
  echo ""
  
  if [ $ATTEMPT -lt $MAX_ATTEMPTS ]; then
    echo "Waiting ${INTERVAL} seconds before next check..."
    sleep $INTERVAL
  fi
done

echo "❌ Deployment monitoring timeout after ${MAX_ATTEMPTS} attempts"
echo ""
echo "🔍 Troubleshooting Steps:"
echo "1. Check Railway dashboard for deployment status"
echo "2. Verify SKIP_SEEDING=true is set in Railway variables"
echo "3. Check Railway logs: railway logs --tail 100"
echo "4. Look for bypass messages: railway logs --tail 100 | grep -i skip"
echo "5. Check for errors: railway logs --tail 200 | grep -i error"
echo ""
echo "📋 Expected log messages when SKIP_SEEDING is working:"
echo "   ⏭️  SKIP_SEEDING is set - skipping all default data seeding"
echo "   💡 To enable seeding: remove SKIP_SEEDING or set it to false"
echo ""
exit 1

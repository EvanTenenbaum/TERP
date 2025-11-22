#!/bin/bash
APP_ID="1fd40be5-b9af-4e71-ab1d-3af0864a7da4"

echo "🔍 Finding latest deployment..."
DEP_ID=$(doctl apps list-deployments $APP_ID --format ID --no-header | head -n 1)
echo "Tracking Deployment: $DEP_ID"

while true; do
    STATUS=$(doctl apps get-deployment $APP_ID $DEP_ID --format Phase --no-header)
    echo "Current Status: $STATUS"
    
    if [ "$STATUS" == "ACTIVE" ]; then
        echo "✅ Deployment Successful!"
        exit 0
    elif [ "$STATUS" == "FAILED" ]; then
        echo "❌ Deployment Failed!"
        doctl apps logs $APP_ID $DEP_ID --type build --tail 20
        exit 1
    fi
    sleep 10
done

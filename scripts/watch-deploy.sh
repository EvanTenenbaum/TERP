#!/bin/bash

# Watch deployment progress for production or development

# Load app IDs
source .env.app-ids 2>/dev/null || true

# Determine which app to watch
if [ "$1" == "--dev" ] || [ "$1" == "-d" ]; then
    APP_ID=$DEV_APP_ID
    ENV_NAME="Development"
elif [ "$1" == "--prod" ] || [ "$1" == "-p" ]; then
    APP_ID=$PROD_APP_ID
    ENV_NAME="Production"
elif [ -n "$1" ]; then
    # Custom app ID provided
    APP_ID=$1
    ENV_NAME="Custom"
else
    # Default to production
    APP_ID=${PROD_APP_ID:-"1fd40be5-b9af-4e71-ab1d-3af0864a7da4"}
    ENV_NAME="Production"
fi

if [ -z "$APP_ID" ]; then
    echo "❌ Error: App ID not found"
    echo ""
    echo "Usage:"
    echo "  ./scripts/watch-deploy.sh --dev   # Watch development"
    echo "  ./scripts/watch-deploy.sh --prod  # Watch production"
    echo "  ./scripts/watch-deploy.sh <id>    # Watch specific app"
    echo ""
    echo "Or configure .env.app-ids with:"
    echo "  PROD_APP_ID=<your-prod-id>"
    echo "  DEV_APP_ID=<your-dev-id>"
    exit 1
fi

echo "🔍 Watching $ENV_NAME deployment..."
echo "   App ID: $APP_ID"
echo ""

DEP_ID=$(doctl apps list-deployments $APP_ID --format ID --no-header | head -n 1)

if [ -z "$DEP_ID" ]; then
    echo "❌ No deployments found"
    exit 1
fi

echo "   Deployment ID: $DEP_ID"
echo ""

while true; do
    STATUS=$(doctl apps get-deployment $APP_ID $DEP_ID --format Phase --no-header)
    TIMESTAMP=$(date '+%H:%M:%S')
    echo "[$TIMESTAMP] Status: $STATUS"
    
    if [ "$STATUS" == "ACTIVE" ]; then
        echo ""
        echo "✅ Deployment Successful!"
        
        # Get app URL
        APP_URL=$(doctl apps get $APP_ID --format DefaultIngress --no-header)
        echo "   URL: https://$APP_URL"
        
        # Test health endpoint
        echo ""
        echo "🏥 Testing health endpoint..."
        if curl -sf "https://$APP_URL/health" > /dev/null; then
            echo "   ✅ Health check passed"
        else
            echo "   ⚠️  Health check failed (may still be starting)"
        fi
        
        exit 0
    elif [ "$STATUS" == "FAILED" ] || [ "$STATUS" == "ERROR" ]; then
        echo ""
        echo "❌ Deployment Failed!"
        echo ""
        echo "📋 Recent build logs:"
        doctl apps logs $APP_ID --type build --tail 50
        exit 1
    elif [ "$STATUS" == "CANCELED" ]; then
        echo ""
        echo "⚠️  Deployment Canceled"
        exit 1
    fi
    
    sleep 10
done
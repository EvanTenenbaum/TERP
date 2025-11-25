#!/bin/bash
# Monitor Slack Bot Deployment
# Checks deployment status every 30 seconds until ACTIVE or ERROR

APP_ID="1fd40be5-b9af-4e71-ab1d-3af0864a7da4"
MAX_CHECKS=40  # 20 minutes max (40 * 30 seconds)
CHECK_INTERVAL=30

echo "🔍 Monitoring Slack Bot Deployment"
echo "===================================="
echo "App ID: $APP_ID"
echo "Check interval: $CHECK_INTERVAL seconds"
echo "Max checks: $MAX_CHECKS"
echo ""
echo "Starting monitoring..."
echo ""

for i in $(seq 1 $MAX_CHECKS); do
    # Get latest deployment
    LATEST=$(doctl apps list-deployments $APP_ID --format ID,Phase --no-header | head -1)
    DEPLOYMENT_ID=$(echo $LATEST | awk '{print $1}')
    PHASE=$(echo $LATEST | awk '{print $2}')
    
    TIMESTAMP=$(date +"%H:%M:%S")
    echo "[$TIMESTAMP] Check $i/$MAX_CHECKS: $PHASE"
    
    if [ "$PHASE" = "ACTIVE" ]; then
        echo ""
        echo "✅✅✅ DEPLOYMENT SUCCESSFUL! ✅✅✅"
        echo ""
        echo "Deployment ID: $DEPLOYMENT_ID"
        echo "Status: ACTIVE"
        echo ""
        echo "🎉 The Slack bot worker is now running!"
        echo ""
        echo "📝 Next Steps:"
        echo "1. Test the bot in Slack by sending a message containing 'status'"
        echo "2. The bot should respond with roadmap status"
        echo "3. You can also try 'execute' or 'fix' to run tasks"
        echo ""
        echo "📊 To check runtime logs:"
        echo "   doctl apps logs $APP_ID --type=run --component=terp-commander"
        echo ""
        echo "🔍 Recent logs:"
        doctl apps logs $APP_ID --type=run --component=terp-commander 2>&1 | tail -20
        exit 0
    elif [ "$PHASE" = "ERROR" ]; then
        echo ""
        echo "❌ Deployment FAILED"
        echo ""
        echo "Deployment ID: $DEPLOYMENT_ID"
        echo "Checking error details..."
        echo ""
        doctl apps logs $APP_ID --type=run --deployment=$DEPLOYMENT_ID 2>&1 | tail -30
        exit 1
    else
        # Still in progress
        if [ $((i % 4)) -eq 0 ]; then
            # Every 4th check, show more detail
            echo "   Still in progress... (Phase: $PHASE)"
        fi
        sleep $CHECK_INTERVAL
    fi
done

echo ""
echo "⏱️  Monitoring timeout reached ($MAX_CHECKS checks)"
echo "Deployment is still in progress."
echo ""
echo "Current status: $PHASE"
echo ""
echo "To continue monitoring manually:"
echo "  ./scripts/monitor-slack-bot-deployment.sh"
echo ""
echo "Or check status:"
echo "  doctl apps list-deployments $APP_ID --format ID,Phase,Created | head -3"
exit 2


#!/bin/bash

# Auto Deploy Monitor & Self-Heal Script
# Monitors DigitalOcean deployment and attempts automatic fixes on failure

set -e

MAX_ATTEMPTS=3
TIMEOUT_MINUTES=10
ATTEMPT=0
LAST_ERROR=""
ERROR_COUNT=0

echo "🚀 Starting automated deployment monitoring and self-healing..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Get current commit
COMMIT=$(git rev-parse HEAD | cut -c1-7)
echo "📍 Monitoring deployment for commit: $COMMIT"
echo ""

monitor_deployment() {
    local attempt=$1
    echo "🔍 Attempt $attempt/$MAX_ATTEMPTS: Monitoring deployment..."
    
    # Wait for deployment to start
    sleep 10
    
    # Monitor with timeout
    timeout ${TIMEOUT_MINUTES}m ./scripts/watch-deploy.sh || {
        local exit_code=$?
        if [ $exit_code -eq 124 ]; then
            echo "⏱️  Deployment timeout after ${TIMEOUT_MINUTES} minutes"
            return 2
        fi
        return 1
    }
    
    return $?
}

analyze_failure() {
    echo ""
    echo "🔬 Analyzing deployment failure..."
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    # Get build logs
    echo "📋 Build logs:"
    ./scripts/terp-logs.sh build 50 > /tmp/build-logs.txt 2>&1 || true
    
    # Get deploy logs
    echo "📋 Deploy logs:"
    ./scripts/terp-logs.sh deploy 50 > /tmp/deploy-logs.txt 2>&1 || true
    
    # Analyze logs for common issues
    local error_type=""
    
    if grep -qi "typescript error\|type error\|TS[0-9]" /tmp/build-logs.txt; then
        error_type="typescript"
        echo "❌ TypeScript errors detected"
    elif grep -qi "module not found\|cannot find module\|ENOENT" /tmp/build-logs.txt; then
        error_type="missing_dependency"
        echo "❌ Missing dependency detected"
    elif grep -qi "out of memory\|heap out of memory" /tmp/build-logs.txt; then
        error_type="memory"
        echo "❌ Out of memory error"
    elif grep -qi "database.*connection\|ECONNREFUSED.*25060" /tmp/deploy-logs.txt; then
        error_type="database"
        echo "❌ Database connection error"
    elif grep -qi "environment variable.*not set\|missing.*env" /tmp/deploy-logs.txt; then
        error_type="env_var"
        echo "❌ Missing environment variable"
    elif grep -qi "port.*already in use\|EADDRINUSE" /tmp/deploy-logs.txt; then
        error_type="port"
        echo "❌ Port conflict"
    else
        error_type="unknown"
        echo "❓ Unknown error type"
    fi
    
    # Check if same error as last time
    if [ "$error_type" = "$LAST_ERROR" ]; then
        ERROR_COUNT=$((ERROR_COUNT + 1))
        echo "⚠️  Same error repeated $ERROR_COUNT times"
    else
        ERROR_COUNT=1
        LAST_ERROR="$error_type"
    fi
    
    echo "$error_type"
}

attempt_fix() {
    local error_type=$1
    local attempt=$2
    
    echo ""
    echo "🔧 Attempting automatic fix for: $error_type"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    case $error_type in
        typescript)
            echo "🔨 Running TypeScript checks and attempting fix..."
            pnpm typecheck 2>&1 | tee /tmp/typecheck.txt || true
            
            # Check if it's a simple missing type
            if grep -q "Property.*does not exist" /tmp/typecheck.txt; then
                echo "💡 Detected missing property - this requires manual intervention"
                return 1
            fi
            
            # Try running build to see full errors
            pnpm build 2>&1 | tee /tmp/build-output.txt || {
                echo "❌ Build failed - TypeScript errors require manual fix"
                cat /tmp/build-output.txt
                return 1
            }
            ;;
            
        missing_dependency)
            echo "🔨 Reinstalling dependencies..."
            pnpm install --frozen-lockfile || {
                echo "⚠️  Frozen lockfile failed, trying regular install..."
                pnpm install
            }
            
            # Update lockfile
            git add pnpm-lock.yaml
            git commit -m "fix(deploy): update lockfile after dependency resolution" || true
            ;;
            
        memory)
            echo "🔨 Memory issue detected - checking build configuration..."
            echo "💡 This may require increasing DigitalOcean instance size"
            echo "💡 Or optimizing build process (code splitting, lazy loading)"
            return 1
            ;;
            
        database)
            echo "🔨 Database connection issue - checking configuration..."
            echo "💡 Verify DATABASE_URL is set in DigitalOcean environment"
            echo "💡 Check database is running: doctl databases list"
            return 1
            ;;
            
        env_var)
            echo "🔨 Environment variable issue detected..."
            echo "💡 Check DigitalOcean App Settings > Environment Variables"
            echo "💡 Required vars: DATABASE_URL, CLERK_SECRET_KEY, etc."
            return 1
            ;;
            
        port)
            echo "🔨 Port conflict - this should auto-resolve on redeploy..."
            sleep 5
            return 0
            ;;
            
        unknown)
            echo "❓ Unknown error - manual intervention required"
            echo "📋 Last 20 lines of build logs:"
            tail -20 /tmp/build-logs.txt
            echo ""
            echo "📋 Last 20 lines of deploy logs:"
            tail -20 /tmp/deploy-logs.txt
            return 1
            ;;
    esac
    
    return 0
}

# Main monitoring loop
while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
    ATTEMPT=$((ATTEMPT + 1))
    
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🔄 Deployment Attempt $ATTEMPT/$MAX_ATTEMPTS"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    if monitor_deployment $ATTEMPT; then
        echo ""
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "✅ Deployment successful!"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo ""
        echo "🎉 Deployment completed successfully on attempt $ATTEMPT"
        echo "📍 Commit: $COMMIT"
        echo "🌐 URL: https://terp-app-b9s35.ondigitalocean.app"
        echo ""
        
        # Verify health
        echo "🏥 Verifying application health..."
        if curl -sf https://terp-app-b9s35.ondigitalocean.app/health > /dev/null; then
            echo "✅ Health check passed"
        else
            echo "⚠️  Health check failed - application may not be fully ready"
        fi
        
        exit 0
    fi
    
    # Deployment failed
    echo "❌ Deployment failed on attempt $ATTEMPT"
    
    # Check if we've hit the same error too many times
    if [ $ERROR_COUNT -ge 2 ]; then
        echo ""
        echo "🛑 Same error repeated $ERROR_COUNT times - stopping auto-heal"
        echo "💡 Manual intervention required"
        break
    fi
    
    # Don't attempt fix on last attempt
    if [ $ATTEMPT -ge $MAX_ATTEMPTS ]; then
        echo "🛑 Max attempts reached"
        break
    fi
    
    # Analyze and attempt fix
    error_type=$(analyze_failure)
    
    if attempt_fix "$error_type" $ATTEMPT; then
        echo "✅ Fix applied successfully"
        echo "🔄 Committing and pushing fix..."
        
        # Commit fix if there are changes
        if ! git diff --quiet || ! git diff --cached --quiet; then
            git add -A
            git commit -m "fix(deploy): auto-heal attempt $ATTEMPT - fix $error_type error" || true
            git push origin main
            
            echo "✅ Fix pushed - waiting for new deployment..."
            sleep 15
        else
            echo "ℹ️  No changes to commit - retrying deployment..."
            # Trigger manual deployment
            echo "🔄 Triggering manual deployment..."
            APP_ID=$(doctl apps list --format ID --no-header | head -1)
            if [ -n "$APP_ID" ]; then
                doctl apps create-deployment "$APP_ID"
                sleep 15
            fi
        fi
    else
        echo "❌ Automatic fix not possible for this error type"
        break
    fi
done

# If we get here, all attempts failed
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "❌ DEPLOYMENT FAILED AFTER $ATTEMPT ATTEMPTS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 Summary:"
echo "  Attempts: $ATTEMPT/$MAX_ATTEMPTS"
echo "  Last error: $LAST_ERROR"
echo "  Error count: $ERROR_COUNT"
echo ""
echo "📋 Diagnostic Information:"
echo ""
echo "Build logs (last 30 lines):"
tail -30 /tmp/build-logs.txt 2>/dev/null || echo "No build logs available"
echo ""
echo "Deploy logs (last 30 lines):"
tail -30 /tmp/deploy-logs.txt 2>/dev/null || echo "No deploy logs available"
echo ""
echo "💡 Recommended Actions:"
echo "  1. Review logs above for specific error"
echo "  2. Check DigitalOcean console for more details"
echo "  3. Verify environment variables are set"
echo "  4. Check database connectivity"
echo "  5. Review recent code changes"
echo ""
echo "🔗 Useful Commands:"
echo "  doctl apps list"
echo "  doctl apps logs <APP_ID> --type build"
echo "  doctl apps logs <APP_ID> --type deploy"
echo "  ./scripts/terp-logs.sh build"
echo "  ./scripts/terp-logs.sh deploy"
echo ""

exit 1

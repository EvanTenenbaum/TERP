#!/bin/bash
#
# Run DATA-002-AUGMENT scripts via DigitalOcean App Platform Job
# This script deploys the job configuration and runs it from stable connection
#

set -e

APP_ID="1fd40be5-b9af-4e71-ab1d-3af0864a7da4"
JOB_NAME="augment-data"
SPEC_FILE=".do/app-augment-data-job.yaml"

echo "🚀 Running DATA-002-AUGMENT via DigitalOcean Job"
echo "=================================================="
echo ""

# Check if doctl is installed
if ! command -v doctl &> /dev/null; then
    echo "❌ doctl is not installed. Please install it first:"
    echo "   https://docs.digitalocean.com/reference/doctl/how-to/install/"
    exit 1
fi

# Check if authenticated
if ! doctl auth list &> /dev/null; then
    echo "❌ Not authenticated with doctl. Please run:"
    echo "   doctl auth init"
    exit 1
fi

echo "📋 Step 1: Deploying job configuration..."
doctl apps update $APP_ID --spec $SPEC_FILE

echo ""
echo "⏳ Waiting for job to be available..."
sleep 5

echo ""
echo "📋 Step 2: Verifying job exists..."
doctl apps list-jobs $APP_ID | grep -q $JOB_NAME || {
    echo "❌ Job '$JOB_NAME' not found. Please check the spec file."
    exit 1
}

echo ""
echo "🚀 Step 3: Running job..."
JOB_RUN=$(doctl apps create-job-run $APP_ID $JOB_NAME --format ID --no-header)

if [ -z "$JOB_RUN" ]; then
    echo "❌ Failed to create job run"
    exit 1
fi

echo "✅ Job run created: $JOB_RUN"
echo ""
echo "📊 Step 4: Monitoring job..."
echo "   View logs: doctl apps logs $APP_ID --type run --component $JOB_NAME"
echo "   Check status: doctl apps get-job-run $APP_ID $JOB_RUN"
echo ""
echo "⏳ Waiting for job to start..."
sleep 3

# Show initial status
doctl apps get-job-run $APP_ID $JOB_RUN --format Status,StartedAt,FinishedAt

echo ""
echo "✅ Job submitted successfully!"
echo "   Monitor progress: doctl apps logs $APP_ID --type run --component $JOB_NAME"
echo "   Check status: doctl apps get-job-run $APP_ID $JOB_RUN"

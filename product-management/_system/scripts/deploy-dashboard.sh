#!/bin/bash
# Deploy dashboard.json - Fetch latest from GitHub
# The published site at https://terproadmap.manus.space should fetch from:
# https://raw.githubusercontent.com/EvanTenenbaum/TERP/main/product-management/pm-evaluation/dashboard.json

set -e

DASHBOARD_URL="https://raw.githubusercontent.com/EvanTenenbaum/TERP/main/product-management/pm-evaluation/dashboard.json"

echo "📊 Dashboard Deployment Helper"
echo "Published Site: https://terproadmap.manus.space"
echo "Data Source: $DASHBOARD_URL"
echo ""

# Fetch latest
curl -s "$DASHBOARD_URL" -o /tmp/dashboard-latest.json

# Validate
if ! jq empty /tmp/dashboard-latest.json 2>/dev/null; then
    echo "❌ Invalid JSON"
    exit 1
fi

# Show info
LAST_UPDATED=$(jq -r '.last_updated' /tmp/dashboard-latest.json)
TOTAL=$(jq -r '.summary.total' /tmp/dashboard-latest.json)

echo "✅ Latest Dashboard:"
echo "  Updated: $LAST_UPDATED"
echo "  Total Initiatives: $TOTAL"
echo ""
echo "🔗 Configure your published site to fetch from:"
echo "  $DASHBOARD_URL"

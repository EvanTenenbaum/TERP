#!/bin/bash

# Test Schema Validation API Endpoint
# This script calls the adminSchema.validate endpoint in production

echo "🔍 Testing Schema Validation API Endpoint..."
echo ""

# Production URL
PROD_URL="https://terp-app-b9s35.ondigitalocean.app"

# You'll need to get an auth token first
echo "To test this endpoint:"
echo "1. Log in to $PROD_URL"
echo "2. Open browser dev tools"
echo "3. Find the auth token in localStorage or cookies"
echo "4. Run this curl command:"
echo ""
echo "curl -X POST '$PROD_URL/api/trpc/adminSchema.validate' \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -H 'Authorization: Bearer YOUR_TOKEN_HERE' \\"
echo "  -d '{}'"
echo ""
echo "Or simply visit the production site and call the endpoint from the browser console:"
echo ""
echo "fetch('/api/trpc/adminSchema.validate', {"
echo "  method: 'POST',"
echo "  headers: { 'Content-Type': 'application/json' },"
echo "  credentials: 'include'"
echo "}).then(r => r.json()).then(console.log)"
echo ""

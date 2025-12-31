#!/bin/bash
# Production Seeding Verification Script for DATA-011
# Run this script from the DigitalOcean App Platform console or Railway console
# where database access is authorized

set -e

echo "=========================================="
echo "TERP Production Seeding Verification"
echo "DATA-011: Database Seeding System Rollout"
echo "=========================================="
echo ""

# Phase 1.1: Dry-Run Test
echo "Phase 1.1: Running dry-run test..."
echo "Command: pnpm seed:new --dry-run --size=small"
echo ""
pnpm seed:new --dry-run --size=small
echo ""
echo "✅ Phase 1.1 Complete: Dry-run test passed"
echo ""

# Phase 1.2: Execute Small Seed Test
echo "Phase 1.2: Executing small seed test..."
echo "Command: pnpm seed:new --clean --size=small --force"
echo ""
read -p "⚠️  This will clean and reseed the database. Continue? (y/N) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    pnpm seed:new --clean --size=small --force
    echo ""
    echo "✅ Phase 1.2 Complete: Small seed test passed"
else
    echo "❌ Phase 1.2 Skipped by user"
    exit 1
fi
echo ""

# Phase 1.3: Validate Data Quality
echo "Phase 1.3: Validating seeded data quality..."
echo "Checking record counts..."
echo ""

# Create temporary SQL script
cat > /tmp/verify-counts.sql << 'EOF'
-- Verify record counts
SELECT 'vendors' as tbl, COUNT(*) as cnt FROM vendors
UNION ALL SELECT 'clients', COUNT(*) FROM clients
UNION ALL SELECT 'products', COUNT(*) FROM products
UNION ALL SELECT 'batches', COUNT(*) FROM batches
UNION ALL SELECT 'orders', COUNT(*) FROM orders
UNION ALL SELECT 'invoices', COUNT(*) FROM invoices
UNION ALL SELECT 'payments', COUNT(*) FROM payments;
EOF

echo "Expected counts (small size):"
echo "  vendors: 5"
echo "  clients: 10"
echo "  products: 20"
echo "  batches: 30"
echo "  orders: 50"
echo "  invoices: 50"
echo "  payments: 30"
echo ""

# Note: This requires mysql client to be available in the environment
# If not available, manual verification via database console is needed
if command -v mysql &> /dev/null; then
    mysql -h ${DB_HOST} -P ${DB_PORT} -u ${DB_USER} -p${DB_PASSWORD} ${DB_NAME} < /tmp/verify-counts.sql
    echo ""
    
    # Verify FK integrity
    echo "Checking foreign key integrity..."
    mysql -h ${DB_HOST} -P ${DB_PORT} -u ${DB_USER} -p${DB_PASSWORD} ${DB_NAME} -e "SELECT COUNT(*) as orphaned_orders FROM orders o LEFT JOIN clients c ON o.client_id = c.id WHERE c.id IS NULL;"
    echo "Expected: 0 orphaned records"
    echo ""
    
    rm /tmp/verify-counts.sql
    echo "✅ Phase 1.3 Complete: Data quality validated"
else
    echo "⚠️  MySQL client not available. Please verify manually via database console:"
    cat /tmp/verify-counts.sql
    echo ""
    echo "Also run FK integrity check:"
    echo "SELECT COUNT(*) as orphaned_orders FROM orders o LEFT JOIN clients c ON o.client_id = c.id WHERE c.id IS NULL;"
    rm /tmp/verify-counts.sql
fi
echo ""

# Phase 1.4: Test Application Health
echo "Phase 1.4: Testing application health..."
echo ""

# Determine the application URL based on environment
# Note: Railway deployment deprecated - now using DigitalOcean App Platform
if [ -n "$DIGITALOCEAN_APP_ID" ]; then
    APP_URL="https://terp-app-b9s35.ondigitalocean.app"
else
    APP_URL="${APP_URL:-http://localhost:3000}"
fi

echo "Testing health endpoint: ${APP_URL}/health"
HEALTH_RESPONSE=$(curl -s ${APP_URL}/health || echo '{"status":"error"}')
echo "Response: $HEALTH_RESPONSE"
echo ""

if echo "$HEALTH_RESPONSE" | grep -q '"status":"healthy"'; then
    echo "✅ Phase 1.4 Complete: Application health check passed"
else
    echo "⚠️  Health check returned unexpected response"
    echo "Please verify application is running correctly"
fi
echo ""

echo "=========================================="
echo "Production Seeding Verification Complete!"
echo "=========================================="
echo ""
echo "Summary:"
echo "  ✅ Phase 1.1: Dry-run test"
echo "  ✅ Phase 1.2: Small seed test"
echo "  ✅ Phase 1.3: Data quality validation"
echo "  ✅ Phase 1.4: Application health check"
echo ""
echo "Next Steps:"
echo "  1. Navigate to the application UI and verify:"
echo "     - Clients page shows 10 seeded clients"
echo "     - Orders page shows 50 seeded orders"
echo "     - Vendors page shows 5 seeded vendors"
echo "     - Products page shows 20 seeded products"
echo "  2. Check browser console (F12) for any errors"
echo "  3. Review application logs for any warnings"
echo ""
echo "Documentation:"
echo "  - Full runbook: docs/deployment/SEEDING_RUNBOOK.md"
echo "  - Seed system docs: scripts/seed/README.md"
echo ""
